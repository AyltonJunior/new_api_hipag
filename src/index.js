const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hi-pag-303ad-default-rtdb.firebaseio.com"
});

const db = admin.database();

// Release dryer/washing machine endpoint
app.get('/api/release', async (req, res) => {
  const REQUIRED_TOKEN = "1be10a9c20528183b64e3c69564db6958eab7f434ee94350706adb4efc261869";
  const token = req.header("X-Token");
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
        console.log(
          `[DEBUG] Lendo ${ref && ref.path && typeof ref.path.toString === 'function' ? ref.path.toString() : '[path indefinido]'}:`,
          value,
          'esperado:',
          expected
        );
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
        // Envia comandos para dosadora (ajustado para subnó da máquina)
        const dosadoraPath = `${storeId}/dosadora_01/${machineId}`;
        // 1. Envia softener_endpoint e dosagem_endpoint primeiro
        await db.ref(`${dosadoraPath}/softener_endpoint`).set(softenerEndpoint);
        await db.ref(`${dosadoraPath}/dosagem_endpoint`).set(dosagemEndpoint);
        // 2. Depois envia amaciante e dosagem
        await db.ref(`${dosadoraPath}/amaciante`).set(amaciante);
        await db.ref(`${dosadoraPath}/dosagem`).set(dosagem);
        // Aguarda dosagem voltar para 0
        const dosagemRef = db.ref(`${dosadoraPath}/dosagem`);
        const dosadoraOk = await waitForValue(dosagemRef, 0, 15000);
        if (!dosadoraOk) {
          results.push({
            store: storeId,
            machine: machineId,
            softener: soft,
            dosage: dos,
            path: `${dosadoraPath}`,
            value: { amaciante, dosagem },
            success: false,
            message: 'Dosadora não respondeu (dosagem != 0), lavadora não liberada.'
          });
          continue;
        }
        // Libera lavadora
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
        const timer = timmer[index] || timmer[0];
        return `${storeId}/secadoras/${machineId}_${timer}`;
      });
      updated_nodes = machine.map((machineId, index) => {
        const storeId = store[index] || store[0];
        const timer = timmer[index] || timmer[0];
        return {
          store: storeId,
          machine: machineId,
          timer: timer,
          path: `${storeId}/secadoras/${machineId}_${timer}`,
          value: true
        };
      });
    } else { // Se não, libera lavadora simples
      paths = machine.map((machineId, index) => {
        const storeId = store[index] || store[0];
        return `${storeId}/lavadoras/${machineId}`;
      });
      updated_nodes = machine.map((machineId, index) => {
        const storeId = store[index] || store[0];
        return {
          store: storeId,
          machine: machineId,
          path: `${storeId}/lavadoras/${machineId}`,
          value: true
        };
      });
    }

    await Promise.all(paths.map(path => db.ref(path).set(true)));

    // Função para aguardar todos os nós voltarem para false
    const waitForAllFalse = async (refs, timeoutMs = 15000, intervalMs = 500) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const values = await Promise.all(refs.map(ref => ref.once('value').then(snap => snap.val())));
        if (values.every(val => val === false)) return true;
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
        message: timmer ? "Secadora(s) liberada(s) com sucesso." : "Lavadora(s) liberada(s) com sucesso.",
        updated_nodes,
        timestamp: now
      });
    } else {
      res.status(400).json({
        success: false,
        message: timmer ? "Dispositivo da secadora não respondeu, pode estar offline." : "Dispositivo da lavadora não respondeu, pode estar offline.",
        updated_nodes,
        timestamp: now
      });
    }

  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: 'Error processing release request'
    });
  }
});

// Get all dryers status
app.get('/api/dryers', async (req, res) => {
  try {
    const snapshot = await db.ref('secadoras').once('value');
    const data = snapshot.val();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific dryer status
app.get('/api/dryers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`secadoras/${id}`).once('value');
    const data = snapshot.val();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update dryer status
app.put('/api/dryers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (typeof status !== 'boolean') {
      return res.status(400).json({ error: 'Status must be a boolean value' });
    }

    await db.ref(`secadoras/${id}`).update({ status });
    res.json({ id, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update all dryers status
app.put('/api/dryers', async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (typeof status !== 'boolean') {
      return res.status(400).json({ error: 'Status must be a boolean value' });
    }

    const snapshot = await db.ref('secadoras').once('value');
    const dryers = snapshot.val();
    
    const updates = {};
    Object.keys(dryers).forEach(id => {
      updates[`secadoras/${id}/status`] = status;
    });

    await db.ref().update(updates);
    res.json({ message: 'All dryers updated successfully', status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.get('/api/nodes', async (req, res) => {
  try {
    const snapshot = await db.ref('/').once('value');
    const data = snapshot.val();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific node
app.get('/api/nodes/:path', async (req, res) => {
  try {
    const path = req.params.path;
    const snapshot = await db.ref(path).once('value');
    const data = snapshot.val();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new node
app.post('/api/nodes/:path', async (req, res) => {
  try {
    const path = req.params.path;
    const data = req.body;
    const ref = db.ref(path);
    const newRef = await ref.push(data);
    res.json({ id: newRef.key, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update node
app.put('/api/nodes/:path/:id', async (req, res) => {
  try {
    const { path, id } = req.params;
    const data = req.body;
    await db.ref(`${path}/${id}`).update(data);
    res.json({ id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete node
app.delete('/api/nodes/:path/:id', async (req, res) => {
  try {
    const { path, id } = req.params;
    await db.ref(`${path}/${id}`).remove();
    res.json({ message: 'Node deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 