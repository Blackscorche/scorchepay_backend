import express from "express";
import {
    ensureFlutterwaveAccount,
    transferFunds,
    transferToBank,
    getWalletBalance,
    getWalletDetails,
    getUserBalance,
    getTotalIncome,
    getTotalExpenses,
    getUserTransactions,
    getUserStats,
    updateWalletBalance,
    verifyBankTransfer,
    verifyUser,
    getBanks,
    resolveAccount,
    getTransactionByReference,
    getTransferFee
} from "../controllers/walletController.js";

import {
    protect,
    authorize,
    ensureBVNVerified
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ Virtual Account Management
router.post(
    "/create-account",
    protect,
    authorize("user", "giftcardVerifier"),
    ensureFlutterwaveAccount
);

// ✅ Transfer Operations
router.post(
    "/transfer",
    protect,
    authorize("user", "giftcardVerifier"),
    transferFunds
);

router.post(
    "/transfer-to-bank",
    protect,
    authorize("user", "giftcardVerifier"),
    transferToBank
);

// ✅ Balance and Wallet Information (❌ No BVN required here)
router.get(
    "/balance",
    protect,
    authorize("user", "giftcardVerifier"),
    getWalletBalance
);

router.get(
    "/user-balance",
    protect,
    authorize("user", "giftcardVerifier"),
    getUserBalance
);

router.get(
    "/details",
    protect,
    authorize("user", "giftcardVerifier"),
    getWalletDetails
);

// ✅ Transaction History and Verification (still sensitive)
router.get(
    "/transactions",
    protect,
    authorize("user", "giftcardVerifier"),
    getUserTransactions
);

router.get(
    "/verify/:reference",
    protect,
    authorize("user", "giftcardVerifier"),
    verifyBankTransfer
);

// ✅ Analytics (❌ No BVN required)
router.get(
    "/income/today",
    protect,
    authorize("user", "giftcardVerifier"),
    getTotalIncome
);

router.get(
    "/expenses/today",
    protect,
    authorize("user", "giftcardVerifier"),
    getTotalExpenses
);

router.get(
    "/stats",
    protect,
    authorize("user", "giftcardVerifier"),
    getUserStats
);

// ✅ Admin/System Wallet Update
router.put(
    "/update-balance",
    protect,
    authorize("user", "giftcardVerifier"),
    updateWalletBalance
);
// ✅ Add these routes to your router (no BVN required for getting bank list)
router.get(
    "/banks",
    protect,
    authorize("user", "giftcardVerifier"),
    getBanks
);

router.post(
    "/resolve-account",
    protect,
    authorize("user", "giftcardVerifier"),
    resolveAccount
);
router.get(
    "/transfer-fee",
    protect,
    authorize("user", "giftcardVerifier"),
    getTransferFee
);

router.get(
    "/transaction/:reference",
    protect,
    authorize("user", "giftcardVerifier"),
    getTransactionByReference
);
// Fix the user verification route - it should be under wallet routes
router.post(
    "/user/verify-username",
    protect,
    authorize("user", "giftcardVerifier"),
    verifyUser
);


export default router;
