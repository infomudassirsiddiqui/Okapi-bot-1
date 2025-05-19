// public/script.js
window.onload = function () {
    if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp) {
        console.error("Telegram WebApp SDK not loaded. Please open this app in Telegram.");
        alert("Please open this app in Telegram to use it.");
        return;
    }

    const WebApp = window.Telegram.WebApp;
    WebApp.ready();

    let user = WebApp.initDataUnsafe.user || { username: "Guest" };
    let walletPublicKey = null;

    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
    const TOKEN_MINT_ADDRESS = "YOUR_TOKEN_MINT_ADDRESS"; // Replace after token creation

    async function fetchUserData() {
        try {
            const response = await fetch(`/user/${user.id}`);
            if (!response.ok) throw new Error("Failed to fetch user data");
            const data = await response.json();
            document.getElementById("token-balance").textContent = data.balance || 0;
            document.getElementById("mining-rate").textContent = data.miningRate || 1;
        } catch (error) {
            console.error("Fetch user data error:", error);
            WebApp.showAlert("Failed to load user data!");
        }
    }

    document.getElementById("connect-wallet").addEventListener("click", async () => {
        const button = document.getElementById("connect-wallet");
        button.disabled = true;
        button.classList.add("loading");
        try {
            if (!window.solana || !window.solana.isPhantom) {
                WebApp.showAlert("Please install Phantom Wallet!");
                return;
            }
            await window.solana.connect();
            walletPublicKey = window.solana.publicKey.toString();
            document.getElementById("wallet-address").textContent = walletPublicKey.slice(0, 8) + "...";
            document.getElementById("mine-btn").disabled = false;
            await updateTokenBalance();
            WebApp.showAlert("Wallet connected!");
        } catch (error) {
            console.error("Wallet error:", error);
            WebApp.showAlert("Wallet connection failed!");
        } finally {
            button.disabled = false;
            button.classList.remove("loading");
        }
    });

    async function updateTokenBalance() {
        if (!walletPublicKey) return;
        try {
            const tokenAccount = await connection.getTokenAccountsByOwner(
                new solanaWeb3.PublicKey(walletPublicKey),
                { mint: new solanaWeb3.PublicKey(TOKEN_MINT_ADDRESS) }
            );
            if (tokenAccount.value.length > 0) {
                const balance = await connection.getTokenAccountBalance(tokenAccount.value[0].pubkey);
                document.getElementById("token-balance").textContent = balance.value.uiAmount || 0;
            } else {
                document.getElementById("token-balance").textContent = 0;
            }
        } catch (error) {
            console.error("Balance error:", error);
            WebApp.showAlert("Failed to fetch balance!");
        }
    }

    document.getElementById("mine-btn").addEventListener("click", async () => {
        if (!walletPublicKey) {
            WebApp.showAlert("Connect your wallet first!");
            return;
        }
        const button = document.getElementById("mine-btn");
        button.disabled = true;
        button.classList.add("loading");
        try {
            const response = await fetch("/mine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, wallet: walletPublicKey }),
            });
            if (!response.ok) throw new Error("Mining request failed");
            const data = await response.json();
            document.getElementById("token-balance").textContent = data.balance;
            document.getElementById("mining-rate").textContent = data.miningRate;
            await updateTokenBalance(); // Sync with Solana
            WebApp.showAlert(`Mined ${data.miningRate} OKAPI!`);
        } catch (error) {
            console.error("Mining error:", error);
            WebApp.showAlert("Mining failed! Check console for details.");
        } finally {
            button.disabled = false;
            button.classList.remove("loading");
        }
    });

    document.getElementById("buy-booster").addEventListener("click", async () => {
        const button = document.getElementById("buy-booster");
        button.disabled = true;
        button.classList.add("loading");
        try {
            const response = await fetch("/buy-booster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, wallet: walletPublicKey }),
            });
            if (!response.ok) throw new Error("Booster request failed");
            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Booster purchase failed");
            document.getElementById("token-balance").textContent = data.balance;
            document.getElementById("mining-rate").textContent = data.miningRate;
            WebApp.showAlert("Booster purchased! Mining rate doubled!");
        } catch (error) {
            console.error("Booster error:", error);
            WebApp.showAlert(error.message || "Booster purchase failed!");
        } finally {
            button.disabled = false;
            button.classList.remove("loading");
        }
    });

    document.querySelectorAll(".claim-task").forEach(button => {
        button.addEventListener("click", async () => {
            button.disabled = true;
            button.classList.add("loading");
            try {
                const taskReward = button.parentElement.textContent.includes("Invite a friend") ? 100 : 50;
                const response = await fetch("/claim-task", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id, wallet: walletPublicKey, reward: taskReward }),
                });
                if (!response.ok) throw new Error("Task claim failed");
                const data = await response.json();
                document.getElementById("token-balance").textContent = data.balance;
                WebApp.showAlert(`Task claimed! +${taskReward} OKAPI`);
            } catch (error) {
                console.error("Task error:", error);
                WebApp.showAlert("Task claim failed!");
            } finally {
                button.disabled = false;
                button.classList.remove("loading");
            }
        });
    });

    document.getElementById("copy-referral").addEventListener("click", () => {
        try {
            const link = document.getElementById("referral-link");
            link.select();
            document.execCommand("copy");
            WebApp.showAlert("Referral link copied!");
        } catch (error) {
            console.error("Copy error:", error);
            WebApp.showAlert("Failed to copy link!");
        }
    });

    async function fetchLeaderboard() {
        try {
            const response = await fetch("/leaderboard");
            if (!response.ok) throw new Error("Failed to fetch leaderboard");
            const data = await response.json();
            const leaderboard = document.getElementById("leaderboard");
            leaderboard.innerHTML = "";
            data.forEach(user => {
                const li = document.createElement("li");
                li.className = "list-group-item";
                li.textContent = `${user.username}: ${user.balance} OKAPI`;
                leaderboard.appendChild(li);
            });
        } catch (error) {
            console.error("Leaderboard error:", error);
            WebApp.showAlert("Failed to load leaderboard!");
        }
    }

    WebApp.onEvent("themeChanged", () => {
        document.body.style.background = WebApp.themeParams.bg_color || "linear-gradient(to bottom, #4B0082, #2E004F, #000000), url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5+h4GdmwYYAD5kREBBoQKwQAAAAASUVORK5CYII=') repeat";
    });

    fetchUserData();
    fetchLeaderboard();
};