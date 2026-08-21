# Design QA — Cruzadinha Tech

## Evidências

- Fonte visual estrutural: `C:\Users\Fernando\AppData\Local\Temp\codex-clipboard-41144ab6-291c-44b5-85c0-6c6965c8f324.png`.
- Captura principal da implementação: `qa-evidence/crossword-game-1366.png`.
- Comparação combinada: `qa-evidence/crossword-comparison-1366.png`.
- Capturas responsivas finais: `qa-evidence/crossword-game-1280x720.png`, `qa-evidence/crossword-game-1024x768.png` e `qa-evidence/crossword-mobile-390x844.png`.
- Estados adicionais: `qa-evidence/crossword-intro-1366.png`, `qa-evidence/crossword-loading-1366.png`, `qa-evidence/crossword-error-1366.png`, `qa-evidence/crossword-correct-1280x720.png` e `qa-evidence/crossword-result-1366.png`.
- Rota: `http://127.0.0.1:4173/#/cruzadinha`.
- Estado principal comparado: grade gerada, primeira definição selecionada, progresso 0/10.
- Viewport CSS principal: 1366 × 768, densidade 1×.
- Fonte: 458 × 581 pixels. Implementação: 1366 × 768 pixels. Comparação combinada: 1921 × 792 pixels.
- Normalização: a fonte é uma folha vertical de baixa resolução e foi usada como referência de composição, não como alvo 1:1. Na comparação combinada, ambas as imagens foram normalizadas para 720 pixels de altura, preservando a proporção. A adaptação horizontal segue a especificação explícita para Chromebooks.

## Comparação final

### Visão completa

A implementação preserva a estrutura essencial da referência: título claro, grade numerada como foco principal e dez definições vinculadas pelos mesmos números. A folha vertical foi adaptada para dois painéis em Chromebook — grade à esquerda e definições à direita — conforme solicitado. A grade possui uma única malha conectada, números nas células iniciais e estados visuais sem depender das ilustrações da folha.

Não há comparação pixel a pixel porque a fonte é uma atividade impressa e a implementação é uma interface interativa responsiva. As diferenças de orientação, navegação, cronômetro, progresso, dicas e controles são requisitos funcionais, não deriva visual.

### Regiões focadas

Não foi necessário um recorte adicional: a fonte tem somente 458 pixels de largura e não oferece detalhes tipográficos suficientes para uma comparação ampliada confiável. A relação crítica entre números, grade e definições permanece legível na comparação combinada; células, cabeçalho, botões e textos foram conferidos nas capturas individuais em resolução nativa.

## Superfícies obrigatórias

- Fontes e tipografia: Fredoka mantém a identidade arredondada dos demais jogos nos títulos e números; Atkinson Hyperlegible melhora a leitura das definições. Hierarquia, pesos, entrelinhas e quebras permanecem legíveis em 1366×768, 1280×720, 1024×768 e 390×844.
- Espaçamento e ritmo: os painéis seguem uma grade consistente, com separação clara entre cabeçalho, tabuleiro, feedback e definições. Não há sobreposição nem overflow horizontal persistente nos quatro tamanhos finais.
- Cores e tokens: azul-marinho, azul, turquesa, âmbar e coral reutilizam a linguagem da Central de Jogos. Verde identifica acertos, coral identifica erros e âmbar identifica dicas, com contraste visual suficiente sobre fundos claros.
- Qualidade de imagem e assets: as ilustrações da folha foram omitidas por requisito. Todos os ícones visíveis usam arquivos Material locais; não há emoji, asset remoto, imagem de baixa resolução nem SVG inline improvisado.
- Cópia e conteúdo: instruções, loading, feedback e resultado usam português claro. As dez definições vêm diretamente do banco compartilhado de 68 conceitos do Ache os Pares, sem TCP, UDP, TCP/IP ou NAT.
- Ícones e controles: voltar, jogar, dica, nova partida, confirmação e resultado usam a mesma família Material, com alinhamento e estados ativo/desabilitado consistentes.
- Acessibilidade e estados: nome obrigatório, labels de células, regiões semânticas, avisos com `role=status`, foco visível, navegação por teclado e `prefers-reduced-motion` foram implementados. Loading, erro, acerto, três dicas, restauração da sessão, senha incorreta, conclusão assistida e resultado foram exercitados no navegador interno.

## Histórico de iterações

### Iteração 1 — bloqueada

- [P2] Em 1024×768, a grade gerada ultrapassava alguns pixels do painel e exibia rolagem horizontal.
  - Causa: o cálculo do tamanho da célula não descontava completamente padding, borda e gaps da malha.
  - Correção: o controlador passou a descontar a área estrutural antes de calcular cada célula.
- [P2] Em 390×844, o padding e o gap da malha ainda produziam uma barra horizontal curta.
  - Correção: o modo móvel usa gap de 1 px e padding de 5 px, preservando todas as letras sem recorte.
- [P2] O bloqueio de cópia alcançava também o formulário de entrada, embora o requisito o limitasse à atividade.
  - Correção: os eventos de cópia, recorte, arraste e menu de contexto agora são bloqueados somente dentro de `.crossword-play-shell`.

### Iteração 2 — aprovada

- Evidência pós-correção em Chromebook: `qa-evidence/crossword-game-1024x768.png`, sem overflow horizontal (`scrollWidth = clientWidth = 547`).
- Evidência pós-correção móvel: `qa-evidence/crossword-mobile-390x844.png`, sem overflow horizontal (`scrollWidth = clientWidth = 315`).
- Nenhuma diferença P0, P1 ou P2 restante.

## Interações verificadas

- Nome válido, loading em três etapas e geração independente em uma segunda aba.
- Resposta incorreta com a mesma quantidade de letras, células editáveis e feedback vermelho.
- Resposta correta pelo fluxo do aluno, progresso 1/10, células verdes e bloqueadas.
- Três dicas, esgotamento absoluto e persistência do contador após atualizar.
- Restauração do aluno, grade, letras, tempo e progresso via `sessionStorage`.
- Cinco cliques no selo Jogo 06, rejeição de senha incorreta e desbloqueio com `PROF2026`.
- Preenchimento escalonado, registro de ajuda do professor e resultado 10/10.
- Layouts 1366×768, 1280×720, 1024×768 e 390×844.
- Suíte automatizada: 29 testes, incluindo 300 sementes determinísticas do gerador.

## Resultado

final result: passed
