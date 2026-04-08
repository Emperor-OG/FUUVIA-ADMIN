const express = require("express");
const pool = require("../../db.js");
const requireAdminAuth = require("../../middleware/requireAdminAuth.js");
const upload = require("../../middleware/uploadMemory.js");
const {
  buckets,
  uploadFileToBucket,
  deleteFileFromBucket,
} = require("../../GCS.js");

const router = express.Router();

const toPositiveInt = (value, fallback) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return num;
};

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;

    const { search, store_id, category } = req.query;

    const conditions = [];
    const values = [];
    let index = 1;

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      conditions.push(`
        (
          CAST(p.id AS TEXT) ILIKE $${index}
          OR CAST(p.store_id AS TEXT) ILIKE $${index}
          OR COALESCE(p.name, '') ILIKE $${index}
          OR COALESCE(p.description, '') ILIKE $${index}
          OR COALESCE(p.category, '') ILIKE $${index}
          OR EXISTS (
            SELECT 1
            FROM variants v
            WHERE v.product_id = p.id
              AND (
                CAST(v.id AS TEXT) ILIKE $${index}
                OR COALESCE(v.name, '') ILIKE $${index}
                OR COALESCE(v.image_url, '') ILIKE $${index}
              )
          )
          OR EXISTS (
            SELECT 1
            FROM variants v
            JOIN skus s ON s.variant_id = v.id
            WHERE v.product_id = p.id
              AND (
                CAST(s.id AS TEXT) ILIKE $${index}
                OR COALESCE(s.size, '') ILIKE $${index}
              )
          )
        )
      `);
      values.push(term);
      index += 1;
    }

    if (store_id && String(store_id).trim()) {
      conditions.push(`p.store_id = $${index}`);
      values.push(Number(store_id));
      index += 1;
    }

    if (category && String(category).trim()) {
      conditions.push(`COALESCE(p.category, '') = $${index}`);
      values.push(String(category).trim());
      index += 1;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM products p
      ${whereClause}
    `;

    const productsQuery = `
      SELECT
        p.id,
        p.store_id,
        p.name,
        p.description,
        p.category,
        p.stock,
        p.created_at
      FROM products p
      ${whereClause}
      ORDER BY p.id ASC
      LIMIT $${index}
      OFFSET $${index + 1}
    `;

    const [countResult, productsResult] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(productsQuery, [...values, limit, offset]),
    ]);

    const products = productsResult.rows;
    const productIds = products.map((p) => p.id);

    let variants = [];
    let skus = [];

    if (productIds.length > 0) {
      const variantsResult = await pool.query(
        `
        SELECT
          v.id,
          v.product_id,
          v.name,
          v.seller_price,
          v.stock,
          v.image_url,
          v.markup_percent,
          v.markup_price,
          v.created_at
        FROM variants v
        WHERE v.product_id = ANY($1::int[])
        ORDER BY v.id ASC
        `,
        [productIds]
      );

      variants = variantsResult.rows;

      const variantIds = variants.map((v) => v.id);

      if (variantIds.length > 0) {
        const skusResult = await pool.query(
          `
          SELECT
            s.id,
            s.variant_id,
            s.size,
            s.stock
          FROM skus s
          WHERE s.variant_id = ANY($1::int[])
          ORDER BY s.id ASC
          `,
          [variantIds]
        );

        skus = skusResult.rows;
      }
    }

    const skusByVariant = new Map();
    for (const sku of skus) {
      if (!skusByVariant.has(sku.variant_id)) {
        skusByVariant.set(sku.variant_id, []);
      }
      skusByVariant.get(sku.variant_id).push(sku);
    }

    const variantsByProduct = new Map();
    for (const variant of variants) {
      const variantWithSkus = {
        ...variant,
        skus: skusByVariant.get(variant.id) || [],
      };

      if (!variantsByProduct.has(variant.product_id)) {
        variantsByProduct.set(variant.product_id, []);
      }
      variantsByProduct.get(variant.product_id).push(variantWithSkus);
    }

    const data = products.map((product) => ({
      ...product,
      variants: variantsByProduct.get(product.id) || [],
    }));

    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Products list error:", error);
    return res.status(500).json({ message: "Failed to load products" });
  }
});

router.get("/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const productResult = await pool.query(
      `
      SELECT
        p.id,
        p.store_id,
        p.name,
        p.description,
        p.category,
        p.stock,
        p.created_at
      FROM products p
      WHERE p.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult.rows[0];

    const variantsResult = await pool.query(
      `
      SELECT
        v.id,
        v.product_id,
        v.name,
        v.seller_price,
        v.stock,
        v.image_url,
        v.markup_percent,
        v.markup_price,
        v.created_at
      FROM variants v
      WHERE v.product_id = $1
      ORDER BY v.id ASC
      `,
      [id]
    );

    const variants = variantsResult.rows;
    const variantIds = variants.map((v) => v.id);

    let skus = [];
    if (variantIds.length > 0) {
      const skusResult = await pool.query(
        `
        SELECT
          s.id,
          s.variant_id,
          s.size,
          s.stock
        FROM skus s
        WHERE s.variant_id = ANY($1::int[])
        ORDER BY s.id ASC
        `,
        [variantIds]
      );
      skus = skusResult.rows;
    }

    const skusByVariant = new Map();
    for (const sku of skus) {
      if (!skusByVariant.has(sku.variant_id)) {
        skusByVariant.set(sku.variant_id, []);
      }
      skusByVariant.get(sku.variant_id).push(sku);
    }

    const variantsWithSkus = variants.map((variant) => ({
      ...variant,
      skus: skusByVariant.get(variant.id) || [],
    }));

    return res.json({
      ...product,
      variants: variantsWithSkus,
    });
  } catch (error) {
    console.error("Single product error:", error);
    return res.status(500).json({ message: "Failed to load product" });
  }
});

router.patch("/:id", requireAdminAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const { name, description, category, stock, variants } = req.body || {};

    await client.query("BEGIN");

    const productCheck = await client.query(
      `SELECT id, store_id, created_at FROM products WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (productCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Product not found" });
    }

    await client.query(
      `
      UPDATE products
      SET
        name = $1,
        description = $2,
        category = $3,
        stock = $4
      WHERE id = $5
      `,
      [name, description || null, category || null, stock, id]
    );

    if (Array.isArray(variants)) {
      for (const variant of variants) {
        await client.query(
          `
          UPDATE variants
          SET
            name = $1,
            seller_price = $2,
            stock = $3,
            image_url = $4,
            markup_percent = $5,
            markup_price = $6
          WHERE id = $7
            AND product_id = $8
          `,
          [
            variant.name || null,
            variant.seller_price,
            variant.stock,
            variant.image_url || null,
            variant.markup_percent,
            variant.markup_price,
            variant.id,
            id,
          ]
        );

        if (Array.isArray(variant.skus)) {
          for (const sku of variant.skus) {
            await client.query(
              `
              UPDATE skus
              SET
                size = $1,
                stock = $2
              WHERE id = $3
                AND variant_id = $4
              `,
              [sku.size, sku.stock, sku.id, variant.id]
            );
          }
        }
      }
    }

    const refreshedProductResult = await client.query(
      `
      SELECT
        p.id,
        p.store_id,
        p.name,
        p.description,
        p.category,
        p.stock,
        p.created_at
      FROM products p
      WHERE p.id = $1
      LIMIT 1
      `,
      [id]
    );

    const refreshedVariantsResult = await client.query(
      `
      SELECT
        v.id,
        v.product_id,
        v.name,
        v.seller_price,
        v.stock,
        v.image_url,
        v.markup_percent,
        v.markup_price,
        v.created_at
      FROM variants v
      WHERE v.product_id = $1
      ORDER BY v.id ASC
      `,
      [id]
    );

    const refreshedVariants = refreshedVariantsResult.rows;
    const variantIds = refreshedVariants.map((v) => v.id);

    let refreshedSkus = [];
    if (variantIds.length > 0) {
      const refreshedSkusResult = await client.query(
        `
        SELECT
          s.id,
          s.variant_id,
          s.size,
          s.stock
        FROM skus s
        WHERE s.variant_id = ANY($1::int[])
        ORDER BY s.id ASC
        `,
        [variantIds]
      );
      refreshedSkus = refreshedSkusResult.rows;
    }

    const skusByVariant = new Map();
    for (const sku of refreshedSkus) {
      if (!skusByVariant.has(sku.variant_id)) {
        skusByVariant.set(sku.variant_id, []);
      }
      skusByVariant.get(sku.variant_id).push(sku);
    }

    const variantsWithSkus = refreshedVariants.map((variant) => ({
      ...variant,
      skus: skusByVariant.get(variant.id) || [],
    }));

    await client.query("COMMIT");

    return res.json({
      ...refreshedProductResult.rows[0],
      variants: variantsWithSkus,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Product update error:", error);
    return res.status(500).json({ message: "Failed to update product" });
  } finally {
    client.release();
  }
});

router.post(
  "/:id/variants/:variantId/upload-image",
  requireAdminAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const variantId = Number(req.params.variantId);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      if (!Number.isInteger(variantId) || variantId <= 0) {
        return res.status(400).json({ message: "Invalid variant ID" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
      ];

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported image type" });
      }

      if (!buckets?.storeProducts) {
        return res.status(500).json({ message: "Products upload bucket is not configured" });
      }

      const variantResult = await pool.query(
        `
        SELECT id, product_id, image_url
        FROM variants
        WHERE id = $1 AND product_id = $2
        LIMIT 1
        `,
        [variantId, productId]
      );

      if (variantResult.rows.length === 0) {
        return res.status(404).json({ message: "Variant not found" });
      }

      const variant = variantResult.rows[0];
      const oldUrl = variant.image_url || null;

      const newUrl = await uploadFileToBucket(req.file, buckets.storeProducts);

      await pool.query(
        `
        UPDATE variants
        SET image_url = $1
        WHERE id = $2 AND product_id = $3
        `,
        [newUrl, variantId, productId]
      );

      if (oldUrl && oldUrl.includes(buckets.storeProducts.name)) {
        await deleteFileFromBucket(buckets.storeProducts, oldUrl);
      }

      return res.json({
        success: true,
        variant_id: variantId,
        image_url: newUrl,
      });
    } catch (error) {
      console.error("Variant image upload error:", error);
      return res.status(500).json({
        message: error.message || "Failed to upload variant image",
      });
    }
  }
);

module.exports = router;