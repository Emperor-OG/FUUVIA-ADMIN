import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { adminFetch } from "../services/api";

export default function ProtectedAdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const data = await adminFetch("/api/admin/me");
        if (!mounted) return;
        setAllowed(!!data?.authenticated);
      } catch {
        if (!mounted) return;
        setAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="admin-loading-screen">Loading...</div>;
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}