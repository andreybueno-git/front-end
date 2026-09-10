// E4 — O ESTADO é a fonte; a tela é uma projeção.
//
// Este módulo guarda o único objeto de estado da aplicação e a função que
// deriva, a partir dele, a lista visível. Duas regras valem aqui:
//   1. nada neste arquivo consulta o DOM (nenhum document., nenhum querySelector);
//   2. derivar NUNCA altera o estado nem o array estado.tarefas.
//
// Quem altera o estado são os ouvintes em main.js; quem desenha é tela.js.
// Este arquivo só sabe de dados.

// Valores iniciais dos controles. Ficam numa função (e não numa constante)
// para que "Limpar filtros" receba um objeto NOVO a cada chamada, sem risco
// de alguém ter alterado um objeto compartilhado.
export function criterioInicial() {
  return {
    busca: '',            // texto digitado no campo de busca
    status: 'todos',      // 'todos' | 'a-fazer' | 'em-andamento' | 'em-revisao' | 'concluidas'
    prioridade: 'todas',  // 'todas' | 'baixa' | 'media' | 'alta'
    ordenacao: 'original' // 'original' | 'prazo-asc' | 'prazo-desc'
  };
}

// O objeto de estado único. É exportado como objeto (não como cópia) para
// que main.js altere as propriedades dele; a identidade nunca muda.
export const estado = {
  tarefas: [],          // o array EXATAMENTE como veio de carregarTarefas(). Nunca reordenado.
  ...criterioInicial(),
  carregamento: 'inicial', // 'inicial' | 'carregando' | 'sucesso' | 'erro'
  erro: null               // o objeto Error quando carregamento === 'erro'
};

// Repare no que NÃO existe acima: nenhum "tarefasFiltradas". A lista
// filtrada é recalculada a cada ciclo por derivarVisiveis(). Se ela fosse
// guardada, teríamos duas fontes de verdade que podem discordar (o filtro
// muda, mas alguém esqueceu de recalcular a lista).

// Remove acentos e caixa para a busca: "revisao" encontra "Revisão".
function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const PESO_DA_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };

// Recebe o estado, devolve a lista visível. Função PURA: mesmo estado,
// mesma lista; e o estado sai igual ao que entrou.
export function derivarVisiveis(estado) {
  const termo = normalizar(estado.busca);

  // filter() devolve um array NOVO; estado.tarefas segue intocado.
  // As três condições são independentes e combinadas com &&, por isso a
  // ordem em que o usuário mexeu nos controles não importa: o resultado
  // depende só dos valores atuais do estado.
  let visiveis = estado.tarefas.filter(function (tarefa) {
    const bateBusca = termo === '' || normalizar(tarefa.titulo).includes(termo);
    const bateStatus = estado.status === 'todos' || tarefa.status === estado.status;
    const batePrioridade = estado.prioridade === 'todas' || tarefa.prioridade === estado.prioridade;
    return bateBusca && bateStatus && batePrioridade;
  });

  // sort() ordena NO PRÓPRIO array (in place). Aqui isso é seguro porque
  // "visiveis" já é a cópia criada pelo filter(). Se fosse
  // estado.tarefas.sort(...), a ordem original seria perdida para sempre,
  // e "ordem original" deixaria de existir.
  if (estado.ordenacao === 'prazo-asc' || estado.ordenacao === 'prazo-desc') {
    const sinal = estado.ordenacao === 'prazo-asc' ? 1 : -1;
    visiveis = [...visiveis].sort(function (a, b) {
      // Prazo no formato ISO (AAAA-MM-DD): a ordem alfabética é a ordem
      // cronológica, então basta comparar as strings.
      if (a.prazo !== b.prazo) return a.prazo < b.prazo ? -sinal : sinal;
      // Empate no prazo: alta antes de média antes de baixa. Critério
      // estável e previsível, para o mesmo estado dar sempre a mesma tela.
      return PESO_DA_PRIORIDADE[a.prioridade] - PESO_DA_PRIORIDADE[b.prioridade];
    });
  }

  return visiveis;
}

// Diz se algum critério saiu do valor inicial. Usado só para texto de
// apoio na tela ("resultado vazio" com filtros ativos vs. origem vazia).
export function haCriterioAtivo(estado) {
  const inicial = criterioInicial();
  return Object.keys(inicial).some(function (chave) {
    return estado[chave] !== inicial[chave];
  });
}
