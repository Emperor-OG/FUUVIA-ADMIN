const express = require("express");
const pool = require("../../db.js");
const requireAdminAuth = require("../../middleware/requireAdminAuth.js");

const router = express.Router();

/* =========================
   OVERVIEW
========================= */
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const [
      usersResult,
      storesResult,
      productsResult,
      ordersResult,
      provincesResult,
      citiesResult,
      staffResult,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM users`),
      pool.query(`SELECT COUNT(*)::int AS total FROM stores`),
      pool.query(`SELECT COUNT(*)::int AS total FROM products`),
      pool.query(`SELECT COUNT(*)::int AS total FROM orders`),
      pool.query(`SELECT COUNT(*)::int AS total FROM provinces`),
      pool.query(`SELECT COUNT(*)::int AS total FROM cities`),
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM staff
        WHERE COALESCE(is_deleted, false) = false
      `),
    ]);

    return res.json({
      users: usersResult.rows[0].total,
      stores: storesResult.rows[0].total,
      products: productsResult.rows[0].total,
      orders: ordersResult.rows[0].total,
      provinces: provincesResult.rows[0].total,
      cities: citiesResult.rows[0].total,
      staff: staffResult.rows[0].total,
    });
  } catch (error) {
    console.error("Overview error:", error);
    return res.status(500).json({ message: "Failed to load overview" });
  }
});

module.exports = router;