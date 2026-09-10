// E4 — PROJETAR o estado na tela. Nenhuma requisição, nenhuma regra de filtro.
//
// (Na E3 este módulo chamava-se estados.js e recebia uma string com o nome
// do estado. Agora recebe o objeto de estado inteiro e deriva tudo dele.)
//
// renderizar(estado) é o ÚNICO ponto de renderização. Todo ouvinte, depois
// de alterar o estado, chama esta função — e só ela. Aqui, em ordem:
//   1. a lista visível é derivada UMA vez;
//   2. os cartões são desenhados a partir dela;
//   3. a contagem e a mensagem da região de status são escritas;
//   4. os controles são sincronizados com o estado.
// Como tudo sai do mesmo objeto, cartões, contagem, mensagem e controles
// não têm como discordar entre si.

import { derivarVisiveis, haCriterioAtivo } from './estado.js';
import { renderizarTarefas } from './renderizacao.js';

// A região existe no HTML desde o início, vazia, com role="status" e
// aria-live="polite": o leitor de tela já a observa quando a página monta.
const regiaoDeStatus = document.getElementById('status');
const totalNoCabecalho = document.getElementById('total-tarefas');

// Controles. Lidos uma vez; a tela só ESCREVE neles (sincroniza), nunca
// lê para decidir o que mostrar — quem decide é o estado.
const campoBusca = document.getElementById('busca');
const seletorOrdenacao = document.getElementById('ordenacao');
const radiosStatus = document.querySelectorAll('input[name="status"]');
const radiosPrioridade = document.querySelectorAll('input[name="prioridade"]');

function mensagemDoErro(erro) {
  switch (erro && erro.name) {
    case 'NetworkError':
      return 'Não foi possível conectar. Verifique sua internet e tente recarregar a página.';
    case 'HttpError':
      return `O servidor não conseguiu entregar as tarefas (status ${erro.status}). Tente novamente mais tarde.`;
    case 'SyntaxError':
      return 'Os dados chegaram, mas estão em um formato inválido. O arquivo de tarefas precisa ser corrigido.';
    default:
      return 'Algo deu errado ao carregar as tarefas.';
  }
}

function mostrar(texto, modificador) {
  // textContent: o texto é mostrado como texto, nunca interpretado como HTML.
  regiaoDeStatus.textContent = texto;
  regiaoDeStatus.className = modificador ? `status status--${modificador}` : 'status';
}

function plural(n, singular, pluralForma) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

// Escreve o valor do estado em cada controle — só quando difere, para não
// mexer no cursor de quem está digitando nem disparar reflow à toa.
function sincronizarControles(estado) {
  if (campoBusca.value !== estado.busca) campoBusca.value = estado.busca;
  if (seletorOrdenacao.value !== estado.ordenacao) seletorOrdenacao.value = estado.ordenacao;
  radiosStatus.forEach(function (radio) {
    radio.checked = radio.value === estado.status;
  });
  radiosPrioridade.forEach(function (radio) {
    radio.checked = radio.value === estado.prioridade;
  });
}

export function renderizar(estado) {
  // Os controles refletem o estado em qualquer situação, inclusive durante
  // o carregamento e no erro.
  sincronizarControles(estado);

  if (estado.carregamento === 'carregando' || estado.carregamento === 'inicial') {
    renderizarTarefas([]);
    totalNoCabecalho.textContent = '…';
    mostrar('Carregando tarefas…', 'carregando');
    return;
  }

  if (estado.carregamento === 'erro') {
    // Quadro zerado: contadores não podem contar uma história diferente
    // da mensagem.
    renderizarTarefas([]);
    totalNoCabecalho.textContent = '—';
    mostrar(mensagemDoErro(estado.erro), 'erro');
    return;
  }

  // carregamento === 'sucesso'. Daqui em diante NÃO existe erro: qualquer
  // lista vazia é um resultado válido, decidido pelos dados.
  const total = estado.tarefas.length;

  // ORIGEM vazia: o servidor respondeu, o JSON é bom, só não há tarefas.
  if (total === 0) {
    renderizarTarefas([]);
    totalNoCabecalho.textContent = '0 tarefas';
    mostrar('Nenhuma tarefa cadastrada ainda. Quando houver, elas aparecem aqui.', 'vazio');
    return;
  }

  // Derivação: UMA vez por ciclo. A mesma lista alimenta cartões e contagem.
  const visiveis = derivarVisiveis(estado);
  renderizarTarefas(visiveis);
  totalNoCabecalho.textContent = `${visiveis.length} de ${plural(total, 'tarefa', 'tarefas')}`;

  // RESULTADO vazio: há tarefas, mas nenhuma passa pelos critérios atuais.
  // Isso é decidido pela lista derivada — nunca chega perto de um catch.
  if (visiveis.length === 0) {
    mostrar(
      `Nenhuma das ${total} tarefas corresponde à busca e aos filtros. ` +
      'Altere os critérios ou use “Limpar filtros”.',
      'sem-resultado'
    );
    return;
  }

  const sufixo = haCriterioAtivo(estado) ? ' (com filtros ativos)' : '';
  mostrar(`Mostrando ${visiveis.length} de ${plural(total, 'tarefa', 'tarefas')}${sufixo}.`, 'sucesso');
}
