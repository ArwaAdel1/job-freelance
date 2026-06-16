# 🛒 متجر إلكتروني احترافي

## هيكل المشروع

```
shop/
├── backend/
│   ├── config/
│   │   ├── db.js            ← إعداد MongoDB
│   │   └── seed.js          ← بيانات أولية (أقسام + admin)
│   ├── models/
│   │   ├── Product.js       ← موديل المنتجات
│   │   ├── Category.js      ← موديل الأقسام
│   │   ├── Admin.js         ← موديل المدير
│   │   └── SiteSettings.js  ← إعدادات الموقع
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── categoryController.js
│   │   └── settingsController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── categoryRoutes.js
│   │   └── settingsRoutes.js
│   ├── middleware/
│   │   ├── auth.js          ← JWT middleware
│   │   └── upload.js        ← Multer للصور
│   ├── server.js
│   └── package.json
└── frontend/
    ├── css/
    │   ├── main.css         ← المتغيرات والأساس
    │   ├── home.css         ← صفحة الهوم
    │   └── dashboard.css    ← لوحة التحكم
    ├── js/
    │   ├── api.js           ← التواصل مع الـ API
    │   ├── home.js          ← منطق الهوم
    │   └── dashboard.js     ← منطق الداش بورد
    ├── index.html           ← صفحة الهوم
    └── dashboard.html       ← لوحة التحكم
```

## خطوات التشغيل

### 1. إعداد البيئة
```bash
cd backend
cp .env.example .env
# عدّل .env وضع MONGO_URI الخاصة بيك
```

### 2. تثبيت الـ packages
```bash
cd backend
npm install
```

### 3. تشغيل الـ seed (أقسام + admin)
```bash
npm run seed
```

### 4. تشغيل السيرفر
```bash
npm run dev   # development
npm start     # production
```

### 5. فتح المتجر
- **الهوم:** http://localhost:5000
- **لوحة التحكم:** http://localhost:5000/dashboard.html
- **بيانات الدخول:** admin / admin123

## API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | تسجيل الدخول |
| GET | /api/auth/me | بيانات المدير |

### Products
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/products | كل المنتجات (مع فلاتر) |
| GET | /api/products/:id | منتج محدد |
| POST | /api/products | إضافة منتج 🔒 |
| PUT | /api/products/:id | تعديل منتج 🔒 |
| DELETE | /api/products/:id | حذف منتج 🔒 |
| PATCH | /api/products/:id/toggle | إخفاء/إظهار 🔒 |

**Query params للـ GET:**
- `category` - فلتر بالقسم
- `subcategory` - فلتر بالقسم الفرعي
- `featured=true` - المنتجات المميزة
- `active=true` - المنتجات النشطة
- `search` - بحث نصي
- `page` - رقم الصفحة
- `limit` - عدد النتائج

### Categories
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/categories | كل الأقسام |
| POST | /api/categories | إضافة قسم 🔒 |
| PUT | /api/categories/:id | تعديل قسم 🔒 |
| DELETE | /api/categories/:id | حذف قسم 🔒 |

### Settings
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/settings | إعدادات الموقع |
| PUT | /api/settings | تحديث الإعدادات 🔒 |

🔒 = يحتاج JWT token

## الأقسام الجاهزة
الإلكترونيات، المنزل والمطبخ، الأزياء، الجمال، المواد الغذائية، الألعاب، المكتبة، الهدايا — مع كل الأقسام الفرعية المذكورة.

## طرق الدفع
فودافون كاش، اتصالات كاش، فوري، إنستا باي — بدون API keys، الزبون يدفع يدوي ويرسل الإيصال على واتساب.
