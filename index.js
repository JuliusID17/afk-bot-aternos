const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');

const app = express();

let bot; // <<< PERUBAHAN 1: Deklarasikan variabel bot di sini agar bisa diakses secara global

app.get('/', (req, res) => {
  res.send('Bot has arrived');
});

app.listen(8000, () => {
  console.log('Server started');
});

function createBot() {
    // <<< PERUBAHAN 2: Hapus 'const' agar tidak membuat variabel baru, tapi mengisi variabel global
    bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
    });

    bot.loadPlugin(pathfinder);
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.settings.colorsEnabled = false;

    let pendingPromise = Promise.resolve();

    function sendRegister(password) {
      return new Promise((resolve, reject) => {
          bot.chat(`/register ${password} ${password}`);
          console.log(`[Auth] Sent /register command.`);

          // Dihapus 'bot.once' yang duplikat, ini adalah fungsi yang benar
          bot.once('chat', (username, message) => {
              console.log(`[ChatLog] <${username}> ${message}`); // Log all chat messages

              if (message.includes('successfully registered') || message.includes('berhasil terdaftar')) {
                  console.log('[INFO] Registration confirmed.');
                  resolve();
              } else if (message.includes('already registered') || message.includes('sudah terdaftar')) {
                  console.log('[INFO] Bot was already registered.');
                  resolve();
              } else {
                  // Jika tidak ada pesan sukses, anggap saja gagal setelah timeout
                  setTimeout(() => reject(`Registration failed: unexpected message "${message}".`), 5000);
              }
          });
      });
    }

    function sendLogin(password) {
      return new Promise((resolve, reject) => {
          bot.chat(`/login ${password}`);
          console.log(`[Auth] Sent /login command.`);

          bot.once('chat', (username, message) => {
              console.log(`[ChatLog] <${username}> ${message}`); // Log all chat messages

              if (message.includes('successfully logged in') || message.includes('berhasil login')) {
                  console.log('[INFO] Login successful.');
                  resolve();
              } else if (message.includes('not registered') || message.includes('belum terdaftar')) {
                   console.log('[INFO] Not registered, trying to register...');
                   sendRegister(password).then(resolve).catch(reject);
              } else {
                  // Jika tidak ada pesan sukses, anggap saja gagal setelah timeout
                  setTimeout(() => reject(`Login failed: unexpected message "${message}".`), 5000);
              }
          });
      });
    }


    bot.once('spawn', () => {
      console.log('\x1b[33m[AfkBot] Bot joined the server', '\x1b[0m');

      if (config.utils['auto-auth'].enabled) {
          console.log('[INFO] Started auto-auth module');
          const password = config.utils['auto-auth'].password;
          // Coba login dulu, jika gagal karena belum register, fungsi login akan handle registrasi
          sendLogin(password).catch(error => console.error('[ERROR] Auth failed:', error));
      }

      if (config.utils['chat-messages'].enabled) {
          console.log('[INFO] Started chat-messages module');
          const messages = config.utils['chat-messages']['messages'];

          if (config.utils['chat-messages'].repeat) {
              const delay = config.utils['chat-messages']['repeat-delay'];
              let i = 0;

              let msg_timer = setInterval(() => {
                  bot.chat(`${messages[i]}`);

                  if (i + 1 === messages.length) {
                      i = 0;
                  } else {
                      i++;
                  }
              }, delay * 1000);
          } else {
              messages.forEach((msg) => {
                  bot.chat(msg);
              });
          }
      }

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
          }, config.utils['auto-recconect-delay'] * 1000); // Pastikan delay dalam milidetik
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

// <<< PERUBAHAN 3: Tambahkan blok kode ini di akhir file
// =======================================================
// Fungsi untuk merestart bot setiap 1 jam
const ONE_HOUR = 60 * 60 * 1000; // 1 jam dalam milidetik

setInterval(() => {
    console.log('[INFO] Waktu restart per jam telah tiba. Memulai ulang koneksi...');
    if (bot) {
        bot.quit();
    }
}, ONE_HOUR);

console.log(`[INFO] Bot AFK telah dikonfigurasi untuk restart setiap 1 jam.`);
// =======================================================
