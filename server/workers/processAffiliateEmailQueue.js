const pool = require("../db");
const { sendAffiliateEmail } = require("../services/affiliateEmailService");

const MAX_ATTEMPTS = 5;

function getNextAttemptDelayMinutes(attempts) {
  if (attempts <= 1) return 5;
  if (attempts === 2) return 15;
  if (attempts === 3) return 30;
  if (attempts === 4) return 60;
  return 180;
}

async function processAffiliateEmailQueue(limit = 20) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT *
      FROM affiliate_email_queue
      WHERE status IN ('pending', 'failed')
        AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
        AND attempts < $1
      ORDER BY created_at ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED
      `,
      [MAX_ATTEMPTS, limit]
    );

    await client.query("COMMIT");

    if (!rows.length) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await sendAffiliateEmail({
          type: row.type,
          recipientEmail: row.recipient_email,
          subject: row.subject,
          payload: row.payload || {},
        });

        await pool.query(
          `
          UPDATE affiliate_email_queue
          SET
            status = 'sent',
            sent_at = NOW(),
            updated_at = NOW(),
            error_message = NULL
          WHERE id = $1
          `,
          [row.id]
        );

        sent += 1;
      } catch (error) {
        const attempts = Number(row.attempts || 0) + 1;
        const shouldStop = attempts >= MAX_ATTEMPTS;
        const delay = getNextAttemptDelayMinutes(attempts);

        await pool.query(
          `
          UPDATE affiliate_email_queue
          SET
            status = $2,
            attempts = $3,
            next_attempt_at = CASE
              WHEN $2 = 'failed' THEN NOW() + ($4 || ' minutes')::interval
              ELSE next_attempt_at
            END,
            error_message = $5,
            updated_at = NOW()
          WHERE id = $1
          `,
          [
            row.id,
            shouldStop ? "failed_permanently" : "failed",
            attempts,
            String(delay),
            error.message || "Unknown email error",
          ]
        );

        failed += 1;
      }
    }

    return {
      processed: rows.length,
      sent,
      failed,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { processAffiliateEmailQueue };
