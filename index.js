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
        
        // WAJIB: Ini untuk menjaga koneksi tetap stabil di hosting seperti Railway
        keepAlive: true,
        checkTimeoutInterval: 60 * 1000,
    });

    // --- LOGIKA ANTI-AFK & ANTI-BAN ESSENTIALSX ---
    bot.on('spawn', () => {
        console.log(`[INFO] Bot berhasil masuk ke server. Memulai rutin Anti-AFK.`);
        
        // Ini adalah rutin utama untuk membuat bot terlihat aktif
        setInterval(() => {
            if (!bot.entity) return; // Hentikan jika bot tidak valid

            // 1. Melihat sekeliling secara acak
            const yaw = Math.random() * Math.PI * 2;
            const pitch = (Math.random() * Math.PI) - (Math.PI / 2);
            bot.look(yaw, pitch, false);

            // 2. Mengayunkan tangan
            bot.swingArm('right');

            // 3. Bergerak sedikit (maju sepersekian detik, lalu berhenti)
            // Ini adalah cara paling efektif untuk mereset timer AFK EssentialsX
            bot.setControlState('forward', true);
            setTimeout(() => bot.setControlState('forward', false), 500); // Jalan selama 0.5 detik

        }, 30 * 1000); // Lakukan semua aksi ini setiap 30 detik
    });

    // --- LOGIKA AUTO RECONNECT YANG LEBIH BAIK ---
    // Dipicu jika koneksi terputus karena error (ECONNRESET, dll)
    bot.on('end', (reason) => {
        console.log(`[PENTING] Koneksi bot terputus. Alasan: ${reason}`);
        console.log(`Mencoba terhubung kembali dalam ${config.utils['auto-recconect-delay']} detik...`);
        setTimeout(createBot, config.utils['auto-recconect-delay'] * 1000);
    });

    // Dipicu jika bot ditendang (kicked) oleh server (termasuk oleh Aternos)
    bot.on('kicked', (reason) => {
        console.log(`[PENTING] Bot ditendang dari server. Alasan: ${JSON.stringify(reason)}`);
        console.log(`Mencoba terhubung kembali dalam ${config.utils['auto-recconect-delay']} detik...`);
        setTimeout(createBot, config.utils['auto-recconect-delay'] * 1000);
    });

    // Menangani error umum
    bot.on('error', (err) => {
        console.error(`[ERROR] Terjadi kesalahan pada bot: ${err.message}`);
    });
}

// Mulai bot untuk pertama kalinya
createBot();
