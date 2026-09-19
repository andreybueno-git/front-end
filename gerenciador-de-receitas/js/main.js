// PONTO DE ENTRADA — ciclo único: evento → altera o estado → renderizar(estado).
// Cada ouvinte só escreve no estado e chama atualizar(). Quem desenha é tela.js.
import { carregarDados, lerPreferencias, salvarPreferencias } from "./api.js";
import { estado, porId, avaliarPanela, criterioInicial, LIMITE_LIVRO, norm, precisa, qtdEmCasa, nivelEstoque, alertasEstoque, formatarQtd, progresso, passosFeitos } from "./estado.js";
import { renderizar, popover, fecharPopover, toast, confete, art, el } from "./tela.js";

const $ = id => document.getElementById(id);
function atualizar() { renderizar(estado); }
function persistir() { salvarPreferencias({ notas: estado.notas, receitasProprias: estado.receitasProprias, ingredientesProprios: estado.ingredientesProprios, estoque: estado.estoque, preparo: estado.preparo }); }

// Marca ou desmarca um passo do modo de preparo. Só mexe no estado; quem desenha é a tela.
function marcarPasso(rc, i) {
  const feitos = new Set(passosFeitos(estado, rc.id));
  feitos.has(i) ? feitos.delete(i) : feitos.add(i);
  const lista = [...feitos].sort((a, b) => a - b);
  if (lista.length) estado.preparo[rc.id] = lista; else delete estado.preparo[rc.id];
  persistir(); atualizar();
  const pr = progresso(estado, rc);
  if (pr.completa && feitos.has(i)) { confete([rc.emoji, "🎉", "👏"]); toast(`${rc.emoji} ${rc.nome}: preparo concluído!`); }
  else if (feitos.has(i)) toast(`✓ passo ${i + 1} de ${pr.total}${pr.atual >= 0 ? ` · agora o ${pr.atual + 1}` : ""}`);
  else toast(`passo ${i + 1} desmarcado`);
}

// Cozinhar uma receita completa desconta da despensa o que ela gasta e avisa o que ficou baixo.
function consumir(rc) {
  const ING = porId(estado), usados = [], avisos = [];
  rc.ings.forEach(id => {
    if (!(id in estado.estoque)) return;
    const gasto = precisa(estado, rc, id), antes = qtdEmCasa(estado, id);
    estado.estoque[id] = Math.max(0, +(antes - gasto).toFixed(2));
    usados.push(`${ING[id].emoji} ${formatarQtd(ING[id], Math.min(gasto, antes))}`);
    const n = nivelEstoque(estado, id); if (n !== "ok") avisos.push(`${ING[id].nome} ${n === "acabou" ? "acabou" : "está acabando"}`);
  });
  if (usados.length) toast(`Despensa: usou ${usados.join(", ")}${avisos.length ? " · ⚠️ " + avisos.join(", ") : ""}`);
  persistir();
}

// Toda mudança de estoque passa por aqui: grava, e avisa na hora se o item ficou baixo ou acabou.
function mudarEstoque(id, qtd) {
  const i = porId(estado)[id], antes = nivelEstoque(estado, id);
  estado.estoque[id] = Math.max(0, +(+qtd).toFixed(2));
  const depois = nivelEstoque(estado, id);
  if (antes === "fora") { toast(`🏠 ${i.nome} entrou na despensa: ${formatarQtd(i, estado.estoque[id])}`); fecharPopover(); setTimeout(() => { const t = document.querySelector(`#shelf .tile[data-id="${id}"]`); if (t) { t.scrollIntoView({ behavior: "smooth", block: "nearest" }); t.classList.add("sizzle"); } }, 0); }
  else if (depois !== antes && (depois === "baixo" || depois === "acabou")) toast(depois === "acabou" ? `⚠️ ${i.nome} acabou — anote na lista de compras` : `⚠️ ${i.nome} está acabando: ${formatarQtd(i, estado.estoque[id])}`);
  else if (depois === "ok" && (antes === "baixo" || antes === "acabou")) toast(`✅ ${i.nome} reposto: ${formatarQtd(i, estado.estoque[id])}`);
  persistir();
}
function avisarDespensa() {
  const al = alertasEstoque(estado); if (!al.length) return;
  const ING = porId(estado);
  toast(`⚠️ Despensa: ${al.map(a => `${ING[a.id].nome} ${a.nivel === "acabou" ? "acabou" : "acabando"}`).join(", ")}`);
}

let geracaoMontar = 0; // cancela sequências de "colocar tudo" antigas (item 5 da auditoria)
function adicionar(id) {
  geracaoMontar++;
  const ING = porId(estado);
  if (estado.panela.includes(id)) { toast(`${ING[id].nome} já está na panela`); return; }
  estado.panela.push(id); estado.cozinhando = false; atualizar();
  const av = avaliarPanela(estado);
  if (av.completa) { toast(`${av.r.emoji} ${av.r.nome} — aperte Cozinhar`); } else toast(`+ ${ING[id].emoji} ${ING[id].nome}`);
}
function tirar(id) { geracaoMontar++; estado.panela = estado.panela.filter(x => x !== id); estado.cozinhando = false; atualizar(); }
function montar(rc) {
  const g = ++geracaoMontar; const ING = porId(estado);
  estado.panela = []; estado.cozinhando = false; atualizar();
  $("pot").scrollIntoView({ behavior: "smooth", block: "center" });
  rc.ings.forEach((id, i) => setTimeout(() => {
    if (g !== geracaoMontar) return;
    if (!estado.panela.includes(id)) estado.panela.push(id);
    // não cozinha sozinho: Cozinhar é a ação que gasta a despensa
    if (i === rc.ings.length - 1) toast(`${rc.emoji} Tudo na panela — aperte 🔥 Cozinhar`);
    atualizar();
  }, 300 * (i + 1) + 350));
}

function abrirQuantidade(id) { const t = document.querySelector(`.tile[data-id="${id}"]`); if (!t) return; popover(estado, t, porId(estado)[id]); const q = $("pop-qtd"); if (q) { q.focus(); q.select(); } }

function instalarOuvintes() {
  // ---- busca e filtros (escrevem no estado, chamam atualizar)
  $("busca").addEventListener("input", e => { estado.busca = e.target.value; atualizar(); });
  $("busca-receita").addEventListener("input", e => { estado.buscaReceita = e.target.value; estado.limiteLivro = LIMITE_LIVRO; atualizar(); });
  $("chips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; estado.tipo = b.dataset.tipo; atualizar(); });
  document.querySelectorAll("[data-rf]").forEach(b => b.addEventListener("click", () => { estado.filtroReceita = b.dataset.rf; estado.limiteLivro = LIMITE_LIVRO; atualizar(); }));
  $("filtro-pais").addEventListener("change", e => { estado.pais = e.target.value; estado.limiteLivro = LIMITE_LIVRO; atualizar(); });
  $("limpar-filtros").addEventListener("click", () => { Object.assign(estado, criterioInicial()); atualizar(); });
  document.querySelectorAll("form").forEach(f => f.addEventListener("submit", e => e.preventDefault()));

  // ---- panela
  $("cozinhar").addEventListener("click", () => {
    if (!estado.panela.length) { toast("A panela está vazia"); return; }
    if (estado.cozinhando) { toast("Já está no fogo. Esvazie a panela para cozinhar de novo."); return; }
    const av = avaliarPanela(estado), ING = porId(estado);
    estado.cozinhando = true;
    if (av.completa) { confete(av.r.ings.map(x => ING[x].emoji)); consumir(av.r); atualizar(); }
    else { atualizar(); toast(`🔥 Cozinhando… ${av.faltam.length > 1 ? "faltam" : "falta"} ${av.faltam.length}`); }
  });
  $("limpar").addEventListener("click", () => { geracaoMontar++; estado.panela = []; estado.cozinhando = false; atualizar(); toast("Panela limpa"); });
  $("pot-itens").addEventListener("click", e => { const b = e.target.closest("[data-tirar]"); if (b) tirar(b.dataset.tirar); });

  // ---- sugestões: tudo que a panela alcança
  $("sug-lista").addEventListener("click", e => {
    if (e.target.id === "ver-todas-panela") { estado.filtroReceita = "usa-panela"; estado.buscaReceita = ""; estado.pais = "todos"; estado.limiteLivro = LIMITE_LIVRO; atualizar(); $("livro").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const b = e.target.closest("[data-rid]"); if (!b) return;
    estado.receitaSelecionada = estado.receitaSelecionada === b.dataset.rid ? null : b.dataset.rid;
    atualizar();
    if (estado.receitaSelecionada) $("ficha").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // ---- salvar receita própria a partir da panela
  $("form-receita").addEventListener("submit", e => {
    e.preventDefault();
    const nome = $("nome-receita").value.trim();
    if (nome.length < 2) { toast("Dê um nome para a receita"); $("nome-receita").focus(); return; }
    if (estado.panela.length < 2) { toast("Coloque pelo menos 2 ingredientes"); return; }
    const id = "minha-" + norm(nome).replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
    const sabor = $("sabor-receita").value;
    estado.receitasProprias.push({ id, nome, emoji: $("emoji-receita").value || "🍲", sabor, ings: [...estado.panela], minha: true });
    estado.receitaSelecionada = id; estado.buscaReceita = ""; estado.filtroReceita = "todas";
    $("nome-receita").value = ""; persistir(); atualizar();
    toast(`📖 "${nome}" entrou no livro`); $("ficha").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // ---- livro (delegação: os cards são recriados a cada render)
  $("book").addEventListener("click", e => {
    if (e.target.id === "limpar-pais") { estado.pais = "todos"; estado.limiteLivro = LIMITE_LIVRO; atualizar(); return; }
    if (e.target.id === "ver-mais") { estado.limiteLivro += LIMITE_LIVRO; atualizar(); $("book").querySelectorAll(".recipe")[estado.limiteLivro - LIMITE_LIVRO]?.focus({ preventScroll: false }); return; }
    const b = e.target.closest(".recipe"); if (!b) return; estado.receitaSelecionada = estado.receitaSelecionada === b.dataset.rid ? null : b.dataset.rid; atualizar(); if (estado.receitaSelecionada) $("ficha").scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  $("ficha").addEventListener("click", e => {
    const rc = [...estado.receitas, ...estado.receitasProprias].find(r => r.id === estado.receitaSelecionada); if (!rc) return;
    const passo = e.target.closest("[data-passo]");
    if (passo) { marcarPasso(rc, +passo.dataset.passo); return; }
    if (e.target.id === "reiniciar-preparo") { delete estado.preparo[rc.id]; persistir(); atualizar(); document.querySelector('.passo__btn[data-passo="0"]')?.focus({ preventScroll: true }); toast("Preparo zerado — dá pra começar de novo"); return; }
    if (e.target.id === "montar") montar(rc);
    if (e.target.id === "fechar-ficha") { estado.receitaSelecionada = null; atualizar(); }
    if (e.target.id === "excluir-receita") { estado.receitasProprias = estado.receitasProprias.filter(r => r.id !== rc.id); estado.receitaSelecionada = null; persistir(); atualizar(); toast("Receita excluída"); }
  });
  const limparBusca = () => { estado.busca = ""; estado.tipo = "todos"; atualizar(); $("busca").focus(); };
  $("shelf").addEventListener("click", e => { if (e.target.id === "limpar-busca") limparBusca(); if (e.target.id === "abrir-mercado") { $("mercado").open = true; $("catalogo").scrollIntoView({ behavior: "smooth", block: "start" }); $("catalogo").querySelector(".tile")?.focus({ preventScroll: true }); } });
  // ---- mercado: clicar (ou Enter) num alimento abre o editor de quantidade; ele vai para a despensa
  $("catalogo").addEventListener("click", e => { if (e.target.id === "limpar-busca-mercado") { limparBusca(); return; } const t = e.target.closest(".tile"); if (t) abrirQuantidade(t.dataset.id); });
  $("catalogo").addEventListener("keydown", e => { const t = e.target.closest(".tile"); if (!t) return; if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "i") { e.preventDefault(); abrirQuantidade(t.dataset.id); } });

  // ---- popover: notas por estrelas (delegação dentro do popover)
  const pop = $("pop");
  pop.addEventListener("click", e => {
    const s = e.target.closest(".star[data-nota]");
    if (s) { estado.notas[s.dataset.id] = +s.dataset.nota; persistir(); atualizar(); popover(estado, document.querySelector(`.tile[data-id="${s.dataset.id}"]`) || pop._origem, porId(estado)[s.dataset.id]); toast(`${"★".repeat(+s.dataset.nota)} para ${porId(estado)[s.dataset.id].nome}`); return; }
    const reabrir = id => { if (!pop.classList.contains("show")) return; popover(estado, document.querySelector(`.tile[data-id="${id}"]`) || pop._origem, porId(estado)[id]); };
    if (e.target.id === "pop-despensa") { const id = e.target.dataset.id, i = porId(estado)[id]; if (id in estado.estoque) { delete estado.estoque[id]; fecharPopover(); persistir(); atualizar(); toast(`${i.emoji} ${i.nome} voltou para o mercado`); } else { mudarEstoque(id, (i.porcaoQtd || 1) * 4); atualizar(); reabrir(id); } return; }
    if (e.target.id === "pop-mais" || e.target.id === "pop-menos") { const id = e.target.dataset.id, passo = porId(estado)[id].porcaoQtd || 1;
      if (e.target.id === "pop-menos" && !(id in estado.estoque)) { toast("Aperte + ou digite quanto você tem"); $("pop-qtd")?.focus(); return; }
      mudarEstoque(id, qtdEmCasa(estado, id) + (e.target.id === "pop-mais" ? passo : -passo)); atualizar(); reabrir(id); return; }
    if (e.target.id === "pop-excluir") { const id = e.target.dataset.id; estado.ingredientesProprios = estado.ingredientesProprios.filter(i => i.id !== id); delete estado.estoque[id]; estado.panela = estado.panela.filter(x => x !== id); estado.receitasProprias = estado.receitasProprias.filter(r => !r.ings.includes(id)); delete estado.notas[id]; fecharPopover(); persistir(); atualizar(); toast("Produto excluído"); return; }
    if (e.target.id === "pop-fechar") fecharPopover();
  });

  // ---- cadastrar produto da minha casa
  $("form-produto").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target, nome = f.nome.value.trim();
    if (nome.length < 2) { toast("Dê um nome ao produto"); f.nome.focus(); return; }
    const num = v => Math.max(0, parseFloat(String(v).replace(",", ".")) || 0);
    const id = "casa-" + norm(nome).replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
    const emoji = (f.emoji.value.trim() || "🥫").slice(0, 4);
    const unidade = f.unidade.value, porcaoQtd = num(f.porcaoQtd.value) || (unidade === "un" ? 1 : 100);
    estado.ingredientesProprios.push({ id, nome, emoji, tipo: f.tipo.value, unidade, porcaoQtd, gramas: unidade === "un" ? num(f.gramasUn.value) || 50 : porcaoQtd, porcao: `${porcaoQtd} ${unidade}`, kcal: num(f.kcal.value), p: num(f.p.value), c: num(f.c.value), g: num(f.g.value), gluten: f.gluten.checked, lactose: f.lactose.checked, casa: true, dica: "Produto cadastrado por você." });
    estado.estoque[id] = num(f.qtd.value) || porcaoQtd * 4; estado.busca = ""; estado.tipo = "todos";
    f.reset(); persistir(); atualizar(); toast(`${emoji} ${nome} entrou na despensa`);
    document.querySelector(`.tile[data-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  pop.addEventListener("change", e => { if (e.target.id === "pop-qtd") { const id = e.target.dataset.id, v = parseFloat(String(e.target.value).replace(",", ".")) || 0; if (!v && !(id in estado.estoque)) return; mudarEstoque(id, v); atualizar(); if (pop.classList.contains("show")) { popover(estado, document.querySelector(`.tile[data-id="${id}"]`) || pop._origem, porId(estado)[id]); $("pop-qtd")?.focus(); } } });
  // composedPath: o alvo pode ter sido re-renderizado (e removido do DOM) por um clique dentro do popover
  document.addEventListener("click", e => { const caminho = e.composedPath(); if (!caminho.some(n => n === pop || (n.classList && n.classList.contains("tile")))) fecharPopover(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") fecharPopover(); });

  // ---- prateleira: teclado
  $("shelf").addEventListener("keydown", e => {
    const t = e.target.closest(".tile"); if (!t) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (t.classList.contains("usado")) tirar(t.dataset.id); else adicionar(t.dataset.id); }
    if (e.key.toLowerCase() === "i") popover(estado, t, porId(estado)[t.dataset.id]);
  });

  // ---- tilt 3D (só mouse; item 23: ignora entrar/sair de filhos)
  $("shelf").addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; const t = e.target.closest(".tile"); if (!t || drag.ativo) return; const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; t.style.transform = `rotateY(${x * 24}deg) rotateX(${-y * 24}deg) translateY(-4px)`; });
  $("shelf").addEventListener("pointerout", e => { const t = e.target.closest(".tile"); if (t && !t.contains(e.relatedTarget)) t.style.transform = ""; });

  // ---- arrastar (mouse/caneta) ou tocar (touch) — item 3 da auditoria
  const drag = { ativo: false, id: null, ghost: null, x0: 0, y0: 0, moveu: false };
  const dentroDaPanela = (x, y) => { const p = $("pot").getBoundingClientRect(); return x > p.left - 24 && x < p.right + 24 && y > p.top - 48 && y < p.bottom + 24; };
  const fimDrag = () => { drag.ghost?.remove(); drag.ghost = null; drag.ativo = drag.moveu = false; $("pot").classList.remove("over"); document.body.classList.remove("arrastando"); };
  $("shelf").addEventListener("pointerdown", e => {
    if (e.target.closest("[data-casa]")) return; // o selo de quantidade tem clique próprio
    const t = e.target.closest(".tile"); if (!t || e.button !== 0 || !e.isPrimary) return;
    if (e.pointerType === "touch") { // toque: o click cuida (toca = coloca na panela); toque longo abre a ficha
      clearTimeout(drag.longo); drag.foiLongo = false; const x0 = e.clientX, y0 = e.clientY;
      drag.longo = setTimeout(() => { drag.foiLongo = true; popover(estado, t, porId(estado)[t.dataset.id]); }, 550);
      const cancela = ev => { if (ev.type === "pointermove" && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) return; clearTimeout(drag.longo); t.removeEventListener("pointermove", cancela); t.removeEventListener("pointerup", cancela); t.removeEventListener("pointercancel", cancela); };
      t.addEventListener("pointermove", cancela); t.addEventListener("pointerup", cancela); t.addEventListener("pointercancel", cancela);
      return;
    }
    if (t.classList.contains("usado")) return;
    drag.ativo = true; drag.id = t.dataset.id; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.moveu = false; t.setPointerCapture(e.pointerId);
  });
  $("shelf").addEventListener("click", e => {
    const selo = e.target.closest("[data-casa]"); if (selo) { e.stopPropagation(); abrirQuantidade(selo.dataset.casa); return; }
    const t = e.target.closest(".tile"); if (!t || drag.moveu) return;
    if (drag.foiLongo) { drag.foiLongo = false; return; } // o toque longo já abriu a ficha
    if (matchMedia("(pointer: coarse)").matches) { if (t.classList.contains("usado")) tirar(t.dataset.id); else adicionar(t.dataset.id); }
  });
  $("shelf").addEventListener("contextmenu", e => { const t = e.target.closest(".tile"); if (t && matchMedia("(pointer: coarse)").matches) { e.preventDefault(); popover(estado, t, porId(estado)[t.dataset.id]); } });
  document.addEventListener("pointermove", e => {
    if (!drag.ativo) return; if (!drag.moveu && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    if (!drag.ghost) { drag.moveu = true; drag.ghost = el("div", "ghost"); drag.ghost.append(art(estado, drag.id)); document.body.append(drag.ghost); document.body.classList.add("arrastando"); fecharPopover(); }
    drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px"; $("pot").classList.toggle("over", dentroDaPanela(e.clientX, e.clientY));
  });
  document.addEventListener("pointerup", e => {
    if (!drag.ativo) return;
    const tile = document.querySelector(`.tile[data-id="${drag.id}"]`), moveu = drag.moveu;
    if (moveu) { if (dentroDaPanela(e.clientX, e.clientY)) adicionar(drag.id); else toast("Solte em cima da panela"); }
    else if (tile) popover(estado, tile, porId(estado)[drag.id]);
    fimDrag();
  });
  document.addEventListener("pointercancel", fimDrag); window.addEventListener("blur", fimDrag);
}


// ---- app instalável (PWA) ----------------------------------------------
// O service worker guarda o app no aparelho; o cartão ensina a instalar.
// Tudo aqui falha em silêncio: sem HTTPS, sem suporte ou sem armazenamento,
// a página continua funcionando igual.
const CHAVE_INSTALAR = "cozinha-retro-instalar-fechado";
const jaFechou = () => { try { return localStorage.getItem(CHAVE_INSTALAR) === "1"; } catch { return false; } };
const marcarFechado = () => { try { localStorage.setItem(CHAVE_INSTALAR, "1"); } catch { /* sem armazenamento */ } };
const instalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function registrarSW() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => { /* segue sem offline */ }));
}

function prepararInstalacao() {
  const caixa = $("instalar"); if (!caixa) return;
  const botao = $("instalar-btn"), comoFazer = $("instalar-como");
  let convite = null;
  const mostrar = () => { if (!instalado() && !jaFechou()) caixa.hidden = false; };
  const esconder = () => { caixa.hidden = true; };

  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) mostrar(); // no iPhone não existe botão: a instalação é pelo menu Compartilhar

  addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); convite = e;
    comoFazer.textContent = "Ele vira um ícone na sua tela de início, abre em tela cheia e funciona sem internet.";
    botao.hidden = false; mostrar();
  });

  botao.addEventListener("click", async () => {
    if (!convite) return;
    botao.disabled = true;
    try { await convite.prompt(); const r = await convite.userChoice; if (r.outcome !== "accepted") toast("Sem problema — dá pra instalar depois pelo menu do navegador"); }
    catch { toast("Não deu para abrir a instalação aqui"); }
    finally { convite = null; botao.disabled = false; esconder(); }
  });

  $("instalar-fechar").addEventListener("click", () => { esconder(); marcarFechado(); });
  addEventListener("appinstalled", () => { esconder(); marcarFechado(); toast("🍲 Cozinha Retrô instalada — procure o ícone na tela de início"); });
}

// panela 3D: só troca a panela em CSS quando o render carregou de verdade (senão fica a de reserva)
function ativarRender() {
  const img = $("panela-3d"); if (!img) return;
  const ok = () => { if (img.naturalWidth) $("pot").classList.add("com-render"); };
  if (img.complete) ok(); else img.addEventListener("load", ok, { once: true });
}

async function iniciar() {
  instalarOuvintes(); ativarRender(); registrarSW(); prepararInstalacao();
  estado.carregamento = "carregando"; atualizar();
  try {
    const dados = await carregarDados();
    estado.ingredientes = dados.ingredientes; estado.receitas = dados.receitas;
    const pref = lerPreferencias(); estado.notas = pref.notas || {}; estado.receitasProprias = Array.isArray(pref.receitasProprias) ? pref.receitasProprias : [];
    estado.ingredientesProprios = Array.isArray(pref.ingredientesProprios) ? pref.ingredientesProprios : []; estado.estoque = pref.estoque && typeof pref.estoque === "object" ? pref.estoque : {};
    estado.preparo = pref.preparo && typeof pref.preparo === "object" ? pref.preparo : {};
    estado.carregamento = "sucesso";
  } catch (erro) { console.error(erro); estado.carregamento = "erro"; estado.erro = erro; }
  atualizar();
  if (estado.carregamento === "sucesso") setTimeout(avisarDespensa, 600);
}
iniciar();
