import express from 'express';
import qrcode from 'qrcode';
import baileysPkg from '@whiskeysockets/baileys';
import pino from 'pino';
import { GoogleGenerativeAI } from '@google/generative-ai';

const makeWASocket = baileysPkg.default || baileysPkg;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileysPkg;

// Render Environment Variables-ல் இருந்து API Key எடுக்கப்படுகிறது
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const app = express();
const port = process.env.PORT || 3002;
let qrImage = '';
let isConnected = false;

// AI பதில் தயாரிக்கும் செயல்பாடு
async function getAIReply(userPrompt) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            systemInstruction: `நீங்கள் கணேசன் அவர்களின் வாட்ஸ்அப் AI உதவியாளர். 
பயனர்கள் கேட்கும் கேள்விகளுக்கு நட்பாகவும், தெளிவாகவும் தமிழில் அல்லது அவர்கள் பேசும் மொழியில் (Tanglish/English) சுருக்கமாகப் பதிலளிக்கவும். 
யாராவது கணேசனைத் தொடர்பு கொள்ள வேண்டும் என்று கேட்டால்: "கணேசன் அவர்கள் தற்போது வேலையாக இருக்கிறார், உங்கள் செய்தி அவருக்குத் தெரிவிக்கப்படும். அவசரமென்றால் உங்கள் தொடர்பு எண்ணையும் காரணத்தையும் இங்கே பதிவிடுங்கள்" என்று கண்ணியமாகப் பதில் அளிக்கவும்.`
        });

        const result = await model.generateContent(userPrompt);
        return result.response.text();
    } catch (err) {
        console.error('Gemini API Error:', err);
        return 'மன்னிக்கவும், தற்போது பதிலளிப்பதில் சிறிய தொழில்நுட்பத் தடை உள்ளது. சிறிது நேரத்தில் கணேசன் உங்களுடன் இணைவார்.';
    }
}

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version: ${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrImage = await qrcode.toDataURL(qr);
            console.log('New Baileys QR code generated on web page!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`Connection closed (code ${statusCode}). Reconnecting in 5s:`, shouldReconnect);
            isConnected = false;

            if (shouldReconnect) {
                setTimeout(() => {
                    startWhatsApp();
                }, 5000);
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Bot: Connected successfully via Baileys!');
            isConnected = true;
            qrImage = '';
        }
    });

    // Gemini AI மூலம் தானாகப் பதிலளிக்கும் பகுதி
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const from = msg.key.remoteJid;

            if (!text) continue;

            console.log(`Received message from ${from}: "${text}"`);

            const aiResponse = await getAIReply(text);

            await sock.sendMessage(from, { text: aiResponse });
            console.log(`AI Reply sent to ${from}`);
        }
    });
}

app.get('/', (req, res) => {
    if (isConnected) {
        res.send(`
            <div style="text-align:center;margin-top:60px;font-family:sans-serif;">
                <h1 style="color:#25D366;font-size:35px;">✅ WhatsApp Gemini AI Bot Online!</h1>
                <p style="font-size:18px;color:#555;">பாட் தற்போது Gemini AI உடன் முழுமையாக இணைந்து இயங்குகிறது.</p>
            </div>
        `);
    } else if (qrImage) {
        res.send(`
            <div style="text-align:center;margin-top:50px;font-family:sans-serif;">
                <h2>Scan with WhatsApp:</h2>
                <img src="${qrImage}" style="width:300px;height:300px;border:2px solid #ccc;padding:10px;border-radius:10px;"/>
            </div>
        `);
    } else {
        res.send('<h2 style="text-align:center;margin-top:50px;font-family:sans-serif;">Starting Baileys Server... Please refresh in 5 seconds.</h2>');
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startWhatsApp();
});
