// controllers/plansController.js

import * as n3data from "../utils/n3data.js";

// ========== AIRTIME PLANS ==========
export const getAirtimeNetworks = async (req, res) => {
    try {
        const networks = await n3data.getAirtimeNetworks();
        res.json({
            success: true,
            data: networks,
            message: "Airtime networks fetched successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch airtime networks",
            error: error.message
        });
    }
};

// ========== DATA PLANS ==========
export const getDataPlans = async (req, res) => {
    try {
        const { network } = req.params;

        if (!network) {
            return res.status(400).json({
                success: false,
                message: "Network parameter is required"
            });
        }

        const plans = await n3data.getDataPlans(network);
        res.json({
            success: true,
            data: plans,
            message: `Data plans for ${network} fetched successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch data plans",
            error: error.message
        });
    }
};

export const getAllDataPlans = async (req, res) => {
    try {
        const plans = await n3data.getAllDataPlans();
        res.json({
            success: true,
            data: plans,
            message: "All data plans fetched successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch data plans",
            error: error.message
        });
    }
};

// ========== CABLE TV PLANS ==========
export const getCableTVProviders = async (req, res) => {
    try {
        const providers = await n3data.getCableTVProviders();
        res.json({
            success: true,
            data: providers,
            message: "Cable TV providers fetched successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch cable TV providers",
            error: error.message
        });
    }
};

export const getCableTVPackages = async (req, res) => {
    try {
        const { provider } = req.params;

        if (!provider) {
            return res.status(400).json({
                success: false,
                message: "Provider parameter is required"
            });
        }

        const packages = await n3data.getCableTVPackages(provider);
        res.json({
            success: true,
            data: packages,
            message: `Cable TV packages for ${provider} fetched successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch cable TV packages",
            error: error.message
        });
    }
};

export const verifyCableTVSmartcard = async (req, res) => {
    try {
        const { provider, smartcard } = req.body;

        if (!provider || !smartcard) {
            return res.status(400).json({
                success: false,
                message: "Provider and smartcard are required"
            });
        }

        const verification = await n3data.verifyCableTVSmartcard(provider, smartcard);
        res.json({
            success: true,
            data: verification,
            message: "Smartcard verified successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to verify smartcard",
            error: error.message
        });
    }
};

// ========== ELECTRICITY PLANS ==========
export const getElectricityDiscos = async (req, res) => {
    try {
        const discos = await n3data.getElectricityDiscos();
        res.json({
            success: true,
            data: discos,
            message: "Electricity DISCOs fetched successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch electricity DISCOs",
            error: error.message
        });
    }
};

export const verifyElectricityMeter = async (req, res) => {
    try {
        const { disco, meter, type } = req.body;

        if (!disco || !meter || !type) {
            return res.status(400).json({
                success: false,
                message: "DISCO, meter number, and meter type are required"
            });
        }

        const verification = await n3data.verifyElectricityMeter(disco, meter, type);
        res.json({
            success: true,
            data: verification,
            message: "Meter verified successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to verify meter",
            error: error.message
        });
    }
};

// ========== EDUCATION INSTITUTIONS ==========
export const getEducationInstitutions = async (req, res) => {
    try {
        const institutions = await n3data.getEducationInstitutions();
        res.json({
            success: true,
            data: institutions,
            message: "Education institutions fetched successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch education institutions",
            error: error.message
        });
    }
};

export const verifyStudentId = async (req, res) => {
    try {
        const { institution, studentId } = req.body;

        if (!institution || !studentId) {
            return res.status(400).json({
                success: false,
                message: "Institution and student ID are required"
            });
        }

        const verification = await n3data.verifyStudentId(institution, studentId);
        res.json({
            success: true,
            data: verification,
            message: "Student ID verified successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to verify student ID",
            error: error.message
        });
    }
};