const Product = require("../models/Product");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");

const PRODUCTS_FOLDER = "shop/products";

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { category, subcategory, search, page = 1, limit = 12, active, priceMin, priceMax, sortBy, sortOrder } = req.query;
    const query = {};

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (active !== undefined) query.isActive = active === "true";
    if (search) {
      query.$or = [
        { name_ar: { $regex: search, $options: "i" } },
        { description_ar: { $regex: search, $options: "i" } },
      ];
    }

    if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) };
    if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) };

    let sortObj = { createdAt: 1 };
    if (sortBy) sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category", "name_ar slug")
      .populate("subcategory", "name_ar slug")
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/products/:id
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category").populate("subcategory");
    if (!product) return res.status(404).json({ message: "المنتج مش موجود" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    if ("isActive" in data) data.isActive = data.isActive === "true" || data.isActive === true;
    if (data.subcategory === "" || data.subcategory === "null") delete data.subcategory;

    if (req.files && req.files.length > 0) {
      const uploads = req.files.map((f) => uploadToCloudinary(f.buffer, PRODUCTS_FOLDER));
      data.images = await Promise.all(uploads);
    } else {
      data.images = [];
    }

    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "المنتج مش موجود" });

    const keepImages = req.body.keepImages ? JSON.parse(req.body.keepImages) : product.images;

    const oldImages = product.images || [];
    const removed = oldImages.filter((url) => !keepImages.includes(url));
    await Promise.all(removed.map((url) => deleteFromCloudinary(url)));

    let newImages = [];
    if (req.files && req.files.length > 0) {
      const uploads = req.files.map((f) => uploadToCloudinary(f.buffer, PRODUCTS_FOLDER));
      newImages = await Promise.all(uploads);
    }

    const data = { ...req.body };
    if ("isActive" in data) data.isActive = data.isActive === "true" || data.isActive === true;
    if (data.subcategory === "" || data.subcategory === "null") data.subcategory = null;
    delete data.keepImages;
    Object.assign(product, data);
    product.images = [...keepImages, ...newImages];
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "المنتج مش موجود" });
    if (product.images && product.images.length > 0) {
      await Promise.all(product.images.map((url) => deleteFromCloudinary(url)));
    }
    res.json({ message: "تم حذف المنتج" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/products/:id/toggle
const toggleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "المنتج مش موجود" });
    product.isActive = !product.isActive;
    await product.save();
    res.json({ isActive: product.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, toggleProduct };
