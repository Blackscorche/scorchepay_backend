import express from "express";
import { protect, authorize } from "../middlewares/auth.js";
import {
    getMerchantProfile,
    getMerchantTransactions,
    submitGiftcardProposal,
} from "../controllers/merchantController.js";

const router = express.Router();
router.use(protect, authorize("merchant"));

router.get("/me", getMerchantProfile);
router.get("/transactions", getMerchantTransactions);
router.post("/giftcard", submitGiftcardProposal);

export default router;
