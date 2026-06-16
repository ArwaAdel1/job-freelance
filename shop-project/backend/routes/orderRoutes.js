const express = require("express");
const router = express.Router();
const { createOrder, getOrders, getOrderStats, updateStatus, deleteOrder, getAnalytics } = require("../controllers/orderController");
const { protect } = require("../middleware/auth");

router.post("/", createOrder);                          // public — storefront
router.get("/", protect, getOrders);                    // admin
router.get("/stats", protect, getOrderStats);
router.get("/analytics", protect, getAnalytics);           // admin
router.patch("/:id/status", protect, updateStatus);     // admin
router.delete("/:id", protect, deleteOrder);            // admin

module.exports = router;