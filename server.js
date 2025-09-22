// server.js
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

// ==========================
// ✅ Security & logging
// ==========================
app.use(helmet());
app.use(morgan("dev"));

// ==========================
// ✅ CORS setup
// ==========================
const allowedOrigins = [
  "http://localhost:5173",
  "https://winnystudios-frontend.vercel.app", // your main frontend
  process.env.CLIENT_ORIGIN, // optional custom domain
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman/cURL

    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      console.error("❌ CORS blocked:", origin);
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
};

// Apply globally
app.use(cors(corsOptions));

// ==========================
// ✅ Serve uploads
// ==========================
app.use(
  "/uploads",
  cors(corsOptions),
  express.static(path.join(process.cwd(), "uploads"))
);

// ==========================
// ✅ Parsers
// ==========================
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ==========================
// ✅ Routes
// ==========================
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use(
  "/api/orders",
  rateLimit({ windowMs: 60 * 1000, limit: 30 }),
  orderRoutes
);

// Test route
app.get("/", (_req, res) => res.send("✅ API OK"));

// ==========================
// ✅ Error handling
// ==========================
app.use(notFound);
app.use(errorHandler);

// ==========================
// ✅ Start server
// ==========================
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
