import { Telegraf } from 'telegraf';
import { Message, MessageEntity } from 'telegraf/typings/core/types/typegram';

import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const bot = new Telegraf(BOT_TOKEN);
const ALLOWED_USER_ID = Number(process.env.ALLOWED_USER_ID!);
const ALLOWED_CHAT_ID = Number(process.env.ALLOWED_CHAT_ID!);
const symbol = process.env.SYMBOL || 'TOKEN';
const WIN_GIF = process.env.WIN_GIF!;
const LOSE_GIF = process.env.LOSE_GIF!;
let jackpotAmount = Number(process.env.JACKPOT_AMOUNT) || 100000;


function socials() {
  return {
    inline_keyboard: [
      [{ text: "🌐 Website", url: "https://example.com" }],
      [{ text: "📊 Stats", url: "https://example.com/stats" }],
    ]
  };
}

async function calculateProbability(value: number): Promise<number> {
  try {
    if (value >= 1 && value < 10) return Math.floor(value);
    else if (value >= 10) return 10;
    else return 1;
  } catch (error) {
    console.error("Error::calculateProbability", error);
    return 1;
  }
}

async function percentageOfJackpot(supply = 99499888.98): Promise<number> {
  try {
    return (jackpotAmount * 100) / supply;
  } catch (error) {
    console.error("Error::percentageOfJackpot", error);
    return 1;
  }
}

const winning_number = Math.floor(Math.random() * 100);
const pot_of_samples = 100; // Or however you compute this


async function sendWin(
  group: number,
  solUsed: number,
  perc: number,
  jack: number,
  sender: string,
  trx: string,
  usdReward: number,
  winning_number: number,
  pot_of_samples: number
) {
  const percentOfJackpot = await percentageOfJackpot();
  const caption = `🚀 New Play! ${solUsed.toFixed(3)} SOL was used!\n\n` +
    `<b>🏆 WINNER 🏆</b>\n\n` +
    `🎰 Jackpot value: <b>${jack.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${symbol} ($${usdReward.toFixed(2)})</b>\n` +
    `⏳ Current jackpot share: <b>${percentOfJackpot.toFixed(2)}%</b>\n\n` +
    `💳 Buy amount: <b>${solUsed.toFixed(3)} SOL ($${usdReward.toFixed(1)})</b>\n` +
    `📊 Probability of win: <b>${perc}%</b>\n\n` +
    `🥏 <u>Winning Num: ${winning_number}</u>\n` +
    `🎲 Pot: <b>${pot_of_samples}</b>\n\n` +
    `🔗 Txn: <a href="https://solscan.io/tx/${trx}">${trx}</a>\n` +
    `👤 Address: <a href="https://solscan.io/account/${sender}">${sender}</a>`;

  await bot.telegram.sendPhoto(group, WIN_GIF, {
    caption,
    parse_mode: 'HTML',
    reply_markup: socials(),
  });
}


async function sendNotWin(
  group: number,
  solUsed: number,
  perc: number,
  usdReward: number,
  winning_number: number,
  pot_of_samples: number
) {
  const percentOfJackpot = await percentageOfJackpot();
  const caption = `🚀 New Play! ${solUsed.toFixed(3)} SOL was used!\n\n` +
    `<b>🚫 You are not a winner</b>\n\n` +
    `🎰 Jackpot value: <b>${jackpotAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${symbol} ($${usdReward.toFixed(2)})</b>\n` +
    `⏳ Current jackpot share: <b>${percentOfJackpot.toFixed(2)}%</b>\n\n` +
    `💳 Buy amount: <b>${solUsed.toFixed(3)} SOL ($${usdReward.toFixed(1)})</b>\n` +
    `📊 Probability of win: <b>${perc}%</b>\n\n` +
    `🥏 <u>Winning Num: ${winning_number}</u>\n` +
    `🎲 Pot: <b>${pot_of_samples}</b>\n\n`;

  await bot.telegram.sendPhoto(group, LOSE_GIF, {
    caption,
    parse_mode: 'HTML',
    reply_markup: socials(),
  });
}



bot.on('message', async (ctx) => {
  const sender = ctx.message.from;
  const chat = ctx.message.chat;
  const userId = sender.id;
  const chatId = chat.id;

  if (userId === ALLOWED_USER_ID && chatId === ALLOWED_CHAT_ID) {
    const message = ctx.message as Message.TextMessage | Message.CaptionableMessage;

    const text: string | undefined =
      'text' in message ? message.text :
      'caption' in message ? message.caption : undefined;

    if (!text) return;

    // Extract data
    const solMatch = text.match(/🔀 ([\d.]+) SOL \(\$([\d.,]+)\)/);
    const solAmount = solMatch ? parseFloat(solMatch[1]) : null;
    const usdValue = solMatch ? parseFloat(solMatch[2].replace(/,/g, '')) : null;

    const villaMatch = text.match(/🔀 ([\d.,]+) VILLA/);
    const villaAmount = villaMatch ? parseFloat(villaMatch[1].replace(/,/g, '')) : null;

    const addressMatch = text.match(/👤 ([\w.]+) \| Txn/);
    const shortAddress = addressMatch ? addressMatch[1] : null;

    const entities = 'entities' in message ? (message.entities as MessageEntity[]) : [];

    let senderAddress: string | null = null;
    let txnHash: string | null = null;

    for (const entity of entities) {
      if (entity.type === 'text_link' && 'url' in entity) {
        if (entity.url.includes('solscan.io/account/')) {
          senderAddress = entity.url.split('/').pop() || null;
        }
        if (entity.url.includes('solscan.io/tx/')) {
          txnHash = entity.url.split('/').pop() || null;
        }
      }
    }

    if (solAmount && usdValue && senderAddress && txnHash) {
      console.log('SOL Amount:', solAmount);
      console.log('USD Value:', usdValue);
      console.log('VILLA Amount:', villaAmount);
      console.log('Short Address:', shortAddress);
      console.log('Sender Address:', senderAddress);
      console.log('Txn Hash:', txnHash);
    
      const perc = await calculateProbability(solAmount);
      const hit = Math.random() * 100 < perc;

      console.log('Hit:', hit);
      if (hit) {
        await sendWin(chatId, solAmount, perc, villaAmount || 0, senderAddress, txnHash, usdValue, winning_number, pot_of_samples);
      } else {
        await sendNotWin(chatId, solAmount, perc, usdValue, winning_number, pot_of_samples);
      }
    }
    
  }
});

// Handle /start
bot.start((ctx) => {
  ctx.reply('Welcome! I am your bot. How can I assist you today?');
});

bot.launch();
console.log('Bot is running...');
