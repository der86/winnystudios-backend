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

// ---------------- Create New Order ----------------
export const createOrder = async (req, res, next) => {
  try {
    const parsed = orderSchema.parse(req.body);

    // calculate total
    const total = parsed.items.reduce(
      (sum, i) => sum + i.price * (i.qty ?? 1),
      0
    );

    // create order in DB
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

    // send notification email (optional)
    try {
      const itemsText = parsed.items
        .map((i) => `• ${i.name} x${i.qty ?? 1} — ${i.price}`)
        .join("\n");

      await sendOrderEmail({
        to: process.env.EMAIL_TO,
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        subject: "🛍️ New Order Received",
        text: `
New order received:
Customer: ${req.user.name} (${req.user.email})
Phone: ${parsed.phone}
Address: ${parsed.address}
Notes: ${parsed.notes || "None"}

Items:
${itemsText}

Total: ${total}
        `,
        html: `
          <h2>New Order</h2>
          <p><b>Name:</b> ${req.user.name}</p>
          <p><b>Email:</b> ${req.user.email}</p>
          <p><b>Phone:</b> ${parsed.phone}</p>
          <p><b>Address:</b> ${parsed.address}</p>
          <p><b>Notes:</b> ${parsed.notes || "None"}</p>
          <h3>Items</h3>
          <ul>
            ${parsed.items
              .map(
                (i) =>
                  `<li>${i.name} x${i.qty ?? 1} — $${i.price * (i.qty ?? 1)}</li>`
              )
              .join("")}
          </ul>
          <p><b>Total:</b> $${total}</p>
        `,
      });
    } catch (mailErr) {
      console.error("⚠️ Email not sent:", mailErr.message);
    }

    res.status(201).json(order);
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.issues,
      });
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
    res.json(orders);
  } catch (err) {
    console.error("❌ Failed to fetch user orders:", err.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// ---------------- Admin Controllers ----------------
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("❌ Failed to fetch all orders:", err.message);
    res.status(500).json({ error: "Failed to fetch all orders" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error("❌ Failed to fetch order:", err.message);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error("❌ Failed to update order:", err.message);
    res.status(500).json({ error: "Failed to update order" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (err) {
    console.error("❌ Failed to delete order:", err.message);
    res.status(500).json({ error: "Failed to delete order" });
  }
};
