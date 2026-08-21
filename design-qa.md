# Design QA — ajustes da Cruzadinha Tech

## Evidências

- Fonte visual do problema: `C:\Users\Fernando\AppData\Local\Temp\codex-clipboard-94c898f7-3820-4c1a-a93f-1aba9b0805ab.png`.
- Implementação com a resposta corrigida: `qa-evidence/crossword-processador-1024x768.png`.
- Comparação combinada e detalhe ampliado: `qa-evidence/crossword-adjustment-comparison.png`.
- Layout final em 1366×768: `qa-evidence/crossword-adjusted-1366.png`.
- Layout final em 1024×768: `qa-evidence/crossword-adjusted-1024x768.png`.
- Layout empilhado em 390×844: `qa-evidence/crossword-adjusted-mobile-390x844.png`.
- Rota local: `http://127.0.0.1:4173/#/cruzadinha`.
- Estado principal: palavra Processador respondida corretamente, progresso 1/10 e cinco dicas disponíveis.
- Fonte: 531 × 67 pixels. Implementação principal: 1024 × 768 pixels. Comparação combinada: 1180 × 950 pixels.
- Viewports CSS: 1366×768, 1024×768 e 390×844; densidade 1×.
- Normalização: a fonte é um recorte focado do erro e não um layout completo. A comparação combinada preserva o recorte original em 2× e inclui a captura integral e um detalhe ampliado da palavra corrigida.

## Comparação final

### Visão completa

A resposta que antes aparecia como `PROCESSADORCPU` agora possui exatamente 11 células e exibe somente `PROCESSADOR`. No Chromebook de 1024 px, o painel da grade ocupa 74,3% da área de trabalho; em 1366 px, ocupa 74,4%. O painel de definições permanece fixo à direita, legível e com rolagem independente.

As definições usam frases mais diretas e exemplos cotidianos, sem incluir a resposta completa. O cabeçalho mostra cinco dicas desde o início e bloqueia o controle após a quinta utilização.

### Região focada

O detalhe em `qa-evidence/crossword-adjustment-comparison.png` permite ler célula por célula. A fonte contém 14 células (`PROCESSADORCPU`); a implementação contém 11 células (`PROCESSADOR`) e preserva o mesmo estado verde de acerto. A direção vertical é consequência da geração aleatória e não afeta a correção do termo.

## Superfícies obrigatórias

- Fontes e tipografia: Fredoka e Atkinson Hyperlegible foram preservadas. O painel menor usa peso e entrelinha suficientes para manter as definições legíveis, sem truncamento.
- Espaçamento e ritmo: a grade passou a dominar aproximadamente 75% da largura útil. Em 1024×768 não há overflow da página nem do painel da grade; em telas móveis, palavras muito longas usam rolagem interna controlada sem esconder os controles persistentes.
- Cores e tokens: azul-marinho, azul, turquesa, âmbar, coral e verde continuam seguindo os tokens da Central de Jogos. Estados de dica, seleção e acerto mantêm contraste adequado.
- Qualidade de imagem e assets: nenhuma imagem nova foi necessária. Os controles continuam usando ícones Material locais; não há emoji, asset remoto ou desenho improvisado.
- Cópia e conteúdo: `Processador / CPU` foi reduzido para `Processador` no banco compartilhado, e o gerador também ignora qualquer complemento futuro depois de uma barra. As pistas técnicas foram simplificadas sem revelar literalmente a resposta.
- Acessibilidade e comportamento: células, definições e estados preservam seus nomes acessíveis. O contador inicia em 5, chega a 0 após cinco usos e o botão é desabilitado. A nova chave de sessão impede que grades antigas com `CPU` sejam restauradas.

## Histórico de iterações

### Iteração 1 — bloqueada

- [P1] A resposta composta `PROCESSADORCPU` adicionava uma sigla não solicitada e aumentava indevidamente a palavra para 14 células.
- [P2] O painel da grade ocupava cerca de dois terços da largura, deixando pouco espaço para as células em Chromebooks.
- [P2] O limite de três dicas e parte das definições mantinham a atividade mais difícil do que o desejado.

### Correções aplicadas

- O nome compartilhado foi alterado para `Processador`, e `getCrosswordTerm` mantém somente a parte anterior à barra em futuros rótulos compostos.
- A sessão passou à versão 2 para descartar partidas anteriores incompatíveis.
- As colunas foram ajustadas para aproximadamente 3:1, com refinamento responsivo de 74,3% em 1024 px.
- O limite foi elevado para cinco dicas e as definições mais técnicas foram reescritas em linguagem mais direta.

### Iteração 2 — aprovada

- `PROCESSADOR` validado pelo fluxo real do aluno com 11 células, estado verde e progresso 1/10.
- Largura medida: 74,4% em 1366×768 e 74,3% em 1024×768.
- Sem overflow horizontal da página ou da grade nos dois tamanhos de Chromebook.
- Console local sem erros ou avisos durante geração, acerto e consumo das cinco dicas.
- Nenhuma diferença P0, P1 ou P2 restante.

## Verificações

- 31 testes automatizados aprovados, incluindo 300 sementes determinísticas.
- Resposta composta, banco compartilhado e limite de cinco dicas protegidos por testes de regressão.
- Geração, resposta correta, cinco dicas, painel 75%, 1024×768 e layout móvel exercitados no navegador interno.

## Resultado

final result: passed
