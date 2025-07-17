import express from "express";
import { protect, authorize } from "../middlewares/auth.js";
import { getMyProfile, updateProfile, getWallet } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", protect, authorize("user", "merchant"), getMyProfile);
router.put("/update", protect, authorize("user", "merchant"), updateProfile);
router.get("/wallet", protect, authorize("user", "merchant"), getWallet);

export default router;
