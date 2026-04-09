const express = require("express");
const session = require("express-session");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const connectPgSimple = require("connect-pg-simple");

const pool = require("./db.js");
const adminRoutes = require("./routes/admin.js");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const PgSession = connectPgSimple(session);

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", PORT);

app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: isProd
      ? true
      : process.env.ADMIN_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

/* =========================
   SERVE FRONTEND FIRST
========================= */
if (isProd) {
  const clientPath = path.join(__dirname, "..", "dist");

  console.log("Admin dist path:", clientPath);
  console.log("Admin dist exists:", fs.existsSync(clientPath));

  if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));

    app.get("/favicon.ico", (req, res) => {
      const faviconPath = path.join(clientPath, "favicon.ico");
      if (fs.existsSync(faviconPath)) return res.sendFile(faviconPath);
      return res.status(204).end();
    });

    app.get(/^(?!\/api\/).*/, (req, res) => {
      return res.sendFile(path.join(clientPath, "index.html"));
    });
  }
}

/* =========================
   SESSION ONLY FOR API
========================= */
const adminSession = session({
  store: new PgSession({
    pool,
    tableName: "admin_sessions",
    createTableIfMissing: false,
  }),
  name: "fuuvia_admin_sid",
  secret: process.env.SESSION_SECRET || "fallback_admin_secret",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});

app.use("/api", adminSession);

/* =========================
   API ROUTES
========================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "fuuvia-admin-server" });
});

app.use("/api/admin", adminRoutes);

/* =========================
   404 + ERROR HANDLING
========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled admin server error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(
    `✅ FUUVIA Admin server running on ${HOST}:${PORT} (${isProd ? "Production" : "Dev"})`
  );
});
