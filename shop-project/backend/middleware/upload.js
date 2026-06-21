const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMime = /^image\//;
  if (allowedMime.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("صور فقط مسموح بها (jpeg, jpg, png, webp)"));
  }
};

const limits = { fileSize: 5 * 1024 * 1024 };

const upload = multer({ storage, fileFilter, limits });
const settingsUpload = multer({ storage, fileFilter, limits });
const categoryUpload = multer({ storage, fileFilter, limits });

function extractPublicId(url) {
  if (!url || typeof url !== "string") return null;
  const parts = url.split("/");
  const versionIndex = parts.findIndex((p) => p.startsWith("v") && /^\d+$/.test(p.slice(1)));
  if (versionIndex === -1 || versionIndex >= parts.length - 1) return null;
  return parts.slice(versionIndex + 1).join("/").replace(/\.[^.]+$/, "");
}

async function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

async function deleteFromCloudinary(url) {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Failed to delete from Cloudinary:", publicId, err.message);
  }
}

module.exports = { upload, settingsUpload, categoryUpload, uploadToCloudinary, deleteFromCloudinary };
