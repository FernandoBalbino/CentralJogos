# Central de Jogos — Fundamentos de Informática

Site educacional estático com cinco jogos para aulas introdutórias de informática:

- **Classifique os itens:** 40 cartões distribuídos entre Entrada, Saída, Hardware, Software e Periféricos híbridos.
- **Forca do sistema operacional:** o professor escolhe um entre 30 termos, oculta a palavra e inicia a rodada com a turma.
- **Escolha seu lado:** uma roleta sem repetição apresenta 75 itens. Peças, programas e conceitos usam Hardware/Nenhum/Software; periféricos usam Entrada/Híbrido/Saída.
- **Central de Suporte:** o aluno resolve seis chamados em dois níveis, ligando o que verificar, a possível causa e a solução, com três respostas distratoras por nível.
- **Ache os Pares — Desafio TI:** equipes associam imagens a definições em rodadas de 8 a 15 pares, com 71 conceitos de hardware, software, periféricos, redes, segurança e comunicação.

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
```

## Publicar no GitHub Pages

1. Envie todos os arquivos deste diretório para a raiz da branch `main` do repositório.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, a pasta `/(root)` e salve.

O projeto usa apenas caminhos relativos e navegação por hash, portanto também funciona em endereços como `https://usuario.github.io/CentralJogos/`.

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
