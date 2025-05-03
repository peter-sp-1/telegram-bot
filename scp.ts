import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';



const PORT = process.env.PORT || 3000;
const express = require('express');
const app = express();

dotenv.config();

// Replace with your actual bot token from BotFather
const BOT_TOKEN = '7004502415:AAHvc6UorMhA9fCBZZiDplB-Ejtdn0t8BP8';
const ALLOWED_USER_ID = 5976408419;
const ALLOWED_CHAT_ID = -1002606322688;

// Create a Telegram bot instance, forget pending updates

const bot = new TelegramBot(BOT_TOKEN, {
    polling: false,
    cleanButtonText: true
});
// Clear any pending updates on startup
bot.deleteWebHook({ drop_pending_updates: true });

// Now start polling
bot.startPolling();

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// Add these command handlers before app.listen
bot.onText(/\/activate/, async (msg) => {
    const userId = msg.from.id;
    if (!ALLOWED_ADMINS.includes(userId)) {
        bot.sendMessage(msg.chat.id, '⛔ Unauthorized access');
        return;
    }

    const state = await updateBotState(true, userId);
    bot.sendMessage(msg.chat.id, '✅ Bot activated');
});

bot.onText(/\/deactivate/, async (msg) => {
    const userId = msg.from.id;
    if (!ALLOWED_ADMINS.includes(userId)) {
        bot.sendMessage(msg.chat.id, '⛔ Unauthorized access');
        return;
    }

    const state = await updateBotState(false, userId);
    bot.sendMessage(msg.chat.id, '🚫 Bot deactivated');
});

bot.onText(/\/status/, async (msg) => {
    const state = await getBotState();
    const status = state.isActive ? '✅ Active' : '🚫 Inactive';
    const lastUpdated = new Date(state.lastUpdated).toLocaleString();
    
    bot.sendMessage(msg.chat.id, 
        `Bot Status: ${status}\n` +
        `Last Updated: ${lastUpdated}\n` +
        `Updated By: ${state.updatedBy}`
    );
});

// Listen for messages from the specified user and send a greeting
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId === ALLOWED_USER_ID && chatId === ALLOWED_CHAT_ID) {
        const caption = msg.caption || msg.text; // Use caption if available, otherwise use text
    }
});

// Add a command to list active monitors
bot.onText(/\/monitors/, async (msg) => {
    const activeMonitors = tokenManager.getActiveMonitors();
    const monitorList = activeMonitors.map(m =>
        `${m.mint}: ${m.elapsedMinutes.toFixed(1)}m elapsed, Last price: $${m.lastPrice}`
    ).join('\n');

    bot.sendMessage(msg.chat.id,
        activeMonitors.length ?
            `Active monitors:\n${monitorList}` :
            'No active monitors'
    );
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
