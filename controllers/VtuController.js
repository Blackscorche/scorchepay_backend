// controllers/vtuController.js

import * as n3data from "../utils/n3data.js";
import Transaction from "../models/Transactions.js";
import User from "../models/User.js";
import { v4 as uuidv4 } from 'uuid';

// Airtime Purchase
export const buyAirtime = async (req, res) => {
    try {
        const { network, amount, phone } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.wallets.ngn < amount) {
            return res.status(400).json({ message: "Insufficient funds" });
        }

        const paymentRef = `AIR_${Date.now()}_${uuidv4().substring(0, 8)}`;

        // Deduct amount from user wallet
        user.wallets.ngn -= amount;
        await user.save();

        try {
            const result = await n3data.buyAirtime({ network, amount, phone });

            if (!result || !result.success) {
                throw new Error(result?.message || "VTU failed on provider");
            }

            await Transaction.create({
                from: user._id,
                type: "airtime",
                category: "airtime",
                title: `Airtime Purchase - ${network}`,
                amount,
                paymentRef,
                status: "success",
                description: `₦${amount} airtime sent to ${phone} on ${network}`,
                metadata: { phone, network }
            });

            return res.json({
                message: "Airtime sent successfully",
                balance: user.wallets.ngn,
                paymentRef
            });

        } catch (error) {
            // Refund the amount on failure
            user.wallets.ngn += amount;
            await user.save();

            await Transaction.create({
                from: user._id,
                type: "airtime",
                category: "airtime",
                title: `Failed Airtime Purchase - ${network}`,
                amount,
                paymentRef,
                status: "failed",
                description: `Failed airtime purchase for ${phone} on ${network}`,
                metadata: { phone, network },
                error: error.message
            });

            return res.status(500).json({
                message: "Airtime failed. Amount refunded.",
                error: error.message
            });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Data Purchase
export const buyData = async (req, res) => {
    try {
        const { network, plan, phone, amount } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.wallets.ngn < amount) {
            return res.status(400).json({ message: "Insufficient funds" });
        }

        const paymentRef = `DATA_${Date.now()}_${uuidv4().substring(0, 8)}`;

        user.wallets.ngn -= amount;
        await user.save();

        try {
            const result = await n3data.buyData({ network, plan, phone });

            if (!result || !result.success) {
                throw new Error(result?.message || "Data purchase failed on provider");
            }

            await Transaction.create({
                from: user._id,
                type: "data",
                category: "data",
                title: `Data Purchase - ${network}`,
                amount,
                paymentRef,
                status: "success",
                description: `${plan} data bundle sent to ${phone} on ${network}`,
                metadata: { phone, network, plan }
            });

            return res.json({
                message: "Data purchase successful",
                balance: user.wallets.ngn,
                paymentRef
            });

        } catch (error) {
            user.wallets.ngn += amount;
            await user.save();

            await Transaction.create({
                from: user._id,
                type: "data",
                category: "data",
                title: `Failed Data Purchase - ${network}`,
                amount,
                paymentRef,
                status: "failed",
                description: `Failed data purchase for ${phone} on ${network}`,
                metadata: { phone, network, plan },
                error: error.message
            });

            return res.status(500).json({
                message: "Data purchase failed. Amount refunded.",
                error: error.message
            });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Cable TV
export const payCableTV = async (req, res) => {
    try {
        const { provider, smartcard, packageName, amount } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.wallets.ngn < amount) {
            return res.status(400).json({ message: "Insufficient funds" });
        }

        const paymentRef = `CABLE_${Date.now()}_${uuidv4().substring(0, 8)}`;

        user.wallets.ngn -= amount;
        await user.save();

        try {
            const result = await n3data.payCableTV({ provider, smartcard, packageName });

            if (!result || !result.success) {
                throw new Error(result?.message || "Cable TV payment failed on provider");
            }

            await Transaction.create({
                from: user._id,
                type: "cable",
                category: "cable",
                title: `Cable TV Payment - ${provider}`,
                amount,
                paymentRef,
                status: "success",
                description: `${packageName} subscription for smartcard ${smartcard}`,
                metadata: { provider, smartcard, packageName }
            });

            return res.json({
                message: "Cable TV payment successful",
                balance: user.wallets.ngn,
                paymentRef
            });

        } catch (error) {
            user.wallets.ngn += amount;
            await user.save();

            await Transaction.create({
                from: user._id,
                type: "cable",
                category: "cable",
                title: `Failed Cable TV Payment - ${provider}`,
                amount,
                paymentRef,
                status: "failed",
                description: `Failed cable TV payment for smartcard ${smartcard}`,
                metadata: { provider, smartcard, packageName },
                error: error.message
            });

            return res.status(500).json({
                message: "Cable TV payment failed. Amount refunded.",
                error: error.message
            });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Electricity
export const payElectricity = async (req, res) => {
    try {
        const { disco, meter, type, amount } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.wallets.ngn < amount) {
            return res.status(400).json({ message: "Insufficient funds" });
        }

        const paymentRef = `ELEC_${Date.now()}_${uuidv4().substring(0, 8)}`;

        user.wallets.ngn -= amount;
        await user.save();

        try {
            const result = await n3data.payElectricity({ disco, meter, type, amount });

            if (!result || !result.success) {
                throw new Error(result?.message || "Electricity payment failed on provider");
            }

            await Transaction.create({
                from: user._id,
                type: "electricity",
                category: "electricity",
                title: `Electricity Payment - ${disco}`,
                amount,
                paymentRef,
                status: "success",
                description: `₦${amount} electricity payment for meter ${meter}`,
                metadata: { disco, meter, type }
            });

            return res.json({
                message: "Electricity payment successful",
                balance: user.wallets.ngn,
                paymentRef
            });

        } catch (error) {
            user.wallets.ngn += amount;
            await user.save();

            await Transaction.create({
                from: user._id,
                type: "electricity",
                category: "electricity",
                title: `Failed Electricity Payment - ${disco}`,
                amount,
                paymentRef,
                status: "failed",
                description: `Failed electricity payment for meter ${meter}`,
                metadata: { disco, meter, type },
                error: error.message
            });

            return res.status(500).json({
                message: "Electricity payment failed. Amount refunded.",
                error: error.message
            });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Education Payment
export const payEducation = async (req, res) => {
    try {
        const { institution, studentId, amount } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.wallets.ngn < amount) {
            return res.status(400).json({ message: "Insufficient funds" });
        }

        const paymentRef = `EDU_${Date.now()}_${uuidv4().substring(0, 8)}`;

        user.wallets.ngn -= amount;
        await user.save();

        try {
            const result = await n3data.payEducation({ institution, studentId, amount });

            if (!result || !result.success) {
                throw new Error(result?.message || "Education payment failed on provider");
            }

            await Transaction.create({
                from: user._id,
                type: "education",
                category: "education",
                title: `Education Payment - ${institution}`,
                amount,
                paymentRef,
                status: "success",
                description: `₦${amount} education payment for student ID ${studentId}`,
                metadata: { institution, studentId }
            });

            return res.json({
                message: "Education payment successful",
                balance: user.wallets.ngn,
                paymentRef
            });

        } catch (error) {
            user.wallets.ngn += amount;
            await user.save();

            await Transaction.create({
                from: user._id,
                type: "education",
                category: "education",
                title: `Failed Education Payment - ${institution}`,
                amount,
                paymentRef,
                status: "failed",
                description: `Failed education payment for student ID ${studentId}`,
                metadata: { institution, studentId },
                error: error.message
            });

            return res.status(500).json({
                message: "Education payment failed. Amount refunded.",
                error: error.message
            });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};