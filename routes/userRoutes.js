import express from "express";
import { getMyProfile, updateProfile } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { submitBVN } from "../controllers/userController.js";
import { verifyBVNAndCreateAccount } from '../controllers/userController.js';
const router = express.Router();

// ✅ Get current user profile
router.get("/profile", protect, getMyProfile);

// ✅ Update current user profile
router.put("/profile", protect, updateProfile);

router.post('/verify-bvn', protect, verifyBVNAndCreateAccount);


export default router;
