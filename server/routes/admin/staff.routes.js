const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../../db.js");
const requireAdminRole = require("../../middleware/requireAdminRole.js");
const { ALL_ROLES } = require("./admin.constants.js");
const { canCreateRole, canModifyTarget } = require("./admin.helpers.js");

const router = express.Router();

/* =========================
   STAFF LIST
========================= */
router.get(
  "/",
  requireAdminRole("human_resource", "executive", "super_admin", "emperor"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          email,
          full_name,
          phone,
          address,
          role,
          is_active,
          must_change_password,
          created_at,
          updated_at,
          last_login_at
        FROM staff
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY created_at DESC
        `
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Load staff error:", error);
      return res.status(500).json({ message: "Failed to load staff" });
    }
  }
);

/* =========================
   CREATE STAFF
========================= */
router.post(
  "/",
  requireAdminRole("human_resource", "executive", "super_admin", "emperor"),
  async (req, res) => {
    try {
      const currentAdmin = req.session.admin;
      const { email, full_name, phone, address, role } = req.body || {};

      if (!email || !full_name || !role) {
        return res.status(400).json({
          message: "Email, full name and role are required",
        });
      }

      if (!ALL_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (!canCreateRole(currentAdmin.role, role)) {
        return res.status(403).json({
          message: "You cannot create this role",
        });
      }

      const existing = await pool.query(
        `
        SELECT id
        FROM staff
        WHERE LOWER(email) = LOWER($1)
          AND COALESCE(is_deleted, false) = false
        LIMIT 1
        `,
        [email.trim()]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ message: "Staff email already exists" });
      }

      const temporaryPassword = `Fuuvia#${crypto.randomInt(1000, 9999)}`;
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      const result = await pool.query(
        `
        INSERT INTO staff (
          email,
          full_name,
          phone,
          address,
          password_hash,
          role,
          is_active,
          must_change_password,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $7)
        RETURNING
          id,
          email,
          full_name,
          phone,
          address,
          role,
          is_active,
          must_change_password,
          created_at
        `,
        [
          email.trim().toLowerCase(),
          full_name.trim(),
          phone ? phone.trim() : null,
          address ? address.trim() : null,
          passwordHash,
          role,
          currentAdmin.id,
        ]
      );

      return res.status(201).json({
        message: "Staff account created",
        staff: result.rows[0],
        temporaryPassword,
      });
    } catch (error) {
      console.error("Create staff error:", error);
      return res.status(500).json({ message: "Failed to create staff" });
    }
  }
);

/* =========================
   UPDATE STAFF
========================= */
router.patch(
  "/:id",
  requireAdminRole("human_resource", "executive", "super_admin", "emperor"),
  async (req, res) => {
    try {
      const currentAdmin = req.session.admin;
      const { id } = req.params;
      const { role, is_active, phone, address } = req.body || {};

      const targetResult = await pool.query(
        `
        SELECT id, role, full_name
        FROM staff
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        LIMIT 1
        `,
        [id]
      );

      if (targetResult.rows.length === 0) {
        return res.status(404).json({ message: "Staff not found" });
      }

      const target = targetResult.rows[0];

      if (!canModifyTarget(currentAdmin.role, target.role)) {
        return res.status(403).json({
          message: "You cannot modify this staff member",
        });
      }

      if (typeof role === "string") {
        if (!ALL_ROLES.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }

        if (!canCreateRole(currentAdmin.role, role)) {
          return res.status(403).json({
            message: "You cannot assign this role",
          });
        }
      }

      const updates = [];
      const values = [];
      let index = 1;

      if (typeof role === "string") {
        updates.push(`role = $${index++}`);
        values.push(role);
      }

      if (typeof is_active === "boolean") {
        updates.push(`is_active = $${index++}`);
        values.push(is_active);
      }

      if (typeof phone === "string") {
        updates.push(`phone = $${index++}`);
        values.push(phone.trim() || null);
      }

      if (typeof address === "string") {
        updates.push(`address = $${index++}`);
        values.push(address.trim() || null);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      updates.push(`updated_at = NOW()`);
      updates.push(`updated_by = $${index++}`);
      values.push(currentAdmin.id);

      values.push(id);

      await pool.query(
        `
        UPDATE staff
        SET ${updates.join(", ")}
        WHERE id = $${index}
        `,
        values
      );

      return res.json({ success: true });
    } catch (error) {
      console.error("Update staff error:", error);
      return res.status(500).json({ message: "Failed to update staff" });
    }
  }
);

/* =========================
   RESET STAFF PASSWORD
========================= */
router.post(
  "/:id/reset-password",
  requireAdminRole("human_resource", "executive", "super_admin", "emperor"),
  async (req, res) => {
    try {
      const currentAdmin = req.session.admin;
      const { id } = req.params;

      const targetResult = await pool.query(
        `
        SELECT id, full_name, role
        FROM staff
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        LIMIT 1
        `,
        [id]
      );

      if (targetResult.rows.length === 0) {
        return res.status(404).json({ message: "Staff not found" });
      }

      const target = targetResult.rows[0];

      if (!canModifyTarget(currentAdmin.role, target.role)) {
        return res.status(403).json({
          message: "You cannot reset this staff member's password",
        });
      }

      const temporaryPassword = `Fuuvia#${crypto.randomInt(1000, 9999)}`;
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      await pool.query(
        `
        UPDATE staff
        SET
          password_hash = $1,
          must_change_password = true,
          updated_at = NOW(),
          updated_by = $2
        WHERE id = $3
        `,
        [passwordHash, currentAdmin.id, id]
      );

      return res.json({
        success: true,
        temporaryPassword,
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  }
);

module.exports = router;