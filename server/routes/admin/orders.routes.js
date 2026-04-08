const express = require("express");
const pool = require("../../db.js");
const requireAdminAuth = require("../../middleware/requireAdminAuth.js");

const router = express.Router();

const toPositiveInt = (value, fallback) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return num;
};

const normalizeGroupBy = (value) => {
  if (value === "weekly") return "weekly";
  if (value === "monthly") return "monthly";
  if (value === "yearly") return "yearly";
  return "daily";
};

const normalizeBoolFilter = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const buildOrdersWhere = (query = {}) => {
  const conditions = [];
  const values = [];
  let index = 1;

  const {
    search,
    payment_status,
    order_status,
    settled,
    start_date,
    end_date,
    user_email,
    user_google_id,
  } = query;

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    conditions.push(`
      (
        CAST(id AS TEXT) ILIKE $${index}
        OR CAST(store_id AS TEXT) ILIKE $${index}
        OR COALESCE(reference, '') ILIKE $${index}
        OR COALESCE(customer_name, '') ILIKE $${index}
        OR COALESCE(customer_email, '') ILIKE $${index}
        OR COALESCE(user_email, '') ILIKE $${index}
        OR COALESCE(user_google_id, '') ILIKE $${index}
      )
    `);
    values.push(term);
    index += 1;
  }

  if (payment_status && String(payment_status).trim()) {
    conditions.push(`payment_status = $${index}`);
    values.push(String(payment_status).trim());
    index += 1;
  }

  if (order_status && String(order_status).trim()) {
    conditions.push(`order_status = $${index}`);
    values.push(String(order_status).trim());
    index += 1;
  }

  const settledBool = normalizeBoolFilter(settled);
  if (settledBool !== null) {
    conditions.push(`COALESCE(settled, false) = $${index}`);
    values.push(settledBool);
    index += 1;
  }

  if (start_date && String(start_date).trim()) {
    conditions.push(`DATE(created_at) >= $${index}`);
    values.push(String(start_date).trim());
    index += 1;
  }

  if (end_date && String(end_date).trim()) {
    conditions.push(`DATE(created_at) <= $${index}`);
    values.push(String(end_date).trim());
    index += 1;
  }

  if (user_email && String(user_email).trim()) {
    conditions.push(`
      (
        LOWER(COALESCE(customer_email, '')) = LOWER($${index})
        OR LOWER(COALESCE(user_email, '')) = LOWER($${index})
      )
    `);
    values.push(String(user_email).trim());
    index += 1;
  }

  if (user_google_id && String(user_google_id).trim()) {
    conditions.push(`COALESCE(user_google_id, '') = $${index}`);
    values.push(String(user_google_id).trim());
    index += 1;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return {
    whereClause,
    values,
    nextIndex: index,
  };
};

/* =========================
   SUMMARY
========================= */
router.get("/summary", requireAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_orders,

        COALESCE(SUM(fuuvia_commission) FILTER (
          WHERE payment_status = 'paid'
            AND DATE(COALESCE(paid_at, created_at)) = CURRENT_DATE
        ), 0)::numeric(12,2) AS today_income,

        COALESCE(SUM(fuuvia_commission) FILTER (
          WHERE payment_status = 'paid'
            AND DATE_TRUNC('week', COALESCE(paid_at, created_at)) = DATE_TRUNC('week', NOW())
        ), 0)::numeric(12,2) AS week_income,

        COALESCE(SUM(fuuvia_commission) FILTER (
          WHERE payment_status = 'paid'
            AND DATE_TRUNC('month', COALESCE(paid_at, created_at)) = DATE_TRUNC('month', NOW())
        ), 0)::numeric(12,2) AS month_income,

        COALESCE(SUM(fuuvia_commission) FILTER (
          WHERE payment_status = 'paid'
            AND DATE_TRUNC('year', COALESCE(paid_at, created_at)) = DATE_TRUNC('year', NOW())
        ), 0)::numeric(12,2) AS year_income,

        COALESCE(SUM(fuuvia_commission) FILTER (
          WHERE payment_status = 'paid'
        ), 0)::numeric(12,2) AS lifetime_income
      FROM orders
    `);

    return res.json(result.rows[0] || {});
  } catch (error) {
    console.error("Orders summary error:", error);
    return res.status(500).json({ message: "Failed to load orders summary" });
  }
});

/* =========================
   LEDGER
========================= */
router.get("/ledger", requireAdminAuth, async (req, res) => {
  try {
    const groupBy = normalizeGroupBy(req.query.groupBy);

    let periodExpression = `DATE(COALESCE(paid_at, created_at))`;
    if (groupBy === "weekly") {
      periodExpression = `DATE_TRUNC('week', COALESCE(paid_at, created_at))`;
    } else if (groupBy === "monthly") {
      periodExpression = `DATE_TRUNC('month', COALESCE(paid_at, created_at))`;
    } else if (groupBy === "yearly") {
      periodExpression = `DATE_TRUNC('year', COALESCE(paid_at, created_at))`;
    }

    const result = await pool.query(`
      SELECT
        ${periodExpression} AS period,
        COUNT(*)::int AS paid_orders,
        COALESCE(SUM(total_amount), 0)::numeric(12,2) AS gross_sales,
        COALESCE(SUM(fuuvia_commission), 0)::numeric(12,2) AS fuuvia_income
      FROM orders
      WHERE payment_status = 'paid'
      GROUP BY 1
      ORDER BY 1 DESC
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("Orders ledger error:", error);
    return res.status(500).json({ message: "Failed to load orders ledger" });
  }
});

/* =========================
   ORDERS LIST
========================= */
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;

    const { whereClause, values, nextIndex } = buildOrdersWhere(req.query);

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM orders
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        id,
        store_id,
        customer_name,
        customer_email,
        user_email,
        user_google_id,
        reference,
        total_amount,
        fuuvia_commission,
        payment_status,
        order_status,
        settled,
        paid_at,
        created_at
      FROM orders
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${nextIndex}
      OFFSET $${nextIndex + 1}
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(dataQuery, [...values, limit, offset]),
    ]);

    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Orders list error:", error);
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

/* =========================
   SINGLE ORDER
========================= */
router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        store_id,
        subaccount_code,
        customer_name,
        customer_email,
        customer_phone,
        user_email,
        user_google_id,
        type,
        location_id,
        street,
        unit,
        building,
        notes,
        city,
        suburb,
        province,
        postal_code,
        items,
        cart_total,
        location_fee,
        total_amount,
        fuuvia_commission,
        payment_status,
        order_status,
        settled,
        reference,
        created_at,
        updated_at,
        paid_at
      FROM orders
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Single order error:", error);
    return res.status(500).json({ message: "Failed to load order" });
  }
});

module.exports = router;