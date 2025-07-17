import axios from "axios";


const N3DATA_BASE_URL = "https://api.n3data.com/v1"; // Replace with actual base URL if different
const N3DATA_USERNAME = process.env.N3DATA_USERNAME;
const N3DATA_PASSWORD = process.env.N3DATA_PASSWORD;

let n3dataToken = null;

async function getN3DataToken() {
    if (n3dataToken) return n3dataToken;
    const basicAuth = Buffer.from(`${N3DATA_USERNAME}:${N3DATA_PASSWORD}`).toString("base64");
    const res = await axios.post(
        `${N3DATA_BASE_URL}/auth/token`,
        {},
        { headers: { Authorization: `Basic ${basicAuth}` } }
    );
    n3dataToken = res.data.token;
    return n3dataToken;
}


export const buyAirtime = async ({ network, amount, phone }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/airtime/buy`,
        { network, amount, phone },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};


export const buyData = async ({ network, plan, phone }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/data/buy`,
        { network, plan, phone },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};



export const payCableTV = async ({ provider, smartcard, packageName }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/cabletv/pay`,
        { provider, smartcard, packageName },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};


export const payElectricity = async ({ disco, meter, type, amount }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/electricity/pay`,
        { disco, meter, type, amount },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};


export const fundBetting = async ({ platform, account, amount }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/betting/fund`,
        { platform, account, amount },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};


export const payEducation = async ({ institution, studentId, amount }) => {
    const token = await getN3DataToken();
    const res = await axios.post(
        `${N3DATA_BASE_URL}/education/pay`,
        { institution, studentId, amount },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};
