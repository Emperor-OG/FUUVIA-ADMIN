import React, { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../services/api";
import "../styles/staff.css";

const ROLE_RANK = {
  operations: 1,
  support: 2,
  finance: 3,
  admin: 4,
  human_resource: 5,
  executive: 6,
  super_admin: 7,
  emperor: 8,
};

const MANAGER_ROLES = ["human_resource", "executive", "super_admin", "emperor"];

const canCreateRole = (creatorRole, targetRole) => {
  if (!ROLE_RANK[creatorRole] || !ROLE_RANK[targetRole]) return false;
  if (targetRole === "emperor") return creatorRole === "emperor";
  return ROLE_RANK[creatorRole] > ROLE_RANK[targetRole];
};

const canModifyTarget = (currentRole, targetRole) => {
  if (!ROLE_RANK[currentRole] || !ROLE_RANK[targetRole]) return false;
  if (targetRole === "emperor") return currentRole === "emperor";
  return ROLE_RANK[currentRole] > ROLE_RANK[targetRole];
};

const ALL_ROLES = [
  "operations",
  "support",
  "finance",
  "admin",
  "human_resource",
  "executive",
  "super_admin",
  "emperor",
];

export default function Staff() {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalForm, setModalForm] = useState({
    role: "",
    phone: "",
    address: "",
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    role: "admin",
  });

  const loadPage = async () => {
    try {
      const me = await adminFetch("/api/admin/me");
      setCurrentAdmin(me?.admin || null);

      const data = await adminFetch("/api/admin/staff");
      setStaff(data);
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      setModalForm({
        role: selectedMember.role || "",
        phone: selectedMember.phone || "",
        address: selectedMember.address || "",
      });
    }
  }, [selectedMember]);

  const canManageStaff = MANAGER_ROLES.includes(currentAdmin?.role);

  const roleOptions = useMemo(() => {
    if (!currentAdmin?.role) return [];
    return ALL_ROLES.filter((role) => canCreateRole(currentAdmin.role, role));
  }, [currentAdmin]);

  const modalRoleOptions = useMemo(() => {
    if (!currentAdmin?.role || !selectedMember) return [];
    return [selectedMember.role, ...ALL_ROLES.filter((role) => canCreateRole(currentAdmin.role, role))]
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }, [currentAdmin, selectedMember]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const result = await adminFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setMessage(
        `Staff created successfully. Temporary password: ${result.temporaryPassword}`
      );
      setMessageType("success");

      setForm({
        full_name: "",
        email: "",
        phone: "",
        address: "",
        role: roleOptions[0] || "admin",
      });

      setShowCreate(false);
      await loadPage();
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  };

  const toggleActive = async (member) => {
    try {
      await adminFetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !member.is_active,
        }),
      });

      setMessage(`${member.full_name} updated successfully.`);
      setMessageType("success");
      await loadPage();

      if (selectedMember?.id === member.id) {
        setSelectedMember((prev) =>
          prev ? { ...prev, is_active: !prev.is_active } : null
        );
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  };

  const resetPassword = async (member) => {
    try {
      const result = await adminFetch(`/api/admin/staff/${member.id}/reset-password`, {
        method: "POST",
      });

      setMessage(
        `${member.full_name} temporary password: ${result.temporaryPassword}`
      );
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedMember) return;

    try {
      setSavingDetails(true);

      await adminFetch(`/api/admin/staff/${selectedMember.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: modalForm.role,
          phone: modalForm.phone,
          address: modalForm.address,
        }),
      });

      setMessage(`${selectedMember.full_name} details updated successfully.`);
      setMessageType("success");

      const updatedMember = {
        ...selectedMember,
        role: modalForm.role,
        phone: modalForm.phone.trim(),
        address: modalForm.address.trim(),
      };

      setSelectedMember(updatedMember);
      await loadPage();
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setSavingDetails(false);
    }
  };

  if (loading) return <div>Loading staff...</div>;

  if (!canManageStaff) {
    return <div>You do not have permission to view staff management.</div>;
  }

  return (
    <div className="staff-page">
      <div className="staff-header-row">
        <div>
          <h2>Staff Management</h2>
          <p>View all staff and manage admin accounts.</p>
        </div>

        <button
          className="staff-add-btn"
          onClick={() => setShowCreate((prev) => !prev)}
        >
          {showCreate ? "Close" : "Add New Member"}
        </button>
      </div>

      {showCreate ? (
        <div className="staff-create-card">
          <h3>Create Staff Member</h3>

          <form className="staff-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />

            <input
              type="text"
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />

            <input
              type="text"
              placeholder="Address (optional)"
              value={form.address}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, address: e.target.value }))
              }
            />

            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <button type="submit">Create Staff</button>
          </form>
        </div>
      ) : null}

      {message ? (
        <div className={`staff-message ${messageType}`}>{message}</div>
      ) : null}

      <div className="staff-table-card">
        <div className="staff-table-wrap">
          <table className="staff-table minimal">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {staff.map((member) => {
                const canEditThis = canModifyTarget(currentAdmin?.role, member.role);

                return (
                  <tr key={member.id}>
                    <td>{member.full_name}</td>

                    <td>
                      <span className="staff-role-text">{member.role}</span>
                    </td>

                    <td>
                      <span className={`staff-badge ${member.is_active ? "active" : "inactive"}`}>
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="staff-actions-inline">
                        <button
                          type="button"
                          onClick={() => setSelectedMember(member)}
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActive(member)}
                          disabled={!canEditThis}
                        >
                          {member.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => resetPassword(member)}
                          disabled={!canEditThis}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember ? (
        <div className="staff-modal-overlay" onClick={() => setSelectedMember(null)}>
          <div
            className="staff-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="staff-modal-header">
              <div>
                <h3>{selectedMember.full_name}</h3>
                <p>Staff details and editable hidden information.</p>
              </div>

              <button
                className="staff-modal-close"
                onClick={() => setSelectedMember(null)}
              >
                ×
              </button>
            </div>

            <div className="staff-modal-grid">
              <div className="staff-detail-field">
                <label>Email</label>
                <div className="staff-detail-readonly">
                  {selectedMember.email || "-"}
                </div>
              </div>

              <div className="staff-detail-field">
                <label>Role</label>
                <select
                  value={modalForm.role}
                  className="staff-inline-select"
                  onChange={(e) =>
                    setModalForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                  disabled={!canModifyTarget(currentAdmin?.role, selectedMember.role)}
                >
                  {modalRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="staff-detail-field">
                <label>Phone</label>
                <input
                  type="text"
                  value={modalForm.phone}
                  placeholder="No phone number"
                  disabled={!canModifyTarget(currentAdmin?.role, selectedMember.role)}
                  onChange={(e) =>
                    setModalForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>

              <div className="staff-detail-field">
                <label>Status</label>
                <div className="staff-detail-readonly">
                  {selectedMember.is_active ? "Active" : "Inactive"}
                </div>
              </div>

              <div className="staff-detail-field full">
                <label>Address</label>
                <input
                  type="text"
                  value={modalForm.address}
                  placeholder="No address"
                  disabled={!canModifyTarget(currentAdmin?.role, selectedMember.role)}
                  onChange={(e) =>
                    setModalForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>

              <div className="staff-detail-field">
                <label>Last Login</label>
                <div className="staff-detail-readonly">
                  {selectedMember.last_login_at
                    ? new Date(selectedMember.last_login_at).toLocaleString()
                    : "Never"}
                </div>
              </div>

              <div className="staff-detail-field">
                <label>Password Reset Required</label>
                <div className="staff-detail-readonly">
                  {selectedMember.must_change_password ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <div className="staff-modal-footer">
              <button
                type="button"
                className="staff-modal-secondary-btn"
                onClick={() => setSelectedMember(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="staff-modal-save-btn"
                onClick={handleSaveDetails}
                disabled={
                  savingDetails ||
                  !canModifyTarget(currentAdmin?.role, selectedMember.role)
                }
              >
                {savingDetails ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}