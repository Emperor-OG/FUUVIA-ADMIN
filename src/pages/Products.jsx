import React, { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../services/api";
import "../styles/products.css";

function formatCurrency(value) {
  const num = Number(value || 0);
  return `R${num.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toInputValue(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [storeId, setStoreId] = useState("");
  const [appliedStoreId, setAppliedStoreId] = useState("");
  const [category, setCategory] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState(null);
  const [selectedProductLoading, setSelectedProductLoading] = useState(false);
  const [selectedProductError, setSelectedProductError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingVariantId, setUploadingVariantId] = useState(null);
  const [variantPreviewUrls, setVariantPreviewUrls] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || "";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedSearch) params.set("search", appliedSearch);
    if (appliedStoreId) params.set("store_id", appliedStoreId);
    if (appliedCategory) params.set("category", appliedCategory);
    params.set("page", pagination.page);
    params.set("limit", pagination.limit);
    return params.toString();
  }, [
    appliedSearch,
    appliedStoreId,
    appliedCategory,
    pagination.page,
    pagination.limit,
  ]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const data = await adminFetch(`/api/admin/products?${queryString}`);

      setProducts(Array.isArray(data?.data) ? data.data : []);
      setPagination((prev) => ({
        ...prev,
        ...(data?.pagination || {}),
      }));
    } catch (error) {
      console.error("Products fetch failed:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function buildEditableForm(product) {
    return {
      id: product.id,
      store_id: product.store_id,
      name: toInputValue(product.name),
      description: toInputValue(product.description),
      category: toInputValue(product.category),
      stock: toInputValue(product.stock, ""),
      created_at: product.created_at,
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => ({
            id: variant.id,
            product_id: variant.product_id,
            name: toInputValue(variant.name),
            seller_price: toInputValue(variant.seller_price, "0"),
            stock: toInputValue(variant.stock, "0"),
            image_url: toInputValue(variant.image_url),
            markup_percent: toInputValue(variant.markup_percent, "0"),
            markup_price: toInputValue(variant.markup_price, "0"),
            created_at: variant.created_at,
            skus: Array.isArray(variant.skus)
              ? variant.skus.map((sku) => ({
                  id: sku.id,
                  variant_id: sku.variant_id,
                  size: toInputValue(sku.size),
                  stock: toInputValue(sku.stock, "0"),
                }))
              : [],
          }))
        : [],
    };
  }

  async function openProduct(productId) {
    try {
      setSelectedProduct(null);
      setProductForm(null);
      setSelectedProductError("");
      setSelectedProductLoading(true);

      const data = await adminFetch(`/api/admin/products/${productId}`);
      setSelectedProduct(data || null);
      setProductForm(data ? buildEditableForm(data) : null);
    } catch (error) {
      console.error("Product load failed:", error);
      setSelectedProductError(error.message || "Failed to load product.");
    } finally {
      setSelectedProductLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, [queryString]);

  useEffect(() => {
    return () => {
      Object.values(variantPreviewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [variantPreviewUrls]);

  function applyFilters(e) {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedSearch(search);
    setAppliedStoreId(storeId);
    setAppliedCategory(category);
  }

  function resetFilters() {
    setSearch("");
    setStoreId("");
    setCategory("");
    setAppliedSearch("");
    setAppliedStoreId("");
    setAppliedCategory("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function goToPage(page) {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  }

  function toggleProduct(productId) {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  }

  function updateProductField(field, value) {
    setProductForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateVariantField(variantIndex, field, value) {
    setProductForm((prev) => {
      const nextVariants = [...prev.variants];
      nextVariants[variantIndex] = {
        ...nextVariants[variantIndex],
        [field]: value,
      };
      return {
        ...prev,
        variants: nextVariants,
      };
    });
  }

  function updateSkuField(variantIndex, skuIndex, field, value) {
    setProductForm((prev) => {
      const nextVariants = [...prev.variants];
      const nextSkus = [...nextVariants[variantIndex].skus];
      nextSkus[skuIndex] = {
        ...nextSkus[skuIndex],
        [field]: value,
      };
      nextVariants[variantIndex] = {
        ...nextVariants[variantIndex],
        skus: nextSkus,
      };
      return {
        ...prev,
        variants: nextVariants,
      };
    });
  }

  function setVariantPreview(variantId, file) {
    if (!file || !file.type?.startsWith("image/")) return;

    const previewUrl = URL.createObjectURL(file);

    setVariantPreviewUrls((prev) => {
      if (prev[variantId]) {
        URL.revokeObjectURL(prev[variantId]);
      }
      return {
        ...prev,
        [variantId]: previewUrl,
      };
    });
  }

  function clearVariantPreview(variantId) {
    setVariantPreviewUrls((prev) => {
      if (prev[variantId]) {
        URL.revokeObjectURL(prev[variantId]);
      }
      return {
        ...prev,
        [variantId]: "",
      };
    });
  }

  async function handleVariantImageUpload(variantId, file) {
    if (!productForm?.id || !variantId || !file) return;

    try {
      setUploadingVariantId(variantId);
      setSelectedProductError("");

      setVariantPreview(variantId, file);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/admin/products/${productForm.id}/variants/${variantId}/upload-image`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload variant image");
      }

      setProductForm((prev) => ({
        ...prev,
        variants: prev.variants.map((variant) =>
          variant.id === variantId
            ? { ...variant, image_url: data.image_url }
            : variant
        ),
      }));

      setSelectedProduct((prev) =>
        prev
          ? {
              ...prev,
              variants: prev.variants.map((variant) =>
                variant.id === variantId
                  ? { ...variant, image_url: data.image_url }
                  : variant
              ),
            }
          : prev
      );

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productForm.id
            ? {
                ...product,
                variants: product.variants.map((variant) =>
                  variant.id === variantId
                    ? { ...variant, image_url: data.image_url }
                    : variant
                ),
              }
            : product
        )
      );

      clearVariantPreview(variantId);
    } catch (error) {
      console.error("Variant image upload failed:", error);
      setSelectedProductError(error.message || "Failed to upload variant image.");
    } finally {
      setUploadingVariantId(null);
    }
  }

  async function handleSave() {
    if (!productForm?.id) return;

    try {
      setSaving(true);
      setSelectedProductError("");

      const payload = {
        name: productForm.name,
        description: productForm.description,
        category: productForm.category,
        stock: productForm.stock === "" ? null : Number(productForm.stock),
        variants: productForm.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          seller_price:
            variant.seller_price === "" ? 0 : Number(variant.seller_price),
          stock: variant.stock === "" ? 0 : Number(variant.stock),
          image_url: variant.image_url,
          markup_percent:
            variant.markup_percent === "" ? 0 : Number(variant.markup_percent),
          markup_price:
            variant.markup_price === "" ? 0 : Number(variant.markup_price),
          skus: variant.skus.map((sku) => ({
            id: sku.id,
            size: sku.size,
            stock: sku.stock === "" ? 0 : Number(sku.stock),
          })),
        })),
      };

      const updated = await adminFetch(`/api/admin/products/${productForm.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const nextSelected = updated || {
        ...selectedProduct,
        ...payload,
      };

      setSelectedProduct(nextSelected);
      setProductForm(buildEditableForm(nextSelected));

      setProducts((prev) =>
        prev.map((product) =>
          product.id === nextSelected.id
            ? {
                ...product,
                name: nextSelected.name,
                description: nextSelected.description,
                category: nextSelected.category,
                stock: nextSelected.stock,
                variants: nextSelected.variants || product.variants,
              }
            : product
        )
      );
    } catch (error) {
      console.error("Product save failed:", error);
      setSelectedProductError(error.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  const closeModal = () => {
    Object.keys(variantPreviewUrls).forEach((variantId) =>
      clearVariantPreview(Number(variantId))
    );
    setSelectedProduct(null);
    setProductForm(null);
    setSelectedProductError("");
    setSelectedProductLoading(false);
    setSaving(false);
    setUploadingVariantId(null);
  };

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p>View all products, variants and SKUs across the marketplace.</p>
        </div>
      </div>

      <section className="products-section">
        <div className="products-section-head">
          <h2>Filters</h2>
        </div>

        <form className="products-filters" onSubmit={applyFilters}>
          <input
            type="text"
            placeholder="Search by product, variant, sku, store or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="number"
            placeholder="Store ID"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          />

          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <div className="products-filter-actions">
            <button type="submit" className="products-btn products-btn-primary">
              Apply
            </button>
            <button
              type="button"
              className="products-btn products-btn-secondary"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="products-section">
        <div className="products-section-head">
          <h2>All Products</h2>
          <span className="products-total-count">
            Total: {pagination.total || 0}
          </span>
        </div>

        <div className="products-list">
          {loading ? (
            <div className="products-empty-card">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="products-empty-card">No products found.</div>
          ) : (
            products.map((product) => {
              const isOpen = !!expandedProducts[product.id];
              const variants = Array.isArray(product.variants) ? product.variants : [];

              return (
                <div className="product-card" key={product.id}>
                  <div className="product-card-head">
                    <button
                      type="button"
                      className="product-expand-btn"
                      onClick={() => toggleProduct(product.id)}
                    >
                      <span className={`product-chevron ${isOpen ? "open" : ""}`}>
                        ▾
                      </span>
                      <span className="product-title-wrap">
                        <span className="product-title">
                          #{product.id} — {product.name || "Unnamed Product"}
                        </span>
                        <span className="product-subtitle">
                          Store #{product.store_id} · {product.category || "No category"} ·
                          Variants: {variants.length}
                        </span>
                      </span>
                    </button>

                    <div className="product-head-actions">
                      <span className="product-stock-pill">
                        Stock: {product.stock ?? "—"}
                      </span>
                      <button
                        type="button"
                        className="products-btn products-btn-primary"
                        onClick={() => openProduct(product.id)}
                      >
                        View
                      </button>
                    </div>
                  </div>

                  <div className="product-summary-grid">
                    <div className="product-summary-item">
                      <span>ID</span>
                      <strong>#{product.id}</strong>
                    </div>
                    <div className="product-summary-item">
                      <span>Store ID</span>
                      <strong>{product.store_id}</strong>
                    </div>
                    <div className="product-summary-item">
                      <span>Category</span>
                      <strong>{product.category || "—"}</strong>
                    </div>
                    <div className="product-summary-item">
                      <span>Created</span>
                      <strong>{formatDate(product.created_at)}</strong>
                    </div>
                  </div>

                  {product.description ? (
                    <div className="product-description">{product.description}</div>
                  ) : null}

                  {isOpen ? (
                    <div className="product-variants-block">
                      {variants.length === 0 ? (
                        <div className="product-empty-inner">No variants found.</div>
                      ) : (
                        variants.map((variant) => (
                          <div className="variant-card" key={variant.id}>
                            <div className="variant-card-head">
                              <div>
                                <div className="variant-title">
                                  Variant #{variant.id} — {variant.name || "Unnamed Variant"}
                                </div>
                                <div className="variant-subtitle">
                                  Seller Price: {formatCurrency(variant.seller_price)} ·
                                  Markup: {Number(variant.markup_percent || 0)}% ·
                                  Final: {formatCurrency(variant.markup_price)}
                                </div>
                              </div>

                              <div className="variant-meta-pills">
                                <span className="variant-pill">
                                  Stock: {variant.stock ?? 0}
                                </span>
                                <span className="variant-pill">
                                  SKUs: {Array.isArray(variant.skus) ? variant.skus.length : 0}
                                </span>
                              </div>
                            </div>

                            {variant.image_url ? (
                              <div className="variant-image-wrap">
                                <img
                                  src={variant.image_url}
                                  alt={variant.name || "Variant"}
                                  className="variant-image"
                                />
                              </div>
                            ) : null}

                            <div className="sku-table-wrap">
                              <table className="sku-table">
                                <thead>
                                  <tr>
                                    <th>SKU ID</th>
                                    <th>Size</th>
                                    <th>Stock</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variant.skus?.length ? (
                                    variant.skus.map((sku) => (
                                      <tr key={sku.id}>
                                        <td>#{sku.id}</td>
                                        <td>{sku.size}</td>
                                        <td>{sku.stock ?? 0}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan="3" className="product-empty-inner">
                                        No SKUs found.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="products-pagination">
          <button
            type="button"
            className="products-btn products-btn-secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>

          <button
            type="button"
            className="products-btn products-btn-secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </button>
        </div>
      </section>

      {(selectedProductLoading || productForm || selectedProductError) && (
        <div className="products-modal-backdrop" onClick={closeModal}>
          <div className="products-modal" onClick={(e) => e.stopPropagation()}>
            <div className="products-modal-head">
              <h3>
                {productForm ? `Product #${productForm.id}` : "Product Details"}
              </h3>
              <button
                type="button"
                className="products-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {selectedProductLoading ? (
              <div className="products-modal-body">Loading product...</div>
            ) : selectedProductError ? (
              <div className="products-modal-body">{selectedProductError}</div>
            ) : productForm ? (
              <div className="products-modal-body">
                <div className="products-details-grid">
                  <div className="products-detail-row">
                    <span className="products-detail-label">Product ID</span>
                    <span className="products-detail-value">#{productForm.id}</span>
                  </div>
                  <div className="products-detail-row">
                    <span className="products-detail-label">Store ID</span>
                    <span className="products-detail-value">{productForm.store_id}</span>
                  </div>
                  <div className="products-detail-row">
                    <span className="products-detail-label">Created</span>
                    <span className="products-detail-value">
                      {formatDate(productForm.created_at)}
                    </span>
                  </div>

                  <div className="products-detail-row editable">
                    <span className="products-detail-label">Name</span>
                    <input
                      value={productForm.name}
                      onChange={(e) => updateProductField("name", e.target.value)}
                    />
                  </div>

                  <div className="products-detail-row editable">
                    <span className="products-detail-label">Category</span>
                    <input
                      value={productForm.category}
                      onChange={(e) => updateProductField("category", e.target.value)}
                    />
                  </div>

                  <div className="products-detail-row editable">
                    <span className="products-detail-label">Stock</span>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => updateProductField("stock", e.target.value)}
                    />
                  </div>
                </div>

                <div className="products-detail-block">
                  <h4>Description</h4>
                  <textarea
                    className="products-edit-textarea"
                    value={productForm.description}
                    onChange={(e) => updateProductField("description", e.target.value)}
                  />
                </div>

                <div className="products-detail-block">
                  <h4>Variants</h4>
                  {productForm.variants?.length ? (
                    <div className="products-modal-variants">
                      {productForm.variants.map((variant, variantIndex) => {
                        const previewImage =
                          variantPreviewUrls[variant.id] || variant.image_url;

                        return (
                          <div className="products-modal-variant-card" key={variant.id}>
                            <div className="products-modal-variant-head">
                              <div>
                                <strong>
                                  Variant #{variant.id} — {variant.name || "Unnamed Variant"}
                                </strong>
                                <div className="products-modal-variant-sub">
                                  Product #{variant.product_id} · Created{" "}
                                  {formatDate(variant.created_at)}
                                </div>
                              </div>
                            </div>

                            <div className="products-variant-edit-grid">
                              <div className="products-detail-row">
                                <span className="products-detail-label">Variant ID</span>
                                <span className="products-detail-value">#{variant.id}</span>
                              </div>

                              <div className="products-detail-row editable">
                                <span className="products-detail-label">Name</span>
                                <input
                                  value={variant.name}
                                  onChange={(e) =>
                                    updateVariantField(
                                      variantIndex,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="products-detail-row editable">
                                <span className="products-detail-label">Seller Price</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.seller_price}
                                  onChange={(e) =>
                                    updateVariantField(
                                      variantIndex,
                                      "seller_price",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="products-detail-row editable">
                                <span className="products-detail-label">Stock</span>
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) =>
                                    updateVariantField(
                                      variantIndex,
                                      "stock",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="products-detail-row editable">
                                <span className="products-detail-label">Markup Percent</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.markup_percent}
                                  onChange={(e) =>
                                    updateVariantField(
                                      variantIndex,
                                      "markup_percent",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="products-detail-row editable">
                                <span className="products-detail-label">Markup Price</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.markup_price}
                                  onChange={(e) =>
                                    updateVariantField(
                                      variantIndex,
                                      "markup_price",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="products-detail-row editable full">
                                <span className="products-detail-label">Image URL</span>
                                <input
                                  value={variant.image_url}
                                  onChange={(e) =>
                                    updateVariantField(
                                      variantIndex,
                                      "image_url",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>

                            {previewImage ? (
                              <img
                                src={previewImage}
                                alt={variant.name || "Variant"}
                                className="products-modal-variant-image"
                              />
                            ) : null}

                            <div className="products-variant-upload-row">
                              <label
                                className={`products-upload-btn ${
                                  uploadingVariantId === variant.id ? "disabled" : ""
                                }`}
                              >
                                {uploadingVariantId === variant.id
                                  ? "Uploading..."
                                  : "Upload New Variant Image"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingVariantId === variant.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleVariantImageUpload(variant.id, file);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>

                            <div className="sku-table-wrap">
                              <table className="sku-table">
                                <thead>
                                  <tr>
                                    <th>SKU ID</th>
                                    <th>Size</th>
                                    <th>Stock</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variant.skus?.length ? (
                                    variant.skus.map((sku, skuIndex) => (
                                      <tr key={sku.id}>
                                        <td>#{sku.id}</td>
                                        <td>
                                          <input
                                            className="products-inline-input"
                                            value={sku.size}
                                            onChange={(e) =>
                                              updateSkuField(
                                                variantIndex,
                                                skuIndex,
                                                "size",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type="number"
                                            className="products-inline-input"
                                            value={sku.stock}
                                            onChange={(e) =>
                                              updateSkuField(
                                                variantIndex,
                                                skuIndex,
                                                "stock",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan="3" className="product-empty-inner">
                                        No SKUs found.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="products-note-box">No variants found.</div>
                  )}
                </div>

                <div className="products-modal-actions">
                  <button
                    type="button"
                    className="products-btn products-btn-secondary"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="products-btn products-btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}