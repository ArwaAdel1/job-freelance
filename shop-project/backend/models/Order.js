const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  image: { type: String },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },

    // بيانات العميل
    customerName:    { type: String },
    customerPhone:   { type: String },
    customerAddress: {
      governorate: { type: String },   // المحافظة
      city:        { type: String },   // المدينة / المركز
      street:      { type: String },   // الشارع / التفاصيل
      landmark:    { type: String },   // علامة مميزة (اختياري)
    },

    items: [orderItemSchema],
    total:             { type: Number, required: true },
    paymentMethod:     { type: String, required: true },
    paymentMethodName: { type: String },

    status: {
      type: String,
      enum: ["جديد", "تم الدفع", "تم الشحن", "مكتمل", "ملغي"],
      default: "جديد",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// Auto-generate order number before save
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = "ORD-" + String(count + 1).padStart(4, "0");
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);