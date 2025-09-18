// models/Order.js
import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: String },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, default: 1 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // ✅ every order must be linked to a user
    },
    customer: {
      name: { type: String, required: true },   // ✅ new
      email: { type: String, required: true },  // ✅ new
      phone: { type: String, required: true },
      address: { type: String, required: true },
      notes: { type: String },
    },
    items: { type: [OrderItemSchema], required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
