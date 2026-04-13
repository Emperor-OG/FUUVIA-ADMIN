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
      <div style="margin:0;padding:0;background:#f6f7fb;">
        <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e6e8f0;border-radius:20px;padding:32px;font-family:Arial,sans-serif;color:#101828;">
            <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15;color:#0f172a;">
              Your FUUVIA affiliate application has been approved
            </h1>

            <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#475467;">
              Hello ${escapeHtml(fullName)},
            </p>

            <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#475467;">
              Your FUUVIA affiliate application has been approved. You can now sign in to your affiliate account and start sharing your referral link.
            </p>

            ${
              referralCode
                ? `
            <div style="margin:20px 0;padding:16px 18px;border:1px solid #e6e8f0;border-radius:16px;background:#f8faff;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;color:#667085;margin-bottom:6px;">
                Referral Code
              </div>
              <div style="font-size:22px;font-weight:800;color:#111827;">
                ${escapeHtml(referralCode)}
              </div>
            </div>
            `
                : ""
            }

            <div style="margin:24px 0 10px;">
              <a
                href="${escapeHtml(signinUrl)}"
                style="display:inline-block;padding:13px 18px;border-radius:12px;background:#111;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;"
              >
                Sign In
              </a>
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
      "Your FUUVIA affiliate application has been approved.",
      "You can now sign in to your affiliate account and start sharing your referral link.",
      referralCode ? `Referral code: ${referralCode}` : "",
      `Sign in: ${signinUrl}`,
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
