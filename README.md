# SigmaGPT — Production Full-Stack AI Application

SigmaGPT is a production-quality, responsive AI chat web application powered by Google's Gemini API, Node.js Express, MongoDB, and React (Vite).

---

## 🚀 Quick Setup

### 1. Backend Setup

```bash
cd Backend
npm install
```

Create/edit `Backend/.env`:

```env
# Google Gemini API Key (Required for live AI generation)
# Obtain free from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Model Selection (default: gemini-2.0-flash)
GEMINI_MODEL=gemini-2.0-flash

# MongoDB Database Connection String (local or Atlas)
MONGODB_URI=enter your url

# JWT Authentication Secret Key
JWT_SECRET=sigmagpt_local_dev_jwt_secret_secure_key_2026

# Server Port (default 8080)
PORT=8080

# Administrator Credentials
Admin credentials are configured through environment variables.
```

Start the backend:
```bash
npm start
# Backend server runs on http://localhost:8080
```

### 2. Frontend Setup

```bash
cd Frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 🔐 Environment Variables Reference

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key from Google AI Studio | **Yes (for AI)** | Empty |
| `GEMINI_MODEL` | Gemini model name | No | `gemini-2.0-flash` |
| `MONGODB_URI` | MongoDB connection URI | Yes | `mongodb://127.0.0.1:27017/sigmagpt` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | Yes | `sigmagpt_local_dev_...` |
| `PORT` | Backend HTTP port | No | `8080` |
| `DEFAULT_ADMIN_USERNAME` | Username for automatically seeded admin | No | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Password for automatically seeded admin | No | `Admin@123` |

---

## ✨ Features

- **Real Google Gemini Responses**: Direct server-side integration using `@google/generative-ai` with real-time SSE streaming.
- **Context-Aware Conversation Memory**: Multi-turn history preserves context so pronouns and follow-up questions work accurately.
- **Complete Authentication**: Register, Login, JWT session persistence, password change, and secure forgot/reset password flows.
- **Role-Based Access Control (RBAC)**: Admin vs User permissions. Server-enforced protection on all sensitive endpoints.
- **Server-Side Admin Dashboard**: Live system statistics, user accounts management (activate / deactivate), role promotion, and audit activity logging.
- **Dark / Light Mode Toggle**: Seamless, high-contrast theme switch located next to Login/Profile area with persistent state.
- **Markdown & Code Highlighting**: Syntax highlighting for code blocks with one-click copy.
