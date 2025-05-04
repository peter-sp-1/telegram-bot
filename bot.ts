import { Telegraf } from 'telegraf';
import { Message, MessageEntity } from 'telegraf/typings/core/types/typegram';


import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';

import dotenv from 'dotenv';
dotenv.config();

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

//const privateKeyBytes = Uint8Array.from(Buffer.from(privateKeyHex, 'hex'));
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY!))
);


const BOT_TOKEN = process.env.BOT_TOKEN!;
const bot = new Telegraf(BOT_TOKEN);
const ALLOWED_USER_ID = Number(process.env.ALLOWED_USER_ID!);
const ALLOWED_CHAT_ID = Number(process.env.ALLOWED_CHAT_ID!);
const symbol = process.env.SYMBOL || 'TOKEN';
const WIN_GIF = process.env.WIN_GIF!;
const LOSE_GIF = process.env.LOSE_GIF!;
let jackpotAmount = Number(process.env.JACKPOT_AMOUNT) || 100000;
let jackpot_amount = 2; // default value in SOL or token


function socials() {
  return {
    inline_keyboard: [
      [{ text: "🌐 Website", url: "https://example.com" }],
      [{ text: "📊 Stats", url: "https://example.com/stats" }],
    ]
  };
}

async function transferSolana(to: string, amount: number): Promise<string> {
  try {
    const recipient = new PublicKey(to);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log(`✅ Sent ${amount} SOL to ${to}. Txn: ${signature}`);
    return signature;
  } catch (error) {
    console.error('❌ Transfer failed:', error);
    return ('Network error');
  }
}

export async function getBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const lamports = await connection.getBalance(publicKey);
    const sol = lamports / 1e9; // Convert lamports to SOL
    return sol;
  } catch (error) {
    console.error("Error::getBalance", error);
    return 0;
  }
}

export async function calculateProbability(value: number): Promise<number> {
  try {
    if (value >= 1 && value < 2) {
      return 1;
    } else if (value >= 2 && value < 3) {
      return 2;
    } else if (value >= 3 && value < 4) {
      return 3;
    } else if (value >= 4 && value < 5) {
      return 4;
    } else if (value >= 5 && value < 6) {
      return 5;
    } else if (value >= 6 && value < 7) {
      return 6;
    } else if (value >= 7 && value < 8) {
      return 7;
    } else if (value >= 8 && value < 9) {
      return 8;
    } else if (value >= 9 && value < 10) {
      return 9;
    } else if (value >= 10) {
      return 10;
    } else {
      return 1;
    }
  } catch (error) {
    console.error("Error::calculateProbability", error);
    return 1;
  }
}

  
const winning_number = Math.floor(Math.random() * 100);
const pot_of_samples = 100; // Or however you compute this


async function sendWin(
  gif: string,
  group: string,
  symbol: string,
  sol_used: number,
  perc: number,
  jackpot_amount: number,
  owner: string,
  paid_trx: string,
  usd_value_of_reward: number
) {
  try {
    // ✅ Transfer SOL to winner
    const winAmount = 0.1; // or however much you want to reward
    const txHash = await transferSolana(owner, winAmount);

    // ✅ Get updated balance after reward
    const newBalance = await getBalance(owner);

    // ✅ Send Telegram message
    const winMessage = `
🎉 *YOU WON!*
${symbol} Buy of *${sol_used.toFixed(3)} SOL* triggered the jackpot!

💰 *Reward:* ${winAmount} SOL
🔗 *Tx Hash:* [${txHash}](https://solscan.io/tx/${txHash}?cluster=devnet)
👤 *Winner:* [${owner}](https://solscan.io/address/${owner}?cluster=devnet)
💳 *New Balance:* ${newBalance.toFixed(4)} SOL
🏆 *Jackpot Pool:* ${jackpot_amount.toFixed(2)} (${perc.toFixed(2)}%)

Powered by Jackpot Bot 🚀`;

    await bot.telegram.sendMessage(group, winMessage, {
      parse_mode: 'Markdown',
    });

  } catch (error) {
    console.error("❌ Error in send_win:", error);
  }
}



async function sendNotWin(
  group: number,
  solUsed: number,
  perc: number,
  usdReward: number,
  winning_number: number,
  pot_of_samples: number
) {
 
  const caption = `🚀 New Play! ${solUsed.toFixed(3)} SOL was used!\n\n` +
    `<b>🚫 You are not a winner</b>\n\n` +
    `🎰 Jackpot value: <b>${jackpotAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${symbol} ($${usdReward.toFixed(2)})</b>\n` +
  
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
      console.log('Short Address:', shortAddress);
      console.log('Sender Address:', senderAddress);
      console.log('Txn Hash:', txnHash);
    
      const perc = await calculateProbability(solAmount);
      console.log('Calculated Probability:', perc);

    

      const hit = perc === 100 || Math.random() * 100 < perc; 

      console.log('Hit:', hit);
      if (hit) {
        await sendWin(WIN_GIF, chatId.toString(), symbol, solAmount, perc || 0, jackpotAmount, senderAddress, txnHash, usdValue);
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
