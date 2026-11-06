import express from 'express';
import qrcode from 'qrcode';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

const app = express();
const port = process.env.PORT || 3002;
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
        console.log('New QR ready on web page!');
    });
});

client.on('ready', () => {
    qrImage = 'connected';
    console.log('WhatsApp Bot is Ready and Connected!');
});

app.get('/', (req, res) => {
    if (qrImage === 'connected') {
        res.send('<h1 style="color:green;font-family:sans-serif;text-align:center;margin-top:50px;">✅ WhatsApp Bot Connected Successfully!</h1>');
    } else if (qrImage) {
        res.send(`<div style="text-align:center;margin-top:50px;font-family:sans-serif;">
            <h2>Scan with WhatsApp:</h2>
            <img src="${qrImage}" style="width:320px;height:320px;border:2px solid #ccc;padding:10px;border-radius:10px;"/>
            <p>Refreshes automatically when scanned.</p>
        </div>`);
    } else {
        res.send('<h2 style="text-align:center;margin-top:50px;font-family:sans-serif;">Starting WhatsApp... Please refresh this page in 10 seconds.</h2>');
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    client.initialize();
});
