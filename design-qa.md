# Design QA — Escolha seu lado

## Evidências

- Fonte visual: `C:\Users\Pichau\.codex\generated_images\01a00130-d95a-79a3-9486-c1f48172a8c3\exec-224a695a-0c63-49c8-85e6-653d7795b4fe.png`
- Captura final da implementação: `C:\Users\Pichau\Desktop\roleta\CentralJogos\qa-evidence\qa-choice-reference-size-final.png`
- Rota: `http://127.0.0.1:4173/#/escolha-seu-lado`
- Estado comparado: tela de escolha, modo `nature`.
- Viewport CSS: 1672 × 941.
- Fonte: 1672 × 941 pixels.
- Implementação: 1672 × 941 pixels.
- Normalização: comparação 1:1; a captura e a fonte têm as mesmas dimensões, sem moldura de dispositivo nem redimensionamento adicional.
- Diferença de conteúdo dinâmico: a fonte mostra Memória RAM e a captura final mostra Protocolo TCP/IP. Ambos usam o mesmo modo `nature`, a mesma pergunta e as mesmas posições Hardware/Nenhum dos dois/Software; a comparação visual considerou o contêiner variável do item, não a forma específica do objeto.

## Comparação final

### Visão completa

A captura final preserva o fundo técnico claro, a tipografia arredondada de alto peso, a hierarquia azul-marinho e as três grandes áreas direcionais da referência. As posições físicas e a ordem cromática agora coincidem com o alvo: ciano à esquerda, âmbar no centro e violeta à direita. O item ocupa a região central superior, as setas são vetoriais da mesma família e o cronômetro permanece separado da área âmbar.

As diferenças restantes são adaptações funcionais previstas pelo produto: pergunta dinâmica no topo, controles compactos para Histórico/Configurações e botões de pausa/revelação próximos ao cronômetro. Elas não alteram a hierarquia nem a leitura das três escolhas.

### Regiões focadas

Não foi necessária uma captura adicional recortada: fonte e implementação foram comparadas em resolução 1:1, e os elementos críticos — título, item, setas, rótulos, controles e cronômetro — permanecem legíveis na visão completa. Os ícones também foram conferidos durante a interação real no navegador.

## Superfícies obrigatórias

- Fontes e tipografia: Fredoka mantém o peso e a presença arredondada da referência; Atkinson Hyperlegible atende textos menores. Títulos, rótulos e microtexto não truncam nos viewports testados.
- Espaçamento e ritmo: item, áreas direcionais e cronômetro têm separação clara. Não há colisão em 1920×1080, 1600×900 ou 1366×768.
- Cores e tokens: fundo marfim, azul-marinho, ciano, âmbar e violeta estão coerentes com a fonte; contraste de texto e controles permanece legível.
- Qualidade de imagem e assets: itens usam fotografias existentes ou SVGs de bibliotecas abertas armazenados localmente. Setas e controles usam Material Design Icons; não há emoji, caractere improvisado ou asset remoto no jogo.
- Cópia e conteúdo: a pergunta muda automaticamente entre classificação por natureza e por fluxo de dados; rótulos e explicações usam português com acentuação correta.
- Acessibilidade e estados: foco visível, controles semânticos, textos alternativos, diálogos, teclado e `prefers-reduced-motion` foram implementados. Pausa, resultado, histórico, configurações e confirmação de nova sessão foram exercitados.

## Histórico de iterações

### Iteração 1 — bloqueada

- [P1] Centro e direita usavam as cores em ordem diferente da referência.
- [P2] O item estava menor e mais baixo do que o foco visual da fonte.
- [P2] Em 1366×768, o cronômetro encostava no rótulo central.
- Correções: troca das cores central/direita, ampliação e reposicionamento do item, aumento das setas e ajuste do rótulo central. Evidência anterior: `qa-evidence/qa-choice-reference-size.png`; evidência pós-correção: `qa-evidence/qa-choice-reference-size-pass2.png`.

### Iteração 2 — bloqueada

- [P2] A área central ainda formava um pentágono muito alto, alterando a proporção dos três grandes blocos em relação à fonte.
- Correção: transformação da área central em trapézio âmbar, com conteúdo e cronômetro separados. Evidência pós-correção: `qa-evidence/qa-choice-reference-size-pass3.png`.

### Iteração 3 — aprovada

- Nenhuma diferença P0, P1 ou P2 restante.
- A marca compacta do jogo foi substituída por um ícone Material local antes da captura definitiva, eliminando o último desenho de interface improvisado.
- Evidência final: `qa-evidence/qa-choice-reference-size-final.png`.
- Verificação final: sem overflow nos três viewports solicitados e sem erros ou avisos no console.

### Iteração 4 — correção de centralização aprovada

- Fontes visuais: `C:\Users\Pichau\AppData\Local\Temp\codex-clipboard-3e3a2a00-674c-41cd-852e-ead349d62908.png`, `codex-clipboard-abaa5d73-c3ba-417c-9589-425f4fff9292.png` e `codex-clipboard-910cdc81-331e-411e-8be2-bb303f4333c4.png`.
- [P1] Itens com legenda mais larga que o cartão deslocavam visualmente o cartão para a esquerda, e alguns SVGs extrapolavam a área branca e colidiam com a legenda.
- Causa: o `figure` acompanhava a largura da legenda, enquanto o cartão não possuía margem automática; imagens SVG também mantinham dimensões intrínsecas incompatíveis com cartões baixos.
- Correções: cartão centralizado com `margin-inline: auto`, contêiner de imagem em flexbox, imagens dimensionadas pelo espaço interno com `object-fit: contain`, recorte de segurança e legenda longa centralizada com largura máxima responsiva.
- Comparação 1:1 realizada nos mesmos estados e viewports das fontes: Switch de rede em 1317 × 897, Joystick sem vibração em 986 × 627 e Microsoft Word em 1194 × 896, densidade 1×.
- Evidências pós-correção: `qa-evidence/centering-switch-corrected.png`, `qa-evidence/centering-joystick-986-corrected.png` e `qa-evidence/centering-word-1194-corrected.png`.
- Visão completa e região focada coincidem porque o problema ocupava o grupo central inteiro; cartão, ícone e legenda foram medidos separadamente e compartilham o centro horizontal do viewport, com diferença inferior a 0,01 px.
- Superfícies verificadas: Fredoka e hierarquia tipográfica preservadas; espaçamento sem colisões; tokens de cor inalterados; SVGs nítidos, contidos e sem deformação; cópia integral e sem truncamento.
- Verificação responsiva: zero overflow horizontal/vertical e todos os ícones contidos nos cartões nos três tamanhos.
- Nenhuma diferença P0, P1 ou P2 restante.

## Interações verificadas

- Introdução, pré-carregamento, giro de 6 segundos, revelação e avanço antecipado.
- Alternância real entre um periférico e um item geral.
- Cronômetro de 15 segundos, pausa sem deriva, retomada e reinício com `R`.
- Persistência de item e tempo após atualização.
- Som, tentativa de tela cheia, Histórico, Configurações e confirmação de Nova sessão.
- Rotas `#/`, `#/classificacao`, `#/forca` e `#/escolha-seu-lado`.
- Console sem erros ou avisos durante o fluxo testado.

## Resultado

final result: passed
