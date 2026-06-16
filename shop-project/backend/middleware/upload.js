const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/products";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /\.(jpeg|jpg|png|webp|gif)$/i;
  const allowedMime = /^image\//;
  if (allowedExt.test(file.originalname) || allowedMime.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("صور فقط مسموح بها (jpeg, jpg, png, webp)"));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const settingsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/settings/icons";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const settingsUpload = multer({ storage: settingsStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/categories/icons";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const categoryUpload = multer({ storage: categoryStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { upload, settingsUpload, categoryUpload };