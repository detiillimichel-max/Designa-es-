import { 
  DIRIGENTE_FIXO, 
  ELEGIVEIS_PRESIDENTE, 
  ELEGIVEIS_DISCURSO, 
  ELEGIVEIS_LEITOR 
} from '../data/membros.js';

export function gerarEscalaSemanal({ totalSemanas, dataInicioStr, ausentes = [], historicoPres = [], historicoDisc = [], historicoLeit = [] }) {
  const escala = [];
  const filaPresidente = [...historicoPres];
  const filaDiscurso = [...historicoDisc];
  const filaLeitor = [...historicoLeit];

  let dataAtual = dataInicioStr ? new Date(dataInicioStr + 'T00:00:00') : new Date();

  for (let semana = 1; semana <= totalSemanas; semana++) {
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR');

    // 1. Dirigente Fixo de A Sentinela
    const dirigente = DIRIGENTE_FIXO;

    // 2. Presidente da Reunião (Exclui ausentes)
    let opsPresidente = ELEGIVEIS_PRESIDENTE.filter(n => !ausentes.includes(n));
    if (opsPresidente.length === 0) opsPresidente = [...ELEGIVEIS_PRESIDENTE];
    const presidente = escolherMenosRecente(opsPresidente, filaPresidente);
    filaPresidente.push(presidente);

    // 3. Orador do Discurso (Exclui Dirigente, Presidente da semana e ausentes)
    let opsDiscurso = ELEGIVEIS_DISCURSO.filter(
      n => n !== dirigente && n !== presidente && !ausentes.includes(n)
    );
    if (opsDiscurso.length === 0) {
      opsDiscurso = ELEGIVEIS_DISCURSO.filter(n => n !== dirigente && n !== presidente);
    }
    const orador = escolherMenosRecente(opsDiscurso, filaDiscurso);
    filaDiscurso.push(orador);

    // 4. Leitor de A Sentinela (Exclui Dirigente, Presidente, Orador e ausentes)
    let opsLeitor = ELEGIVEIS_LEITOR.filter(
      n => n !== dirigente && n !== presidente && n !== orador && !ausentes.includes(n)
    );
    if (opsLeitor.length === 0) {
      opsLeitor = ELEGIVEIS_LEITOR.filter(n => n !== dirigente && n !== presidente && n !== orador);
    }
    const leitor = escolherMenosRecente(opsLeitor, filaLeitor);
    filaLeitor.push(leitor);

    escala.push({
      semana,
      data: dataFormatada,
      presidente,
      orador,
      dirigente,
      leitor
    });

    dataAtual.setDate(dataAtual.getDate() + 7);
  }

  return escala;
}

function escolherMenosRecente(candidatos, historico) {
  return candidatos.reduce((escolhido, candidato) => {
    const vezesCandidato = historico.filter(n => n === candidato).length;
    const vezesEscolhido = historico.filter(n => n === escolhido).length;

    if (vezesCandidato < vezesEscolhido) return candidato;
    
    if (vezesCandidato === vezesEscolhido) {
      const uCandidato = historico.lastIndexOf(candidato);
      const uEscolhido = historico.lastIndexOf(escolhido);
      return uCandidato < uEscolhido ? candidato : escolhido;
    }

    return escolhido;
  }, candidatos[0]);
}
