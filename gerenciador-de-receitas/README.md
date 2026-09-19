# Cozinha Retrô — gerenciador de receitas

Protótipo do gerenciador de receitas em **HTML, CSS e JavaScript puros** — sem framework, biblioteca, CDN ou API de terceiros. Os dados vêm de `dados.json` no próprio repositório (102 ingredientes e 330 receitas: 59 escritas à mão e 10 lotes escritos em paralelo por agentes de IA, cada um com um tema, validados por script contra o catálogo e deduplicados); o único acesso à rede é o `fetch` desse arquivo. As imagens 3D (estilo *clay*) estão em `assets/` como arquivos do projeto.

Página publicada: https://andreybueno-git.github.io/front-end/gerenciador-de-receitas/

## O que faz

- **Minha despensa**: a prateleira mostra só o que você tem em casa. O **mercado** (catálogo com 102 ingredientes, valores aproximados por porção com base na tabela TACO) fica logo abaixo: clique num alimento, diga a quantidade e ele entra na despensa. Busca e filtro por 14 tipos (carne, frango, peixe e frutos do mar, ovo, laticínio, leguminosa, vegetal, fruta, cereal, massa e farinha, castanhas, doce, tempero e óleo, bebida) valem para os dois. Dez ingredientes têm render 3D (*clay*); os demais usam a "ficha de argila" com emoji.
- **Arraste para a panela** (mouse/caneta) ou **toque** (celular; toque longo abre a ficha). Clique mostra a ficha nutricional e permite **dar nota por estrelas**.
- A panela **descobre a receita** mais próxima ("Quase guacamole — falta: limão") e mostra a **informação nutricional** ao vivo (rosca + barras em % das calorias). Quando fecha uma receita, usa a gramagem dela (ex.: 2 ovos).
- **Quantidade em casa**: o selo 🏠 no canto de cada card mostra o estoque (g, ml ou unidades) e abre o editor (−/+ ou digitar). O livro tem o filtro "com o que tenho em casa", que considera a quantidade que cada receita gasta.
- **Produtos da sua casa**: dentro do mercado, "Cadastrar um produto que não está no mercado" cria um alimento novo (nome, tipo, unidade, porção, quanto tem, macros opcionais). Ele entra na prateleira e nas misturas como qualquer outro; dá para excluir pela ficha.
- **Estoque que baixa e avisa**: 🔥 Cozinhar uma receita completa desconta da despensa o que ela gasta ("Despensa: usou 🥚 2 un, 🧀 30 g") e, quando um item fica com menos de duas porções, ele aparece em vermelho no card e na faixa "⚠️ Despensa" acima da prateleira (região `aria-live`).
- **Gramagem nas receitas**: cada receita mostra quanto usa de cada ingrediente (2 un ≈ 100 g, 30 g, 200 ml) e o peso total aproximado, nos cards do livro, na ficha (com "falta X" quando a despensa não cobre) e no resultado da panela.
- **Salve a mistura como receita própria**: dá um nome, ela entra no livro, na busca e nos filtros ("minhas"), com tags derivadas dos ingredientes (sem glúten / sem lactose).
- **Livro com 330 receitas**: dia a dia brasileiro, regionais (baião de dois, vatapá, feijoada, galinhada, pamonha), fit e marmitas, cozinha do mundo (carbonara, yakisoba, curry, falafel, chili), boteco e churrasco, sopas e ensopados, café da manhã, doces e bebidas, mostradas de 24 em 24 ("ver mais"), com busca por nome ou ingrediente, filtros (doce, salgado, sem glúten, sem lactose, minhas, com o que tenho em casa, dá pra fazer agora) e ficha com passos, gramagem, macros por porção e "colocar tudo na panela".

## Arquitetura

O estado é a fonte; a tela é uma projeção. O estoque é um mapa `estoque[id] = quantidade` na unidade do ingrediente; o nível (ok / baixo / acabou) é derivado na hora de renderizar, nunca guardado. `js/estado.js` guarda o objeto único e as derivações puras (`ingredientesVisiveis`, `despensaVisivel`, `mercadoVisivel`, `receitasVisiveis`, `avaliarPanela`, `macros`, `tagsDe`, `gramagem`, `nivelEstoque`, `alertasEstoque`); `js/tela.js` tem o único ponto de renderização, `renderizar(estado)`; `js/main.js` instala os ouvintes (cada um escreve no estado e chama `atualizar()`) e faz o carregamento com os estados carregando/sucesso/erro; `js/api.js` só obtém dados. Notas, receitas próprias, produtos cadastrados e o estoque da despensa ficam no `localStorage` do navegador (com `try/catch`: se não houver armazenamento, a página funciona igual).

## Rodar localmente

Precisa de HTTP (módulos ES e `fetch`): `python3 -m http.server 8080` na raiz do repositório e abrir `http://localhost:8080/gerenciador-de-receitas/`, ou *Open with Live Server* no VS Code.

## Acessibilidade e responsividade

Foco visível em tudo que é interativo e preservado após cada renderização; teclado completo (Enter coloca/tira, `i` abre a ficha, `Esc` fecha); regiões `role="status"`/`aria-live` para resultado, nutrição e avisos; alvos de toque ≥ 44 px; contraste AA nos textos; sem rolagem horizontal a partir de 320 px; `prefers-reduced-motion` respeitado.
