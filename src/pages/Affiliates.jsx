import React, { useEffect, useState } from "react";
import { adminFetch } from "../services/api";
import "../styles/affiliates.css";

function parseApplicationNote(note = "") {
  const safeNote = String(note || "").trim();

  if (!safeNote) {
    return {
      socialLink: "",
      noteText: "",
    };
  }

  const lines = safeNote
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let socialLink = "";
  const otherLines = [];

  for (const line of lines) {
    if (!socialLink && line.toLowerCase().startsWith("social link:")) {
      socialLink = line.replace(/^social link:\s*/i, "").trim();
    } else {
      otherLines.push(line);
    }
  }

  return {
    socialLink,
    noteText: otherLines.join("\n\n"),
  };
}

function normalizeLink(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function Affiliates() {
  const [pending, setPending] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [affiliateOrders, setAffiliateOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await adminFetch("/api/admin/affiliates");
      setPending(Array.isArray(data?.pending) ? data.pending : []);
      setAffiliates(Array.isArray(data?.affiliates) ? data.affiliates : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliateOrders = async (affiliate) => {
    try {
      setOrdersLoading(true);
      const data = await adminFetch(`/api/admin/affiliates/${affiliate.id}/orders`);
      setSelectedAffiliate(data?.affiliate || affiliate);
      setAffiliateOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load affiliate orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleAction = async (affiliateId, action) => {
    try {
      setActionLoadingId(affiliateId);
      const data = await adminFetch(`/api/admin/affiliates/${affiliateId}/${action}`, {
        method: "POST",
      });

      if (action === "pay" && data?.payout_total) {
        alert(
          `Marked as paid successfully.\nPayout total: R${Number(
            data.payout_total
          ).toFixed(2)}`
        );
      }

      await loadAffiliates();

      if (selectedAffiliate?.id === affiliateId) {
        await loadAffiliateOrders({ id: affiliateId });
      }
    } catch (err) {
      console.error(err);
      alert(err.message || `Failed to ${action} affiliate`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="affiliates-page">
        <div className="affiliates-card">
          <p className="affiliates-empty">Loading affiliates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="affiliates-page">
      {error ? (
        <div className="affiliates-card affiliates-card--error">
          <p className="affiliates-error">{error}</p>
        </div>
      ) : null}

      <div className="affiliates-card">
        <div className="affiliates-card__header">
          <div>
            <h2>Pending Applications</h2>
            <p>Review and decide which applicants should join the programme.</p>
          </div>
          <div className="affiliates-badge">{pending.length} pending</div>
        </div>

        {pending.length === 0 ? (
          <p className="affiliates-empty">No pending affiliate applications.</p>
        ) : (
          <div className="affiliates-table-wrap">
            <table className="affiliates-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Applied</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((affiliate) => {
                  const { socialLink, noteText } = parseApplicationNote(
                    affiliate.application_note
                  );

                  return (
                    <tr key={affiliate.id}>
                      <td>{affiliate.id}</td>
                      <td>{affiliate.full_name}</td>
                      <td>{affiliate.email}</td>
                      <td>{affiliate.phone || "-"}</td>
                      <td>
                        {affiliate.created_at
                          ? new Date(affiliate.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="affiliates-note-cell">
                        {socialLink ? (
                          <div className="affiliates-note-block">
                            <div className="affiliates-note-label">Social Link</div>
                            <a
                              href={normalizeLink(socialLink)}
                              target="_blank"
                              rel="noreferrer"
                              className="affiliates-note-link"
                            >
                              {socialLink}
                            </a>
                          </div>
                        ) : null}

                        {noteText ? (
                          <div className="affiliates-note-block">
                            <div className="affiliates-note-label">Application Note</div>
                            <div className="affiliates-note-text">{noteText}</div>
                          </div>
                        ) : !socialLink ? (
                          <span>-</span>
                        ) : null}
                      </td>
                      <td>
                        <div className="affiliates-actions">
                          <button
                            type="button"
                            className="affiliates-btn affiliates-btn--approve"
                            onClick={() => handleAction(affiliate.id, "approve")}
                            disabled={actionLoadingId === affiliate.id}
                          >
                            <i className="bx bx-check"></i>
                            <span>
                              {actionLoadingId === affiliate.id ? "Working..." : "Approve"}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="affiliates-btn affiliates-btn--reject"
                            onClick={() => handleAction(affiliate.id, "reject")}
                            disabled={actionLoadingId === affiliate.id}
                          >
                            <i className="bx bx-x"></i>
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="affiliates-card">
        <div className="affiliates-card__header">
          <div>
            <h2>Affiliates</h2>
            <p>Manage approved, suspended, and rejected affiliate accounts.</p>
          </div>
          <div className="affiliates-badge">{affiliates.length} total</div>
        </div>

        {affiliates.length === 0 ? (
          <p className="affiliates-empty">No affiliates found.</p>
        ) : (
          <div className="affiliates-table-wrap">
            <table className="affiliates-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Referral Code</th>
                  <th>Orders</th>
                  <th>Tracked</th>
                  <th>Completed</th>
                  <th>Ready</th>
                  <th>Paid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((affiliate) => {
                  const readyAmount = Number(affiliate.ready_total || 0);

                  return (
                    <tr key={affiliate.id}>
                      <td>{affiliate.id}</td>
                      <td>{affiliate.full_name}</td>
                      <td>{affiliate.email}</td>
                      <td>
                        <span
                          className={`affiliates-status affiliates-status--${String(
                            affiliate.status || ""
                          ).toLowerCase()}`}
                        >
                          {affiliate.status}
                        </span>
                      </td>
                      <td>{affiliate.referral_code || "-"}</td>
                      <td>{affiliate.order_count || 0}</td>
                      <td>R{Number(affiliate.tracked_total || 0).toFixed(2)}</td>
                      <td>R{Number(affiliate.completed_total || 0).toFixed(2)}</td>
                      <td>R{readyAmount.toFixed(2)}</td>
                      <td>R{Number(affiliate.paid_total || 0).toFixed(2)}</td>
                      <td>
                        <div className="affiliates-actions">
                          <button
                            type="button"
                            className="affiliates-btn"
                            onClick={() => loadAffiliateOrders(affiliate)}
                          >
                            <i className="bx bx-receipt"></i>
                            <span>Orders</span>
                          </button>

                          {readyAmount > 0 ? (
                            <button
                              type="button"
                              className="affiliates-btn affiliates-btn--pay"
                              onClick={() => handleAction(affiliate.id, "pay")}
                              disabled={actionLoadingId === affiliate.id}
                            >
                              <i className="bx bx-wallet"></i>
                              <span>
                                {actionLoadingId === affiliate.id ? "Paying..." : "Mark Paid"}
                              </span>
                            </button>
                          ) : null}

                          {affiliate.status !== "suspended" ? (
                            <button
                              type="button"
                              className="affiliates-btn affiliates-btn--warn"
                              onClick={() => handleAction(affiliate.id, "suspend")}
                              disabled={actionLoadingId === affiliate.id}
                            >
                              <i className="bx bx-pause-circle"></i>
                              <span>Suspend</span>
                            </button>
                          ) : null}

                          {affiliate.status !== "active" ? (
                            <button
                              type="button"
                              className="affiliates-btn affiliates-btn--approve"
                              onClick={() => handleAction(affiliate.id, "approve")}
                              disabled={actionLoadingId === affiliate.id}
                            >
                              <i className="bx bx-check-circle"></i>
                              <span>Activate</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="affiliates-card">
        <div className="affiliates-card__header">
          <div>
            <h2>
              {selectedAffiliate
                ? `Orders for ${selectedAffiliate.full_name}`
                : "Affiliate Orders"}
            </h2>
            <p>
              {selectedAffiliate
                ? "Track referred orders, earnings, and payout timing."
                : "Select an affiliate above to inspect their referred orders."}
            </p>
          </div>
        </div>

        {!selectedAffiliate ? (
          <p className="affiliates-empty">
            Select an affiliate to view referred orders.
          </p>
        ) : ordersLoading ? (
          <p className="affiliates-empty">Loading affiliate orders...</p>
        ) : affiliateOrders.length === 0 ? (
          <p className="affiliates-empty">
            No referred orders found for this affiliate.
          </p>
        ) : (
          <div className="affiliates-table-wrap">
            <table className="affiliates-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Order Total</th>
                  <th>Earning</th>
                  <th>Order Status</th>
                  <th>Earning Status</th>
                  <th>Payout Date</th>
                  <th>Paid At</th>
                </tr>
              </thead>
              <tbody>
                {affiliateOrders.map((order) => (
                  <tr key={order.order_id}>
                    <td>{order.order_reference || `#${order.order_id}`}</td>
                    <td>
                      <div>{order.customer_name || "-"}</div>
                      <div className="affiliates-subtext">
                        {order.customer_email || order.customer_phone || ""}
                      </div>
                    </td>
                    <td>{order.item_count}</td>
                    <td>R{Number(order.order_total || 0).toFixed(2)}</td>
                    <td>R{Number(order.earning_amount || 0).toFixed(2)}</td>
                    <td>{order.order_status}</td>
                    <td>{order.earning_status}</td>
                    <td>
                      {order.eligible_for_payout_at
                        ? new Date(order.eligible_for_payout_at).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      {order.paid_at
                        ? new Date(order.paid_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
