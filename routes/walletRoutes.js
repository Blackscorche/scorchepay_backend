import express from "express";
import { protect } from "../middlewares/auth.js";
import { fundWallet, transferFunds } from "../controllers/walletController.js";

const router = express.Router();
router.use(protect);

router.post("/fund", fundWallet);
router.post("/transfer", transferFunds);

export default router;
