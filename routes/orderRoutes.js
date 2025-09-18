// routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getMyOrders,
  updateOrder,
  deleteOrder,
} from "../controllers/orderController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🛒 Place a new order
router.post("/", protect, createOrder);

// 👤 Get logged-in user's orders
router.get("/my", protect, getMyOrders);

// 👑 Admin: manage all orders
router.get("/", protect, admin, getAllOrders);
router.get("/:id", protect, admin, getOrderById);
router.put("/:id", protect, admin, updateOrder);
router.delete("/:id", protect, admin, deleteOrder);

export default router;
