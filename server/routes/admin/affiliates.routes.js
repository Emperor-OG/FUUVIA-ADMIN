const express = require("express");
const pool = require("../../db");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session?.admin?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function canManageAffiliates(role) {
  return ["emperor", "super_admin", "executive", "human_resource"].includes(
    role
  );
}

function generateReferralCode(fullName = "") {
  const cleaned = String(fullName)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const prefix = cleaned.slice(0, 3).padEnd(3, "X");

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";

  for (let i = 0; i < 3; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}${randomPart}`;
}

async function getUniqueReferralCode(fullName) {
  for (let i = 0; i < 20; i++) {
    const code = generateReferralCode(fullName);

    const exists = await pool.query(
      `SELECT id FROM affiliates WHERE referral_code = $1 LIMIT 1`,
      [code]
    );

    if (!exists.rows.length) {
      return code;
    }
  }

  throw new Error("Failed to generate unique referral code");
}

// GET /api/admin/affiliates
router.get("/", requireAdmin, async (req, res) => {
  try {
    if (!canManageAffiliates(req.session.admin.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [pendingRes, activeRes] = await Promise.all([
      pool.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          status,
          application_note,
          referral_code,
          created_at,
          verified_at
        FROM affiliates
        WHERE status = 'pending'
        ORDER BY created_at ASC
        `
      ),
      pool.query(
        `
        SELECT
          a.id,
          a.full_name,
          a.email,
          a.phone,
          a.status,
          a.referral_code,
          a.created_at,
          a.verified_at,
          COALESCE(SUM(CASE WHEN ae.earning_status = 'tracked' THEN ae.earning_amount ELSE 0 END), 0) AS tracked_total,
          COALESCE(SUM(CASE WHEN ae.earning_status = 'completed' THEN ae.earning_amount ELSE 0 END), 0) AS completed_total,
          COALESCE(SUM(CASE WHEN ae.earning_status = 'ready_for_payout' THEN ae.earning_amount ELSE 0 END), 0) AS ready_total,
          COALESCE(SUM(CASE WHEN ae.earning_status = 'paid' THEN ae.earning_amount ELSE 0 END), 0) AS paid_total,
          COUNT(ae.id) AS order_count
        FROM affiliates a
        LEFT JOIN affiliate_earnings ae ON ae.affiliate_id = a.id
        WHERE a.status IN ('active', 'suspended', 'rejected')
        GROUP BY a.id
        ORDER BY a.created_at DESC
        `
      ),
    ]);

    return res.json({
      pending: pendingRes.rows,
      affiliates: activeRes.rows,
    });
  } catch (error) {
    console.error("Admin affiliates list error:", error);
    return res.status(500).json({ message: "Failed to load affiliates" });
  }
});

// GET /api/admin/affiliates/:id/orders
router.get("/:id/orders", requireAdmin, async (req, res) => {
  try {
    if (!canManageAffiliates(req.session.admin.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;

    const affiliateRes = await pool.query(
      `
      SELECT id, full_name, email, status, referral_code
      FROM affiliates
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (!affiliateRes.rows.length) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    const ordersRes = await pool.query(
      `
      SELECT
        order_id,
        order_reference,
        customer_name,
        customer_email,
        customer_phone,
        item_count,
        order_total,
        earning_amount,
        order_status,
        earning_status,
        completed_at,
        eligible_for_payout_at,
        paid_at,
        created_at
      FROM affiliate_earnings
      WHERE affiliate_id = $1
      ORDER BY created_at DESC
      `,
      [id]
    );

    return res.json({
      affiliate: affiliateRes.rows[0],
      orders: ordersRes.rows,
    });
  } catch (error) {
    console.error("Admin affiliate orders error:", error);
    return res.status(500).json({ message: "Failed to load affiliate orders" });
  }
});

// POST /api/admin/affiliates/:id/approve
router.post("/:id/approve", requireAdmin, async (req, res) => {
  try {
    if (!canManageAffiliates(req.session.admin.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;

    const affiliateRes = await pool.query(
      `
      SELECT id, full_name, status
      FROM affiliates
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    const affiliate = affiliateRes.rows[0];

    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    if (affiliate.status === "active") {
      return res.status(400).json({ message: "Affiliate already active" });
    }

    const referralCode = await getUniqueReferralCode(affiliate.full_name);

    const result = await pool.query(
      `
      UPDATE affiliates
      SET
        status = 'active',
        referral_code = $2,
        verified_by = $3,
        verified_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, status, referral_code, verified_at
      `,
      [id, referralCode, req.session.admin.id]
    );

    return res.json({
      message: "Affiliate approved successfully",
      affiliate: result.rows[0],
    });
  } catch (error) {
    console.error("Approve affiliate error:", error);
    return res.status(500).json({ message: "Failed to approve affiliate" });
  }
});

// POST /api/admin/affiliates/:id/reject
router.post("/:id/reject", requireAdmin, async (req, res) => {
  try {
    if (!canManageAffiliates(req.session.admin.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE affiliates
      SET
        status = 'rejected',
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, status
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    return res.json({
      message: "Affiliate rejected",
      affiliate: result.rows[0],
    });
  } catch (error) {
    console.error("Reject affiliate error:", error);
    return res.status(500).json({ message: "Failed to reject affiliate" });
  }
});

// POST /api/admin/affiliates/:id/suspend
router.post("/:id/suspend", requireAdmin, async (req, res) => {
  try {
    if (!canManageAffiliates(req.session.admin.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE affiliates
      SET
        status = 'suspended',
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, status
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    return res.json({
      message: "Affiliate suspended",
      affiliate: result.rows[0],
    });
  } catch (error) {
    console.error("Suspend affiliate error:", error);
    return res.status(500).json({ message: "Failed to suspend affiliate" });
  }
});

module.exports = router;
