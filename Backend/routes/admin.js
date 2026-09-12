import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/user.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import Thread from "../models/thread.js";
import AuditLog from "../models/auditLog.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

 
router.use(requireAuth, requireAdmin);


router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const deactivatedUsers = await User.countDocuments({ status: "deactivated" });
    const adminUsers = await User.countDocuments({ role: "admin" });
    const totalThreads = await Thread.countDocuments();

    const threadAggregation = await Thread.aggregate([
      { $project: { messageCount: { $size: { $ifNull: ["$messages", []] } } } },
      { $group: { _id: null, totalMessages: { $sum: "$messageCount" } } },
    ]);
    const totalMessages = threadAggregation[0]?.totalMessages || 0;

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        deactivatedUsers,
        adminUsers,
        totalThreads,
        totalMessages,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to fetch system stats." });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { search = "", role, status, page = 1, limit = 50 } = req.query;

    const query = {};

    if (search) {
      query.username = { $regex: search.trim().toLowerCase(), $options: "i" };
    }

    if (role && ["user", "admin"].includes(role)) {
      query.role = role;
    }

    if (status && ["active", "deactivated"].includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password_hash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Admin get users error:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

 
router.patch("/users/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!["active", "deactivated"].includes(status)) {
      return res.status(400).json({ error: "Status must be either 'active' or 'deactivated'." });
    }

     
    if (req.user._id.toString() === userId && status === "deactivated") {
      return res.status(400).json({
        error: "Action forbidden: You cannot deactivate your own administrative account.",
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const oldStatus = targetUser.status;
    targetUser.status = status;
    await targetUser.save();

    
    await AuditLog.create({
      adminId: req.user._id,
      adminUsername: req.user.username,
      action: status === "active" ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      targetUserId: targetUser._id,
      targetUsername: targetUser.username,
      details: { previousStatus: oldStatus, newStatus: status },
    });

    res.json({
      message: `User '${targetUser.username}' has been ${
        status === "active" ? "activated" : "deactivated"
      }.`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (err) {
    console.error("Admin update status error:", err);
    res.status(500).json({ error: "Failed to update user status." });
  }
});

 
router.patch("/users/:userId/role", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Role must be either 'user' or 'admin'." });
    }

    
    if (req.user._id.toString() === userId && role === "user") {
      const adminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: "Action forbidden: You cannot demote the only active administrator.",
        });
      }
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

     
    await AuditLog.create({
      adminId: req.user._id,
      adminUsername: req.user.username,
      action: "ROLE_CHANGED",
      targetUserId: targetUser._id,
      targetUsername: targetUser.username,
      details: { previousRole: oldRole, newRole: role },
    });

    res.json({
      message: `User '${targetUser.username}' role changed to '${role}'.`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (err) {
    console.error("Admin update role error:", err);
    res.status(500).json({ error: "Failed to update user role." });
  }
});

 
router.get("/audit-logs", async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(Math.min(100, Math.max(1, parseInt(limit, 10))));

    res.json({ logs });
  } catch (err) {
    console.error("Admin get audit logs error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
});

 
router.get("/config", async (req, res) => {
  try {
    const isConfigured = !!(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim() &&
      process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
    );

    res.json({
      geminiConfigured: isConfigured,
      geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    });
  } catch (err) {
    console.error("Admin get config error:", err);
    res.status(500).json({ error: "Failed to read configuration." });
  }
});

 
router.patch("/config", async (req, res) => {
  try {
    const { geminiApiKey, geminiModel } = req.body;

    if (geminiApiKey !== undefined) {
      const cleanKey = geminiApiKey.trim();
      process.env.GEMINI_API_KEY = cleanKey;

       
      const envPath = path.resolve(__dirname, "../.env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (envContent.includes("GEMINI_API_KEY=")) {
          envContent = envContent.replace(
            /GEMINI_API_KEY=.*/g,
            `GEMINI_API_KEY=${cleanKey}`
          );
        } else {
          envContent = `GEMINI_API_KEY=${cleanKey}\n` + envContent;
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
      }
    }

    if (geminiModel) {
      process.env.GEMINI_MODEL = geminiModel.trim();
    }

      await AuditLog.create({
      adminId: req.user._id,
      adminUsername: req.user.username,
      action: "CONFIG_UPDATED",
      targetUserId: req.user._id,
      targetUsername: req.user.username,
      details: {
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        geminiModel: process.env.GEMINI_MODEL,
      },
    });

    res.json({
      message: "AI configuration saved successfully.",
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
    });
  } catch (err) {
    console.error("Admin update config error:", err);
    res.status(500).json({ error: "Failed to update configuration." });
  }
});

export default router;
