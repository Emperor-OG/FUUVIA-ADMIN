const express = require("express");
const pool = require("../../db.js");
const requireAdminAuth = require("../../middleware/requireAdminAuth.js");

const router = express.Router();

const cleanText = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

/* =========================
   GET ALL PROVINCES + CITIES
========================= */
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const provincesResult = await pool.query(
      `
      SELECT
        p.id,
        p.name
      FROM provinces p
      ORDER BY p.id ASC
      `
    );

    const citiesResult = await pool.query(
      `
      SELECT
        c.id,
        c.province_id,
        c.name
      FROM cities c
      ORDER BY c.province_id ASC, c.id ASC
      `
    );

    const citiesByProvince = new Map();

    for (const city of citiesResult.rows) {
      if (!citiesByProvince.has(city.province_id)) {
        citiesByProvince.set(city.province_id, []);
      }
      citiesByProvince.get(city.province_id).push(city);
    }

    const data = provincesResult.rows.map((province) => ({
      ...province,
      cities: citiesByProvince.get(province.id) || [],
    }));

    return res.json(data);
  } catch (error) {
    console.error("Locations load error:", error);
    return res.status(500).json({ message: "Failed to load locations" });
  }
});

/* =========================
   ADD CITY
========================= */
router.post("/cities", requireAdminAuth, async (req, res) => {
  try {
    const provinceId = Number(req.body?.province_id);
    const name = cleanText(req.body?.name);

    if (!Number.isInteger(provinceId) || provinceId <= 0) {
      return res.status(400).json({ message: "Invalid province ID" });
    }

    if (!name) {
      return res.status(400).json({ message: "City name is required" });
    }

    const provinceCheck = await pool.query(
      `
      SELECT id, name
      FROM provinces
      WHERE id = $1
      LIMIT 1
      `,
      [provinceId]
    );

    if (provinceCheck.rows.length === 0) {
      return res.status(404).json({ message: "Province not found" });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO cities (province_id, name)
      VALUES ($1, $2)
      RETURNING id, province_id, name
      `,
      [provinceId, name]
    );

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "That city already exists in this province" });
    }

    console.error("Add city error:", error);
    return res.status(500).json({ message: "Failed to add city" });
  }
});

/* =========================
   UPDATE CITY
========================= */
router.patch("/cities/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = cleanText(req.body?.name);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid city ID" });
    }

    if (!name) {
      return res.status(400).json({ message: "City name is required" });
    }

    const existingResult = await pool.query(
      `
      SELECT id, province_id
      FROM cities
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: "City not found" });
    }

    const city = existingResult.rows[0];

    const updateResult = await pool.query(
      `
      UPDATE cities
      SET name = $1
      WHERE id = $2
      RETURNING id, province_id, name
      `,
      [name, id]
    );

    return res.json(updateResult.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "That city already exists in this province" });
    }

    console.error("Update city error:", error);
    return res.status(500).json({ message: "Failed to update city" });
  }
});

/* =========================
   DELETE CITY
========================= */
router.delete("/cities/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid city ID" });
    }

    const deleteResult = await pool.query(
      `
      DELETE FROM cities
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: "City not found" });
    }

    return res.json({ success: true, id });
  } catch (error) {
    console.error("Delete city error:", error);
    return res.status(500).json({ message: "Failed to delete city" });
  }
});

module.exports = router;