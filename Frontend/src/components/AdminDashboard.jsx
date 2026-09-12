import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useChat } from "../MyContext";
import ConfirmModal from "./ConfirmModal";

const API_BASE = "http://localhost:8080/api";

export default function AdminDashboard() {
  const { user, token, isAdmin } = useAuth();
  const { adminModalOpen, setAdminModalOpen } = useChat();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'audit' | 'stats'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // AI Configuration state
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash");
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Confirm modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
    isDestructive: true,
  });

  // Fetch admin stats
  const fetchStats = useCallback(async () => {
    if (!token || !isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    }
  }, [token, isAdmin]);

  // Fetch users with filters
  const fetchUsers = useCallback(async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      if (roleFilter) params.append("role", roleFilter);

      const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        showError("Failed to fetch user accounts.");
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin, searchQuery, statusFilter, roleFilter, showError]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    if (!token || !isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  }, [token, isAdmin]);

  // Fetch AI configuration
  const fetchConfig = useCallback(async () => {
    if (!token || !isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsGeminiConfigured(data.geminiConfigured);
        if (data.geminiModel) setSelectedModel(data.geminiModel);
      }
    } catch (err) {
      console.error("Failed to fetch admin config:", err);
    }
  }, [token, isAdmin]);

  // Save AI configuration
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/admin/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          geminiApiKey: geminiKeyInput,
          geminiModel: selectedModel,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "AI configuration saved successfully.");
        setIsGeminiConfigured(data.geminiConfigured);
        setGeminiKeyInput("");
        fetchAuditLogs();
      } else {
        showError(data.error || "Failed to save AI configuration.");
      }
    } catch (err) {
      showError("Network error saving configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    if (adminModalOpen && isAdmin) {
      fetchStats();
      fetchConfig();
      if (activeTab === "users") fetchUsers();
      if (activeTab === "audit") fetchAuditLogs();
    }
  }, [adminModalOpen, isAdmin, activeTab, fetchStats, fetchUsers, fetchAuditLogs, fetchConfig]);

  if (!adminModalOpen || !isAdmin) return null;

  // Handler to toggle user status (activate / deactivate)
  const handleToggleStatus = (targetUser) => {
    const newStatus = targetUser.status === "active" ? "deactivated" : "active";

    if (targetUser._id === user?.id && newStatus === "deactivated") {
      showError("Security protection: You cannot deactivate your own account.");
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: `${newStatus === "deactivated" ? "Deactivate" : "Activate"} User Account?`,
      message: `Are you sure you want to ${newStatus} the account for "${targetUser.username}"? ${
        newStatus === "deactivated"
          ? "The user will immediately be blocked from logging in or making API requests."
          : "The user will regain full access to their conversations."
      }`,
      isDestructive: newStatus === "deactivated",
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/admin/users/${targetUser._id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: newStatus }),
          });

          const data = await res.json();
          if (res.ok) {
            showSuccess(data.message);
            fetchUsers();
            fetchStats();
          } else {
            showError(data.error || "Failed to update status.");
          }
        } catch (err) {
          showError("Network error changing status.");
        } finally {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handler to toggle role (user <-> admin)
  const handleToggleRole = (targetUser) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";

    setConfirmModalState({
      isOpen: true,
      title: `Change Role to ${newRole.toUpperCase()}?`,
      message: `Are you sure you want to change "${targetUser.username}" role to "${newRole}"?`,
      isDestructive: newRole === "user",
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/admin/users/${targetUser._id}/role`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          const data = await res.json();
          if (res.ok) {
            showSuccess(data.message);
            fetchUsers();
            fetchStats();
          } else {
            showError(data.error || "Failed to update role.");
          }
        } catch (err) {
          showError("Network error updating role.");
        } finally {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={() => setAdminModalOpen(false)}>
        <div
          className="modal-content admin-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-header">
            <div className="modal-title-row">
              <div className="admin-badge-icon">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h2>Admin Control Center</h2>
                <p className="modal-subtitle">Manage users, security statuses, and system audit logs</p>
              </div>
            </div>
            <button
              className="modal-close-btn"
              onClick={() => setAdminModalOpen(false)}
              aria-label="Close admin modal"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* System Stats Row */}
          {stats && (
            <div className="admin-stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.totalUsers}</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="stat-card stat-card-active">
                <div className="stat-number">{stats.activeUsers}</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-card stat-card-deactivated">
                <div className="stat-number">{stats.deactivatedUsers}</div>
                <div className="stat-label">Deactivated</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalThreads}</div>
                <div className="stat-label">Conversations</div>
              </div>
            </div>
          )}

          {/* Admin Tabs */}
          <div className="admin-tabs">
            <button
              className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              <i className="fa-solid fa-users"></i> Users Management
            </button>
            <button
              className={`admin-tab-btn ${activeTab === "audit" ? "active" : ""}`}
              onClick={() => setActiveTab("audit")}
            >
              <i className="fa-solid fa-list-check"></i> Audit Activity Logs
            </button>
            <button
              className={`admin-tab-btn ${activeTab === "config" ? "active" : ""}`}
              onClick={() => setActiveTab("config")}
            >
              <i className="fa-solid fa-key"></i> AI Configuration
            </button>
          </div>

          <div className="admin-body">
            {/* ================= AI CONFIGURATION TAB ================= */}
            {activeTab === "config" && (
              <div className="admin-config-section">
                <h3>Google Gemini Engine Configuration</h3>
                <p className="settings-desc">
                  Configure your Google Gemini API credentials. Changes take effect immediately and are saved to the server environment.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>AI Service Status:</span>
                  <span className={`badge badge-${isGeminiConfigured ? "active" : "deactivated"}`}>
                    {isGeminiConfigured ? "CONFIGURED & ACTIVE" : "NOT CONFIGURED"}
                  </span>
                </div>

                <form onSubmit={handleSaveConfig} className="auth-form" style={{ maxWidth: "540px", padding: 0 }}>
                  <div className="form-group">
                    <label>Google Gemini API Key</label>
                    <div className="input-with-icon">
                      <i className="fa-solid fa-key input-icon"></i>
                      <input
                        type="password"
                        placeholder={
                          isGeminiConfigured
                            ? "•••••••••••••••• (Configured — paste to update)"
                            : "Paste your GEMINI_API_KEY"
                        }
                        value={geminiKeyInput}
                        onChange={(e) => setGeminiKeyInput(e.target.value)}
                      />
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      Get a free API key at{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        Google AI Studio
                      </a>.
                    </span>
                  </div>

                  <div className="form-group" style={{ marginTop: "1rem" }}>
                    <label>Gemini Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="admin-select"
                      style={{ width: "100%" }}
                    >
                      <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommended)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="primary-btn submit-btn"
                    disabled={savingConfig}
                    style={{ marginTop: "1.25rem" }}
                  >
                    {savingConfig ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                      </>
                    ) : (
                      "Save AI Configuration"
                    )}
                  </button>
                </form>
              </div>
            )}
            {/* ================= USERS MANAGEMENT TAB ================= */}
            {activeTab === "users" && (
              <div className="users-management">
                <div className="table-controls">
                  <div className="search-bar">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      placeholder="Search users by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-group">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="admin-select"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="deactivated">Deactivated</option>
                    </select>

                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="admin-select"
                    >
                      <option value="">All Roles</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>

                    <button className="icon-btn refresh-btn" onClick={fetchUsers} title="Refresh list">
                      <i className="fa-solid fa-rotate-right"></i>
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Registered</th>
                        <th>Last Login</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="table-loading">
                            <i className="fa-solid fa-spinner fa-spin"></i> Loading users...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="table-empty">
                            No user accounts found matching query.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u._id} className={u.status === "deactivated" ? "row-deactivated" : ""}>
                            <td className="user-cell">
                              <span className="user-cell-avatar">
                                {u.username.substring(0, 2).toUpperCase()}
                              </span>
                              <span className="user-cell-name">
                                {u.username}
                                {u._id === user?.id && <span className="self-tag">(You)</span>}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${u.role}`}>{u.role.toUpperCase()}</span>
                            </td>
                            <td>
                              <span className={`badge badge-${u.status}`}>
                                {u.status.toUpperCase()}
                              </span>
                            </td>
                            <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}</td>
                            <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}</td>
                            <td className="text-right action-cells">
                              <button
                                className={`action-pill-btn ${
                                  u.status === "active" ? "deactivate-btn" : "activate-btn"
                                }`}
                                onClick={() => handleToggleStatus(u)}
                                disabled={u._id === user?.id && u.status === "active"}
                                title={
                                  u._id === user?.id && u.status === "active"
                                    ? "Cannot deactivate your own account"
                                    : u.status === "active"
                                    ? "Deactivate Account"
                                    : "Activate Account"
                                }
                              >
                                {u.status === "active" ? (
                                  <>
                                    <i className="fa-solid fa-ban"></i> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <i className="fa-solid fa-check"></i> Activate
                                  </>
                                )}
                              </button>

                              <button
                                className="action-pill-btn role-btn"
                                onClick={() => handleToggleRole(u)}
                                title="Change User Role"
                              >
                                {u.role === "admin" ? "Demote" : "Make Admin"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================= AUDIT LOGS TAB ================= */}
            {activeTab === "audit" && (
              <div className="audit-management">
                <div className="table-controls">
                  <h3>Audit Activity Trail</h3>
                  <button className="icon-btn refresh-btn" onClick={fetchAuditLogs} title="Refresh logs">
                    <i className="fa-solid fa-rotate-right"></i>
                  </button>
                </div>

                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Target User</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="table-empty">
                            No administrative audit records logged yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log._id}>
                            <td className="timestamp-cell">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <strong>{log.adminUsername}</strong>
                            </td>
                            <td>
                              <span className="audit-action-tag">{log.action}</span>
                            </td>
                            <td>{log.targetUsername || "N/A"}</td>
                            <td className="audit-details-cell">
                              {JSON.stringify(log.details || {})}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isDestructive={confirmModalState.isDestructive}
        onConfirm={confirmModalState.action}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
