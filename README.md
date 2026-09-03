# Front-end — trabalhos da disciplina

Repositório único da disciplina. Cada etapa fica numa pasta e tem o próprio README com as decisões e o roteiro de verificação.

| Etapa | Pasta | Página publicada |
|---|---|---|
| E1 — site pessoal (HTML semântico + CSS) | `index.html` (raiz) | https://andreybueno-git.github.io/front-end/ |
| E2 — layout responsivo (Flexbox e Grid) | `e2-layout-responsivo/` | https://andreybueno-git.github.io/front-end/e2-layout-responsivo/ |
| E3 — consumo de dados com `fetch` e os quatro estados da tela | `e3-fetch/` | https://andreybueno-git.github.io/front-end/e3-fetch/ |

A E3 tem **documento único** com o estado da etapa, as decisões do Q3, o roteiro de testes e o **versionamento**: [`e3-fetch/README.md`](e3-fetch/README.md). As versões ficam em *Tags* (`e3-vX.Y.Z`).

## Rodar localmente

A E3 carrega `dados.json` pela rede, então precisa de um servidor HTTP (abrir por `file://` não funciona):

```bash
python3 -m http.server 8080
```

Depois abrir `http://localhost:8080/e3-fetch/` no navegador.
