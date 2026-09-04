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

## Resultado

final result: passed
