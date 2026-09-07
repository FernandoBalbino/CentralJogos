# Design QA — Descubra o Windows

## Evidências

- Verdade visual: `qa-evidence/descubra-windows-reference.png`.
- Aula final em 1366 × 768: `qa-evidence/windows-discovery-start-1366x768-final.jpg`.
- Comparação combinada: `qa-evidence/windows-discovery-comparison-final.png`.
- Caça-palavras em 1366 × 768: `qa-evidence/windows-discovery-wordsearch-1366-final.jpg`.
- Aula e caça-palavras em 1280 × 720: `qa-evidence/windows-discovery-quiz-1280x720-final.jpg` e `qa-evidence/windows-discovery-wordsearch-1280x720-final.jpg`.
- Problema responsivo informado: `qa-evidence/windows-discovery-responsive-issue-reference.png`.
- Comparação responsiva antes/depois: `qa-evidence/windows-discovery-responsive-comparison-final.png`.
- Estado final com 13 termos visíveis e uma surpresa revelada: `qa-evidence/windows-discovery-wordsearch-surprises-1366-final.jpg`.
- Rota local verificada: `http://127.0.0.1:4179/#/descubra-windows`.

## Comparação com a Opção 1

A captura combinada coloca a referência e a implementação na mesma proporção 16:9. A implementação preserva a hierarquia escolhida: cabeçalho azul-marinho, vídeo dominante à esquerda, pergunta e quatro alternativas à direita, turquesa e coral nos controles e tipografia de leitura à distância. O estado comparado usa a demonstração do Menu Iniciar nos dois lados.

As diferenças intencionais são de produto: a implementação exibe a descrição textual dentro do rodapé do vídeo para garantir fallback acessível e usa a numeração pedagógica real da aula. Não restaram diferenças P0, P1 ou P2 após a revisão visual.

## Superfícies obrigatórias

- Tipografia e contraste: Fredoka e Atkinson Hyperlegible são locais; títulos, alternativas, instruções e letras da grade permanecem legíveis nos dois viewports.
- Layout: a aula e a grade ocupam exatamente a viewport, sem rolagem da página ou overflow. Em 1280 × 720 a lista de termos usa rolagem interna, mantendo grade, seleção e ações sempre visíveis.
- Assets: 30 vídeos WebM VP9 de 960 × 540, cinco pôsteres e cenas limpas foram produzidos localmente. O pacote de vídeos soma 1.769.232 bytes.
- Conteúdo: as 30 lições seguem o currículo solicitado, com quatro alternativas, uma resposta correta, explicação, repetição e fallback textual.
- Acessibilidade: botões e células têm nomes acessíveis, foco visível e mensagens de estado; movimento reduzido libera o conteúdo por texto.
- Integração: o Jogo 08 permanece disponível e o Jogo 09 usa a rota `#/descubra-windows` com `mount`, `enter` e `leave`.

## Iterações

### Passagem 1

- [P2] Um título visualmente oculto ainda ocupava espaço sobre o vídeo.
- [P2] A vigésima linha da grade ficava parcialmente fora do cartão em 1366 × 768.

### Correções

- A classe de texto somente para leitores de tela passou a remover o título do fluxo visual.
- A dimensão da grade passou a considerar a altura disponível da viewport. A medição final foi 556 px em 1366 × 768 e 508 px em 1280 × 720, sempre dentro do painel.

### Passagem 2 — feedback e botão responsivos

- [P1] Depois da resposta, o cartão de feedback aumentava o painel direito e deixava **Próxima aula** abaixo da área útil quando as barras do navegador e do Windows estavam visíveis.
- O estado pós-resposta agora reduz apenas o espaçamento das alternativas e organiza explicação e botão lado a lado. As alternativas permanecem grandes antes da resposta.
- Na captura original de 1900 × 943, o botão terminava em `y = 956`, fora da viewport. Depois da correção, termina em `y = 801` em 1900 × 943, `y = 689` em 1366 × 768 e `y = 661` em 1280 × 720.
- As três superfícies mantiveram `scrollWidth = clientWidth` e `scrollHeight = clientHeight`; o avanço real para a aula 3 foi confirmado sem erros no console.

### Passagem 3 — palavras-surpresa

- A grade continua contendo 15 termos, mas somente 13 aparecem na lista lateral.
- O painel avisa que existem duas palavras-surpresa escondidas. Ao encontrar uma delas, o nome é revelado e o progresso continua contando para 15/15.
- Uma rodada real confirmou exatamente 13 itens listados, duas surpresas não listadas e a descoberta de `Downloads` como palavra-surpresa.

## Verificações funcionais

- 30 aulas percorridas no navegador com vídeo, quatro alternativas, correção e avanço.
- Desbloqueio do caça-palavras somente depois da aula 30.
- Seleção inválida, direção constante, desfazer, limpar, acerto, 15/15, restauração e nova grade exercitados no navegador.
- Nova aba aberta com o servidor desligado carregou a aplicação, restaurou a aula, reproduziu o vídeo e terminou o preparo em 93/93 arquivos, sem mensagens no console.
- 61 testes automatizados aprovados, incluindo 200 sementes do gerador e validação de 30 vídeos locais.
- 30/30 vídeos e 5/5 pôsteres responderam HTTP 200; vídeos com `Content-Type: video/webm`.
- Sintaxe dos módulos e do service worker validada; `git diff --check` sem erros.

## QA do simulador Google Apresentações

- Captura de referência: `C:/Users/fernando/AppData/Local/Temp/codex-clipboard-48619301-bd49-42dc-82e0-1de341ff1b28.png`.
- Implementação: rota local `#/google-apresentacoes`, capturada no Chrome em viewport amplo durante a validação desta versão.
- A comparação visual foi feita com a captura de referência e a tela da implementação no mesmo passe de revisão. A aula 10 exibe `− 24 +` e chega a 28 com quatro cliques em `+`.
- Menus e submenus de imagem, formas, linha, texto, tamanho, alinhamento e layout foram verificados; foco, teclado, entrada real, seleção real e comentário também.
- Os ícones são locais (Material Symbols e favicon oficial), sem CDN; a PWA usa `central-jogos-offline-v15`.

## QA do simulador Google Planilhas

Data: 2026-09-07

### Comparison input

- Referência fornecida: `C:\Users\Pichau\AppData\Local\Temp\codex-clipboard-1d655fb8-c53d-43ec-8265-ac18143eda88.png` (Google Planilhas em português, estado inicial com A1 selecionada).
- Protótipo verificado no navegador integrado: `http://127.0.0.1:4174/#/google-planilhas`, captura CUA da aba 3, com a prévia e a primeira missão no mesmo estado inicial. A comparação foi feita lado a lado, normalizando o recorte do simulador para a moldura da referência.

### Superfícies verificadas

- Barras do aplicativo, cabeçalho “Planilha sem título”, menus em português, toolbar, caixa de nome, `fx`, barra de fórmulas e grade com cabeçalhos A–N/1–14.
- Célula A1 selecionada com borda azul e alça, cores cinza do Sheets, logo verde e tipografia Roboto local.
- Rolagem horizontal independente da toolbar e da grade; menus e submenu reposicionados dentro do espaço disponível.
- Fluxo da aula: aviso destacado “Para começar esta aula, clique em Reproduzir.”, controles visíveis, painel `Assista → Responda → Faça`, foco e teclado.
- Layout responsivo: `min-width: 0`, empilhamento até 1100 px, rolagem vertical em viewport baixo e sem overflow horizontal do documento.
- Tela cheia com fallback, diálogo de senha do professor, mensagens de erro e desbloqueio somente em memória.

### Evidências funcionais

- `node --test tests/*.mjs`: 80 testes aprovados, 0 falhas.
- `node --check`: módulos da trilha, `js/app.js` e `service-worker.js` sem erros de sintaxe.
- Console do navegador integrado: sem erros.
- Viewport observado: 1920×1080; `document.documentElement.scrollWidth === clientWidth` e `body.scrollWidth === body.clientWidth` (1920 px) durante a primeira missão.
- Recursos locais e `service-worker.js` responderam HTTP 200 no servidor local; cache `central-jogos-offline-v17` confirmado.
- Senha incorreta mantém o painel fechado e mostra “Senha incorreta.”; `vinho123` abre as ferramentas; recarregar fecha o desbloqueio.

### Ajustes finais

- Rótulos de Reproduzir/Repetir receberam uma camada de texto explícita para permanecerem legíveis em telas estreitas.
- Badge da prévia foi elevado acima do simulador para não ser recortado.
- O portal foi atualizado para 11 jogos e o card “Google Planilhas na Prática” foi integrado à rota `#/google-planilhas`.

### Correção visual e cursor — 2026-09-07

- Referência do problema: `C:\Users\Pichau\AppData\Local\Temp\codex-clipboard-fbf38636-e394-4728-a94e-c56395529778.png`, na qual as alternativas apareciam como botões nativos sem o acabamento da trilha Google Apresentações.
- Causa visual corrigida: a etapa de pergunta passou a usar `gsc-answer-list`, `gsc-question`, `gsc-feedback` e `gsc-practice-hint`, exatamente as classes consolidadas no curso Google Apresentações. As alternativas voltaram a ter cartões de 52 px, letra em bloco, borda de 2 px, raio de 10 px, estados de foco, erro e acerto.
- A reprodução agora usa o cursor local `assets/windows-discovery/cursor.png`. O ponteiro se desloca até o alvo, produz indicação de clique e permanece sincronizado com destaque, abertura de menu, abertura de submenu e seleção.
- A aula 26, “Formatar valores como moeda”, foi reproduzida no navegador integrado em 1280 × 720. O menu Formatar e o submenu Formatos numéricos permaneceram visíveis ao mesmo tempo, com o cursor sobre “Número”, sem overflow horizontal do documento.
- A pergunta da aula 1 foi verificada em 1936 × 1048 com quatro alternativas em grade, raio de 10 px, ausência das classes antigas e ausência do cursor fora da etapa Assista. `document` e `body` mantiveram overflow horizontal igual a zero.
- O Modo Professor também foi alinhado à estrutura visual do Google Apresentações: `gsc-modal-backdrop` + `gsc-teacher-panel`, altura máxima de 90 vh e rolagem interna. A medição foi 648 px de altura útil para 3025 px de conteúdo, com as 30 prévias alcançáveis.
- O atalho de texto duplicado aplicado anteriormente aos controles foi removido; Reproduzir, Pausar e Repetir agora usam a mesma marcação de ícone + rótulo da trilha Google Apresentações.
- Sintaxe dos módulos e do Service Worker aprovada; `node --test tests/*.mjs`: 80 testes aprovados, 0 falhas. Cache offline atualizado para `central-jogos-offline-v18` com o cursor incluído no precache.

### Auditoria das interações das 30 missões — 2026-09-07

- Missões 1–7, reconhecimento e seleção: cada clique agora produz realce persistente, mensagem textual da ação e resumo da célula, linha ou coluna ativa.
- Missões 8–11 e 28–30, digitação, edição e fórmulas: um clique abre o editor dentro da célula com caret azul visível; digitar e pressionar Enter confirma a ação, devolve o foco à célula e mostra o resultado calculado quando houver fórmula.
- Missão 12, navegação: a célula mantém o foco depois de cada renderização e a lista de passos confirma separadamente seta, Tab e Enter.
- Missões 13–16, seleções: linha, coluna, intervalo e células separadas recebem preenchimento e contorno azul mais fortes. Na missão 16, A1 e C3 permanecem marcadas, os cabeçalhos correspondentes são realçados e o rodapé confirma `2 células · A1 + C3`.
- Missões 17–18, área de transferência: a origem copiada ou recortada recebe contorno verde tracejado; a lista de passos diferencia origem e destino.
- Missões 19–27, formatação e estrutura: botões aplicados ficam ativos, a grade reflete imediatamente estilo, cor, preenchimento, alinhamento, bordas, inserções e formatos numéricos; ações compostas têm checklist próprio.
- As 27 categorias de ação aceitas pelo simulador possuem feedback visual e textual. As 30 missões continuam com instrução específica e validação determinística.
- No navegador integrado, a missão 8 foi concluída clicando A1 uma única vez, digitando `Aluno` e pressionando Enter; não houve clique sustentado. A missão 16 foi concluída com Ctrl+clique em C3, exibindo A1 e C3 simultaneamente, checklist 2/2, foco acessível em C3 e zero overflow horizontal.
- A grade deixou de expor células como botões pressionáveis/checkboxes para leitores de tela. Cada célula agora informa endereço, seleção e estado ativo pelo nome acessível; `aria-pressed` permanece apenas nos controles de formatação apropriados.
- A troca de prévias do Modo Professor limpa legenda, menus, editor e cursor da missão anterior. O cache foi elevado para `central-jogos-offline-v20` e os arquivos da trilha receberam novas versões de URL.

## Resultado

final result: passed
