import express from "express";
import { protect, authorize } from "../middlewares/auth.js";
import {
    getGiftcardVerifierProfile,
    getGiftcardVerifierTransactions,
    submitGiftcardProposal,
} from "../controllers/merchantController.js";

const router = express.Router();
router.use(protect, authorize("giftcardVerifier"));

router.get("/me", getGiftcardVerifierProfile);
router.get("/transactions", getGiftcardVerifierTransactions);
router.post("/giftcard", submitGiftcardProposal);

export default router;
