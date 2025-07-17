import express from "express";
import { flutterwaveWebhook } from "../controllers/webhookController.js";

const router = express.Router();
router.post("/flutterwave", express.json({ type: "*/*" }), flutterwaveWebhook);

export default router;
