import { DIRIGENTE_FIXO, ELEGIVEIS_DISCURSO, ELEGIVEIS_LEITOR } from '../data/membros.js';
import { gerarEscalaSemanal } from '../logic/geradorEscala.js';
import { salvarEscalaBanco, obterUltimoEstado } from '../data/db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnGerar = document.getElementById('btnGerar');
  const btnSalvar = document.getElementById('btnSalvar');
  const inputSemanas = document.getElementById('qtdSemanas');
  const inputDataInicio = document.getElementById('dataInicio');
  const selectDestaque = document.getElementById('membroDestaque');
  const containerAusencias = document.getElementById('containerAusencias');
  const tabelaCorpo = document.getElementById('tabelaCorpo');

  // Lista unificada de todos os 10 membros
  const todosMembros = Array.from(new Set([
    DIRIGENTE_FIXO,
    ...ELEGIVEIS_DISCURSO,
    ...ELEGIVEIS_LEITOR
  ])).sort();

  let escalaAtual = [];

  // Inicializa data padrão (próximo domingo ou hoje)
  const hoje = new Date().toISOString().split('T')[0];
  inputDataInicio.value = hoje;

  // 1. Renderiza os Checkboxes de Ausência
  function inicializarControles() {
    containerAusencias.innerHTML = '';
    selectDestaque.innerHTML = '<option value="">-- Todos / Nenhum --</option>';

    todosMembros.forEach(membro => {
      // Checkbox para ausências
      const div = document.createElement('div');
      div.className = 'ausencia-item';
      div.innerHTML = `
        <input type="checkbox" id="aus_${membro}" value="${membro}">
        <label for="aus_${membro}">${membro}</label>
      `;
      containerAusencias.appendChild(div);

      // Opção para destaque
      const opt = document.createElement('option');
      opt.value = membro;
      opt.textContent = membro;
      selectDestaque.appendChild(opt);
    });
  }

  function obterAusentesSelecionados() {
    const checkboxes = containerAusencias.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  // 2. Renderiza a tabela HTML com opção de destaque
  function renderizarTabela(dados) {
    escalaAtual = dados;
    tabelaCorpo.innerHTML = '';
    const membroSelecionado = selectDestaque.value;

    dados.forEach((item) => {
      const tr = document.createElement('tr');

      // Verifica se o membro selecionado participa desta semana
      const eParticipante = membroSelecionado && (
        item.dirigente === membroSelecionado ||
        item.orador === membroSelecionado ||
        item.leitor === membroSelecionado
      );

      if (eParticipante) {
        tr.classList.add('destaque-membro');
      }

      tr.innerHTML = `
        <td><strong>Semana ${item.semana}</strong></td>
        <td>${item.data}</td>
        <td><span class="membro-tag">${item.dirigente}</span></td>
        <td><span class="membro-tag">${item.orador}</span></td>
        <td><span class="membro-tag">${item.leitor}</span></td>
      `;

      tabelaCorpo.appendChild(tr);
    });
  }

  // 3. Ação de Gerar Escala
  function executarGeracao() {
    const semanas = parseInt(inputSemanas.value, 10) || 4;
    const dataInicioStr = inputDataInicio.value;
    const ausentes = obterAusentesSelecionados();

    const novaEscala = gerarEscalaSemanal({
      totalSemanas: semanas,
      dataInicioStr,
      ausentes
    });

    renderizarTabela(novaEscala);
  }

  // 4. Eventos
  btnGerar.addEventListener('click', executarGeracao);

  btnSalvar.addEventListener('click', async () => {
    if (escalaAtual.length === 0) return;
    const ausentes = obterAusentesSelecionados();
    await salvarEscalaBanco(escalaAtual, inputDataInicio.value, ausentes);
    alert('Escala salva no banco de dados offline (IndexedDB) com sucesso!');
  });

  selectDestaque.addEventListener('change', () => {
    if (escalaAtual.length > 0) renderizarTabela(escalaAtual);
  });

  // 5. Carregar dados do IndexedDB na inicialização
  inicializarControles();
  try {
    const estadoSalvo = await obterUltimoEstado();
    if (estadoSalvo.dataInicio) inputDataInicio.value = estadoSalvo.dataInicio;
    
    if (estadoSalvo.ausentes && estadoSalvo.ausentes.length > 0) {
      estadoSalvo.ausentes.forEach(membro => {
        const cb = document.getElementById(`aus_${membro}`);
        if (cb) cb.checked = true;
      });
    }

    if (estadoSalvo.escala && estadoSalvo.escala.length > 0) {
      renderizarTabela(estadoSalvo.escala);
    } else {
      executarGeracao();
    }
  } catch (err) {
    executarGeracao();
  }
});
