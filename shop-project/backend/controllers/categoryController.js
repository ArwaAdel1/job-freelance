const Category = require("../models/Category");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");

const CATEGORIES_FOLDER = "shop/categories";

function slugify(text) {
  const arabicToLatin = {
    ا: "a", أ: "a", إ: "e", آ: "a", ى: "a", ئ: "i", ؤ: "w",
    ب: "b", ت: "t", ث: "th", ج: "g", ح: "h", خ: "kh",
    د: "d", ذ: "th", ر: "r", ز: "z", س: "s", ش: "sh",
    ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh",
    ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
    ه: "h", و: "w", ي: "y", ة: "h",
  };
  let result = "";
  for (const ch of text) {
    result += arabicToLatin[ch] || ch;
  }
  return result
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
}

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/categories
const createCategory = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.slug || !data.slug.trim()) {
      data.slug = slugify(data.name_ar);
    }
    if (!data.slug) {
      return res.status(400).json({ message: "فشل إنشاء الرابط المختصر (slug)" });
    }
    data.slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (data.order === undefined || data.order === null) {
      const maxOrder = await Category.findOne().sort({ order: -1 }).select("order");
      data.order = (maxOrder?.order ?? 0) + 1;
    }
    const category = await Category.create(data);
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "الرابط المختصر (slug) مستخدم من قبل، اختر اسماً مختلفاً" });
    }
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.slug;
    const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: "القسم مش موجود" });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const hasChildren = await Category.countDocuments({ parent: req.params.id });
    if (hasChildren > 0) {
      return res.status(400).json({ message: "لا يمكن حذف قسم لديه أقسام فرعية. احذف الأقسام الفرعية أولاً." });
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "القسم مش موجود" });
    if (category.icon) {
      await deleteFromCloudinary(category.icon);
    }
    res.json({ message: "تم حذف القسم" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/categories/upload-icon
const uploadCategoryIcon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "من فضلك اختر صورة" });
    }
    const url = await uploadToCloudinary(req.file.buffer, CATEGORIES_FOLDER);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, uploadCategoryIcon };
