const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required env vars:\n  ${missing.join("\n  ")}`);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot start in production with missing env vars");
    }
    return false;
  }
  return true;
}

module.exports = { validateEnv };
