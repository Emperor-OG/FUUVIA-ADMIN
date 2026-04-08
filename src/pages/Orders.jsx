import React, { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../services/api";
import "../styles/orders.css";

function formatCurrency(value) {
  const num = Number(value || 0);
  return `R${num.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ledgerLabel(period, groupBy) {
  if (!period) return "—";
  const d = new Date(period);
  if (Number.isNaN(d.getTime())) return period;

  if (groupBy === "yearly") {
    return `${d.getFullYear()}`;
  }

  if (groupBy === "monthly") {
    return d.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
    });
  }

  if (groupBy === "weekly") {
    return `Week of ${d.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    })}`;
  }

  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function DetailRow({ label, value }) {
  return (
    <div className="order-detail-row">
      <span className="order-detail-label">{label}</span>
      <span className="order-detail-value">{value || "—"}</span>
    </div>
  );
}

function SectionToggle({ title, subtitle, isOpen, onToggle, rightContent }) {
  return (
    <div className="orders-section-head orders-section-head-toggle">
      <button
        type="button"
        className="orders-section-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className={`orders-section-chevron ${isOpen ? "open" : ""}`}>
          ▾
        </span>
        <span className="orders-section-toggle-text">
          <span className="orders-section-toggle-title">{title}</span>
          {subtitle ? (
            <span className="orders-section-toggle-subtitle">{subtitle}</span>
          ) : null}
        </span>
      </button>

      {rightContent ? <div>{rightContent}</div> : null}
    </div>
  );
}

export default function Orders() {
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [ledgerGroup, setLedgerGroup] = useState("daily");

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: "",
    payment_status: "",
    order_status: "",
    settled: "",
    start_date: "",
    end_date: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    payment_status: "",
    order_status: "",
    settled: "",
    start_date: "",
    end_date: "",
  });

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [selectedOrderError, setSelectedOrderError] = useState("");

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (appliedFilters.search) params.set("search", appliedFilters.search);
    if (appliedFilters.payment_status) {
      params.set("payment_status", appliedFilters.payment_status);
    }
    if (appliedFilters.order_status) {
      params.set("order_status", appliedFilters.order_status);
    }
    if (appliedFilters.settled !== "") {
      params.set("settled", appliedFilters.settled);
    }
    if (appliedFilters.start_date) {
      params.set("start_date", appliedFilters.start_date);
    }
    if (appliedFilters.end_date) {
      params.set("end_date", appliedFilters.end_date);
    }

    params.set("page", pagination.page);
    params.set("limit", pagination.limit);

    return params.toString();
  }, [appliedFilters, pagination.page, pagination.limit]);

  async function fetchSummary() {
    try {
      setLoadingSummary(true);
      const data = await adminFetch("/api/admin/orders/summary");
      setSummary(data || null);
    } catch (error) {
      console.error("Failed to fetch orders summary:", error);
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }

  async function fetchLedger(group = ledgerGroup) {
    try {
      setLoadingLedger(true);
      const data = await adminFetch(
        `/api/admin/orders/ledger?groupBy=${encodeURIComponent(group)}`
      );
      setLedger(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch orders ledger:", error);
      setLedger([]);
    } finally {
      setLoadingLedger(false);
    }
  }

  async function fetchOrders() {
    try {
      setLoadingOrders(true);
      const data = await adminFetch(`/api/admin/orders?${queryString}`);

      const rawOrders = Array.isArray(data?.data) ? data.data : [];
      const sortedOrders = [...rawOrders].sort(
        (a, b) => Number(a.id || 0) - Number(b.id || 0)
      );

      setOrders(sortedOrders);
      setPagination((prev) => ({
        ...prev,
        ...(data?.pagination || {}),
      }));
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  async function openOrderDetails(orderId) {
    try {
      setSelectedOrder(null);
      setSelectedOrderError("");
      setSelectedOrderLoading(true);

      const data = await adminFetch(`/api/admin/orders/${orderId}`);
      setSelectedOrder(data || null);
    } catch (error) {
      console.error("Failed to fetch single order:", error);
      setSelectedOrderError(error.message || "Failed to load order.");
    } finally {
      setSelectedOrderLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchLedger(ledgerGroup);
  }, [ledgerGroup]);

  useEffect(() => {
    fetchOrders();
  }, [queryString]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function applyFilters(e) {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedFilters({ ...filters });
    setOrdersOpen(true);
  }

  function resetFilters() {
    const cleared = {
      search: "",
      payment_status: "",
      order_status: "",
      settled: "",
      start_date: "",
      end_date: "",
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: nextPage }));
  }

  const parsedItems = useMemo(() => {
    if (!selectedOrder?.items) return [];
    if (Array.isArray(selectedOrder.items)) return selectedOrder.items;
    return [];
  }, [selectedOrder]);

  const activeFilterCount = useMemo(() => {
    return Object.values(appliedFilters).filter((value) => value !== "").length;
  }, [appliedFilters]);

  return (
    <div className="orders-page">
      <div className="orders-page-header">
        <div>
          <h1>Orders</h1>
          <p>Track orders and FUUVIA income across all stores.</p>
        </div>
      </div>

      <section className="orders-summary-grid">
        <div className="orders-card">
          <span className="orders-card-label">Paid Orders</span>
          <strong className="orders-card-value">
            {loadingSummary ? "..." : summary?.paid_orders ?? 0}
          </strong>
        </div>

        <div className="orders-card">
          <span className="orders-card-label">Today Income</span>
          <strong className="orders-card-value">
            {loadingSummary ? "..." : formatCurrency(summary?.today_income)}
          </strong>
        </div>

        <div className="orders-card">
          <span className="orders-card-label">This Week</span>
          <strong className="orders-card-value">
            {loadingSummary ? "..." : formatCurrency(summary?.week_income)}
          </strong>
        </div>

        <div className="orders-card">
          <span className="orders-card-label">This Month</span>
          <strong className="orders-card-value">
            {loadingSummary ? "..." : formatCurrency(summary?.month_income)}
          </strong>
        </div>

        <div className="orders-card">
          <span className="orders-card-label">This Year</span>
          <strong className="orders-card-value">
            {loadingSummary ? "..." : formatCurrency(summary?.year_income)}
          </strong>
        </div>

        <div className="orders-card">
          <span className="orders-card-label">Lifetime Income</span>
          <strong className="orders-card-value">
            {loadingSummary ? "..." : formatCurrency(summary?.lifetime_income)}
          </strong>
        </div>
      </section>

      <section className="orders-section">
        <SectionToggle
          title="Filters"
          subtitle={
            activeFilterCount > 0
              ? `${activeFilterCount} active filter${
                  activeFilterCount > 1 ? "s" : ""
                }`
              : "Search and narrow orders"
          }
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen((prev) => !prev)}
        />

        {filtersOpen ? (
          <form className="orders-filters" onSubmit={applyFilters}>
            <input
              type="text"
              name="search"
              placeholder="Search by order ID, store ID, reference, customer name or email"
              value={filters.search}
              onChange={handleFilterChange}
            />

            <select
              name="payment_status"
              value={filters.payment_status}
              onChange={handleFilterChange}
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <select
              name="order_status"
              value={filters.order_status}
              onChange={handleFilterChange}
            >
              <option value="">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="dispatch">Dispatch</option>
              <option value="completed">Completed</option>
            </select>

            <select
              name="settled"
              value={filters.settled}
              onChange={handleFilterChange}
            >
              <option value="">All Settlements</option>
              <option value="true">Settled</option>
              <option value="false">Unsettled</option>
            </select>

            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />

            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />

            <div className="orders-filter-actions">
              <button type="submit" className="orders-btn orders-btn-primary">
                Apply
              </button>
              <button
                type="button"
                className="orders-btn orders-btn-secondary"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="orders-section">
        <SectionToggle
          title="FUUVIA Income Ledger"
          subtitle={`${ledger.length} grouped record${ledger.length === 1 ? "" : "s"}`}
          isOpen={ledgerOpen}
          onToggle={() => setLedgerOpen((prev) => !prev)}
          rightContent={
            ledgerOpen ? (
              <div className="orders-ledger-tabs">
                {["daily", "weekly", "monthly", "yearly"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`orders-ledger-tab ${
                      ledgerGroup === tab ? "active" : ""
                    }`}
                    onClick={() => setLedgerGroup(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            ) : null
          }
        />

        {ledgerOpen ? (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Paid Orders</th>
                  <th>Gross Sales</th>
                  <th>FUUVIA Income</th>
                </tr>
              </thead>
              <tbody>
                {loadingLedger ? (
                  <tr>
                    <td colSpan="4" className="orders-empty">
                      Loading ledger...
                    </td>
                  </tr>
                ) : ledger.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="orders-empty">
                      No ledger records found.
                    </td>
                  </tr>
                ) : (
                  ledger.map((row, index) => (
                    <tr key={`${row.period}-${index}`}>
                      <td>{ledgerLabel(row.period, ledgerGroup)}</td>
                      <td>{row.paid_orders}</td>
                      <td>{formatCurrency(row.gross_sales)}</td>
                      <td>{formatCurrency(row.fuuvia_income)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="orders-section">
        <SectionToggle
          title="All Orders"
          subtitle={`${pagination.total || 0} total order${
            (pagination.total || 0) === 1 ? "" : "s"
          }`}
          isOpen={ordersOpen}
          onToggle={() => setOrdersOpen((prev) => !prev)}
          rightContent={
            <span className="orders-total-count">Total: {pagination.total || 0}</span>
          }
        />

        {ordersOpen ? (
          <>
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Store ID</th>
                    <th>Customer</th>
                    <th>Reference</th>
                    <th>Total</th>
                    <th>Commission</th>
                    <th>Payment</th>
                    <th>Order</th>
                    <th>Settled</th>
                    <th>Paid At</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingOrders ? (
                    <tr>
                      <td colSpan="12" className="orders-empty">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="orders-empty">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.store_id}</td>
                        <td>
                          <div className="orders-customer-cell">
                            <strong>{order.customer_name || "—"}</strong>
                            <span>{order.customer_email || "—"}</span>
                          </div>
                        </td>
                        <td>{order.reference || "—"}</td>
                        <td>{formatCurrency(order.total_amount)}</td>
                        <td>{formatCurrency(order.fuuvia_commission)}</td>
                        <td>
                          <span
                            className={`orders-badge orders-badge-${
                              order.payment_status || "default"
                            }`}
                          >
                            {order.payment_status || "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`orders-badge orders-badge-${
                              order.order_status || "default"
                            }`}
                          >
                            {order.order_status || "—"}
                          </span>
                        </td>
                        <td>{order.settled === true ? "Yes" : "No"}</td>
                        <td>{formatDate(order.paid_at)}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="orders-btn orders-btn-primary orders-view-btn"
                            onClick={() => openOrderDetails(order.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="orders-pagination">
              <button
                type="button"
                className="orders-btn orders-btn-secondary"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>

              <span>
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                className="orders-btn orders-btn-secondary"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>

      {(selectedOrderLoading || selectedOrder || selectedOrderError) && (
        <div
          className="orders-modal-backdrop"
          onClick={() => {
            setSelectedOrder(null);
            setSelectedOrderError("");
            setSelectedOrderLoading(false);
          }}
        >
          <div className="orders-modal" onClick={(e) => e.stopPropagation()}>
            <div className="orders-modal-head">
              <h3>
                {selectedOrder ? `Order #${selectedOrder.id}` : "Order Details"}
              </h3>
              <button
                type="button"
                className="orders-modal-close"
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedOrderError("");
                  setSelectedOrderLoading(false);
                }}
              >
                ×
              </button>
            </div>

            {selectedOrderLoading ? (
              <div className="orders-modal-body">Loading order...</div>
            ) : selectedOrderError ? (
              <div className="orders-modal-body">{selectedOrderError}</div>
            ) : selectedOrder ? (
              <div className="orders-modal-body">
                <div className="orders-details-grid">
                  <DetailRow label="Order ID" value={selectedOrder.id} />
                  <DetailRow label="Store ID" value={selectedOrder.store_id} />
                  <DetailRow label="Reference" value={selectedOrder.reference} />
                  <DetailRow
                    label="Customer Name"
                    value={selectedOrder.customer_name}
                  />
                  <DetailRow
                    label="Customer Email"
                    value={selectedOrder.customer_email}
                  />
                  <DetailRow
                    label="Customer Phone"
                    value={selectedOrder.customer_phone}
                  />
                  <DetailRow label="Type" value={selectedOrder.type} />
                  <DetailRow
                    label="Payment Status"
                    value={selectedOrder.payment_status}
                  />
                  <DetailRow
                    label="Order Status"
                    value={selectedOrder.order_status}
                  />
                  <DetailRow
                    label="Settled"
                    value={selectedOrder.settled ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="Cart Total"
                    value={formatCurrency(selectedOrder.cart_total)}
                  />
                  <DetailRow
                    label="Location Fee"
                    value={formatCurrency(selectedOrder.location_fee)}
                  />
                  <DetailRow
                    label="Total Amount"
                    value={formatCurrency(selectedOrder.total_amount)}
                  />
                  <DetailRow
                    label="FUUVIA Commission"
                    value={formatCurrency(selectedOrder.fuuvia_commission)}
                  />
                  <DetailRow
                    label="Paid At"
                    value={formatDate(selectedOrder.paid_at)}
                  />
                  <DetailRow
                    label="Created At"
                    value={formatDate(selectedOrder.created_at)}
                  />
                  <DetailRow
                    label="Updated At"
                    value={formatDate(selectedOrder.updated_at)}
                  />
                </div>

                <div className="orders-detail-block">
                  <h4>Address</h4>
                  <div className="orders-address-box">
                    <p><strong>Street:</strong> {selectedOrder.street || "—"}</p>
                    <p><strong>Unit:</strong> {selectedOrder.unit || "—"}</p>
                    <p><strong>Building:</strong> {selectedOrder.building || "—"}</p>
                    <p><strong>Suburb:</strong> {selectedOrder.suburb || "—"}</p>
                    <p><strong>City:</strong> {selectedOrder.city || "—"}</p>
                    <p><strong>Province:</strong> {selectedOrder.province || "—"}</p>
                    <p><strong>Postal Code:</strong> {selectedOrder.postal_code || "—"}</p>
                  </div>
                </div>

                <div className="orders-detail-block">
                  <h4>Notes</h4>
                  <div className="orders-note-box">
                    {selectedOrder.notes || "—"}
                  </div>
                </div>

                <div className="orders-detail-block">
                  <h4>Items</h4>
                  {parsedItems.length === 0 ? (
                    <div className="orders-note-box">No items found.</div>
                  ) : (
                    <div className="orders-items-list">
                      {parsedItems.map((item, idx) => (
                        <div className="orders-item-card" key={idx}>
                          <div className="orders-item-row">
                            <strong>Name:</strong>
                            <span>
                              {item.name ||
                                item.product_name ||
                                item.title ||
                                "—"}
                            </span>
                          </div>
                          <div className="orders-item-row">
                            <strong>Quantity:</strong>
                            <span>{item.quantity ?? "—"}</span>
                          </div>
                          <div className="orders-item-row">
                            <strong>Price:</strong>
                            <span>
                              {item.price != null
                                ? formatCurrency(item.price)
                                : "—"}
                            </span>
                          </div>
                          <div className="orders-item-row">
                            <strong>Variant:</strong>
                            <span>
                              {item.variant_name ||
                                item.variant ||
                                item.size ||
                                "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}