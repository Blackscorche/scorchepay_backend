import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const N3DATA_BASE_URL = "https://n3tdata.com/api";
const N3DATA_USERNAME = process.env.N3DATA_USERNAME;
const N3DATA_PASSWORD = process.env.N3DATA_PASSWORD;

let n3dataToken = null;

// ====================== AUTH ======================
async function getN3DataToken() {
    if (n3dataToken) return n3dataToken;

    const basicAuth = Buffer.from(`${N3DATA_USERNAME}:${N3DATA_PASSWORD}`).toString("base64");

    try {
        const res = await axios.post(
            `${N3DATA_BASE_URL}/user`,
            {},
            {
                headers: {
                    Authorization: `Basic ${basicAuth}`,
                },
                timeout: 10000,
            }
        );

        const token = res.data?.AccessToken;
        if (!token) {
            console.error("❌ No AccessToken in response", res.data);
            throw new Error("Token not returned");
        }

        n3dataToken = token;
        console.log("🔐 N3Data token obtained");
        return token;
    } catch (err) {
        console.error("❌ Failed to get N3Data token:", err.response?.data || err.message);
        throw new Error("Authentication with N3Data failed");
    }
}

// ====================== SERVICE FUNCTIONS ======================

// Airtime
export const buyAirtime = async ({ network, amount, phone }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/airtime/buy`,
        { network, amount, phone },
        { headers: { Authorization: `Token ${token}` } }
    );
    return res.data;
};

export const buyData = async ({ network, phone, data_plan, requestId, bypass = false }) => {
    const token = await getN3DataToken();

    const payload = {
        network,            // e.g. 1 for MTN
        phone,              // e.g. "09037959033"
        data_plan,          // e.g. 1 for 1GB
        bypass,             // boolean
        "request-id": requestId, // e.g. "Data_12345678900"
    };

    const res = await axios.post(`${N3DATA_BASE_URL}/data`, payload, {
        headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
        },
        timeout: 10000,
    });

    return res.data;
};


// Cable TV
export const payCableTV = async ({ provider, smartcard, packageName }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/cabletv/pay`,
        { provider, smartcard, packageName },
        { headers: { Authorization: `Token ${token}` } }
    );
    return res.data;
};

// Electricity
export const payElectricity = async ({ disco, meter, type, amount }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/electricity/pay`,
        { disco, meter, type, amount },
        { headers: { Authorization: `Token ${token}` } }
    );
    return res.data;
};

// Education
export const payEducation = async ({ institution, studentId, amount }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/education/pay`,
        { institution, studentId, amount },
        { headers: { Authorization: `Token ${token}` } }
    );
    return res.data;
};

// ====================== FETCH / VERIFY ======================

// Airtime
export const getAirtimeNetworks = async () => {
    const token = await getN3DataToken();
    const res = await axios.get(`${N3DATA_BASE_URL}/airtime/networks`, {
        headers: { Authorization: `Token ${token}` },
    });
    return res.data;
};

// Data
export const getDataPlans = async (network) => {
    const token = await getN3DataToken();
    const res = await axios.get(`${N3DATA_BASE_URL}/data/plans/${network}`, {
        headers: { Authorization: `Token ${token}` },
    });
    return res.data;
};

export const getAllDataPlans = async () => {
    const token = await getN3DataToken();
    const res = await axios.get(`${N3DATA_BASE_URL}/data/plans`, {
        headers: { Authorization: `Token ${token}` },
    });
    return res.data;
};

// Cable TV
export const getCableTVProviders = async () => {
    const token = await getN3DataToken();
    const res = await axios.get(`${N3DATA_BASE_URL}/cabletv/providers`, {
        headers: { Authorization: `Token ${token}` },
    });
    return res.data;
};

export const getCableTVPackages = async (provider) => {
    const token = await getN3DataToken();
    const res = await axios.get(`${N3DATA_BASE_URL}/cabletv/packages/${provider}`, {
        headers: { Authorization: `Token ${token}` },
    });
    return res.data;
};

export const verifyCableTVSmartcard = async (provider, smartcard) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/cabletv/verify`,
        { provider, smartcard },
        { headers: { Authorization: `Token ${token}` } }
    );
    return res.data;
};

// Electricity
export const getElectricityDiscos = async () => {
    const token = await getN3DataToken();
    const res = await axios.get(`${N3DATA_BASE_URL}/electricity/discos`, {
        headers: { Authorization: `Token ${token}` },
    });
    return res.data;
};

export const verifyElectricityMeter = async (disco, meter, type) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/electricity/verify`,
        { disco, meter, type },
        { headers: { Authorization: `Token ${token}` } }
    );
    return res.data;
};

// Education
export const getEducationInstitutions = async () => {
    const token = await getN3DataToken();
    const res = await axios.get(`${N3DATA_BASE_URL}/education/institutions`, {
        headers: { Authorization: `Token ${token}` },
    });
    return res.data;
};

export const verifyStudentId = async (institution, studentId) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/education/verify`,
        { institution, studentId },
        { headers: { Authorization: `Token ${token}` } }
    );
    return res.data;
};
