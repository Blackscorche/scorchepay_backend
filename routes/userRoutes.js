import express from "express";
import { getCurrentUser } from "../controllers/userControllers.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, getCurrentUser);

export default router;
