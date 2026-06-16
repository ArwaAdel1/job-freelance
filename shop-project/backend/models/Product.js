const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name_ar: { type: String, required: true, trim: true },
    description_ar: { type: String },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    images: [{ type: String }],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
