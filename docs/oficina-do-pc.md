# Oficina do PC

Experiência em `#/oficina-do-pc`, integrada à CentralJogos. Montagem em oito etapas e três ordens de serviço: trocar HD por SSD, substituir RAM e conectar/testar o mouse USB. O cabo da fonte precisa ser encaixado na tomada antes de cada inicialização. A manutenção interna desliga e desconecta automaticamente o PC.

## Implementação

| Arquivo | Responsabilidade |
| --- | --- |
| `js/oficina-pc.mjs`, `oficina-pc.css` | Interface, acessibilidade, som, tela cheia e ciclo mount/enter/leave. |
| `js/oficina-pc-core.mjs` | Máquina de estados pura, pré-requisitos, validação, animações e checkpoint. |
| `js/oficina-pc-data.mjs` | Peças, funções, distratores, etapas, posições, anchors e configurações. |
| `js/oficina-pc-models.mjs` | Modelos procedurais originais, materiais PBR e instâncias compartilhadas. |
| `js/oficina-pc-scene.mjs` | Renderização, raycaster, arraste, encaixes, cabos curvos, exame e descarte. |
| `js/oficina-pc-camera.mjs`, `js/oficina-pc-interactions.mjs` | OrbitControls, zoom, gestos, captura de ponteiro e cancelamento. |
| `js/app.js`, `js/game-offline.mjs` | Importação sob demanda, cancelamento de entrada antiga e status de cada pacote. |
| `service-worker.js` | Cache v31, básico automático e pacotes 3D opcionais com lista permitida. |
| `index.html`, `styles.css`, `assets/oficina-pc/` | Card, rota, imagem do PC 3D e atribuições. |
| `js/windows-mission-game.mjs` | Status offline específico do Técnico em Ação 3D. |
| `scripts/serve.mjs`, `scripts/check-offline-assets.mjs` | Servidor estático com subdiretório, HTTP, tipos e tamanhos. |
| `scripts/oficina-preview.html` | Renderização da própria cena para capturar o card sem interface. |

A bancada mede 16 × 8 unidades. Os modelos disponíveis ficam apoiados na superfície em posições distintas; itens instalados são excluídos do inventário de distratores. O HD e a RAM retirados ficam separados. O mouse permanece ao lado do teclado. Cabos usam curvas Catmull-Rom com tubos de 64 segmentos e cinco lados: energia pela borda traseira/lateral e USB próximo aos periféricos. O trajeto respeita a altura da bancada e só é reconstruído quando uma posição ou conexão muda.

Anchors internos usam o espaço local do gabinete, preservando encaixes quando ele passa de deitado para em pé. A tomada usa espaço mundial. A inspeção reutiliza o canvas/renderizador. Arraste suspende OrbitControls e captura o ponteiro; cancelamento, perda de foco e soltura inválida devolvem a peça. Selecionar peça e destino por Tab/Enter executa a mesma lógica. Animações bloqueiam ações duplicadas. O checkpoint versão 2 migra a versão anterior na chave `central-oficina-pc-v1`; reset preserva todos os demais jogos.

## Tecnologia, autoria e orçamento

Three.js 0.185.1 e OrbitControls r185 locais, sob MIT (`vendor/three/LICENSE.txt`). WebGL2 é obrigatório. Modelos, bancada, periféricos, tomada, cabos e prévia são originais do CentralJogos, com implementação assistida por Codex. Fontes locais e cores da Central foram reutilizadas. Texturas de texto têm 256 × 128; áudio é sintetizado pela Web Audio API. Pesquisa e licenças estão em `ATTRIBUTIONS.md` e `assets/oficina-pc/SOURCES.md`; nenhum modelo externo foi incorporado.

O orçamento inicial é 40 mil triângulos, 120 draw calls, texturas até 512 px e uma sombra 1024 px. A montagem ligada mediu 6.136 triângulos/104 chamadas; a conclusão com peças retiradas mediu 6.394/101 no ambiente de validação. Instâncias de chips, contatos, teclas e pás reduzem chamadas. Pixel ratio máximo 1,5, reduzido a 1 com sombras desativadas após duas amostras consecutivas abaixo de 30 FPS. FPS observado nesse desktop não representa garantia em Chromebooks.

## Offline e tamanhos

O básico não baixa Three.js nem os módulos exclusivos dos jogos 3D. Abra cada jogo com conexão e aguarde seu aviso próprio de disponibilidade offline. O worker valida todos os arquivos do pacote antes de confirmar; falhas permitem nova tentativa. Caminhos são relativos ao módulo/escopo, incluindo `/CentralJogos/`. O indicador de carregamento acompanha estilos, importação, cena construída e pacote offline confirmado.

Medição pelo catálogo do próprio worker em 29/09/2026:

| Pacote | Arquivos únicos | Tamanho sem compressão |
| --- | ---: | ---: |
| Básico | 193 | 18,358 MiB |
| Técnico em Ação 3D | 6 | 0,765 MiB |
| Oficina do PC | 11 | 0,855 MiB |

Os pacotes 3D compartilham os dois arquivos Three.js (750.938 bytes). OrbitControls ocupa 40.521 bytes. A prévia é JPEG 960 × 540, sem a interface do jogo.

## Validação

- Suíte completa: **156 testes passando**. Lógica e configuração, erros, encaixes, bloqueios, três desafios, tomada/Power, perguntas, migração/reset, inventário único, apoio/separação dos modelos e cabos curvos.
- Ciclo de vida: entradas repetidas, navegação durante importação, animação antiga, perda de captura, pointer touch, aba oculta, loop único, descarte e armazenamento bloqueado.
- Cache: básico separado, pacotes permitidos, atualização, download incompleto, verificação e retry; HTTP/tipos corretos em **208 caminhos** no subdiretório, arquivo inexistente 404 e manifest válido.
- Navegador: percurso completo, arraste real da tomada e do USB, teclado, escolhas incorretas, retomada, exame, raio-X, explosão reversível e tela cheia. Layouts 1920 × 1080, 1366 × 768 e 390 × 844 sem overflow horizontal. A captura de 1920 é limitada pela largura do painel do navegador; a validação de largura usa também medidas DOM.
- Offline real: após o preparo dos dois pacotes, o servidor local foi desligado. Técnico em Ação e Oficina abriram e recarregaram pelo cache; a Oficina retomou o checkpoint de conclusão dos três desafios.
- `node --check` nos arquivos JS/MJS alterados e `git diff --check` aprovados.

Limites: modelos genéricos e testes ilustrativos, sem benchmarks, instalação real ou capacidades técnicas de marcas. Gestos touch têm teste automatizado de pointer events; não houve teste físico em Chromebook/tela sensível ao toque. A redução de qualidade foi exercitada por teste controlado. Serviços externos e navegadores podem exigir recarga para ativar uma atualização do service worker.

## Iniciar e conferir

```powershell
node scripts/serve.mjs
```

Abra `http://127.0.0.1:4173/#/oficina-do-pc`. Para conferir a hospedagem em pasta, use `http://127.0.0.1:4173/CentralJogos/#/oficina-do-pc`.

```powershell
node --test tests/*.test.mjs
node scripts/check-offline-assets.mjs http://127.0.0.1:4173/CentralJogos/
git diff --check
```

Para gerar a imagem do card, abra `/scripts/oficina-preview.html` no servidor e capture apenas o canvas 960 × 540, salvando em `assets/oficina-pc/oficina-pc-preview.jpg`.
