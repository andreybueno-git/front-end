// TELA — projeta o estado. Nenhuma requisição, nenhuma regra de negócio.
// renderizar(estado) é o ÚNICO ponto de renderização.
import { TIPOS, rotuloTipo, LIMITE_LIVRO, ROTULO_TAG, roteiro, progresso, passoFeito, tempoDoRoteiro, paises, sugestoesDaPanela, porId, todosIngredientes, ingredientesVisiveis, despensaVisivel, mercadoVisivel, receitasVisiveis, avaliarPanela, macros, tagsDe, notaDaReceita, temEmCasa, qtdEmCasa, nivelEstoque, alertasEstoque, formatarQtd, gramagem, idsEmCasa } from "./estado.js";

const $ = id => document.getElementById(id);
export const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
const fmt = n => String(+n.toFixed(1)).replace(".", ",");

// Arte do ingrediente: render 3D quando existe, senão "ficha de argila" com o emoji.
export function art(e, id) {
  const i = porId(e)[id];
  if (i.imagem) { const img = el("img"); img.src = i.imagem; img.alt = ""; img.draggable = false; img.loading = "lazy"; return img; }
  return el("span", "fb", i.emoji);
}
function estrelas(nota, interativo, id) {
  const w = el("span", "stars"); w.setAttribute("role", interativo ? "radiogroup" : "img"); w.setAttribute("aria-label", nota ? `nota ${nota} de 5` : "sem nota");
  for (let n = 1; n <= 5; n++) {
    const s = el(interativo ? "button" : "span", "star" + (n <= nota ? " on" : ""), "★");
    if (interativo) { s.type = "button"; s.dataset.nota = n; s.dataset.id = id; s.setAttribute("aria-label", `${n} estrela${n > 1 ? "s" : ""}`); }
    w.append(s);
  }
  return w;
}

function renderChips(e) {
  const c = $("chips");
  if (!c.children.length) [["todos", "todos"], ...Object.entries(TIPOS)].forEach(([v, rot]) => { const b = el("button", "chip", rot); b.type = "button"; b.dataset.tipo = v; c.append(b); });
  c.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.tipo === e.tipo));
  const sel = $("filtro-pais");
  if (sel && sel.options.length <= 1) paises(e).forEach(x => { const o = document.createElement("option"); o.value = x.pais; o.textContent = `${x.bandeira} ${x.pais} (${x.n})`; sel.append(o); });
  if (sel && sel.value !== e.pais) sel.value = e.pais;
  document.querySelectorAll("[data-rf]").forEach(b => b.setAttribute("aria-pressed", b.dataset.rf === e.filtroReceita));
  if ($("busca").value !== e.busca) $("busca").value = e.busca;
  if ($("busca-receita").value !== e.buscaReceita) $("busca-receita").value = e.buscaReceita;
}

// Um card de ingrediente (usado na despensa e no mercado)
function tileDe(e, i, { mercado = false, usado = false, pisca = false } = {}) {
  const nivel = nivelEstoque(e, i.id), tem = nivel !== "fora", q = qtdEmCasa(e, i.id);
  const t = el("div", "tile" + (mercado ? " mercado" : "") + (usado ? " usado" : "") + (pisca ? " pisca" : "") + (tem ? " tem" : "") + (i.casa ? " proprio" : "") + (nivel === "baixo" || nivel === "acabou" ? " alerta" : ""));
  t.dataset.id = i.id; t.setAttribute("role", "button"); t.tabIndex = 0;
  t.setAttribute("aria-label", mercado ? `${i.nome}, ${i.kcal} kcal — informar quanto tenho em casa`
    : `${i.nome}, ${i.kcal} kcal, em casa: ${formatarQtd(i, q)}${nivel === "baixo" ? ", acabando" : nivel === "acabou" ? ", acabou" : ""}${usado ? ", já na panela" : ""}${pisca ? ", falta para a receita" : ""}`);
  if (!mercado) t.setAttribute("aria-disabled", usado);
  const a = el("span", "art"); a.append(art(e, i.id));
  t.append(a, el("span", "name", i.nome), estrelas(e.notas[i.id] || 0, false));
  // selo de quantidade: na despensa mostra quanto tem; no mercado é o "🏠 +" para informar
  const c = el("button", "casa " + nivel, tem ? (nivel === "ok" ? "🏠 " : "⚠️ ") + formatarQtd(i, q) : "🏠 +");
  c.type = "button"; c.dataset.casa = i.id; c.tabIndex = -1; c.setAttribute("aria-hidden", "true");
  c.title = tem ? `Em casa: ${formatarQtd(i, q)}${nivel === "baixo" ? " — está acabando" : nivel === "acabou" ? " — acabou" : ""} (clique para ajustar)` : "Quanto tenho em casa? (clique para informar)";
  t.append(c);
  return t;
}

function renderShelf(e) {
  const lista = despensaVisivel(e), sel = [...e.receitas, ...e.receitasProprias].find(r => r.id === e.receitaSelecionada), shelf = $("shelf");
  shelf.replaceChildren(...lista.map(i => tileDe(e, i, { usado: e.panela.includes(i.id), pisca: !!(sel && sel.ings.includes(i.id) && !e.panela.includes(i.id)) })));
  const totalDespensa = Object.keys(e.estoque).length, filtrando = e.busca !== "" || e.tipo !== "todos";
  if (!lista.length) {
    const v = el("div", "empty");
    if (!totalDespensa) v.append(el("p", "", "Sua despensa está vazia. Escolha no mercado abaixo o que você tem em casa — clique no alimento e diga a quantidade."), Object.assign(el("button", "btn ghostb", "🛒 abrir o mercado"), { type: "button", id: "abrir-mercado" }));
    else v.append(el("p", "", filtrando ? "Nada com esse nome ou tipo na sua despensa." : "Nada aqui."), Object.assign(el("button", "btn ghostb", "ver tudo"), { type: "button", id: "limpar-busca" }));
    shelf.append(v);
  }
  const al = alertasEstoque(e);
  $("cont-prat").textContent = `${totalDespensa} ${totalDespensa === 1 ? "item" : "itens"}${filtrando ? ` · ${lista.length} na busca` : ""}${al.length ? ` · ⚠️ ${al.length}` : ""}`;
  const ING = porId(e), box = $("alertas");
  box.replaceChildren();
  if (al.length) {
    box.append(el("b", "", "⚠️ Despensa:"));
    al.forEach(a => { const i = ING[a.id]; box.append(el("span", "al " + a.nivel, `${i.emoji} ${i.nome} ${a.nivel === "acabou" ? "acabou" : "acabando (" + formatarQtd(i, qtdEmCasa(e, a.id)) + ")"}`)); });
  }
  box.hidden = !al.length;
}

function renderMercado(e) {
  const lista = mercadoVisivel(e), cat = $("catalogo"), total = todosIngredientes(e).length - Object.keys(e.estoque).length;
  cat.replaceChildren(...lista.map(i => tileDe(e, i, { mercado: true })));
  if (!lista.length) { const v = el("div", "empty"); v.append(el("p", "", total ? "Nada com esse nome ou tipo no mercado." : "Tudo do mercado já está na sua despensa. Cadastre um produto novo abaixo.")); if (total) v.append(Object.assign(el("button", "btn ghostb", "ver tudo"), { type: "button", id: "limpar-busca-mercado" })); cat.append(v); }
  $("cont-mercado").textContent = total ? `${total} para escolher` : "";
  // despensa vazia: mercado aberto por padrão (a pessoa ainda não escolheu nada)
  if (!Object.keys(e.estoque).length) $("mercado").open = true;
}

function renderPot(e) {
  const ING = porId(e);
  $("pot-itens").replaceChildren(...e.panela.map(id => { const b = el("button", "pot-item"); b.type = "button"; b.dataset.tirar = id; b.setAttribute("aria-label", `Tirar ${ING[id].nome} da panela`); b.title = `Tirar ${ING[id].nome}`; b.append(art(e, id)); return b; }));
  $("caldo").classList.toggle("vazio", !e.panela.length);
  $("pot").classList.toggle("cozinhando", e.cozinhando);
  $("cont-pan").textContent = e.panela.length ? `${e.panela.length} ingrediente${e.panela.length > 1 ? "s" : ""}` : "vazia";
  $("dock").hidden = !e.panela.length; $("dock-count").textContent = e.panela.length;
  $("salvar-receita").disabled = e.panela.length < 2;
}

function renderResultado(e) {
  const r = $("resultado"), ING = porId(e); r.className = "resultado";
  if (!e.panela.length) { r.replaceChildren(el("span", "prato", "🍽️"), Object.assign(el("div"), { innerHTML: "<h3>Panela vazia</h3><p>Arraste ingredientes para cá (no celular, toque). Eu digo qual receita está mais perto.</p>" })); return; }
  const av = avaliarPanela(e), tags = tagsDe(e, av.r).map(t => ROTULO_TAG[t]).join(" · ");
  const bloco = el("div");
  if (av.completa) {
    r.classList.add("achou");
    const titulo = e.cozinhando ? `Pronto: ${av.r.nome}` : `Dá pra fazer: ${av.r.nome}`;
    bloco.append(el("h3", "", titulo), el("p", "", `${av.r.tempo || "—"} · ${tags}${av.sobram.length ? ` · sobrou ${av.sobram.map(i => ING[i].emoji).join(" ")}` : ""}${e.cozinhando ? " · baixado da despensa" : " · aperte Cozinhar (desconta da despensa)"}`));
    const g = el("div", "faltam"); gramagem(e, av.r).forEach(x => g.append(el("span", x.falta > 0 && x.emCasa > 0 ? "pouco" : "", `${x.emoji} ${x.porcoes > 1 ? String(x.porcoes).replace(".", ",") + "× " : ""}${x.nome}: ${formatarQtd(ING[x.id], x.qtd)}${x.unidade === "un" ? ` (≈${x.gramas} g)` : ""}`))); bloco.append(g);
  } else {
    bloco.append(el("h3", "", `Quase ${av.r.nome.toLowerCase()} (${av.tem} de ${av.r.ings.length})`), el("p", "", av.faltam.length > 1 ? "Faltam:" : "Falta:"));
    const f = el("div", "faltam"); av.faltam.forEach(i => f.append(el("span", "", `${ING[i].emoji} ${ING[i].nome}`))); bloco.append(f);
  }
  r.replaceChildren(el("span", "prato", av.r.emoji), bloco);
}

// Lista tudo que a panela alcança: primeiro o que fecha, depois o que está perto.
const LIMITE_SUG = 8;
function renderSugestoes(e) {
  const box = $("sugestoes"), lista = $("sug-lista"), todas = sugestoesDaPanela(e);
  box.hidden = !todas.length;
  if (!todas.length) { lista.replaceChildren(); $("cont-sug").textContent = ""; return; }
  const ING = porId(e), prontas = todas.filter(x => x.completa).length;
  const destaque = avaliarPanela(e)?.r.id;   // essa já aparece logo acima, em destaque
  const mostrar = todas.filter(x => x.r.id !== destaque).slice(0, LIMITE_SUG);
  lista.replaceChildren(...mostrar.map(x => {
    const b = el("button", "sug" + (x.completa ? " pronta" : "")); b.type = "button"; b.dataset.rid = x.r.id;
    b.append(el("span", "sug__emoji", x.r.emoji));
    const info = el("span", "sug__info");
    info.append(el("b", "", `${x.r.bandeira ? x.r.bandeira + " " : ""}${x.r.nome}`));
    const st = el("small", "");
    if (x.completa) st.textContent = "✓ tem tudo na panela";
    else {
      // 🏠 marca o que falta e você já tem na despensa: é só pegar
      const nomes = x.faltam.slice(0, 3).map(i => (x.emCasa.includes(i) ? "🏠 " : "") + (ING[i]?.nome || i));
      st.textContent = `falta ${x.faltam.length}: ${nomes.join(", ")}${x.faltam.length > 3 ? "…" : ""}`;
      if (x.temTudoEmCasa) { // tudo o que falta está na despensa: o 🏠 vai uma vez só, no começo
        b.classList.add("emcasa");
        st.textContent = `🏠 só pegar na despensa: ${x.faltam.slice(0, 3).map(i => ING[i]?.nome || i).join(", ")}${x.faltam.length > 3 ? "…" : ""}`;
      }
    }
    info.append(st); b.append(info);
    b.title = `${x.r.nome} — ${x.tem} de ${x.r.ings.length} ingredientes na panela${x.temTudoEmCasa ? "; o resto você tem em casa" : ""}`;
    return b;
  }));
  if (todas.length > mostrar.length)
    lista.append(Object.assign(el("button", "btn ghostb sm sug__mais", `ver as ${todas.length} no livro`), { type: "button", id: "ver-todas-panela" }));
  $("cont-sug").textContent = `${todas.length} receita${todas.length > 1 ? "s" : ""}${prontas ? ` · ${prontas} fecha${prontas > 1 ? "m" : ""} agora` : ""}`;
}

function renderNutri(e) {
  const av = e.panela.length ? avaliarPanela(e) : null;
  const m = macros(e, e.panela, av && av.completa ? av.r.qtd || {} : {}), vazio = !e.panela.length;
  $("nutri-titulo").textContent = av && av.completa ? `Nutrição: ${av.r.nome} (1 porção)` : "Informação nutricional da panela";
  $("n-kcal").textContent = Math.round(m.kcal);
  $("donut").style.setProperty("--p", (vazio ? 0 : m.pctP) + "%"); $("donut").style.setProperty("--c", (vazio ? 0 : m.pctP + m.pctC) + "%");
  $("b-p").style.width = m.pctP + "%"; $("b-c").style.width = m.pctC + "%"; $("b-f").style.width = m.pctG + "%";
  $("v-p").textContent = `${fmt(m.p)} g`; $("v-c").textContent = `${fmt(m.c)} g`; $("v-f").textContent = `${fmt(m.g)} g`;
}

function cardReceita(e, rc) {
  const set = new Set(e.panela), m = macros(e, rc.ings, rc.qtd || {}), tags = tagsDe(e, rc), nota = notaDaReceita(e, rc), gr = gramagem(e, rc), totalG = gr.reduce((a, x) => a + x.gramas, 0), daCasa = gr.every(x => x.falta === 0);
  const b = el("button", "recipe" + (rc.minha ? " minha" : "")); b.type = "button"; b.dataset.rid = rc.id; b.setAttribute("aria-expanded", e.receitaSelecionada === rc.id); b.setAttribute("aria-controls", "ficha");
  const plate = el("span", "plate"); plate.append(el("span", "dish", rc.emoji));
  if (rc.pais) { const b = el("span", "flag"); b.textContent = rc.bandeira || "🌍"; b.title = rc.pais; plate.append(b); }
  const info = el("span", "info");
  const pr = progresso(e, rc);
  info.append(el("b", "", rc.nome), el("small", "", `${rc.pais ? rc.pais + " · " : ""}${rc.tempo || "sua receita"} · ${rc.ings.length} ingredientes · ≈${Math.round(totalG)} g · ${Math.round(m.kcal)} kcal${rc.ings.every(i => set.has(i)) ? " · ✓ tudo na panela" : ""}${daCasa ? " · 🏠 tenho tudo" : ""}${pr.completa ? " · ✅ você já fez" : pr.feitos ? ` · 👩‍🍳 no passo ${pr.feitos + 1}` : ""}`));
  const tg = el("span", "tags"); tags.forEach(t => tg.append(el("i", "", ROTULO_TAG[t]))); info.append(tg);
  if (nota) info.append(estrelas(Math.round(nota), false));
  const ings = el("span", "ing"); gr.forEach(x => { const s = el("span", set.has(x.id) ? "ok" : ""); s.append(art(e, x.id), el("i", "q", formatarQtd(porId(e)[x.id], x.qtd))); s.title = `${x.nome}: ${formatarQtd(porId(e)[x.id], x.qtd)}`; ings.append(s); });
  b.append(plate, info, ings);
  return b;
}
function renderBook(e) {
  const lista = receitasVisiveis(e), book = $("book"), visiveis = lista.slice(0, e.limiteLivro);
  book.replaceChildren(...visiveis.map(rc => cardReceita(e, rc)));
  if (lista.length > visiveis.length) { const m = Object.assign(el("button", "btn ghostb ver-mais", `Ver mais ${Math.min(LIMITE_LIVRO, lista.length - visiveis.length)} receitas (${lista.length - visiveis.length} restantes)`), { type: "button", id: "ver-mais" }); book.append(m); }
  if (!lista.length) {
    const v = el("div", "empty");
    v.append(el("p", "", e.pais !== "todos" ? `Nada com essa busca na cozinha de ${e.pais}.`
      : e.filtroReceita === "da-para-fazer" && e.panela.length < 2 ? "Coloque ingredientes na panela para ver o que dá pra fazer agora."
      : e.filtroReceita === "em-casa" ? (idsEmCasa(e).length ? "Nenhuma receita fecha com a quantidade que você tem em casa. Marque mais alimentos ou ajuste o estoque na ficha deles." : "Marque na prateleira o que você tem em casa (clique no alimento → “Tenho em casa”).")
      : "Nenhuma receita com esse filtro ou busca."));
    if (e.pais !== "todos") v.append(Object.assign(el("button", "btn ghostb", "🌍 ver em todos os países"), { type: "button", id: "limpar-pais" }));
    book.append(v);
  }
  $("cont-livro").textContent = `${lista.length} de ${e.receitas.length + e.receitasProprias.length}${e.pais !== "todos" ? ` · ${e.pais}` : ""}${lista.length > visiveis.length ? ` · mostrando ${visiveis.length}` : ""}`;
}

function renderFicha(e) {
  const f = $("ficha"), rc = [...e.receitas, ...e.receitasProprias].find(r => r.id === e.receitaSelecionada);
  if (!rc) { f.className = "ficha"; f.replaceChildren(); return; }
  const set = new Set(e.panela), m = macros(e, rc.ings, rc.qtd || {}), ING = porId(e), gr = gramagem(e, rc), totalG = gr.reduce((a, x) => a + x.gramas, 0);
  f.className = "ficha show";
  const cab = el("div", "ficha__cab"); cab.append(el("h3", "", `${rc.emoji} ${rc.nome}`), el("span", "tag", rc.tempo || "minha receita"), el("span", "tag", `≈ ${Math.round(totalG)} g`));
  if (rc.pais) cab.append(el("span", "tag tag--pais", `${rc.bandeira || "🌍"} ${rc.pais}`));
  const ings = el("div", "ings"); gr.forEach(x => { const s = el("span", set.has(x.id) ? "ok" : (x.falta > 0 && x.emCasa >= 0 && x.id in e.estoque ? "pouco" : "")); s.append(art(e, x.id), document.createTextNode(` ${x.porcoes > 1 ? String(x.porcoes).replace(".", ",") + "× " : ""}${x.nome} · ${formatarQtd(ING[x.id], x.qtd)}${x.unidade === "un" ? ` (≈${x.gramas} g)` : ""}${x.id in e.estoque ? (x.falta > 0 ? ` · falta ${formatarQtd(ING[x.id], x.falta)}` : " · 🏠 tem") : ""}${set.has(x.id) ? " ✓" : ""}`)); ings.append(s); });
  const preparo = blocoPreparo(e, rc);
  const nutri = el("div", "nutri nutri--ficha");
  nutri.innerHTML = `<div class="nutri__cab"><h4>Por porção</h4><span class="kcal-big">${Math.round(m.kcal)} <small>kcal</small></span></div>
    <div class="macros"><span class="donut" style="--p:${m.pctP}%;--c:${m.pctP + m.pctC}%" role="img" aria-label="proporção de macros"></span>
    <div class="bars">
      <div class="bar p"><b>Proteína</b><span class="trilho"><span class="fill" style="width:${m.pctP}%"></span></span><span class="val">${fmt(m.p)} g</span></div>
      <div class="bar c"><b>Carboidrato</b><span class="trilho"><span class="fill" style="width:${m.pctC}%"></span></span><span class="val">${fmt(m.c)} g</span></div>
      <div class="bar f"><b>Gordura</b><span class="trilho"><span class="fill" style="width:${m.pctG}%"></span></span><span class="val">${fmt(m.g)} g</span></div>
    </div></div>`;
  const acts = el("div", "acts");
  acts.append(Object.assign(el("button", "btn green", "🪄 Colocar tudo na panela"), { type: "button", id: "montar" }));
  if (rc.minha) acts.append(Object.assign(el("button", "btn ghostb", "Excluir receita"), { type: "button", id: "excluir-receita" }));
  acts.append(Object.assign(el("button", "btn ghostb", "Fechar"), { type: "button", id: "fechar-ficha" }));
  const esq = el("div");
  esq.append(cab);
  if (rc.sobre) esq.append(el("p", "sobre", rc.sobre));
  esq.append(ings, preparo, acts);
  f.replaceChildren(esq, nutri);
}

// Modo de preparo: cada passo é um botão que a pessoa marca enquanto cozinha.
// O estado mora em estado.preparo; aqui só se desenha o que já está marcado.
function blocoPreparo(e, rc) {
  const passos = roteiro(e, rc), pr = progresso(e, rc), total = tempoDoRoteiro(e, rc);
  const box = el("section", "preparo" + (pr.completa ? " completo" : ""));
  const cab = el("div", "preparo__cab");
  cab.append(el("h4", "", "👩‍🍳 Modo de preparo"), el("span", "preparo__cont", `${pr.feitos} de ${pr.total} passos${total ? ` · ~${total} min` : ""}`));
  const trilho = el("span", "preparo__barra"); const fill = el("span", "preparo__fill"); fill.style.width = pr.pct + "%";
  trilho.append(fill); trilho.setAttribute("role", "progressbar"); trilho.setAttribute("aria-valuenow", pr.pct);
  trilho.setAttribute("aria-valuemin", "0"); trilho.setAttribute("aria-valuemax", "100"); trilho.setAttribute("aria-label", "progresso do preparo");
  const ol = el("ol", "passos"); ol.setAttribute("aria-label", "Passos do preparo");
  passos.forEach((p, i) => {
    const feito = passoFeito(e, rc.id, i), atual = !feito && i === pr.atual;
    const li = el("li", "passo" + (feito ? " feito" : "") + (atual ? " atual" : ""));
    const b = el("button", "passo__btn"); b.type = "button"; b.dataset.passo = i;
    b.setAttribute("role", "checkbox"); b.setAttribute("aria-checked", feito);
    b.setAttribute("aria-label", `Passo ${i + 1}${feito ? ", feito" : ""}: ${p.txt}`);
    b.append(el("span", "passo__marca", feito ? "✓" : String(i + 1)), el("span", "passo__txt", p.txt));
    if (p.min) b.append(el("i", "passo__min", `${p.min} min`));
    li.append(b); ol.append(li);
  });
  const acts = el("div", "preparo__acts");
  if (pr.completa) acts.append(el("span", "preparo__fim", "🎉 Receita concluída — bom apetite!"));
  else if (pr.feitos) acts.append(el("span", "preparo__dica", `Próximo: passo ${pr.atual + 1}.`));
  else acts.append(el("span", "preparo__dica", "Clique em cada passo conforme for fazendo — fica salvo."));
  if (pr.feitos) acts.append(Object.assign(el("button", "btn ghostb sm", "↺ recomeçar"), { type: "button", id: "reiniciar-preparo" }));
  box.append(cab, trilho, ol, acts);
  return box;
}

function renderCarregamento(e) {
  const s = $("status");
  const mapa = { carregando: ["Carregando ingredientes…", "carregando"], erro: [mensagemDoErro(e.erro), "erro"] };
  const [txt, cls] = mapa[e.carregamento] || ["", ""];
  s.textContent = txt; s.className = cls ? `status status--${cls}` : "status";
  $("app").hidden = e.carregamento !== "sucesso";
}
function mensagemDoErro(erro) {
  switch (erro && erro.name) {
    case "NetworkError": return "Não foi possível conectar. Verifique sua internet e recarregue.";
    case "HttpError": return `O servidor não conseguiu entregar os dados (status ${erro.status}).`;
    case "SyntaxError": return "Os dados chegaram em um formato inválido.";
    default: return "Algo deu errado ao carregar.";
  }
}

// Guarda quem tem o foco, re-renderiza, devolve o foco (item 1 da auditoria).
export function renderizar(e) {
  const a = document.activeElement;
  const chave = a?.closest?.(".tile")?.dataset.id ? `.tile[data-id="${a.closest(".tile").dataset.id}"]`
    : a?.closest?.(".recipe")?.dataset.rid ? `.recipe[data-rid="${a.closest(".recipe").dataset.rid}"]`
    : a?.dataset?.passo !== undefined ? `.passo__btn[data-passo="${a.dataset.passo}"]`
    : a?.id ? `#${a.id}` : null;
  renderCarregamento(e);
  if (e.carregamento !== "sucesso") return;
  renderChips(e); renderShelf(e); renderMercado(e); renderPot(e); renderResultado(e); renderSugestoes(e); renderNutri(e); renderBook(e); renderFicha(e);
  if (chave) document.querySelector(chave)?.focus({ preventScroll: true });
}

export function popover(e, tile, i) {
  const pop = $("pop");
  pop.replaceChildren();
  const h = el("b", "", `${i.emoji} ${i.nome}`); h.id = "pop-titulo";
  const meta = el("span", "meta", `${rotuloTipo(i.tipo)} · porção: ${i.porcao}`);
  const m = el("div", "m"); [[i.kcal, "kcal"], [i.p, "prot g"], [i.c, "carb g"], [i.g, "gord g"]].forEach(([v, l]) => { const d = el("div"); d.append(el("i", "", String(v).replace(".", ",")), el("small", "", l)); m.append(d); });
  const nota = el("div", "nota"); nota.append(el("span", "", "Sua nota:"), estrelas(e.notas[i.id] || 0, true, i.id));
  const tem = i.id in e.estoque, q = qtdEmCasa(e, i.id), nivel = nivelEstoque(e, i.id);
  // quantidade em casa — sempre visível; digitar ou apertar + já marca "tenho em casa"
  const casa = el("div", "estoque" + (tem ? "" : " fora"));
  casa.append(el("span", "est-lab", tem ? `🏠 Em casa (${i.unidade}):` : `🏠 Quanto tenho em casa? (${i.unidade})`));
  const menos = Object.assign(el("button", "btn sm ghostb", "−"), { type: "button", id: "pop-menos" }); menos.dataset.id = i.id; menos.setAttribute("aria-label", `Tirar uma porção de ${i.nome}`);
  const inp = Object.assign(el("input", "est-qtd"), { type: "number", id: "pop-qtd", min: 0, step: i.unidade === "un" ? 0.5 : 10, placeholder: "0" }); if (tem) inp.value = q; inp.dataset.id = i.id; inp.setAttribute("aria-label", `Quantidade de ${i.nome} em casa`);
  const mais = Object.assign(el("button", "btn sm ghostb", "+"), { type: "button", id: "pop-mais" }); mais.dataset.id = i.id; mais.setAttribute("aria-label", `Adicionar uma porção de ${i.nome}`);
  casa.append(menos, inp, mais);
  if (tem) {
    const fora = Object.assign(el("button", "btn sm ghostb", "tirar da despensa"), { type: "button", id: "pop-despensa" }); fora.dataset.id = i.id; casa.append(fora);
    if (nivel !== "ok") casa.append(el("span", "al " + nivel, nivel === "acabou" ? "⚠️ acabou" : "⚠️ acabando"));
  } else casa.append(el("small", "est-dica", `+ soma ${formatarQtd(i, i.porcaoQtd || 1)} (1 porção). Aviso quando tiver menos de 2 porções.`));
  const dica = el("p", "dica", i.dica || (i.casa ? "Produto cadastrado por você." : ""));
  const usada = el("p", "dica", "Usado em: " + ([...e.receitas, ...e.receitasProprias].filter(r => r.ings.includes(i.id)).map(r => r.emoji).join(" ") || "—"));
  const acts = el("div", "acts");
  pop.append(h, meta, m, nota, casa);
  if (i.casa) { const ex = Object.assign(el("button", "btn ghostb sm", "Excluir produto"), { type: "button", id: "pop-excluir" }); ex.dataset.id = i.id; acts.append(ex); }
  acts.append(Object.assign(el("button", "btn ghostb sm", "Fechar"), { type: "button", id: "pop-fechar" }));
  pop.append(dica, usada, acts);
  const r = tile.getBoundingClientRect(), altura = 400;
  pop.style.left = Math.min(window.innerWidth - 276, Math.max(8, r.left)) + "px";
  pop.style.top = (r.bottom + altura > window.innerHeight ? r.top - altura - 8 : r.bottom + 8) + "px";
  pop.classList.add("show"); pop._origem = tile;
  tile.classList.remove("sizzle"); void tile.offsetWidth; tile.classList.add("sizzle");
  pop.focus({ preventScroll: true });
}
export function fecharPopover() { const pop = $("pop"); if (!pop.classList.contains("show")) return; pop.classList.remove("show"); pop._origem?.focus({ preventScroll: true }); }

let toastTimer;
export function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600); }
export function confete(emojis) { const c = $("confetti"); for (let k = 0; k < 18; k++) { const s = el("span", "", emojis[k % emojis.length]); s.style.left = Math.random() * 100 + "vw"; s.style.animationDelay = Math.random() * .5 + "s"; s.style.fontSize = 18 + Math.random() * 18 + "px"; c.append(s); setTimeout(() => s.remove(), 2300); } }
