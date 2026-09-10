# E4 — Estado da interface, busca, filtros e publicação

> **Documento único da etapa.** O que foi feito, por quê, como testar e o histórico de versões. A E3 continua documentada na seção 10 e na tag `e3-v1.1.1`.

| Item | Estado |
|---|---|
| Estado único + derivação pura + ciclo evento → estado → renderização | ✅ |
| Busca, status, prioridade, ordenação por prazo e "Limpar filtros" operando em conjunto | ✅ |
| Quatro mensagens distintas: carregando, erro, origem vazia, resultado vazio | ✅ |
| Botão de cartão com evento delegado (sobrevive à re-renderização) | ✅ |
| Roteiro de testes do enunciado (8 testes) | ✅ seção 8 |
| Publicação no GitHub Pages | ✅ URL abaixo |
| Versionamento (`e4-vX.Y.Z`) | ✅ seção 9 |

**Página publicada:** https://andreybueno-git.github.io/front-end/gerenciador-de-tarefas/

---

## 1. O que a etapa faz

Quarta etapa do gerenciador de tarefas. Parte da E3 (dados por `fetch`, quatro estados de carregamento) e faz os controles **operarem de verdade**: busca por título, filtro por status, filtro por prioridade, ordenação por prazo e "Limpar filtros".

A regra central: **o estado é a fonte; a tela é uma projeção.** Existe um único objeto de estado. Todo evento altera esse objeto e chama o mesmo ponto de renderização. Cartões, contagem, mensagem e controles são recalculados a partir dele — por isso nunca discordam entre si.

## 2. Como abrir

Precisa de HTTP (o `fetch` e os módulos ES não funcionam em `file://`). Na raiz do repositório:

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080/gerenciador-de-tarefas/`. Ou, no VS Code, *Open with Live Server* em `gerenciador-de-tarefas/index.html`.

## 3. Estrutura

```
gerenciador-de-tarefas/
├── index.html          controles (busca, status, prioridade, ordenação, limpar) + região de status
├── styles.css          E2 + E3 + estilos dos novos controles e dos detalhes do cartão
├── dados.json          { "tarefas": [ ... 9 tarefas ... ] }
├── testes/             dados-vazio.json e dados-quebrado.json (E3)
└── js/
    ├── main.js         ponto de entrada: ouvintes + atualizar() — o ciclo único
    ├── estado.js       NOVO: o objeto de estado e derivarVisiveis(estado)
    ├── tela.js         NOVO (era estados.js): renderizar(estado) — o único ponto de renderização
    ├── api.js          carregarTarefas() — só obtém. Não lê controles, não toca o DOM. Igual à E3.
    ├── renderizacao.js renderizarTarefas(array) — desenha o que recebe. Ganhou o botão "Detalhes".
    └── dados.js        array da aula 5. Não é importado (registro histórico).
```

## 4. O estado

```js
export const estado = {
  tarefas: [],             // o array como veio de carregarTarefas(). NUNCA reordenado ou reduzido.
  busca: '',               // texto do campo de busca
  status: 'todos',         // 'todos' | 'a-fazer' | 'em-andamento' | 'em-revisao' | 'concluidas'
  prioridade: 'todas',     // 'todas' | 'baixa' | 'media' | 'alta'
  ordenacao: 'original',   // 'original' | 'prazo-asc' | 'prazo-desc'
  carregamento: 'inicial', // 'inicial' | 'carregando' | 'sucesso' | 'erro'
  erro: null               // o Error, quando carregamento === 'erro'
};
```

Não existe `tarefasFiltradas` no estado. A lista visível é **derivada** a cada ciclo por `derivarVisiveis(estado)` e descartada depois.

## 5. O ciclo

```
evento (input / change / click)
  → ouvinte escreve no estado          (main.js)
  → atualizar()  =  renderizar(estado) (tela.js)
       1. visiveis = derivarVisiveis(estado)   (estado.js — pura, sem DOM)
       2. renderizarTarefas(visiveis)          (renderizacao.js — replaceChildren)
       3. contagem "N de M" + mensagem na região aria-live
       4. controles sincronizados a partir do estado
```

Cada ouvinte faz só duas coisas: escreve no estado e chama `atualizar()`. Nenhum ouvinte filtra, esconde cartão, lê outro controle ou toca o DOM.

## 6. Decisões (as perguntas do Q4)

- **Por que a lista filtrada não é guardada no estado?** Guardá-la criaria uma **segunda fonte de verdade**. No momento em que um filtro muda e alguém esquece de recalcular a lista guardada, tela e estado discordam. Derivando a cada ciclo, a lista está sempre certa por construção: ela é uma função dos critérios atuais, e só.

- **Por que `sort()` pode alterar o array original?** `Array.prototype.sort()` ordena **no próprio array** (in place) e o devolve — não cria cópia. `estado.tarefas.sort(...)` destruiria a ordem original para sempre, e "Ordem original" deixaria de existir. Por isso a derivação ordena uma **cópia**: `[...visiveis].sort(...)`. (O `filter()` já devolve array novo; o spread é a garantia explícita.)

- **A sequência evento → estado → derivação → renderização.** O evento não desenha nada: ele só muda dados. Quem desenha é sempre a mesma função, lendo sempre o mesmo objeto. Por isso mudar os controles em ordens diferentes dá o mesmo resultado: o que importa é o valor atual do estado, não o histórico de cliques.

- **Por que zero resultados não é erro?** Erro é quando a **obtenção** falhou (rede, 404, JSON inválido) — isso cai no `catch` de `iniciar()`. Zero resultados é a obtenção tendo funcionado e os **critérios** não encontrando nada — decidido por `visiveis.length === 0` dentro de `renderizar()`, no caminho de sucesso. São coisas diferentes e a tela diz coisas diferentes: "Nenhuma das 9 tarefas corresponde… Altere os critérios ou use Limpar filtros" vs. "O servidor não conseguiu entregar (status 404)". Há ainda a **origem vazia** (`estado.tarefas.length === 0`): dados válidos, só não há tarefas — terceira mensagem.

- **Por que local funciona e a URL publicada dá 404?** Três causas típicas: (1) **caminho absoluto** (`/js/main.js`) — local resolve para a raiz do servidor, mas no Pages a raiz é `usuario.github.io/`, e o projeto vive em `/front-end/`; por isso tudo aqui é **relativo** (`js/main.js`, `dados.json`, `styles.css`). (2) **Maiúsculas/minúsculas** — Windows e macOS ignoram, o servidor do Pages (Linux) não: `Styles.css` ≠ `styles.css`. (3) **Pasta/branch errada** nas configurações do Pages, ou o arquivo não commitado (funciona local porque está no disco, não no repositório).

- **Por que delegação no `.quadro` e não ouvinte por cartão?** `replaceChildren` **substitui** os cartões a cada render. Um ouvinte preso a um cartão morre com ele (clique não faz nada). Reinstalar a cada render acumula ouvintes (clique dispara N vezes). Um ouvinte no ancestral, instalado uma vez, resolve os dois: `evento.target.closest('button[data-acao="detalhes"]')`.

- **Por que o `renderizar()` só escreve nos controles quando o valor difere?** Reatribuir `input.value` durante a digitação mexe no cursor. Comparar antes de escrever mantém a sincronização (necessária para "Limpar filtros") sem atrapalhar quem digita.

- **Por que "Limpar filtros" é `type="button"` e não `type="reset"`?** `reset` limparia só os controles; o estado continuaria com os filtros antigos — duas fontes de verdade. O botão restaura o **estado** (`Object.assign(estado, criterioInicial())`) e a renderização restaura os controles a partir dele.

- **Busca ignora caixa e acentos.** `normalize('NFD')` + remoção dos diacríticos + `toLowerCase()`, aplicado ao termo e ao título: "funcoes" encontra "funções".

- **Foco.** Nada em `renderizar()` chama `focus()`; a região `#status` é atualizada por `textContent`. O teclado fica onde estava.

## 7. Fora do escopo (conforme enunciado)

Frameworks, bundler, API externa, cadastro/edição/exclusão, persistência, paginação, drag-and-drop, Redux/reducer/store. O desafio opcional (`URLSearchParams`) não foi feito.

## 8. Roteiro de testes

Todos executados na versão local e na publicada. Para inspecionar o estado no console: `const { estado } = await import('./js/estado.js')`.

| # | Teste | Como fazer | Esperado |
|---|---|---|---|
| 1 | Fonte original | `estado.tarefas.map(t => t.id)` antes e depois de filtrar e ordenar | `[1..9]` nas duas vezes |
| 2 | Combinados | busca "re" + A fazer + Média; limpar; Média + "re" + A fazer | mesmo cartão nas duas ordens |
| 3 | Limpar | ativar tudo → Limpar filtros | campos iniciais, 9 cartões, "9 de 9" |
| 4 | Resultado vazio | busca "zzz" | mensagem orienta a limpar; sem "erro"; console limpo |
| 5 | Re-render | trocar status 10× → Detalhes | abre uma vez; Ocultar fecha |
| 6 | Teclado | Tab, digitar, setas nos rádios, Enter em Limpar | foco visível, não pula, Enter na busca não recarrega |
| 7 | URL pública | janela anônima, Network | 200 em `dados.json`, `styles.css`, `js/*.js`; console limpo |
| 8 | Largura | 320px → largo | sem rolagem horizontal |
| 9 | Origem vazia | trocar `fetch('dados.json')` por `testes/dados-vazio.json` | "Nenhuma tarefa cadastrada ainda…" |
| 10 | Erro | trocar por `nao-existe.json` | "…status 404" |

## 9. Versionamento

| Versão | Data | O que mudou | Estado |
|---|---|---|---|
| e4-v0.1.0 | 10/09/2026 | `estado.js`: objeto único e `derivarVisiveis()` | ✅ |
| e4-v0.2.0 | 10/09/2026 | `tela.js` (ex-`estados.js`) e `main.js`: ciclo único, ouvintes, delegação | ✅ |
| e4-v0.3.0 | 10/09/2026 | HTML/CSS: ordenação, "Limpar filtros", botão "Detalhes" no cartão | ✅ |
| e4-v1.0.0 | 10/09/2026 | **Primeira versão completa**: testes do enunciado passando, documento único | ✅ **atual** |

```bash
git tag -n -l 'e4-v*'
git checkout e3-v1.1.1   # ver a E3 como foi entregue (volte com: git checkout main)
```

## 10. Histórico da E3 (resumo)

Consumo de `dados.json` com `fetch`, `response.ok` e `resposta.json()`; quatro estados (carregando, sucesso, vazio, erro) e três tipos de erro (`NetworkError`, `HttpError`, `SyntaxError`) decididos por `erro.name`. Região `#status` com `role="status"` e `aria-live="polite"` presente no HTML desde o início. Tudo isso **continua valendo** na E4: `api.js` não mudou; as mensagens de erro migraram de `estados.js` para `tela.js`. Documento completo da E3: tag `e3-v1.1.1`.
