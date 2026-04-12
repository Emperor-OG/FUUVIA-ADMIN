import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Staff from "./pages/Staff";
import Stores from "./pages/Stores";
import Orders from "./pages/Orders";
import Users from "./pages/Users";
import Products from "./pages/Products";
import Locations from "./pages/Locations";
import Affiliates from "./pages/Affiliates";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import AdminLayout from "./layouts/AdminLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="staff" element={<Staff />} />
        <Route path="stores" element={<Stores />} />
        <Route path="orders" element={<Orders />} />
        <Route path="users" element={<Users />} />
        <Route path="products" element={<Products />} />
        <Route path="locations" element={<Locations />} />
        <Route path="affiliates" element={<Affiliates />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
