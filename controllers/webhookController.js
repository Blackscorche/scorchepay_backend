import Flutterwave from "flutterwave-node-v3";
import User from "../models/User.js";
import crypto from "crypto";

// ✅ Use the correct environment variable names and provide fallbacks
const flw = new Flutterwave(
    process.env.FLW_PUBLIC_KEY_TEST || "FLWPUBK_TEST-dae6b606f268cbb3435916e295ec38c6-X",
    process.env.FLW_SECRET_KEY_TEST || "FLWSECK_TEST-eedfeb1b7c517e3ba3239c0a45346c54-X"
);

// Flutterwave webhook handler
export const flutterwaveWebhook = async (req, res) => {
    try {
        // 1. Verify webhook signature
        const secretHash = process.env.FLW_SECRET_HASH || "your-webhook-secret-hash";
        const signature = req.headers["verif-hash"];

        if (!signature || signature !== secretHash) {
            return res.status(401).json({ message: "Unauthorized webhook" });
        }

        // 2. Extract webhook data
        const payload = req.body;
        const { event, data } = payload;

        console.log(`Received webhook event: ${event}`, data);

        // 3. Handle different webhook events
        switch (event) {
            case "charge.completed":
                await handleSuccessfulPayment(data);
                break;

            case "transfer.completed":
                await handleTransferCompleted(data);
                break;

            case "charge.failed":
                await handleFailedPayment(data);
                break;

            default:
                console.log(`Unhandled webhook event: ${event}`);
        }

        res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ message: "Webhook processing failed" });
    }
};

// Handle successful payment (money coming into virtual account)
const handleSuccessfulPayment = async (data) => {
    try {
        const { customer, amount, currency, tx_ref } = data;

        // Find user by email or transaction reference
        const user = await User.findOne({
            $or: [
                { email: customer.email },
                { "virtualAccount.orderRef": tx_ref }
            ]
        });

        if (!user) {
            console.error("User not found for payment:", customer.email);
            return;
        }

        // Update user balance
        const amountInNaira = currency === "NGN" ? amount : amount * 100; // Convert if needed
        user.balance = (user.balance || 0) + amountInNaira;

        // Add transaction record
        if (!user.transactions) user.transactions = [];
        user.transactions.push({
            type: "credit",
            amount: amountInNaira,
            description: "Virtual account funding",
            reference: tx_ref,
            status: "completed",
            date: new Date()
        });

        await user.save();

        console.log(`User ${user.email} credited with ₦${amountInNaira}`);
    } catch (error) {
        console.error("Error handling successful payment:", error);
    }
};

// Handle completed transfer (money going out)
const handleTransferCompleted = async (data) => {
    try {
        const { reference, amount, status } = data;

        // Find user by transaction reference
        const user = await User.findOne({
            "transactions.reference": reference
        });

        if (!user) {
            console.error("User not found for transfer:", reference);
            return;
        }

        // Update transaction status
        const transaction = user.transactions.find(t => t.reference === reference);
        if (transaction) {
            transaction.status = status === "SUCCESSFUL" ? "completed" : "failed";
            await user.save();
        }

        console.log(`Transfer ${reference} status updated to: ${status}`);
    } catch (error) {
        console.error("Error handling transfer completion:", error);
    }
};

// Handle failed payment
const handleFailedPayment = async (data) => {
    try {
        const { customer, tx_ref, status } = data;

        console.log(`Payment failed for ${customer.email}: ${tx_ref} - ${status}`);

        // You might want to notify the user or update transaction records
        // Add your failed payment handling logic here

    } catch (error) {
        console.error("Error handling failed payment:", error);
    }
};

export const createVirtualAccount = async (req, res) => {
    const user = await User.findById(req.user.userId);
    if (!user || !user.bvn) {
        return res.status(400).json({ message: "You must submit your BVN to activate your account." });
    }

    try {
        const payload = {
            email: user.email,
            is_permanent: true,
            bvn: user.bvn,
            tx_ref: `SCORCHE-${Date.now()}`,
        };

        const response = await flw.VirtualAcct.create(payload);

        user.virtualAccount = {
            accountNumber: response.data.account_number,
            bankName: response.data.bank_name,
            orderRef: response.data.order_ref,
        };

        // Initialize balance and transactions if they don't exist
        if (user.balance === undefined) user.balance = 0;
        if (!user.transactions) user.transactions = [];

        await user.save();

        res.json({ message: "Virtual account created", account: user.virtualAccount });
    } catch (err) {
        res.status(500).json({ message: "Failed to create virtual account", error: err.message });
    }
};