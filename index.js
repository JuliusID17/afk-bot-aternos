const mineflayer = require('mineflayer');
const config = require('./settings.json');
const express = require('express');

// Setup server Express sederhana untuk requirement hosting Railway
const app = express();
app.get('/', (req, res) => res.send('Bot AFK Aktif.'));
app.listen(8000, () => console.log('Server Web untuk hosting telah dimulai.'));

// Fungsi utama untuk membuat dan menjalankan bot
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

        // <<< FUNGSI CHAT OTOMATIS DIKEMBALIKAN DI SINI
        if (config.utils['chat-messages'].enabled) {
            console.log('[INFO] Memulai modul chat-messages.');
            const messages = config.utils['chat-messages']['messages'];
            const delay = config.utils['chat-messages']['repeat-delay'] * 1000;
            let i = 0;

            setInterval(() => {
                if (messages.length > 0) {
                    bot.chat(messages[i]);
                    i = (i + 1) % messages.length; // Cara lebih aman untuk kembali ke awal
                }
            }, delay);
        }
        // <<< AKHIR FUNGSI CHAT OTOMATIS

        // Logika Anti-AFK & Anti-Ban EssentialsX
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

    bot.on('end', (reason) => {
        console.log(`[PENTING] Koneksi bot terputus. Alasan: ${reason}`);
        console.log(`Mencoba terhubung kembali dalam ${config.utils['auto-recconect-delay']} detik...`);
        setTimeout(createBot, config.utils['auto-recconect-delay'] * 1000);
    });

    bot.on('kicked', (reason) => {
        console.log(`[PENTING] Bot ditendang dari server. Alasan: ${JSON.stringify(reason)}`);
        console.log(`Mencoba terhubung kembali dalam ${config.utils['auto-recconect-delay']} detik...`);
        setTimeout(createBot, config.utils['auto-recconect-delay'] * 1000);
    });

    bot.on('error', (err) => {
        console.error(`[ERROR] Terjadi kesalahan pada bot: ${err.message}`);
    });
}

// Mulai bot untuk pertama kalinya
createBot();
