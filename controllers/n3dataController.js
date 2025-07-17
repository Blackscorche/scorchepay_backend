import * as n3data from "../utils/n3data.js";

export const buyAirtime = async (req, res) => {
    try {
        const { network, amount, phone } = req.body;
        const result = await n3data.buyAirtime({ network, amount, phone });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const buyData = async (req, res) => {
    try {
        const { network, plan, phone } = req.body;
        const result = await n3data.buyData({ network, plan, phone });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const payCableTV = async (req, res) => {
    try {
        const { provider, smartcard, packageName } = req.body;
        const result = await n3data.payCableTV({ provider, smartcard, packageName });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const payElectricity = async (req, res) => {
    try {
        const { disco, meter, type, amount } = req.body;
        const result = await n3data.payElectricity({ disco, meter, type, amount });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const fundBetting = async (req, res) => {
    try {
        const { platform, account, amount } = req.body;
        const result = await n3data.fundBetting({ platform, account, amount });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const payEducation = async (req, res) => {
    try {
        const { institution, studentId, amount } = req.body;
        const result = await n3data.payEducation({ institution, studentId, amount });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
