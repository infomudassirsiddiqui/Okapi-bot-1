// server.js
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { Connection, PublicKey } = require("@solana/web3.js");
const app = express();
const port = process.env.PORT || 3000;

const token = "7768845634:AAFqNC_-GsBJsVT6vhw83LQIomj6KM-4DcI";
const bot = new TelegramBot(token, { polling: true });
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const TOKEN_MINT_ADDRESS = "YOUR_TOKEN_MINT_ADDRESS"; // Replace after token creation

app.use(express.json());
app.use(express.static("public"));

// In-memory user data (replace with database in production)
const users = new Map();
function getUser(userId) {
    if (!users.has(userId)) {
        users.set(userId, { balance: 0, miningRate: 1, username: "User" + userId });
    }
    return users.get(userId);
}

// Get user data
app.get("/user/:userId", async (req, res) => {
    const userId = req.params.userId;
    const user = getUser(userId);
    console.log(`Fetching user ${userId} - Balance: ${user.balance}, Rate: ${user.miningRate}`);
    res.json(user);
});

// Mining
app.post("/mine", async (req, res) => {
    const { userId, wallet } = req.body;
    try {
        if (!wallet || !userId) {
            console.error("Mining failed: Invalid request - Missing wallet or userId");
            return res.status(400).json({ success: false, error: "Invalid request" });
        }
        const user = getUser(userId);
        const walletPubkey = new PublicKey(wallet);
        console.log(`Before mining - User ${userId} balance: ${user.balance}, rate: ${user.miningRate}`);
        user.balance += user.miningRate;
        console.log(`After mining - User ${userId} balance: ${user.balance}, rate: ${user.miningRate}`);
        // TODO: Trigger Solana token transfer via Rust program
        res.json({ success: true, balance: user.balance, miningRate: user.miningRate });
    } catch (error) {
        console.error("Mining error:", error.message);
        res.status(500).json({ success: false, error: "Mining failed" });
    }
});

// Buy Booster
app.post("/buy-booster", async (req, res) => {
    const { userId, wallet } = req.body;
    try {
        if (!wallet || !userId) {
            console.error("Booster failed: Invalid request - Missing wallet or userId");
            return res.status(400).json({ success: false, error: "Invalid request" });
        }
        const user = getUser(userId);
        console.log(`Before booster - User ${userId} balance: ${user.balance}, rate: ${user.miningRate}`);
        if (user.balance < 10) {
            console.error(`Booster failed: User ${userId} has insufficient balance (${user.balance})`);
            return res.status(400).json({ success: false, error: "Insufficient balance" });
        }
        user.balance -= 10;
        user.miningRate *= 2;
        console.log(`After booster - User ${userId} balance: ${user.balance}, rate: ${user.miningRate}`);
        res.json({ success: true, balance: user.balance, miningRate: user.miningRate });
    } catch (error) {
        console.error("Booster error:", error.message);
        res.status(500).json({ success: false, error: "Booster purchase failed" });
    }
});

// Claim Task
app.post("/claim-task", async (req, res) => {
    const { userId, wallet, reward } = req.body;
    try {
        if (!wallet || !userId || !reward) {
            console.error("Task claim failed: Invalid request - Missing wallet, userId, or reward");
            return res.status(400).json({ success: false, error: "Invalid request" });
        }
        const user = getUser(userId);
        console.log(`Before task - User ${userId} balance: ${user.balance}`);
        user.balance += reward;
        console.log(`After task - User ${userId} balance: ${user.balance}`);
        // TODO: Trigger Solana token transfer via Rust program
        res.json({ success: true, balance: user.balance });
    } catch (error) {
        console.error("Task claim error:", error.message);
        res.status(500).json({ success: false, error: "Task claim failed" });
    }
});

// Leaderboard
app.get("/leaderboard", (req, res) => {
    try {
        const leaderboard = Array.from(users.entries())
            .map(([userId, user]) => ({ username: user.username, balance: user.balance }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5);
        console.log("Leaderboard fetched:", leaderboard);
        res.json(leaderboard);
    } catch (error) {
        console.error("Leaderboard error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const user = getUser(userId);
    user.username = msg.from.username || "User" + userId;
    bot.sendMessage(chatId, "Welcome to OKAPI TOKEN! Mine on Solana:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Open Miner", web_app: { url: "YOUR_WEBAPP_URL" } }]
            ]
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
