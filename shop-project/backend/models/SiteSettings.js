const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["wallet", "online", "cod"], default: "wallet" },
  icon: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  instructions: { type: String, default: "" },
  code: { type: String, default: "" },
  paymentUrl: { type: String, default: "" },
});

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName_ar: { type: String, default: "متجرنا" },
    siteName_en: { type: String, default: "Our Store" },
    logo: { type: String },
    heroTitle_ar: { type: String },
    heroSubtitle_ar: { type: String },
    heroImage: { type: String },

    contact: {
      phone: { type: String },
      whatsapp: { type: String },
      email: { type: String },
      address_ar: { type: String },
      facebook: { type: String },
      instagram: { type: String },
      tiktok: { type: String },
    },

    paymentMethods: [paymentMethodSchema],

    aboutUs_ar: { type: String },
    footerText_ar: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
