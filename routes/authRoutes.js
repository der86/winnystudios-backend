// routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login", login);

// Protected (any logged-in user)
router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

export default router;
