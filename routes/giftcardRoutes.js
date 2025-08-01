import express from "express";
import upload from "../middlewares/upload.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { approveGiftcard, submitGiftcardProposal, rejectGiftcardProposal, listPendingGiftcardProposals, getUserGiftcardProposals } from "../controllers/giftcardController.js";

const router = express.Router();

// Verifier lists all pending proposals
router.get("/pending", authenticate, authorize("giftcardVerifier"), listPendingGiftcardProposals);

// Only giftcardVerifier can approve
router.post("/approve", authenticate, authorize("giftcardVerifier"), approveGiftcard);

// User submits a giftcard proposal (with image upload)
router.post("/propose", authenticate, upload.single("image"), submitGiftcardProposal);

// Verifier rejects a giftcard proposal
router.post("/reject", authenticate, authorize("giftcardVerifier"), rejectGiftcardProposal);
// User gets their own proposals
router.get("/user-proposals", authenticate, getUserGiftcardProposals);

export default router;
