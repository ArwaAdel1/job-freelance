const Order = require("../models/Order");

// POST /api/orders — create order from storefront
const createOrder = async (req, res) => {
  try {
    const {
      items, total, paymentMethod, paymentMethodName,
      customerName, customerPhone, customerAddress, notes,
    } = req.body;

    if (!items?.length) return res.status(400).json({ message: "السلة فارغة" });

    // ── التحقق من المخزون ──────────────────────────────────────────
    const Product = require("../models/Product");
    const stockErrors = [];

    for (const item of items) {
      if (!item.productId) continue;
      const product = await Product.findById(item.productId).select("name_ar stock isActive");
      if (!product || !product.isActive) {
        stockErrors.push(`"${item.name}" لم يعد متاحاً`);
        continue;
      }
      if (product.stock < item.qty) {
        if (product.stock === 0) {
          stockErrors.push(`"${item.name}" نفذت الكمية`);
        } else {
          stockErrors.push(`"${item.name}" — الكمية المتاحة فقط ${product.stock}`);
        }
      }
    }

    if (stockErrors.length) {
      return res.status(400).json({ message: stockErrors.join(" | "), stockErrors });
    }

    // ── إنشاء الطلب ───────────────────────────────────────────────
    const order = await Order.create({
      items, total, paymentMethod, paymentMethodName,
      customerName, customerPhone, customerAddress, notes,
    });

    // ── خصم الكمية من المخزون ──────────────────────────────────────
    for (const item of items) {
      if (!item.productId) continue;
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
    }

    res.status(201).json({ orderId: order._id, orderNumber: order.orderNumber });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/orders — admin: get all orders
const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/orders/stats
const getOrderStats = async (req, res) => {
  try {
    const [total, newOrders, paid, shipped, done] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "جديد" }),
      Order.countDocuments({ status: "تم الدفع" }),
      Order.countDocuments({ status: "تم الشحن" }),
      Order.countDocuments({ status: "مكتمل" }),
    ]);
    const revenue = await Order.aggregate([
      { $match: { status: { $in: ["تم الدفع", "تم الشحن", "مكتمل"] } } },
      { $group: { _id: null, sum: { $sum: "$total" } } },
    ]);
    res.json({ total, new: newOrders, paid, shipped, done, revenue: revenue[0]?.sum || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/orders/:id/status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "الطلب مش موجود" });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/orders/:id
const deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "تم حذف الطلب" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET /api/orders/analytics
const getAnalytics = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const since = new Date();
    since.setMonth(since.getMonth() - Number(months));

    // Monthly revenue
    const monthly = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ["تم الدفع", "تم الشحن", "مكتمل"] } } },
      { $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        revenue: { $sum: "$total" },
        count: { $sum: 1 }
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $match: { status: { $nin: ["ملغي"] } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", total: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    res.json({ monthly, topProducts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createOrder, getOrders, getOrderStats, updateStatus, deleteOrder, getAnalytics };