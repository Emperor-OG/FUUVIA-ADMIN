import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch } from "../services/api";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await adminFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">FUUVIA Admin</div>
        <h2>Staff Sign In</h2>
        <p>Only approved staff emails can access this dashboard.</p>

        <form className="admin-login-form" onSubmit={onSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Staff email"
            value={form.email}
            onChange={onChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={onChange}
            required
          />

          {error ? <div className="admin-login-error">{error}</div> : null}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}