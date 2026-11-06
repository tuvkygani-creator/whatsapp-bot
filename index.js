import express from 'express';
import qrcode from 'qrcode';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

const app = express();
const port = process.env.PORT || 3002;
let botStatus = 'Starting...';
let qrImage = '';

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        qrImage = url;
        botStatus = 'QR_READY';
        console.log('New QR code generated!');
    });
});

client.on('authenticated', () => {
    botStatus = 'CONNECTED';
    console.log('WhatsApp Bot: Authenticated successfully!');
});

client.on('ready', () => {
    botStatus = 'CONNECTED';
    console.log('WhatsApp Bot: Ready and Online!');
});

// பிறர் அனுப்பும் மெசேஜ் மற்றும் நாம் அனுப்பும் மெசேஜ் இரண்டையும் கவனிக்கும்
client.on('message_create', async (msg) => {
    // பாட் தன் சொந்த பதிலுக்கே மீண்டும் பதில் சொல்லி லூப் ஆவதைத் தடுக்க:
    if (msg.body.includes('வணக்கம்! நான் உங்கள் AI வாட்ஸ்அப் உதவியாளர்')) return;

    const text = msg.body.trim().toLowerCase();
    console.log(`Message caught: ${text} from ${msg.from}`);

    if (text === 'hi' || text === 'hello') {
        await client.sendMessage(msg.from, 'வணக்கம்! நான் உங்கள் AI வாட்ஸ்அப் உதவியாளர் (WhatsApp Bot). உங்களுக்கு என்ன உதவி வேண்டும்?');
        console.log('Auto-reply sent successfully!');
    }
});

app.get('/', (req, res) => {
    if (botStatus === 'CONNECTED') {
        res.send(`
            <div style="text-align:center;margin-top:60px;font-family:sans-serif;">
                <h1 style="color:#25D366;font-size:35px;">✅ WhatsApp Bot Connected Successfully!</h1>
                <p style="font-size:18px;color:#555;">பாட் தற்போது ஆன்லைனில் உள்ளது. மெசேஜ் அனுப்பினால் பதில் வரும்.</p>
            </div>
        `);
    } else if (botStatus === 'QR_READY' && qrImage) {
        res.send(`
            <div style="text-align:center;margin-top:50px;font-family:sans-serif;">
                <h2>Scan with WhatsApp:</h2>
                <img src="${qrImage}" style="width:300px;height:300px;border:2px solid #ccc;padding:10px;border-radius:10px;"/>
            </div>
        `);
    } else {
        res.send('<h2 style="text-align:center;margin-top:50px;font-family:sans-serif;">Starting WhatsApp Bot... Please refresh in 10 seconds.</h2>');
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    client.initialize();
});
