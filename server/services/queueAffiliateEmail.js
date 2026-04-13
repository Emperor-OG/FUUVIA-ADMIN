const pool = require("../db");

async function queueAffiliateEmail(data, providedClient = null) {
  const {
    type,
    recipient_email,
    subject,
    payload = {},
    notification_key = null,
  } = data || {};

  if (!type) {
    throw new Error("queueAffiliateEmail requires type");
  }

  if (!recipient_email) {
    throw new Error("queueAffiliateEmail requires recipient_email");
  }

  if (!subject) {
    throw new Error("queueAffiliateEmail requires subject");
  }

  const client = providedClient || (await pool.connect());

  try {
    if (notification_key) {
      const existing = await client.query(
        `
        SELECT id
        FROM affiliate_email_queue
        WHERE notification_key = $1
        LIMIT 1
        `,
        [notification_key]
      );

      if (existing.rows.length) {
        return { skipped: true, reason: "duplicate_notification_key" };
      }
    }

    const result = await client.query(
      `
      INSERT INTO affiliate_email_queue (
        type,
        recipient_email,
        subject,
        payload,
        notification_key,
        status,
        attempts
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, 'pending', 0)
      RETURNING id, type, recipient_email, subject, status, notification_key, created_at
      `,
      [
        type,
        recipient_email,
        subject,
        JSON.stringify(payload || {}),
        notification_key,
      ]
    );

    return result.rows[0];
  } finally {
    if (!providedClient) {
      client.release();
    }
  }
}

module.exports = { queueAffiliateEmail };
