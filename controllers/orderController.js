// controllers/orderController.js
import { z } from "zod";
import Order from "../models/Order.js";
import { sendOrderEmail } from "../utils/mailer.js";

// ---------------- Validation ----------------
const orderItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  qty: z.number().int().positive().default(1),
});

const orderSchema = z.object({
  phone: z.string().min(5),
  address: z.string().min(5),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1),
});

// ---------------- Helpers ----------------
const buildErrorResponse = (res, status, message, details = null) => {
  const payload = { success: false, error: message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
};

const sendOrderNotification = async (order, user) => {
  const itemsText = order.items
    .map((i) => `• ${i.name} x${i.qty ?? 1} — ${i.price}`)
    .join("\n");

  await sendOrderEmail({
    to: process.env.EMAIL_TO,
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    subject: "🛍️ New Order Received",
    text: `
New order received:
Customer: ${user.name} (${user.email})
Phone: ${order.customer.phone}
Address: ${order.customer.address}
Notes: ${order.customer.notes || "None"}

Items:
${itemsText}

Total: $${order.total}
    `,
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
              `<li>${i.name} x${i.qty ?? 1} — $${i.price * (i.qty ?? 1)}</li>`
          )
          .join("")}
      </ul>
      <p><b>Total:</b> $${order.total}</p>
    `,
  });
};

// ---------------- Create New Order ----------------
export const createOrder = async (req, res, next) => {
  try {
    const parsed = orderSchema.parse(req.body);

    const total = parsed.items.reduce(
      (sum, i) => sum + i.price * (i.qty ?? 1),
      0
    );

    const order = await Order.create({
      user: req.user._id,
      customer: {
        name: req.user.name,
        email: req.user.email,
        phone: parsed.phone,
        address: parsed.address,
        notes: parsed.notes || "",
      },
      items: parsed.items,
      total,
    });

    // fire-and-forget email (don’t block response)
    sendOrderNotification(order, req.user).catch((err) =>
      console.error("⚠️ Email not sent:", err.message)
    );

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (err) {
    if (err?.issues) {
      return buildErrorResponse(res, 400, "Validation failed", err.issues);
    }
    console.error("❌ Error creating order:", err.message);
    next(err);
  }
};

// ---------------- Get Logged-in User Orders ----------------
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("❌ Failed to fetch user orders:", err.message);
    buildErrorResponse(res, 500, "Failed to fetch orders");
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
    // ✅ Only allow status & notes update
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
