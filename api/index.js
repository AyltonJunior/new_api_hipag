require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Função para esperar um tempo específico
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Middleware para CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Token');
    next();
});

// Middleware para verificar token no header
const checkToken = (req, res, next) => {
  const token = req.header('X-Token');
  if (!token || token !== '1be10a9c20528183b64e3c69564db6958eab7f434ee94350706adb4efc261869') {
    return res.status(401).json({ 
      error: 'Token inválido ou não fornecido',
      message: 'Forneça um token válido no header X-Token'
    });
  }
  req.blynkToken = 'P90q6DQC3navgp6g5amdKKyiVzExUKKZ'; // Token do Blynk
  next();
};

// Aplica middleware em todas as rotas
app.use(checkToken);

// Função para verificar uma lavadora específica
async function checkWasher(token, number, waitTime = 5000) {
    try {
        // Primeiro link: Envia comando para atualizar status (V7=número)
        const updateUrl = `https://ny3.blynk.cloud/external/api/update?token=${token}&V7=${number}`;
        console.log(`\n=== Verificando Lavadora ${number} ===`);
        console.log('1. Enviando comando de atualização:');
        console.log(`   URL: ${updateUrl}`);
        
        const updateResponse = await axios.get(updateUrl);
        console.log(`   Resposta: ${JSON.stringify(updateResponse.data)}`);

        // Espera o tempo especificado
        console.log(`2. Aguardando ${waitTime/1000} segundos...`);
        await sleep(waitTime);

        // Segundo link: Busca status da lavadora (V11, V21 ou V31)
        const pinNumber = `V${number}1`;
        const statusUrl = `https://ny3.blynk.cloud/external/api/get?token=${token}&${pinNumber}`;
        console.log('3. Verificando status:');
        console.log(`   URL: ${statusUrl}`);
        
        const response = await axios.get(statusUrl);
        console.log(`   Resposta: ${response.data}`);
        
        // Se a resposta for 1, está online, se for 0 está offline
        const status = response.data === 1 ? 'online' : 'offline';
        console.log(`4. Status final: ${status} (${response.data})\n`);

        return status;
    } catch (error) {
        console.error(`\nERRO ao verificar lavadora ${number}:`);
        console.error(`   ${error.message}\n`);
        throw error;
    }
}

// Função para verificar uma secadora específica
async function checkDryer(token, number, waitTime = 5000) {
    try {
        // Primeiro link: Envia comando para atualizar status (V8=número)
        const updateUrl = `https://ny3.blynk.cloud/external/api/update?token=${token}&V8=${number}`;
        console.log(`\n=== Verificando Secadora ${number} ===`);
        console.log('1. Enviando comando de atualização:');
        console.log(`   URL: ${updateUrl}`);
        
        const updateResponse = await axios.get(updateUrl);
        console.log(`   Resposta: ${JSON.stringify(updateResponse.data)}`);

        // Espera o tempo especificado
        console.log(`2. Aguardando ${waitTime/1000} segundos...`);
        await sleep(waitTime);

        // Segundo link: Busca status da secadora (V41=765, V51=876, V61=987)
        const pinMap = {
            1: 'V41', // 765 - 192.168.0.104
            2: 'V51', // 876 - 192.168.0.105
            3: 'V61'  // 987 - 192.168.0.106
        };
        const pinNumber = pinMap[number];
        const statusUrl = `https://ny3.blynk.cloud/external/api/get?token=${token}&${pinNumber}`;
        console.log('3. Verificando status:');
        console.log(`   URL: ${statusUrl}`);
        
        const response = await axios.get(statusUrl);
        console.log(`   Resposta: ${response.data}`);
        
        // Se a resposta for 1, está online, se for 0 está offline
        const status = response.data === 1 ? 'online' : 'offline';
        console.log(`4. Status final: ${status} (${response.data})\n`);

        return status;
    } catch (error) {
        console.error(`\nERRO ao verificar secadora ${number}:`);
        console.error(`   ${error.message}\n`);
        throw error;
    }
}

// Endpoint para verificar status das máquinas
app.get('/api/status', async (req, res) => {
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

        // Verifica status da máquina
        const isWasher = ['432', '543', '654'].includes(machine);
        if (isWasher) {
            const washerMap = {
                '432': 1,
                '543': 2,
                '654': 3
            };
            const washerNumber = washerMap[machine];
            const status = await checkWasher(token, washerNumber);
            
            if (status === "offline") {
                machineOffline = true;
                response.error = `Lavadora ${machine} está offline`;
                response.machine = machine;
                response.status = status;
            } else {
                response[`lavadora${machine}`] = status;
            }
        } else {
            const dryerMap = {
                '765': 1,
                '876': 2,
                '987': 3
            };
            const dryerNumber = dryerMap[machine];
            const status = await checkDryer(token, dryerNumber);
            
            if (status === "offline") {
                machineOffline = true;
                response.error = `Secadora ${machine} está offline`;
                response.machine = machine;
                response.status = status;
            } else {
                response[`secadora${machine}`] = status;
            }
        }

        // Se foi especificada uma loja, consulta status do ar condicionado
        if (store) {
            try {
                const storeUrl = `https://sistema.lavanderia60minutos.com.br/api/v1/stores/${store}`;
                const storeResponse = await axios.get(storeUrl, {
                    headers: {
                        'X-Token': '1be10a9c20528183b64e3c69564db6958eab7f434ee94350706adb4efc261869'
                    }
                });
                
                const powerAir = storeResponse.data?.data?.attributes?.['power-air'] || '[]';
                response.airConditioner = {
                    store: store,
                    powerAir: powerAir
                };

                // Se o ar condicionado estiver ligado, envia comando para o Blynk
                if (powerAir === 'low' || powerAir === 'mid') {
                    const blynkValue = powerAir === 'low' ? '1' : '2';
                    const blynkUrl = `https://ny3.blynk.cloud/external/api/update?token=${token}&v10=${blynkValue}`;
                    await axios.get(blynkUrl);
                }
            } catch (storeError) {
                console.error('Erro ao consultar status do ar condicionado:', storeError.message);
                response.airConditioner = {
                    error: 'Erro ao consultar status do ar condicionado',
                    message: storeError.message
                };
            }
        }

        // Se a máquina estiver offline, retorna erro 500
        if (machineOffline) {
            return res.status(500).json(response);
        }

        res.json(response);
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        res.status(500).json({ 
            error: 'Erro ao verificar status',
            message: error.message
        });
    }
});

// Endpoint para verificar se o hardware Blynk está online
app.get('/api/hardware', async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
        return res.status(400).json({ error: 'Token não fornecido' });    
    }

    try {
        const url = `https://ny3.blynk.cloud/external/api/isHardwareConnected?token=${token}`;
        console.log(`\n=== Verificando Hardware Blynk ===`);
        console.log(`URL: ${url}`);
        
        const response = await axios.get(url);
        console.log(`Resposta:`, response.data);

        if (response.data === true) {
            return res.json({ 
                success: true,
                message: 'Hardware Blynk está online'
            });
        } else {
            return res.status(500).json({ 
                error: 'Hardware Blynk está offline'
            });
        }
    } catch (error) {
        console.error(`Erro ao verificar hardware:`, error.message);
        return res.status(500).json({ 
            error: 'Erro ao verificar hardware',
            message: error.message 
        });
    }
});

// Endpoint unificado para verificar status de qualquer máquina
app.get('/api/machines', async (req, res) => {
    const { machine } = req.query;
    
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
        // Identifica se é lavadora ou secadora pelo número
        const isWasher = ['432', '543', '654'].includes(machine);
        
        if (isWasher) {
            const washerMap = {
                '432': 1,
                '543': 2,
                '654': 3
            };
            const washerNumber = washerMap[machine];
            const status = await checkWasher(req.blynkToken, washerNumber);
            
            return res.json({
                [`lavadora${machine}`]: status
            });
        } else {
            const dryerMap = {
                '765': 1,
                '876': 2,
                '987': 3
            };
            const dryerNumber = dryerMap[machine];
            const status = await checkDryer(req.blynkToken, dryerNumber);
            
            return res.json({
                [`secadora${machine}`]: status
            });
        }
    } catch (error) {
        console.error(`Erro ao verificar máquina ${machine}:`, error.message);
        return res.status(500).json({ 
            error: `Erro ao verificar máquina ${machine}`,
            message: error.message 
        });
    }
});

// Endpoint para liberar máquinas
app.get('/api/release', async (req, res) => {
    const { token, machine, timmer, softener, dosage } = req.query;
    
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
        // Identifica se é lavadora ou secadora pelo número
        const isWasher = ['432', '543', '654'].includes(machine);
        
        if (isWasher) {
            const washerMap = {
                '432': 1,
                '543': 2,
                '654': 3
            };
            const washerNumber = washerMap[machine];

            // Converte softener e dosage para o programa correto
            let program = 0;

            if (!softener || softener === 'nosmell') {
                program = 0;  // Sem amaciante
            } else {
                // Valida o amaciante
                if (!['floral', 'sport'].includes(softener)) {
                    return res.status(400).json({ 
                        error: 'Amaciante inválido',
                        valid_softeners: ['nosmell', 'floral', 'sport']
                    });
                }

                // Valida a dosagem
                if (!dosage || !['1', '2'].includes(dosage)) {
                    return res.status(400).json({ 
                        error: 'Dosagem inválida',
                        valid_dosages: ['1', '2']
                    });
                }

                // Mapeia para o programa correto
                if (softener === 'floral') {
                    program = dosage === '1' ? 1 : 2;  // Floral dosagem simples ou dupla
                } else if (softener === 'sport') {
                    program = dosage === '1' ? 3 : 4;  // Sport dosagem simples ou dupla
                }
            }

            // Primeiro verifica o status
            const status = await checkWasher(token, washerNumber);
            if (status === "offline") {
                return res.status(500).json({
                    error: `Lavadora ${machine} está offline`,
                    machine,
                    status
                });
            }

            // Se estiver online, envia comando para V1/V2/V3 com o programa
            const pinMap = {
                1: 'V1',
                2: 'V2',
                3: 'V3'
            };
            const pin = pinMap[washerNumber];
            
            const url = `https://ny3.blynk.cloud/external/api/update?token=${token}&${pin}=${program}`;
            console.log(`\n=== Liberando Lavadora ${washerNumber} ===`);
            console.log(`Amaciante: ${softener || 'nosmell'}`);
            if (softener !== 'nosmell') {
                console.log(`Dosagem: ${dosage}`);
            }
            console.log(`URL: ${url}`);
            
            const response = await axios.get(url);
            console.log(`Resposta:`, response.data);

            return res.json({ 
                success: true,
                message: softener === 'nosmell' 
                    ? `Comando enviado para lavadora ${washerNumber} sem amaciante`
                    : `Comando enviado para lavadora ${washerNumber} com amaciante ${softener} dosagem ${dosage}`
            });
        } else {
            const dryerMap = {
                '765': 1,
                '876': 2,
                '987': 3
            };
            const dryerNumber = dryerMap[machine];

            // Valida o tempo
            if (!timmer || ![15, 30, 45].includes(parseInt(timmer))) {
                return res.status(400).json({ 
                    error: 'Tempo inválido para secadora',
                    valid_times: [15, 30, 45]
                });
            }

            // Primeiro verifica o status
            const status = await checkDryer(token, dryerNumber);
            if (status === "offline") {
                return res.status(500).json({
                    error: `Secadora ${machine} está offline`,
                    machine,
                    status
                });
            }

            // Se estiver online, envia comando para V4/V5/V6 com o tempo desejado
            const pinMap = {
                1: 'V4',
                2: 'V5',
                3: 'V6'
            };
            const pin = pinMap[dryerNumber];
            
            const url = `https://ny3.blynk.cloud/external/api/update?token=${token}&${pin}=${timmer}`;
            console.log(`\n=== Liberando Secadora ${dryerNumber} ===`);
            console.log(`Tempo: ${timmer} minutos`);
            console.log(`URL: ${url}`);
            
            const response = await axios.get(url);
            console.log(`Resposta:`, response.data);

            return res.json({ 
                success: true,
                message: `Comando enviado para secadora ${dryerNumber} por ${timmer} minutos`
            });
        }
    } catch (error) {
        console.error(`Erro ao liberar máquina ${machine}:`, error.message);
        return res.status(500).json({ 
            error: `Erro ao liberar máquina ${machine}`,
            message: error.message 
        });
    }
});

// Endpoint para consultar API da lavanderia
app.get('/api/store/:store', async (req, res) => {
    const { store } = req.params;
    
    try {
        console.log('\n=== Consultando API da Lavanderia ===');
        console.log(`Store: ${store}`);
        
        const url = `https://sistema.lavanderia60minutos.com.br/api/v1/stores/${store}`;
        console.log(`URL: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'X-Token': '1be10a9c20528183b64e3c69564db6958eab7f434ee94350706adb4efc261869'
            }
        });
        
        const powerAir = response.data?.data?.attributes?.['power-air'] || '[]';
        console.log('\nStatus do Ar Condicionado:', powerAir);

        // Enviar comando para o Blynk baseado no status do ar condicionado
        if (powerAir === 'low' || powerAir === 'mid') {
            const blynkValue = powerAir === 'low' ? '1' : '2';
            const blynkUrl = `https://ny3.blynk.cloud/external/api/update?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&v10=${blynkValue}`;
            
            console.log(`\nEnviando comando ${blynkValue} para V10 no Blynk`);
            await axios.get(blynkUrl);
        }
        
        return res.json({
            store: store,
            powerAir: powerAir
        });
    } catch (error) {
        console.error('\nErro ao consultar API da lavanderia:', error.message);
        if (error.response) {
            console.error('Resposta de erro:', error.response.data);
        }
        return res.status(500).json({ 
            error: 'Erro ao consultar API da lavanderia',
            message: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.json({ message: 'API está funcionando!' });
});

// Inicia o servidor
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
  });
}

// Exporta para o Vercel
module.exports = app;
