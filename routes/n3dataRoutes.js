import express from "express";
import * as n3dataController from "../controllers/n3dataController.js";
import { authenticate } from "../middlewares/auth.js";

const router = express.Router();

router.post("/airtime", authenticate, n3dataController.buyAirtime);
router.post("/data", authenticate, n3dataController.buyData);
router.post("/cabletv", authenticate, n3dataController.payCableTV);
router.post("/electricity", authenticate, n3dataController.payElectricity);
router.post("/betting", authenticate, n3dataController.fundBetting);
router.post("/education", authenticate, n3dataController.payEducation);

export default router;
