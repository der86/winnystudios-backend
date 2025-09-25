// controllers/orderController.js
import User from "../models/User.js";
import Order from "../models/Order.js";
import { z } from "zod";
import { sendOrderEmail } from "../utils/mailer.js";
import { v2 as cloudinary } from "cloudinary";

// ---------------- Validation ----------------
const orderItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  qty: z.number().int().positive().default(1),
  image: z.string().optional(), // raw base64, file path, or Cloudinary URL
});

const orderSchema = z.object({
  phone: z.string().min(5),
  address: z.string().min(5),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1),
  total: z.number().nonnegative(),
});

// ---------------- Helpers ----------------
const buildErrorResponse = (res, status, message, details = null) => {
  const payload = { success: false, error: message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
};

const sendOrderNotification = async (order, user) => {
  const itemsText = order.items
    .map(
      (i) =>
        `• ${i.name} x${i.qty ?? 1} — $${i.price * (i.qty ?? 1)} ${
          i.image ? ` (📸 ${i.image})` : ""
        }`
    )
    .join("\n");

  await sendOrderEmail({
    to: process.env.EMAIL_TO,
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    subject: "🛍️ New Order Received",
    text: `New order received:
Customer: ${user.name} (${user.email})
Phone: ${order.customer.phone}
Address: ${order.customer.address}
Notes: ${order.customer.notes || "None"}
Items:
${itemsText}
Total: $${order.total}`,
    html: `
      <h2>New Order</h2>
      <p><b>Name:</b> ${user.name}</p>
      <p><b>Email:</b> ${user.email}</p>
      <p><b>Phone:</b> ${order.customer.phone}</p>
      <p><b>Address:</b> ${order.customer.address}</p>
      <p><b>Notes:</b> ${order.customer.notes || "None"}</p>
      <h3>Items</h3>
      <ul>
        ${order.items
          .map(
            (i) =>
              `<li>${i.name} x${i.qty ?? 1} — $${i.price * (i.qty ?? 1)}${
                i.image
                  ? `<br><img src="${i.image}" width="100" style="margin-top:5px"/>`
                  : ""
              }</li>`
          )
          .join("")}
      </ul>
      <p><b>Total:</b> $${order.total}</p>
    `,
  });
};

// ---------------- Create New Order ----------------
export const createOrder = async (req, res) => {
  try {
    const parseResult = orderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return buildErrorResponse(
        res,
        400,
        "Invalid order data",
        parseResult.error.errors
      );
    }

    let { items, total, phone, address, notes } = parseResult.data;

    // ✅ Upload any raw/base64 images to Cloudinary
    const uploadedItems = await Promise.all(
      items.map(async (item) => {
        if (item.image && !item.image.startsWith("http")) {
          try {
            const uploadRes = await cloudinary.uploader.upload(item.image, {
              folder: "orders",
            });
            item.image = uploadRes.secure_url;
          } catch (err) {
            console.error("❌ Cloudinary upload failed:", err.message);
          }
        }
        return item;
      })
    );

    // ✅ Get logged-in user details
    const user = await User.findById(req.user._id);
    if (!user) return buildErrorResponse(res, 401, "User not found");

    const order = new Order({
      user: user._id,
      customer: {
        name: user.name,
        email: user.email,
        phone,
        address,
        notes,
      },
      items: uploadedItems,
      total,
    });

    await order.save();
    await sendOrderNotification(order, user); // send email after saving

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error("❌ Order creation error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- Get Logged-in User Orders ----------------
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    if (!orders.length) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found" });
    }

    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    console.error("❌ Failed to fetch user orders:", err);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

// ---------------- Admin Controllers ----------------
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("❌ Failed to fetch all orders:", err.message);
    buildErrorResponse(res, 500, "Failed to fetch all orders");
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return buildErrorResponse(res, 404, "Order not found");
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("❌ Failed to fetch order:", err.message);
    buildErrorResponse(res, 500, "Failed to fetch order");
  }
};

export const updateOrder = async (req, res) => {
  try {
    const allowedUpdates = (({ status, notes }) => ({ status, notes }))(
      req.body
    );
    const order = await Order.findByIdAndUpdate(req.params.id, allowedUpdates, {
      new: true,
    });
    if (!order) return buildErrorResponse(res, 404, "Order not found");
    res.json({ success: true, message: "Order updated", data: order });
  } catch (err) {
    console.error("❌ Failed to update order:", err.message);
    buildErrorResponse(res, 500, "Failed to update order");
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return buildErrorResponse(res, 404, "Order not found");
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    console.error("❌ Failed to delete order:", err.message);
    buildErrorResponse(res, 500, "Failed to delete order");
  }
};
