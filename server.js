import "dotenv/config.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import orderRoutes from "./routes/orderRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

// security & logs
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// serve uploads statically with CORS
app.use(
  "/uploads",
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
  express.static(path.join(process.cwd(), "uploads"))
);

// ✅ parsers first
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// rate limit orders
app.use(
  "/api/orders",
  rateLimit({ windowMs: 60 * 1000, limit: 30 }),
  orderRoutes
);

app.get("/", (_req, res) => res.send("✅ API OK"));

app.use(notFound);
app.use(errorHandler);

connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://192.168.0.110:${PORT}`)
  );
});

// Handle 404 - Not Found
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);

  res.status(err.statusCode || 500).json({
    error: err.message || "Server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});
