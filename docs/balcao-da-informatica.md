# Balcão da Informática

Simulador educativo de atendimento em uma loja de informática. Rota: `#/balcao-da-informatica`. Publicação: <https://fernandobalbino.github.io/CentralJogos/#/balcao-da-informatica>.

## Campanha e aprendizagem

São **100 pedidos distintos**, divididos em periféricos (15), armazenamento (15), componentes internos (20), loja completa (20) e pedidos combinados (30). A última fase tem 15 pedidos de dois produtos e 15 pedidos de três produtos. São sorteados dentro de cada grupo de dificuldade, preservando o avanço de reconhecimento para interpretação. Tentativas mantêm o cliente e seu pedido.

A duração de **50–70 minutos é uma estimativa pedagógica**, não uma medição com alunos nem um tempo mínimo imposto. O aluno pode terminar antes, pausar ou dividir a campanha entre aulas. Não há penalidade por velocidade. A fila chega gradualmente e comporta quatro clientes esperando, além do cliente no balcão.

Antes do expediente há demonstração e prática dos controles, sem pontos. Durante os atendimentos os cards exibem apenas nome e imagem; explicações e correção só aparecem após **ENTREGAR PEDIDO**. As situações delimitam a necessidade para diferenciar, por exemplo, falta de RAM, acesso lento ao HD e limite de processamento gráfico. Não são ensinados socket, geração de RAM, potência ou compatibilidade avançada.

## Controles

- **Dois cliques:** clique no produto e depois na sacola. O produto selecionado fica destacado.
- **Arraste:** segure o produto e solte sobre a sacola. Soltar fora ou cancelar não adiciona.
- **Teclado:** Tab navega; Enter/Espaço ativa os mesmos botões; Esc cancela uma seleção ou alterna pausa.
- **Sacola:** até três produtos diferentes, com remoção antes de entregar. Nenhum produto é inserido automaticamente após um erro.
- **Som:** opcional, inicialmente desligado; preferência salva localmente. Áudio sintetizado, sem downloads.
- **Tela cheia:** botão próprio; o atendimento continua utilizável se o navegador não permitir.

O progresso é salvo após ações relevantes, chegadas de clientes e a cada dez segundos de atendimento. Sair e voltar, recarregar ou ocultar a aba preserva o andamento. A ocultação da aba pausa a sessão. Se o armazenamento estiver bloqueado, o jogo continua e informa que não pode salvar.

## Regras

Um pedido correto deve conter exatamente os produtos esperados, sem extras, independentemente da ordem. Erros não avançam e não bloqueiam a campanha. Uma entrega já processada não pode pontuar novamente.

Estrelas: 3 no primeiro acerto, 2 após um erro, 1 após dois ou mais erros. Pontos: `50 × produtos × estrelas`. Sequências contam apenas acertos de primeira; os elogios em 2, 3 e 5 não adicionam bônus. Precisão é o percentual de clientes resolvidos na primeira tentativa. Medalhas: ouro a partir de 90%, prata a partir de 70%, bronze abaixo disso.

O resumo de cada fase apresenta resultados e conhecimentos adquiridos. Rejogar substitui os resultados daquela fase, mantendo os anteriores e evitando inflação de pontos. O resumo final também mostra os totais da campanha.

## Implementação

HTML/CSS, módulos JavaScript e assets locais, sem dependências novas, CDN, API, build ou autenticação. A cena usa perspectiva em CSS e personagens estilizados originais. O site continua funcionando sob `/CentralJogos/` no GitHub Pages.

### Arquivos criados

- `js/balcao-informatica-products.mjs`: catálogo, imagens e conhecimentos.
- `js/balcao-informatica-data.mjs`: 100 clientes, fases e explicações.
- `js/balcao-informatica-core.mjs`: sacola, fila, pedidos, fases, pontuação e persistência validada.
- `js/balcao-informatica-interactions.mjs`: reconhecimento/cancelamento do gesto de arraste.
- `js/balcao-informatica-renderer.mjs`: loja, personagens, catálogo, feedback e resumos.
- `js/balcao-informatica.mjs`: ciclo `mount/enter/leave`, eventos, teclado, áudio e salvamento.
- `balcao-informatica.css`: layout responsivo, perspectiva, estados de interação e movimento reduzido.
- `tests/balcao-informatica.test.mjs` e `tests/balcao-informatica-lifecycle.test.mjs`: regras, dados, integração, controles e ciclo de vida.
- `scripts/check-balcao-browser.mjs`: verificação opcional em navegador e capturas locais.
- `docs/balcao-da-informatica.md`: este guia.

### Arquivos existentes alterados

`index.html`, `js/app.js`, `service-worker.js`, `README.md` e `ATTRIBUTIONS.md`. Os seis testes que verificavam literalmente a versão do cache foram atualizados para `v32`: Google Planilhas, Google Apresentações, Labirinto, Oficina do PC, Descubra o Windows e Organize o Windows.

### Imagens reutilizadas

Todas em `assets/items/`, sem modificar seus originais. Os créditos/licenças continuam em `js/credits-data.js` e na tela de créditos da Central.

| Produto | Arquivo existente |
|---|---|
| Mouse | `mouse.jpg` |
| Teclado | `teclado.jpg` |
| Monitor | `monitor.jpg` |
| Webcam | `webcam.jpg` |
| Headset | `headset.jpg` |
| Impressora | `impressora.jpg` |
| Caixa de som | `caixa-som.jpg` |
| HD | `disco-rigido.jpg` |
| SSD | `ssd.jpg` |
| Pen drive | `pen-drive.jpg` |
| Memória RAM | `memoria-ram.jpg` |
| Placa de vídeo | `placa-video.jpg` |
| Processador | `processador.jpg` |
| Placa-mãe | `placa-mae.jpg` |
| Fonte | `fonte-alimentacao.jpg` |
| Cooler | `cooler.jpg` |
| Roteador | `roteador.jpg` |

Não foram geradas imagens para substituir produtos existentes. As fontes Atkinson Hyperlegible/Fredoka também são locais e já faziam parte da Central.

## Verificação e offline

O pacote básico `central-jogos-offline-v32` inclui os seis módulos, o CSS e todas as imagens necessárias. Aguarde **Disponível offline ✓** dentro da loja ou **Pronto para jogar offline** na Central antes de desconectar. As bibliotecas dos jogos 3D continuam sob demanda.

```powershell
node --test tests/*.mjs
node scripts/check-offline-assets.mjs
node scripts/serve.mjs
```

Com um servidor em execução, valide os caminhos de hospedagem:

```powershell
node scripts/check-offline-assets.mjs http://127.0.0.1:4173/CentralJogos/
```

A verificação de navegador usa uma instalação existente de Playwright (não exigida para jogar). Defina `BALCAO_PLAYWRIGHT_PATH` para o `index.mjs` dessa instalação, se necessário, e `BALCAO_BROWSER` para o canal instalado (padrão `msedge`). Execute `node scripts/check-balcao-browser.mjs`. Ela percorre uma fase pela interface, testa erro/retry, clique, teclado, arraste, pedidos combinados, pausa, tela cheia, retomada, navegação e recarga offline, com capturas em 1920×1080, 1366×768 e 390×844. Resultados e imagens ficam em `qa-evidence/balcao-*`, preservando as evidências anteriores.
