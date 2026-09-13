import { DIRIGENTE_FIXO, ELEGIVEIS_PRESIDENTE, ELEGIVEIS_DISCURSO, ELEGIVEIS_LEITOR } from '../data/membros.js';
import { gerarEscalaSemanal, EscalaInviavelError } from '../logic/geradorEscala.js';
import { salvarEscalaBanco, obterUltimoEstado } from '../data/db.js';

const { jsPDF } = window.jspdf || {};

document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  const btnGerar = $('btnGerar');
  const btnSalvar = $('btnSalvar');
  const btnPdf = $('btnPdf');
  const btnCompartilhar = $('btnCompartilhar');
  const inputSemanas = $('qtdSemanas');
  const inputDataInicio = $('dataInicio');
  const selectDestaque = $('membroDestaque');
  const containerAusencias = $('containerAusencias');
  const tabelaCorpo = $('tabelaCorpo');
  const status = $('status');
  const resumo = $('resumo');
  const contadorAusentes = $('contadorAusentes');
  const todosMembros = Array.from(new Set([DIRIGENTE_FIXO, ...ELEGIVEIS_PRESIDENTE, ...ELEGIVEIS_DISCURSO, ...ELEGIVEIS_LEITOR])).sort();
  let escalaAtual = [];

  function mostrarStatus(mensagem, tipo = 'success') {
    status.textContent = mensagem;
    status.className = `status ${tipo}`;
    status.hidden = false;
  }

  function limparStatus() { status.hidden = true; status.textContent = ''; }

  function atualizarContadorAusentes() {
    const total = containerAusencias.querySelectorAll('input:checked').length;
    contadorAusentes.textContent = `${total} ausente${total === 1 ? '' : 's'} de ${todosMembros.length}`;
  }

  function inicializarControles() {
    containerAusencias.innerHTML = '';
    selectDestaque.innerHTML = '<option value="">Todos / nenhum</option>';
    todosMembros.forEach(membro => {
      const div = document.createElement('div');
      div.className = 'ausencia-item';
      const id = `aus-${membro.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-')}`;
      div.innerHTML = `<input type="checkbox" id="${id}" value="${membro}"><label for="${id}">${membro}</label>`;
      containerAusencias.appendChild(div);
      const opt = document.createElement('option');
      opt.value = membro;
      opt.textContent = membro;
      selectDestaque.appendChild(opt);
    });
    containerAusencias.addEventListener('change', atualizarContadorAusentes);
    atualizarContadorAusentes();
  }

  function obterAusentesSelecionados() {
    return Array.from(containerAusencias.querySelectorAll('input:checked')).map(cb => cb.value);
  }

  function validarEntradas() {
    $('dataErro').textContent = '';
    $('semanasErro').textContent = '';
    let valido = true;
    const semanas = Number(inputSemanas.value);
    if (!inputDataInicio.value) { $('dataErro').textContent = 'Informe a data de início.'; valido = false; }
    if (!Number.isInteger(semanas) || semanas < 1 || semanas > 52) { $('semanasErro').textContent = 'Use um número inteiro entre 1 e 52.'; valido = false; }
    return valido;
  }

  function renderizarTabela(dados) {
    escalaAtual = dados;
    tabelaCorpo.innerHTML = '';
    const membroSelecionado = selectDestaque.value;
    dados.forEach(item => {
      const tr = document.createElement('tr');
      const participantes = [item.dirigente, item.presidente, item.orador, item.leitor];
      if (membroSelecionado && participantes.includes(membroSelecionado)) tr.classList.add('destaque-membro');
      tr.innerHTML = `<td><strong>Semana ${item.semana}</strong></td><td>${item.data}</td><td><span class="membro-tag">${item.dirigente}</span></td><td><span class="membro-tag">${item.presidente}</span></td><td><span class="membro-tag">${item.orador}</span></td><td><span class="membro-tag">${item.leitor}</span></td>`;
      tabelaCorpo.appendChild(tr);
    });
    resumo.textContent = `${dados.length} semana${dados.length === 1 ? '' : 's'} gerada${dados.length === 1 ? '' : 's'} • ${obterAusentesSelecionados().length} ausente${obterAusentesSelecionados().length === 1 ? '' : 's'} • sem conflitos de função`;
    btnPdf.disabled = false;
    btnCompartilhar.disabled = false;
  }

  function executarGeracao() {
    limparStatus();
    if (!validarEntradas()) return;
    try {
      const novaEscala = gerarEscalaSemanal({ totalSemanas: Number(inputSemanas.value), dataInicioStr: inputDataInicio.value, ausentes: obterAusentesSelecionados() });
      renderizarTabela(novaEscala);
      mostrarStatus('Escala gerada sem conflitos. Revise antes de salvar ou compartilhar.');
    } catch (err) {
      escalaAtual = [];
      btnPdf.disabled = true;
      btnCompartilhar.disabled = true;
      resumo.textContent = 'Nenhuma escala válida gerada.';
      tabelaCorpo.innerHTML = '<tr><td colspan="6" class="empty-state">Ajuste as ausências e gere novamente.</td></tr>';
      if (err instanceof EscalaInviavelError) {
        mostrarStatus(`Não foi possível gerar a semana ${err.semana} (${err.data}): ${err.papel}. ${err.motivo} Desmarque uma ausência ou ajuste os papéis elegíveis.`, 'error');
      } else {
        mostrarStatus(err.message || 'Não foi possível gerar a escala.', 'error');
      }
    }
  }

  function criarPdf() {
    if (!jsPDF || escalaAtual.length === 0) throw new Error('A biblioteca de PDF não foi carregada.');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(18); doc.text('Escala de Reuniões', 14, 16);
    doc.setFontSize(10); doc.text(`Início: ${inputDataInicio.value} | ${escalaAtual.length} semanas`, 14, 23);
    const headers = ['Semana', 'Data', 'Dirigente', 'Presidente', 'Discurso', 'Leitor'];
    const rows = escalaAtual.map(item => [String(item.semana), item.data, item.dirigente, item.presidente, item.orador, item.leitor]);
    const widths = [20, 28, 55, 55, 55, 55];
    let y = 32;
    doc.setFontSize(9); doc.setFillColor(31, 95, 139); doc.setTextColor(255, 255, 255);
    let x = 14;
    headers.forEach((header, i) => { doc.rect(x, y - 6, widths[i], 9, 'F'); doc.text(header, x + 2, y); x += widths[i]; });
    doc.setTextColor(31, 41, 55);
    rows.forEach((row, rowIndex) => { y += 9; x = 14; if (rowIndex % 2 === 0) { doc.setFillColor(245, 248, 250); doc.rect(14, y - 6, widths.reduce((a, b) => a + b, 0), 9, 'F'); } row.forEach((value, i) => { doc.text(String(value).slice(0, 28), x + 2, y); x += widths[i]; }); });
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Gerado pelo app Escala de Reuniões', 14, 195);
    return doc;
  }

  function baixarPdf() { try { criarPdf().save(`escala-reunioes-${inputDataInicio.value || 'sem-data'}.pdf`); mostrarStatus('PDF baixado com sucesso.'); } catch (err) { mostrarStatus(err.message, 'error'); } }

  async function compartilharPdf() {
    try {
      const doc = criarPdf();
      const blob = doc.output('blob');
      const nome = `escala-reunioes-${inputDataInicio.value || 'sem-data'}.pdf`;
      const arquivo = new File([blob], nome, { type: 'application/pdf' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivo] }))) {
        await navigator.share({ title: 'Escala de Reuniões', text: 'Escala de reuniões em PDF', files: [arquivo] });
        mostrarStatus('PDF compartilhado.');
      } else {
        doc.save(nome);
        mostrarStatus('Seu navegador não permite compartilhar arquivos diretamente. O PDF foi baixado para você enviar.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') mostrarStatus('Não foi possível compartilhar. Tente baixar o PDF.', 'error');
    }
  }

  btnGerar.addEventListener('click', executarGeracao);
  btnPdf.addEventListener('click', baixarPdf);
  btnCompartilhar.addEventListener('click', compartilharPdf);
  btnSalvar.addEventListener('click', async () => {
    if (!escalaAtual.length) { mostrarStatus('Gere uma escala antes de salvar.', 'error'); return; }
    try { await salvarEscalaBanco(escalaAtual, inputDataInicio.value, obterAusentesSelecionados()); mostrarStatus('Escala salva neste dispositivo.'); }
    catch { mostrarStatus('Não foi possível salvar a escala neste dispositivo.', 'error'); }
  });
  selectDestaque.addEventListener('change', () => { if (escalaAtual.length) renderizarTabela(escalaAtual); });

  inicializarControles();
  inputDataInicio.value = new Date().toISOString().split('T')[0];
  try {
    const estadoSalvo = await obterUltimoEstado();
    if (estadoSalvo.dataInicio) inputDataInicio.value = estadoSalvo.dataInicio;
    (estadoSalvo.ausentes || []).forEach(membro => { const cb = Array.from(containerAusencias.querySelectorAll('input')).find(input => input.value === membro); if (cb) cb.checked = true; });
    atualizarContadorAusentes();
    if (estadoSalvo.escala?.length) renderizarTabela(estadoSalvo.escala); else executarGeracao();
  } catch { executarGeracao(); }
  if (window.lucide) window.lucide.createIcons();
});
