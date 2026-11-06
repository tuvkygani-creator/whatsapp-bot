import express from 'express';
import qrcode from 'qrcode';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';

const app = express();
const port = process.env.PORT || 3002;
let qrImage = '';
let isConnected = false;

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrImage = await qrcode.toDataURL(qr);
            console.log('New Baileys QR code generated on web page!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            isConnected = false;
            if (shouldReconnect) {
                startWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Bot: Connected successfully via Baileys!');
            isConnected = true;
            qrImage = '';
        }
    });

    // Auto-Reply பகுதி
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            if (!msg.message) continue;

            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
            const from = msg.key.remoteJid;

            // பாட் தன் சொந்த மெசேஜுக்கே பதில் அனுப்பாமல் தடுக்க
            if (msg.key.fromMe) continue;

            console.log(`Received message: "${text}" from ${from}`);

            if (text === 'hi' || text === 'hello') {
                await sock.sendMessage(from, { 
                    text: 'வணக்கம்! நான் உங்கள் AI வாட்ஸ்அப் உதவியாளர் (WhatsApp Bot). உங்களுக்கு என்ன உதவி வேண்டும்?' 
                });
                console.log('Auto-reply sent successfully!');
            }
        }
    });
}

app.get('/', (req, res) => {
    if (isConnected) {
        res.send(`
            <div style="text-align:center;margin-top:60px;font-family:sans-serif;">
                <h1 style="color:#25D366;font-size:35px;">✅ WhatsApp Bot Connected Successfully!</h1>
                <p style="font-size:18px;color:#555;">பாட் தற்போது Baileys மூலம் ஆன்லைனில் உள்ளது. மெசேஜ் அனுப்பினால் உடனடிப் பதில் வரும்.</p>
            </div>
        `);
    } else if (qrImage) {
        res.send(`
            <div style="text-align:center;margin-top:50px;font-family:sans-serif;">
                <h2>Scan with WhatsApp (Baileys):</h2>
                <img src="${qrImage}" style="width:300px;height:300px;border:2px solid #ccc;padding:10px;border-radius:10px;"/>
                <p>Refresh after scanning.</p>
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
