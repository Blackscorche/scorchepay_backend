import express from "express";
import { approveGiftcard } from "../controllers/giftcardController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Only giftcardVerifier can approve
router.post("/approve", authenticate, authorize("giftcardVerifier"), approveGiftcard);

export default router;
