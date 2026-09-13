import {
  DIRIGENTE_FIXO,
  ELEGIVEIS_PRESIDENTE,
  ELEGIVEIS_DISCURSO,
  ELEGIVEIS_LEITOR
} from '../data/membros.js';

export class EscalaInviavelError extends Error {
  constructor({ semana, data, papel, candidatos, motivo }) {
    super(`Não foi possível preencher ${papel} na semana ${semana}.`);
    this.name = 'EscalaInviavelError';
    this.semana = semana;
    this.data = data;
    this.papel = papel;
    this.candidatos = candidatos;
    this.motivo = motivo;
  }
}

function embaralhar(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function gerarEscalaSemanal({
  totalSemanas,
  dataInicioStr,
  ausentes = [],
  membros = null,
  historicoPres = [],
  historicoDisc = [],
  historicoLeit = []
}) {
  if (!Number.isInteger(totalSemanas) || totalSemanas < 1 || totalSemanas > 52) {
    throw new Error('A quantidade de semanas deve estar entre 1 e 52.');
  }
  if (!dataInicioStr || Number.isNaN(new Date(`${dataInicioStr}T00:00:00`).getTime())) {
    throw new Error('Informe uma data de início válida.');
  }

  const dirigenteFixo = membros?.dirigente || DIRIGENTE_FIXO;
  const elegiveisPresidente = membros?.presidente || ELEGIVEIS_PRESIDENTE;
  const elegiveisDiscurso = membros?.discurso || ELEGIVEIS_DISCURSO;
  const elegiveisLeitor = membros?.leitor || ELEGIVEIS_LEITOR;
  const escala = [];
  const filaPresidente = [...historicoPres];
  const filaDiscurso = [...historicoDisc];
  const filaLeitor = [...historicoLeit];
  const ausentesSet = new Set(ausentes);
  let dataAtual = new Date(`${dataInicioStr}T00:00:00`);

  for (let semana = 1; semana <= totalSemanas; semana++) {
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
    const dirigente = dirigenteFixo;

    if (ausentesSet.has(dirigente)) {
      throw new EscalaInviavelError({
        semana, data: dataFormatada, papel: 'Dirigente', candidatos: [dirigente],
        motivo: 'O dirigente fixo está marcado como ausente.'
      });
    }

    const presidente = escolherOuFalhar({
      papel: 'Presidente', semana, data: dataFormatada,
      candidatos: elegiveisPresidente.filter(n => !ausentesSet.has(n)),
      historico: filaPresidente
    });
    filaPresidente.push(presidente);

    const orador = escolherOuFalhar({
      papel: 'Orador do discurso', semana, data: dataFormatada,
      candidatos: elegiveisDiscurso.filter(n =>
        n !== dirigente && n !== presidente && !ausentesSet.has(n)
      ),
      historico: filaDiscurso
    });
    filaDiscurso.push(orador);

    const leitor = escolherOuFalhar({
      papel: 'Leitor de A Sentinela', semana, data: dataFormatada,
      candidatos: elegiveisLeitor.filter(n =>
        n !== dirigente && n !== presidente && n !== orador && !ausentesSet.has(n)
      ),
      historico: filaLeitor
    });
    filaLeitor.push(leitor);

    escala.push({ semana, data: dataFormatada, presidente, orador, dirigente, leitor });
    dataAtual.setDate(dataAtual.getDate() + 7);
  }

  return escala;
}

function escolherOuFalhar({ papel, semana, data, candidatos, historico }) {
  if (candidatos.length === 0) {
    throw new EscalaInviavelError({
      semana, data, papel, candidatos,
      motivo: 'Não há integrante disponível que atenda às regras atuais.'
    });
  }
  return escolherComRodizio(candidatos, historico);
}

function escolherComRodizio(candidatos, historico) {
  const candidatosEmbaralhados = embaralhar(candidatos);
  return candidatosEmbaralhados.reduce((escolhido, candidato) => {
    const vezesCandidato = historico.filter(n => n === candidato).length;
    const vezesEscolhido = historico.filter(n => n === escolhido).length;
    if (vezesCandidato < vezesEscolhido) return candidato;
    if (vezesCandidato === vezesEscolhido) {
      const ultimoCandidato = historico.lastIndexOf(candidato);
      const ultimoEscolhido = historico.lastIndexOf(escolhido);
      if (ultimoCandidato !== ultimoEscolhido) {
        return ultimoCandidato < ultimoEscolhido ? candidato : escolhido;
      }
    }
    return escolhido;
  }, candidatosEmbaralhados[0]);
}
