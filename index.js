const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');

const app = express();

let bot; // <<< PERUBAHAN 1: Variabel bot dideklarasikan di luar

app.get('/', (req, res) => {
  res.send('Bot has arrived');
});

app.listen(8000, () => {
  console.log('Server started');
});

function createBot() {
    // <<< PERUBAHAN 2: Mengisi variabel bot global
    bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
      
      // <<< PERUBAHAN 3 (SANGAT PENTING): Menambahkan 'keepAlive' untuk mencegah ECONNRESET
      checkTimeoutInterval: 60 * 1000, // Cek koneksi setiap 60 detik
      keepAlive: true                  // Mengirim paket kecil agar koneksi tidak dianggap mati
    });

    bot.loadPlugin(pathfinder);
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.settings.colorsEnabled = false;

    // ... (Fungsi sendRegister dan sendLogin tetap sama) ...
    function sendRegister(password) { /* ... kode tidak berubah ... */ }
    function sendLogin(password) { /* ... kode tidak berubah ... */ }

    bot.once('spawn', () => {
      console.log('\x1b[33m[AfkBot] Bot joined the server', '\x1b[0m');

      // ... (Blok auto-auth dan chat-messages tetap sama) ...
      if (config.utils['auto-auth'].enabled) { /* ... kode tidak berubah ... */ }
      if (config.utils['chat-messages'].enabled) { /* ... kode tidak berubah ... */ }
      
      const pos = config.position;

      if (config.position.enabled) {
          console.log(
              `\x1b[32m[Afk Bot] Starting to move to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
          );
          bot.pathfinder.setMovements(defaultMove);
          bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      if (config.utils['anti-afk'].enabled) {
          bot.setControlState('jump', true);
          if (config.utils['anti-afk'].sneak) {
              bot.setControlState('sneak', true);
          }
          
          // <<< PERUBAHAN 4: Menambahkan gerakan Anti-AFK Lanjutan
          console.log('[INFO] Memulai modul Anti-AFK tambahan.');
          setInterval(() => {
            if (bot && bot.entity) { // Pastikan bot masih ada
              // Gerakkan kepala bot secara acak
              const yaw = Math.random() * Math.PI * 2;
              const pitch = (Math.random() * Math.PI) - (Math.PI / 2);
              bot.look(yaw, pitch, false);
              // Ayunkan tangan sesekali
              bot.swingArm('right');
            }
          }, 15000); // Lakukan setiap 15 detik
      }
    });

    bot.on('goal_reached', () => {
      console.log(
          `\x1b[32m[AfkBot] Bot arrived at the target location. ${bot.entity.position}\x1b[0m`
      );
    });

    bot.on('death', () => {
      console.log(
          `\x1b[33m[AfkBot] Bot has died and was respawned at ${bot.entity.position}`,
          '\x1b[0m'
      );
    });

    if (config.utils['auto-reconnect']) {
      bot.on('end', (reason) => {
          console.log(`Bot terputus karena: ${reason}. Mencoba terhubung kembali...`);
          setTimeout(() => {
              createBot();
          }, config.utils['auto-recconect-delay'] * 1000);
      });
    }

    bot.on('kicked', (reason) =>
      console.log(
          '\x1b[33m',
          `[AfkBot] Bot was kicked from the server. Reason: \n${reason}`,
          '\x1b[0m'
      )
    );

    bot.on('error', (err) =>
      console.log(`\x1b[31m[ERROR] ${err.message}`, '\x1b[0m')
    );
}

// Jalankan bot untuk pertama kali
createBot();

// <<< PERUBAHAN 5: Blok restart per jam tetap ada
// =======================================================
const ONE_HOUR = 60 * 60 * 1000;

setInterval(() => {
    console.log('[INFO] Waktu restart per jam telah tiba. Memulai ulang koneksi...');
    if (bot) {
        bot.quit();
    }
}, ONE_HOUR);

console.log(`[INFO] Bot AFK telah dikonfigurasi untuk restart setiap 1 jam.`);
// =======================================================
