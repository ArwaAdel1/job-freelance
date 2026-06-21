const SiteSettings = require("../models/SiteSettings");

const getSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create(req.body);
      return res.json(settings);
    }

    const scalarFields = [
      "siteName_ar", "siteName_en", "heroTitle_ar", "heroSubtitle_ar",
      "heroImage", "logo", "aboutUs_ar", "footerText_ar",
    ];
    scalarFields.forEach((f) => {
      if (f in req.body) settings[f] = req.body[f];
    });

    if (req.body.contact) {
      Object.keys(req.body.contact).forEach((k) => {
        settings.contact[k] = req.body.contact[k];
      });
      settings.markModified("contact");
    }

    if (req.body.paymentMethods !== undefined) {
      settings.paymentMethods = req.body.paymentMethods;
      settings.markModified("paymentMethods");
    }

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const uploadSettingsIcon = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي صورة" });
    const url = `/uploads/settings/icons/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getSettings, updateSettings, uploadSettingsIcon };
