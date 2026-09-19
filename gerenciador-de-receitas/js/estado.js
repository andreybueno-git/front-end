// ESTADO — a única fonte. A tela é uma projeção dele.
// Regras: nada aqui toca o DOM; nenhuma derivação altera o estado.

export const TIPOS = { carne: "carne", frango: "frango", peixe: "peixe e frutos do mar", ovo: "ovo", laticinio: "laticínio", leguminosa: "leguminosa", vegetal: "vegetal", fruta: "fruta", cereal: "cereal", massa: "massa e farinha", oleaginosa: "castanhas", doce: "doce", tempero: "tempero e óleo", bebida: "bebida" };
export const rotuloTipo = t => TIPOS[t] || t || "outro";
export const LIMITE_LIVRO = 24; // cards por "página" do livro
export const ROTULO_TAG = { doce: "doce", salgado: "salgado", "sem-gluten": "sem glúten", "sem-lactose": "sem lactose", minha: "minha receita" };

export const estado = {
  ingredientes: [],        // como veio de dados.json. Nunca reordenado.
  receitas: [],            // idem
  receitasProprias: [],    // criadas pela pessoa: { id, nome, emoji, ings, sabor, minha: true }
  ingredientesProprios: [], // produtos cadastrados pela pessoa (mesmo formato de ingrediente, com casa: true)
  estoque: {},             // { idIngrediente: quantidade que tenho em casa, na unidade do ingrediente (g, ml ou un) }
  notas: {},               // { idIngrediente: 1..5 }
  preparo: {},             // { idReceita: [índices dos passos já marcados] } — o checklist do modo de preparo
  busca: "", tipo: "todos",
  buscaReceita: "", filtroReceita: "todas", pais: "todos",
  limiteLivro: 24,         // quantos cards do livro estão visíveis (botão "ver mais")
  panela: [],              // ids na ordem em que caíram
  receitaSelecionada: null,
  cozinhando: false,
  carregamento: "inicial", // 'inicial' | 'carregando' | 'sucesso' | 'erro'
  erro: null
};

// ---------- derivações (funções puras) ----------
export const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export const todosIngredientes = e => [...e.ingredientes, ...e.ingredientesProprios];
export const porId = e => Object.fromEntries(todosIngredientes(e).map(i => [i.id, i]));

// ---------- despensa / estoque ----------
export const qtdEmCasa = (e, id) => Math.max(0, +e.estoque[id] || 0);
export const temEmCasa = (e, id) => qtdEmCasa(e, id) > 0;
export const qtdDe = (r, id) => (r.qtd && r.qtd[id]) || 1;               // porções do ingrediente na receita
export const precisa = (e, r, id) => (porId(e)[id]?.porcaoQtd || 1) * qtdDe(r, id); // quantidade que a receita gasta
export const idsEmCasa = e => Object.keys(e.estoque).filter(id => qtdEmCasa(e, id) > 0);
// nível: 'ok' | 'baixo' (menos de 2 porções) | 'acabou'
export function nivelEstoque(e, id) {
  if (!(id in e.estoque)) return "fora"; const q = qtdEmCasa(e, id), p = porId(e)[id]?.porcaoQtd || 1;
  return q <= 0 ? "acabou" : q < 2 * p ? "baixo" : "ok";
}
export const alertasEstoque = e => Object.keys(e.estoque).map(id => ({ id, nivel: nivelEstoque(e, id) })).filter(a => a.nivel === "baixo" || a.nivel === "acabou");
export const formatarQtd = (i, q) => `${(+q.toFixed(1)).toString().replace(".", ",")} ${i.unidade === "un" ? (q === 1 ? "un" : "un") : i.unidade}`;

// gramagem de uma receita: quanto de cada ingrediente, em porções, unidade e gramas
export function gramagem(e, r) {
  const ING = porId(e);
  return r.ings.map(id => { const i = ING[id]; if (!i) return null; const n = qtdDe(r, id);
    return { id, nome: i.nome, emoji: i.emoji, porcoes: n, qtd: (i.porcaoQtd || 1) * n, unidade: i.unidade || "g", gramas: (i.gramas || i.porcaoQtd || 0) * n, emCasa: qtdEmCasa(e, id), falta: Math.max(0, (i.porcaoQtd || 1) * n - qtdEmCasa(e, id)) };
  }).filter(Boolean);
}

export function ingredientesVisiveis(e) {
  const t = norm(e.busca);
  return todosIngredientes(e).filter(i => (t === "" || norm(i.nome).includes(t)) && (e.tipo === "todos" || i.tipo === e.tipo));
}
// A prateleira é a despensa: só o que a pessoa disse que tem em casa (mesmo que tenha acabado).
export const despensaVisivel = e => ingredientesVisiveis(e).filter(i => i.id in e.estoque);
// O mercado é o resto do catálogo: de onde se escolhe o que tem em casa.
export const mercadoVisivel = e => ingredientesVisiveis(e).filter(i => !(i.id in e.estoque));

// Tags derivadas dos ingredientes — não digitadas à mão. Se um dia a manteiga
// mudar, todas as receitas com manteiga mudam junto.
export function tagsDe(e, r) {
  const ING = porId(e), ings = r.ings.map(id => ING[id]).filter(Boolean);
  const tags = [r.sabor];
  if (!ings.some(i => i.gluten)) tags.push("sem-gluten");
  if (!ings.some(i => i.lactose)) tags.push("sem-lactose");
  if (r.minha) tags.push("minha");
  return tags;
}

export function macros(e, ids, qtd = {}) {
  const ING = porId(e);
  const t = ids.reduce((a, id) => { const i = ING[id]; if (!i) return a; const n = qtd[id] || 1; a.kcal += i.kcal * n; a.p += i.p * n; a.c += i.c * n; a.g += i.g * n; return a; }, { kcal: 0, p: 0, c: 0, g: 0 });
  const kp = t.p * 4, kc = t.c * 4, kg = t.g * 9, tot = kp + kc + kg || 1;
  return { ...t, pctP: kp / tot * 100, pctC: kc / tot * 100, pctG: kg / tot * 100 };
}

export const todasReceitas = e => [...e.receitas, ...e.receitasProprias];

export function avaliarPanela(e) {
  const set = new Set(e.panela); let melhor = null;
  for (const r of todasReceitas(e)) {
    const tem = r.ings.filter(i => set.has(i)).length, faltam = r.ings.filter(i => !set.has(i)), sobram = [...set].filter(i => !r.ings.includes(i));
    const score = tem / r.ings.length - sobram.length * .15;
    if (!melhor || score > melhor.score) melhor = { r, tem, faltam, sobram, score, exata: !faltam.length && !sobram.length, completa: !faltam.length };
  }
  return melhor;
}

export function receitasVisiveis(e) {
  const set = new Set(e.panela), t = norm(e.buscaReceita), ING = porId(e);
  return todasReceitas(e).filter(r => {
    const bateBusca = t === "" || norm(r.nome).includes(t) || norm(r.pais || "").includes(t) || norm(r.sobre || "").includes(t) || r.ings.some(id => norm(ING[id]?.nome || id).includes(t));
    const tags = tagsDe(e, r);
    const bateFiltro = e.filtroReceita === "todas" ? true
      : e.filtroReceita === "da-para-fazer" ? r.ings.every(i => set.has(i))
      : e.filtroReceita === "em-casa" ? r.ings.every(i => qtdEmCasa(e, i) >= precisa(e, r, i))
      : e.filtroReceita === "do-mundo" ? !!r.pais
      : tags.includes(e.filtroReceita);
    const batePais = e.pais === "todos" || r.pais === e.pais;
    return bateBusca && bateFiltro && batePais;
  });
}

// nota média dos ingredientes de uma receita (só os avaliados)
export function notaDaReceita(e, r) {
  const notas = r.ings.map(id => e.notas[id]).filter(Boolean);
  return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
}

// ---------- modo de preparo (o checklist) ----------
// Toda receita tem um roteiro. As do mundo trazem o preparo detalhado; as demais
// ganham um primeiro passo de mise en place montado a partir da própria gramagem.
export function roteiro(e, r) {
  if (Array.isArray(r.preparo) && r.preparo.length)
    return r.preparo.map(p => typeof p === "string" ? { txt: p } : { txt: p.txt, min: p.min });
  const lista = gramagem(e, r).map(x => `${x.nome.toLowerCase()} ${formatarQtd(porId(e)[x.id], x.qtd)}`).join(", ");
  const abre = lista ? [{ txt: `Separe e deixe à mão: ${lista}.`, min: 5 }] : [];
  return [...abre, ...(r.passos || ["Junte tudo na panela e cozinhe do seu jeito."]).map(txt => ({ txt }))];
}
export const passosFeitos = (e, id) => Array.isArray(e.preparo[id]) ? e.preparo[id] : [];
export const passoFeito = (e, id, i) => passosFeitos(e, id).includes(i);
export function progresso(e, r) {
  const total = roteiro(e, r).length, feitos = passosFeitos(e, r.id).filter(i => i < total).length;
  return { feitos, total, pct: total ? Math.round(feitos / total * 100) : 0, completa: total > 0 && feitos === total, atual: feitos < total ? roteiro(e, r).findIndex((_, i) => !passoFeito(e, r.id, i)) : -1 };
}
export const tempoDoRoteiro = (e, r) => roteiro(e, r).reduce((a, p) => a + (+p.min || 0), 0);

// ---------- países ----------
export function paises(e) {
  const m = new Map();
  todasReceitas(e).filter(r => r.pais).forEach(r => { const o = m.get(r.pais) || { pais: r.pais, bandeira: r.bandeira || "🌍", n: 0 }; o.n++; m.set(r.pais, o); });
  return [...m.values()].sort((a, b) => a.pais.localeCompare(b.pais, "pt-BR"));
}

export const criterioInicial = () => ({ busca: "", tipo: "todos", buscaReceita: "", filtroReceita: "todas", pais: "todos", limiteLivro: LIMITE_LIVRO });
