import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    image: {
      type: String,
      default: null, // keep old single-image support
    },
    images: [
      {
        type: String, // store multiple image paths
      },
    ],
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    category: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
