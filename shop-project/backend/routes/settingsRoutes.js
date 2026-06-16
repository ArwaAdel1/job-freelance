const express = require("express");
const router = express.Router();
const { getSettings, updateSettings, uploadSettingsIcon } = require("../controllers/settingsController");
const { protect } = require("../middleware/auth");
const { settingsUpload } = require("../middleware/upload");

router.get("/", getSettings);
router.put("/", protect, updateSettings);
router.post("/upload-icon", protect, settingsUpload.single("icon"), uploadSettingsIcon);

module.exports = router;
