const DB_NAME = 'EscalaReunioesDB';
const DB_VERSION = 2;
const DEFAULT_MEMBERS = [
  { nome: 'Akira Shiomi', papeis: ['presidente'] }, { nome: 'Luiz Fernando', papeis: ['presidente'] },
  { nome: 'Eldes Guerra', papeis: ['presidente'] }, { nome: 'Paulo Amaral', papeis: ['presidente'] },
  { nome: 'Felipe Ramos', papeis: ['presidente', 'discurso', 'leitor'] }, { nome: 'Cristiano Prado', papeis: ['discurso', 'leitor'] },
  { nome: 'Cleiton Santos', papeis: ['discurso', 'leitor'] }, { nome: 'Rodrigo Ramos', papeis: ['discurso', 'leitor'] },
  { nome: 'Rodrigo Soares', papeis: ['discurso', 'leitor'] }, { nome: 'Ribamar Souza', papeis: ['discurso'] },
  { nome: 'Cecílio Júnior', papeis: ['dirigente', 'discurso'] }, { nome: 'Wellington Oliveira', papeis: ['discurso', 'leitor'] },
  { nome: 'Davi Arruda', papeis: ['leitor'] }, { nome: 'Ivanilson Rocha', papeis: ['leitor'] }
];

export function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('escalas')) db.createObjectStore('escalas', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('config')) db.createObjectStore('config', { keyPath: 'chave' });
      if (!db.objectStoreNames.contains('membros')) {
        const store = db.createObjectStore('membros', { keyPath: 'nome' });
        DEFAULT_MEMBERS.forEach(member => store.put(member));
      }
      if (!db.objectStoreNames.contains('designacoes')) {
        const store = db.createObjectStore('designacoes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('porMembro', 'membro', { unique: false });
        store.createIndex('porData', 'data', { unique: false });
      }
    };
    request.onsuccess = () => migrarHistoricoLegado(request.result).then(() => resolve(request.result)).catch(reject);
    request.onerror = () => reject(request.error);
  });
}

async function migrarHistoricoLegado(db) {
  if (!db.objectStoreNames.contains('escalas') || !db.objectStoreNames.contains('designacoes')) return;
  const escalas = await new Promise((resolve, reject) => {
    const req = transacao(db, ['escalas']).objectStore('escalas').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const existentes = await new Promise((resolve, reject) => {
    const req = transacao(db, ['designacoes']).objectStore('designacoes').count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (existentes > 0 || !escalas.length) return;
  await new Promise((resolve, reject) => {
    const tx = transacao(db, ['designacoes'], 'readwrite');
    const store = tx.objectStore('designacoes');
    escalas.forEach(registro => (registro.escala || []).forEach(item => {
      [['Dirigente', item.dirigente], ['Presidente', item.presidente], ['Discurso', item.orador], ['Leitor', item.leitor]].forEach(([funcao, membro]) => {
        store.add({ membro, funcao, data: item.data, semana: item.semana, dataInicio: registro.dataInicio, criadoEm: registro.dataCriacao || new Date().toISOString() });
      });
    }));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function transacao(db, stores, mode = 'readonly') {
  return db.transaction(stores, mode);
}

export async function listarMembros() {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const req = transacao(db, ['membros']).objectStore('membros').getAll();
    req.onsuccess = () => resolve(req.result.length ? req.result : DEFAULT_MEMBERS);
    req.onerror = () => reject(req.error);
  });
}

export async function adicionarMembro(nome, papeis) {
  const normalizado = nome.trim().replace(/\s+/g, ' ');
  if (!normalizado || !papeis?.length) throw new Error('Informe o nome e pelo menos um papel.');
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = transacao(db, ['membros'], 'readwrite');
    tx.objectStore('membros').put({ nome: normalizado, papeis });
    tx.oncomplete = () => resolve({ nome: normalizado, papeis });
    tx.onerror = () => reject(tx.error);
  });
}

export async function salvarEscalaBanco(escala, dataInicio, ausentes) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = transacao(db, ['escalas', 'config', 'designacoes'], 'readwrite');
    const escalaStore = tx.objectStore('escalas');
    const criadoEm = new Date().toISOString();
    const escalaRecord = { dataCriacao: criadoEm, dataInicio, ausentes, escala };
    const escalaRequest = escalaStore.add(escalaRecord);
    const designacoesStore = tx.objectStore('designacoes');
    escala.forEach(item => {
      [['Dirigente', item.dirigente], ['Presidente', item.presidente], ['Discurso', item.orador], ['Leitor', item.leitor]].forEach(([funcao, membro]) => {
        designacoesStore.add({ membro, funcao, data: item.data, semana: item.semana, dataInicio, criadoEm });
      });
    });
    const config = tx.objectStore('config');
    config.put({ chave: 'ultimaEscala', valor: escala });
    config.put({ chave: 'ultimasAusencias', valor: ausentes });
    config.put({ chave: 'ultimaDataInicio', valor: dataInicio });
    tx.oncomplete = () => resolve(escalaRequest.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listarDesignacoes(membro = '') {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const store = transacao(db, ['designacoes']).objectStore('designacoes');
    const req = membro ? store.index('porMembro').getAll(membro) : store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => `${b.data}-${b.id}`.localeCompare(`${a.data}-${a.id}`)));
    req.onerror = () => reject(req.error);
  });
}

export async function obterUltimoEstado() {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const store = transacao(db, ['config']).objectStore('config');
    const reqEscala = store.get('ultimaEscala'); const reqAusentes = store.get('ultimasAusencias'); const reqData = store.get('ultimaDataInicio');
    Promise.all([new Promise(r => { reqEscala.onsuccess = r; }), new Promise(r => { reqAusentes.onsuccess = r; }), new Promise(r => { reqData.onsuccess = r; })]).then(() => resolve({
      escala: reqEscala.result?.valor || null, ausentes: reqAusentes.result?.valor || [], dataInicio: reqData.result?.valor || ''
    })).catch(reject);
  });
}
