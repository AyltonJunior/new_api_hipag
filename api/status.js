const axios = require('axios');

// Funções utilitárias copiadas do index.js
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkWasher(token, number, waitTime = 5000) {
    const updateUrl = `https://ny3.blynk.cloud/external/api/update?token=${token}&V7=${number}`;
    await axios.get(updateUrl);
    await sleep(waitTime);
    const pinNumber = `V${number}1`;
    const statusUrl = `https://ny3.blynk.cloud/external/api/get?token=${token}&${pinNumber}`;
    const response = await axios.get(statusUrl);
    return response.data === 1 ? 'online' : 'offline';
}

async function checkDryer(token, number, waitTime = 5000) {
    const updateUrl = `https://ny3.blynk.cloud/external/api/update?token=${token}&V8=${number}`;
    await axios.get(updateUrl);
    await sleep(waitTime);
    const pinMap = { 1: 'V41', 2: 'V51', 3: 'V61' };
    const pinNumber = pinMap[number];
    const statusUrl = `https://ny3.blynk.cloud/external/api/get?token=${token}&${pinNumber}`;
    const response = await axios.get(statusUrl);
    return response.data === 1 ? 'online' : 'offline';
}

module.exports = async (req, res) => {
    const { token, machine, store } = req.query;
    if (!token) {
        return res.status(400).json({ error: 'Token não fornecido' });
    }
    if (!machine || !['432', '543', '654', '765', '876', '987'].includes(machine)) {
        return res.status(400).json({
            error: 'Número da máquina inválido',
            valid_machines: {
                lavadoras: ['432', '543', '654'],
                secadoras: ['765', '876', '987']
            }
        });
    }
    try {
        let response = {};
        let machineOffline = false;
        const isWasher = ['432', '543', '654'].includes(machine);
        if (isWasher) {
            const washerMap = { '432': 1, '543': 2, '654': 3 };
            const washerNumber = washerMap[machine];
            const status = await checkWasher(token, washerNumber);
            if (status === 'offline') {
                machineOffline = true;
                response.error = `Lavadora ${machine} está offline`;
                response.machine = machine;
                response.status = status;
            } else {
                response[`lavadora${machine}`] = status;
            }
        } else {
            const dryerMap = { '765': 1, '876': 2, '987': 3 };
            const dryerNumber = dryerMap[machine];
            const status = await checkDryer(token, dryerNumber);
            if (status === 'offline') {
                machineOffline = true;
                response.error = `Secadora ${machine} está offline`;
                response.machine = machine;
                response.status = status;
            } else {
                response[`secadora${machine}`] = status;
            }
        }
        if (store) {
            try {
                const storeUrl = `https://sistema.lavanderia60minutos.com.br/api/v1/stores/${store}`;
                const storeResponse = await axios.get(storeUrl, {
                    headers: {
                        'X-Token': '1be10a9c20528183b64e3c69564db6958eab7f434ee94350706adb4efc261869'
                    }
                });
                const powerAir = storeResponse.data?.data?.attributes?.['power-air'] || '[]';
                response.airConditioner = { store, powerAir };
                if (powerAir === 'low' || powerAir === 'mid') {
                    const blynkValue = powerAir === 'low' ? '1' : '2';
                    const blynkUrl = `https://ny3.blynk.cloud/external/api/update?token=${token}&v10=${blynkValue}`;
                    await axios.get(blynkUrl);
                }
            } catch (storeError) {
                response.airConditioner = {
                    error: 'Erro ao consultar status do ar condicionado',
                    message: storeError.message
                };
            }
        }
        if (machineOffline) {
            return res.status(500).json(response);
        }
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar status', message: error.message });
    }
};
