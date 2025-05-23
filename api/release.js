const admin = require('firebase-admin');

// Inicializa o Firebase Admin apenas uma vez (serverless safe)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}
const db = admin.database();

module.exports = async (req, res) => {
  const REQUIRED_TOKEN = "1be10a9c20528183b64e3c69564db6958eab7f434ee94350706adb4efc261869";
  const token = req.headers["x-token"];
  if (token !== REQUIRED_TOKEN) {
    return res.status(401).json({
      error: "Unauthorized: missing or invalid X-Token header"
    });
  }
  try {
    let { store, machine, timmer, softener, dosage } = req.query;

    if (!store || !machine) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['store', 'machine']
      });
    }

    // Handle single values as arrays
    if (!Array.isArray(store)) {
      try { store = JSON.parse(store); if (!Array.isArray(store)) store = [store]; } catch { store = [store]; }
    }
    if (!Array.isArray(machine)) {
      try { machine = JSON.parse(machine); if (!Array.isArray(machine)) machine = [machine]; } catch { machine = [machine]; }
    }
    if (timmer && !Array.isArray(timmer)) {
      try { timmer = JSON.parse(timmer); if (!Array.isArray(timmer)) timmer = [timmer]; } catch { timmer = [timmer]; }
    }
    if (softener && !Array.isArray(softener)) {
      try { softener = JSON.parse(softener); if (!Array.isArray(softener)) softener = [softener]; } catch { softener = [softener]; }
    }
    if (dosage && !Array.isArray(dosage)) {
      try { dosage = JSON.parse(dosage); if (!Array.isArray(dosage)) dosage = [dosage]; } catch { dosage = [dosage]; }
    }

    // Função para aguardar um nó ter valor esperado
    const waitForValue = async (ref, expected, timeoutMs = 15000, intervalMs = 1000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const value = await ref.once('value').then(snap => snap.val());
        if (value === expected || value === String(expected)) return true;
        await new Promise(res => setTimeout(res, intervalMs));
      }
      return false;
    };

    // Se softener e dosage existem, fluxo especial para lavadoras + dosadora
    if (softener && dosage) {
      const results = [];
      for (let i = 0; i < machine.length; i++) {
        const storeId = store[i] || store[0];
        const machineId = machine[i];
        const soft = softener[i] || softener[0];
        const dos = dosage[i] || dosage[0];
        // Mapear softener
        let amaciante = 0;
        if (soft === 'floral') amaciante = 1;
        else if (soft === 'sport') amaciante = 2;
        else if (soft === 'nosmell') amaciante = 3;
        // Mapear dosage
        let dosagem = 0;
        if (dos === '1' || dos === 1) dosagem = 1;
        else if (dos === '2' || dos === 2) dosagem = 2;
        // Mapear softener_endpoint
        let softenerEndpoint = '';
        if (soft === 'floral') softenerEndpoint = 'softener1';
        else if (soft === 'sport') softenerEndpoint = 'softener2';
        else if (soft === 'nosmell') softenerEndpoint = 'softener0';
        // Mapear dosagem_endpoint
        let dosagemEndpoint = '';
        if (soft === 'floral' && (dos === '1' || dos === 1)) dosagemEndpoint = 'am01-1';
        else if (soft === 'floral' && (dos === '2' || dos === 2)) dosagemEndpoint = 'am01-2';
        else if (soft === 'sport' && (dos === '1' || dos === 1)) dosagemEndpoint = 'am02-1';
        else if (soft === 'sport' && (dos === '2' || dos === 2)) dosagemEndpoint = 'am02-2';
        else if (soft === 'nosmell' && (dos === '1' || dos === 1)) dosagemEndpoint = 'am00-1';
        else if (soft === 'nosmell' && (dos === '2' || dos === 2)) dosagemEndpoint = 'am00-2';
        // Envia comandos para dosadora (ajustado para subnó da máquina)
        const dosadoraPath = `${storeId}/dosadora_01/${machineId}`;
        // 1. Envia softener_endpoint e dosagem_endpoint primeiro
        await db.ref(`${dosadoraPath}/softener_endpoint`).set(softenerEndpoint);
        await db.ref(`${dosadoraPath}/dosagem_endpoint`).set(dosagemEndpoint);
        // 2. Depois envia amaciante e dosagem
        await db.ref(`${dosadoraPath}/amaciante`).set(amaciante);
        await db.ref(`${dosadoraPath}/dosagem`).set(dosagem);
        // 3. Libera lavadora
        const lavadoraPath = `${storeId}/lavadoras/${machineId}`;
        await db.ref(lavadoraPath).set(true);
        // Aguarda lavadora voltar para false
        const lavadoraOk = await waitForValue(db.ref(lavadoraPath), false, 15000);
        results.push({
          store: storeId,
          machine: machineId,
          softener: soft,
          dosage: dos,
          path: lavadoraPath,
          value: true,
          success: lavadoraOk,
          message: lavadoraOk ? 'Lavadora liberada com sucesso.' : 'Lavadora não respondeu, pode estar offline.'
        });
      }
      const now = Date.now();
      const allOk = results.every(r => r.success);
      if (allOk) {
        res.json({
          success: true,
          message: 'Todas as lavadoras liberadas com sucesso.',
          updated_nodes: results,
          timestamp: now
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Uma ou mais lavadoras/dosadoras não responderam.',
          updated_nodes: results,
          timestamp: now
        });
      }
      return;
    }

    // --- Fluxo padrão secadora/lavadora simples ---
    let paths;
    let updated_nodes;
    // Se timmer existe, libera secadora
    if (timmer) {
      paths = machine.map((machineId, index) => {
        const storeId = store[index] || store[0];
        return `${storeId}/secadoras/${machineId}`;
      });
    } else {
      // Libera lavadora
      paths = machine.map((machineId, index) => {
        const storeId = store[index] || store[0];
        return `${storeId}/lavadoras/${machineId}`;
      });
    }

    await Promise.all(paths.map(path => db.ref(path).set(true)));

    // Aguarda todos voltarem para false
    const waitForAllFalse = async (refs, timeoutMs = 15000, intervalMs = 500) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const vals = await Promise.all(refs.map(ref => ref.once('value').then(snap => snap.val())));
        if (vals.every(val => val === false || val === 'false')) return true;
        await new Promise(res => setTimeout(res, intervalMs));
      }
      return false;
    };
    const refs = paths.map(path => db.ref(path));
    const ok = await waitForAllFalse(refs, 15000);
    const now = Date.now();

    if (ok) {
      res.json({
        success: true,
        message: 'Todas as máquinas liberadas com sucesso.',
        updated_nodes: paths,
        timestamp: now
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Uma ou mais máquinas não responderam.',
        updated_nodes: paths,
        timestamp: now
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
