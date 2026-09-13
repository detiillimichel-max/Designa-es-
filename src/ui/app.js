import { gerarEscalaSemanal } from '../logic/geradorEscala.js';

document.addEventListener('DOMContentLoaded', () => {
  const btnGerar = document.getElementById('btnGerar');
  const inputSemanas = document.getElementById('qtdSemanas');
  const tabelaCorpo = document.getElementById('tabelaCorpo');

  function renderizar() {
    const semanas = parseInt(inputSemanas.value, 10) || 4;
    const dadosEscala = gerarEscalaSemanal(semanas);

    tabelaCorpo.innerHTML = '';

    dadosEscala.forEach((item) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td><strong>Semana ${item.semana}</strong></td>
        <td>${item.dirigente}</td>
        <td>${item.orador}</td>
        <td>${item.leitor}</td>
      `;

      tabelaCorpo.appendChild(tr);
    });
  }

  btnGerar.addEventListener('click', renderizar);

  // Gera a primeira tabela automaticamente ao carregar
  renderizar();
});

