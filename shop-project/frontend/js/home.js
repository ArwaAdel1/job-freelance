let settings = {};
let categories = [];
let products = [];
let currentCategory = null;
let currentSubcategory = null;
let cart = JSON.parse(localStorage.getItem('shop_cart') || '[]');

// ===== PAYMENT METHODS (fully dynamic from settings) =====
function getActivePaymentMethods() {
  return (settings.paymentMethods || [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getPaymentIconHtml(icon) {
  if (!icon) return "💳";
  return `<img src="${icon}" alt="" class="payment-method-img-icon" onerror="this.parentElement.textContent='💳'">`;
}

// ===== INIT =====
async function init() {
  // Clean up URL hash once on load to prevent unwanted scrolling
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }
  try {
    [settings, categories] = await Promise.all([
      api.get("/settings"),
      api.get("/categories"),
    ]);
    applySiteSettings();
    renderCategories();
    await loadProducts();
    updateCartBadge();
    initScrollReveal();
  } catch (err) {
    console.error("Init error:", err);
  }
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ===== SETTINGS =====
function applySiteSettings() {
  document.querySelectorAll(".site-name").forEach(el => el.textContent = settings.siteName_ar || "متجرنا");
  document.title = settings.siteName_ar || "متجرنا";

  if (settings.heroTitle_ar) {
    const el = document.getElementById("heroTitle");
    if (el) el.textContent = settings.heroTitle_ar;
  }
  if (settings.heroSubtitle_ar) {
    const el = document.getElementById("heroSubtitle");
    if (el) el.textContent = settings.heroSubtitle_ar;
  }

  const c = settings.contact || {};
  if (c.whatsapp) {
    document.querySelectorAll(".whatsapp-btn").forEach(el => {
      el.href = whatsappLink(c.whatsapp, "مرحباً، أريد الاستفسار");
    });
  }

  if (c.phone) {
    const phoneItem = document.getElementById("contactPhoneItem");
    const phoneVal = document.getElementById("contactPhone");
    if (phoneItem) phoneItem.href = "tel:" + c.phone;
    if (phoneVal) phoneVal.textContent = c.phone;
  }
  if (c.email) {
    const emailItem = document.getElementById("contactEmailItem");
    const emailVal = document.getElementById("contactEmail");
    if (emailItem) emailItem.href = "mailto:" + c.email;
    if (emailVal) emailVal.textContent = c.email;
  }
  if (c.address_ar) { const el = document.getElementById("contactAddress"); if (el) el.textContent = c.address_ar; }

  const showSocial = (id, href) => { if (!href) return; const el = document.getElementById(id); if (el) { el.href = href; el.style.display = "flex"; } };
  showSocial("socialFacebook", c.facebook);
  showSocial("socialInstagram", c.instagram);
  showSocial("socialTiktok", c.tiktok);

  renderPaymentSection(settings);
  if (settings.footerText_ar) { const el = document.getElementById("footerText"); if (el) el.textContent = settings.footerText_ar; }
}

// ===== CATEGORY HELPERS =====
function getMainCategories() {
  return categories.filter(c => !c.parent).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getSubcategories(parentId) {
  return categories.filter(c => c.parent === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ===== CATEGORIES =====
function renderCategoriesSkeleton() {
  const grid = document.getElementById("categoriesGrid");
  if (!grid) return;
  grid.innerHTML = Array(8).fill(`
    <div class="cat-skeleton">
      <div class="skeleton cat-skeleton-icon"></div>
      <div class="skeleton cat-skeleton-name" style="margin-top:10px"></div>
    </div>`).join("");
}

function getCategoryIconHtml(icon) {
  if (!icon) return `<span class="category-icon">📦</span>`;
  return `<img src="${icon}" alt="" class="category-icon" style="width:40px;height:40px;object-fit:contain" onerror="this.replaceWith(document.createTextNode('📦'))">`;
}

function renderCategories() {
  const grid = document.getElementById("categoriesGrid");
  if (!grid) return;
  const allActive = !currentCategory && !currentSubcategory ? 'active' : '';
  const mains = getMainCategories();
  grid.innerHTML = `
    <div class="category-card reveal ${allActive}" onclick="filterByCategory('all', this)">
      <span class="category-icon">📋</span>
      <div class="category-name">الكل</div>
    </div>` + mains.map(cat => `
    <div class="category-card reveal ${currentCategory === cat._id ? 'active' : ''}" data-id="${cat._id}" onclick="filterByCategory('${cat._id}', this)">
      ${getCategoryIconHtml(cat.icon)}
      <div class="category-name">${cat.name_ar}</div>
    </div>`).join("");
  renderSubcategories();
  initScrollReveal();
}

function renderSubcategories() {
  const bar = document.getElementById("subcategoriesBar");
  if (!bar) return;
  if (!currentCategory) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }
  const subs = getSubcategories(currentCategory);
  if (!subs.length) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }
  bar.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted);font-weight:600">الأقسام الفرعية:</span>`
    + subs.map(s => `
      <button class="subcategory-chip ${currentSubcategory === s._id ? 'active' : ''}"
        onclick="filterBySubcategory('${s._id}', this)">
        ${s.name_ar}
      </button>`).join("");
  bar.style.display = "flex";
}

function filterByCategory(id, el) {
  currentSubcategory = null;
  if (id === 'all') {
    currentCategory = null;
    document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active"));
    el.classList.add("active");
  } else if (currentCategory === id) {
    currentCategory = null;
    el.classList.remove("active");
    document.querySelector('.category-card:first-child')?.classList.add("active");
  } else {
    currentCategory = id;
    document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active"));
    el.classList.add("active");
  }
  renderSubcategories();
  loadProducts(1);
}

function filterBySubcategory(id, el) {
  if (currentSubcategory === id) {
    currentSubcategory = null;
    el.classList.remove("active");
  } else {
    currentSubcategory = id;
    document.querySelectorAll(".subcategory-chip").forEach(c => c.classList.remove("active"));
    el.classList.add("active");
  }
  loadProducts(1);
}

// ===== PRODUCTS =====
function renderProductsSkeleton() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  grid.innerHTML = Array(8).fill(`
    <div class="product-skeleton">
      <div class="skeleton product-skeleton-img"></div>
      <div class="product-skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line full" style="margin-top:6px"></div>
        <div class="skeleton skeleton-line medium" style="margin-top:6px"></div>
        <div class="skeleton skeleton-line short" style="margin-top:12px;height:32px;border-radius:8px"></div>
      </div>
    </div>`).join("");
}

async function loadProducts(page = 1) {
  renderProductsSkeleton();
  try {
    const params = new URLSearchParams({ page, limit: 12, active: "true" });
    if (currentSubcategory) params.set("subcategory", currentSubcategory);
    else if (currentCategory) params.set("category", currentCategory);
    // Sort
    const sort = document.getElementById("sortSelect")?.value || "";
    if (sort === "price_asc") { params.set("sortBy", "price"); params.set("sortOrder", "asc"); }
    else if (sort === "price_desc") { params.set("sortBy", "price"); params.set("sortOrder", "desc"); }
    else if (sort === "name_asc") { params.set("sortBy", "name_ar"); params.set("sortOrder", "asc"); }
    // Price filter
    const minP = document.getElementById("priceMin")?.value;
    const maxP = document.getElementById("priceMax")?.value;
    if (minP) params.set("priceMin", minP);
    if (maxP) params.set("priceMax", maxP);
    const res = await api.get(`/products?${params}`);
    products = res.products;
    renderProducts(products);
    renderPagination(res);
  } catch {
    document.getElementById("productsGrid").innerHTML =
      `<p style="color:var(--text-muted);text-align:center;padding:40px;grid-column:1/-1">تعذر تحميل المنتجات</p>`;
  }
}

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">🛍️</div><h3>لا توجد منتجات</h3></div>`;
    return;
  }

  grid.innerHTML = list.map((p, idx) => {
    const imgs = p.images || [];
    const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const inCart = cart.find(i => String(i._id) === String(p._id));

    let imageHTML = "";
    if (imgs.length > 1) {
      imageHTML = `
        <div class="img-slider" id="slider-${p._id}">
          ${imgs.map((src, i) => `<img src="${src}" alt="${p.name_ar}" class="${i===0?'active':''}" loading="lazy">`).join("")}
          <button class="slider-btn prev" onclick="sliderPrev(event,'${p._id}')">‹</button>
          <button class="slider-btn next" onclick="sliderNext(event,'${p._id}')">›</button>
          <div class="slider-dots">${imgs.map((_,i)=>`<span class="dot ${i===0?'active':''}" onclick="sliderGo(event,'${p._id}',${i})"></span>`).join("")}</div>
        </div>`;
    } else if (imgs.length === 1) {
      imageHTML = `<img src="${imgs[0]}" alt="${p.name_ar}" loading="lazy">`;
    } else {
      imageHTML = `<div class="no-image">📦</div>`;
    }

    return `
      <div class="product-card reveal reveal-delay-${(idx%3)+1}" onclick="openProductDetail('${p._id}')">
        <div class="product-image">
          ${imageHTML}
          ${discount>0?`<span class="badge badge-danger product-badge">-${discount}%</span>`:""}
        </div>
        <div class="product-info">
          <div class="product-category">${p.subcategory?.name_ar || p.category?.name_ar || ""}</div>
          <div class="product-name">${p.name_ar}</div>
          <div class="product-price-row">
            <div>
              ${p.oldPrice?`<span class="product-old-price">${formatPrice(p.oldPrice)}</span>`:""}
              <span class="product-price">${formatPrice(p.price)}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="product-cart-btn ${inCart?'in-cart':''}" id="cartbtn-${p._id}"
                onclick="event.stopPropagation();toggleCart('${p._id}')">
                ${inCart?"✓ في السلة":"🛒 أضف"}
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }).join("");
  initScrollReveal();
}

// ===== PRODUCT DETAIL MODAL =====
function openProductDetail(id) {
  const product = products.find(p => String(p._id) === String(id));
  if (!product) { console.warn('Product not found:', id); return; }

  const overlay = document.getElementById("productDetailOverlay");
  const body = document.getElementById("productDetailBody");
  const imgs = product.images || [];
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const inCart = cart.find(i => String(i._id) === String(product._id));
  const whatsapp = settings.contact?.whatsapp || "";
  const msg = `مرحباً، أريد الاستفسار عن: ${product.name_ar}\nالسعر: ${formatPrice(product.price)}`;

  const mainImg = imgs[0] || "";
  const thumbsHTML = imgs.length > 1 ? `
    <div class="product-modal-thumbs">
      ${imgs.map((src,i) => `
        <div class="product-modal-thumb ${i===0?'active':''}" onclick="switchModalImg('${id}',${i},this)">
          <img src="${src}" alt="" loading="lazy">
        </div>`).join("")}
    </div>` : "";

  body.innerHTML = `
    <div class="product-modal-grid">
      <div class="product-modal-images">
        <div class="product-modal-main-img" id="modalMainImg-${id}">
          ${mainImg ? `<img src="${mainImg}" alt="${product.name_ar}" id="modalMainImgEl-${id}">` :
            `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem">📦</div>`}
        </div>
        ${thumbsHTML}
      </div>
      <div>
        <div style="font-size:0.78rem;color:var(--accent-gold);font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">
          ${product.subcategory?.name_ar || product.category?.name_ar || ""}
        </div>
        <div class="product-modal-name">${product.name_ar}</div>
        <div class="product-modal-price">
          ${product.oldPrice ? `<span class="product-modal-old-price">${formatPrice(product.oldPrice)}</span>` : ""}
          ${formatPrice(product.price)}
          ${discount > 0 ? `<span class="badge badge-danger" style="font-size:0.8rem;margin-right:8px">وفّر ${discount}%</span>` : ""}
        </div>
        ${product.description_ar ? `<div class="product-modal-desc">${product.description_ar}</div>` : ""}
        <div style="font-size:0.85rem;color:${product.stock>0?'var(--success)':'var(--danger)'};margin-bottom:16px;font-weight:700">
          ${product.stock > 0 ? `✅ متاح (${product.stock} قطعة)` : "❌ غير متاح حالياً"}
        </div>
        <div class="product-modal-actions">
          <button class="btn btn-gold" id="modalCartBtn-${id}"
            onclick="toggleCartFromModal('${id}')">
            ${inCart ? "✓ في السلة" : "🛒 أضف للسلة"}
          </button>
          <a href="${whatsappLink(whatsapp, msg)}" target="_blank"
            class="btn" style="background:rgba(37,211,102,0.1);color:#25d366;border:1.5px solid rgba(37,211,102,0.25)">
            💬 استفسار
          </a>
        </div>
      </div>
    </div>`;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeProductDetail() {
  document.getElementById("productDetailOverlay")?.classList.remove("active");
  document.body.style.overflow = "";
}

function switchModalImg(productId, idx, thumbEl) {
  const product = products.find(p => p._id === productId);
  if (!product) return;
  const imgEl = document.getElementById(`modalMainImgEl-${productId}`);
  if (imgEl) imgEl.src = product.images[idx];
  document.querySelectorAll(".product-modal-thumb").forEach((t,i) => t.classList.toggle("active", i===idx));
}

function toggleCartFromModal(id) {
  toggleCart(id);
  const inCart = cart.find(i => i._id === id);
  const btn = document.getElementById(`modalCartBtn-${id}`);
  if (btn) { btn.textContent = inCart ? "✓ في السلة" : "🛒 أضف للسلة"; }
}

// ===== IMAGE SLIDER =====
function getSliderState(id) {
  const slider = document.getElementById("slider-"+id);
  if (!slider) return null;
  const imgs = slider.querySelectorAll("img");
  const dots = slider.querySelectorAll(".dot");
  const current = [...imgs].findIndex(img => img.classList.contains("active"));
  return { slider, imgs, dots, current };
}
function sliderGo(e, id, idx) {
  e.stopPropagation();
  const s = getSliderState(id);
  if (!s) return;
  s.imgs[s.current].classList.remove("active"); s.dots[s.current].classList.remove("active");
  s.imgs[idx].classList.add("active"); s.dots[idx].classList.add("active");
}
function sliderNext(e, id) { e.stopPropagation(); const s=getSliderState(id); if(!s) return; sliderGo(e,id,(s.current+1)%s.imgs.length); }
function sliderPrev(e, id) { e.stopPropagation(); const s=getSliderState(id); if(!s) return; sliderGo(e,id,(s.current-1+s.imgs.length)%s.imgs.length); }

// ===== CART =====
function toggleCart(productId) {
  const idx = cart.findIndex(i => String(i._id) === String(productId));
  const product = products.find(p => String(p._id) === String(productId));
  if (!product) return;
  if (idx > -1) {
    cart.splice(idx, 1);
  } else {
    cart.push({ _id: product._id, name: product.name_ar, price: product.price, qty: 1, image: product.images?.[0]||"" });
  }
  saveCart(); updateCartBadge();
  const btn = document.getElementById("cartbtn-"+productId);
  if (btn) { const inCart = cart.find(i=>i._id===productId); btn.textContent=inCart?"✓ في السلة":"🛒 أضف"; btn.classList.toggle("in-cart",!!inCart); }
}
function saveCart() { localStorage.setItem("shop_cart", JSON.stringify(cart)); }
function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  const total = cart.reduce((s,i)=>s+i.qty,0);
  if (badge) { badge.textContent=total; badge.style.display=total>0?"flex":"none"; }
}
function openCart() { renderCartPanel(); document.getElementById("cartPanel")?.classList.add("open"); document.getElementById("cartOverlay")?.classList.add("active"); document.body.style.overflow="hidden"; }
function closeCart() { document.getElementById("cartPanel")?.classList.remove("open"); document.getElementById("cartOverlay")?.classList.remove("active"); document.body.style.overflow=""; }

function renderCartPanel() {
  const el = document.getElementById("cartItems");
  if (!el) return;
  if (!cart.length) {
    el.innerHTML=`<div class="empty-state" style="padding:40px"><div class="empty-state-icon">🛒</div><h3>السلة فارغة</h3><p>أضف منتجات أولاً</p></div>`;
    document.getElementById("cartFooter").style.display="none"; return;
  }
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.image?`<img src="${item.image}" alt="">`:`<span style="font-size:1.4rem">📦</span>`}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      </div>
      <div class="cart-item-qty">
        <button onclick="changeQty('${item._id}',-1)">−</button>
        <span>${item.qty}</span>
        <button onclick="changeQty('${item._id}',1)">+</button>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item._id}')">✕</button>
    </div>`).join("");
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  document.getElementById("cartTotalAmount").textContent = formatPrice(total);
  document.getElementById("cartFooter").style.display="block";
}

function changeQty(id, delta) {
  const item = cart.find(i=>i._id===id);
  if (!item) return;
  item.qty = Math.max(1, item.qty+delta);
  saveCart(); updateCartBadge(); renderCartPanel();
}
function removeFromCart(id) {
  cart = cart.filter(i=>i._id!==id);
  saveCart(); updateCartBadge(); renderCartPanel();
  const btn = document.getElementById("cartbtn-"+id);
  if (btn) { btn.textContent="🛒 أضف"; btn.classList.remove("in-cart"); }
}
function clearCart() {
  cart = []; saveCart(); updateCartBadge(); renderCartPanel();
  document.querySelectorAll(".product-cart-btn.in-cart").forEach(btn=>{ btn.textContent="🛒 أضف"; btn.classList.remove("in-cart"); });
}

// ===== CHECKOUT =====
let selectedMethod = null;

async function openCheckout() {
  try {
    const fresh = await api.get("/settings");
    settings.paymentMethods = (fresh && Array.isArray(fresh.paymentMethods)) ? fresh.paymentMethods : [];
  } catch (_) {
    settings.paymentMethods = [];
  }
  renderCheckoutContent();
  document.getElementById("checkoutModal")?.classList.add("active");
}
function closeCheckout() { document.getElementById("checkoutModal")?.classList.remove("active"); }

function renderCheckoutContent() {
  const el = document.getElementById("checkoutContent");
  if (!el) return;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const methods = getActivePaymentMethods();
  const whatsapp = settings.contact?.whatsapp || "";
  const orderLines = cart.map(i => `${i.name} x${i.qty} = ${i.price * i.qty} جنيه`).join("\n");

  let methodsHTML;
  if (!methods.length) {
    methodsHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.85rem">❌ لا توجد طرق دفع متاحة حالياً</div>`;
  } else {
    methodsHTML = methods.map((m, idx) => {
      const mid = "pm-" + idx;
      const iconHtml = getPaymentIconHtml(m.icon);
      let deepLinkBtn = "";
      if (m.paymentUrl) {
        const url = m.paymentUrl.replace(/'/g, "\\'");
        deepLinkBtn = `<button class="deep-link-btn" onclick="event.stopPropagation(); attemptDeepLink('${url}', 'إذا لم يتم فتح التطبيق، أرسل الطلب عبر واتساب')" style="margin-top:4px">🚀 ادفع الآن</button>`;
      } else if (m.code) {
        deepLinkBtn = `<button class="deep-link-btn" onclick="event.stopPropagation(); handlePaymentCode('${mid}')" style="margin-top:4px">💳 ادفع الآن</button>`;
      }
      return `
        <div class="checkout-method" id="method-${mid}" data-method-id="${mid}" onclick="selectPaymentMethod('${mid}')">
          <div class="checkout-method-icon" style="background:rgba(249,168,212,0.1);color:var(--accent-gold)">${iconHtml}</div>
          <div class="checkout-method-info">
            <div class="checkout-method-name">${m.name}</div>
            <div class="checkout-method-detail">${m.instructions ? m.instructions.replace(/\n/g, '<br>') : ''}</div>
            ${deepLinkBtn}
          </div>
          <div class="checkout-method-check" id="check-${mid}"></div>
        </div>`;
    }).join("");
  }

  el.innerHTML = `
    <div style="background:var(--bg-secondary);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:6px;font-size:0.9rem">📋 ملخص الطلب</div>
      <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.8">
        ${cart.map(i => `${i.name} × ${i.qty} = <strong>${formatPrice(i.price * i.qty)}</strong>`).join("<br>")}
      </div>
      <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;font-size:1rem;font-weight:900;color:var(--accent-gold)">
        الإجمالي: ${formatPrice(total)}
      </div>
    </div>

    <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:12px;font-size:0.9rem">👤 بياناتك</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <div class="form-label" style="font-size:0.75rem;margin-bottom:4px">الاسم الكامل *</div>
          <input id="coName" class="form-input" placeholder="محمد أحمد" style="font-size:0.85rem;padding:8px 10px">
        </div>
        <div>
          <div class="form-label" style="font-size:0.75rem;margin-bottom:4px">رقم الهاتف *</div>
          <input id="coPhone" class="form-input" placeholder="01xxxxxxxxx" dir="ltr" style="font-size:0.85rem;padding:8px 10px">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <div class="form-label" style="font-size:0.75rem;margin-bottom:4px">المحافظة *</div>
          <select id="coGov" class="form-input" style="font-size:0.85rem;padding:8px 10px">
            <option value="">اختر المحافظة</option>
            ${["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "أسوان", "أسيوط", "بني سويف", "بورسعيد", "دمياط", "الشرقية", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهاج"].map(g => `<option value="${g}">${g}</option>`).join("")}
          </select>
        </div>
        <div>
          <div class="form-label" style="font-size:0.75rem;margin-bottom:4px">المدينة / المركز *</div>
          <input id="coCity" class="form-input" placeholder="مثال: المعادي" style="font-size:0.85rem;padding:8px 10px">
        </div>
      </div>
      <div style="margin-bottom:10px">
        <div class="form-label" style="font-size:0.75rem;margin-bottom:4px">الشارع والعنوان بالتفصيل *</div>
        <input id="coStreet" class="form-input" placeholder="مثال: شارع التحرير، بجوار مسجد النور، عمارة 5 شقة 3" style="font-size:0.85rem;padding:8px 10px">
      </div>
      <div>
        <div class="form-label" style="font-size:0.75rem;margin-bottom:4px">علامة مميزة (اختياري)</div>
        <input id="coLandmark" class="form-input" placeholder="مثال: بجوار محطة المترو، أمام البنك" style="font-size:0.85rem;padding:8px 10px">
      </div>
    </div>

    <div style="font-weight:700;margin-bottom:10px;font-size:0.9rem">💳 طريقة الدفع:</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${methodsHTML}
    </div>

    <div id="checkoutWhatsappBtn" style="margin-top:16px;display:none">
      <button class="btn btn-gold" style="width:100%;justify-content:center;font-size:0.9rem;padding:11px" onclick="sendOrderWhatsapp()">
        💬 أرسل الطلب عبر واتساب
      </button>
      <p id="checkoutHint" style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-top:6px">اختر طريقة الدفع للإرسال</p>
    </div>`;

  selectedMethod = null;
}

function selectPaymentMethod(mid) {
  selectedMethod = mid;
  document.querySelectorAll(".checkout-method").forEach(m => m.classList.remove("selected"));
  document.querySelectorAll("[id^='check-']").forEach(c => { c.innerHTML = ""; c.style.borderColor = "var(--border)"; });
  const el = document.getElementById("method-" + mid);
  const check = document.getElementById("check-" + mid);
  if (el) el.classList.add("selected");
  if (check) { check.innerHTML = "✓"; check.style.borderColor = "var(--accent-gold)"; check.style.color = "var(--accent-gold)"; }
  const btn = document.getElementById("checkoutWhatsappBtn");
  if (btn) btn.style.display = "block";
  const hint = document.getElementById("checkoutHint");
  if (hint) {
    const methods = getActivePaymentMethods();
    const idx = parseInt(mid.replace("pm-", ""));
    const m = methods[idx];
    if (m) {
      if (m.type === "cod") hint.textContent = "ستنتقل لواتساب لإتمام الطلب";
      else if (m.code) hint.textContent = "انسخ كود الدفع وأكمله في تطبيق فوري";
      else if (m.paymentUrl) hint.textContent = "ادفع عبر الرابط ثم أرسل الطلب عبر واتساب";
      else hint.textContent = "ستنتقل لواتساب لإتمام الطلب";
    }
  }
}

// ===== DEEP LINK UTILITY =====
function attemptDeepLink(url, fallbackMessage) {
  if (!url) return false;
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    if (fallbackMessage) setTimeout(() => showToast(fallbackMessage, 'info'), 900);
    return true;
  } catch (e) {
    if (fallbackMessage) setTimeout(() => showToast(fallbackMessage, 'info'), 900);
    return false;
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed"; ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
}

function handlePaymentCode(mid) {
  const methods = getActivePaymentMethods();
  const idx = parseInt(mid.replace("pm-", ""));
  const method = methods[idx];
  if (!method || !method.code) return;
  copyToClipboard(method.code);
  showToast("تم نسخ رقم الدفع بنجاح ✅", "success");
  showPaymentCodeOverlay({
    name: method.name,
    code: method.code,
    instructions: method.instructions || '',
    paymentUrl: method.paymentUrl || '',
    whatsappLink: '#',
    orderNumber: '',
  });
}

async function sendOrderWhatsapp() {
  if (!selectedMethod) {
    showToast('من فضلك اختر طريقة دفع أولاً', 'error');
    return;
  }
  const methods = getActivePaymentMethods();
  const idx = parseInt(selectedMethod.replace("pm-", ""));
  const method = methods[idx];
  if (!method) { showToast('طريقة الدفع غير موجودة', 'error'); return; }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const whatsapp = settings.contact?.whatsapp || "";

  const name = document.getElementById("coName")?.value.trim();
  const phone = document.getElementById("coPhone")?.value.trim();
  const gov = document.getElementById("coGov")?.value;
  const city = document.getElementById("coCity")?.value.trim();
  const street = document.getElementById("coStreet")?.value.trim();
  const landmark = document.getElementById("coLandmark")?.value.trim();

  if (!name) { showToast("من فضلك أدخل اسمك الكامل", "error"); document.getElementById("coName").focus(); return; }
  if (!phone) { showToast("من فضلك أدخل رقم الهاتف", "error"); document.getElementById("coPhone").focus(); return; }
  if (!gov) { showToast("من فضلك اختر المحافظة", "error"); document.getElementById("coGov").focus(); return; }
  if (!city) { showToast("من فضلك أدخل المدينة أو المركز", "error"); document.getElementById("coCity").focus(); return; }
  if (!street) { showToast("من فضلك أدخل العنوان بالتفصيل", "error"); document.getElementById("coStreet").focus(); return; }

  const btn = document.querySelector("#checkoutWhatsappBtn button");
  if (btn) { btn.textContent = "⏳ جاري الحفظ..."; btn.disabled = true; }

  let orderNumber = "";
  try {
    const res = await api.post("/orders", {
      items: cart.map(i => ({ productId: i._id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
      total,
      paymentMethod: method.name,
      paymentMethodName: method.name,
      customerName: name,
      customerPhone: phone,
      customerAddress: { governorate: gov, city, street, landmark },
    });
    orderNumber = res.orderNumber;
  } catch (err) {
    showToast(err.message || "حصل خطأ أثناء الحفظ", "error");
    if (btn) { btn.textContent = "💬 أرسل الطلب عبر واتساب"; btn.disabled = false; }
    return;
  }

  const addressLine = `${gov}، ${city}، ${street}${landmark ? "، " + landmark : ""}`;
  const orderLines = cart.map(i => `${i.name} x${i.qty} = ${i.price * i.qty} جنيه`).join("\n");
  const msg = `🛍️ *طلب جديد - على ضمانتي*\n`
    + (orderNumber ? `📋 *رقم الطلب:* ${orderNumber}\n` : "")
    + `\n👤 *بيانات العميل:*\n`
    + `• الاسم: ${name}\n`
    + `• الهاتف: ${phone}\n`
    + `• العنوان: ${addressLine}\n`
    + `\n📦 *المنتجات:*\n${orderLines}\n\n`
    + `💰 *الإجمالي:* ${total} جنيه\n`
    + `💳 *طريقة الدفع:* ${method.name}`;

  // ── Methods with a paymentUrl only (no code): open the link first ──
  if (method.paymentUrl && !method.code) {
    attemptDeepLink(method.paymentUrl, 'إذا لم يتم فتح التطبيق، أرسل الطلب عبر واتساب');
  }

  // ── Methods with a code (Fawry-style): copy + show overlay ──
  if (method.code) {
    copyToClipboard(method.code);
    showToast("تم نسخ رقم الدفع بنجاح ✅", "success");
    showPaymentCodeOverlay({
      name: method.name,
      code: method.code,
      instructions: method.instructions || '',
      paymentUrl: method.paymentUrl || '',
      whatsappLink: whatsappLink(whatsapp, msg),
      orderNumber,
    });
  }

  // ── Default: open WhatsApp directly ────────────────────────────
  window.open(whatsappLink(whatsapp, msg), "_blank");
  closeCheckout();
  closeCart();
  clearCart();
  showToast(`تم إرسال الطلب ${orderNumber} ✅`, "success");
  if (method.type !== "cod") {
    showToast('📤 بعد التحويل، أرسل صورة الإيصال في محادثة واتساب لتأكيد الدفع', 'info');
  }
}

// ===== PAYMENT CODE OVERLAY =====
function showPaymentCodeOverlay({ name, code, instructions, paymentUrl, whatsappLink, orderNumber }) {
  const safeCode = (code || '').replace(/'/g, "\\'");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay active";
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;text-align:center">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h3 style="margin-bottom:4px">💳 ${name || 'الدفع بالكود'}</h3>
      <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">انسخ الكود وأكمله في التطبيق</p>
      <div style="background:var(--bg-primary);border:2px dashed var(--accent-gold);border-radius:var(--radius);padding:20px;margin:0 0 14px">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px">رقم الدفع</div>
        <div style="font-size:1.8rem;font-weight:900;letter-spacing:4px;direction:ltr;color:var(--accent-gold);word-break:break-all">${code || 'غير متاح'}</div>
        <button onclick="copyToClipboard('${safeCode}'); showToast('تم نسخ رقم الدفع بنجاح ✅','success')" style="margin-top:10px;padding:6px 16px;border:1px solid var(--accent-gold);border-radius:6px;background:transparent;color:var(--accent-gold);font-size:0.82rem;cursor:pointer;font-family:'Cairo',sans-serif">📋 نسخ الرقم</button>
      </div>
      ${instructions ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:14px">${instructions.replace(/\n/g, '<br>')}</p>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${paymentUrl ? `<a href="${paymentUrl}" target="_blank" class="btn" style="flex:1;justify-content:center;font-size:0.82rem;min-width:120px">🌐 فتح موقع فوري</a>` : ''}
        <a href="${whatsappLink || '#'}" target="_blank" class="btn btn-gold" style="flex:1;justify-content:center;font-size:0.85rem;min-width:120px">💬 أرسل الإيصال</a>
        <button class="btn" style="flex:0;justify-content:center;font-size:0.85rem;min-width:80px" onclick="this.closest('.modal-overlay').remove()">تم</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

// ===== PAYMENT SECTION =====
function renderPaymentSection(payment) {
  const grid = document.getElementById("paymentGrid");
  if (!grid) return;
  const methods = (payment.paymentMethods || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  grid.innerHTML = methods.map(m => `
    <div class="payment-card">
      <div class="payment-icon" style="background:rgba(249,168,212,0.1);color:var(--accent-gold)">${getPaymentIconHtml(m.icon)}</div>
      <div class="payment-name">${m.name}</div>
      ${m.instructions ? `<div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.6">${m.instructions.replace(/\n/g, '<br>')}</div>` : ''}
      ${m.code ? `<div style="margin-top:6px;font-size:0.78rem"><strong>كود الدفع:</strong> <span style="font-family:monospace;background:var(--bg-primary);padding:2px 6px;border-radius:4px;direction:ltr;display:inline-block">${m.code}</span></div>` : ''}
      ${m.paymentUrl ? `<a href="${m.paymentUrl}" target="_blank" class="btn" style="margin-top:8px;font-size:0.78rem;padding:4px 12px;justify-content:center">🚀 ادفع الآن</a>` : ''}
    </div>`).join("");
}

// ===== PAGINATION =====
function renderPagination(res) {
  const el = document.getElementById("productsPagination");
  if (!el) return;
  if (res.pages <= 1) { el.innerHTML = ""; return; }
  let btns = "";
  for (let i=1; i<=res.pages; i++)
    btns+=`<button type="button" class="page-btn ${i===res.page?"active":""}" onclick="event.preventDefault();event.stopPropagation();loadProducts(${i})">${i}</button>`;
  el.innerHTML=`<div style="display:flex;justify-content:center;gap:8px;margin-top:32px">${btns}</div>`;
}

// ===== FILTERS =====
function toggleFilters() {
  const bar = document.getElementById("filterBar");
  if (bar) bar.style.display = bar.style.display === "none" ? "block" : "none";
}

let filterTimer;
function applyFilters() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => loadProducts(1), 500);
}

function resetFilters() {
  const sort = document.getElementById("sortSelect");
  const min = document.getElementById("priceMin");
  const max = document.getElementById("priceMax");
  if (sort) sort.value = "";
  if (min) min.value = "";
  if (max) max.value = "";
  loadProducts(1);
}
// ===== SEARCH =====
let searchTimer;

// ===== DOM READY =====
document.addEventListener("DOMContentLoaded", () => {
  renderCategoriesSkeleton();

  // Click search icon to focus the search input (both desktop and mobile)
  document.querySelectorAll(".search-icon").forEach(icon => {
    icon.addEventListener("click", () => {
      const parent = icon.closest(".navbar-search, .mobile-menu-search");
      const input = parent?.querySelector("input");
      if (input) { input.focus(); }
    });
  });

  document.getElementById("navSearch")?.addEventListener("input", e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    searchTimer = setTimeout(async () => {
      if (!q) { loadProducts(1); return; }
      try {
        renderProductsSkeleton();
        const res = await api.get(`/products?search=${encodeURIComponent(q)}&active=true&limit=20`);
        renderProducts(res.products);
      } catch {}
    }, 400);
  });

  window.addEventListener("scroll", () => {
    document.getElementById("navbar")?.classList.toggle("scrolled", window.scrollY > 50);
  });

  document.querySelectorAll('.modal-overlay, .product-detail-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if(e.target===overlay) { overlay.classList.remove('active'); document.body.style.overflow=""; } });
  });

  // Refresh settings when page gains focus (admin may have updated payment methods)
  async function refreshSettings() {
    try {
      const fresh = await api.get("/settings");
      settings.paymentMethods = (fresh && Array.isArray(fresh.paymentMethods)) ? fresh.paymentMethods : [];
      applySiteSettings();
    } catch (_) {}
  }

  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshSettings(); });
  window.addEventListener("focus", refreshSettings);

  init();
});