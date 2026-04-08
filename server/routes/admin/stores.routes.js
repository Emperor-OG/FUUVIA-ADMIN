const express = require("express");
const pool = require("../../db.js");
const requireAdminAuth = require("../../middleware/requireAdminAuth.js");
const upload = require("../../middleware/uploadMemory.js");
const {
  buckets,
  uploadFileToBucket,
  deleteFileFromBucket,
} = require("../../GCS.js");
const {
  cleanText,
  cleanBool,
  cleanNumeric,
} = require("./admin.helpers.js");

const router = express.Router();

const STORE_UPLOAD_FIELDS = {
  logo_url: {
    bucket: buckets.storeLogos,
    column: "logo_url",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  },
  banner_url: {
    bucket: buckets.storeBanners,
    column: "banner_url",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  },
  compliance_url: {
    bucket: buckets.storeDocuments,
    column: "compliance_url",
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ],
  },
  poa_url: {
    bucket: buckets.storePOA,
    column: "poa_url",
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ],
  },
  proof_of_residence_url: {
    bucket: buckets.proofOfResidence,
    column: "proof_of_residence_url",
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ],
  },
};

const sanitizeDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/* =========================
   STORES LIST
========================= */
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.created_at,
        s.store_name,
        s.store_owner,
        s.cell_number,
        s.secondary_number,
        s.email,
        s.country,
        s.province,
        s.description,
        s.bank_name,
        s.account_holder,
        s.account_number,
        s.account_type,
        s.banner_url,
        s.logo_url,
        s.compliance_url,
        s.poa_url,
        s.is_open,
        s.admin1,
        s.admin2,
        s.admin3,
        s.admin4,
        s.admin5,
        s.admin6,
        s.admin7,
        s.admin8,
        s.admin9,
        s.admin10,
        s.branch_code,
        s.street,
        s.suburb,
        s.city,
        s.postal_code,
        s.proof_of_residence_url,
        s.subaccount_code,
        s.recipient_code,
        s.subaccount_verified,
        s.verification_response,
        s.delivers_nationwide,
        s.nationwide_fee,
        s.nationwide_estimated_time,
        s.verification_attempts,
        s.last_verified_at,
        s.onboarding_status,
        json_build_object(
          'id', ss.id,
          'monday_open', ss.monday_open,
          'monday_close', ss.monday_close,
          'tuesday_open', ss.tuesday_open,
          'tuesday_close', ss.tuesday_close,
          'wednesday_open', ss.wednesday_open,
          'wednesday_close', ss.wednesday_close,
          'thursday_open', ss.thursday_open,
          'thursday_close', ss.thursday_close,
          'friday_open', ss.friday_open,
          'friday_close', ss.friday_close,
          'saturday_open', ss.saturday_open,
          'saturday_close', ss.saturday_close,
          'sunday_open', ss.sunday_open,
          'sunday_close', ss.sunday_close
        ) AS schedule
      FROM stores s
      LEFT JOIN store_schedule ss
        ON ss.store_id = s.id
      ORDER BY s.created_at DESC
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("Load stores error:", error);
    return res.status(500).json({ message: "Failed to load stores" });
  }
});

/* =========================
   UPDATE STORE + SCHEDULE
========================= */
router.patch("/:id", requireAdminAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      store_name,
      store_owner,
      cell_number,
      secondary_number,
      email,
      country,
      province,
      description,
      bank_name,
      account_holder,
      account_number,
      account_type,
      banner_url,
      logo_url,
      compliance_url,
      poa_url,
      is_open,
      admin1,
      admin2,
      admin3,
      admin4,
      admin5,
      admin6,
      admin7,
      admin8,
      admin9,
      admin10,
      branch_code,
      street,
      suburb,
      city,
      postal_code,
      proof_of_residence_url,
      subaccount_code,
      recipient_code,
      subaccount_verified,
      delivers_nationwide,
      nationwide_fee,
      nationwide_estimated_time,
      verification_attempts,
      last_verified_at,
      onboarding_status,
      schedule,
    } = req.body || {};

    await client.query("BEGIN");

    const storeCheck = await client.query(
      `SELECT id FROM stores WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (storeCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Store not found" });
    }

    await client.query(
      `
      UPDATE stores
      SET
        store_name = $1,
        store_owner = $2,
        cell_number = $3,
        secondary_number = $4,
        email = $5,
        country = $6,
        province = $7,
        description = $8,
        bank_name = $9,
        account_holder = $10,
        account_number = $11,
        account_type = $12,
        banner_url = $13,
        logo_url = $14,
        compliance_url = $15,
        poa_url = $16,
        is_open = $17,
        admin1 = $18,
        admin2 = $19,
        admin3 = $20,
        admin4 = $21,
        admin5 = $22,
        admin6 = $23,
        admin7 = $24,
        admin8 = $25,
        admin9 = $26,
        admin10 = $27,
        branch_code = $28,
        street = $29,
        suburb = $30,
        city = $31,
        postal_code = $32,
        proof_of_residence_url = $33,
        subaccount_code = $34,
        recipient_code = $35,
        subaccount_verified = $36,
        delivers_nationwide = $37,
        nationwide_fee = $38,
        nationwide_estimated_time = $39,
        verification_attempts = $40,
        last_verified_at = $41,
        onboarding_status = $42
      WHERE id = $43
      `,
      [
        cleanText(store_name),
        cleanText(store_owner),
        cleanText(cell_number),
        cleanText(secondary_number),
        cleanText(email),
        cleanText(country),
        cleanText(province),
        cleanText(description),
        cleanText(bank_name),
        cleanText(account_holder),
        cleanText(account_number),
        cleanText(account_type),
        cleanText(banner_url),
        cleanText(logo_url),
        cleanText(compliance_url),
        cleanText(poa_url),
        cleanBool(is_open),
        cleanText(admin1),
        cleanText(admin2),
        cleanText(admin3),
        cleanText(admin4),
        cleanText(admin5),
        cleanText(admin6),
        cleanText(admin7),
        cleanText(admin8),
        cleanText(admin9),
        cleanText(admin10),
        cleanText(branch_code),
        cleanText(street),
        cleanText(suburb),
        cleanText(city),
        cleanText(postal_code),
        cleanText(proof_of_residence_url),
        cleanText(subaccount_code),
        cleanText(recipient_code),
        cleanBool(subaccount_verified),
        cleanBool(delivers_nationwide),
        cleanNumeric(nationwide_fee),
        cleanText(nationwide_estimated_time),
        cleanNumeric(verification_attempts),
        sanitizeDateTime(last_verified_at),
        cleanText(onboarding_status),
        id,
      ]
    );

    if (schedule && typeof schedule === "object") {
      const scheduleCheck = await client.query(
        `SELECT id FROM store_schedule WHERE store_id = $1 LIMIT 1`,
        [id]
      );

      if (scheduleCheck.rows.length > 0) {
        await client.query(
          `
          UPDATE store_schedule
          SET
            monday_open = $1,
            monday_close = $2,
            tuesday_open = $3,
            tuesday_close = $4,
            wednesday_open = $5,
            wednesday_close = $6,
            thursday_open = $7,
            thursday_close = $8,
            friday_open = $9,
            friday_close = $10,
            saturday_open = $11,
            saturday_close = $12,
            sunday_open = $13,
            sunday_close = $14
          WHERE store_id = $15
          `,
          [
            cleanText(schedule.monday_open),
            cleanText(schedule.monday_close),
            cleanText(schedule.tuesday_open),
            cleanText(schedule.tuesday_close),
            cleanText(schedule.wednesday_open),
            cleanText(schedule.wednesday_close),
            cleanText(schedule.thursday_open),
            cleanText(schedule.thursday_close),
            cleanText(schedule.friday_open),
            cleanText(schedule.friday_close),
            cleanText(schedule.saturday_open),
            cleanText(schedule.saturday_close),
            cleanText(schedule.sunday_open),
            cleanText(schedule.sunday_close),
            id,
          ]
        );
      } else {
        await client.query(
          `
          INSERT INTO store_schedule (
            store_id,
            monday_open,
            monday_close,
            tuesday_open,
            tuesday_close,
            wednesday_open,
            wednesday_close,
            thursday_open,
            thursday_close,
            friday_open,
            friday_close,
            saturday_open,
            saturday_close,
            sunday_open,
            sunday_close
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
          `,
          [
            id,
            cleanText(schedule.monday_open),
            cleanText(schedule.monday_close),
            cleanText(schedule.tuesday_open),
            cleanText(schedule.tuesday_close),
            cleanText(schedule.wednesday_open),
            cleanText(schedule.wednesday_close),
            cleanText(schedule.thursday_open),
            cleanText(schedule.thursday_close),
            cleanText(schedule.friday_open),
            cleanText(schedule.friday_close),
            cleanText(schedule.saturday_open),
            cleanText(schedule.saturday_close),
            cleanText(schedule.sunday_open),
            cleanText(schedule.sunday_close),
          ]
        );
      }
    }

    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update store error:", error);
    return res.status(500).json({ message: "Failed to update store" });
  } finally {
    client.release();
  }
});

/* =========================
   UPLOAD STORE FILE
========================= */
router.post(
  "/:id/upload",
  requireAdminAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { field } = req.body || {};

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const config = STORE_UPLOAD_FIELDS[field];

      if (!config) {
        return res.status(400).json({ message: "Invalid upload field" });
      }

      if (!config.bucket) {
        return res.status(500).json({ message: "Upload bucket is not configured" });
      }

      if (
        Array.isArray(config.allowedMimeTypes) &&
        config.allowedMimeTypes.length > 0 &&
        !config.allowedMimeTypes.includes(req.file.mimetype)
      ) {
        return res.status(400).json({
          message: "Unsupported file type for this field",
        });
      }

      const storeResult = await pool.query(
        `
        SELECT
          id,
          logo_url,
          banner_url,
          compliance_url,
          poa_url,
          proof_of_residence_url
        FROM stores
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (storeResult.rows.length === 0) {
        return res.status(404).json({ message: "Store not found" });
      }

      const store = storeResult.rows[0];
      const oldUrl = store[config.column];

      const newUrl = await uploadFileToBucket(req.file, config.bucket);

      await pool.query(
        `
        UPDATE stores
        SET ${config.column} = $1
        WHERE id = $2
        `,
        [newUrl, id]
      );

      if (oldUrl && typeof oldUrl === "string" && oldUrl.includes(config.bucket.name)) {
        await deleteFileFromBucket(config.bucket, oldUrl);
      }

      return res.json({
        success: true,
        field: config.column,
        url: newUrl,
      });
    } catch (error) {
      console.error("Store file upload error:", error);
      return res.status(500).json({ message: "Failed to upload file" });
    }
  }
);

router.delete("/:id/file", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body || {};

    const allowedFields = {
      logo_url: {
        bucket: buckets.storeLogos,
        column: "logo_url",
      },
      banner_url: {
        bucket: buckets.storeBanners,
        column: "banner_url",
      },
      compliance_url: {
        bucket: buckets.storeDocuments,
        column: "compliance_url",
      },
      poa_url: {
        bucket: buckets.storePOA,
        column: "poa_url",
      },
      proof_of_residence_url: {
        bucket: buckets.proofOfResidence,
        column: "proof_of_residence_url",
      },
    };

    const config = allowedFields[field];

    if (!config) {
      return res.status(400).json({ message: "Invalid file field" });
    }

    const storeResult = await pool.query(
      `
      SELECT id, ${config.column} AS file_url
      FROM stores
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }

    const fileUrl = storeResult.rows[0].file_url;

    if (!fileUrl) {
      return res.status(400).json({ message: "No file to delete" });
    }

    if (config.bucket && fileUrl.includes(config.bucket.name)) {
      await deleteFileFromBucket(config.bucket, fileUrl);
    }

    await pool.query(
      `
      UPDATE stores
      SET ${config.column} = NULL
      WHERE id = $1
      `,
      [id]
    );

    return res.json({
      success: true,
      field: config.column,
    });
  } catch (error) {
    console.error("Delete store file error:", error);
    return res.status(500).json({
      message: error.message || "Failed to delete file",
    });
  }
});

module.exports = router;