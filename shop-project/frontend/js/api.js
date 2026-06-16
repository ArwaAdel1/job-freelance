const API_BASE = "/api";

const getToken = () => localStorage.getItem("adminToken");

const api = {
  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!isFormData && body) headers["Content-Type"] = "application/json";

    const options = { method, headers };
    if (body) options.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, options);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "حصل خطأ");
    return data;
  },

  get: (path) => api.request("GET", path),
  post: (path, body, isFormData) => api.request("POST", path, body, isFormData),
  put: (path, body, isFormData) => api.request("PUT", path, body, isFormData),
  delete: (path) => api.request("DELETE", path),
  patch: (path, body) => api.request("PATCH", path, body),
};

// Toast notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format price
function formatPrice(price) {
  if (!price && price !== 0) return "—";
  return Number(price).toLocaleString("ar-EG") + " جنيه";
}

// Whatsapp link
function whatsappLink(phone, message = "") {
  const num = phone?.replace(/\D/g, "");
  if (!num) return "#";
  const intl = num.startsWith("0") ? "2" + num : num;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

window.api = api;
window.showToast = showToast;
window.formatPrice = formatPrice;
window.whatsappLink = whatsappLink;
