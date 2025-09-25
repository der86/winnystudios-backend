// controllers/productController.js
import Product from "../models/Product.js";

export const createProduct = async (req, res) => {
  try {
    const { name, price, description } = req.body;

    // Cloudinary uploads give you secure URLs in file.path
    const images = req.files?.map((file) => file.path) || [];

    const product = new Product({
      name,
      price,
      description,
      images, // ✅ save Cloudinary URLs
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error("❌ Failed to create product:", err.message);
    res.status(500).json({ error: "Failed to create product" });
  }
};
