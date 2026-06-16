// ===== STATE =====
let adminUser = null;
let allCategories = [];
let allProducts = [];
let productsPage = 1;
let editingProductId = null;
let editingCategoryId = null;
let selectedImages = [];
let keepImages = [];

// ===== AUTH =====
async function checkAuth() {
  const token = localStorage.getItem("adminToken");
  if (!token) { showLogin(); return; }
  try {
    adminUser = await api.get("/auth/me");
    document.getElementById("adminName").textContent = adminUser.username;
    document.getElementById("adminAvatar").textContent = adminUser.username[0].toUpperCase();
    showDashboard();
    loadDashboard();
  } catch {
    localStorage.removeItem("adminToken");
    showLogin();
  }
}

function showLogin() {
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("dashApp").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("dashApp").style.display = "flex";
}

async function doLogin(e) {
  e.preventDefault();
  const username = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPass").value;
  const btn = document.getElementById("loginBtn");

  btn.textContent = "جاري الدخول...";
  btn.disabled = true;

  try {
    const data = await api.post("/auth/login", { username, password });
    localStorage.setItem("adminToken", data.token);
    adminUser = data;
    document.getElementById("adminName").textContent = data.username;
    document.getElementById("adminAvatar").textContent = data.username[0].toUpperCase();
    showDashboard();
    loadDashboard();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = "دخول";
    btn.disabled = false;
  }
}

function logout() {
  localStorage.removeItem("adminToken");
  showLogin();
  showToast("تم تسجيل الخروج", "info");
}

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll(".dash-page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  document.querySelector(`[data-page="${page}"]`).classList.add("active");
  document.getElementById("pageTitle").textContent = {
    overview: "لوحة التحكم",
    products: "المنتجات",
    categories: "الأقسام",
    orders: "الطلبات",
    settings: "الإعدادات",
  }[page] || page;

  // Close mobile sidebar
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("active");

  if (page === "products") loadProducts();
  if (page === "categories") loadCategories();
  if (page === "orders") { loadOrders(1); loadOrderStats(); }
  if (page === "settings") loadSettings();
}

// ===== OVERVIEW =====
async function loadDashboard() {
  try {
    const [prodRes, catRes] = await Promise.all([
      api.get("/products?limit=1"),
      api.get("/categories"),
    ]);
    allCategories = catRes;
    populateProductFilterSelect();
    document.getElementById("statProducts").textContent = prodRes.total || 0;
    document.getElementById("statCategories").textContent = catRes.length;
    const activeRes = await api.get("/products?active=true&limit=1");
    document.getElementById("statActive").textContent = activeRes.total || 0;
    loadOrderStats();
  } catch (err) {
    console.error(err);
  }
}

// ===== PRODUCTS =====
async function loadProducts(page = 1) {
  productsPage = page;
  const tbody = document.getElementById("productsTable");
  tbody.innerHTML = `<tr><td colspan="7"><div class="spinner"></div></td></tr>`;

  try {
    const search = document.getElementById("productSearch")?.value || "";
    const catFilter = document.getElementById("productCatFilter")?.value || "";
    const params = new URLSearchParams({ page, limit: 15 });
    if (search) params.set("search", search);
    if (catFilter) params.set("category", catFilter);

    const res = await api.get(`/products?${params}`);
    allProducts = res.products;
    renderProductsTable(res);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">${err.message}</td></tr>`;
  }
}

function renderProductsTable(res) {
  const tbody = document.getElementById("productsTable");
  if (!res.products.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📦</div><h3>لا توجد منتجات</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = res.products.map(p => `
    <tr>
      <td data-label="الصورة">
        ${p.images?.[0]
          ? `<img src="${p.images[0]}" class="product-table-img" alt="">`
          : `<div class="product-table-no-img">📦</div>`}
      </td>
      <td data-label="الاسم"><strong>${p.name_ar}</strong></td>
      <td data-label="القسم">${p.category?.name_ar || "—"}</td>
      <td data-label="السعر"><strong style="color:var(--accent-gold-light)">${formatPrice(p.price)}</strong></td>
      <td data-label="المخزون"><span style="color:${p.stock > 0 ? "var(--success)" : "var(--danger)"}">${p.stock}</span></td>
      <td data-label="الحالة">
        <span class="badge ${p.isActive ? "badge-success" : "badge-danger"}">
          ${p.isActive ? "نشط" : "مخفي"}
        </span>
      </td>
      <td data-label="إجراءات">
        <div class="action-btns">
          <button class="action-btn edit" onclick="openProductModal('${p._id}')" title="تعديل">✏️</button>
          <button class="action-btn toggle" onclick="toggleProduct('${p._id}')" title="إخفاء/إظهار">👁</button>
          <button class="action-btn delete" onclick="deleteProduct('${p._id}')" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");

  renderProductsPagination(res);
}

function renderProductsPagination(res) {
  const el = document.getElementById("productsPagination");
  el.innerHTML = `<span class="pagination-info">${res.total} منتج | صفحة ${res.page} من ${res.pages}</span>
    <div class="pagination-btns">
      <button class="page-btn" onclick="loadProducts(${Math.max(1, res.page-1)})" ${res.page === 1 ? "disabled" : ""}>→</button>
      ${Array.from({length: Math.min(5, res.pages)}, (_, i) => {
        const p = i + 1;
        return `<button class="page-btn ${p === res.page ? "active" : ""}" onclick="loadProducts(${p})">${p}</button>`;
      }).join("")}
      <button class="page-btn" onclick="loadProducts(${Math.min(res.pages, res.page+1)})" ${res.page === res.pages ? "disabled" : ""}>←</button>
    </div>`;
}

// ===== PRODUCT MODAL =====
async function openProductModal(id = null) {
  editingProductId = id;
  selectedImages = [];
  keepImages = [];

  const modal = document.getElementById("productModal");
  const title = document.getElementById("productModalTitle");
  const form = document.getElementById("productForm");

  form.reset();
  document.getElementById("imagePreviews").innerHTML = "";
  document.getElementById("productSubcategoryGroup").style.display = "none";
  populateCategorySelect("productCategory", true);

  if (id) {
    title.textContent = "تعديل منتج";
    try {
      const p = await api.get(`/products/${id}`);
      document.getElementById("pNameAr").value = p.name_ar || "";
      document.getElementById("pDescAr").value = p.description_ar || "";
      document.getElementById("pPrice").value = p.price || "";
      document.getElementById("pOldPrice").value = p.oldPrice || "";
      document.getElementById("pStock").value = p.stock || "";
      document.getElementById("productCategory").value = p.category?._id || p.category || "";
      document.getElementById("pActive").checked = p.isActive;

      // Set subcategory
      if (p.subcategory?._id || p.subcategory) {
        const subId = p.subcategory._id || p.subcategory;
        onProductCategoryChange();
        document.getElementById("productSubcategory").value = subId;
      }

      keepImages = p.images || [];
      renderImagePreviews();
    } catch (err) {
      showToast("تعذر تحميل بيانات المنتج", "error");
      return;
    }
  } else {
    title.textContent = "إضافة منتج جديد";
    document.getElementById("pActive").checked = true;
  }

  modal.classList.add("active");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("active");
}

async function saveProduct() {
  const fd = new FormData();
  const fields = {
    name_ar: document.getElementById("pNameAr").value.trim(),
    description_ar: document.getElementById("pDescAr").value.trim(),
    price: document.getElementById("pPrice").value,
    oldPrice: document.getElementById("pOldPrice").value,
    stock: document.getElementById("pStock").value,
    category: document.getElementById("productCategory").value,
    subcategory: document.getElementById("productSubcategory").value || "",
    isActive: document.getElementById("pActive").checked,
  };

  if (!fields.name_ar) { showToast("الاسم بالعربي مطلوب", "error"); return; }
  if (!fields.price) { showToast("السعر مطلوب", "error"); return; }
  if (!fields.category) { showToast("القسم مطلوب", "error"); return; }

  for (const [k, v] of Object.entries(fields)) {
    if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
  }

  if (editingProductId) fd.append("keepImages", JSON.stringify(keepImages));
  selectedImages.forEach(f => fd.append("images", f));

  const btn = document.getElementById("saveProductBtn");
  btn.textContent = "جاري الحفظ...";
  btn.disabled = true;

  try {
    if (editingProductId) {
      await api.put(`/products/${editingProductId}`, fd, true);
      showToast("تم تحديث المنتج ✅", "success");
    } else {
      await api.post("/products", fd, true);
      showToast("تم إضافة المنتج ✅", "success");
    }
    closeProductModal();
    loadProducts(productsPage);
    loadDashboard();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = "حفظ";
    btn.disabled = false;
  }
}

async function deleteProduct(id) {
  const product = allProducts.find(p => p._id === id);
  const name = product?.name_ar || "هذا المنتج";
  if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
  try {
    await api.delete(`/products/${id}`);
    showToast("تم الحذف", "success");
    loadProducts(productsPage);
    loadDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function toggleProduct(id) {
  try {
    const res = await api.patch(`/products/${id}/toggle`);
    showToast(res.isActive ? "تم إظهار المنتج" : "تم إخفاء المنتج", "success");
    loadProducts(productsPage);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ===== IMAGE UPLOAD =====
function handleImageFiles(files) {
  Array.from(files).forEach(f => {
    if (f.size > 5 * 1024 * 1024) { showToast(`${f.name} أكبر من 5MB`, "error"); return; }
    selectedImages.push(f);
  });
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById("imagePreviews");
  const existingHTML = keepImages.map((src, i) => `
    <div class="image-preview-item">
      <img src="${src}" alt="">
      <button class="image-preview-remove" onclick="removeKeepImage(${i})">✕</button>
    </div>`).join("");

  const newHTML = selectedImages.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div class="image-preview-item">
      <img src="${url}" alt="">
      <button class="image-preview-remove" onclick="removeNewImage(${i})">✕</button>
    </div>`;
  }).join("");

  container.innerHTML = existingHTML + newHTML;
}

function removeKeepImage(i) {
  keepImages.splice(i, 1);
  renderImagePreviews();
}

function removeNewImage(i) {
  selectedImages.splice(i, 1);
  renderImagePreviews();
}

// ===== CATEGORIES =====
async function loadCategories() {
  const tbody = document.getElementById("categoriesTable");
  tbody.innerHTML = `<tr><td colspan="4"><div class="spinner"></div></td></tr>`;
  try {
    allCategories = await api.get("/categories");
    renderCategoriesTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger);text-align:center">${err.message}</td></tr>`;
  }
}

function getMainCategories() {
  return allCategories.filter(c => !c.parent).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getSubcategories(parentId) {
  return allCategories.filter(c => c.parent === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getIconHtml(icon) {
  if (!icon) return `<span style="font-size:1.2rem">📁</span>`;
  return `<img src="${icon}" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:4px" onerror="this.replaceWith(document.createTextNode('📁'))">`;
}

function renderCategoriesTable() {
  const tbody = document.getElementById("categoriesTable");
  if (!allCategories.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div>📂</div><h3>لا توجد أقسام</h3></div></td></tr>`;
    return;
  }
  const mains = getMainCategories();
  tbody.innerHTML = mains.map(main => {
    const subs = getSubcategories(main._id);
    const subBadges = subs.map(s => `<span class="badge badge-subcat" style="background:rgba(249,168,212,0.1);color:var(--accent-gold);padding:3px 10px;border-radius:50px;font-size:0.78rem;white-space:nowrap;display:inline-block;margin:2px">${s.name_ar}</span>`).join("");
    return `
    <tr class="cat-main-row">
      <td data-label="الأيقونة">${getIconHtml(main.icon)}</td>
      <td data-label="القسم"><strong class="cat-main-name">${main.name_ar}</strong></td>
      <td data-label="الوصف">${main.description_ar || "—"}</td>
      <td data-label="الأقسام الفرعية">${subBadges || '<span style="color:var(--text-muted);font-size:0.82rem">—</span>'}</td>
      <td data-label="إجراءات">
        <div class="action-btns">
          <button class="action-btn edit" onclick="openCategoryModal('${main._id}')" title="تعديل">✏️</button>
          <button class="action-btn delete" onclick="deleteCategory('${main._id}', '${main.name_ar.replace(/'/g, "")}')" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>
    ${subs.length ? subs.map(sub => `
    <tr class="cat-sub-row">
      <td data-label="الأيقونة" style="padding-right:44px">${getIconHtml(sub.icon)}</td>
      <td data-label="القسم"><span style="color:var(--text-secondary)">└─</span> ${sub.name_ar}</td>
      <td data-label="الوصف">${sub.description_ar || "—"}</td>
      <td data-label="الأقسام الفرعية"><span style="color:var(--text-muted);font-size:0.82rem">—</span></td>
      <td data-label="إجراءات">
        <div class="action-btns">
          <button class="action-btn edit" onclick="openCategoryModal('${sub._id}')" title="تعديل">✏️</button>
          <button class="action-btn delete" onclick="deleteCategory('${sub._id}', '${sub.name_ar.replace(/'/g, "")}')" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>`).join("") : ""}
  `}).join("");
}

function autoGenerateSlug() {
  // slug is auto-generated server-side; this is just a UI hint
}

function populateParentSelect() {
  const sel = document.getElementById("catParent");
  if (!sel) return;
  sel.innerHTML = `<option value="">— قسم رئيسي —</option>`
    + getMainCategories().map(c => `<option value="${c._id}">${c.name_ar}</option>`).join("");
}

async function openCategoryModal(id = null) {
  editingCategoryId = id;
  const modal = document.getElementById("categoryModal");
  document.getElementById("categoryModalTitle").textContent = id ? "تعديل قسم" : "إضافة قسم جديد";
  document.getElementById("catNameAr").value = "";
  document.getElementById("catDescAr").value = "";
  pendingCategoryIcon = null;
  document.getElementById("catIconUrl").value = "";
  document.getElementById("catIconFile").value = "";
  document.getElementById("catIconPreview").style.display = "none";
  document.getElementById("catIconRemoveBtn").style.display = "none";
  populateParentSelect();

  if (id) {
    const cat = allCategories.find(c => c._id === id);
    if (cat) {
      document.getElementById("catNameAr").value = cat.name_ar;
      document.getElementById("catDescAr").value = cat.description_ar || "";
      if (cat.icon) {
        setCategoryIconPreview(cat.icon);
      }
      if (cat.parent) {
        document.getElementById("catParent").value = cat.parent;
      }
    }
    document.getElementById("catParent").disabled = true;
  } else {
    document.getElementById("catParent").disabled = false;
  }

  modal.classList.add("active");
}

function closeCategoryModal() {
  document.getElementById("categoryModal").classList.remove("active");
}

let pendingCategoryIcon = null; // null = unchanged, "" = removed, string = set/uploaded

function setCategoryIconPreview(url) {
  pendingCategoryIcon = url;
  document.getElementById("catIconUrl").value = url;
  const preview = document.getElementById("catIconPreview");
  preview.querySelector("img").src = url;
  preview.style.display = "block";
  document.getElementById("catIconRemoveBtn").style.display = "inline-flex";
}

function removeCategoryIcon() {
  pendingCategoryIcon = "";
  document.getElementById("catIconUrl").value = "";
  document.getElementById("catIconFile").value = "";
  document.getElementById("catIconPreview").style.display = "none";
  document.getElementById("catIconRemoveBtn").style.display = "none";
}

async function uploadCategoryIcon(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("icon", file);
  try {
    const res = await api.post("/categories/upload-icon", formData, true);
    setCategoryIconPreview(res.url);
    showToast("تم رفع الأيقونة ✅", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Listen for manual URL paste in the icon input
document.addEventListener("DOMContentLoaded", () => {
  const iconUrlInput = document.getElementById("catIconUrl");
  if (iconUrlInput) {
    iconUrlInput.addEventListener("input", function () {
      const val = this.value.trim();
      if (val) {
        setCategoryIconPreview(val);
      } else {
        pendingCategoryIcon = "";
        removeCategoryIcon();
      }
    });
  }
});

async function saveCategory() {
  const data = {
    name_ar: document.getElementById("catNameAr").value.trim(),
    description_ar: document.getElementById("catDescAr").value.trim(),
  };
  const parent = document.getElementById("catParent").value;
  if (parent) data.parent = parent;
  if (pendingCategoryIcon !== null) data.icon = pendingCategoryIcon;

  if (!data.name_ar) {
    showToast("اسم القسم مطلوب", "error"); return;
  }

  const btn = document.getElementById("saveCategoryBtn");
  btn.textContent = "جاري الحفظ..."; btn.disabled = true;

  try {
    if (editingCategoryId) {
      await api.put(`/categories/${editingCategoryId}`, data);
      showToast("تم تحديث القسم ✅", "success");
    } else {
      await api.post("/categories", data);
      showToast("تم إضافة القسم ✅", "success");
    }
    pendingCategoryIcon = null;
    closeCategoryModal();
    loadCategories();
    loadDashboard();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = "حفظ"; btn.disabled = false;
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`هل أنت متأكد من حذف قسم "${name}"؟`)) return;
  try {
    await api.delete(`/categories/${id}`);
    showToast("تم حذف القسم", "success");
    loadCategories();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ===== SETTINGS =====
let currentSettings = {};

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁️";
  }
}

async function changePassword() {
  const current = document.getElementById("sCurrentPassword").value;
  const newPw = document.getElementById("sNewPassword").value;
  const confirm = document.getElementById("sConfirmPassword").value;

  if (!current || !newPw || !confirm) {
    showToast("جميع الحقول مطلوبة", "error");
    return;
  }
  if (newPw !== confirm) {
    showToast("كلمة المرور الجديدة غير متطابقة", "error");
    return;
  }
  if (newPw.length < 6) {
    showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");
    return;
  }

  const btn = document.getElementById("changePasswordBtn");
  btn.textContent = "⏳ جاري التغيير...";
  btn.disabled = true;

  try {
    await api.put("/auth/password", { currentPassword: current, newPassword: newPw });
    showToast("تم تغيير كلمة المرور بنجاح ✅", "success");
    document.getElementById("sCurrentPassword").value = "";
    document.getElementById("sNewPassword").value = "";
    document.getElementById("sConfirmPassword").value = "";
    setTimeout(() => { logout(); }, 2000);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = "🔑 تغيير كلمة المرور";
    btn.disabled = false;
  }
}

async function loadSettings() {
  try {
    currentSettings = await api.get("/settings");
    fillSettingsForm(currentSettings);
    renderPaymentMethodsList();
  } catch (err) {
    showToast("تعذر تحميل الإعدادات", "error");
  }
}

function getPaymentMethods() {
  return window._paymentMethods || [];
}

function setPaymentMethods(methods) {
  window._paymentMethods = methods;
}

function fillSettingsForm(s) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val || ""; };
  set("sSiteName", s.siteName_ar);
  set("sHeroTitle", s.heroTitle_ar);
  set("sHeroSubtitle", s.heroSubtitle_ar);
  set("sAbout", s.aboutUs_ar);
  set("sPhone", s.contact?.phone);
  set("sWhatsapp", s.contact?.whatsapp);
  set("sEmail", s.contact?.email);
  set("sAddress", s.contact?.address_ar);
  set("sFacebook", s.contact?.facebook);
  set("sInstagram", s.contact?.instagram);
  set("sTiktok", s.contact?.tiktok);

  setPaymentMethods((s.paymentMethods || []).map(m => ({ ...m })));
}

// ===== PAYMENT METHODS (dynamic) =====
function getIconHtml(icon) {
  if (!icon) return "💳";
  return `<img src="${icon}" alt="" style="width:24px;height:24px;object-fit:contain;border-radius:4px" onerror="this.parentElement.textContent='💳'">`;
}

const PAYMENT_TYPE_LABELS = { wallet: "محفظة", online: "أونلاين", cod: "عند الاستلام" };

function renderPaymentMethodsList() {
  const methods = getPaymentMethods();
  const el = document.getElementById("paymentMethodsList");
  if (!el) return;
  el.innerHTML = methods.map((m, i) => `
    <div class="payment-method-card" data-idx="${i}" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:160px">
          <span class="payment-icon-preview" id="pmIconPreview-${i}">${getIconHtml(m.icon)}</span>
          <span style="font-weight:700;font-size:0.95rem;color:var(--text-primary)">${m.name}</span>
        </div>
      </div>
      <div class="form-row" style="margin-top:10px;gap:10px">
        <div class="form-group" style="flex:1">
          <label class="form-label" style="font-size:0.72rem">النوع</label>
          <select class="form-input" style="font-size:0.82rem" onchange="editPaymentMethod(${i},'type',this.value)">
            <option value="wallet" ${m.type === 'wallet' ? 'selected' : ''}>محفظة (Wallet)</option>
            <option value="online" ${m.type === 'online' ? 'selected' : ''}>أونلاين (Online)</option>
            <option value="cod" ${m.type === 'cod' ? 'selected' : ''}>عند الاستلام (COD)</option>
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" style="font-size:0.72rem">أيقونة</label>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <button type="button" class="action-btn" style="font-size:0.75rem;padding:4px 10px" onclick="document.getElementById('pmIconInput-${i}').click()">📁 رفع</button>
            <input type="file" id="pmIconInput-${i}" accept="image/*" style="display:none" onchange="uploadPaymentMethodIcon(${i},this)">
            <input class="form-input" style="flex:1;min-width:120px;font-size:0.78rem;direction:ltr" value="${m.icon}" placeholder="أو رابط URL" oninput="editPaymentMethod(${i},'icon',this.value); document.getElementById('pmIconPreview-${i}').innerHTML=this.value.trim()?getIconHtml(this.value.trim()):'💳'">
            ${m.icon ? `<button type="button" class="action-btn delete" style="font-size:0.7rem;padding:2px 6px" onclick="editPaymentMethod(${i},'icon','');renderPaymentMethodsList()" title="إزالة الأيقونة">✕</button>` : ''}
          </div>
        </div>
        <div class="form-group" style="max-width:80px">
          <label class="form-label" style="font-size:0.72rem">ترتيب</label>
          <input class="form-input" style="font-size:0.82rem;text-align:center" type="number" min="0" value="${m.order ?? 0}" oninput="editPaymentMethod(${i},'order',parseInt(this.value)||0)">
        </div>
      </div>
      ${m.type !== 'cod' ? `
      <div class="form-row" style="margin-top:8px;gap:10px">
        <div class="form-group" style="flex:1">
          <label class="form-label" style="font-size:0.72rem">كود الدفع (اختياري — لفوري ونظائره)</label>
          <input class="form-input" style="font-size:0.82rem;direction:ltr" value="${m.code || ''}" placeholder="مثال: 01144586660" oninput="editPaymentMethod(${i},'code',this.value)">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" style="font-size:0.72rem">رابط الدفع (اختياري — لإنستا باي ونظائره)</label>
          <input class="form-input" style="font-size:0.82rem;direction:ltr" value="${m.paymentUrl || ''}" placeholder="https://..." oninput="editPaymentMethod(${i},'paymentUrl',this.value)">
        </div>
      </div>` : ''}
      <div class="form-group" style="margin-top:6px">
        <label class="form-label" style="font-size:0.72rem">تعليمات الدفع (تظهر للعميل)</label>
        <textarea class="form-input" style="font-size:0.82rem;min-height:50px;resize:vertical" placeholder="تعليمات طريقة الدفع..." rows="2" oninput="editPaymentMethod(${i},'instructions',this.value)">${m.instructions || ''}</textarea>
      </div>
    </div>`).join("");
}

function editPaymentMethod(idx, field, value) {
  const methods = getPaymentMethods();
  if (methods[idx]) {
    methods[idx][field] = value;
  }
}

async function uploadPaymentMethodIcon(index, input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("icon", file);
  try {
    const data = await api.post("/settings/upload-icon", formData, true);
    editPaymentMethod(index, "icon", data.url);
    renderPaymentMethodsList();
    showToast("تم رفع الأيقونة بنجاح", "success");
  } catch (err) {
    showToast("فشل رفع الأيقونة: " + err.message, "error");
  }
  input.value = "";
}

async function saveSettings() {
  const get = (id) => document.getElementById(id)?.value?.trim() || "";

  const data = {
    siteName_ar: get("sSiteName"),
    heroTitle_ar: get("sHeroTitle"),
    heroSubtitle_ar: get("sHeroSubtitle"),
    aboutUs_ar: get("sAbout"),
    contact: {
      phone: get("sPhone"),
      whatsapp: get("sWhatsapp"),
      email: get("sEmail"),
      address_ar: get("sAddress"),
      facebook: get("sFacebook"),
      instagram: get("sInstagram"),
      tiktok: get("sTiktok"),
    },
    paymentMethods: getPaymentMethods(),
  };

  const btn = document.getElementById("saveSettingsBtn");
  btn.textContent = "جاري الحفظ..."; btn.disabled = true;

  try {
    await api.put("/settings", data);
    showToast("تم حفظ الإعدادات ✅", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = "حفظ الإعدادات"; btn.disabled = false;
  }
}

function populateProductFilterSelect() {
  populateCategorySelect("productCatFilter", false);
}

// ===== HELPERS =====
function populateCategorySelect(selectId, mainOnly = true) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  if (mainOnly) {
    sel.innerHTML = `<option value="">اختر القسم الرئيسي</option>`
      + getMainCategories().map(c => `<option value="${c._id}">${c.name_ar}</option>`).join("");
  } else {
    sel.innerHTML = `<option value="">كل الأقسام</option>`
      + getMainCategories().map(c => {
        const subs = getSubcategories(c._id);
        let opts = `<option value="${c._id}">${c.name_ar}</option>`;
        subs.forEach(s => { opts += `<option value="${s._id}">— ${s.name_ar}</option>`; });
        return opts;
      }).join("");
  }
}

function onProductCategoryChange() {
  const catId = document.getElementById("productCategory").value;
  const subGroup = document.getElementById("productSubcategoryGroup");
  const subSel = document.getElementById("productSubcategory");
  subSel.innerHTML = `<option value="">— بدون قسم فرعي —</option>`;
  if (catId) {
    const subs = getSubcategories(catId);
    if (subs.length) {
      subs.forEach(s => { subSel.innerHTML += `<option value="${s._id}">${s.name_ar}</option>`; });
      subGroup.style.display = "block";
    } else {
      subGroup.style.display = "none";
    }
  } else {
    subGroup.style.display = "none";
  }
}

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[\u0600-\u06FF]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();

  // Login form
  document.getElementById("loginForm")?.addEventListener("submit", doLogin);

  // Image drag-drop
  const uploadArea = document.getElementById("imageUploadArea");
  const imageInput = document.getElementById("imageInput");

  uploadArea?.addEventListener("click", () => imageInput.click());
  uploadArea?.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("dragover"); });
  uploadArea?.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));
  uploadArea?.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    handleImageFiles(e.dataTransfer.files);
  });
  imageInput?.addEventListener("change", e => handleImageFiles(e.target.files));



  // Mobile sidebar
  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("active");
  });
  document.getElementById("sidebarOverlay")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("active");
  });

  // Product search with debounce
  let searchTimer;
  document.getElementById("productSearch")?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadProducts(1), 400);
  });
});

// ===== ORDERS =====
let ordersPage = 1;

async function loadOrders(page = 1) {
  ordersPage = page;
  const tbody = document.getElementById("ordersTable");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7"><div class="spinner"></div></td></tr>`;

  try {
    const status = document.getElementById("orderStatusFilter")?.value || "";
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.set("status", status);
    const res = await api.get(`/orders?${params}`);
    renderOrdersTable(res);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">${err.message}</td></tr>`;
  }
}

async function loadOrderStats() {
  try {
    const s = await api.get("/orders/stats");
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("oStatNew", s.new);
    set("oStatPaid", s.paid);
    set("oStatShipped", s.shipped);
    set("oStatRevenue", (s.revenue || 0).toLocaleString("ar-EG") + " جنيه");

    // Update sidebar badge
    const badge = document.getElementById("newOrdersBadge");
    if (badge) {
      badge.textContent = s.new;
      badge.style.display = s.new > 0 ? "inline" : "none";
    }
    // Update overview stat
    const ovStat = document.getElementById("statOrders");
    if (ovStat) ovStat.textContent = s.total;
  } catch {}
}

const STATUS_STYLES = {
  "جديد":     { bg: "rgba(231,76,60,0.12)",  color: "var(--danger)",           icon: "🆕" },
  "تم الدفع": { bg: "rgba(46,204,113,0.12)", color: "var(--success)",          icon: "✅" },
  "تم الشحن": { bg: "rgba(45,107,228,0.12)", color: "var(--accent-blue-light)", icon: "🚚" },
  "مكتمل":    { bg: "rgba(249,168,212,0.12)", color: "var(--accent-gold)",       icon: "🎉" },
  "ملغي":     { bg: "rgba(100,100,120,0.12)","color": "var(--text-muted)",      icon: "❌" },
};

function renderOrdersTable(res) {
  const tbody = document.getElementById("ordersTable");
  if (!res.orders.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div>📋</div><h3>لا توجد طلبات</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = res.orders.map(o => {
    const st = STATUS_STYLES[o.status] || STATUS_STYLES["جديد"];
    const date = new Date(o.createdAt).toLocaleDateString("ar-EG", { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
    const itemsSummary = o.items.map(i => `${i.name} ×${i.qty}`).join("، ");

    // بيانات العميل
    const customerName  = o.customerName  || "—";
    const customerPhone = o.customerPhone || "—";
    const addr = o.customerAddress;
    const addressShort  = addr?.governorate
      ? `${addr.governorate}، ${addr.city || ""}`
      : "—";

    return `<tr>
      <td data-label="رقم الطلب"><strong style="color:var(--accent-gold)">${o.orderNumber}</strong></td>
      <td data-label="العميل">
        <div style="font-weight:700;font-size:0.88rem">${customerName}</div>
        <div style="font-size:0.8rem;color:var(--accent-blue-light);direction:ltr;text-align:right">${customerPhone}</div>
        <div style="font-size:0.76rem;color:var(--text-muted);margin-top:2px">${addressShort}</div>
      </td>
      <td data-label="المنتجات" style="max-width:180px;font-size:0.83rem;color:var(--text-secondary)">${itemsSummary}</td>
      <td data-label="الإجمالي"><strong style="color:var(--accent-gold-light)">${o.total.toLocaleString("ar-EG")} جنيه</strong></td>
      <td data-label="طريقة الدفع" style="font-size:0.88rem">${o.paymentMethodName || o.paymentMethod}</td>
      <td data-label="التاريخ" style="font-size:0.82rem;color:var(--text-muted);white-space:nowrap">${date}</td>
      <td data-label="الحالة">
        <select class="order-status-select"
          data-id="${o._id}"
          style="background:${st.bg};color:${st.color};border:1px solid ${st.color}40"
          onchange="changeOrderStatus('${o._id}', this)">
          ${Object.keys(STATUS_STYLES).map(s =>
            `<option value="${s}" ${s === o.status ? "selected" : ""}>${STATUS_STYLES[s].icon} ${s}</option>`
          ).join("")}
        </select>
      </td>
      <td data-label="إجراءات">
        <div class="action-btns">
          <button class="action-btn edit" onclick="openOrderDetails('${o._id}')" title="تفاصيل">👁</button>
          <button class="action-btn delete" onclick="deleteOrder('${o._id}')" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  // Pagination
  const pg = document.getElementById("ordersPagination");
  if (pg) {
    pg.innerHTML = `
      <span class="pagination-info">${res.total} طلب | صفحة ${res.page} من ${res.pages}</span>
      <div class="pagination-btns">
        <button class="page-btn" onclick="loadOrders(${Math.max(1, res.page-1)})" ${res.page===1?"disabled":""}>→</button>
        ${Array.from({length: Math.min(5, res.pages)}, (_,i) =>
          `<button class="page-btn ${i+1===res.page?"active":""}" onclick="loadOrders(${i+1})">${i+1}</button>`
        ).join("")}
        <button class="page-btn" onclick="loadOrders(${Math.min(res.pages, res.page+1)})" ${res.page===res.pages?"disabled":""}>←</button>
      </div>`;
  }
}

// ===== ORDER DETAILS MODAL =====
function openOrderDetails(orderId) {
  // ابحث في الطلبات المحملة
  const tbody = document.getElementById("ordersTable");
  const rows = tbody?.querySelectorAll("tr");

  // هنجيب البيانات من الـ API
  api.get(`/orders?limit=1000`).then(res => {
    const o = res.orders.find(x => x._id === orderId);
    if (!o) { showToast("تعذر تحميل تفاصيل الطلب", "error"); return; }

    const st   = STATUS_STYLES[o.status] || STATUS_STYLES["جديد"];
    const date = new Date(o.createdAt).toLocaleDateString("ar-EG", {
      year:"numeric", month:"long", day:"numeric",
      hour:"2-digit", minute:"2-digit"
    });
    const addr = o.customerAddress;
    const addressFull = addr
      ? [addr.governorate, addr.city, addr.street, addr.landmark].filter(Boolean).join("، ")
      : "—";

    const content = document.getElementById("orderDetailContent");
    if (!content) return;

    content.innerHTML = `
      <!-- هيدر الطلب -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <div style="font-size:1.2rem;font-weight:900;color:var(--accent-gold)">${o.orderNumber}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">${date}</div>
        </div>
        <span style="background:${st.bg};color:${st.color};border:1px solid ${st.color}40;
          border-radius:20px;padding:6px 14px;font-size:0.85rem;font-weight:700">
          ${st.icon} ${o.status}
        </span>
      </div>

      <!-- بيانات العميل -->
      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px">
        <div style="font-weight:800;margin-bottom:12px;font-size:0.9rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">👤 بيانات العميل</div>
        <div class="customer-details-grid">
          <div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:3px">الاسم</div>
            <div style="font-weight:700">${o.customerName || "—"}</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:3px">الهاتف</div>
            <div style="font-weight:700;color:var(--accent-blue-light);direction:ltr;text-align:right">
              <a href="tel:${o.customerPhone}" style="color:inherit">${o.customerPhone || "—"}</a>
            </div>
          </div>
        </div>
        ${addr ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:3px">📍 العنوان</div>
          <div style="font-weight:600;line-height:1.7">${addressFull}</div>
        </div>` : ""}
        ${o.notes ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:3px">📝 ملاحظات</div>
          <div style="color:var(--text-secondary);font-size:0.9rem">${o.notes}</div>
        </div>` : ""}
      </div>

      <!-- المنتجات -->
      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px">
        <div style="font-weight:800;margin-bottom:12px;font-size:0.9rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">📦 المنتجات</div>
        ${o.items.map(item => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            ${item.image ? `<img src="${item.image}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid var(--border)">` : `<div style="width:40px;height:40px;border-radius:6px;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-size:1.1rem">📦</div>`}
            <div style="flex:1">
              <div style="font-weight:700;font-size:0.88rem">${item.name}</div>
              <div style="font-size:0.8rem;color:var(--text-muted)">${item.price.toLocaleString("ar-EG")} جنيه × ${item.qty}</div>
            </div>
            <div style="font-weight:800;color:var(--accent-gold-light);font-size:0.9rem">${(item.price * item.qty).toLocaleString("ar-EG")} جنيه</div>
          </div>`).join("")}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:4px">
          <span style="font-weight:700">الإجمالي</span>
          <span style="font-size:1.1rem;font-weight:900;color:var(--accent-gold)">${o.total.toLocaleString("ar-EG")} جنيه</span>
        </div>
      </div>

      <!-- طريقة الدفع -->
      <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:12px">
        <span style="font-size:1.3rem">💳</span>
        <div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:2px">طريقة الدفع</div>
          <div style="font-weight:700">${o.paymentMethodName || o.paymentMethod}</div>
        </div>
      </div>

      <!-- أزرار التواصل -->
      ${o.customerPhone ? `
      <div class="order-contact-actions">
        <a href="tel:${o.customerPhone}" class="btn btn-outline" style="flex:1;justify-content:center;font-size:0.88rem;padding:10px">
          📞 اتصل
        </a>
        <a href="${whatsappLink ? whatsappLink(o.customerPhone, 'مرحباً، بخصوص طلبك رقم ' + o.orderNumber) : '#'}"
          target="_blank" class="btn" style="flex:1;justify-content:center;font-size:0.88rem;padding:10px;background:#25d366;color:white">
          💬 واتساب
        </a>
      </div>` : ""}
    `;

    document.getElementById("orderDetailModal")?.classList.add("active");
  }).catch(() => showToast("تعذر تحميل تفاصيل الطلب", "error"));
}

function closeOrderDetails() {
  document.getElementById("orderDetailModal")?.classList.remove("active");
}

async function changeOrderStatus(id, selectEl) {
  const status = selectEl.value;
  const st = STATUS_STYLES[status];
  try {
    await api.patch(`/orders/${id}/status`, { status });
    selectEl.style.background = st.bg;
    selectEl.style.color = st.color;
    selectEl.style.borderColor = st.color + "40";
    showToast(`تم تغيير الحالة إلى: ${status} ✅`, "success");
    loadOrderStats();
  } catch (err) {
    showToast(err.message, "error");
    loadOrders(ordersPage);
  }
}

async function deleteOrder(id) {
  if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
  try {
    await api.delete(`/orders/${id}`);
    showToast("تم حذف الطلب", "success");
    loadOrders(ordersPage);
    loadOrderStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ===== CHARTS =====
let salesChartInstance = null;
let soundEnabled = false;
let lastOrderCount = 0;
let notifInterval = null;

async function loadCharts(months = 6) {
  try {
    const data = await api.get(`/orders/analytics?months=${months}`);
    renderSalesChart(data.monthly, months);
    renderTopProducts(data.topProducts);
  } catch (err) {
    console.warn("Analytics error:", err.message);
  }
}

function renderSalesChart(monthly, months) {
  const ctx = document.getElementById("salesChart");
  if (!ctx) return;

  // Build labels for last N months
  const labels = [];
  const revenueData = [];
  const countData = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    labels.push(monthNames[d.getMonth()]);
    const found = monthly.find(m => m._id.month === d.getMonth() + 1 && m._id.year === d.getFullYear());
    revenueData.push(found ? found.revenue : 0);
    countData.push(found ? found.count : 0);
  }

  const gridColor = "rgba(0,0,0,0.06)";
  const textColor = "#555568";

  if (salesChartInstance) salesChartInstance.destroy();

  salesChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "الإيرادات (جنيه)",
          data: revenueData,
          backgroundColor: "rgba(249,168,212,0.2)",
          borderColor: "#f9a8d4",
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: "y",
        },
        {
          label: "عدد الطلبات",
          data: countData,
          type: "line",
          borderColor: "#5590ff",
          backgroundColor: "rgba(85,144,255,0.1)",
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "#5590ff",
          tension: 0.4,
          yAxisID: "y1",
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: textColor, font: { family: "Cairo", size: 12 }, boxWidth: 12 } },
        tooltip: {
          backgroundColor: "#fff",
          titleColor: "#1a1a2e",
          bodyColor: textColor,
          borderColor: "#ddddd5",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) return ` ${ctx.parsed.y.toLocaleString("ar-EG")} جنيه`;
              return ` ${ctx.parsed.y} طلب`;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: "Cairo" } } },
        y: { grid: { color: gridColor }, ticks: { color: "#f9a8d4", font: { family: "Cairo" }, callback: v => v.toLocaleString("ar-EG") } },
        y1: { position: "left", grid: { display: false }, ticks: { color: "#5590ff", font: { family: "Cairo" } } },
      },
    },
  });
}

function switchChart(months, btn) {
  document.querySelectorAll("#chartBtn6, #chartBtn12").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  loadCharts(months);
}

function renderTopProducts(products) {
  const el = document.getElementById("topProductsList");
  if (!el) return;

  if (!products?.length) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.9rem">لا توجد بيانات بعد</div>`;
    return;
  }

  const max = products[0].total;
  el.innerHTML = products.map((p, i) => `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <div style="font-size:0.88rem;font-weight:700;display:flex;align-items:center;gap:8px">
          <span style="width:22px;height:22px;border-radius:50%;background:${i===0?'var(--accent-gold)':i===1?'#9090a8':i===2?'#cd7f32':'var(--bg-card-hover)'};color:${i<3?'#0a0a0f':'var(--text-secondary)'};display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:900;flex-shrink:0">${i+1}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">${p._id}</span>
        </div>
        <span style="font-size:0.82rem;color:var(--accent-gold-light);font-weight:700;flex-shrink:0">${p.total} قطعة</span>
      </div>
      <div style="height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${Math.round((p.total/max)*100)}%;background:linear-gradient(to left,var(--accent-gold),var(--accent-gold-dark));border-radius:3px;transition:width 0.8s ease"></div>
      </div>
    </div>
  `).join("");
}

// ===== SOUND NOTIFICATIONS =====
function toggleSound(checkbox) {
  soundEnabled = checkbox.checked;
  localStorage.setItem("dashSound", soundEnabled);
  if (soundEnabled) {
    startNotifPolling();
    showToast("تم تفعيل الإشعارات الصوتية 🔔", "success");
  } else {
    stopNotifPolling();
    showToast("تم إيقاف الإشعارات الصوتية", "info");
  }
}

function playNotifSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

function startNotifPolling() {
  if (notifInterval) return;
  notifInterval = setInterval(checkNewOrders, 30000); // every 30s
}

function stopNotifPolling() {
  if (notifInterval) { clearInterval(notifInterval); notifInterval = null; }
}

async function checkNewOrders() {
  const el = document.getElementById("lastUpdateTime");
  try {
    const stats = await api.get("/orders/stats");
    const now = new Date().toLocaleTimeString("ar-EG");
    if (el) el.textContent = now;

    if (lastOrderCount > 0 && stats.new > lastOrderCount) {
      const diff = stats.new - lastOrderCount;
      showToast(`🔔 ${diff} طلب جديد وصل!`, "success");
      if (soundEnabled) playNotifSound();
      // Update badge
      const badge = document.getElementById("newOrdersBadge");
      if (badge) { badge.textContent = stats.new; badge.style.display = "inline"; }
    }
    lastOrderCount = stats.new;
  } catch {}
}

// ===== EXPORT EXCEL =====
async function exportOrdersExcel() {
  const btn = document.querySelector('[onclick="exportOrdersExcel()"]');
  if (btn) { btn.textContent = "⏳ جاري التصدير..."; btn.disabled = true; }

  try {
    const res = await api.get("/orders?limit=1000");
    const orders = res.orders;

    const rows = orders.map(o => ({
      "رقم الطلب": o.orderNumber,
      "المنتجات": o.items.map(i => `${i.name} x${i.qty}`).join(" | "),
      "الإجمالي": o.total,
      "طريقة الدفع": o.paymentMethodName || o.paymentMethod,
      "الحالة": o.status,
      "التاريخ": new Date(o.createdAt).toLocaleDateString("ar-EG"),
      "الوقت": new Date(o.createdAt).toLocaleTimeString("ar-EG"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 15 },
      { wch: 12 }, { wch: 14 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
    XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast(`تم تصدير ${orders.length} طلب ✅`, "success");
  } catch (err) {
    showToast("تعذر التصدير: " + err.message, "error");
  } finally {
    if (btn) { btn.textContent = "📥 تصدير Excel"; btn.disabled = false; }
  }
}

// ===== INIT CHARTS ON OVERVIEW =====
const _origLoadDashboard = loadDashboard;
loadDashboard = async function() {
  await _origLoadDashboard();
  loadCharts(6);
  // Restore sound setting
  const saved = localStorage.getItem("dashSound");
  if (saved === "true") {
    soundEnabled = true;
    const toggle = document.getElementById("soundToggle");
    if (toggle) toggle.checked = true;
    startNotifPolling();
  }
  // Init last order count
  try {
    const stats = await api.get("/orders/stats");
    lastOrderCount = stats.new;
    const el = document.getElementById("lastUpdateTime");
    if (el) el.textContent = new Date().toLocaleTimeString("ar-EG");
  } catch {}
};