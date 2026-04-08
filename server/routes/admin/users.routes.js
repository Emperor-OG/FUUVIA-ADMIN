const express = require("express");
const pool = require("../../db.js");
const requireAdminAuth = require("../../middleware/requireAdminAuth.js");

const router = express.Router();

const toPositiveInt = (value, fallback) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return num;
};

/* =========================
   USERS LIST
========================= */
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;

    const { search } = req.query;

    const values = [];
    let index = 1;
    let where = "";

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where = `
        WHERE
          CAST(id AS TEXT) ILIKE $${index}
          OR COALESCE(username, '') ILIKE $${index}
          OR COALESCE(email, '') ILIKE $${index}
          OR COALESCE(google_id, '') ILIKE $${index}
      `;
      values.push(term);
      index++;
    }

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM users
      ${where}
    `;

    const dataQuery = `
      SELECT
        id,
        username,
        email,
        google_id,
        last_login,
        created_at
      FROM users
      ${where}
      ORDER BY id ASC
      LIMIT $${index}
      OFFSET $${index + 1}
    `;

    const [countRes, dataRes] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(dataQuery, [...values, limit, offset]),
    ]);

    const total = countRes.rows[0]?.total || 0;

    return res.json({
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Users list error:", error);
    res.status(500).json({ message: "Failed to load users" });
  }
});

/* =========================
   SINGLE USER
========================= */
router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Single user error:", error);
    res.status(500).json({ message: "Failed to load user" });
  }
});

module.exports = router;