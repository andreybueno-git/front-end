# Front-end — trabalhos da disciplina

Repositório único da disciplina. A E1 é o site pessoal na raiz. A partir da E2, o **gerenciador de tarefas** vive numa única pasta que **evolui a cada etapa**: a entrega de cada etapa fica marcada por uma tag, e o histórico de commits conta a passagem de uma para a outra. Cada projeto tem o próprio README com as decisões e o roteiro de verificação.

| Etapa | Pasta | Página publicada |
|---|---|---|
| E1 — site pessoal (HTML semântico + CSS) | `index.html` (raiz) | https://andreybueno-git.github.io/front-end/ |
| E2 — layout responsivo (Flexbox e Grid) | `gerenciador-de-tarefas/` na tag `e2-v1.0.0` | a pasta já evoluiu para a E3; a E2 como foi entregue: `git checkout e2-v1.0.0` |
| E3 — consumo de dados com `fetch` e os quatro estados da tela | `gerenciador-de-tarefas/` na tag `e3-v1.1.1` | a pasta já evoluiu para a E4; a E3 como foi entregue: `git checkout e3-v1.1.1` |
| E4 — estado da interface, busca, filtros e publicação | `gerenciador-de-tarefas/` (a E3 evoluída) | **https://andreybueno-git.github.io/front-end/gerenciador-de-tarefas/** |

A etapa atual (E4) tem **documento único** com o estado da etapa, as decisões do Q4, o roteiro de testes e o **versionamento**: [`gerenciador-de-tarefas/README.md`](gerenciador-de-tarefas/README.md). As versões ficam em *Tags* (`e2-v1.0.0`, `e3-vX.Y.Z`, `e4-vX.Y.Z`).

## Rodar localmente

O gerenciador carrega `dados.json` pela rede, então precisa de um servidor HTTP (abrir por `file://` não funciona):

```bash
python3 -m http.server 8080
```

Depois abrir `http://localhost:8080/gerenciador-de-tarefas/` no navegador.
