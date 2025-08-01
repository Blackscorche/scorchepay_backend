import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

// Get list of banks (for UI dropdown, optional)
export const getBanks = async (req, res) => {
    try {
        const response = await axios.get(`${FLW_BASE_URL}/banks/NG`, {
            headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        });
        res.json(response.data.data);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch banks" });
    }
};

// Transfer to other banks
export const transferToBank = async (req, res) => {
    const { bankCode, accountNumber, amount, narration } = req.body;
    const user = req.user;

    if (!bankCode || !accountNumber || !amount) {
        return res.status(400).json({ message: "bankCode, accountNumber, and amount are required" });
    }

    try {
        // Optionally, check user balance here
        if (user.wallets.ngn < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Initiate transfer
        const payload = {
            account_bank: bankCode,
            account_number: accountNumber,
            amount,
            narration: narration || "ScorchePay Transfer",
            currency: "NGN",
            reference: `SCORCHE-TX-${Date.now()}`,
            callback_url: process.env.FLW_REDIRECT_URL,
            debit_currency: "NGN",
        };

        const response = await axios.post(
            `${FLW_BASE_URL}/transfers`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // Deduct from user wallet if transfer is queued
        if (response.data.status === "success") {
            user.wallets.ngn -= amount;
            await user.save();
        }

        res.json({ message: "Transfer initiated", data: response.data.data });
    } catch (err) {
        res.status(500).json({ message: err?.response?.data?.message || err.message });
    }
};
