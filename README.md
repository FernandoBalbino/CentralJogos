# Central de Jogos — Fundamentos de Informática

Site educacional estático com dez jogos para aulas introdutórias de informática:

- **Classifique os itens:** 40 cartões distribuídos entre Entrada, Saída, Hardware, Software e Periféricos híbridos.
- **Forca do sistema operacional:** o professor escolhe um entre 30 termos, oculta a palavra e inicia a rodada com a turma.
- **Escolha seu lado:** uma roleta sem repetição apresenta 74 itens. Peças, programas e conceitos usam Hardware/Nenhum/Software; periféricos usam Entrada/Híbrido/Saída.
- **Central de Suporte:** o aluno resolve seis chamados em dois níveis, ligando o que verificar, a possível causa e a solução, com três respostas distratoras por nível.
- **Ache os Pares — Desafio TI:** equipes associam imagens a definições em rodadas de 8 a 15 pares, com 68 conceitos de hardware, software, periféricos, redes, segurança e comunicação.
- **Cruzadinha Tech:** cada partida cria localmente uma grade conectada com 10 termos aleatórios do banco do Ache os Pares, cinco dicas, retomada da sessão e resultado individual do aluno.
- **Desafio TI — Valendo Pontos:** competição para 2 a 6 equipes com 150 perguntas, tabuleiro de 30 casas, roubo, cronômetro, placar persistente e desafio final.
- **Técnico em Ação 3D — Missões Windows:** seis chamados sequenciais para aprender e praticar ações básicas do Windows, com laboratório 3D em Three.js, dicas sob demanda e progresso local.
- **Descubra o Windows:** 30 aulas animadas sobre o Windows 11, seguidas por um caça-palavras 20 × 20 com 15 termos sorteados — 13 na lista e duas palavras-surpresa —, progresso local e uso integral sem internet após o preparo.
- **Google Apresentações na Prática:** 30 aulas com demonstração, pergunta e prática real, além de um desafio final com dez objetivos em um simulador local otimizado para Chromebook.

O terceiro jogo foi projetado para uso em tela cheia com a turma. Ele oferece cronômetro de 15, 30, 45 ou 60 segundos, histórico da sessão, som opcional, explicações e recuperação do estado após atualizar a página.

## Abrir localmente

Não há dependências nem etapa de compilação. Sirva a pasta com qualquer servidor HTTP estático. Como os scripts usam módulos JavaScript, abrir o arquivo diretamente por `file://` pode ser bloqueado pelo navegador.

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

## Expandir o curso Google Apresentações

As 30 aulas e o desafio final ficam em `js/google-slides-course-data.mjs`. Cada registro contém objetivo, demonstração, pergunta e prática. As demonstrações usam alvos semânticos da interface e ações reutilizáveis como `move`, `click`, `open-menu`, `select-option`, `wait`, `highlight` e `announce`.

Para cadastrar uma aula, adicione o registro ao catálogo, defina seu estado inicial em `createLessonPresentationState`, implemente a ação no redutor quando ela ainda não existir e inclua o `expectedAction` na prática. A atividade só é concluída quando o evento esperado também produz a mudança correspondente no estado do simulador.

## Uso offline nos Chromebooks

O site registra um service worker e prepara automaticamente os arquivos essenciais em cache. Aguarde o aviso **Pronto para jogar offline** antes de desligar o roteamento da internet. As fontes, os ícones, o Three.js, os 30 vídeos WebM e seus pôsteres são servidos pelo próprio repositório; não há dependência de CDN durante a aula.

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
```

## Publicar no GitHub Pages

1. Envie todos os arquivos deste diretório para a raiz da branch `main` do repositório.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, a pasta `/(root)` e salve.

O projeto usa apenas caminhos relativos e navegação por hash, portanto também funciona em endereços como `https://usuario.github.io/CentralJogos/`.

O jogo 3D usa uma cópia local do **Three.js 0.185.1** em `vendor/three/`, compatível com a hospedagem estática do GitHub Pages.

## Recursos visuais e licenças

As imagens usadas nos cartões estão em `assets/items/` e são carregadas localmente. Os metadados de fonte, autoria e licença ficam em `js/credits-data.js` e podem ser consultados no botão **Créditos das imagens** do site. As atribuições dos novos ícones também estão registradas em `ATTRIBUTIONS.md` e no dataset do jogo.

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
