const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const path = require("path");

const pool = require("./db.js");
const adminRoutes = require("./routes/admin.js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const PgSession = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

/* =========================
   CORS (DEV vs PROD)
========================= */
app.use(
  cors({
    origin: isProduction
      ? true // same-origin in prod
      : process.env.ADMIN_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

/* =========================
   SESSION
========================= */
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "admin_sessions",
      createTableIfMissing: true,
    }),
    name: "fuuvia_admin_sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction, // IMPORTANT
      sameSite: isProduction ? "lax" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

/* =========================
   API ROUTES
========================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "fuuvia-admin-server" });
});

app.use("/api/admin", adminRoutes);

/* =========================
   SERVE FRONTEND (DIST)
========================= */
const distPath = path.join(__dirname, "..", "dist");

app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();

  res.sendFile(path.join(distPath, "index.html"));
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`FUUVIA admin server running on port ${PORT}`);
});
