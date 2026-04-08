const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const pool = require("./db.js");
const adminRoutes = require("./routes/admin.js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const PgSession = connectPgSimple(session);

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.ADMIN_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

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
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "fuuvia-admin-server" });
});

app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`FUUVIA admin server running on port ${PORT}`);
});
