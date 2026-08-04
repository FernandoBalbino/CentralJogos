# Central de Jogos — Fundamentos de Informática

Site educacional estático com dois jogos para aulas introdutórias de informática:

- **Classifique os itens:** 40 cartões distribuídos entre Entrada, Saída, Hardware, Software e Periféricos híbridos.
- **Forca do sistema operacional:** o professor escolhe um entre 30 termos, oculta a palavra e inicia a rodada com a turma.

## Abrir localmente

Não há dependências nem etapa de compilação. Sirva a pasta com qualquer servidor HTTP estático. Como os scripts usam módulos JavaScript, abrir o arquivo diretamente por `file://` pode ser bloqueado pelo navegador.

Exemplo com Python:

```powershell
python -m http.server 8000
```

Depois acesse `http://localhost:8000/`.

## Publicar no GitHub Pages

1. Envie todos os arquivos deste diretório para a raiz da branch `main` do repositório.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, a pasta `/(root)` e salve.

O projeto usa apenas caminhos relativos e navegação por hash, portanto também funciona em endereços como `https://usuario.github.io/CentralJogos/`.

## Recursos visuais e licenças

As imagens usadas nos cartões estão em `assets/items/` e são carregadas localmente. Os metadados de fonte, autoria e licença ficam em `js/credits-data.js` e podem ser consultados no botão **Créditos das imagens** do site.

Para refazer o download dos recursos visuais:

```powershell
.\scripts\download-assets.ps1
```

Use `-ForceRefresh` se quiser baixar novamente inclusive os arquivos já registrados como concluídos.

As camadas PNG da ilustração da forca podem ser recriadas com:

```powershell
.\scripts\create-hangman-assets.ps1
```

Marcas e logotipos pertencem aos respectivos titulares e são usados somente para identificação em contexto educacional.
