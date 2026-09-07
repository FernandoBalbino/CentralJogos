export const GOOGLE_SHEETS_COURSE_DATA_VERSION = 1;

export const GOOGLE_SHEETS_DEMO_ACTIONS = Object.freeze([
  "announce", "move", "highlight", "click", "double-click", "type", "key",
  "open-menu", "open-submenu", "select-option", "wait"
]);

export const GOOGLE_SHEETS_PRACTICE_ACTIONS = Object.freeze([
  "app:identify", "row:identify", "column:identify", "cell:identify",
  "name-box:identify", "formula-bar:identify", "cell:select", "cell:input",
  "cell:edit", "cell:clear", "navigation:key", "row:select", "column:select",
  "range:select", "multi:select", "clipboard:copy", "clipboard:cut",
  "clipboard:paste", "format:style", "format:font-size", "format:text-color",
  "format:fill-color", "format:align", "format:border", "sheet:insert",
  "format:number", "formula:input"
]);

export const GOOGLE_SHEETS_DEMO_TARGETS = Object.freeze([
  "sheets-mark", "row-header-1", "column-header-A", "cell-B3", "name-box",
  "formula-bar", "cell-C3", "cell-A1", "cell-B1", "cell-C1", "cell-B2", "cell-C2", "cell-D2",
  "cell-A2", "cell-A3", "cell-A4", "cell-B3", "cell-B4", "cell-C3",
  "cell-C4", "cell-E5", "bold", "italic", "underline", "font-size",
  "text-color", "text-color-blue", "fill-color", "fill-yellow", "align",
  "align-center", "borders", "border-all", "insert-menu", "insert-row",
  "insert-column", "currency", "percent", "format-menu", "number-submenu",
  "number-currency", "number-percent", "keyboard-guide", "touchpad-guide"
]);

export const demoStepCount = (demo) => Math.max(0, demo?.steps?.length || 0);

const exactDemo = (caption, steps) => ({ type: "script", caption, steps });

const buildDemo = ({ title, target, effect, caption, kind = "click", menu = null, submenu = null, optionTarget = null }) => {
  const steps = [
    { action: "announce", text: `Observe como realizar a ação: ${title.toLocaleLowerCase("pt-BR")}.` },
    { action: "move", target, duration: 520 },
    { action: "highlight", target, duration: 220 }
  ];
  if (menu) {
    steps.push({ action: "open-menu", target, menu }, { action: "wait", duration: 1000 });
    if (submenu) steps.push({ action: "open-submenu", target: submenu.target, menu: submenu.menu }, { action: "wait", duration: 1000 });
    steps.push(
      { action: "move", target: optionTarget, duration: 420 },
      { action: "highlight", target: optionTarget, duration: 500 },
      { action: "select-option", target: optionTarget, effect },
      { action: "wait", duration: 350 }
    );
  } else if (kind === "type") {
    steps.push(
      { action: "click", target },
      { action: "type", target, effect },
      { action: "highlight", target, duration: 500 },
      { action: "wait", duration: 350 }
    );
  } else if (kind === "key") {
    steps.push(
      { action: "click", target },
      { action: "key", target, key: effect.payload?.key, effect },
      { action: "highlight", target, duration: 500 },
      { action: "wait", duration: 350 }
    );
  } else {
    steps.push(
      { action: kind === "double-click" ? "double-click" : "click", target, effect },
      { action: "highlight", target, duration: 500 },
      { action: "wait", duration: 350 }
    );
  }
  steps.push({ action: "announce", text: caption });
  return exactDemo(caption, steps);
};

const lesson = ({ id, module, title, objective, explanation, target, event, caption, question, practice, demoKind, menu, submenu, optionTarget, demo }) => Object.freeze({
  id,
  module,
  title,
  objective,
  explanation,
  demo: demo || buildDemo({ title, target, effect: event, caption, kind: demoKind, menu, submenu, optionTarget }),
  question: Object.freeze({ ...question, options: Object.freeze(question.options) }),
  practice: Object.freeze({
    instruction: practice.instruction,
    expectedAction: event.type,
    expectedPayload: practice.expectedPayload === null ? undefined : event.payload ? Object.freeze(event.payload) : undefined,
    successMessage: practice.successMessage,
    keyboardAid: practice.keyboardAid || null
  })
});

const q = (prompt, correct, wrong1, wrong2, wrong3, explanation, hint) => ({
  prompt,
  options: [correct, wrong1, wrong2, wrong3],
  answer: 0,
  explanation,
  hint
});

const M1 = "Módulo 1 — Conhecendo o Google Planilhas";
const M2 = "Módulo 2 — Digitação e navegação";
const M3 = "Módulo 3 — Seleção e organização";
const M4 = "Módulo 4 — Formatação";
const M5 = "Módulo 5 — Estrutura, números e fórmulas";

export const googleSheetsLessons = Object.freeze([
  lesson({ id: 1, module: M1, title: "O que é o Google Planilhas", objective: "Reconhecer o aplicativo usado para criar e organizar planilhas.", explanation: "O Google Planilhas organiza informações em células distribuídas por linhas e colunas.", target: "sheets-mark", event: { type: "app:identify" }, caption: "O ícone verde identifica o Google Planilhas.", question: q("Para que serve o Google Planilhas?", "Organizar dados em tabelas", "Criar apresentações", "Editar vídeos", "Compactar arquivos", "Ele permite organizar e calcular informações em células.", "Observe a grade formada por linhas e colunas."), practice: { instruction: "Clique no ícone verde do Google Planilhas.", successMessage: "Você reconheceu o Google Planilhas." } }),
  lesson({ id: 2, module: M1, title: "Reconhecer as linhas", objective: "Identificar as linhas horizontais numeradas da planilha.", explanation: "As linhas atravessam a planilha horizontalmente e são identificadas por números.", target: "row-header-1", event: { type: "row:identify", payload: { row: 1 } }, caption: "O número 1 identifica a primeira linha.", question: q("Como as linhas são identificadas?", "Por números", "Por letras", "Por cores", "Por símbolos", "Os números aparecem no lado esquerdo da grade.", "Olhe para a margem esquerda da planilha."), practice: { instruction: "Clique no número da linha 1.", successMessage: "Você identificou uma linha." } }),
  lesson({ id: 3, module: M1, title: "Reconhecer as colunas", objective: "Identificar as colunas verticais nomeadas por letras.", explanation: "As colunas atravessam a planilha verticalmente e são identificadas por letras.", target: "column-header-A", event: { type: "column:identify", payload: { column: "A" } }, caption: "A letra A identifica a primeira coluna.", question: q("Como as colunas são identificadas?", "Por letras", "Por números", "Por datas", "Por cores", "As letras aparecem na parte superior da grade.", "Olhe para o cabeçalho acima das células."), practice: { instruction: "Clique na letra A da primeira coluna.", successMessage: "Você identificou uma coluna." } }),
  lesson({ id: 4, module: M1, title: "Entender células e endereços", objective: "Relacionar uma célula ao encontro entre uma coluna e uma linha.", explanation: "O endereço combina a letra da coluna e o número da linha. B3 fica na coluna B e na linha 3.", target: "cell-B3", event: { type: "cell:identify", payload: { cell: "B3" } }, caption: "A célula B3 está no encontro da coluna B com a linha 3.", question: q("Qual é o endereço da célula na coluna B e linha 3?", "B3", "3B", "B2", "C3", "A letra vem antes do número no endereço.", "Combine a letra da coluna com o número da linha."), practice: { instruction: "Clique na célula B3.", successMessage: "Você encontrou a célula B3." } }),
  lesson({ id: 5, module: M1, title: "Usar a caixa de nome", objective: "Localizar o campo que mostra o endereço da célula ativa.", explanation: "A caixa de nome, à esquerda da barra de fórmulas, exibe o endereço selecionado.", target: "name-box", event: { type: "name-box:identify" }, caption: "A caixa de nome mostra o endereço da célula ativa.", question: q("O que aparece na caixa de nome?", "O endereço da célula ativa", "O nome do professor", "O tamanho da fonte", "A data do arquivo", "Ela exibe algo como A1, B3 ou D8.", "Observe o pequeno campo antes do símbolo fx."), practice: { instruction: "Clique na caixa de nome.", successMessage: "Você localizou a caixa de nome." } }),
  lesson({ id: 6, module: M1, title: "Conhecer a barra de fórmulas", objective: "Identificar onde o conteúdo completo da célula pode ser visto e editado.", explanation: "A barra de fórmulas fica ao lado de fx e mostra o conteúdo ou a fórmula da célula ativa.", target: "formula-bar", event: { type: "formula-bar:identify" }, caption: "A barra de fórmulas mostra e edita o conteúdo da célula.", question: q("Onde uma fórmula pode ser vista por inteiro?", "Na barra de fórmulas", "No título do arquivo", "No menu Ajuda", "No botão Imprimir", "A área ao lado de fx exibe a fórmula da célula ativa.", "Procure o símbolo fx acima da grade."), practice: { instruction: "Clique na barra de fórmulas.", successMessage: "Você encontrou a barra de fórmulas." } }),

  lesson({ id: 7, module: M2, title: "Selecionar uma célula", objective: "Escolher uma célula para trabalhar nela.", explanation: "Clique em uma célula. A borda azul indica onde a próxima ação será aplicada.", target: "cell-C3", event: { type: "cell:select", payload: { cell: "C3" } }, caption: "A borda azul mostra que C3 está ativa.", question: q("Como saber qual célula está ativa?", "Ela fica com borda azul", "Ela desaparece", "A linha fica vermelha", "O arquivo fecha", "A seleção azul marca a célula ativa.", "Observe a borda da célula clicada."), practice: { instruction: "Selecione a célula C3.", successMessage: "Você selecionou C3." } }),
  lesson({ id: 8, module: M2, title: "Digitar texto", objective: "Inserir uma palavra em uma célula vazia.", explanation: "Selecione a célula, comece a digitar e confirme com Enter.", target: "cell-A1", event: { type: "cell:input", payload: { cell: "A1", input: "Aluno" } }, caption: "O texto Aluno foi inserido em A1.", demoKind: "type", question: q("O que fazer antes de digitar em uma célula?", "Selecionar a célula", "Abrir o menu Ajuda", "Imprimir a planilha", "Trocar o zoom", "A seleção define onde o texto será colocado.", "Primeiro escolha a célula desejada."), practice: { instruction: "Digite uma palavra com pelo menos três letras em A1.", expectedPayload: null, successMessage: "Você digitou um texto." } }),
  lesson({ id: 9, module: M2, title: "Digitar números", objective: "Inserir um valor numérico em uma célula.", explanation: "Os números podem ser digitados diretamente e depois usados em cálculos.", target: "cell-B2", event: { type: "cell:input", payload: { cell: "B2", input: "25" } }, caption: "O número 25 foi inserido em B2.", demoKind: "type", question: q("Que tipo de conteúdo pode ser usado em cálculos?", "Número", "Cor de preenchimento", "Borda", "Comentário", "Valores numéricos podem participar de fórmulas.", "Pense no conteúdo que pode ser somado."), practice: { instruction: "Digite um número em B2.", expectedPayload: null, successMessage: "Você digitou um número." } }),
  lesson({ id: 10, module: M2, title: "Editar o conteúdo de uma célula", objective: "Alterar um conteúdo já existente sem trocar de célula.", explanation: "Dê dois cliques na célula ou use a barra de fórmulas para editar o valor.", target: "cell-A1", event: { type: "cell:edit", payload: { cell: "A1", input: "Aluno" } }, caption: "O conteúdo de A1 foi alterado para Aluno.", demoKind: "double-click", question: q("Como editar rapidamente uma célula preenchida?", "Dando dois cliques nela", "Clicando em Compartilhar", "Mudando o zoom", "Fechando a guia", "Dois cliques abrem a edição do conteúdo.", "Use o mesmo gesto empregado para editar textos."), practice: { instruction: "Edite o conteúdo de A1 para outro texto.", expectedPayload: null, successMessage: "Você editou a célula." } }),
  lesson({ id: 11, module: M2, title: "Apagar conteúdo", objective: "Limpar uma célula sem remover a linha ou a coluna.", explanation: "Selecione a célula e pressione Backspace para apagar somente seu conteúdo.", target: "cell-B2", event: { type: "cell:clear", payload: { cell: "B2" } }, caption: "O conteúdo de B2 foi apagado e a célula permaneceu na grade.", demoKind: "key", question: q("O que acontece ao apagar o conteúdo?", "A célula fica vazia", "A coluna inteira some", "A planilha fecha", "Uma nova aba é criada", "Apagar conteúdo não remove a estrutura da planilha.", "A célula continua no mesmo lugar."), practice: { instruction: "Selecione B2 e pressione Backspace ou Delete.", successMessage: "Você apagou o conteúdo." } }),
  lesson({ id: 12, module: M2, title: "Navegar com setas, Tab e Enter", objective: "Mover a seleção pela grade usando o teclado do Chromebook.", explanation: "As setas movem uma célula, Tab avança para a direita e Enter avança para baixo.", target: "cell-A1", event: { type: "navigation:key", payload: { key: "ArrowRight" } }, caption: "Setas, Tab e Enter movimentam a célula ativa.", demo: exactDemo("Setas, Tab e Enter movimentam a célula ativa.", [
    { action: "announce", text: "Selecione A1 e observe o teclado do Chromebook." },
    { action: "move", target: "cell-A1", duration: 420 },
    { action: "click", target: "cell-A1", effect: { type: "cell:select", payload: { cell: "A1" } } },
    { action: "highlight", target: "keyboard-guide", duration: 500 },
    { action: "key", target: "cell-A1", key: "ArrowRight", effect: { type: "navigation:key", payload: { key: "ArrowRight" } } },
    { action: "key", target: "cell-B1", key: "Tab", effect: { type: "navigation:key", payload: { key: "Tab" } } },
    { action: "key", target: "cell-C1", key: "Enter", effect: { type: "navigation:key", payload: { key: "Enter" } } },
    { action: "wait", duration: 350 },
    { action: "announce", text: "A seleção percorreu a grade sem usar o touchpad." }
  ]), question: q("Qual tecla normalmente move a seleção para baixo?", "Enter", "Esc", "Caps Lock", "Alt", "Enter confirma e avança para a linha seguinte.", "É a tecla usada para confirmar uma digitação."), practice: { instruction: "Use uma seta, depois Tab e Enter para mover a seleção.", expectedPayload: null, successMessage: "Você navegou usando o teclado.", keyboardAid: "keyboard" } }),

  lesson({ id: 13, module: M3, title: "Selecionar uma linha inteira", objective: "Selecionar todas as células de uma linha.", explanation: "Clique no número da linha para selecionar toda a faixa horizontal.", target: "row-header-1", event: { type: "row:select", payload: { row: 1 } }, caption: "A linha 1 inteira ficou selecionada.", question: q("Onde clicar para selecionar a linha inteira?", "No número da linha", "Na letra da coluna", "No símbolo fx", "No título do arquivo", "O cabeçalho numérico representa a linha completa.", "Use a margem esquerda da grade."), practice: { instruction: "Selecione toda a linha 1.", successMessage: "Você selecionou uma linha inteira." } }),
  lesson({ id: 14, module: M3, title: "Selecionar uma coluna inteira", objective: "Selecionar todas as células de uma coluna.", explanation: "Clique na letra da coluna para selecionar toda a faixa vertical.", target: "column-header-A", event: { type: "column:select", payload: { column: "A" } }, caption: "A coluna A inteira ficou selecionada.", question: q("Onde clicar para selecionar uma coluna inteira?", "Na letra da coluna", "No número da linha", "Na barra de fórmulas", "No menu Arquivo", "O cabeçalho com letras representa as colunas.", "Use a parte superior da grade."), practice: { instruction: "Selecione toda a coluna A.", successMessage: "Você selecionou uma coluna inteira." } }),
  lesson({ id: 15, module: M3, title: "Selecionar um intervalo", objective: "Selecionar várias células vizinhas formando um retângulo.", explanation: "Clique e arraste da primeira até a última célula. O intervalo A1:C3 reúne nove células.", target: "cell-A1", event: { type: "range:select", payload: { start: "A1", end: "C3" } }, caption: "O intervalo A1:C3 foi selecionado como um bloco.", question: q("Como é escrito um intervalo de A1 até C3?", "A1:C3", "A1-C3", "A1+C3", "A1/C3", "Dois-pontos separam o início e o fim do intervalo.", "Procure a notação usada nas fórmulas."), practice: { instruction: "Arraste de A1 até C3 para selecionar o intervalo.", successMessage: "Você selecionou A1:C3." } }),
  lesson({ id: 16, module: M3, title: "Selecionar células separadas com Ctrl+clique", objective: "Adicionar células não vizinhas à seleção usando o teclado e o touchpad.", explanation: "Mantenha Ctrl pressionado e clique em outras células para criar uma seleção múltipla.", target: "cell-A1", event: { type: "multi:select", payload: { cell: "C3", ctrlKey: true } }, caption: "Ctrl+clique adicionou uma célula separada à seleção.", question: q("Qual tecla mantém células separadas selecionadas?", "Ctrl", "Esc", "Caps Lock", "Backspace", "Ctrl permite adicionar novas células à seleção.", "Observe a tecla destacada no guia do Chromebook."), practice: { instruction: "Selecione A1 e use Ctrl+clique em C3.", expectedPayload: null, successMessage: "Você criou uma seleção múltipla.", keyboardAid: "touchpad" } }),
  lesson({ id: 17, module: M3, title: "Copiar e colar", objective: "Duplicar o conteúdo de uma célula em outro local.", explanation: "Use Ctrl+C para copiar, escolha o destino e use Ctrl+V para colar.", target: "cell-A1", event: { type: "clipboard:paste", payload: { target: "B1", mode: "copy" } }, caption: "O conteúdo de A1 foi copiado para B1.", demo: exactDemo("O conteúdo de A1 foi copiado para B1.", [
    { action: "announce", text: "Selecione A1 e copie com Ctrl+C." }, { action: "move", target: "cell-A1", duration: 420 },
    { action: "click", target: "cell-A1", effect: { type: "cell:select", payload: { cell: "A1" } } },
    { action: "key", target: "cell-A1", key: "Ctrl+C", effect: { type: "clipboard:copy" } },
    { action: "move", target: "cell-B1", duration: 320 }, { action: "click", target: "cell-B1", effect: { type: "cell:select", payload: { cell: "B1" } } },
    { action: "key", target: "cell-B1", key: "Ctrl+V", effect: { type: "clipboard:paste", payload: { target: "B1", mode: "copy" } } },
    { action: "wait", duration: 350 }, { action: "announce", text: "O original continua em A1 e a cópia aparece em B1." }
  ]), question: q("Qual atalho cola o conteúdo copiado?", "Ctrl+V", "Ctrl+C", "Ctrl+Z", "Ctrl+P", "Ctrl+V coloca o conteúdo no destino.", "Copiar é Ctrl+C; o outro atalho cola."), practice: { instruction: "Copie A1 e cole em B1 usando Ctrl+C e Ctrl+V.", expectedPayload: null, successMessage: "Você copiou e colou o conteúdo.", keyboardAid: "keyboard" } }),
  lesson({ id: 18, module: M3, title: "Recortar e colar", objective: "Mover o conteúdo de uma célula para outra.", explanation: "Use Ctrl+X para recortar e Ctrl+V para colar no novo local.", target: "cell-A1", event: { type: "clipboard:paste", payload: { target: "B1", mode: "cut" } }, caption: "O conteúdo saiu de A1 e foi movido para B1.", demo: exactDemo("O conteúdo saiu de A1 e foi movido para B1.", [
    { action: "announce", text: "Selecione A1 e recorte com Ctrl+X." }, { action: "move", target: "cell-A1", duration: 420 },
    { action: "click", target: "cell-A1", effect: { type: "cell:select", payload: { cell: "A1" } } },
    { action: "key", target: "cell-A1", key: "Ctrl+X", effect: { type: "clipboard:cut" } },
    { action: "move", target: "cell-B1", duration: 320 }, { action: "click", target: "cell-B1", effect: { type: "cell:select", payload: { cell: "B1" } } },
    { action: "key", target: "cell-B1", key: "Ctrl+V", effect: { type: "clipboard:paste", payload: { target: "B1", mode: "cut" } } },
    { action: "wait", duration: 350 }, { action: "announce", text: "Recortar move o conteúdo em vez de duplicá-lo." }
  ]), question: q("Qual atalho recorta o conteúdo?", "Ctrl+X", "Ctrl+C", "Ctrl+V", "Ctrl+A", "Ctrl+X prepara o conteúdo para ser movido.", "A letra X lembra um corte."), practice: { instruction: "Recorte A1 e cole em B1 usando Ctrl+X e Ctrl+V.", expectedPayload: null, successMessage: "Você recortou e colou o conteúdo.", keyboardAid: "keyboard" } }),

  lesson({ id: 19, module: M4, title: "Aplicar negrito, itálico e sublinhado", objective: "Combinar os três estilos básicos de destaque.", explanation: "Os botões B, I e S alteram a aparência do conteúdo selecionado.", target: "bold", event: { type: "format:style", payload: { style: "bold", enabled: true } }, caption: "Negrito, itálico e sublinhado foram aplicados.", demo: exactDemo("Negrito, itálico e sublinhado foram aplicados.", [
    { action: "announce", text: "Selecione A1 e use os três controles de estilo." },
    { action: "move", target: "bold", duration: 420 }, { action: "click", target: "bold", effect: { type: "format:style", payload: { style: "bold", enabled: true } } },
    { action: "move", target: "italic", duration: 260 }, { action: "click", target: "italic", effect: { type: "format:style", payload: { style: "italic", enabled: true } } },
    { action: "move", target: "underline", duration: 260 }, { action: "click", target: "underline", effect: { type: "format:style", payload: { style: "underline", enabled: true } } },
    { action: "wait", duration: 350 }, { action: "announce", text: "Cada botão controla um estilo independente." }
  ]), question: q("Qual botão deixa o texto mais espesso?", "Negrito", "Alinhamento", "Borda", "Porcentagem", "O botão B aplica negrito.", "Procure a letra B na barra."), practice: { instruction: "Aplique negrito, itálico e sublinhado em A1.", expectedPayload: null, successMessage: "Você aplicou os três estilos." } }),
  lesson({ id: 20, module: M4, title: "Alterar o tamanho da fonte", objective: "Aumentar o tamanho do conteúdo selecionado.", explanation: "O campo numérico da barra define o tamanho da fonte.", target: "font-size", event: { type: "format:font-size", payload: { size: 14 } }, caption: "O tamanho da fonte foi alterado para 14.", question: q("Qual controle aumenta a altura das letras?", "Tamanho da fonte", "Zoom", "Moeda", "Borda", "O campo de tamanho controla as letras da célula.", "Na referência ele mostra o número 10."), practice: { instruction: "Altere o tamanho da fonte de A1 para 14.", successMessage: "Você mudou o tamanho da fonte." } }),
  lesson({ id: 21, module: M4, title: "Alterar a cor do texto", objective: "Aplicar uma cor às letras da célula.", explanation: "O botão A sublinhado por uma cor abre a paleta de cor do texto.", target: "text-color", menu: "text-color", optionTarget: "text-color-blue", event: { type: "format:text-color", payload: { color: "#1a73e8" } }, caption: "O texto recebeu a cor azul.", question: q("Qual controle muda a cor das letras?", "Cor do texto", "Preenchimento", "Borda", "Zoom", "A letra A com traço colorido controla a cor do texto.", "Procure o ícone A na barra."), practice: { instruction: "Aplique a cor azul ao texto de A1.", successMessage: "Você alterou a cor do texto." } }),
  lesson({ id: 22, module: M4, title: "Alterar a cor de preenchimento", objective: "Colorir o fundo de uma célula.", explanation: "O balde de tinta abre a paleta usada para preencher a célula.", target: "fill-color", menu: "fill-color", optionTarget: "fill-yellow", event: { type: "format:fill-color", payload: { color: "#fce8b2" } }, caption: "O fundo de A1 recebeu um preenchimento amarelo-claro.", question: q("O que a cor de preenchimento altera?", "O fundo da célula", "A letra da coluna", "O nome do arquivo", "A altura da linha", "O preenchimento colore a área interna da célula.", "Pense no balde de tinta."), practice: { instruction: "Aplique o preenchimento amarelo-claro em A1.", successMessage: "Você coloriu o fundo da célula." } }),
  lesson({ id: 23, module: M4, title: "Alinhar conteúdo", objective: "Centralizar o conteúdo dentro da célula.", explanation: "O alinhamento posiciona o conteúdo à esquerda, ao centro ou à direita.", target: "align", menu: "align", optionTarget: "align-center", event: { type: "format:align", payload: { align: "center" } }, caption: "O conteúdo de A1 foi centralizado.", question: q("Qual alinhamento coloca o conteúdo no meio?", "Centralizado", "À esquerda", "À direita", "Inferior", "O alinhamento centralizado equilibra o espaço dos dois lados.", "Observe o ícone com linhas centralizadas."), practice: { instruction: "Centralize o conteúdo de A1.", successMessage: "Você centralizou o conteúdo." } }),
  lesson({ id: 24, module: M4, title: "Aplicar bordas", objective: "Destacar os limites das células selecionadas.", explanation: "O botão Bordas permite aplicar contornos ao redor das células.", target: "borders", menu: "borders", optionTarget: "border-all", event: { type: "format:border", payload: { border: "all" } }, caption: "Todas as bordas foram aplicadas ao intervalo.", question: q("Para que servem as bordas?", "Destacar os limites das células", "Calcular uma média", "Renomear o arquivo", "Mudar o zoom", "As bordas deixam a estrutura da tabela mais visível.", "Elas desenham contornos ao redor das células."), practice: { instruction: "Aplique todas as bordas em A1:C3.", successMessage: "Você aplicou bordas." } }),

  lesson({ id: 25, module: M5, title: "Inserir linha e coluna", objective: "Adicionar espaço novo à estrutura da planilha.", explanation: "O menu Inserir permite criar uma linha acima e uma coluna à esquerda.", target: "insert-menu", menu: "insert", optionTarget: "insert-row", event: { type: "sheet:insert", payload: { kind: "row" } }, caption: "Uma nova linha e uma nova coluna foram inseridas.", demo: exactDemo("Uma nova linha e uma nova coluna foram inseridas.", [
    { action: "announce", text: "Abra Inserir e escolha uma nova linha." }, { action: "move", target: "insert-menu", duration: 420 },
    { action: "highlight", target: "insert-menu", duration: 220 }, { action: "open-menu", target: "insert-menu", menu: "insert" }, { action: "wait", duration: 1000 },
    { action: "move", target: "insert-row", duration: 320 }, { action: "highlight", target: "insert-row", duration: 500 }, { action: "select-option", target: "insert-row", effect: { type: "sheet:insert", payload: { kind: "row" } } }, { action: "wait", duration: 350 },
    { action: "open-menu", target: "insert-menu", menu: "insert" }, { action: "wait", duration: 1000 },
    { action: "move", target: "insert-column", duration: 320 }, { action: "highlight", target: "insert-column", duration: 500 }, { action: "select-option", target: "insert-column", effect: { type: "sheet:insert", payload: { kind: "column" } } }, { action: "wait", duration: 350 },
    { action: "announce", text: "A grade ganhou espaço sem apagar o conteúdo existente." }
  ]), question: q("Em qual menu ficam os comandos para adicionar linhas e colunas?", "Inserir", "Ajuda", "Extensões", "Ferramentas", "O menu Inserir reúne mudanças na estrutura da planilha.", "O nome do menu descreve a ação."), practice: { instruction: "Insira uma linha e uma coluna usando o menu Inserir.", expectedPayload: null, successMessage: "Você inseriu uma linha e uma coluna." } }),
  lesson({ id: 26, module: M5, title: "Formatar valores como moeda", objective: "Exibir um número como valor em reais.", explanation: "O formato Moeda acrescenta o símbolo R$ e duas casas decimais.", target: "format-menu", menu: "format", submenu: { target: "number-submenu", menu: "number" }, optionTarget: "number-currency", event: { type: "format:number", payload: { format: "currency" } }, caption: "O valor foi exibido no formato R$ 25,00.", question: q("Qual formato é adequado para preços?", "Moeda", "Porcentagem", "Texto simples", "Data", "Moeda mostra valores financeiros com o símbolo correspondente.", "Pense em como um preço aparece."), practice: { instruction: "Formate B2 como moeda.", successMessage: "Você aplicou o formato de moeda." } }),
  lesson({ id: 27, module: M5, title: "Formatar valores como porcentagem", objective: "Exibir um número decimal no formato percentual.", explanation: "O formato Porcentagem transforma 0,25 em 25%.", target: "format-menu", menu: "format", submenu: { target: "number-submenu", menu: "number" }, optionTarget: "number-percent", event: { type: "format:number", payload: { format: "percent" } }, caption: "O valor 0,25 passou a aparecer como 25%.", question: q("Como 0,25 aparece no formato Porcentagem?", "25%", "0,25%", "250%", "R$ 0,25", "O formato multiplica a exibição decimal por cem.", "Um quarto corresponde a vinte e cinco por cento."), practice: { instruction: "Formate B2 como porcentagem.", successMessage: "Você aplicou o formato de porcentagem." } }),
  lesson({ id: 28, module: M5, title: "Criar uma fórmula aritmética simples", objective: "Multiplicar valores usando referências de células.", explanation: "Toda fórmula começa com =. A expressão =B2*C2 multiplica os valores de B2 e C2.", target: "formula-bar", event: { type: "formula:input", payload: { cell: "D2", input: "=B2*C2" } }, caption: "D2 calculou o produto de B2 por C2.", demoKind: "type", question: q("Qual símbolo inicia uma fórmula?", "=", "+", "%", ":", "O sinal de igual informa que o conteúdo deve ser calculado.", "Ele aparece antes de B2*C2."), practice: { instruction: "Selecione D2 e digite =B2*C2 na barra de fórmulas.", successMessage: "Você criou uma multiplicação." } }),
  lesson({ id: 29, module: M5, title: "Usar SOMA", objective: "Somar os números de um intervalo.", explanation: "A fórmula =SOMA(B2:B4) adiciona todos os valores entre B2 e B4.", target: "formula-bar", event: { type: "formula:input", payload: { cell: "B5", input: "=SOMA(B2:B4)" } }, caption: "B5 mostrou a soma dos três valores.", demoKind: "type", question: q("Qual fórmula soma B2 até B4?", "=SOMA(B2:B4)", "=MÉDIA(B2:B4)", "=B2-B4", "SOMA(B2+B4)", "SOMA usa dois-pontos para indicar o intervalo.", "A fórmula começa com = e usa o intervalo B2:B4."), practice: { instruction: "Em B5, digite =SOMA(B2:B4).", successMessage: "Você calculou a soma." } }),
  lesson({ id: 30, module: M5, title: "Usar MÉDIA", objective: "Calcular a média dos números de um intervalo.", explanation: "A fórmula =MÉDIA(C2:C4) soma os valores e divide pela quantidade de células.", target: "formula-bar", event: { type: "formula:input", payload: { cell: "C5", input: "=MÉDIA(C2:C4)" } }, caption: "C5 mostrou a média dos três valores.", demoKind: "type", question: q("Qual fórmula calcula a média de C2 até C4?", "=MÉDIA(C2:C4)", "=SOMA(C2:C4)", "=C2*C4", "MÉDIA(C2+C4)", "MÉDIA calcula o valor médio do intervalo informado.", "Use dois-pontos para incluir as células entre C2 e C4."), practice: { instruction: "Em C5, digite =MÉDIA(C2:C4).", successMessage: "Você calculou a média." } })
]);

export const googleSheetsFinalChallenge = Object.freeze({
  title: "Monte uma planilha de materiais",
  description: "Organize produtos, quantidades e preços. Formate a tabela e use fórmulas para calcular os resultados.",
  goals: Object.freeze([
    { id: "headings", label: "Digite os cabeçalhos Produto, Quantidade, Preço e Total em A1:D1." },
    { id: "data", label: "Preencha duas linhas com produtos, quantidades e preços." },
    { id: "bold", label: "Deixe os quatro cabeçalhos em negrito." },
    { id: "fill", label: "Aplique uma cor de preenchimento aos cabeçalhos." },
    { id: "borders", label: "Aplique todas as bordas no intervalo A1:D3." },
    { id: "alignment", label: "Centralize os cabeçalhos." },
    { id: "currency", label: "Formate os preços em C2:C3 como moeda." },
    { id: "percent", label: "Digite uma taxa decimal em qualquer célula e formate-a como porcentagem." },
    { id: "multiply", label: "Calcule pelo menos um total com uma multiplicação entre células." },
    { id: "functions", label: "Use uma fórmula SOMA e uma fórmula MÉDIA." }
  ])
});
