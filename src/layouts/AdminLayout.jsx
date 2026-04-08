import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { adminFetch } from "../services/api";
import "../styles/layout.css";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadMe = async () => {
      try {
        const data = await adminFetch("/api/admin/me");
        if (!mounted) return;
        setAdmin(data?.admin || null);
      } catch {
        if (!mounted) return;
        setAdmin(null);
      }
    };

    loadMe();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const canManageStaff = ["emperor", "super_admin", "executive", "human_resource"].includes(
    admin?.role
  );

  const pageTitle =
    location.pathname === "/staff"
      ? "Staff"
      : location.pathname === "/stores"
      ? "Stores"
      : location.pathname === "/orders"
      ? "Orders"
      : location.pathname === "/users"
      ? "Users"
      : location.pathname === "/products"
      ? "Products"
      : location.pathname === "/locations"
      ? "Locations"
      : "Overview";

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">FUUVIA Admin</div>

        <div className="admin-profile-box">
          <div className="admin-profile-name">{admin?.full_name || "Admin"}</div>
          <div className="admin-profile-role">{admin?.role || "-"}</div>
        </div>

        <nav className="admin-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
          >
            <i className="bx bx-grid-alt"></i>
            <span>Overview</span>
          </NavLink>

          <NavLink
            to="/stores"
            className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
          >
            <i className="bx bx-store"></i>
            <span>Stores</span>
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
          >
            <i className="bx bx-package"></i>
            <span>Products</span>
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
          >
            <i className="bx bx-cart-alt"></i>
            <span>Orders</span>
          </NavLink>

          <NavLink
            to="/locations"
            className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
            >
            <i className="bx bx-map"></i>
            <span>Locations</span>
          </NavLink>

          <NavLink
            to="/users"
            className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
          >
            <i className="bx bx-user"></i>
            <span>Users</span>
          </NavLink>

          {canManageStaff ? (
            <NavLink
              to="/staff"
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
            >
              <i className="bx bx-user-plus"></i>
              <span>Staff</span>
            </NavLink>
          ) : null}
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <i className="bx bx-log-out"></i>
          <span>Logout</span>
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h1>{pageTitle}</h1>
        </header>

        <div className="admin-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}