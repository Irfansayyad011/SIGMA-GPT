import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chat.js";
import User from "./models/user.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, ".env");
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 8080;

 const isGeminiKeySet = !!(
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY.trim() &&
  process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
);
console.log("=========================================");
console.log(`[Diagnostic] Environment loaded from: ${envPath}`);
console.log(`[Diagnostic] Gemini API key configured: ${isGeminiKeySet ? "YES" : "NO"}`);
console.log(`[Diagnostic] Active Gemini Model: ${process.env.GEMINI_MODEL || "gemini-3.6-flash"}`);
console.log(`[Diagnostic] MongoDB configured: ${process.env.MONGODB_URI ? "YES" : "NO (using fallback)"}`);
console.log("=========================================");

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Public health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"),
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    timestamp: new Date().toISOString(),
  });
});

// ================= ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", chatRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected internal server error occurred.",
  });
});

// ================= DATABASE & INITIALIZATION =================
const seedDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(defaultPassword, salt);

      const adminUser = new User({
        username: defaultUsername.toLowerCase(),
        password_hash,
        role: "admin",
        status: "active",
      });

      await adminUser.save();
      console.log(`[SEED] Created default admin account '${defaultUsername}'`);
    }
  } catch (err) {
    console.error("Failed to seed default admin:", err);
  }
};

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = "mongodb://127.0.0.1:27017/sigmagpt";

  if (primaryUri) {
    try {
      console.log("Attempting MongoDB connection with configured URI...");
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
      console.log("Connected to MongoDB successfully via configured URI.");
      await seedDefaultAdmin();
      return;
    } catch (err) {
      console.warn("Primary MongoDB connection failed (" + err.message + "). Trying local fallback...");
    }
  }

  try {
    await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 4000 });
    console.log("Connected to MongoDB successfully via local fallback (mongodb://127.0.0.1:27017/sigmagpt).");
    await seedDefaultAdmin();
  } catch (fallbackErr) {
    console.error("CRITICAL: All MongoDB connection attempts failed:", fallbackErr.message);
  }
};

app.listen(PORT, async () => {
  console.log(`SigmaGPT Server running on http://localhost:${PORT}`);
  await connectDB();
});

export default app;
