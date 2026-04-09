const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../../db.js");

const router = express.Router();

const isDev = process.env.NODE_ENV !== "production";

/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const trimmedEmail = String(email || "").trim();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (isDev) {
      console.log("========== ADMIN LOGIN ATTEMPT ==========");
      console.log("Incoming email:", trimmedEmail);
      console.log("Password provided:", Boolean(password));
      console.log("Password length:", String(password).length);
    }

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        full_name,
        phone,
        address,
        password_hash,
        role,
        is_active,
        must_change_password,
        COALESCE(is_deleted, false) AS is_deleted
      FROM staff
      WHERE LOWER(email) = LOWER($1)
        AND COALESCE(is_deleted, false) = false
      LIMIT 1
      `,
      [trimmedEmail]
    );

    if (isDev) {
      console.log("Staff row found:", result.rows.length > 0);
      console.log("Matched rows:", result.rows.length);
    }

    if (result.rows.length === 0) {
      if (isDev) {
        const rawCheck = await pool.query(
          `
          SELECT
            id,
            email,
            is_active,
            COALESCE(is_deleted, false) AS is_deleted,
            LENGTH(password_hash) AS hash_length
          FROM staff
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
          `,
          [trimmedEmail]
        );

        console.log("Raw row exists without is_deleted filter:", rawCheck.rows.length > 0);
        if (rawCheck.rows[0]) {
          console.log("Raw row debug:", rawCheck.rows[0]);
        }
        console.log("========== ADMIN LOGIN FAILED: NO USER ==========");
      }

      return res.status(401).json({ message: "Invalid credentials" });
    }

    const staff = result.rows[0];

    if (isDev) {
      console.log("Staff ID:", staff.id);
      console.log("Staff email:", staff.email);
      console.log("is_active:", staff.is_active);
      console.log("is_deleted:", staff.is_deleted);
      console.log("Role:", staff.role);
      console.log("Hash exists:", Boolean(staff.password_hash));
      console.log("Hash length:", staff.password_hash ? staff.password_hash.length : null);
      console.log("Hash preview:", staff.password_hash ? staff.password_hash.slice(0, 15) + "..." : null);
    }

    if (!staff.is_active) {
      if (isDev) {
        console.log("========== ADMIN LOGIN FAILED: INACTIVE ACCOUNT ==========");
      }
      return res.status(403).json({ message: "This staff account is inactive" });
    }

    if (!staff.password_hash) {
      if (isDev) {
        console.log("========== ADMIN LOGIN FAILED: NO HASH ==========");
      }
      return res.status(500).json({ message: "Password hash missing for this account" });
    }

    const passwordMatch = await bcrypt.compare(String(password), staff.password_hash);

    if (isDev) {
      console.log("Password match:", passwordMatch);
    }

    if (!passwordMatch) {
      if (isDev) {
        console.log("========== ADMIN LOGIN FAILED: BAD PASSWORD ==========");
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.admin = {
      id: staff.id,
      email: staff.email,
      full_name: staff.full_name,
      phone: staff.phone,
      address: staff.address,
      role: staff.role,
      must_change_password: staff.must_change_password,
    };

    if (isDev) {
      console.log("Session admin set:", req.session.admin);
      console.log("Session ID:", req.sessionID);
    }

    await pool.query(
      `
      UPDATE staff
      SET last_login_at = NOW(), updated_at = NOW(), updated_by = $2
      WHERE id = $1
      `,
      [staff.id, staff.id]
    );

    if (isDev) {
      console.log("Last login updated for staff ID:", staff.id);
      console.log("========== ADMIN LOGIN SUCCESS ==========");
    }

    return res.json({
      authenticated: true,
      admin: req.session.admin,
    });
  } catch (error) {
    console.error("Admin login error:", error);

    if (isDev) {
      console.log("========== ADMIN LOGIN CRASH ==========");
      console.log("Error message:", error?.message);
      console.log("Error code:", error?.code);
      console.log("Error detail:", error?.detail);
      console.log("Error stack:", error?.stack);
    }

    return res.status(500).json({
      message: "Server error",
      debug: isDev
        ? {
            error: error?.message,
            code: error?.code || null,
            detail: error?.detail || null,
          }
        : undefined,
    });
  }
});

/* =========================
   CURRENT ADMIN
========================= */
router.get("/me", (req, res) => {
  if (isDev) {
    console.log("========== ADMIN /ME ==========");
    console.log("Session exists:", Boolean(req.session));
    console.log("Session ID:", req.sessionID);
    console.log("Admin in session:", req.session?.admin || null);
  }

  if (!req.session || !req.session.admin) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    admin: req.session.admin,
  });
});

/* =========================
   LOGOUT
========================= */
router.post("/logout", (req, res) => {
  if (isDev) {
    console.log("========== ADMIN LOGOUT ==========");
    console.log("Session exists before destroy:", Boolean(req.session));
    console.log("Session ID before destroy:", req.sessionID);
    console.log("Admin before destroy:", req.session?.admin || null);
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Admin logout error:", err);
      return res.status(500).json({ message: "Failed to logout" });
    }

    res.clearCookie("fuuvia_admin_sid");

    if (isDev) {
      console.log("Session destroyed successfully");
    }

    return res.json({ success: true });
  });
});

module.exports = router;
