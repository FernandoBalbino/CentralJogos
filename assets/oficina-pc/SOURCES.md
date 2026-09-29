# Recursos da Oficina do PC

Os modelos desta versão são originais e procedurais, criados em `js/oficina-pc-models.mjs` para o CentralJogos, com implementação assistida por Codex. Representam peças genéricas e não usam marcas ou modelos de terceiros. Podem ser redistribuídos junto com o código do projeto.

`oficina-pc-preview.jpg` é uma captura da própria cena, 960 × 540 pixels, mostrando o computador montado, monitor, teclado e mouse. A captura contém apenas a renderização 3D, sem textos da interface. Não utiliza imagem de banco.

Three.js 0.185.1 e OrbitControls r185 são locais e licenciados sob MIT. A licença integral está em `vendor/three/LICENSE.txt`. OrbitControls foi obtido do repositório oficial em `https://raw.githubusercontent.com/mrdoob/three.js/r185/examples/jsm/controls/OrbitControls.js`; seu import foi ajustado para `../three.module.min.js`.

Referências pesquisadas, sem incorporação de assets:

| Referência | Licença informada | Resultado |
| --- | --- | --- |
| [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) | CC0 | Kit de ambiente; não foi validado um conjunto completo das peças necessárias. |
| [CPU/cooler de GAMICO no Sketchfab](https://sketchfab.com/3d-models/cpu-processor-cpu-cooler-detailed-3d-model-f50555aedd2f455fa433cb3e135099dd) | CC BY 4.0 | O download exigiu login; não foi baixado nem incluído. |

A documentação oficial do [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) registra a exigência de WebGL2. A Oficina detecta esse contexto antes de criar o renderizador.

Texturas: pequenas placas com texto são desenhadas localmente em canvas 256 × 128. Materiais PBR e geometrias básicas são compartilhados; chips, contatos, teclas e pás das ventoinhas usam instâncias. Cabos usam curvas Catmull-Rom com tubos de 64 segmentos e cinco lados, com altura limitada à bancada. A geometria só muda quando a conexão ou os pontos mudam. Sons são sintetizados após interação com a página.
