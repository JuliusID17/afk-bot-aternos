const mineflayer = require('mineflayer');
const config = require('./settings.json');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot AFK Aktif.'));
app.listen(8000, () => console.log('Server Web untuk hosting telah dimulai.'));

function createBot() {
    console.log('Mencoba membuat koneksi bot...');
    const bot = mineflayer.createBot({
        host: config.server.ip,
        port: config.server.port,
        username: config['bot-account']['username'],
        password: config['bot-account']['password'],
        auth: config['bot-account']['type'],
        version: config.server.version,
        keepAlive: true,
        checkTimeoutInterval: 60 * 1000,
    });

    bot.on('spawn', () => {
        console.log(`[INFO] Bot berhasil masuk ke server. Memulai semua rutin.`);
        if (config.utils['chat-messages'].enabled) {
            console.log('[INFO] Memulai modul chat-messages.');
            const messages = config.utils['chat-messages']['messages'];
            const delay = config.utils['chat-messages']['repeat-delay'] * 1000;
            let i = 0;
            setInterval(() => {
                if (messages.length > 0) {
                    bot.chat(messages[i]);
                    i = (i + 1) % messages.length;
                }
            }, delay);
        }

        console.log('[INFO] Memulai modul Anti-AFK.');
        setInterval(() => {
            if (!bot.entity) return;
            const yaw = Math.random() * Math.PI * 2;
            const pitch = (Math.random() * Math.PI) - (Math.PI / 2);
            bot.look(yaw, pitch, false);
            bot.swingArm('right');
            bot.setControlState('forward', true);
            setTimeout(() => bot.setControlState('forward', false), 500);
        }, 30 * 1000);
    });

    // <<< BAGIAN YANG DIPERBAIKI ADA DI SINI
    const handleDisconnect = (reason) => {
        // Ambil nilai delay dari config, anggap satuannya adalah DETIK
        const delayInSeconds = config.utils['auto-recconect-delay'];
        console.log(`[PENTING] Koneksi bot terputus/ditendang. Alasan: ${reason}`);
        console.log(`Mencoba terhubung kembali dalam ${delayInSeconds} detik...`); // Log sekarang benar
        // Kalikan dengan 1000 untuk mengubahnya menjadi milidetik untuk setTimeout
        setTimeout(createBot, delayInSeconds * 1000);
    };

    bot.on('end', (reason) => handleDisconnect(`socketClosed - ${reason}`));
    bot.on('kicked', (reason) => handleDisconnect(JSON.stringify(reason)));
    // <<< AKHIR BAGIAN YANG DIPERBAIKI

    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
            // Abaikan error ECONNRESET di log utama karena sudah ditangani oleh 'end'
            return;
        }
        console.error(`[ERROR] Terjadi kesalahan pada bot: ${err.message}`);
    });
}

createBot();
