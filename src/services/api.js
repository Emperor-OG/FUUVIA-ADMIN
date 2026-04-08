const API_URL = import.meta.env.VITE_API_URL || "";

export async function adminFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let message = "Request failed";

    try {
      if (contentType.includes("application/json")) {
        const err = await res.json();
        message = err?.message || message;
      }
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  if (contentType.includes("application/json")) {
    return res.json();
  }

  return res.text();
}