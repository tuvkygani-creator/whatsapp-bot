import express from 'express';
import qrcode from 'qrcode';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

const app = express();
const port = process.env.PORT || 3002;
let botStatus = 'Starting...';
let qrImage = '';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-extensions'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        qrImage = url;
        botStatus = 'QR_READY';
        console.log('New QR generated!');
    });
});

client.on('authenticated', () => {
    botStatus = 'CONNECTED';
    console.log('WhatsApp Authenticated Successfully!');
});

client.on('ready', () => {
    botStatus = 'CONNECTED';
    console.log('WhatsApp Bot is Ready and Online!');
});

// மெசேஜ் வந்தால் தானாகப் பதிலளிக்கும் பகுதி (Auto Reply)
client.on('message', async (msg) => {
    console.log(`Received message from ${msg.from}: ${msg.body}`);
    if (msg.body.toLowerCase() === 'hi' || msg.body.toLowerCase() === 'hello') {
        await msg.reply('வணக்கம்! நான் உங்கள் AI வாட்ஸ்அப் உதவியாளர் (WhatsApp Bot). உங்களுக்கு என்ன உதவி வேண்டும்?');
    }
});

app.get('/', (req, res) => {
    if (botStatus === 'CONNECTED') {
        res.send(`
            <div style="text-align:center;margin-top:60px;font-family:sans-serif;">
                <h1 style="color:#25D366;font-size:35px;">✅ WhatsApp Bot Connected Successfully!</h1>
                <p style="font-size:18px;color:#555;">உங்கள் வாட்ஸ்அப் எண் பாட்டுடன் வெற்றிகரமாக இணைந்துவிட்டது.</p>
                <p style="font-size:16px;color:#777;">இப்போது உங்கள் வாட்ஸ்அப்பிற்கு யாராவது <b>"hi"</b> என்று மெசேஜ் அனுப்பினால், பாட் தானாகப் பதிலளிக்கும்.</p>
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
    console.log(`Server running on port ${port}`);
    client.initialize();
});
