const axios = require('axios');
const { Telegraf } = require('telegraf');
const sqlite3 = require('sqlite3');

const bot = new Telegraf('6257051730:AAHU6D7RY-lIR7zE_qyD2TU6lRcHOBWpvyE');
const db = new sqlite3.Database('database.db');

// Create database table for users if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    chatId TEXT,
    firstName TEXT,
    lastName TEXT,
    isAdmin INTEGER DEFAULT 0
  )
`);

// Start command
bot.start((ctx) => {
  ctx.reply('Welcome! Use /subscribe to get weather updates.');
});

// Subscribe command
bot.command('subscribe', (ctx) => {
  const chatId = ctx.chat.id;
  console.log(chatId);
  const firstName = ctx.chat.first_name;
  const lastName = ctx.chat.last_name;

  // Check if user is already subscribed
  db.get('SELECT * FROM users WHERE chatId = ?', [chatId], (err, row) => {
    if (row) {
      ctx.reply('You are already subscribed for weather updates.');
    } else {
      db.run(
        'INSERT INTO users (chatId, firstName, lastName) VALUES (?, ?, ?)',
        [chatId, firstName, lastName],
        (err) => {
          if (!err) {
            ctx.reply('You are now subscribed for weather updates.');
          } else {
            ctx.reply('An error occurred. Please try again later.');
          }
        }
      );
    }
  });
});

// Unsubscribe command
bot.command('unsubscribe', (ctx) => {
  const chatId = ctx.chat.id;

  // Check if user is subscribed
  db.get('SELECT * FROM users WHERE chatId = ?', [chatId], (err, row) => {
    if (row) {
      db.run('DELETE FROM users WHERE chatId = ?', [chatId], (err) => {
        if (!err) {
          ctx.reply('You are now unsubscribed from weather updates.');
        } else {
          ctx.reply('An error occurred. Please try again later.');
        }
      });
    } else {
      ctx.reply('You are not subscribed for weather updates.');
    }
  });
});

// Weather update command (for admin)
bot.command('update_weather', async (ctx) => {
    const adminChatId = ctx.chat.id;
  
    // Check if the message is from the admin
    db.get('SELECT * FROM users WHERE chatId = ? AND isAdmin = 1', [adminChatId], async (err, row) => {
      if (row) {
        try {
          const weatherData = await getWeatherData();
          const weatherUpdate = formatWeatherData(weatherData);
          
          db.all('SELECT chatId FROM users', [], (err, rows) => {
            if (rows.length > 0) {
              rows.forEach((user) => {
                bot.telegram.sendMessage(user.chatId, weatherUpdate);
              });
              ctx.reply('Weather update sent to all subscribers.');
            } else {
              ctx.reply('There are no subscribers to receive the weather update.');
            }
          });
        } catch (error) {
          console.error('Error retrieving weather data:', error);
          ctx.reply('An error occurred while retrieving weather data.');
        }
      } else {
        ctx.reply('You are not authorized to send weather updates.');
      }
    });
  });
  
  // Function to fetch weather data from OpenWeatherMap API
  async function getWeatherData() {
    const apiKey = '96096a381c1d3738c60b2b9111e1364d';
    const city = 'New Delhi';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
  
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch weather data');
    }
  }
  
  // Function to format weather data
  function formatWeatherData(weatherData) {
    const cityName = weatherData.name;
    const temperature = Math.round(weatherData.main.temp - 273.15); // Convert temperature to Celsius
    const weatherDescription = weatherData.weather[0].description;
  
    return `Weather update for ${cityName}:\nTemperature: ${temperature}°C\nWeather: ${weatherDescription}`;
  }





// Admin panel commands
bot.command('admin_panel', (ctx) => {
  const adminChatId = ctx.chat.id;

  // Check if the message is from the admin
  db.get('SELECT * FROM users WHERE chatId = ? AND isAdmin = 1', [adminChatId], (err, row) => {
    if (row) {
      ctx.reply(
        'Welcome to the admin panel!\n' +
        'Use the following commands to manage users and bot settings:\n' +
        '/block_user <chatId>: Block a user\n' +
        '/unblock_user <chatId>: Unblock a user\n' +
        '/delete_user <chatId>: Delete a user\n' +
        '/set_admin <chatId>: Set user as admin\n' +
        '/remove_admin <chatId>: Remove admin role from user'
      );
    } else {
      ctx.reply('You are not authorized to access the admin panel.');
    }
  });
});

// Block user command (admin)
bot.command('block_user', (ctx) => {
  const adminChatId = ctx.chat.id;
  const chatIdToBlock = ctx.message.text.split(' ')[1];

  // Check if the message is from the admin
  db.get('SELECT * FROM users WHERE chatId = ? AND isAdmin = 1', [adminChatId], (err, row) => {
    if (row) {
      db.run('UPDATE users SET isAdmin = 0 WHERE chatId = ?', [chatIdToBlock], (err) => {
        if (!err) {
          ctx.reply(`User with chat ID ${chatIdToBlock} is blocked.`);
        } else {
          ctx.reply('An error occurred. Please try again later.');
        }
      });
    } else {
      ctx.reply('You are not authorized to block users.');
    }
  });
});

// Unblock user command (admin)
bot.command('unblock_user', (ctx) => {
  const adminChatId = ctx.chat.id;
  const chatIdToUnblock = ctx.message.text.split(' ')[1];

  // Check if the message is from the admin
  db.get('SELECT * FROM users WHERE chatId = ? AND isAdmin = 1', [adminChatId], (err, row) => {
    if (row) {
      db.run('UPDATE users SET isAdmin = 1 WHERE chatId = ?', [chatIdToUnblock], (err) => {
        if (!err) {
          ctx.reply(`User with chat ID ${chatIdToUnblock} is unblocked.`);
        } else {
          ctx.reply('An error occurred. Please try again later.');
        }
      });
    } else {
      ctx.reply('You are not authorized to unblock users.');
    }
  });
});

// Delete user command (admin)
bot.command('delete_user', (ctx) => {
  const adminChatId = ctx.chat.id;
  const chatIdToDelete = ctx.message.text.split(' ')[1];

  // Check if the message is from the admin
  db.get('SELECT * FROM users WHERE chatId = ? AND isAdmin = 1', [adminChatId], (err, row) => {
    if (row) {
      db.run('DELETE FROM users WHERE chatId = ?', [chatIdToDelete], (err) => {
        if (!err) {
          ctx.reply(`User with chat ID ${chatIdToDelete} is deleted.`);
        } else {
          ctx.reply('An error occurred. Please try again later.');
        }
      });
    } else {
      ctx.reply('You are not authorized to delete users.');
    }
  });
});

// Set admin command (admin)
bot.command('set_admin', (ctx) => {
  const adminChatId = ctx.chat.id;
  const chatIdToSetAdmin = ctx.message.text.split(' ')[1];

  // Check if the message is from the admin
  db.get('SELECT * FROM users WHERE chatId = ? AND isAdmin = 1', [adminChatId], (err, row) => {
    if (row) {
      db.run('UPDATE users SET isAdmin = 1 WHERE chatId = ?', [chatIdToSetAdmin], (err) => {
        if (!err) {
          ctx.reply(`User with chat ID ${chatIdToSetAdmin} is set as admin.`);
        } else {
          ctx.reply('An error occurred. Please try again later.');
        }
      });
    } else {
      ctx.reply('You are not authorized to set users as admin.');
    }
  });
});

// Remove admin command (admin)
bot.command('remove_admin', (ctx) => {
  const adminChatId = ctx.chat.id;
  const chatIdToRemoveAdmin = ctx.message.text.split(' ')[1];

  // Check if the message is from the admin
  db.get('SELECT * FROM users WHERE chatId = ? AND isAdmin = 1', [adminChatId], (err, row) => {
    if (row) {
      db.run('UPDATE users SET isAdmin = 0 WHERE chatId = ?', [chatIdToRemoveAdmin], (err) => {
        if (!err) {
          ctx.reply(`Admin role is removed from user with chat ID ${chatIdToRemoveAdmin}.`);
        } else {
          ctx.reply('An error occurred. Please try again later.');
        }
      });
    } else {
      ctx.reply('You are not authorized to remove admin role from users.');
    }
  });
});

// Start the bot
bot.launch();
