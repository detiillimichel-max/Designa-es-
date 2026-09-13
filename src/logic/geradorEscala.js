import { 
  DIRIGENTE_FIXO, 
  ELEGIVEIS_PRESIDENTE, 
  ELEGIVEIS_DISCURSO, 
  ELEGIVEIS_LEITOR 
} from '../data/membros.js';

// Função para embaralhar opções em caso de empate mantendo aleatoriedade
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
  historicoPres = [], 
  historicoDisc = [], 
  historicoLeit = [] 
}) {
  const escala = [];
  const filaPresidente = [...historicoPres];
  const filaDiscurso = [...historicoDisc];
  const filaLeitor = [...historicoLeit];

  let dataAtual = dataInicioStr ? new Date(dataInicioStr + 'T00:00:00') : new Date();

  for (let semana = 1; semana <= totalSemanas; semana++) {
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR');

    // 1. Dirigente Fixo
    const dirigente = DIRIGENTE_FIXO;

    // 2. Presidente da Reunião
    let opsPresidente = ELEGIVEIS_PRESIDENTE.filter(n => !ausentes.includes(n));
    if (opsPresidente.length === 0) opsPresidente = [...ELEGIVEIS_PRESIDENTE];
    const presidente = escolherComRodizio(opsPresidente, filaPresidente);
    filaPresidente.push(presidente);

    // 3. Orador do Discurso (Exclui Dirigente, Presidente da semana e Ausentes)
    let opsDiscurso = ELEGIVEIS_DISCURSO.filter(
      n => n !== dirigente && n !== presidente && !ausentes.includes(n)
    );
    if (opsDiscurso.length === 0) {
      opsDiscurso = ELEGIVEIS_DISCURSO.filter(n => n !== dirigente && n !== presidente);
    }
    const orador = escolherComRodizio(opsDiscurso, filaDiscurso);
    filaDiscurso.push(orador);

    // 4. Leitor de A Sentinela (Exclui Dirigente, Presidente, Orador da semana e Ausentes)
    let opsLeitor = ELEGIVEIS_LEITOR.filter(
      n => n !== dirigente && n !== presidente && n !== orador && !ausentes.includes(n)
    );
    if (opsLeitor.length === 0) {
      opsLeitor = ELEGIVEIS_LEITOR.filter(n => n !== dirigente && n !== presidente && n !== orador);
    }
    const leitor = escolherComRodizio(opsLeitor, filaLeitor);
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

function escolherComRodizio(candidatos, historico) {
  // Embaralha a ordem inicial para variar os empates a cada clique
  const candidatosEmbaralhados = embaralhar(candidatos);

  return candidatosEmbaralhados.reduce((escolhido, candidato) => {
    const vezesCandidato = historico.filter(n => n === candidato).length;
    const vezesEscolhido = historico.filter(n => n === escolhido).length;

    // Prefere quem participou menos vezes
    if (vezesCandidato < vezesEscolhido) return candidato;
    
    // Se tiverem a mesma quantidade de participações, prefere quem participou há mais tempo
    if (vezesCandidato === vezesEscolhido) {
      const uCandidato = historico.lastIndexOf(candidato);
      const uEscolhido = historico.lastIndexOf(escolhido);

      if (uCandidato !== uEscolhido) {
        return uCandidato < uEscolhido ? candidato : escolhido;
      }
    }

    return escolhido;
  }, candidatosEmbaralhados[0]);
}
