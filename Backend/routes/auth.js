import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.js";
import PasswordResetToken from "../models/passwordResetToken.js";
import { requireAuth, generateToken } from "../middleware/auth.js";

const router = express.Router();

 const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

 router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ error: "Username must be between 3 and 30 characters." });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        error: "Username can only contain letters, numbers, underscores, and dashes.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return res.status(409).json({ error: "Username is already taken." });
    }

     const userCount = await User.countDocuments();
    const role = userCount === 0 ? "admin" : "user";

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = new User({
      username: cleanUsername,
      password_hash,
      role,
      status: "active",
      last_login_at: new Date(),
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
});

 router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    if (user.status === "deactivated") {
      return res.status(403).json({
        error: "Your account is deactivated. Please contact an administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    user.last_login_at = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        last_login_at: user.last_login_at,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

 router.get("/me", requireAuth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role,
        status: req.user.status,
        createdAt: req.user.createdAt,
        last_login_at: req.user.last_login_at,
      },
    });
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({ error: "Failed to fetch user data." });
  }
});

 router.post("/forgot-password", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });

     const genericResponse = {
      message:
        "If an account with that username exists, a password reset token has been generated.",
    };

    if (!user || user.status === "deactivated") {
      return res.json(genericResponse);
    }

     await PasswordResetToken.deleteMany({ userId: user._id });

     const rawToken = crypto.randomBytes(16).toString("hex");
    const hashedToken = hashToken(rawToken);

     const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: hashedToken,
      expiresAt,
    });

    console.log(`[AUTH] Password reset token generated for user '${cleanUsername}': ${rawToken}`);

     res.json({
      ...genericResponse,
      resetToken: rawToken,
      expiresInMinutes: 15,
      username: cleanUsername,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error processing password reset." });
  }
});

 router.post("/reset-password", async (req, res) => {
  try {
    const { username, token, newPassword } = req.body;

    if (!username || !token || !newPassword) {
      return res.status(400).json({ error: "Username, token, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const tokenHash = hashToken(token.trim());
    const resetRecord = await PasswordResetToken.findOne({
      userId: user._id,
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({ error: "Invalid or expired password reset token." });
    }

     const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

     resetRecord.used = true;
    await resetRecord.save();
    await PasswordResetToken.deleteMany({ userId: user._id });

    res.json({
      message: "Password has been successfully reset. You may now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error during password reset." });
  }
});

 router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

     const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password does not match." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error changing password." });
  }
});

export default router;
