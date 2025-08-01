import GiftcardProposal from "../models/GiftcardProposal.js";
import User from "../models/User.js";
import Transaction from "../models/Transactions.js";
import cloudinary from "../utils/cloudinary.js";
import { initiateFlutterwaveTransfer, getFlutterwaveTransferFee } from "../utils/flutterWave.js";

// List all pending giftcard proposals for verifiers
export const listPendingGiftcardProposals = async (req, res) => {
    try {
        if (req.user.role !== "giftcardVerifier") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const proposals = await GiftcardProposal.find({ status: "pending" })
            .populate("submittedBy", "username firstname lastname email phone");

        res.json({ proposals });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// UPDATED: Real money transfer version - FIXED
export const approveGiftcard = async (req, res) => {
    try {
        const { proposalId, amount } = req.body;

        // Add validation
        if (!proposalId || !amount || amount <= 0) {
            return res.status(400).json({
                message: "Proposal ID and valid amount are required"
            });
        }

        const proposal = await GiftcardProposal.findById(proposalId);

        if (!proposal || proposal.status !== "pending") {
            return res.status(404).json({
                message: "Giftcard proposal not found or already processed"
            });
        }

        if (req.user.role !== "giftcardVerifier") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const verifier = await User.findById(req.user.id);
        const user = await User.findById(proposal.submittedBy);

        if (!verifier || !user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🔧 FIXED: Check virtual account using correct schema field
        if (!user.hasVirtualAccount || !user.virtualAccountDetails?.account_number) {
            return res.status(400).json({
                message: "User does not have a virtual account. Please contact support to create one."
            });
        }

        // Get transfer fee from Flutterwave
        let transferFee = 50; // Default fee
        try {
            const feeData = await getFlutterwaveTransferFee({ amount });
            transferFee = feeData.fee || 50;
        } catch (feeError) {
            console.log('Fee calculation failed, using default:', feeError.message);
        }

        const totalDeduction = amount + transferFee;

        // Check if verifier has enough balance (including transfer fee)
        if (verifier.wallets.ngn < totalDeduction) {
            return res.status(400).json({
                message: `Insufficient funds. Need ₦${totalDeduction} (₦${amount} + ₦${transferFee} transfer fee)`
            });
        }

        // Create unique reference for this transfer
        const transferRef = `GC_APPROVAL_${proposal._id}_${Date.now()}`;

        try {
            // 🚀 REAL MONEY TRANSFER via Flutterwave API
            // 🔧 FIXED: Use correct schema field for account number
            const transferResult = await initiateFlutterwaveTransfer({
                account_number: user.virtualAccountDetails.account_number,
                account_bank: "999999", // Flutterwave virtual account bank code
                amount: amount,
                narration: `Gift Card Approval - ${proposal.name || 'Gift Card'}`,
                reference: transferRef,
                beneficiary_name: `${user.firstname} ${user.lastname}`
            });

            console.log('🏦 Flutterwave transfer initiated:', transferResult);

            if (transferResult.status === 'success') {
                // Start database transaction after successful Flutterwave transfer
                const session = await User.startSession();
                session.startTransaction();

                try {
                    // Update database balances to reflect the REAL transfer
                    await User.updateOne(
                        { _id: verifier._id },
                        { $inc: { 'wallets.ngn': -totalDeduction } },
                        { session }
                    );

                    await User.updateOne(
                        { _id: user._id },
                        { $inc: { 'wallets.ngn': amount } },
                        { session }
                    );

                    // Update proposal
                    proposal.status = "approved";
                    proposal.verifier = verifier._id;
                    proposal.verifiedAt = new Date();
                    proposal.amountApproved = amount;
                    proposal.flutterwaveTransferId = transferResult.data?.id; // Store Flutterwave ID
                    await proposal.save({ session });

                    // Create transaction record with Flutterwave details
                    await Transaction.create([{
                        type: "giftcard",
                        category: "giftcard",
                        title: `Gift Card Approval - ${proposal.name || 'Gift Card'}`,
                        paymentRef: transferRef,
                        from: verifier._id,
                        to: user._id,
                        amount,
                        fee: transferFee,
                        status: "success",
                        description: `Real money transfer via Flutterwave for gift card approval`,
                        merchantStatus: "approved",
                        metadata: {
                            cardType: proposal.name,
                            cardValue: proposal.amount,
                            giftCardImage: proposal.imageUrl,
                            merchantId: verifier._id,
                            proposalId: proposal._id,
                            flutterwaveTransferId: transferResult.data?.id,
                            transferFee: transferFee,
                            recipientAccount: user.virtualAccountDetails.account_number,
                            realMoneyTransfer: true // Flag to indicate this was real money
                        },
                        createdAt: new Date()
                    }], { session });

                    await session.commitTransaction();

                    res.json({
                        message: "Gift card approved and real money transferred successfully! 💰",
                        proposal: {
                            id: proposal._id,
                            status: proposal.status,
                            amountApproved: proposal.amountApproved,
                            verifiedAt: proposal.verifiedAt
                        },
                        transferDetails: {
                            amount: amount,
                            transferFee: transferFee,
                            totalDeducted: totalDeduction,
                            recipientAccount: user.virtualAccountDetails.account_number,
                            flutterwaveRef: transferResult.data?.id
                        }
                    });

                } catch (dbError) {
                    await session.abortTransaction();
                    throw dbError;
                } finally {
                    session.endSession();
                }

            } else {
                throw new Error(`Flutterwave transfer failed: ${transferResult.message}`);
            }

        } catch (transferError) {
            console.error('💥 Flutterwave transfer error:', transferError);

            // Create failed transaction record (no balance updates since transfer failed)
            await Transaction.create({
                type: "giftcard",
                category: "giftcard",
                title: `Failed Gift Card Approval - ${proposal.name || 'Gift Card'}`,
                paymentRef: transferRef,
                from: verifier._id,
                to: user._id,
                amount,
                fee: transferFee,
                status: "failed",
                description: `Failed real money transfer: ${transferError.message}`,
                error: transferError.message,
                merchantStatus: "pending", // Keep as pending since transfer failed
                metadata: {
                    cardType: proposal.name,
                    proposalId: proposal._id,
                    transferFee: transferFee,
                    failureReason: transferError.message,
                    attemptedRecipientAccount: user.virtualAccountDetails?.account_number
                }
            });

            return res.status(500).json({
                message: "Real money transfer failed. Please try again or contact support.",
                error: transferError.message,
                details: "Your balance was not affected since the transfer failed."
            });
        }

    } catch (err) {
        console.error("Approve giftcard error:", err);
        res.status(500).json({
            message: err.message || "Internal server error"
        });
    }
};
// User submits a giftcard proposal
export const submitGiftcardProposal = async (req, res) => {
    try {
        console.log('req.user:', req.user);
        console.log('req.user.id:', req.user.id);

        const name = req.body.name || req.body.cardType;
        const rate = req.body.rate || req.body.value || null;
        const { code, amount } = req.body;

        let imageUrl = null;

        if (req.file) {
            await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
                    if (error) return reject(error);
                    imageUrl = result.secure_url;
                    resolve();
                });
                stream.end(req.file.buffer);
            });
        }

        const proposal = await GiftcardProposal.create({
            name,
            rate,
            imageUrl,
            code,
            amount,
            submittedBy: req.user.id,
            status: "pending"
        });

        const populatedProposal = await GiftcardProposal.findById(proposal._id)
            .populate("submittedBy", "username firstname lastname email phone");

        res.status(201).json({
            message: "Giftcard proposal submitted",
            proposal: populatedProposal
        });
    } catch (err) {
        console.error("Giftcard proposal error:", err);
        res.status(500).json({ message: err.message });
    }
};

// Verifier rejects a giftcard proposal
export const rejectGiftcardProposal = async (req, res) => {
    try {
        const { proposalId, reason } = req.body;
        const proposal = await GiftcardProposal.findById(proposalId);

        if (!proposal || proposal.status !== "pending") {
            return res.status(404).json({ message: "Giftcard proposal not found or already processed" });
        }

        if (req.user.role !== "giftcardVerifier") {
            return res.status(403).json({ message: "Forbidden" });
        }

        proposal.status = "rejected";
        proposal.verifier = req.user.id;
        proposal.verifiedAt = new Date();
        proposal.rejectionReason = reason;

        await proposal.save();

        res.json({ message: "Giftcard proposal rejected" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get user's own giftcard proposals
export const getUserGiftcardProposals = async (req, res) => {
    try {
        const proposals = await GiftcardProposal.find({ submittedBy: req.user.id })
            .populate("submittedBy", "username firstname lastname email phone")
            .sort({ createdAt: -1 });

        res.json({ proposals });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};