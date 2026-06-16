const express = require("express");
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory, uploadCategoryIcon } = require("../controllers/categoryController");
const { protect } = require("../middleware/auth");
const { categoryUpload } = require("../middleware/upload");

router.get("/", getCategories);
router.post("/", protect, createCategory);
router.put("/:id", protect, updateCategory);
router.delete("/:id", protect, deleteCategory);
router.post("/upload-icon", protect, categoryUpload.single("icon"), uploadCategoryIcon);

module.exports = router;
