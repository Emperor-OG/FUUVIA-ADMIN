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
      affiliatesResult,
      pendingAffiliatesResult,
      activeAffiliatesResult,
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
      pool.query(`SELECT COUNT(*)::int AS total FROM affiliates`),
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM affiliates
        WHERE status = 'pending'
      `),
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM affiliates
        WHERE status = 'active'
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
      affiliates: affiliatesResult.rows[0].total,
      pending_affiliates: pendingAffiliatesResult.rows[0].total,
      active_affiliates: activeAffiliatesResult.rows[0].total,
    });
  } catch (error) {
    console.error("Overview error:", error);
    return res.status(500).json({ message: "Failed to load overview" });
  }
});

module.exports = router;
