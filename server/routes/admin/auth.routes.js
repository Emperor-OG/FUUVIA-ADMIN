const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../../db.js");

const router = express.Router();

/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
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
        must_change_password
      FROM staff
      WHERE LOWER(email) = LOWER($1)
        AND COALESCE(is_deleted, false) = false
      LIMIT 1
      `,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const staff = result.rows[0];

    if (!staff.is_active) {
      return res.status(403).json({ message: "This staff account is inactive" });
    }

    const passwordMatch = await bcrypt.compare(password, staff.password_hash);

    if (!passwordMatch) {
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

    await pool.query(
      `
      UPDATE staff
      SET last_login_at = NOW(), updated_at = NOW(), updated_by = $2
      WHERE id = $1
      `,
      [staff.id, staff.id]
    );

    return res.json({
      authenticated: true,
      admin: req.session.admin,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   CURRENT ADMIN
========================= */
router.get("/me", (req, res) => {
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
  req.session.destroy(() => {
    res.clearCookie("fuuvia_admin_sid");
    return res.json({ success: true });
  });
});

module.exports = router;