import { DIRIGENTE_FIXO, ELEGIVEIS_PRESIDENTE, ELEGIVEIS_DISCURSO, ELEGIVEIS_LEITOR } from '../data/membros.js';
import { gerarEscalaSemanal, EscalaInviavelError } from '../logic/geradorEscala.js';
import { adicionarMembro, listarMembros, salvarEscalaBanco, listarDesignacoes, obterUltimoEstado } from '../data/db.js';

const { jsPDF } = window.jspdf || {};
const PAPEL_LABEL = { presidente: 'Presidente', discurso: 'Discurso', leitor: 'Leitor' };
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  const btnGerar = $('btnGerar'); const btnSalvar = $('btnSalvar'); const btnPdf = $('btnPdf'); const btnCompartilhar = $('btnCompartilhar'); const btnPdfDiscursos = $('btnPdfDiscursos'); const btnCompartilharDiscursos = $('btnCompartilharDiscursos');
  const inputSemanas = $('qtdSemanas'); const inputDataInicio = $('dataInicio'); const selectDestaque = $('membroDestaque');
  const containerAusencias = $('containerAusencias'); const tabelaCorpo = $('tabelaCorpo'); const status = $('status'); const resumo = $('resumo'); const contadorAusentes = $('contadorAusentes'); const compositorDiscursos = $('compositorDiscursos');
  const formMembro = $('formMembro'); const historicoMembro1 = $('historicoMembro1'); const historicoMembro2 = $('historicoMembro2'); const historicoConteudo = $('historicoConteudo');
  const camposDiscurso = ['enderecoCidade', 'enderecoBairro', 'enderecoLogradouro', 'nomeCongregacao', 'temaDiscurso', 'cantico', 'dataDiscurso', 'horarioDiscurso', 'observacoesDiscurso', 'urgenciasDiscurso'];
  let membros = [];
  let escalaAtual = [];

  function mostrarStatus(mensagem, tipo = 'success') { status.textContent = mensagem; status.className = `status ${tipo}`; status.hidden = false; }
  function limparStatus() { status.hidden = true; status.textContent = ''; }
  function obterNomes(papel) { return membros.filter(member => member.papeis.includes(papel)).map(member => member.nome); }
  function obterTodosNomes() { return membros.map(member => member.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')); }
  function obterMembrosGerador() { return { dirigente: DIRIGENTE_FIXO, presidente: obterNomes('presidente'), discurso: obterNomes('discurso'), leitor: obterNomes('leitor') }; }

  function atualizarContadorAusentes() {
    const total = containerAusencias.querySelectorAll('input:checked').length;
    contadorAusentes.textContent = `${total} ausente${total === 1 ? '' : 's'} de ${membros.length}`;
  }

  function preencherSelect(select, incluirTodos = false) {
    const valor = select.value;
    select.innerHTML = incluirTodos ? '<option value="">Todos / nenhum</option>' : '<option value="">Selecione</option>';
    obterTodosNomes().forEach(nome => { const option = document.createElement('option'); option.value = nome; option.textContent = nome; select.appendChild(option); });
    if ([...select.options].some(option => option.value === valor)) select.value = valor;
  }

  function inicializarControles() {
    containerAusencias.innerHTML = '';
    const ausentesAtuais = obterAusentesSelecionados();
    preencherSelect(selectDestaque, true);
    [historicoMembro1, historicoMembro2].forEach(select => preencherSelect(select));
    obterTodosNomes().forEach(nome => {
      const div = document.createElement('div'); div.className = 'ausencia-item';
      const id = `aus-${nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-')}`;
      div.innerHTML = `<input type="checkbox" id="${id}" value="${escapeHtml(nome)}" ${ausentesAtuais.includes(nome) ? 'checked' : ''}><label for="${id}">${escapeHtml(nome)}</label>`;
      containerAusencias.appendChild(div);
    });
    atualizarContadorAusentes();
  }

  function obterAusentesSelecionados() { return Array.from(containerAusencias.querySelectorAll('input:checked')).map(cb => cb.value); }
  function validarEntradas() {
    $('dataErro').textContent = ''; $('semanasErro').textContent = ''; let valido = true; const semanas = Number(inputSemanas.value);
    if (!inputDataInicio.value) { $('dataErro').textContent = 'Informe a data de início.'; valido = false; }
    if (!Number.isInteger(semanas) || semanas < 1 || semanas > 52) { $('semanasErro').textContent = 'Use um número inteiro entre 1 e 52.'; valido = false; }
    return valido;
  }

  function obterDadosDiscurso() { return Object.fromEntries(camposDiscurso.map(id => [id, $(id).value.trim()])); }
  function atualizarContador(campo) { const counter = document.querySelector(`[data-counter-for="${campo.id}"]`); if (counter) counter.textContent = `${campo.value.length}/${campo.maxLength}`; }
  function preencherDadosDiscurso(dados = {}) { camposDiscurso.forEach(id => { $(id).value = dados[id] || ''; atualizarContador($(id)); }); }

  function dadosDiscursoFormatados() {
    const d = obterDadosDiscurso();
    return [`${d.enderecoLogradouro}${d.enderecoBairro ? `, ${d.enderecoBairro}` : ''}${d.enderecoCidade ? ` — ${d.enderecoCidade}` : ''}`, d.nomeCongregacao, d.temaDiscurso, d.cantico, d.dataDiscurso, d.horarioDiscurso, d.observacoesDiscurso, d.urgenciasDiscurso];
  }

  function opcoesParaPapel(papel, atual) {
    const nomes = papel === 'dirigente' ? [DIRIGENTE_FIXO] : obterNomes(papel);
    return nomes.map(nome => `<option value="${escapeHtml(nome)}" ${nome === atual ? 'selected' : ''}>${escapeHtml(nome)}</option>`).join('');
  }

  function renderizarTabela(dados) {
    escalaAtual = dados; tabelaCorpo.innerHTML = ''; const membroSelecionado = selectDestaque.value;
    dados.forEach((item, index) => {
      const participantes = [item.dirigente, item.presidente, item.orador, item.leitor]; const tr = document.createElement('tr');
      if (membroSelecionado && participantes.includes(membroSelecionado)) tr.classList.add('destaque-membro');
      tr.innerHTML = `<td><strong>Semana ${item.semana}</strong></td><td>${escapeHtml(item.data)}</td>
        <td><select class="edit-select" data-index="${index}" data-role="dirigente" disabled aria-label="Dirigente da semana ${item.semana}">${opcoesParaPapel('dirigente', item.dirigente)}</select></td>
        <td><select class="edit-select" data-index="${index}" data-role="presidente" aria-label="Presidente da semana ${item.semana}">${opcoesParaPapel('presidente', item.presidente)}</select></td>
        <td><select class="edit-select" data-index="${index}" data-role="orador" aria-label="Discurso da semana ${item.semana}">${opcoesParaPapel('discurso', item.orador)}</select></td>
        <td><select class="edit-select" data-index="${index}" data-role="leitor" aria-label="Leitor da semana ${item.semana}">${opcoesParaPapel('leitor', item.leitor)}</select></td>`;
      tabelaCorpo.appendChild(tr);
    });
    resumo.textContent = `${dados.length} semana${dados.length === 1 ? '' : 's'} gerada${dados.length === 1 ? '' : 's'} • ${obterAusentesSelecionados().length} ausente${obterAusentesSelecionados().length === 1 ? '' : 's'} • use os campos da tabela para alterar participantes`;
    btnPdf.disabled = false; btnCompartilhar.disabled = false; btnPdfDiscursos.disabled = false; btnCompartilharDiscursos.disabled = false; renderizarCompositorDiscursos();
  }

  function renderizarCompositorDiscursos() {
    if (!escalaAtual.length) { compositorDiscursos.innerHTML = '<p class="empty-state">Gere uma escala para montar as designações.</p>'; return; }
    compositorDiscursos.innerHTML = escalaAtual.map((item, index) => `<article class="discourse-assignment"><h3>Semana ${item.semana} — ${escapeHtml(item.data)}</h3><p>Discurso: <strong>${escapeHtml(item.orador)}</strong></p><div class="btn-group"><button type="button" class="btn-terciario btnPdfDiscurso" data-index="${index}"><i data-lucide="file-down" aria-hidden="true"></i>Baixar esta designação</button><button type="button" class="btn-secundario btnCompartilharDiscurso" data-index="${index}"><i data-lucide="share-2" aria-hidden="true"></i>Compartilhar esta designação</button></div></article>`).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  function atualizarDesignacao(index, role, value) {
    const outros = escalaAtual[index]; const participantes = { dirigente: outros.dirigente, presidente: outros.presidente, orador: outros.orador, leitor: outros.leitor }; delete participantes[role];
    if (Object.values(participantes).includes(value)) { mostrarStatus('Esse participante já tem outra função nesta semana.', 'error'); renderizarTabela(escalaAtual); return; }
    escalaAtual[index][role] = value; mostrarStatus('Alteração aplicada. Salve a escala para registrar no histórico.'); renderizarTabela(escalaAtual);
  }

  function executarGeracao() {
    limparStatus(); if (!validarEntradas()) return;
    try { renderizarTabela(gerarEscalaSemanal({ totalSemanas: Number(inputSemanas.value), dataInicioStr: inputDataInicio.value, ausentes: obterAusentesSelecionados(), membros: obterMembrosGerador() })); mostrarStatus('Escala gerada sem conflitos. Você pode alterar qualquer participante na tabela.'); }
    catch (err) { escalaAtual = []; btnPdf.disabled = true; btnCompartilhar.disabled = true; resumo.textContent = 'Nenhuma escala válida gerada.'; tabelaCorpo.innerHTML = '<tr><td colspan="6" class="empty-state">Ajuste as ausências e gere novamente.</td></tr>'; mostrarStatus(err instanceof EscalaInviavelError ? `Não foi possível gerar a semana ${err.semana} (${err.data}): ${err.papel}. ${err.motivo}` : (err.message || 'Não foi possível gerar a escala.'), 'error'); }
  }

  async function atualizarHistorico() {
    const selecionados = [historicoMembro1.value, historicoMembro2.value].filter(Boolean);
    if (!selecionados.length) { historicoConteudo.innerHTML = '<p class="empty-state">Selecione um participante para ver o histórico.</p>'; return; }
    const historicos = await Promise.all(selecionados.map(nome => listarDesignacoes(nome)));
    historicoConteudo.innerHTML = historicos.map((historico, index) => {
      const nome = selecionados[index]; const contagem = historico.length;
      const rows = historico.slice(0, 30).map(item => `<tr><td>${escapeHtml(item.data)}</td><td>${escapeHtml(item.funcao)}</td><td>Semana ${item.semana}</td></tr>`).join('');
      const palavra = contagem === 1 ? 'designação' : 'designações';
      return `<h3>${escapeHtml(nome)} <span class="muted-note">(${contagem} ${palavra})</span></h3><table class="history-table"><thead><tr><th scope="col">Data</th><th scope="col">Função</th><th scope="col">Semana</th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="empty-state">Nenhuma designação salva.</td></tr>'}</tbody></table>`;
    }).join('<hr>');
  }

  function criarPdf() {
    if (!jsPDF || !escalaAtual.length) throw new Error('Gere uma escala antes de criar o PDF.');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); doc.setFontSize(18); doc.text('Escala de Reuniões', 14, 16); doc.setFontSize(10); doc.text(`Início: ${inputDataInicio.value} | ${escalaAtual.length} semanas`, 14, 23);
    const headers = ['Semana', 'Data', 'Dirigente', 'Presidente', 'Discurso', 'Leitor']; const rows = escalaAtual.map(item => [String(item.semana), item.data, item.dirigente, item.presidente, item.orador, item.leitor]); const widths = [20, 28, 55, 55, 55, 55]; let y = 32;
    doc.setFontSize(9); doc.setFillColor(31, 95, 139); doc.setTextColor(255, 255, 255); let x = 14; headers.forEach((header, i) => { doc.rect(x, y - 6, widths[i], 9, 'F'); doc.text(header, x + 2, y); x += widths[i]; }); doc.setTextColor(31, 41, 55);
    rows.forEach((row, rowIndex) => { y += 9; x = 14; if (rowIndex % 2 === 0) { doc.setFillColor(245, 248, 250); doc.rect(14, y - 6, widths.reduce((a, b) => a + b, 0), 9, 'F'); } row.forEach((value, i) => { doc.text(String(value).slice(0, 28), x + 2, y); x += widths[i]; }); }); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Gerado pelo app Escala de Reuniões', 14, 195); return doc;
  }
  function criarPdfDiscurso(index = null) {
    if (!jsPDF || !escalaAtual.length) throw new Error('Gere uma escala antes de criar o PDF.');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const itens = index === null ? escalaAtual : [escalaAtual[index]]; const dados = dadosDiscursoFormatados();
    doc.setFontSize(18); doc.text('Informações do discurso', 14, 18); doc.setFontSize(10); doc.setTextColor(31, 41, 55); let y = 30;
    itens.forEach((item, itemIndex) => { if (itemIndex > 0) { doc.addPage(); y = 20; } doc.setFontSize(14); doc.text(`Semana ${item.semana} — ${item.data}`, 14, y); y += 10; doc.setFontSize(12); doc.text(`Discurso: ${item.orador}`, 14, y); y += 12; const labels = ['Endereço', 'Congregação', 'Tema', 'Cântico', 'Data', 'Horário', 'Observações', 'Urgências/eventualidades']; dados.forEach((value, i) => { doc.setFont(undefined, 'bold'); doc.text(`${labels[i]}:`, 14, y); doc.setFont(undefined, 'normal'); const linhas = doc.splitTextToSize(value || '—', 175); doc.text(linhas, 48, y); y += Math.max(8, linhas.length * 5 + 3); }); }); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Gerado pelo app Escala de Reuniões', 14, 285); return doc;
  }
  function baixarPdfDiscursos(index = null) { try { criarPdfDiscurso(index).save(`discursos-${inputDataInicio.value || 'sem-data'}${index === null ? '' : `-semana-${escalaAtual[index].semana}`}.pdf`); mostrarStatus('PDF de discurso baixado.'); } catch (err) { mostrarStatus(err.message, 'error'); } }
  async function compartilharPdfDiscurso(index) { try { const doc = criarPdfDiscurso(index); const blob = doc.output('blob'); const nome = `discurso-semana-${escalaAtual[index].semana}.pdf`; const arquivo = new File([blob], nome, { type: 'application/pdf' }); if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivo] }))) { await navigator.share({ title: `Discurso — Semana ${escalaAtual[index].semana}`, files: [arquivo] }); mostrarStatus('PDF da designação compartilhado.'); } else { doc.save(nome); mostrarStatus('Compartilhamento não suportado. O PDF foi baixado.'); } } catch (err) { if (err.name !== 'AbortError') mostrarStatus('Não foi possível compartilhar esta designação.', 'error'); } }
  function baixarPdf() { try { criarPdf().save(`escala-reunioes-${inputDataInicio.value || 'sem-data'}.pdf`); mostrarStatus('PDF baixado com sucesso.'); } catch (err) { mostrarStatus(err.message, 'error'); } }
  async function compartilharPdf() { try { const doc = criarPdf(); const blob = doc.output('blob'); const nome = `escala-reunioes-${inputDataInicio.value || 'sem-data'}.pdf`; const arquivo = new File([blob], nome, { type: 'application/pdf' }); if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivo] }))) { await navigator.share({ title: 'Escala de Reuniões', text: 'Escala de reuniões em PDF', files: [arquivo] }); mostrarStatus('PDF compartilhado.'); } else { doc.save(nome); mostrarStatus('Compartilhamento não suportado neste navegador. O PDF foi baixado.'); } } catch (err) { if (err.name !== 'AbortError') mostrarStatus('Não foi possível compartilhar. Tente baixar o PDF.', 'error'); } }

  containerAusencias.addEventListener('change', atualizarContadorAusentes);
  tabelaCorpo.addEventListener('change', event => { const target = event.target.closest('.edit-select'); if (target) atualizarDesignacao(Number(target.dataset.index), target.dataset.role, target.value); });
  btnGerar.addEventListener('click', executarGeracao); btnPdf.addEventListener('click', baixarPdf); btnCompartilhar.addEventListener('click', compartilharPdf); btnPdfDiscursos.addEventListener('click', () => baixarPdfDiscursos()); btnCompartilharDiscursos.addEventListener('click', () => { if (escalaAtual.length) compartilharPdfDiscurso(0); });
  compositorDiscursos.addEventListener('click', event => { const baixar = event.target.closest('.btnPdfDiscurso'); const compartilhar = event.target.closest('.btnCompartilharDiscurso'); if (baixar) baixarPdfDiscursos(Number(baixar.dataset.index)); if (compartilhar) compartilharPdfDiscurso(Number(compartilhar.dataset.index)); });
  selectDestaque.addEventListener('change', () => { if (escalaAtual.length) renderizarTabela(escalaAtual); });
  [historicoMembro1, historicoMembro2].forEach(select => select.addEventListener('change', () => atualizarHistorico().catch(() => mostrarStatus('Não foi possível carregar o histórico.', 'error'))));
  formMembro.addEventListener('submit', async event => { event.preventDefault(); const nome = $('nomeMembro').value; const papeis = [...formMembro.querySelectorAll('input[data-papel]:checked')].map(input => input.value); try { await adicionarMembro(nome, papeis); membros = await listarMembros(); formMembro.reset(); inicializarControles(); mostrarStatus(`${nome.trim()} foi adicionado e já pode ser escalado.`); } catch (err) { mostrarStatus(err.message || 'Não foi possível adicionar o membro.', 'error'); } });
  btnSalvar.addEventListener('click', async () => { if (!escalaAtual.length) { mostrarStatus('Gere uma escala antes de salvar.', 'error'); return; } try { await salvarEscalaBanco(escalaAtual, inputDataInicio.value, obterAusentesSelecionados(), obterDadosDiscurso()); await atualizarHistorico(); mostrarStatus('Escala, discurso e designações salvos neste dispositivo.'); } catch { mostrarStatus('Não foi possível salvar os dados neste dispositivo.', 'error'); } });
  camposDiscurso.forEach(id => $(id).addEventListener('input', event => atualizarContador(event.target)));

  try {
    membros = await listarMembros(); inicializarControles(); inputDataInicio.value = new Date().toISOString().split('T')[0];
    const estadoSalvo = await obterUltimoEstado(); if (estadoSalvo.dataInicio) inputDataInicio.value = estadoSalvo.dataInicio;
    (estadoSalvo.ausentes || []).forEach(membro => { const cb = [...containerAusencias.querySelectorAll('input')].find(input => input.value === membro); if (cb) cb.checked = true; }); atualizarContadorAusentes();
    preencherDadosDiscurso(estadoSalvo.discurso); if (estadoSalvo.escala?.length) renderizarTabela(estadoSalvo.escala); else executarGeracao(); await atualizarHistorico();
    catch { escalaAtual = []; inicializarControles(); executarGeracao(); }
  if (window.lucide) window.lucide.createIcons();
});
