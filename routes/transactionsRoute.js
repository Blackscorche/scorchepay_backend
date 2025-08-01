// routes/transactionRoutes.js
import express from 'express';
import {
    getUserTransactions,
    getTransactionStats,
    testTransactions,
    // getMerchantTransactions,
    // updateMerchantTransaction
} from '../controllers/transactionsController.js';
import { protect } from '../middlewares/authMiddleware.js'; // Adjust path as needed

const router = express.Router();

// ✅ User transaction routes
router.get('/user', protect, getUserTransactions);
router.get('/stats', protect, getTransactionStats);
router.get('/test', protect, testTransactions); // Test endpoint

// ✅ Merchant routes (if needed)
// router.get('/merchant', protect, getMerchantTransactions);
// router.put('/merchant/:transactionId', protect, updateMerchantTransaction);

export default router;

// ✅ Make sure this is imported in your main app.js or server.js:
// import transactionRoutes from './routes/transactionRoutes.js';
// app.use('/api/transactions', transactionRoutes);