# Central de Jogos — Fundamentos de Informática

Site educacional estático com quinze jogos para aulas introdutórias de informática:

- **Classifique os itens:** 40 cartões distribuídos entre Entrada, Saída, Hardware, Software e Periféricos híbridos.
- **Forca do sistema operacional:** o professor escolhe um entre 30 termos, oculta a palavra e inicia a rodada com a turma.
- **Escolha seu lado:** uma roleta sem repetição apresenta 74 itens. Peças, programas e conceitos usam Hardware/Nenhum/Software; periféricos usam Entrada/Híbrido/Saída.
- **Central de Suporte:** o aluno resolve seis chamados em dois níveis, ligando o que verificar, a possível causa e a solução, com três respostas distratoras por nível.
- **Ache os Pares — Desafio TI:** equipes associam imagens a definições em rodadas de 8 a 15 pares, com 68 conceitos de hardware, software, periféricos, redes, segurança e comunicação.
- **Cruzadinha Tech:** cada partida cria localmente uma grade conectada com 10 termos aleatórios do banco do Ache os Pares, cinco dicas, retomada da sessão e resultado individual do aluno.
- **Desafio TI — Valendo Pontos:** competição para 2 a 6 equipes com 150 perguntas, tabuleiro de 30 casas, roubo, cronômetro, placar persistente e desafio final.
- **Técnico em Ação 3D — Missões Windows:** seis chamados sequenciais para aprender e praticar ações básicas do Windows, com laboratório 3D em Three.js, dicas sob demanda e progresso local.
- **Descubra o Windows:** 30 aulas animadas sobre o Windows 11, seguidas por um caça-palavras 20 × 20 com 15 termos sorteados — 13 na lista e duas palavras-surpresa —, progresso local e uso integral sem internet após o preparo.
- **Google Apresentações na Prática:** 30 aulas com demonstração, pergunta e prática real, além de um desafio final com dez objetivos em um simulador local fiel à interface do Google Apresentações e otimizado para Chromebook.
- **Google Planilhas na Prática:** 30 aulas com demonstração e prática em um simulador de planilhas preparado para teclado e touchpad de Chromebook.
- **Organize o Windows — Arquivos e Extensões:** curso prático em quatro etapas para reconhecer 11 extensões, mover arquivos, organizar duas Áreas de Trabalho e consultar o tipo pelo menu Propriedades.
- **Labirinto da Informática:** exploração de um labirinto procedural ampliado, com cronômetro, vírus perseguidor, 16 baús-base, 15 poderes, quatro escolhas por baú, cinco eventos aleatórios, personagem em pixel art e 36 desafios práticos de arquivos, hardware, software, periféricos, Windows e suporte básico.
- **Carrinho do Saber:** dez fases de movimento e identificação de itens, com explicações, respostas simples ou múltiplas e progresso local.
- **Oficina do PC:** montagem 3D guiada em oito etapas, exame das peças, liga/desliga e manutenção para substituir um HD por SSD. Arraste real ou seleção seguida de encaixe, com suporte a teclado.

Além dos jogos, há o **Laboratório de Instalação do Windows**: simulação educacional de instalação limpa do Windows 10 22H2 e do Windows 11 25H2, com duas opções de HD virtual já preparadas, guia lateral, configuração inicial e desktop final. A atividade não acessa discos reais nem instala software. A sessão pode ser retomada após recarregar a página; senha e PIN fictícios nunca são salvos.

O terceiro jogo foi projetado para uso em tela cheia com a turma. Ele oferece cronômetro de 15, 30, 45 ou 60 segundos, histórico da sessão, som opcional, explicações e recuperação do estado após atualizar a página.

## Abrir localmente

Não há dependências nem etapa de compilação. Sirva a pasta com qualquer servidor HTTP estático. Como os scripts usam módulos JavaScript, abrir o arquivo diretamente por `file://` pode ser bloqueado pelo navegador.

Servidor incluído (Node.js moderno):

```powershell
node scripts/serve.mjs
```

Acesse **http://127.0.0.1:4173/#/oficina-do-pc**. Para testar a hospedagem em subdiretório, use **http://127.0.0.1:4173/CentralJogos/#/oficina-do-pc**. O servidor retorna 404 para arquivos ausentes e os tipos de conteúdo de módulos, estilos, imagens e modelos.

Exemplo com Python:

```powershell
python -m http.server 8000
```

Depois acesse `http://localhost:8000/`.

As rotas diretas dos jogos mais recentes são:

- `http://localhost:8000/#/escolha-seu-lado`
- `http://localhost:8000/#/suporte-tecnico`
- `http://localhost:8000/#/ache-os-pares`
- `http://localhost:8000/#/cruzadinha`
- `http://localhost:8000/#/desafio-ti`
- `http://localhost:8000/#/missoes-windows`
- `http://localhost:8000/#/descubra-windows`
- `http://localhost:8000/#/google-apresentacoes`
- `http://localhost:8000/#/google-planilhas`
- `http://localhost:8000/#/organize-windows`
- `http://localhost:8000/#/labirinto-da-informatica`
- `http://localhost:8000/#/carrinho-do-saber`
- `http://localhost:8000/#/oficina-do-pc`
- `http://localhost:8000/#/instalacao-windows`

## Expandir o curso Google Apresentações

As 30 aulas e o desafio final ficam em `js/google-slides-course-data.mjs`. Cada registro contém objetivo, demonstração, pergunta e prática. As demonstrações usam alvos semânticos da interface e ações reutilizáveis como `move`, `click`, `open-menu`, `select-option`, `wait`, `highlight` e `announce`.

O simulador reproduz a barra de menus, a barra de ferramentas contextual, a faixa de miniaturas, a tela central, os submenus de Inserir/Formato/Slide/Organizar e os painéis de tema e movimento. Missões de texto e comentário exigem digitação real; a missão de seleção exige caracteres efetivamente selecionados; e o tamanho da fonte é alterado ponto a ponto pelos botões `−` e `+`, como no editor original.

Para cadastrar uma aula, adicione o registro ao catálogo, defina seu estado inicial em `createLessonPresentationState`, implemente a ação no redutor quando ela ainda não existir e inclua o `expectedAction` na prática. A atividade só é concluída quando o evento esperado também produz a mudança correspondente no estado do simulador.

## Uso offline nos Chromebooks

O service worker **central-jogos-offline-v31** prepara automaticamente o pacote básico e os demais jogos. Aguarde **Pronto para jogar offline**. **Oficina do PC** e **Técnico em Ação 3D** são carregados sob demanda: abra cada um com conexão e aguarde seu próprio aviso **Disponível offline ✓** antes de desconectar. Three.js e os módulos exclusivos desses dois jogos não fazem parte do preparo inicial. Um download incompleto não é anunciado como disponível; há botão para tentar novamente.

Todos os arquivos, fontes, ícones, bibliotecas e vídeos são locais. Não há dependência de CDN durante a aula. O worker define os IDs e arquivos permitidos dos pacotes opcionais; URLs são resolvidas pelo seu escopo, inclusive em `/CentralJogos/`.

Para testar localmente, use `localhost` (não abra por `file://`), carregue a página uma vez, aguarde a confirmação e então coloque o navegador em modo offline.

## Atalhos do Desafio TI

- `F`: alternar tela cheia.
- `M`: ativar ou desativar o som.
- `Espaço`: iniciar ou pausar o cronômetro.
- `R`: revelar a resposta da pergunta aberta.
- `Esc`: voltar ao tabuleiro quando nenhuma pontuação foi registrada.

## Atalhos do Escolha seu lado

- `Espaço`: iniciar ou girar a roleta.
- `Enter`: avançar, revelar a resposta ou ir ao próximo item.
- `P`: pausar ou retomar o cronômetro.
- `F`: alternar tela cheia.
- `M`: ativar ou desativar o som.
- `R`: reiniciar a apresentação e o cronômetro do item atual.

## Testes

Os testes usam somente o executor nativo do Node.js:

```powershell
node --test tests/side-game.test.mjs
node --test tests/support-game.test.mjs
node --test tests/memory-game.test.mjs
node --test tests/crossword-game.test.mjs
node --test tests/desafio-ti.test.mjs
node --test tests/windows-mission.test.mjs
node --test tests/windows-discovery.test.mjs
node --test tests/google-slides-course.test.mjs
node --test tests/google-sheets-course.test.mjs
node --test tests/windows-file-organizer.test.mjs
node --test tests/maze-game.test.mjs
```

## Publicar no GitHub Pages

1. Envie todos os arquivos deste diretório para a raiz da branch `main` do repositório.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, a pasta `/(root)` e salve.

O projeto usa apenas caminhos relativos e navegação por hash, portanto também funciona em endereços como `https://usuario.github.io/CentralJogos/`.

Os jogos 3D usam **Three.js 0.185.1** local em `vendor/three/`. A Oficina usa OrbitControls da mesma versão, com import relativo. O renderizador exige WebGL2; a Oficina apresenta uma mensagem clara quando ele não está disponível.

## Oficina do PC

O gabinete fica deitado e aberto na montagem e na manutenção interna; fica em pé na apresentação. As etapas são gabinete, placa-mãe, processador, cooler, RAM, HD, fonte e GPU. A bancada ampliada mantém as opções lado a lado, apoiadas na superfície; peças instaladas não voltam como distratores. Antes de ligar, o aluno precisa conectar o cabo da fonte à tomada. As conexões internas são automáticas, e os cabos externos têm curvas suaves com trajetos organizados pela borda.

Há três ordens de serviço: Lucas pede a troca de HD por SSD; Sofia pede uma RAM compatível de maior capacidade; Marina precisa reconectar e testar o mouse USB. Cada desafio exige localizar a peça, realizar a tarefa, testar e responder à pergunta. A manutenção interna desliga e desconecta automaticamente o PC, exigindo reconectar antes do teste. Comparações e testes são simulações ilustrativas, sem benchmarks.

Controles: arraste uma peça até o destino destacado; arraste o espaço vazio para girar; use a roda ou os botões para zoom. Também é possível selecionar uma peça nos botões e selecionar o destino. Tab e Enter percorrem os controles; setas giram a câmera com o canvas focado; `+`/`−` alteram o zoom. Exame 360°, visão geral, raio-X, visão explodida reversível, som opcional e tela cheia ficam na própria oficina.

O checkpoint de versão 2 usa a chave `central-oficina-pc-v1` e migra a versão anterior, oferecendo os novos desafios a quem já concluiu o SSD. Recomeçar limpa apenas esse progresso. Caso o armazenamento seja bloqueado, a atividade continua em memória. A saída descarta a cena, o renderizador, geometrias, materiais, texturas, áudio, listeners e observers; uma animação antiga não avança a próxima sessão.

Arquitetura, autoria, tamanhos, resultados e limites da validação: [documentação da Oficina](docs/oficina-do-pc.md) e [fontes dos recursos](assets/oficina-pc/SOURCES.md).

Validação completa:

```powershell
node --test tests/*.test.mjs
git diff --check
```

## Recursos visuais e licenças

As imagens usadas nos cartões estão em `assets/items/` e são carregadas localmente. Os metadados de fonte, autoria e licença ficam em `js/credits-data.js` e podem ser consultados no botão **Créditos das imagens** do site. As atribuições dos novos ícones também estão registradas em `ATTRIBUTIONS.md` e no dataset do jogo. Os recursos do simulador de apresentações estão documentados em `assets/google-slides/SOURCES.md`. Os ícones do laboratório de instalação e suas licenças estão documentados em `assets/windows-installer/SOURCES.md`; os ícones de desktop vindos do win11React não são assets oficiais da Microsoft.

Para refazer o download dos recursos visuais:

```powershell
.\scripts\download-assets.ps1
```

Use `-ForceRefresh` se quiser baixar novamente inclusive os arquivos já registrados como concluídos.

Os ícones adicionais do Escolha seu lado podem ser baixados novamente com:

```powershell
.\scripts\download-side-game-assets.ps1
```

As camadas PNG da ilustração da forca podem ser recriadas com:

```powershell
.\scripts\create-hangman-assets.ps1
```

Marcas e logotipos pertencem aos respectivos titulares e são usados somente para identificação em contexto educacional.
