const express = require("express");
const router = express.Router();
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, toggleProduct,
} = require("../controllers/productController");
const { protect } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", protect, upload.array("images", 6), createProduct);
router.put("/:id", protect, upload.array("images", 6), updateProduct);
router.delete("/:id", protect, deleteProduct);
router.patch("/:id/toggle", protect, toggleProduct);

module.exports = router;
