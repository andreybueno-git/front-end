// E4 — ponto de entrada. Um único ciclo de atualização:
//
//     evento  →  altera o estado  →  renderizar(estado)
//
// Cada ouvinte faz exatamente duas coisas: escreve no estado e chama
// atualizar(). Nenhum ouvinte filtra lista, esconde cartão, lê outro
// controle ou mexe no DOM. Se um dia a tela e os controles discordarem,
// o culpado é um ouvinte que quebrou esta regra.
//
//   api.js         obtém os dados          (não toca o DOM, não lê controles)
//   estado.js      guarda e deriva         (não toca o DOM)
//   tela.js        projeta o estado        (não faz requisição, não filtra)
//   renderizacao.js desenha um array       (não sabe de onde ele veio)

import { carregarTarefas } from './api.js';
import { estado, criterioInicial } from './estado.js';
import { renderizar } from './tela.js';

// O único ponto de renderização. Todo caminho passa por aqui.
function atualizar() {
  renderizar(estado);
}

function instalarOuvintes() {
  const formulario = document.querySelector('.filtros');
  const campoBusca = document.getElementById('busca');
  const seletorOrdenacao = document.getElementById('ordenacao');
  const botaoLimpar = document.getElementById('limpar-filtros');
  const quadro = document.querySelector('.quadro');

  // Enter no campo de busca não deve navegar/recarregar: o estado já foi
  // atualizado a cada tecla pelo evento input.
  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
  });

  // Busca: evento input (dispara a cada alteração, inclusive colar e
  // limpar pelo "x" do type="search"). A comparação de caixa é feita na
  // derivação, não aqui.
  campoBusca.addEventListener('input', function (evento) {
    estado.busca = evento.target.value;
    atualizar();
  });

  // Status e prioridade são rádios com o mesmo name; change no formulário
  // pega qualquer um deles, e o name diz qual campo do estado muda.
  formulario.addEventListener('change', function (evento) {
    const alvo = evento.target;
    if (alvo.name === 'status') {
      estado.status = alvo.value;
      atualizar();
    } else if (alvo.name === 'prioridade') {
      estado.prioridade = alvo.value;
      atualizar();
    }
  });

  seletorOrdenacao.addEventListener('change', function (evento) {
    estado.ordenacao = evento.target.value;
    atualizar();
  });

  // Limpar: restaura os critérios no ESTADO. Os controles voltam sozinhos
  // porque renderizar() os sincroniza a partir do estado — uma fonte só.
  botaoLimpar.addEventListener('click', function () {
    Object.assign(estado, criterioInicial());
    atualizar();
  });

  // Delegação: UM ouvinte no quadro, instalado UMA vez. Os cartões são
  // substituídos a cada renderização (replaceChildren), então um ouvinte
  // preso a um cartão morreria junto com ele; e reinstalar a cada render
  // faria a ação disparar várias vezes. O ouvinte no ancestral resolve os
  // dois problemas: sobrevive à troca dos filhos e existe uma vez só.
  quadro.addEventListener('click', function (evento) {
    const botao = evento.target.closest('button[data-acao="detalhes"]');
    if (!botao || !quadro.contains(botao)) return;

    const cartao = botao.closest('.cartao');
    const detalhes = cartao.querySelector('.cartao__detalhes');
    const aberto = botao.getAttribute('aria-expanded') === 'true';

    botao.setAttribute('aria-expanded', String(!aberto));
    botao.textContent = aberto ? 'Detalhes' : 'Ocultar';
    detalhes.hidden = aberto;
  });
}

// Sem await de nível superior: tudo acontece dentro de uma função.
async function iniciar() {
  instalarOuvintes();

  // Carregando ANTES do await: senão a tela ficaria em branco na espera.
  estado.carregamento = 'carregando';
  estado.erro = null;
  atualizar();

  try {
    // carregarTarefas() só obtém. O array é guardado como veio: ele é a
    // fonte original, e nenhuma derivação vai reordená-lo ou reduzi-lo.
    estado.tarefas = await carregarTarefas();
    estado.carregamento = 'sucesso';
  } catch (erro) {
    // Só falha de verdade cai aqui: rede, protocolo, formato. Lista vazia
    // e resultado vazio NÃO passam por este catch — são decididos na tela
    // a partir dos dados.
    console.error(erro);
    estado.carregamento = 'erro';
    estado.erro = erro;
  }

  atualizar();
}

iniciar();
