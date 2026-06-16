const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name_ar: { type: String, required: true },
    description_ar: { type: String },
    slug: { type: String, required: true, unique: true },
    icon: { type: String, default: "" },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
