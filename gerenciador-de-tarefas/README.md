# E3 — Consumo de dados com `fetch` e os quatro estados da tela

> **Documento único da etapa.** Tudo sobre a E3 está aqui: o que foi feito, por quê, como testar e o histórico de versões. É um documento vivo: cada mudança no código vira uma linha na seção **Versionamento** (no fim) e uma tag no git.

| Item | Estado |
|---|---|
| Código: quatro estados e três tipos de erro | ✅ pronto e testado no navegador (local e no GitHub Pages) |
| Revisão contra os itens mínimos do enunciado (26 itens) | ✅ 26/26 · correções aplicadas na v1.0.1 |
| Documento único com roteiro de testes | ✅ esta página |
| Versionamento (tags `e3-vX.Y.Z`) | ✅ seção 9 |
| Entrega | 🕗 prazo 08/09 (quarta) ou 09/09 (quinta), 23h59 |

Página publicada: https://andreybueno-git.github.io/front-end/gerenciador-de-tarefas/

---

## 1. O que a etapa faz

Terceira etapa do gerenciador de tarefas acadêmicas. É **a mesma pasta da E2, evoluída** (a E2 como foi entregue está na tag `e2-v1.0.0`). A E3 **troca a origem dos dados**: sai o array escrito em `js/dados.js`, entra o arquivo `dados.json` carregado pela rede com `fetch`. Como a rede pode demorar, falhar ou voltar vazia, a tela passa a ter **quatro estados**: carregando, sucesso, vazio e erro.

## 2. Como abrir

Precisa ser servido por **HTTP**. Abrir o `index.html` direto (`file://`) não funciona: o navegador bloqueia o `fetch` e os módulos ES.

**Opção A — terminal**, na raiz do repositório:

```bash
python3 -m http.server 8080
```

Depois abrir `http://localhost:8080/gerenciador-de-tarefas/`.

**Opção B — VS Code** com a extensão *Live Server*: botão direito em `gerenciador-de-tarefas/index.html` → *Open with Live Server*.

## 3. Estrutura

```
gerenciador-de-tarefas/
├── index.html          região de status vazia + <script type="module" src="js/main.js">
├── styles.css          E2 + estilos dos quatro estados
├── dados.json          { "tarefas": [ ... 9 tarefas ... ] }
├── README.md           este documento
├── testes/
│   ├── dados-vazio.json      { "tarefas": [] }  → estado vazio
│   └── dados-quebrado.json   JSON inválido de propósito → erro de formato
└── js/
    ├── main.js         ponto de entrada: ordem e tratamento de erro
    ├── api.js          OBTER: carregarTarefas() — fetch, response.ok, json. Não toca o DOM.
    ├── estados.js      DESENHAR O ESTADO: renderizarEstado(estado, dados). Não faz requisição.
    ├── renderizacao.js DESENHAR OS DADOS: renderizarTarefas(tarefas). Igual à aula 5.
    └── dados.js        array da aula 5/6. Continua no repositório; não é mais importado.
```

## 4. Os quatro estados

| Estado | Quando | O que aparece na região de status |
|---|---|---|
| carregando | antes do `await`, enquanto a rede responde | "Carregando tarefas…" |
| sucesso | array com itens | os cartões + "N tarefas carregadas." |
| vazio | `tarefas.length === 0` | "Nenhuma tarefa cadastrada ainda. Quando houver, elas aparecem aqui." |
| erro | qualquer exceção no `try` | mensagem diferente por tipo de falha (seção 5) |

A região é o `<p id="status" role="status" aria-live="polite">`, que existe vazio no HTML desde o início e é preenchido por `textContent`.

## 5. Os três tipos de erro

Decididos por `erro.name` em `estados.js`:

| Tipo | Como acontece | `erro.name` | Mensagem na tela |
|---|---|---|---|
| rede | offline, DNS, servidor fora. O `fetch` **rejeita** com `TypeError`; `api.js` captura e dá ao erro um nome próprio. | `NetworkError` | "Não foi possível conectar. Verifique sua internet e tente recarregar a página." |
| protocolo | servidor respondeu 404/500. O `fetch` **resolve**; nós lançamos ao ver `!response.ok`. | `HttpError` | "O servidor não conseguiu entregar as tarefas (status 404). Tente novamente mais tarde." |
| formato | corpo não é JSON válido, ou não tem a chave `tarefas` com um array. | `SyntaxError` | "Os dados chegaram, mas estão em um formato inválido. O arquivo de tarefas precisa ser corrigido." |
| outro (bug no código) | qualquer outra exceção | — | "Algo deu errado ao carregar as tarefas." |

## 6. Decisões (as perguntas do Q3)

- **Por que `fetch` não rejeita em 404?** Para o `fetch`, 404 é uma resposta bem-sucedida: a rede funcionou, o servidor respondeu. Ele só rejeita quando **não há resposta** (rede). Por isso quem diz se o conteúdo presta é o `response.ok` (status 200–299), checado **antes** de ler o corpo; quando falha, lançamos um erro com o status.
- **Por que dois `await`?** O primeiro (`await fetch`) resolve quando os **cabeçalhos** chegam. O segundo (`await resposta.json()`) baixa e interpreta o **corpo**. São dois momentos diferentes da rede, e cada um pode falhar de um jeito.
- **Onde cada erro é tratado?** Rede: capturado em `api.js` e relançado como `NetworkError`. Protocolo: lançado em `api.js` (`HttpError`) ao ver `!response.ok`. Formato: `resposta.json()` rejeita com `SyntaxError`, ou `api.js` lança um ao ver a forma errada. **Todos** caem no único `catch` de `main.js`, que entrega o erro a `estados.js`; lá o texto é escolhido por `erro.name`.
- **Por que o vazio não está no `catch`?** Lista vazia é uma resposta **válida**: o servidor respondeu, o JSON é bom, só não há tarefas. Tratar isso como falha seria mentir. Ela é detectada no caminho de sucesso, por `length === 0`.
- **Por que a região de status precisa existir antes?** O leitor de tela só anuncia mudanças em regiões `aria-live` que **já estavam** na árvore de acessibilidade. Se fosse criada só na hora, nada seria anunciado. Pelo mesmo motivo o CSS não usa `display: none` na região vazia (isso a tiraria da árvore); só remove a caixa.
- **Carregando antes do `await`.** Se viesse depois, a tela ficaria em branco durante toda a espera.
- **`textContent`, nunca `innerHTML`.** Todo texto, inclusive o que vem do JSON, entra como texto. Nada é interpretado como HTML.
- **`renderizacao.js` não mudou.** Ele recebe um array e desenha; não sabe de onde o array veio. Trocar a origem não exigiu tocar nele: esse é o acoplamento resolvido.
- **Erro de rede com nome próprio.** O `fetch` rejeita com um `TypeError` genérico. Se a tela confiasse só nesse nome, um `TypeError` causado por bug no código seria apresentado como "sua internet caiu". Por isso `api.js` relança como `NetworkError`, e o resto cai no texto genérico.
- **Estado de erro zera o quadro.** Antes da mensagem, `renderizarTarefas([])` deixa contadores e colunas coerentes com o que a tela diz.
- **Sem `await` de nível superior.** A inicialização acontece dentro de `iniciar()`.

## 7. Fora do escopo desta entrega

Conforme o enunciado: API pública externa (segunda metade do semestre), busca e filtros operando (os controles continuam na tela, sem operar), cadastro/edição/exclusão, estado centralizado (aula 7), botão de tentar novamente (bem-vindo, não exigido) e qualquer biblioteca ou framework.

## 8. Roteiro de testes

Os testes 2, 3 e 5 trocam o caminho **nesta linha** de `js/api.js`, salvam e recarregam a página:

```js
resposta = await fetch('dados.json');
```

| # | Teste | Como fazer | Resultado esperado |
|---|---|---|---|
| 1 | Carregando | DevTools → *Network* → throttling **Slow 4G** → recarregar | "Carregando tarefas…" aparece **antes** dos cartões |
| 2 | Vazio | trocar por `'testes/dados-vazio.json'` | mensagem de vazio, 0 cartões, contadores em 0, **sem** a palavra "erro" |
| 3 | 404 (protocolo) | trocar por `'nao-existe.json'` | mensagem com **status 404** |
| 4 | Offline (rede) | DevTools → *Network* → **Offline** → recarregar | mensagem de rede, **diferente** da do 404 |
| 5 | JSON quebrado (formato) | trocar por `'testes/dados-quebrado.json'` | mensagem de formato, não de rede |
| 6 | Região viva | DevTools → *Elements*, antes de qualquer interação | `#status` existe, está vazio, e a regra `.status:empty` **não** usa `display: none` |
| 7 | Acoplamento | abrir `js/renderizacao.js` | não há `fetch` nem qualquer referência à origem dos dados |

Ao terminar: voltar o caminho para `'dados.json'` e o throttling para *No throttling*. No caminho de sucesso o console fica limpo; nos de erro, o `console.error` é proposital (o objeto do erro vai para o console **além** da mensagem na tela).

## 9. Versionamento

Toda mudança nesta etapa vira **uma linha nesta tabela** e **uma tag anotada no git** no formato `e3-vMAIOR.MENOR.CORREÇÃO`:

- **MAIOR** sobe quando a etapa fica completa ou quando o comportamento pedido pelo enunciado muda;
- **MENOR** sobe quando entra algo novo que não quebra o que existia (documentação, arquivos de teste);
- **CORREÇÃO** sobe quando é só conserto.

| Versão | Data | Commit | O que mudou | Estado |
|---|---|---|---|---|
| e3-v0.1.0 | 03/09/2026 | `5ce46cb` | Base das aulas 5 e 6: `dados.js` e `renderizacao.js` desenhando a partir de um array | ✅ |
| e3-v0.2.0 | 03/09/2026 | `c5b1f18` | `dados.json` com 9 tarefas e `carregarTarefas()` com `fetch`, `response.ok` e `resposta.json()` | ✅ |
| e3-v1.0.0 | 03/09/2026 | `735f4d6` | **Primeira versão completa**: quatro estados, região de status, `main.js` com carregando antes do `await` e vazio fora do `catch` | ✅ |
| e3-v1.0.1 | 03/09/2026 | `efb6cc7` | Correções da revisão: região vazia sem `display:none`, `NetworkError`, quadro zerado no erro, texto do erro HTTP, rádio `concluidas` | ✅ |
| e3-v1.1.0 | 03/09/2026 | `51da3d7` | Documento único, arquivos de teste em `testes/`, esta seção de versionamento e as tags | ✅ |
| e3-v1.1.1 | 03/09/2026 | tag `e3-v1.1.1` | Reorganização: a E3 passa a viver na **pasta da E2** (`gerenciador-de-tarefas/`), com o histórico reescrito para cada commit alterar os arquivos da E2 no lugar; a tag `e2-v1.0.0` marca a E2 como foi entregue | ✅ **atual** |

Como ver o histórico:

```bash
git log --oneline -- gerenciador-de-tarefas   # os commits desta pasta (E2 e E3)
git tag -n -l 'e*-v*'                          # as versões (E2 e E3), com a descrição de cada tag
git checkout e2-v1.0.0                         # ver a pasta como era na entrega da E2 (volte com: git checkout main)
```

No GitHub: aba **Commits** para a linha do tempo e **Tags** para as versões.

Próximas etapas (E4…) terão a própria numeração (`e4-v…`); esta continua em `e3-v1.x` só se houver conserto ou melhoria pedida na correção.
