require("dotenv").config();

const { processAffiliateEmailQueue } = require("../workers/processAffiliateEmailQueue");

const INTERVAL_MS = Number(process.env.AFFILIATE_EMAIL_WORKER_INTERVAL_MS || 15000);
const BATCH_SIZE = Number(process.env.AFFILIATE_EMAIL_WORKER_BATCH_SIZE || 20);

let running = false;

async function tick() {
  if (running) return;
  running = true;

  try {
    const result = await processAffiliateEmailQueue(BATCH_SIZE);
    if (result.processed > 0) {
      console.log("[affiliate-email-worker]", result);
    }
  } catch (error) {
    console.error("[affiliate-email-worker] Error:", error);
  } finally {
    running = false;
  }
}

async function start() {
  console.log(
    `[affiliate-email-worker] started | interval=${INTERVAL_MS}ms | batch=${BATCH_SIZE}`
  );

  await tick();
  setInterval(tick, INTERVAL_MS);
}

start().catch((error) => {
  console.error("[affiliate-email-worker] fatal:", error);
  process.exit(1);
});
