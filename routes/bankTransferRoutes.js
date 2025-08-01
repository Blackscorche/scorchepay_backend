import express from "express";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { getBanks, transferToBank } from "../controllers/bankTransferController.js";

const router = express.Router();

router.get("/banks", protect, getBanks); // Optional: get list of banks
router.post("/transfer", protect, authorize("user", "giftcardVerifier", "admin"), transferToBank);

export default router;
