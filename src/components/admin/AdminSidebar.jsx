import React from "react";
import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const navItems = [
    { to: "/", label: "Overview", icon: "bx-grid-alt" },
    { to: "/stores", label: "Stores", icon: "bx-store" },
    { to: "/products", label: "Products", icon: "bx-package" },
    { to: "/orders", label: "Orders", icon: "bx-cart" },
    { to: "/users", label: "Users", icon: "bx-user" },
    { to: "/affiliates", label: "Affiliates", icon: "bx-network-chart" },
    { to: "/finance", label: "Finance", icon: "bx-wallet" },
    { to: "/settings", label: "Settings", icon: "bx-cog" },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">FUUVIA Admin</div>

      <nav className="admin-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <i className={`bx ${item.icon}`}></i>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}