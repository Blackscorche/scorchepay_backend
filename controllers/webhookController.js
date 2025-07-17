import crypto from "crypto";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// Verify Flutterwave webhook
export const flutterwaveWebhook = async (req, res) => {
    const signature = req.headers["verif-hash"];
    const secret = process.env.FLW_SECRET_HASH;

    const hash = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (hash !== signature) return res.status(401).json({ message: "Invalid signature" });

    const payload = req.body;

    try {
        if (payload.event === "charge.completed" && payload.data.status === "successful") {
            const tx = await Transaction.findOne({ paymentRef: payload.data.tx_ref });

            if (!tx || tx.status === "completed") return res.status(400).end();

            tx.status = "completed";
            await tx.save();

            const user = await User.findById(tx.userId);
            user.wallets.ngn += Number(payload.data.amount);
            await user.save();

            return res.status(200).end();
        }

        res.status(200).end();
    } catch (err) {
        res.status(500).end();
    }
};
