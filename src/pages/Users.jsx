import React, { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../services/api";
import "../styles/users.css";

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

function formatCurrency(value) {
  const num = Number(value || 0);
  return `R${num.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusClass(value) {
  const v = String(value || "").toLowerCase();

  if (v === "paid" || v === "completed") return "success";
  if (v === "pending") return "pending";
  if (v === "processing" || v === "dispatch") return "info";
  if (v === "failed" || v === "cancelled") return "danger";
  return "default";
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedUserError, setSelectedUserError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedSearch) params.set("search", appliedSearch);
    params.set("page", pagination.page);
    params.set("limit", pagination.limit);
    return params.toString();
  }, [appliedSearch, pagination.page, pagination.limit]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await adminFetch(`/api/admin/users?${queryString}`);

      setUsers(Array.isArray(data?.data) ? data.data : []);
      setPagination((prev) => ({
        ...prev,
        ...(data?.pagination || {}),
      }));
    } catch (err) {
      console.error("Users fetch failed:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function openUser(user) {
    try {
      setSelectedUser(null);
      setSelectedUserError("");
      setSelectedUserLoading(true);

      const userData = await adminFetch(`/api/admin/users/${user.id}`);

      const params = new URLSearchParams();
      if (userData?.email) params.set("user_email", userData.email);
      if (userData?.google_id) params.set("user_google_id", userData.google_id);
      params.set("limit", "100");

      const ordersData = await adminFetch(`/api/admin/orders?${params.toString()}`);

      const orders = Array.isArray(ordersData?.data) ? ordersData.data : [];
      const totalSpent = orders.reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      );

      setSelectedUser({
        ...userData,
        orders,
        orders_count: orders.length,
        total_spent: totalSpent,
      });
    } catch (err) {
      console.error("User load failed:", err);
      setSelectedUserError(err.message || "Failed to load user.");
    } finally {
      setSelectedUserLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [queryString]);

  function applySearch(e) {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedSearch(search);
  }

  function goToPage(p) {
    if (p < 1 || p > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: p }));
  }

  const userOrders = useMemo(() => {
    if (!selectedUser?.orders || !Array.isArray(selectedUser.orders)) return [];
    return [...selectedUser.orders].sort((a, b) => Number(a.id) - Number(b.id));
  }, [selectedUser]);

  const closeModal = () => {
    setSelectedUser(null);
    setSelectedUserError("");
    setSelectedUserLoading(false);
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h1>Users</h1>
          <p>Manage all platform users.</p>
        </div>

        <form onSubmit={applySearch}>
          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="users-card">
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Google ID</th>
                <th>Last Login</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7">No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>{u.username || "—"}</td>
                    <td>{u.email || "—"}</td>
                    <td>{u.google_id || "—"}</td>
                    <td>{formatDate(u.last_login)}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      <button type="button" onClick={() => openUser(u)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="users-pagination">
          <button
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Prev
          </button>
          <span>
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {(selectedUserLoading || selectedUser || selectedUserError) && (
        <div className="users-modal" onClick={closeModal}>
          <div className="users-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <h3>{selectedUser ? `User #${selectedUser.id}` : "User Details"}</h3>
              <button
                type="button"
                className="users-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {selectedUserLoading ? (
              <div className="users-modal-body">Loading user...</div>
            ) : selectedUserError ? (
              <div className="users-modal-body">{selectedUserError}</div>
            ) : selectedUser ? (
              <div className="users-modal-body">
                <div className="users-details-grid">
                  <div className="users-detail-item">
                    <span>ID</span>
                    <strong>#{selectedUser.id}</strong>
                  </div>

                  <div className="users-detail-item">
                    <span>Email</span>
                    <strong>{selectedUser.email || "—"}</strong>
                  </div>

                  <div className="users-detail-item">
                    <span>Username</span>
                    <strong>{selectedUser.username || "—"}</strong>
                  </div>

                  <div className="users-detail-item">
                    <span>Google ID</span>
                    <strong>{selectedUser.google_id || "—"}</strong>
                  </div>

                  <div className="users-detail-item">
                    <span>Last Login</span>
                    <strong>{formatDate(selectedUser.last_login)}</strong>
                  </div>

                  <div className="users-detail-item">
                    <span>Created</span>
                    <strong>{formatDate(selectedUser.created_at)}</strong>
                  </div>

                  <div className="users-detail-item">
                    <span>Total Orders</span>
                    <strong>{selectedUser.orders_count ?? userOrders.length}</strong>
                  </div>

                  <div className="users-detail-item">
                    <span>Total Spent</span>
                    <strong>{formatCurrency(selectedUser.total_spent)}</strong>
                  </div>
                </div>

                <div className="users-orders-block">
                  <div className="users-orders-block-header">
                    <h4>User Orders</h4>
                    <span>
                      {userOrders.length} order{userOrders.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {userOrders.length === 0 ? (
                    <div className="users-orders-empty">
                      This user has no orders yet.
                    </div>
                  ) : (
                    <div className="users-orders-table-wrap">
                      <table className="users-orders-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Store ID</th>
                            <th>Reference</th>
                            <th>Total</th>
                            <th>Commission</th>
                            <th>Payment</th>
                            <th>Order</th>
                            <th>Settled</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userOrders.map((order) => (
                            <tr key={order.id}>
                              <td>#{order.id}</td>
                              <td>{order.store_id || "—"}</td>
                              <td>{order.reference || "—"}</td>
                              <td>{formatCurrency(order.total_amount)}</td>
                              <td>{formatCurrency(order.fuuvia_commission)}</td>
                              <td>
                                <span
                                  className={`users-status-badge ${statusClass(
                                    order.payment_status
                                  )}`}
                                >
                                  {order.payment_status || "—"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`users-status-badge ${statusClass(
                                    order.order_status
                                  )}`}
                                >
                                  {order.order_status || "—"}
                                </span>
                              </td>
                              <td>{order.settled ? "Yes" : "No"}</td>
                              <td>{formatDate(order.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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