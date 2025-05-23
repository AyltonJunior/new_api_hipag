const axios = require('axios');

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
    const { machine, timmer, softener, dosage } = req.query;
    // Token fixo do Blynk, como no Express
    const token = 'P90q6DQC3navgp6g5amdKKyiVzExUKKZ';
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
        // Lavadora
        const isWasher = ['432', '543', '654'].includes(machine);
        if (isWasher) {
            const washerMap = { '432': 1, '543': 2, '654': 3 };
            const washerNumber = washerMap[machine];
            // Converte softener e dosage para o programa correto
            let program = 0;
            if (!softener || softener === 'nosmell') {
                program = 0;  // Sem amaciante
            } else {
                if (!['floral', 'sport'].includes(softener)) {
                    return res.status(400).json({ error: 'Amaciante inválido', valid_softeners: ['floral', 'sport', 'nosmell'] });
                }
                if (!['1', '2'].includes(dosage)) {
                    return res.status(400).json({ error: 'Dosagem inválida', valid_dosages: ['1', '2'] });
                }
                if (softener === 'floral') {
                    program = dosage === '1' ? 1 : 2;  // Floral dosagem simples ou dupla
                } else if (softener === 'sport') {
                    program = dosage === '1' ? 3 : 4;  // Sport dosagem simples ou dupla
                }
            }
            // Primeiro verifica o status
            const status = await checkWasher(token, washerNumber);
            if (status === 'offline') {
                return res.status(500).json({ error: `Lavadora ${machine} está offline`, machine, status });
            }
            // Se estiver online, envia comando para V1/V2/V3 com o programa
            const pinMap = { 1: 'V1', 2: 'V2', 3: 'V3' };
            const pin = pinMap[washerNumber];
            const url = `https://ny3.blynk.cloud/external/api/update?token=${token}&${pin}=${program}`;
            await axios.get(url);
            return res.json({ success: true, message: softener === 'nosmell' ? `Comando enviado para lavadora ${washerNumber} sem amaciante` : `Comando enviado para lavadora ${washerNumber} com amaciante ${softener} dosagem ${dosage}` });
        } else {
            // Secadora
            const dryerMap = { '765': 1, '876': 2, '987': 3 };
            const dryerNumber = dryerMap[machine];
            if (!timmer || ![15, 30, 45].includes(parseInt(timmer))) {
                return res.status(400).json({ error: 'Tempo inválido para secadora', valid_times: [15, 30, 45] });
            }
            // Primeiro verifica o status
            const status = await checkDryer(token, dryerNumber);
            if (status === 'offline') {
                return res.status(500).json({ error: `Secadora ${machine} está offline`, machine, status });
            }
            // Se estiver online, envia comando para V4/V5/V6 com o tempo desejado
            const pinMap = { 1: 'V4', 2: 'V5', 3: 'V6' };
            const pin = pinMap[dryerNumber];
            const url = `https://ny3.blynk.cloud/external/api/update?token=${token}&${pin}=${timmer}`;
            await axios.get(url);
            return res.json({ success: true, message: `Comando enviado para secadora ${dryerNumber} por ${timmer} minutos` });
        }
    } catch (error) {
        return res.status(500).json({ error: `Erro ao liberar máquina ${machine}`, message: error.message });
    }
};
