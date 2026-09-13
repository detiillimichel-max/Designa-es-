import { DIRIGENTE_FIXO, ELEGIVEIS_DISCURSO, ELEGIVEIS_LEITOR } from '../data/membros.js';

export function gerarEscalaSemanal(totalSemanas) {
  const escala = [];
  const historicoDiscurso = [];
  const historicoLeitor = [];

  for (let semana = 1; semana <= totalSemanas; semana++) {
    const dirigente = DIRIGENTE_FIXO;

    // Discurso: Não pode ser quem está dirigindo na mesma semana (Cecílio)
    const opcoesDiscurso = ELEGIVEIS_DISCURSO.filter(nome => nome !== dirigente);
    const orador = escolherMenosRecente(opcoesDiscurso, historicoDiscurso);
    historicoDiscurso.push(orador);

    // Leitor: Não pode ser o Dirigente nem o Orador do discurso da mesma semana
    const opcoesLeitor = ELEGIVEIS_LEITOR.filter(
      nome => nome !== dirigente && nome !== orador
    );
    const leitor = escolherMenosRecente(opcoesLeitor, historicoLeitor);
    historicoLeitor.push(leitor);

    escala.push({
      semana,
      dirigente,
      orador,
      leitor
    });
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
    
    // Se a quantidade de vezes for igual, prefere o que apareceu há mais tempo no histórico
    if (vezesCandidato === vezesEscolhido) {
      const ultimoIndiceCandidato = historico.lastIndexOf(candidato);
      const ultimoIndiceEscolhido = historico.lastIndexOf(escolhido);
      return ultimoIndiceCandidato < ultimoIndiceEscolhido ? candidato : escolhido;
    }

    return escolhido;
  }, candidatos[0]);
}

