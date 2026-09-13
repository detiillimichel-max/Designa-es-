const DB_NAME = 'EscalaReunioesDB';
const DB_VERSION = 1;

export function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Tabela de Histórico de Escalas
      if (!db.objectStoreNames.contains('escalas')) {
        db.createObjectStore('escalas', { keyPath: 'id', autoIncrement: true });
      }

      // Tabela de Configurações e Estado (ausências, datas, etc.)
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'chave' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function salvarEscalaBanco(escala, dataInicio, ausentes) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['escalas', 'config'], 'readwrite');
    
    // Salva a escala
    const storeEscalas = tx.objectStore('escalas');
    storeEscalas.add({
      dataCriacao: new Date().toISOString(),
      dataInicio,
      ausentes,
      escala
    });

    // Atualiza a última escala ativa na config
    const storeConfig = tx.objectStore('config');
    storeConfig.put({ chave: 'ultimaEscala', valor: escala });
    storeConfig.put({ chave: 'ultimasAusencias', valor: ausentes });
    storeConfig.put({ chave: 'ultimaDataInicio', valor: dataInicio });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function obterUltimoEstado() {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readonly');
    const store = tx.objectStore('config');

    const reqEscala = store.get('ultimaEscala');
    const reqAusentes = store.get('ultimasAusencias');
    const reqData = store.get('ultimaDataInicio');

    tx.oncomplete = () => {
      resolve({
        escala: reqEscala.result ? reqEscala.result.valor : null,
        ausentes: reqAusentes.result ? reqAusentes.result.valor : [],
        dataInicio: reqData.result ? reqData.result.valor : ''
      });
    };
    tx.onerror = () => reject(tx.error);
  });
}

