const { processAffiliateEmailQueue } = require("../workers/processAffiliateEmailQueue");

const INTERVAL_MS = Number(process.env.AFFILIATE_EMAIL_WORKER_INTERVAL_MS || 15000);
const BATCH_SIZE = Number(process.env.AFFILIATE_EMAIL_WORKER_BATCH_SIZE || 20);

let running = false;
let started = false;
let intervalHandle = null;

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

function startAffiliateEmailWorker() {
  if (started) {
    return;
  }

  started = true;

  console.log(
    `[affiliate-email-worker] started | interval=${INTERVAL_MS}ms | batch=${BATCH_SIZE}`
  );

  tick().catch((error) => {
    console.error("[affiliate-email-worker] initial tick error:", error);
  });

  intervalHandle = setInterval(() => {
    tick().catch((error) => {
      console.error("[affiliate-email-worker] interval tick error:", error);
    });
  }, INTERVAL_MS);

  return intervalHandle;
}

module.exports = { startAffiliateEmailWorker };

if (require.main === module) {
  startAffiliateEmailWorker();
}
