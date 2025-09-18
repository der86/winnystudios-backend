import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Product from "../models/Product.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================
// ⚡ Multer storage setup
// ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); // ✅ ensure uploads folder exists
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ==========================
// ✅ GET all products
// ==========================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ==========================
// ✅ GET single product
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// ==========================
// ✅ CREATE product (Admin only, with multiple images)
// ==========================
router.post(
  "/",
  protect,
  admin,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const { name, price, description } = req.body;

      const newProduct = new Product({
        name,
        price,
        description,
        image:
          req.files?.length > 0 ? `/uploads/${req.files[0].filename}` : null, // ✅ first image
        images: req.files
          ? req.files.map((file) => `/uploads/${file.filename}`)
          : [],
      });

      await newProduct.save();
      res.status(201).json(newProduct);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create product" });
    }
  }
);

// ==========================
// ✅ UPDATE product (Admin only, supports multiple images)
// ==========================
router.put(
  "/:id",
  protect,
  admin,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const updates = { ...req.body };

      if (req.files && req.files.length > 0) {
        updates.image = `/uploads/${req.files[0].filename}`;
        updates.images = req.files.map((file) => `/uploads/${file.filename}`);
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

// ==========================
// ✅ DELETE product (Admin only)
// ==========================
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });

    // Optional: remove old image files
    if (deleted.image) {
      const imgPath = path.join(process.cwd(), deleted.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    if (deleted.images && deleted.images.length > 0) {
      deleted.images.forEach((img) => {
        const imgPath = path.join(process.cwd(), img);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      });
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
