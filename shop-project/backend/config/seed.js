require("dotenv").config();
const connectDB = require("./db");
const Category = require("../models/Category");
const Admin = require("../models/Admin");
const SiteSettings = require("../models/SiteSettings");
const Product = require("../models/Product");

const mainCategories = [
  { name_ar: "الإلكترونيات", slug: "electronics", order: 1, description_ar: "أجهزة إلكترونية وملحقاتها", icon: "https://cdn-icons-png.flaticon.com/512/3659/3659894.png" },
  { name_ar: "المنزل والمطبخ", slug: "home-kitchen", order: 2, description_ar: "أدوات منزلية ومطبخية", icon: "https://cdn-icons-png.flaticon.com/512/2535/2535022.png" },
  { name_ar: "الأزياء والموضة", slug: "fashion", order: 3, description_ar: "ملابس وإكسسوارات", icon: "https://cdn-icons-png.flaticon.com/512/6981/6981715.png" },
  { name_ar: "الجمال والعناية", slug: "beauty", order: 4, description_ar: "منتجات العناية والجمال", icon: "https://cdn-icons-png.flaticon.com/512/2810/2810054.png" },
  { name_ar: "المواد الغذائية", slug: "food", order: 5, description_ar: "مواد غذائية ومنتجات طبيعية", icon: "https://cdn-icons-png.flaticon.com/512/2921/2921822.png" },
  { name_ar: "الألعاب والترفيه", slug: "toys", order: 6, description_ar: "ألعاب وترفيه", icon: "https://cdn-icons-png.flaticon.com/512/6858/6858504.png" },
  { name_ar: "المكتبة", slug: "library", order: 7, description_ar: "كتب ومطبوعات", icon: "https://cdn-icons-png.flaticon.com/512/2232/2232688.png" },
  { name_ar: "الهدايا والمناسبات", slug: "gifts", order: 8, description_ar: "هدايا ومناسبات", icon: "https://cdn-icons-png.flaticon.com/512/3062/3062634.png" },
];

const subcategoryDefs = [
  {
    parentSlug: "electronics", children: [
      { name_ar: "الهواتف الذكية", slug: "smartphones", order: 1 },
      { name_ar: "التابلت", slug: "tablets", order: 2 },
      { name_ar: "اللابتوبات", slug: "laptops", order: 3 },
      { name_ar: "السماعات", slug: "headphones", order: 4 },
      { name_ar: "الساعات الذكية", slug: "smartwatches", order: 5 },
      { name_ar: "ملحقات", slug: "accessories", order: 6 },
    ]
  },
  {
    parentSlug: "fashion", children: [
      { name_ar: "رجال", slug: "men", order: 1 },
      { name_ar: "نساء", slug: "women", order: 2 },
      { name_ar: "أطفال", slug: "kids", order: 3 },
    ]
  },
  {
    parentSlug: "food", children: [
      { name_ar: "زيت زيتون", slug: "olive-oil", order: 1 },
      { name_ar: "عسل نحل", slug: "honey", order: 2 },
      { name_ar: "تلبينة", slug: "talbina", order: 3 },
      { name_ar: "قهوة", slug: "coffee", order: 4 },
    ]
  },
];

const seed = async () => {
  await connectDB();
  try {
    // ── Categories (main + sub) ──────────────────────────────────
    await Category.deleteMany({});
    const mainDocs = await Category.insertMany(mainCategories);
    const catMap = {};
    mainDocs.forEach((doc) => { catMap[doc.slug] = doc._id; });

    const subDocs = [];
    for (const def of subcategoryDefs) {
      const parentId = catMap[def.parentSlug];
      if (!parentId) {
        console.warn(`⚠ Parent slug "${def.parentSlug}" not found, skipping`);
        continue;
      }
      for (const child of def.children) {
        subDocs.push({ ...child, parent: parentId });
      }
    }
    const subDocResults = await Category.insertMany(subDocs);
    subDocResults.forEach((doc) => { catMap[doc.slug] = doc._id; });
    console.log(`✅ Categories: ${mainDocs.length} main + ${subDocResults.length} sub`);

    // ── Admin ────────────────────────────────────────────────────
    await Admin.deleteMany({});
    await Admin.create({ username: "admin", password: "admin123", role: "superadmin" });
    console.log("✅ Admin: admin / admin123");

    // ── Settings - على ضمانتي ────────────────────────────────────
    await SiteSettings.deleteMany({});
    const s = new SiteSettings({
      siteName_ar: "على ضمانتي",
      siteName_en: "Ala Damanty",
      heroTitle_ar: "على ضمانتي",
      heroSubtitle_ar: "مشترياتك على ضمانتي (أبوعبدالملك) وأسعارنا تنافسية",
      aboutUs_ar: "متجر على ضمانتي - نوفر لكم أفضل المنتجات بأسعار تنافسية مع ضمان الجودة",
      footerText_ar: "جميع الحقوق محفوظة © 2025 | على ضمانتي | للشكاوى: 201144586660+",
      contact: {
        phone: "01144586660",
        whatsapp: "201144586660",
        email: "fares.alandals@gmail.com",
        address_ar: "مصر",
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        tiktok: "https://t.me/MS_Acountant",
      },
      paymentMethods: [
        {
          name: "فودافون كاش",
          type: "wallet",
          isActive: true,
          order: 1,
          icon: "https://images.icon-icons.com/167/PNG/512/vodafone_23180.png",
          instructions: "رقم: 01029121146 — باسم: أبوعبدالملك\nحول المبلغ للحساب ثم أرسل إيصال الدفع عبر واتساب",
        },
        {
          name: "اتصالات كاش",
          type: "wallet",
          isActive: true,
          order: 2,
          icon: "https://img.icons8.com/color/512w/etisalalt.png",
          instructions: "رقم: 01144586660 — باسم: أبوعبدالملك\nحول المبلغ للحساب ثم أرسل إيصال الدفع عبر واتساب",
        },
        {
          name: "فوري",
          type: "online",
          isActive: true,
          order: 3,
          icon: "https://www.fawry.com/wp-content/uploads/2022/08/myfawry_c-2-e1727011499863-233x300.png",
          code: "01144586660",
          paymentUrl: "https://www.fawry.com/",
          instructions: "ادخل كود الدفع في تطبيق فوري أو الموقع",
        },
        {
          name: "إنستا باي",
          type: "online",
          isActive: true,
          order: 4,
          icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYQYiDqi-HHmWw4fAj7JzzOHAXnabcTYytFA&s",
          paymentUrl: "https://ipn.eg/S/msabouzeidmsr/instapay/72fAcU",
          instructions: "حول على instapay — msabouzeidmsr\nأو استخدم الرابط: https://ipn.eg/S/msabouzeidmsr/instapay/72fAcU",
        },
        {
          name: "الدفع عند الاستلام",
          type: "cod",
          isActive: true,
          order: 5,
          icon: "https://img.icons8.com/ios7/600w/cash-on-delivery.png",
          instructions: "سيتم تحصيل المبلغ عند استلام الطلب",
        },
      ],
    });
    await s.save();
    console.log("✅ Settings: على ضمانتي");

    // ── Products ─────────────────────────────────────────────────
    await Product.deleteMany({});
    const sampleProducts = [
      {
        name_ar: "سماعة بلوتوث لاسلكية",
        description_ar: "سماعة بلوتوث عالية الجودة مع صوت نقي وبطارية تدوم 24 ساعة",
        price: 350, oldPrice: 500, stock: 15,
        category: catMap["electronics"],
        subcategory: catMap["headphones"],
        images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"],
        isActive: true,
      },
      {
        name_ar: "ساعة ذكية مقاومة للماء",
        description_ar: "ساعة ذكية متعددة المزايا مع متابعة الصحة وقياس ضغط الدم",
        price: 850, oldPrice: 1200, stock: 8,
        category: catMap["electronics"],
        subcategory: catMap["smartwatches"],
        images: [
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
          "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500",
        ],
        isActive: true,
      },
      {
        name_ar: "هاتف ذكي 128GB",
        description_ar: "هاتف ذكي بشاشة AMOLED وكاميرا 108 ميجابكسل وبطارية 5000 مللي أمبير",
        price: 4500, oldPrice: 5500, stock: 5,
        category: catMap["electronics"],
        subcategory: catMap["smartphones"],
        images: [
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
          "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=500",
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
        ],
        isActive: true,
      },
      {
        name_ar: "لابتوب محمول 15.6 بوصة",
        description_ar: "لابتوب خفيف الوزن بمعالج قوي وذاكرة 8GB رام وقرص صلب 256GB",
        price: 6500, oldPrice: 7800, stock: 3,
        category: catMap["electronics"],
        subcategory: catMap["laptops"],
        images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500"],
        isActive: true,
      },
      {
        name_ar: "خلاط كهربائي متعدد السرعات",
        description_ar: "خلاط قوي 1000 واط لتحضير العصائر والمشروبات بسرعات متعددة",
        price: 280, oldPrice: 380, stock: 20,
        category: catMap["home-kitchen"],
        images: ["https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500"],
        isActive: true,
      },
      {
        name_ar: "إدناء ماليزي محجبات",
        description_ar: "إدناء محجبات ماليزي ضبل 4 قطع بيزيك كم + خمار ضبل مثلث + نقاب استك + شريط للجبهة",
        price: 120, oldPrice: 180, stock: 30,
        category: catMap["fashion"],
        subcategory: catMap["women"],
        images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500"],
        isActive: true,
      },
      {
        name_ar: "عسل نحل طبيعي 500جم",
        description_ar: "عسل نحل طبيعي 100% من مناحل مصرية أصيلة، غني بالفيتامينات والمعادن",
        price: 180, stock: 50,
        category: catMap["food"],
        subcategory: catMap["honey"],
        images: ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500"],
        isActive: true,
      },
      {
        name_ar: "قهوة بلاك DXN جانوديرما",
        description_ar: "قهوة صحية فاخرة مع خلاصة الجانوديرما من DXN - 30 كيس",
        price: 220, oldPrice: 280, stock: 25,
        category: catMap["food"],
        subcategory: catMap["coffee"],
        images: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500"],
        isActive: true,
      },
      {
        name_ar: "لعبة ذكاء للأطفال",
        description_ar: "لعبة تعليمية لتنمية مهارات التفكير والإبداع للأطفال من 3-10 سنوات",
        price: 95, oldPrice: 130, stock: 40,
        category: catMap["toys"],
        images: ["https://images.unsplash.com/photo-1558618047-f4e90e8be949?w=500"],
        isActive: true,
      },
      {
        name_ar: "كتاب سطر آخر - أبوعبدالملك",
        description_ar: "كتاب يأخذك نحو التغيير للمؤلف أبوعبدالملك - طبعة جديدة منقحة",
        price: 75, stock: 100,
        category: catMap["library"],
        images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500"],
        isActive: true,
      },
      {
        name_ar: "زيت زيتون بكر ممتاز 750مل",
        description_ar: "زيت زيتون بكر ممتاز عصر بارد من أجود أصناف الزيتون المصري",
        price: 160, oldPrice: 200, stock: 35,
        category: catMap["food"],
        subcategory: catMap["olive-oil"],
        images: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500"],
        isActive: true,
      },
      {
        name_ar: "حقيبة يد نسائية جلد",
        description_ar: "حقيبة يد نسائية من الجلد الطبيعي، تصميم عصري أنيق بألوان متعددة",
        price: 320, oldPrice: 450, stock: 12,
        category: catMap["fashion"],
        subcategory: catMap["women"],
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500"],
        isActive: true,
      },
      {
        name_ar: "تلبينة شعير طبيعية",
        description_ar: "تلبينة شعير طبيعية 100% غذاء النبي ﷺ - 400 جرام",
        price: 85, stock: 60,
        category: catMap["food"],
        subcategory: catMap["talbina"],
        images: ["https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500"],
        isActive: true,
      },
      {
        name_ar: "سماعة لاسلكية بلوتوث",
        description_ar: "سماعة لاسلكية مريحة للأذن مع علبة شحن - تدوم 8 ساعات",
        price: 220, oldPrice: 320, stock: 18,
        category: catMap["electronics"],
        subcategory: catMap["headphones"],
        images: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500"],
        isActive: true,
      },
    ];

    await Product.insertMany(sampleProducts);
    console.log(`✅ ${sampleProducts.length} sample products added`);

    console.log("🎉 Done!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
  process.exit();
};

seed();
