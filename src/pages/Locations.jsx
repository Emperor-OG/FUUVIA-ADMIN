import React, { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../services/api";
import "../styles/locations.css";

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [search, setSearch] = useState("");
  const [expandedProvinces, setExpandedProvinces] = useState({});
  const [savingProvinceId, setSavingProvinceId] = useState(null);
  const [deletingCityId, setDeletingCityId] = useState(null);

  const [newCityForms, setNewCityForms] = useState({});
  const [editingCityId, setEditingCityId] = useState(null);
  const [editingCityName, setEditingCityName] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadLocations() {
      try {
        setLoading(true);
        const data = await adminFetch("/api/admin/locations");
        if (!mounted) return;
        setLocations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Locations fetch failed:", error);
        if (mounted) {
          setMessage(error.message || "Failed to load locations.");
          setMessageType("error");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadLocations();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return locations;

    return locations
      .map((province) => {
        const provinceMatch =
          String(province.id).toLowerCase().includes(q) ||
          String(province.name || "").toLowerCase().includes(q);

        const matchedCities = (province.cities || []).filter((city) => {
          return (
            String(city.id).toLowerCase().includes(q) ||
            String(city.name || "").toLowerCase().includes(q)
          );
        });

        if (provinceMatch) {
          return province;
        }

        if (matchedCities.length > 0) {
          return {
            ...province,
            cities: matchedCities,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [locations, search]);

  function toggleProvince(provinceId) {
    setExpandedProvinces((prev) => ({
      ...prev,
      [provinceId]: !prev[provinceId],
    }));
  }

  function updateNewCityValue(provinceId, value) {
    setNewCityForms((prev) => ({
      ...prev,
      [provinceId]: value,
    }));
  }

  async function handleAddCity(provinceId) {
    const name = (newCityForms[provinceId] || "").trim();
    if (!name) return;

    try {
      setSavingProvinceId(provinceId);
      setMessage("");

      const city = await adminFetch("/api/admin/locations/cities", {
        method: "POST",
        body: JSON.stringify({
          province_id: provinceId,
          name,
        }),
      });

      setLocations((prev) =>
        prev.map((province) =>
          province.id === provinceId
            ? {
                ...province,
                cities: [...(province.cities || []), city].sort(
                  (a, b) => Number(a.id) - Number(b.id)
                ),
              }
            : province
        )
      );

      setExpandedProvinces((prev) => ({
        ...prev,
        [provinceId]: true,
      }));

      setNewCityForms((prev) => ({
        ...prev,
        [provinceId]: "",
      }));

      setMessage("City added successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to add city.");
      setMessageType("error");
    } finally {
      setSavingProvinceId(null);
    }
  }

  function startEditingCity(city) {
    setEditingCityId(city.id);
    setEditingCityName(city.name || "");
  }

  function cancelEditingCity() {
    setEditingCityId(null);
    setEditingCityName("");
  }

  async function handleSaveCity(cityId) {
    const name = editingCityName.trim();
    if (!name) return;

    try {
      setMessage("");

      const updatedCity = await adminFetch(`/api/admin/locations/cities/${cityId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });

      setLocations((prev) =>
        prev.map((province) => ({
          ...province,
          cities: (province.cities || []).map((city) =>
            city.id === cityId ? updatedCity : city
          ),
        }))
      );

      setEditingCityId(null);
      setEditingCityName("");
      setMessage("City updated successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to update city.");
      setMessageType("error");
    }
  }

  async function handleDeleteCity(cityId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this city from the list?"
    );
    if (!confirmed) return;

    try {
      setDeletingCityId(cityId);
      setMessage("");

      await adminFetch(`/api/admin/locations/cities/${cityId}`, {
        method: "DELETE",
      });

      setLocations((prev) =>
        prev.map((province) => ({
          ...province,
          cities: (province.cities || []).filter((city) => city.id !== cityId),
        }))
      );

      if (editingCityId === cityId) {
        cancelEditingCity();
      }

      setMessage("City deleted successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to delete city.");
      setMessageType("error");
    } finally {
      setDeletingCityId(null);
    }
  }

  return (
    <div className="locations-page">
      <div className="locations-header">
        <div>
          <h1>Locations</h1>
          <p>View saved provinces and manage the cities available under each one.</p>
        </div>

        <input
          className="locations-search"
          type="text"
          placeholder="Search provinces or cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {message ? (
        <div className={`locations-message ${messageType}`}>{message}</div>
      ) : null}

      <section className="locations-section">
        <div className="locations-section-head">
          <h2>Provinces</h2>
          <span className="locations-total-count">
            Total: {filteredLocations.length}
          </span>
        </div>

        {loading ? (
          <div className="locations-empty-card">Loading locations...</div>
        ) : filteredLocations.length === 0 ? (
          <div className="locations-empty-card">No provinces or cities found.</div>
        ) : (
          <div className="locations-list">
            {filteredLocations.map((province) => {
              const isOpen = expandedProvinces[province.id] ?? true;
              const cities = Array.isArray(province.cities) ? province.cities : [];

              return (
                <div className="province-card" key={province.id}>
                  <div className="province-card-head">
                    <button
                      type="button"
                      className="province-expand-btn"
                      onClick={() => toggleProvince(province.id)}
                    >
                      <span className={`province-chevron ${isOpen ? "open" : ""}`}>
                        ▾
                      </span>
                      <span className="province-title-wrap">
                        <span className="province-title">
                          #{province.id} — {province.name}
                        </span>
                        <span className="province-subtitle">
                          Cities: {cities.length}
                        </span>
                      </span>
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="province-body">
                      <div className="city-add-row">
                        <input
                          type="text"
                          placeholder={`Add city to ${province.name}`}
                          value={newCityForms[province.id] || ""}
                          onChange={(e) =>
                            updateNewCityValue(province.id, e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="locations-btn locations-btn-primary"
                          onClick={() => handleAddCity(province.id)}
                          disabled={savingProvinceId === province.id}
                        >
                          {savingProvinceId === province.id ? "Adding..." : "Add City"}
                        </button>
                      </div>

                      {cities.length === 0 ? (
                        <div className="locations-empty-inner">
                          No cities saved for this province.
                        </div>
                      ) : (
                        <div className="cities-table-wrap">
                          <table className="cities-table">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>City</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cities.map((city) => {
                                const isEditing = editingCityId === city.id;

                                return (
                                  <tr key={city.id}>
                                    <td>#{city.id}</td>
                                    <td>
                                      {isEditing ? (
                                        <input
                                          className="city-inline-input"
                                          value={editingCityName}
                                          onChange={(e) =>
                                            setEditingCityName(e.target.value)
                                          }
                                        />
                                      ) : (
                                        city.name
                                      )}
                                    </td>
                                    <td>
                                      <div className="city-actions">
                                        {isEditing ? (
                                          <>
                                            <button
                                              type="button"
                                              className="locations-btn locations-btn-primary"
                                              onClick={() => handleSaveCity(city.id)}
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              className="locations-btn locations-btn-secondary"
                                              onClick={cancelEditingCity}
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              className="locations-btn locations-btn-secondary"
                                              onClick={() => startEditingCity(city)}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              type="button"
                                              className="locations-btn locations-btn-danger"
                                              onClick={() => handleDeleteCity(city.id)}
                                              disabled={deletingCityId === city.id}
                                            >
                                              {deletingCityId === city.id
                                                ? "Deleting..."
                                                : "Delete"}
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}