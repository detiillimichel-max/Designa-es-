import { DIRIGENTE_FIXO, ELEGIVEIS_DISCURSO, ELEGIVEIS_LEITOR } from '../data/membros.js';

export function gerarEscalaSemanal({ totalSemanas, dataInicioStr, ausentes = [], historicoDiscurso = [], historicoLeitor = [] }) {
  const escala = [];
  const filaDiscurso = [...historicoDiscurso];
  const filaLeitor = [...historicoLeitor];

  // Configuração da data base inicial
  let dataAtual = dataInicioStr ? new Date(dataInicioStr + 'T00:00:00') : new Date();

  for (let semana = 1; semana <= totalSemanas; semana++) {
    // Formatação da data da semana (ex: 18/10/2026)
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR');

    // 1. Dirigente Fixo (Cecílio)
    const dirigente = DIRIGENTE_FIXO;

    // 2. Seleção de Discurso (Exclui Dirigente e Ausentes)
    let candidatosDiscurso = ELEGIVEIS_DISCURSO.filter(
      nome => nome !== dirigente && !ausentes.includes(nome)
    );

    // Contingência se todos os oradores estiverem marcados como ausentes
    if (candidatosDiscurso.length === 0) {
      candidatosDiscurso = ELEGIVEIS_DISCURSO.filter(nome => nome !== dirigente);
    }

    const orador = escolherMenosRecente(candidatosDiscurso, filaDiscurso);
    filaDiscurso.push(orador);

    // 3. Seleção de Leitor (Exclui Dirigente, Orador da semana e Ausentes)
    let candidatosLeitor = ELEGIVEIS_LEITOR.filter(
      nome => nome !== dirigente && nome !== orador && !ausentes.includes(nome)
    );

    // Contingência
    if (candidatosLeitor.length === 0) {
      candidatosLeitor = ELEGIVEIS_LEITOR.filter(nome => nome !== dirigente && nome !== orador);
    }

    const leitor = escolherMenosRecente(candidatosLeitor, filaLeitor);
    filaLeitor.push(leitor);

    escala.push({
      semana,
      data: dataFormatada,
      dirigente,
      orador,
      leitor
    });

    // Incrementa 7 dias para a próxima semana
    dataAtual.setDate(dataAtual.getDate() + 7);
  }

  return escala;
}

function escolherMenosRecente(candidatos, historico) {
  return candidatos.reduce((escolhido, candidato) => {
    const vezesCandidato = historico.filter(n => n === candidato).length;
    const vezesEscolhido = historico.filter(n => n === escolhido).length;

    if (vezesCandidato < vezesEscolhido) {
      return candidato;
    }
    
    if (vezesCandidato === vezesEscolhido) {
      const ultimoIndiceCandidato = historico.lastIndexOf(candidato);
      const ultimoIndiceEscolhido = historico.lastIndexOf(escolhido);
      return ultimoIndiceCandidato < ultimoIndiceEscolhido ? candidato : escolhido;
    }

    return escolhido;
  }, candidatos[0]);
}
