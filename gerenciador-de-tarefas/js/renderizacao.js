// Aula 5 — DESENHAR os dados na tela.
//
// Esta função recebe um array de tarefas e monta os cartões nas colunas.
// Ela não sabe (nem precisa saber) DE ONDE o array veio: na aula 5 vinha
// de dados.js; na E3 vem de dados.json pela rede; na E4 vem da lista
// DERIVADA do estado (busca + filtros + ordenação). Em nenhum caso ela
// filtra: recebe pronto e desenha.
//
// E4: o cartão ganhou um botão "Detalhes". Ele NÃO recebe ouvinte aqui —
// os cartões são substituídos a cada renderização, então um ouvinte por
// cartão morreria junto. O clique é tratado por delegação em main.js.

const NOMES_DOS_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                         'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ROTULO_DA_PRIORIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

const ROTULO_DO_STATUS = {
  'a-fazer': 'A fazer', 'em-andamento': 'Em andamento',
  'em-revisao': 'Em revisão', 'concluidas': 'Concluída'
};

// "2026-08-26" -> "26 ago"
function formatarPrazo(isoData) {
  const [ano, mes, dia] = isoData.split('-').map(Number);
  return `${String(dia).padStart(2, '0')} ${NOMES_DOS_MESES[mes - 1]}`;
}

// "2026-08-26" -> "26/08/2026"
function formatarPrazoCompleto(isoData) {
  const [ano, mes, dia] = isoData.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Cria um elemento já com texto. textContent, nunca innerHTML:
// o dado vira texto na tela, jamais é interpretado como HTML.
function elemento(tag, texto, classe) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function criarCartao(tarefa) {
  const artigo = elemento('article', undefined, 'cartao');

  const topo = elemento('div', undefined, 'cartao__topo');
  const titulo = elemento('h4', tarefa.titulo);
  titulo.title = tarefa.titulo;
  const etiqueta = elemento('span', ROTULO_DA_PRIORIDADE[tarefa.prioridade] || tarefa.prioridade,
                            `prioridade prioridade--${tarefa.prioridade}`);
  topo.append(titulo, etiqueta);

  const projeto = elemento('p', undefined, 'cartao__projeto');
  projeto.append(elemento('span', 'Projeto'), ` ${tarefa.projeto || ''}`);

  const responsavel = elemento('p', undefined, 'cartao__responsavel');
  responsavel.append(elemento('span', 'Responsável'), ` ${tarefa.responsavel || ''}`);

  // Bloco de detalhes, oculto até o clique. hidden é um atributo: quem o
  // alterna é o ouvinte delegado em main.js.
  const detalhes = elemento('dl', undefined, 'cartao__detalhes');
  detalhes.id = `detalhes-${tarefa.id}`;
  detalhes.hidden = true;
  [
    ['Título completo', tarefa.titulo],
    ['Status', ROTULO_DO_STATUS[tarefa.status] || tarefa.status],
    ['Prazo', formatarPrazoCompleto(tarefa.prazo)],
    ['Identificador', `#${tarefa.id}`]
  ].forEach(function ([rotulo, valor]) {
    detalhes.append(elemento('dt', rotulo), elemento('dd', valor));
  });

  const rodape = elemento('footer', undefined, 'cartao__rodape');
  const prazo = elemento('time', formatarPrazo(tarefa.prazo));
  prazo.dateTime = tarefa.prazo;

  const botao = elemento('button', 'Detalhes', 'cartao__botao');
  botao.type = 'button';
  botao.dataset.acao = 'detalhes';
  botao.dataset.id = String(tarefa.id);
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', detalhes.id);

  rodape.append(prazo, elemento('span', tarefa.tipo || ''), botao);

  artigo.append(topo, projeto, responsavel, detalhes, rodape);

  const item = document.createElement('li');
  item.append(artigo);
  return item;
}

export function renderizarTarefas(tarefas) {
  const colunas = document.querySelectorAll('section.coluna');

  colunas.forEach(function (coluna) {
    const lista = coluna.querySelector('.coluna__tarefas');
    const doStatus = tarefas.filter(function (t) { return t.status === coluna.id; });

    lista.replaceChildren(...doStatus.map(criarCartao));

    coluna.querySelector('.coluna__quantidade').textContent = String(doStatus.length);
    coluna.querySelector('.somente-leitor').textContent =
      `${doStatus.length} ${doStatus.length === 1 ? 'tarefa' : 'tarefas'}`;
  });

  // E4: o total do cabeçalho ("N de M tarefas") passou a ser escrito por
  // tela.js, que conhece o total original E a lista visível. Esta função
  // recebe só a lista visível e não teria como saber o "M".
}
