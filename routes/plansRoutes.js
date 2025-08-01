// routes/plansRoutes.js

import express from 'express';
import {
    // Airtime
    getAirtimeNetworks,

    // Data
    getDataPlans,
    getAllDataPlans,

    // Cable TV
    getCableTVProviders,
    getCableTVPackages,
    verifyCableTVSmartcard,

    // Electricity
    getElectricityDiscos,
    verifyElectricityMeter,

    // Education
    getEducationInstitutions,
    verifyStudentId
} from '../controllers/plansController.js';

import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ========== AIRTIME ROUTES ==========
router.get('/airtime/networks', protect, getAirtimeNetworks);

// ========== DATA ROUTES ==========
router.get('/data/plans', protect, getAllDataPlans);              // Get all data plans
router.get('/data/plans/:network', protect, getDataPlans);        // Get plans for specific network

// ========== CABLE TV ROUTES ==========
router.get('/cable/providers', protect, getCableTVProviders);                    // Get all providers
router.get('/cable/packages/:provider', protect, getCableTVPackages);           // Get packages for provider
router.post('/cable/verify', protect, verifyCableTVSmartcard);                  // Verify smartcard

// ========== ELECTRICITY ROUTES ==========
router.get('/electricity/discos', protect, getElectricityDiscos);               // Get all DISCOs
router.post('/electricity/verify', protect, verifyElectricityMeter);            // Verify meter

// ========== EDUCATION ROUTES ==========
router.get('/education/institutions', protect, getEducationInstitutions);       // Get all institutions
router.post('/education/verify', protect, verifyStudentId);                     // Verify student ID

export default router;