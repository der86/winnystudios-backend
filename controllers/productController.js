import Product from "../models/Product.js";

export const createProduct = async (req, res) => {
  try {
    const { name, price, image } = req.body;

    const product = new Product({ name, price, image });
    await product.save();

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
};
