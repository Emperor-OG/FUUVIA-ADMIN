import React, { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../services/api";
import "../styles/stores.css";
import "boxicons/css/boxicons.min.css";

const makeSchedule = (schedule = {}) => ({
  monday_open: schedule?.monday_open || "",
  monday_close: schedule?.monday_close || "",
  tuesday_open: schedule?.tuesday_open || "",
  tuesday_close: schedule?.tuesday_close || "",
  wednesday_open: schedule?.wednesday_open || "",
  wednesday_close: schedule?.wednesday_close || "",
  thursday_open: schedule?.thursday_open || "",
  thursday_close: schedule?.thursday_close || "",
  friday_open: schedule?.friday_open || "",
  friday_close: schedule?.friday_close || "",
  saturday_open: schedule?.saturday_open || "",
  saturday_close: schedule?.saturday_close || "",
  sunday_open: schedule?.sunday_open || "",
  sunday_close: schedule?.sunday_close || "",
});

const getAdminsArray = (store) =>
  [
    store.admin1,
    store.admin2,
    store.admin3,
    store.admin4,
    store.admin5,
    store.admin6,
    store.admin7,
    store.admin8,
    store.admin9,
    store.admin10,
  ].map((value) => value || "");

const isImageUrl = (url = "") =>
  /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(url);

const isPdfUrl = (url = "") => /\.pdf(\?.*)?$/i.test(url);

const formatDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function MediaPreviewCard({
  title,
  url,
  field,
  fileAccept,
  type = "image",
  tall = false,
  uploading = false,
  deleting = false,
  onUrlChange,
  onUpload,
  onDelete,
}) {
  return (
    <div className="stores-detail-field full">
      <label>{title}</label>

      <div className={`stores-media-card ${tall ? "tall" : ""}`}>
        {url ? (
          <>
            {type === "image" ? (
              <div className={`stores-media-preview ${tall ? "banner" : "logo"}`}>
                <img src={url} alt={title} />
              </div>
            ) : isPdfUrl(url) ? (
              <div className="stores-doc-preview">
                <div className="stores-doc-icon">
                  <i className="bx bxs-file-pdf"></i>
                </div>
                <div className="stores-doc-meta">
                  <div className="stores-doc-title">{title}</div>
                  <div className="stores-doc-sub">PDF document attached</div>
                </div>
              </div>
            ) : isImageUrl(url) ? (
              <div className="stores-media-preview document-image">
                <img src={url} alt={title} />
              </div>
            ) : (
              <div className="stores-doc-preview">
                <div className="stores-doc-icon">
                  <i className="bx bx-file"></i>
                </div>
                <div className="stores-doc-meta">
                  <div className="stores-doc-title">{title}</div>
                  <div className="stores-doc-sub">Open external file</div>
                </div>
              </div>
            )}

            <div className="stores-media-actions">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="stores-open-link-btn"
              >
                Open File
              </a>

              <button
                type="button"
                className="stores-delete-link-btn"
                onClick={() => onDelete(field)}
                disabled={deleting || uploading}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </>
        ) : (
          <div className="stores-media-empty">
            <i className="bx bx-image-alt"></i>
            <span>No file attached</span>
          </div>
        )}
      </div>

      <input
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder={`Enter ${title.toLowerCase()} URL`}
      />

      <div className="stores-upload-row">
        <label className={`stores-upload-btn ${uploading ? "disabled" : ""}`}>
          {uploading ? "Uploading..." : `Upload ${title}`}
          <input
            type="file"
            accept={fileAccept}
            disabled={uploading || deleting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(field, file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeForm, setStoreForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [deletingField, setDeletingField] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [localPreviews, setLocalPreviews] = useState({
    logo_url: "",
    banner_url: "",
    compliance_url: "",
    poa_url: "",
    proof_of_residence_url: "",
  });

  const API_URL = import.meta.env.VITE_API_URL || "";

  const clearLocalPreviews = () => {
    setLocalPreviews((prev) => {
      Object.values(prev).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });

      return {
        logo_url: "",
        banner_url: "",
        compliance_url: "",
        poa_url: "",
        proof_of_residence_url: "",
      };
    });
  };

  const clearSingleLocalPreview = (field) => {
    setLocalPreviews((prev) => {
      if (prev[field]) {
        URL.revokeObjectURL(prev[field]);
      }
      return {
        ...prev,
        [field]: "",
      };
    });
  };

  const setLocalPreview = (field, file) => {
    if (!file || !file.type?.startsWith("image/")) return;

    const previewUrl = URL.createObjectURL(file);

    setLocalPreviews((prev) => {
      if (prev[field]) {
        URL.revokeObjectURL(prev[field]);
      }

      return {
        ...prev,
        [field]: previewUrl,
      };
    });
  };

  useEffect(() => {
    let mounted = true;

    const loadStores = async () => {
      try {
        const data = await adminFetch("/api/admin/stores");
        if (!mounted) return;
        setStores(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Stores load failed:", error);
        if (mounted) {
          setMessage(error.message || "Failed to load stores.");
          setMessageType("error");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStores();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      clearLocalPreviews();
    };
  }, []);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = !q
        ? [...stores]
        : stores.filter((store) => {
            return (
            String(store.id ?? "").toLowerCase().includes(q) ||
            String(store.store_name || "").toLowerCase().includes(q) ||
            String(store.store_owner || "").toLowerCase().includes(q) ||
            String(store.email || "").toLowerCase().includes(q) ||
            String(store.city || "").toLowerCase().includes(q) ||
            String(store.province || "").toLowerCase().includes(q) ||
            String(store.onboarding_status || "").toLowerCase().includes(q)
            );
        });

    return base.sort((a, b) => Number(a.id) - Number(b.id));
  }, [stores, search]);

  const openStore = (store) => {
    clearLocalPreviews();
    setSelectedStore(store);
    setStoreForm({
      store_name: store.store_name || "",
      store_owner: store.store_owner || "",
      cell_number: store.cell_number || "",
      secondary_number: store.secondary_number || "",
      email: store.email || "",
      country: store.country || "",
      province: store.province || "",
      description: store.description || "",
      bank_name: store.bank_name || "",
      account_holder: store.account_holder || "",
      account_number: store.account_number || "",
      account_type: store.account_type || "",
      banner_url: store.banner_url || "",
      logo_url: store.logo_url || "",
      compliance_url: store.compliance_url || "",
      poa_url: store.poa_url || "",
      is_open: !!store.is_open,
      branch_code: store.branch_code || "",
      street: store.street || "",
      suburb: store.suburb || "",
      city: store.city || "",
      postal_code: store.postal_code || "",
      proof_of_residence_url: store.proof_of_residence_url || "",
      subaccount_code: store.subaccount_code || "",
      recipient_code: store.recipient_code || "",
      subaccount_verified: !!store.subaccount_verified,
      delivers_nationwide: !!store.delivers_nationwide,
      nationwide_fee: store.nationwide_fee ?? "",
      nationwide_estimated_time: store.nationwide_estimated_time || "",
      verification_attempts: store.verification_attempts ?? 0,
      last_verified_at: formatDateTimeLocal(store.last_verified_at),
      onboarding_status: store.onboarding_status || "pending",
      admins: getAdminsArray(store),
      schedule: makeSchedule(store.schedule),
    });
  };

  const closeStore = () => {
    clearLocalPreviews();
    setSelectedStore(null);
    setStoreForm(null);
    setUploadingField("");
    setDeletingField("");
  };

  const handleAdminChange = (index, value) => {
    setStoreForm((prev) => {
      const nextAdmins = [...prev.admins];
      nextAdmins[index] = value;
      return { ...prev, admins: nextAdmins };
    });
  };

  const handleScheduleChange = (field, value) => {
    setStoreForm((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value,
      },
    }));
  };

  const syncStoreFieldEverywhere = (field, value) => {
    setStoreForm((prev) => ({ ...prev, [field]: value }));

    setSelectedStore((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });

    setStores((prev) =>
      prev.map((store) =>
        store.id === selectedStore?.id ? { ...store, [field]: value } : store
      )
    );
  };

  const handleFileUpload = async (field, file) => {
    if (!selectedStore?.id || !file) return;

    try {
      setUploadingField(field);
      setMessage("");

      setLocalPreview(field, file);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", field);

      const response = await fetch(
        `${API_URL}/api/admin/stores/${selectedStore.id}/upload`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      syncStoreFieldEverywhere(field, data.url);
      clearSingleLocalPreview(field);

      setMessage(`${field.replaceAll("_", " ")} uploaded successfully.`);
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Upload failed.");
      setMessageType("error");
    } finally {
      setUploadingField("");
    }
  };

  const handleDeleteFile = async (field) => {
    if (!selectedStore?.id || !storeForm?.[field]) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this file? This will remove it from cloud storage and clear it from the database."
    );

    if (!confirmed) return;

    try {
      setDeletingField(field);
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/admin/stores/${selectedStore.id}/file`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ field }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      clearSingleLocalPreview(field);
      syncStoreFieldEverywhere(field, "");

      setMessage(`${field.replaceAll("_", " ")} deleted successfully.`);
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Delete failed.");
      setMessageType("error");
    } finally {
      setDeletingField("");
    }
  };

  const handleSave = async () => {
    if (!selectedStore || !storeForm) return;

    try {
      setSaving(true);
      setMessage("");

      await adminFetch(`/api/admin/stores/${selectedStore.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          store_name: storeForm.store_name,
          store_owner: storeForm.store_owner,
          cell_number: storeForm.cell_number,
          secondary_number: storeForm.secondary_number,
          email: storeForm.email,
          country: storeForm.country,
          province: storeForm.province,
          description: storeForm.description,
          bank_name: storeForm.bank_name,
          account_holder: storeForm.account_holder,
          account_number: storeForm.account_number,
          account_type: storeForm.account_type,
          banner_url: storeForm.banner_url,
          logo_url: storeForm.logo_url,
          compliance_url: storeForm.compliance_url,
          poa_url: storeForm.poa_url,
          is_open: storeForm.is_open,
          admin1: storeForm.admins[0],
          admin2: storeForm.admins[1],
          admin3: storeForm.admins[2],
          admin4: storeForm.admins[3],
          admin5: storeForm.admins[4],
          admin6: storeForm.admins[5],
          admin7: storeForm.admins[6],
          admin8: storeForm.admins[7],
          admin9: storeForm.admins[8],
          admin10: storeForm.admins[9],
          branch_code: storeForm.branch_code,
          street: storeForm.street,
          suburb: storeForm.suburb,
          city: storeForm.city,
          postal_code: storeForm.postal_code,
          proof_of_residence_url: storeForm.proof_of_residence_url,
          subaccount_code: storeForm.subaccount_code,
          recipient_code: storeForm.recipient_code,
          subaccount_verified: storeForm.subaccount_verified,
          delivers_nationwide: storeForm.delivers_nationwide,
          nationwide_fee: storeForm.nationwide_fee,
          nationwide_estimated_time: storeForm.nationwide_estimated_time,
          verification_attempts: storeForm.verification_attempts,
          last_verified_at: storeForm.last_verified_at,
          onboarding_status: storeForm.onboarding_status,
          schedule: storeForm.schedule,
        }),
      });

      const updatedStore = {
        ...selectedStore,
        ...storeForm,
        admin1: storeForm.admins[0],
        admin2: storeForm.admins[1],
        admin3: storeForm.admins[2],
        admin4: storeForm.admins[3],
        admin5: storeForm.admins[4],
        admin6: storeForm.admins[5],
        admin7: storeForm.admins[6],
        admin8: storeForm.admins[7],
        admin9: storeForm.admins[8],
        admin10: storeForm.admins[9],
        schedule: storeForm.schedule,
      };

      setStores((prev) =>
        prev.map((store) => (store.id === selectedStore.id ? updatedStore : store))
      );
      setSelectedStore(updatedStore);

      setMessage("Store updated successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to update store.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading stores...</div>;
  }

  return (
    <div className="stores-page">
      <div className="stores-header-row">
        <div>
          <h2>Store Management</h2>
          <p>View and edit marketplace stores.</p>
        </div>

        <input
          className="stores-search"
          type="text"
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {message ? (
        <div className={`stores-message ${messageType}`}>{message}</div>
      ) : null}

      <div className="stores-table-card">
        <div className="stores-table-wrap">
          <table className="stores-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Store</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Onboarding</th>
                <th>Subaccount</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredStores.map((store) => (
                <tr key={store.id}>
                  <td className="stores-id-cell">#{store.id}</td>

                  <td>
                    <div className="stores-store-cell">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.store_name || "Store"}
                          className="stores-store-logo"
                        />
                      ) : (
                        <div className="stores-store-logo placeholder">
                          <i className="bx bx-store"></i>
                        </div>
                      )}

                      <div>
                        <div className="stores-store-name">{store.store_name || "-"}</div>
                        <div className="stores-store-sub">
                          {[store.city, store.province].filter(Boolean).join(", ") || "-"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>{store.store_owner || "-"}</td>

                  <td>
                    <span className={`stores-badge ${store.is_open ? "open" : "closed"}`}>
                      {store.is_open ? "Open" : "Closed"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`stores-badge onboarding ${String(
                        store.onboarding_status || ""
                      ).toLowerCase()}`}
                    >
                      {store.onboarding_status || "-"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`stores-badge ${
                        store.subaccount_verified ? "verified" : "unverified"
                      }`}
                    >
                      {store.subaccount_verified ? "Verified" : "Unverified"}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="stores-action-btn"
                      onClick={() => openStore(store)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}

              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan="7" className="stores-empty">
                    No stores found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStore && storeForm ? (
        <div className="stores-modal-overlay" onClick={closeStore}>
          <div className="stores-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stores-modal-header">
              <div>
                <h3>{selectedStore.store_name || "Store Details"}</h3>
                <p>Edit store profile, contacts, admins, payout and schedule.</p>
              </div>

              <button className="stores-modal-close" onClick={closeStore}>
                ×
              </button>
            </div>

            <div className="stores-section-card">
              <h4>Store Media</h4>
              <div className="stores-media-grid">
                <MediaPreviewCard
                  title="Store Logo"
                  url={localPreviews.logo_url || storeForm.logo_url}
                  field="logo_url"
                  type="image"
                  fileAccept="image/*"
                  uploading={uploadingField === "logo_url"}
                  deleting={deletingField === "logo_url"}
                  onUrlChange={(value) =>
                    setStoreForm((prev) => ({ ...prev, logo_url: value }))
                  }
                  onUpload={handleFileUpload}
                  onDelete={handleDeleteFile}
                />

                <MediaPreviewCard
                  title="Store Banner"
                  url={localPreviews.banner_url || storeForm.banner_url}
                  field="banner_url"
                  type="image"
                  tall
                  fileAccept="image/*"
                  uploading={uploadingField === "banner_url"}
                  deleting={deletingField === "banner_url"}
                  onUrlChange={(value) =>
                    setStoreForm((prev) => ({ ...prev, banner_url: value }))
                  }
                  onUpload={handleFileUpload}
                  onDelete={handleDeleteFile}
                />
              </div>
            </div>

            <div className="stores-modal-grid">
              <div className="stores-detail-field">
                <label>Store Name</label>
                <input
                  value={storeForm.store_name}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, store_name: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Store Owner</label>
                <input
                  value={storeForm.store_owner}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, store_owner: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Email</label>
                <input
                  value={storeForm.email}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Cell Number</label>
                <input
                  value={storeForm.cell_number}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, cell_number: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Secondary Number</label>
                <input
                  value={storeForm.secondary_number}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, secondary_number: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Country</label>
                <input
                  value={storeForm.country}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, country: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Province</label>
                <input
                  value={storeForm.province}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, province: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>City</label>
                <input
                  value={storeForm.city}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Street</label>
                <input
                  value={storeForm.street}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, street: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Suburb</label>
                <input
                  value={storeForm.suburb}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, suburb: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Postal Code</label>
                <input
                  value={storeForm.postal_code}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, postal_code: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Onboarding Status</label>
                <select
                  value={storeForm.onboarding_status}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, onboarding_status: e.target.value }))
                  }
                >
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>

              <div className="stores-detail-field">
                <label>Store Status</label>
                <select
                  value={String(storeForm.is_open)}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      is_open: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">Open</option>
                  <option value="false">Closed</option>
                </select>
              </div>

              <div className="stores-detail-field">
                <label>Subaccount Verified</label>
                <select
                  value={String(storeForm.subaccount_verified)}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      subaccount_verified: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>

              <div className="stores-detail-field">
                <label>Delivers Nationwide</label>
                <select
                  value={String(storeForm.delivers_nationwide)}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      delivers_nationwide: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="stores-detail-field">
                <label>Nationwide Fee</label>
                <input
                  value={storeForm.nationwide_fee}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      nationwide_fee: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Estimated Time</label>
                <input
                  value={storeForm.nationwide_estimated_time}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      nationwide_estimated_time: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Bank Name</label>
                <input
                  value={storeForm.bank_name}
                  onChange={(e) =>
                    setStoreForm((prev) => ({ ...prev, bank_name: e.target.value }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Account Holder</label>
                <input
                  value={storeForm.account_holder}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      account_holder: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Account Number</label>
                <input
                  value={storeForm.account_number}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      account_number: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Account Type</label>
                <input
                  value={storeForm.account_type}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      account_type: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Branch Code</label>
                <input
                  value={storeForm.branch_code}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      branch_code: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Subaccount Code</label>
                <input
                  value={storeForm.subaccount_code}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      subaccount_code: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Recipient Code</label>
                <input
                  value={storeForm.recipient_code}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      recipient_code: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Verification Attempts</label>
                <input
                  type="number"
                  value={storeForm.verification_attempts}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      verification_attempts: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field">
                <label>Last Verified At</label>
                <input
                  type="datetime-local"
                  value={storeForm.last_verified_at}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      last_verified_at: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="stores-detail-field full">
                <label>Description</label>
                <textarea
                  value={storeForm.description}
                  onChange={(e) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="stores-section-card">
              <h4>Store Documents</h4>
              <div className="stores-media-grid">
                <MediaPreviewCard
                  title="Compliance File"
                  url={localPreviews.compliance_url || storeForm.compliance_url}
                  field="compliance_url"
                  type="document"
                  fileAccept=".pdf,image/*"
                  uploading={uploadingField === "compliance_url"}
                  deleting={deletingField === "compliance_url"}
                  onUrlChange={(value) =>
                    setStoreForm((prev) => ({ ...prev, compliance_url: value }))
                  }
                  onUpload={handleFileUpload}
                  onDelete={handleDeleteFile}
                />

                <MediaPreviewCard
                  title="POA File"
                  url={localPreviews.poa_url || storeForm.poa_url}
                  field="poa_url"
                  type="document"
                  fileAccept=".pdf,image/*"
                  uploading={uploadingField === "poa_url"}
                  deleting={deletingField === "poa_url"}
                  onUrlChange={(value) =>
                    setStoreForm((prev) => ({ ...prev, poa_url: value }))
                  }
                  onUpload={handleFileUpload}
                  onDelete={handleDeleteFile}
                />

                <MediaPreviewCard
                  title="Proof of Residence File"
                  url={
                    localPreviews.proof_of_residence_url ||
                    storeForm.proof_of_residence_url
                  }
                  field="proof_of_residence_url"
                  type="document"
                  fileAccept=".pdf,image/*"
                  uploading={uploadingField === "proof_of_residence_url"}
                  deleting={deletingField === "proof_of_residence_url"}
                  onUrlChange={(value) =>
                    setStoreForm((prev) => ({
                      ...prev,
                      proof_of_residence_url: value,
                    }))
                  }
                  onUpload={handleFileUpload}
                  onDelete={handleDeleteFile}
                />
              </div>
            </div>

            <div className="stores-section-card">
              <h4>Store Admins</h4>
              <div className="stores-admins-grid">
                {storeForm.admins.map((adminValue, index) => (
                  <div className="stores-detail-field" key={index}>
                    <label>{`Admin ${index + 1}`}</label>
                    <input
                      value={adminValue}
                      onChange={(e) => handleAdminChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="stores-section-card">
              <h4>Store Schedule</h4>
              <div className="stores-schedule-grid editable">
                {[
                  ["Monday", "monday_open", "monday_close"],
                  ["Tuesday", "tuesday_open", "tuesday_close"],
                  ["Wednesday", "wednesday_open", "wednesday_close"],
                  ["Thursday", "thursday_open", "thursday_close"],
                  ["Friday", "friday_open", "friday_close"],
                  ["Saturday", "saturday_open", "saturday_close"],
                  ["Sunday", "sunday_open", "sunday_close"],
                ].map(([day, openKey, closeKey]) => (
                  <div className="stores-schedule-row" key={day}>
                    <div className="stores-schedule-day">{day}</div>
                    <input
                      type="time"
                      value={storeForm.schedule[openKey]}
                      onChange={(e) => handleScheduleChange(openKey, e.target.value)}
                    />
                    <input
                      type="time"
                      value={storeForm.schedule[closeKey]}
                      onChange={(e) => handleScheduleChange(closeKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="stores-modal-footer">
              <button
                type="button"
                className="stores-modal-secondary-btn"
                onClick={closeStore}
              >
                Cancel
              </button>

              <button
                type="button"
                className="stores-modal-save-btn"
                onClick={handleSave}
                disabled={saving || Boolean(uploadingField) || Boolean(deletingField)}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}