// routes/ProductRoute.js
import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import { createProduct } from "../controllers/productController.js";
import { upload } from "../config/cloudinary.js"; // ✅ cloudinary-multer

import Product from "../models/Product.js";

const router = express.Router();

// ✅ CREATE product (Admin only, with multiple images)
router.post("/", protect, admin, upload.array("images", 5), createProduct);

// ✅ GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ✅ GET single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// ✅ UPDATE product (Admin only, supports new images)
router.put(
  "/:id",
  protect,
  admin,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const updates = { ...req.body };

      if (req.files && req.files.length > 0) {
        updates.images = req.files.map((file) => file.path); // ✅ Cloudinary URLs
      }

      const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
        new: true,
      });
      if (!updated) return res.status(404).json({ error: "Product not found" });

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update product" });
    }
  }
);

// ✅ DELETE product
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
