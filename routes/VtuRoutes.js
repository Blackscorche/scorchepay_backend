// routes/vtuRoutes.js
import express from 'express';
import {
    buyAirtime,
    buyData,
    payCableTV,
    payElectricity,
    payEducation
} from '../controllers/VtuController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// VTU Purchase Routes (These deduct money from user balance)
router.post('/airtime', protect, buyAirtime);
router.post('/data', protect, buyData);
router.post('/cable', protect, payCableTV);
router.post('/electricity', protect, payElectricity);
router.post('/education', protect, payEducation);

export default router;