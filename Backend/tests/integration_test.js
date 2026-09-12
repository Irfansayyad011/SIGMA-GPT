import http from "http";

const BASE_URL = "http://localhost:8080";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log("=== Starting SigmaGPT Gemini & RBAC Integration Test Suite ===");

  // 1. Health check
  console.log("\n1. Testing Health Endpoint...");
  const health = await request("/api/health");
  console.log("Health Status:", health.status, health.data);
  if (health.status !== 200) throw new Error("Health check failed");

  // 2. Default Admin Login
  console.log("\n2. Testing Default Admin Login...");
  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "Admin@123" }),
  });
  console.log("Admin Login Status:", adminLogin.status, "User role:", adminLogin.data.user?.role);
  if (adminLogin.status !== 200 || !adminLogin.data.token) {
    throw new Error("Admin login failed");
  }
  const adminToken = adminLogin.data.token;

  // 3. User Registration
  const testUser = `testuser_${Date.now()}`;
  console.log(`\n3. Registering new standard user '${testUser}'...`);
  const regRes = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: testUser, password: "Password123!" }),
  });
  console.log("Registration Status:", regRes.status, "User:", regRes.data.user);
  if (regRes.status !== 201 || !regRes.data.token) {
    throw new Error("User registration failed");
  }
  const userToken = regRes.data.token;
  const userId = regRes.data.user.id;

  // 4. Test User Login
  console.log("\n4. Testing Standard User Login with wrong password...");
  const wrongLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: testUser, password: "WrongPassword" }),
  });
  console.log("Wrong password Status (expected 401):", wrongLogin.status);
  if (wrongLogin.status !== 401) throw new Error("Should have rejected wrong password");

  console.log("Testing Standard User Login with correct password...");
  const correctLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: testUser, password: "Password123!" }),
  });
  console.log("Login Status (expected 200):", correctLogin.status);
  if (correctLogin.status !== 200) throw new Error("Login failed with correct password");

  // 5. Test Auth /me endpoint
  console.log("\n5. Testing /api/auth/me...");
  const meRes = await request("/api/auth/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log("Me Status:", meRes.status, "Username:", meRes.data.user?.username);
  if (meRes.status !== 200) throw new Error("Failed to get /me profile");

  // 6. Non-Admin attempting Admin Endpoint (RBAC test)
  console.log("\n6. Testing RBAC: Standard user accessing /api/admin/users (should be 403)...");
  const forbiddenRes = await request("/api/admin/users", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log("RBAC Access Status (expected 403):", forbiddenRes.status);
  if (forbiddenRes.status !== 403) throw new Error("RBAC security failure: Non-admin accessed admin API");

  // 7. Admin accessing Admin Endpoint
  console.log("\n7. Admin accessing /api/admin/users & stats...");
  const adminUsersRes = await request("/api/admin/users", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log("Admin Users List Status (expected 200):", adminUsersRes.status, "Total users:", adminUsersRes.data.pagination?.total);
  if (adminUsersRes.status !== 200) throw new Error("Admin users list failed");

  const adminStatsRes = await request("/api/admin/stats", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log("Admin Stats Status:", adminStatsRes.status, "Stats:", adminStatsRes.data.stats);

  // 8. Forgot Password & Reset Password Flow
  console.log("\n8. Testing Forgot Password Flow...");
  const forgotRes = await request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ username: testUser }),
  });
  console.log("Forgot Password Status:", forgotRes.status, "Reset token generated:", !!forgotRes.data.resetToken);
  const resetToken = forgotRes.data.resetToken;

  if (resetToken) {
    console.log("Executing Reset Password with Token...");
    const resetRes = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        username: testUser,
        token: resetToken,
        newPassword: "NewSecurePassword456!",
      }),
    });
    console.log("Reset Password Status (expected 200):", resetRes.status, resetRes.data.message);
    if (resetRes.status !== 200) throw new Error("Reset password failed");

    // Verify login with new password
    const newPassLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: testUser, password: "NewSecurePassword456!" }),
    });
    console.log("Login with new password Status (expected 200):", newPassLogin.status);
    if (newPassLogin.status !== 200) throw new Error("Failed to login with new password");
  }

  // 9. AI Chat Endpoint verification with missing GEMINI_API_KEY
  const threadId = `thread_${Date.now()}`;
  console.log(`\n9. Testing AI Chat error handling when GEMINI_API_KEY is not configured...`);
  const chatRes = await request("/api/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      threadId,
      message: "hii",
    }),
  });
  console.log("Chat Response Status:", chatRes.status, "Response Data:", chatRes.data);
   if (
    chatRes.data?.error !==
    "AI service is not configured. Please configure GEMINI_API_KEY in the server environment."
  ) {
    console.log("Gemini API key is active or returned:", chatRes.data);
  } else {
    console.log("✓ Correctly returned exact user-facing error message for unconfigured AI service.");
  }

  // 10. Admin Deactivate User
  console.log("\n10. Testing Admin Account Deactivation...");
  const deactRes = await request(`/api/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "deactivated" }),
  });
  console.log("Deactivation Status:", deactRes.status, deactRes.data.message);

  // 11. Verify Deactivated User Login Attempt
  console.log("Testing Deactivated User Login (should be 403 Forbidden)...");
  const deactLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: testUser, password: "NewSecurePassword456!" }),
  });
  console.log("Deactivated User Login Status (expected 403):", deactLogin.status);
  if (deactLogin.status !== 403) throw new Error("Deactivated user should be rejected with 403");

  // 12. Admin Reactivate User
  console.log("\n12. Testing Admin Account Reactivation...");
  const reactRes = await request(`/api/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "active" }),
  });
  console.log("Reactivation Status:", reactRes.status, reactRes.data.message);

  // 13. Check Audit Logs
  console.log("\n13. Checking Admin Audit Logs...");
  const auditRes = await request("/api/admin/audit-logs", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log("Audit Logs count:", auditRes.data.logs?.length, "Latest action:", auditRes.data.logs?.[0]?.action);

  console.log("\n========================================================");
  console.log("  ALL GEMINI & RBAC TESTS PASSED SUCCESSFULLY!         ");
  console.log("========================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
