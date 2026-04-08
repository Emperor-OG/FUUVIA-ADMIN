import React, { useEffect, useState } from "react";
import StatCard from "../components/admin/StatCard";
import { adminFetch } from "../services/api";
import "../styles/overview.css";

export default function Overview() {
  const [stats, setStats] = useState({
    users: 0,
    stores: 0,
    products: 0,
    orders: 0,
    provinces: 0,
    cities: 0,
    staff: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      try {
        const data = await adminFetch("/api/admin/overview");
        if (!mounted) return;
        setStats(data);
      } catch (err) {
        console.error("Overview load failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOverview();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div>Loading overview...</div>;
  }

  return (
    <div className="overview-page">
      <div className="overview-header">
        <h2>Platform Overview</h2>
        <p>Quick snapshot of the FUUVIA platform.</p>
      </div>

      <div className="stats-grid">
        <StatCard title="Users" value={stats.users} />
        <StatCard title="Stores" value={stats.stores} />
        <StatCard title="Products" value={stats.products} />
        <StatCard title="Orders" value={stats.orders} />
        <StatCard title="Staff Members" value={stats.staff} />
        <StatCard title="Provinces" value={stats.provinces} />
        <StatCard title="Cities" value={stats.cities} />
      </div>
    </div>
  );
}