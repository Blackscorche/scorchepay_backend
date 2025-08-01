import User from "../models/User.js";
import GiftcardProposal from "../models/GiftcardProposal.js";
import cloudinary from "../utils/cloudinary.js";


// View giftcard verifier profile (only one verifier in the system)
export const getGiftcardVerifierProfile = async (req, res) => {
    try {
        const verifier = await User.findOne({ role: "giftcardVerifier" }).select("-password");
        if (!verifier)
            return res.status(404).json({ message: "Giftcard verifier not found" });
        res.status(200).json(verifier);
    } catch (err) {
        res.status(500).json({ message: "Failed to load profile" });
    }
};

// Submit giftcard or update rate (basic version)
try {
    const { code } = req.body;
    if (!req.file || !code) {
        return res.status(400).json({ message: "Image and code are required" });
    }
    // Upload image to Cloudinary (promisified)
    const uploadToCloudinary = (fileBuffer) => {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: "giftcards" }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
            stream.end(fileBuffer);
        });
    };
    const result = await uploadToCloudinary(req.file.buffer);
    const proposal = await GiftcardProposal.create({
        imageUrl: result.secure_url,
        code,
        submittedBy: req.user.userId
    });
    res.status(200).json({ message: "Proposal submitted to admin", proposal });
} catch (err) {
    res.status(500).json({ message: "Failed to submit proposal" });
}

