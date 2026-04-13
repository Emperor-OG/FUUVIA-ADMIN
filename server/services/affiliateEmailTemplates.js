function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAffiliateApprovedTemplate(payload = {}) {
  const fullName = payload.full_name || "there";
  const referralCode = payload.referral_code || "";
  const signinUrl =
    payload.signin_url || "https://affiliate.fuuvia.com/signin";

  return {
    html: `
      <div style="margin:0;padding:0;background:#f4f6fb;">
        <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
          <div style="border-radius:24px;overflow:hidden;background:#ffffff;border:1px solid #e6e8f0;box-shadow:0 10px 30px rgba(15,23,42,0.08);font-family:Arial,sans-serif;color:#101828;">

            <div style="padding:28px 32px;background:linear-gradient(135deg,#487bff 0%,#8f68ff 55%,#fc72ff 100%);">
              <div style="font-size:30px;font-weight:800;line-height:1.1;color:#ffffff;letter-spacing:-0.02em;">
                FUUVIA Affiliates
              </div>
              <div style="margin-top:8px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.92);">
                Welcome to the programme
              </div>
            </div>

            <div style="padding:32px;">
              <div style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8f68ff;">
                Application Update
              </div>

              <h1 style="margin:0 0 18px;font-size:34px;line-height:1.15;color:#0f172a;letter-spacing:-0.03em;">
                Your FUUVIA affiliate application has been approved
              </h1>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#475467;">
                Hello ${escapeHtml(fullName)},
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#475467;">
                Great news — your FUUVIA affiliate application has been approved.
                You can now sign in to your affiliate account and start sharing
                your referral link to earn from qualifying orders.
              </p>

              ${
                referralCode
                  ? `
              <div style="margin:24px 0;padding:18px 20px;border:1px solid #e7ddff;border-radius:18px;background:linear-gradient(180deg,#faf7ff 0%,#f7f9ff 100%);">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;margin-bottom:8px;">
                  Referral Code
                </div>
                <div style="font-size:24px;font-weight:800;line-height:1.2;color:#111827;letter-spacing:0.04em;">
                  ${escapeHtml(referralCode)}
                </div>
              </div>
              `
                  : ""
              }

              <div style="margin:28px 0 18px;">
                <a
                  href="${escapeHtml(signinUrl)}"
                  style="display:inline-block;padding:14px 22px;border-radius:14px;background:linear-gradient(135deg,#487bff 0%,#8f68ff 55%,#fc72ff 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;line-height:1.2;"
                >
                  Sign In to Affiliate Dashboard
                </a>
              </div>

              <p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#667085;">
                Once signed in, you’ll be able to access your affiliate dashboard,
                track your activity, and manage your referral link.
              </p>

              <p style="margin:0;font-size:15px;line-height:1.75;color:#667085;">
                Welcome to FUUVIA.
              </p>
            </div>

            <div style="padding:18px 32px;border-top:1px solid #e6e8f0;background:#fafbff;">
              <div style="font-size:13px;line-height:1.7;color:#667085;">
                FUUVIA Affiliates
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    text: [
      "Your FUUVIA affiliate application has been approved",
      "",
      `Hello ${fullName},`,
      "",
      "Great news — your FUUVIA affiliate application has been approved.",
      "You can now sign in to your affiliate account and start sharing your referral link to start earning.",
      referralCode ? `Referral code: ${referralCode}` : "",
      `Sign in: ${signinUrl}`,
      "",
      "Welcome to FUUVIA.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function getAffiliateEmailTemplate(type, payload) {
  switch (type) {
    case "affiliate_approved":
      return buildAffiliateApprovedTemplate(payload);
    default:
      throw new Error(`Unsupported affiliate email type: ${type}`);
  }
}

module.exports = {
  getAffiliateEmailTemplate,
};
