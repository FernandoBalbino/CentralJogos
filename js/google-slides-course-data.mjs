export const GOOGLE_SLIDES_COURSE_DATA_VERSION = 3;

export const GOOGLE_SLIDES_DEMO_TYPES = Object.freeze(["script", "webm"]);

export const GOOGLE_SLIDES_DEMO_ACTIONS = Object.freeze([
  "move", "click", "double-click", "drag", "select-text", "type",
  "open-menu", "select-option", "wait", "highlight", "announce"
]);

export const GOOGLE_SLIDES_DEMO_TARGETS = Object.freeze([
  "slides-mark", "slide-canvas", "thumbnails-panel", "new-slide",
  "slide-thumb-1", "slide-thumb-2", "slide-menu", "delete-slide",
  "duplicate-slide", "reorder-slide", "title-placeholder", "body-placeholder",
  "text-element-1", "format-menu", "format-text", "format-size", "font-size-field",
  "font-size-increase", "font-size-decrease", "font-family", "font-verdana", "bold",
  "italic", "underline", "text-color", "text-color-blue", "text-align", "align-center",
  "layout", "layout-title-body", "background", "background-yellow", "background-done",
  "theme", "theme-dourado", "insert-menu", "insert-image", "image-upload", "insert-shape",
  "shape-category", "shape-rectangle", "text-box", "line", "line-arrow", "image-resize",
  "image-move", "transition", "transition-dissolve", "animate", "add-animation", "comment",
  "comment-field", "comment-submit", "share", "present"
]);

export const GOOGLE_SLIDES_PRACTICE_ACTIONS = Object.freeze([
  "app:identify", "canvas:focus", "thumbnails:focus", "slide:create", "slide:select",
  "slide:delete", "slide:duplicate", "slide:reorder", "text:title", "text:create",
  "text:select", "text:font-size", "text:font", "text:style", "text:color",
  "text:align", "layout:change", "background:change", "theme:change", "image:insert",
  "image:resize", "image:move", "shape:insert", "textbox:insert", "line:insert",
  "transition:change", "animation:add", "comment:add", "share:open", "presentation:start"
]);

export const demoStepCount = (demo) => demo?.type === "script"
  ? Math.max(0, demo.steps?.length || 0)
  : demo?.type === "webm" ? 1 : 0;

const scriptedDemo = ({ caption, target, effect, menu = null, optionTarget = null, announcement, preSteps = [] }) => {
  const steps = [{ action: "announce", text: announcement }];
  steps.push(...preSteps);
  if (menu) {
    steps.push(
      { action: "move", target, duration: 520 },
      { action: "open-menu", target, menu },
      { action: "move", target: optionTarget, duration: 420 },
      { action: "select-option", target: optionTarget, effect }
    );
  } else {
    steps.push(
      { action: "move", target, duration: 560 },
      { action: "click", target, effect },
      { action: "highlight", target, duration: 700 }
    );
  }
  steps.push({ action: "announce", text: caption });
  return { type: "script", caption, steps };
};

const exactDemo = (caption, steps) => ({ type: "script", caption, steps });

const lesson = ({ id, module, title, objective, explanation, target, event, caption, question, practice, menu, optionTarget, preSteps, demo }) => Object.freeze({
  id,
  module,
  title,
  objective,
  explanation,
  demo: demo || scriptedDemo({
    caption,
    target,
    effect: event,
    menu,
    optionTarget,
    preSteps,
    announcement: `Observe como realizar a ação: ${title.toLocaleLowerCase("pt-BR")}.`
  }),
  question: Object.freeze({ ...question, options: Object.freeze(question.options) }),
  practice: Object.freeze({
    instruction: practice.instruction,
    expectedAction: event.type,
    expectedPayload: practice.expectedPayload === null ? undefined : event.payload ? Object.freeze(event.payload) : undefined,
    successMessage: practice.successMessage
  })
});

const M1 = "Módulo 1 — Conhecendo o Google Apresentações";
const M2 = "Módulo 2 — Texto";
const M3 = "Módulo 3 — Organização dos slides";
const M4 = "Módulo 4 — Elementos visuais";
const M5 = "Módulo 5 — Apresentação";

export const googleSlidesLessons = Object.freeze([
  lesson({
    id: 1, module: M1, title: "O que é o Google Apresentações",
    objective: "Reconhecer o aplicativo usado para criar apresentações com slides.",
    explanation: "O Google Apresentações organiza ideias em slides com textos, imagens e outros elementos.",
    target: "slides-mark", event: { type: "app:identify" }, caption: "O ícone amarelo identifica o Google Apresentações.",
    question: { prompt: "Para que serve o Google Apresentações?", options: ["Criar apresentações em slides", "Editar planilhas", "Enviar e-mails", "Compactar arquivos"], answer: 0, explanation: "Ele é usado para criar e apresentar conteúdos em slides.", hint: "Pense no tipo de arquivo exibido na área central." },
    practice: { instruction: "Clique no ícone amarelo do Google Apresentações.", successMessage: "Você reconheceu o Google Apresentações." }
  }),
  lesson({
    id: 2, module: M1, title: "Identificar a área do slide",
    objective: "Identificar onde o conteúdo da apresentação é criado.", explanation: "A área branca no centro é o slide. É nela que você organiza títulos, textos e imagens.",
    target: "slide-canvas", event: { type: "canvas:focus" }, caption: "A área branca central é o espaço de criação do slide.",
    question: { prompt: "Onde você cria títulos, textos e imagens?", options: ["Na área do slide", "No painel de miniaturas", "Na barra de menus", "No botão Compartilhar"], answer: 0, explanation: "A área branca no centro é o espaço de criação do slide.", hint: "Observe novamente qual área grande ficou destacada." },
    practice: { instruction: "Clique na área branca do slide.", successMessage: "Você identificou a área do slide." }
  }),
  lesson({
    id: 3, module: M1, title: "Painel de miniaturas",
    objective: "Reconhecer o painel que mostra a sequência dos slides.", explanation: "As miniaturas à esquerda mostram a ordem dos slides e permitem selecioná-los.",
    target: "thumbnails-panel", event: { type: "thumbnails:focus" }, caption: "O painel esquerdo mostra pequenas versões de todos os slides.",
    question: { prompt: "O que aparece no painel de miniaturas?", options: ["A sequência dos slides", "A lista de fontes", "Os comentários", "Os arquivos apagados"], answer: 0, explanation: "As miniaturas representam os slides na ordem da apresentação.", hint: "Observe as pequenas páginas numeradas no lado esquerdo." },
    practice: { instruction: "Clique no painel de miniaturas.", successMessage: "Você localizou o painel de miniaturas." }
  }),
  lesson({
    id: 4, module: M1, title: "Criar um novo slide",
    objective: "Adicionar um slide à apresentação usando o botão +.", explanation: "O botão + cria um novo slide e adiciona uma miniatura ao painel esquerdo.",
    target: "new-slide", event: { type: "slide:create" }, caption: "O botão + criou e selecionou um novo slide.",
    question: { prompt: "Qual botão cria um novo slide?", options: ["Tema", "+", "Transição", "Plano de fundo"], answer: 1, explanation: "O botão + adiciona um novo slide à apresentação.", hint: "Observe novamente o primeiro botão da barra de ferramentas." },
    practice: { instruction: "Adicione um novo slide.", successMessage: "Você criou um novo slide." }
  }),
  lesson({
    id: 5, module: M1, title: "Selecionar um slide",
    objective: "Escolher um slide pelo painel de miniaturas.", explanation: "Clique em uma miniatura para escolher qual slide será editado.",
    target: "slide-thumb-2", event: { type: "slide:select", payload: { id: "slide-2" } }, caption: "A borda azul mostra que o segundo slide está selecionado.",
    question: { prompt: "Como escolher um slide para editar?", options: ["Clicando na miniatura", "Clicando em Ajuda", "Mudando o zoom", "Fechando a página"], answer: 0, explanation: "A miniatura seleciona o slide correspondente.", hint: "Observe onde apareceu a borda azul." },
    practice: { instruction: "Selecione o segundo slide.", successMessage: "Você selecionou o segundo slide." }
  }),
  lesson({
    id: 6, module: M1, title: "Excluir um slide",
    objective: "Remover um slide selecionado pelo menu Slide.", explanation: "Selecione a miniatura e use Slide → Excluir slide para remover somente aquele slide.",
    target: "slide-menu", menu: "slide", optionTarget: "delete-slide", preSteps: [{ action: "move", target: "slide-thumb-2", duration: 420 }, { action: "click", target: "slide-thumb-2", effect: { type: "slide:select", payload: { id: "slide-2" } } }], event: { type: "slide:delete", payload: { deletedSlideId: "slide-2" } }, caption: "O segundo slide foi removido pelo comando Excluir slide.",
    question: { prompt: "Em qual menu está o comando Excluir slide?", options: ["Formatar", "Ferramentas", "Slide", "Ajuda"], answer: 2, explanation: "O comando Excluir slide fica dentro do menu Slide.", hint: "Observe novamente o nome do menu aberto." },
    practice: { instruction: "Selecione e exclua o segundo slide.", successMessage: "Você excluiu o segundo slide." }
  }),
  lesson({
    id: 7, module: M2, title: "Adicionar título",
    objective: "Preencher o espaço de título do slide digitando o próprio conteúdo.", explanation: "Clique no campo maior, digite o título e clique fora do campo para concluir a edição.",
    target: "title-placeholder", event: { type: "text:title", payload: { value: "Minha apresentação" } }, caption: "O título Minha apresentação foi inserido no slide.",
    demo: exactDemo("O título Minha apresentação foi digitado no campo de título.", [
      { action: "announce", text: "Clique no campo de título para posicionar o cursor." },
      { action: "move", target: "title-placeholder", duration: 520 },
      { action: "click", target: "title-placeholder" },
      { action: "type", target: "title-placeholder", effect: { type: "text:title", payload: { value: "Minha apresentação" } } },
      { action: "highlight", target: "title-placeholder", duration: 650 },
      { action: "announce", text: "O texto digitado aparece no slide e é salvo automaticamente." }
    ]),
    question: { prompt: "Qual campo recebe o assunto principal do slide?", options: ["Título", "Zoom", "Tema", "Miniatura"], answer: 0, explanation: "O campo de título apresenta o assunto principal.", hint: "Observe o campo maior no centro do slide." },
    practice: { instruction: "Clique no título, digite pelo menos três caracteres e clique fora do campo.", expectedPayload: null, successMessage: "Você digitou e adicionou um título." }
  }),
  lesson({
    id: 8, module: M2, title: "Adicionar texto",
    objective: "Inserir uma informação no campo de texto digitando o próprio conteúdo.", explanation: "Clique no campo de corpo, digite uma frase e clique fora do campo para concluir a edição.",
    target: "body-placeholder", event: { type: "text:create", payload: { value: "Conteúdo da aula" } }, caption: "Um texto foi adicionado abaixo do título.",
    demo: exactDemo("A frase Conteúdo da aula foi digitada no campo de corpo.", [
      { action: "announce", text: "Clique no campo de corpo para começar a escrever." },
      { action: "move", target: "body-placeholder", duration: 520 },
      { action: "click", target: "body-placeholder" },
      { action: "type", target: "body-placeholder", effect: { type: "text:create", payload: { value: "Conteúdo da aula" } } },
      { action: "highlight", target: "text-element-1", duration: 650 },
      { action: "announce", text: "O conteúdo digitado foi adicionado ao slide." }
    ]),
    question: { prompt: "Onde inserir uma explicação abaixo do título?", options: ["No campo de texto", "No botão Compartilhar", "No zoom", "No menu Ajuda"], answer: 0, explanation: "O campo de texto guarda as informações do slide.", hint: "Observe o campo menor abaixo do título." },
    practice: { instruction: "Clique no campo de texto, digite uma frase e clique fora do campo.", expectedPayload: null, successMessage: "Você digitou e adicionou um texto." }
  }),
  lesson({
    id: 9, module: M2, title: "Selecionar texto",
    objective: "Selecionar caracteres de um texto antes de formatá-lo.", explanation: "Entre no campo de texto e arraste sobre as palavras ou pressione Ctrl+A para selecionar os caracteres.",
    target: "text-element-1", event: { type: "text:select", payload: { id: "text-1", selectionLength: 16 } }, caption: "Os caracteres selecionados ficaram realçados.",
    demo: exactDemo("O texto foi realmente selecionado antes da formatação.", [
      { action: "announce", text: "Clique duas vezes no texto ou use Ctrl+A dentro do campo." },
      { action: "move", target: "text-element-1", duration: 520 },
      { action: "double-click", target: "text-element-1" },
      { action: "select-text", target: "text-element-1", effect: { type: "text:select", payload: { id: "text-1", selectionLength: 16 } } },
      { action: "highlight", target: "text-element-1", duration: 650 },
      { action: "announce", text: "Agora os controles de formatação podem alterar o texto selecionado." }
    ]),
    question: { prompt: "O que deve ser feito antes de formatar um texto?", options: ["Selecionar o texto", "Excluir o slide", "Iniciar a apresentação", "Alterar o tema"], answer: 0, explanation: "Primeiro selecione o texto que será modificado.", hint: "Observe qual elemento ganhou a borda azul." },
    practice: { instruction: "Entre no texto e selecione caracteres arrastando ou com Ctrl+A.", expectedPayload: null, successMessage: "Você selecionou os caracteres do texto." }
  }),
  lesson({
    id: 10, module: M2, title: "Alterar tamanho da fonte",
    objective: "Aumentar gradualmente o tamanho do texto selecionado.", explanation: "Na barra de ferramentas, use −, o campo numérico e +. O botão + aumenta a fonte um ponto por vez.",
    target: "font-size-increase", event: { type: "text:font-size", payload: { size: 28 } }, caption: "Quatro cliques em + aumentaram a fonte de 24 para 28.",
    demo: exactDemo("O campo de tamanho chegou a 28 usando o botão +.", [
      { action: "announce", text: "Com o texto selecionado, localize o controle − 24 + na barra." },
      { action: "move", target: "font-size-increase", duration: 520 },
      { action: "click", target: "font-size-increase", effect: { type: "text:font-size", payload: { size: 25 } } },
      { action: "click", target: "font-size-increase", effect: { type: "text:font-size", payload: { size: 26 } } },
      { action: "click", target: "font-size-increase", effect: { type: "text:font-size", payload: { size: 27 } } },
      { action: "click", target: "font-size-increase", effect: { type: "text:font-size", payload: { size: 28 } } },
      { action: "highlight", target: "font-size-field", duration: 650 },
      { action: "announce", text: "O número mostra o tamanho atual da fonte selecionada." }
    ]),
    question: { prompt: "Qual controle deixa as letras maiores?", options: ["Tamanho da fonte", "Plano de fundo", "Transição", "Comentário"], answer: 0, explanation: "O tamanho da fonte controla a altura das letras.", hint: "Observe o número exibido na barra de ferramentas." },
    practice: { instruction: "Aumente o texto para o tamanho 28.", successMessage: "Você alterou o tamanho da fonte." }
  }),
  lesson({
    id: 11, module: M2, title: "Alterar fonte",
    objective: "Trocar o estilo das letras do texto selecionado.", explanation: "A lista de fontes muda o desenho das letras sem alterar o conteúdo.",
    target: "font-family", menu: "font", optionTarget: "font-verdana", event: { type: "text:font", payload: { font: "Verdana" } }, caption: "A fonte do texto foi alterada para Verdana pela lista da barra de ferramentas.",
    question: { prompt: "O que muda ao escolher outra fonte?", options: ["O desenho das letras", "A ordem dos slides", "O plano de fundo", "O compartilhamento"], answer: 0, explanation: "A fonte define a aparência das letras.", hint: "Observe o nome que mudou na barra de ferramentas." },
    practice: { instruction: "Altere a fonte do texto para Verdana.", successMessage: "Você alterou a fonte." }
  }),
  lesson({
    id: 12, module: M2, title: "Negrito, itálico e sublinhado",
    objective: "Aplicar três estilos de destaque ao texto.", explanation: "Negrito, itálico e sublinhado ajudam a destacar partes importantes.",
    target: "bold", event: { type: "text:style", payload: { style: "bold" } }, caption: "Os botões B, I e U foram acionados separadamente.",
    demo: exactDemo("O texto recebeu negrito, itálico e sublinhado, um controle de cada vez.", [
      { action: "announce", text: "Com o texto selecionado, use os botões B, I e U da barra." },
      { action: "move", target: "bold", duration: 420 },
      { action: "click", target: "bold", effect: { type: "text:style", payload: { style: "bold" } } },
      { action: "move", target: "italic", duration: 300 },
      { action: "click", target: "italic", effect: { type: "text:style", payload: { style: "italic" } } },
      { action: "move", target: "underline", duration: 300 },
      { action: "click", target: "underline", effect: { type: "text:style", payload: { style: "underline" } } },
      { action: "announce", text: "Cada botão controla um estilo independente." }
    ]),
    question: { prompt: "Qual destes recursos destaca a escrita?", options: ["Negrito", "Miniatura", "Transição", "Plano de fundo"], answer: 0, explanation: "Negrito, itálico e sublinhado são estilos de texto.", hint: "Observe os símbolos B, I e U." },
    practice: { instruction: "Use os três botões da barra: B, I e U.", expectedPayload: null, successMessage: "Você aplicou os três estilos separadamente." }
  }),
  lesson({
    id: 13, module: M2, title: "Alterar cor do texto",
    objective: "Aplicar uma nova cor ao texto selecionado.", explanation: "A cor do texto pode destacar palavras e organizar informações.",
    target: "text-color", menu: "text-color", optionTarget: "text-color-blue", event: { type: "text:color", payload: { color: "#1a73e8" } }, caption: "A paleta Cor do texto aplicou o azul.",
    question: { prompt: "Qual controle muda a cor das letras?", options: ["Cor do texto", "Layout", "Novo slide", "Apresentar"], answer: 0, explanation: "O controle Cor do texto altera a cor das letras.", hint: "Observe o botão com a letra A colorida." },
    practice: { instruction: "Altere a cor do texto para azul.", successMessage: "Você alterou a cor do texto." }
  }),
  lesson({
    id: 14, module: M2, title: "Alinhamento",
    objective: "Centralizar o texto dentro do slide.", explanation: "O alinhamento posiciona o texto à esquerda, ao centro ou à direita.",
    target: "text-align", menu: "align", optionTarget: "align-center", event: { type: "text:align", payload: { align: "center" } }, caption: "A lista Alinhar aplicou a opção Centralizar.",
    question: { prompt: "Qual alinhamento coloca o texto no meio?", options: ["Centralizado", "À esquerda", "Justificado", "Vertical"], answer: 0, explanation: "O alinhamento centralizado posiciona o texto no meio.", hint: "Observe como as linhas ficaram no centro." },
    practice: { instruction: "Centralize o texto do slide.", successMessage: "Você centralizou o texto." }
  }),
  lesson({
    id: 15, module: M3, title: "Alterar layout",
    objective: "Trocar a organização dos campos do slide.", explanation: "O layout define onde títulos e conteúdos aparecem.",
    target: "layout", menu: "layout", optionTarget: "layout-title-body", event: { type: "layout:change", payload: { layout: "title-body" } }, caption: "A lista Layout aplicou Título e corpo.",
    question: { prompt: "O que o layout controla?", options: ["A organização dos campos", "A conexão de internet", "O nome do arquivo", "O volume do computador"], answer: 0, explanation: "O layout organiza os espaços de conteúdo.", hint: "Observe a posição dos campos dentro do slide." },
    practice: { instruction: "Mude o layout para Título e corpo.", successMessage: "Você alterou o layout." }
  }),
  lesson({
    id: 16, module: M3, title: "Duplicar um slide",
    objective: "Criar uma cópia do slide selecionado.", explanation: "Duplicar mantém o conteúdo e cria uma nova miniatura igual.",
    target: "slide-menu", menu: "slide", optionTarget: "duplicate-slide", event: { type: "slide:duplicate" }, caption: "Uma cópia do slide apareceu no painel de miniaturas.",
    question: { prompt: "O que acontece ao duplicar um slide?", options: ["Uma cópia é criada", "Todos os slides são apagados", "A apresentação inicia", "A fonte muda"], answer: 0, explanation: "Duplicar cria uma nova cópia do slide selecionado.", hint: "Observe a nova miniatura com o mesmo conteúdo." },
    practice: { instruction: "Duplique o slide selecionado.", successMessage: "Você duplicou o slide." }
  }),
  lesson({
    id: 17, module: M3, title: "Reordenar slides",
    objective: "Mover um slide para outra posição na sequência.", explanation: "A ordem das miniaturas também é a ordem da apresentação.",
    target: "slide-menu", menu: "slide", optionTarget: "reorder-slide", event: { type: "slide:reorder", payload: { id: "slide-2", toIndex: 0 } }, caption: "O segundo slide foi movido para a primeira posição.",
    question: { prompt: "O que muda ao reordenar miniaturas?", options: ["A sequência da apresentação", "A cor da fonte", "O tamanho da imagem", "O acesso à internet"], answer: 0, explanation: "A ordem das miniaturas define a sequência dos slides.", hint: "Observe qual miniatura passou a aparecer primeiro." },
    practice: { instruction: "Mova o segundo slide para a primeira posição.", successMessage: "Você reordenou os slides." }
  }),
  lesson({
    id: 18, module: M3, title: "Alterar plano de fundo",
    objective: "Mudar a cor de fundo do slide selecionado.", explanation: "O plano de fundo muda a superfície do slide sem alterar seus textos.",
    target: "background", event: { type: "background:change", payload: { color: "#fff2cc" } }, caption: "A caixa Plano de fundo aplicou amarelo-claro ao slide.",
    demo: exactDemo("O plano de fundo foi escolhido na caixa e confirmado em Concluído.", [
      { action: "announce", text: "Abra Plano de fundo na barra de ferramentas." },
      { action: "move", target: "background", duration: 460 },
      { action: "click", target: "background" },
      { action: "move", target: "background-yellow", duration: 360 },
      { action: "click", target: "background-yellow" },
      { action: "move", target: "background-done", duration: 320 },
      { action: "click", target: "background-done", effect: { type: "background:change", payload: { color: "#fff2cc" } } },
      { action: "announce", text: "A cor foi aplicada somente ao slide selecionado." }
    ]),
    question: { prompt: "O que muda com Plano de fundo?", options: ["A superfície do slide", "A ordem das miniaturas", "A conta do usuário", "O nome da fonte"], answer: 0, explanation: "Plano de fundo altera a cor atrás do conteúdo.", hint: "Observe a cor da área inteira do slide." },
    practice: { instruction: "Aplique o plano de fundo amarelo-claro.", successMessage: "Você alterou o plano de fundo." }
  }),
  lesson({
    id: 19, module: M3, title: "Aplicar tema",
    objective: "Aplicar um estilo visual a toda a apresentação.", explanation: "O tema combina cores e aparência para manter os slides consistentes.",
    target: "theme", menu: "theme", optionTarget: "theme-dourado", event: { type: "theme:change", payload: { theme: "dourado" } }, caption: "O painel Tema aplicou Dourado à apresentação.",
    question: { prompt: "Para que serve um tema?", options: ["Padronizar a aparência", "Excluir imagens", "Reordenar slides", "Corrigir a internet"], answer: 0, explanation: "O tema mantém um estilo visual consistente.", hint: "Observe as cores aplicadas ao conjunto da apresentação." },
    practice: { instruction: "Aplique o tema Dourado.", successMessage: "Você aplicou um tema." }
  }),
  lesson({
    id: 20, module: M4, title: "Inserir imagem",
    objective: "Adicionar uma imagem local ao slide.", explanation: "O submenu Imagem oferece origens como computador, web, Drive, Fotos, câmera e URL.",
    target: "insert-menu", event: { type: "image:insert", payload: { source: "upload" } }, caption: "Inserir → Imagem → Fazer upload do computador adicionou uma imagem de exemplo.",
    demo: exactDemo("A imagem foi adicionada pelo submenu de origens.", [
      { action: "announce", text: "Abra Inserir e depois o submenu Imagem." },
      { action: "move", target: "insert-menu", duration: 430 },
      { action: "open-menu", target: "insert-menu", menu: "insert" },
      { action: "move", target: "insert-image", duration: 340 },
      { action: "open-menu", target: "insert-image", menu: "image" },
      { action: "move", target: "image-upload", duration: 340 },
      { action: "select-option", target: "image-upload", effect: { type: "image:insert", payload: { source: "upload" } } },
      { action: "announce", text: "No Slides real, essa opção abre o seletor de arquivos do Chromebook." }
    ]),
    question: { prompt: "Em qual menu você encontra Imagem?", options: ["Inserir", "Ajuda", "Arquivo", "Organizar"], answer: 0, explanation: "O menu Inserir reúne os elementos adicionados ao slide.", hint: "Observe o menu aberto antes da imagem aparecer." },
    practice: { instruction: "Use Inserir → Imagem → Fazer upload do computador.", successMessage: "Você inseriu uma imagem pelo submenu correto." }
  }),
  lesson({
    id: 21, module: M4, title: "Redimensionar imagem",
    objective: "Aumentar uma imagem usando a alça de redimensionamento.", explanation: "Selecione a imagem e arraste a alça do canto. Pelo teclado, use Shift+setas como alternativa acessível.",
    target: "image-resize", event: { type: "image:resize", payload: { scale: 1.25 } }, caption: "A imagem ficou maior, mantendo-se dentro do slide.",
    question: { prompt: "O que significa redimensionar uma imagem?", options: ["Mudar seu tamanho", "Excluir o slide", "Adicionar comentário", "Trocar o tema"], answer: 0, explanation: "Redimensionar muda a largura e a altura.", hint: "Observe como a imagem ficou maior." },
    practice: { instruction: "Selecione a imagem e aumente-a pela alça do canto ou com Shift+seta para a direita.", successMessage: "Você redimensionou a imagem." }
  }),
  lesson({
    id: 22, module: M4, title: "Mover imagem",
    objective: "Reposicionar uma imagem dentro do slide.", explanation: "Arraste a própria imagem para a direita. Pelo teclado, use as setas como alternativa acessível.",
    target: "image-move", event: { type: "image:move", payload: { x: 62, y: 48 } }, caption: "A imagem foi movida para o lado direito do slide.",
    question: { prompt: "O que muda quando uma imagem é movida?", options: ["Sua posição", "Seu formato de arquivo", "O número de slides", "A fonte do texto"], answer: 0, explanation: "Mover modifica a posição da imagem no slide.", hint: "Observe em qual lado a imagem terminou." },
    practice: { instruction: "Arraste a imagem para a direita ou use a seta para a direita até ela mudar de posição.", successMessage: "Você moveu a imagem." }
  }),
  lesson({
    id: 23, module: M4, title: "Inserir formas",
    objective: "Adicionar uma forma geométrica ao slide.", explanation: "No Slides, Forma abre categorias e cada categoria abre sua própria grade de opções.",
    target: "insert-menu", event: { type: "shape:insert", payload: { kind: "rectangle" } }, caption: "Inserir → Forma → Formas → Retângulo adicionou a forma.",
    demo: exactDemo("O retângulo foi escolhido em três níveis de menu.", [
      { action: "announce", text: "Abra Inserir e o submenu Forma." },
      { action: "open-menu", target: "insert-menu", menu: "insert" },
      { action: "open-menu", target: "insert-shape", menu: "shape" },
      { action: "open-menu", target: "shape-category", menu: "shape-basic" },
      { action: "move", target: "shape-rectangle", duration: 360 },
      { action: "select-option", target: "shape-rectangle", effect: { type: "shape:insert", payload: { kind: "rectangle" } } },
      { action: "announce", text: "O retângulo apareceu no slide." }
    ]),
    question: { prompt: "Para que uma forma pode ser usada?", options: ["Criar destaques e diagramas", "Entrar na conta Google", "Aumentar o zoom do navegador", "Apagar o arquivo"], answer: 0, explanation: "Formas organizam e destacam informações visuais.", hint: "Observe o retângulo que apareceu no slide." },
    practice: { instruction: "Use Inserir → Forma → Formas → Retângulo.", successMessage: "Você inseriu um retângulo pelo submenu correto." }
  }),
  lesson({
    id: 24, module: M4, title: "Inserir caixa de texto",
    objective: "Criar uma área de texto livre e digitar conteúdo nela.", explanation: "Escolha Caixa de texto, clique no slide e digite. A caixa só é criada quando recebe conteúdo.",
    target: "text-box", event: { type: "textbox:insert", payload: { value: "Nova caixa de texto" } }, caption: "A ferramenta Caixa de texto criou uma área e recebeu conteúdo digitado.",
    demo: exactDemo("Uma caixa de texto livre recebeu conteúdo digitado.", [
      { action: "announce", text: "Selecione Caixa de texto na barra de ferramentas." },
      { action: "move", target: "text-box", duration: 430 },
      { action: "click", target: "text-box" },
      { action: "move", target: "slide-canvas", duration: 360 },
      { action: "click", target: "slide-canvas" },
      { action: "type", target: "slide-canvas", effect: { type: "textbox:insert", payload: { value: "Nova caixa de texto" } } },
      { action: "announce", text: "O texto digitado ficou em uma caixa livre." }
    ]),
    question: { prompt: "Qual ferramenta cria texto fora dos campos do layout?", options: ["Caixa de texto", "Tema", "Transição", "Miniatura"], answer: 0, explanation: "A caixa de texto cria uma área de escrita livre.", hint: "Observe o botão com a letra T." },
    practice: { instruction: "Escolha Caixa de texto, clique no slide, digite ao menos três caracteres e clique fora.", expectedPayload: null, successMessage: "Você criou e preencheu uma caixa de texto." }
  }),
  lesson({
    id: 25, module: M4, title: "Inserir linha ou seta",
    objective: "Adicionar uma seta para conectar informações.", explanation: "Linhas e setas mostram direção ou relação entre elementos.",
    target: "line", menu: "line", optionTarget: "line-arrow", event: { type: "line:insert", payload: { kind: "arrow" } }, caption: "A lista Linha aplicou a opção Seta.",
    question: { prompt: "Quando uma seta é útil?", options: ["Para indicar direção", "Para trocar a fonte", "Para excluir o tema", "Para abrir o arquivo"], answer: 0, explanation: "Setas indicam direção e conexão.", hint: "Observe o elemento que aponta para a direita." },
    practice: { instruction: "Insira uma seta no slide.", successMessage: "Você inseriu uma seta." }
  }),
  lesson({
    id: 26, module: M5, title: "Adicionar transição",
    objective: "Escolher um efeito de passagem entre slides.", explanation: "A transição aparece quando a apresentação passa de um slide para outro.",
    target: "transition", menu: "motion", optionTarget: "transition-dissolve", event: { type: "transition:change", payload: { transition: "dissolver" } }, caption: "O painel Movimento aplicou a transição Dissolver.",
    question: { prompt: "Quando a transição aparece?", options: ["Na passagem entre slides", "Ao digitar uma palavra", "Ao abrir o menu Ajuda", "Ao alterar a fonte"], answer: 0, explanation: "Transições acontecem entre um slide e o próximo.", hint: "Pense no momento em que a apresentação avança." },
    practice: { instruction: "Adicione a transição Dissolver.", successMessage: "Você adicionou uma transição." }
  }),
  lesson({
    id: 27, module: M5, title: "Entender animações",
    objective: "Aplicar um efeito de entrada a um elemento do slide.", explanation: "Animações controlam como textos e imagens aparecem durante a apresentação.",
    target: "insert-menu", event: { type: "animation:add", payload: { animation: "aparecer" } }, caption: "Inserir → Animação abriu o painel Movimento e adicionou Aparecer.",
    demo: exactDemo("A animação Aparecer foi adicionada no painel Movimento.", [
      { action: "announce", text: "Selecione o texto e abra Inserir → Animação." },
      { action: "open-menu", target: "insert-menu", menu: "insert" },
      { action: "select-option", target: "animate" },
      { action: "move", target: "add-animation", duration: 360 },
      { action: "click", target: "add-animation", effect: { type: "animation:add", payload: { animation: "aparecer" } } },
      { action: "announce", text: "A animação padrão é Aparecer ao clicar." }
    ]),
    question: { prompt: "O que uma animação controla?", options: ["Como um elemento aparece", "A senha da conta", "A ordem dos arquivos", "A conexão Wi-Fi"], answer: 0, explanation: "Animações controlam a entrada e o movimento dos elementos.", hint: "Observe qual efeito foi aplicado ao texto." },
    practice: { instruction: "Use Inserir → Animação e clique em Adicionar animação.", successMessage: "Você adicionou a animação Aparecer." }
  }),
  lesson({
    id: 28, module: M5, title: "Adicionar comentário",
    objective: "Registrar uma observação digitada para colaborar com outras pessoas.", explanation: "Clique em Adicionar comentário, escreva uma observação e confirme em Comentar.",
    target: "comment", event: { type: "comment:add", payload: { value: "Revise este slide" } }, caption: "Um comentário digitado foi adicionado à apresentação.",
    demo: exactDemo("O comentário foi digitado e enviado.", [
      { action: "announce", text: "Abra o compositor de comentários." },
      { action: "move", target: "comment", duration: 420 },
      { action: "click", target: "comment" },
      { action: "type", target: "comment-field" },
      { action: "move", target: "comment-submit", duration: 320 },
      { action: "click", target: "comment-submit", effect: { type: "comment:add", payload: { value: "Revise este slide" } } },
      { action: "announce", text: "A observação ficou registrada sem mudar o conteúdo do slide." }
    ]),
    question: { prompt: "Para que serve um comentário?", options: ["Registrar uma observação", "Apagar todos os slides", "Mudar o tema", "Iniciar a apresentação"], answer: 0, explanation: "Comentários guardam observações de colaboração.", hint: "Pense em uma mensagem que não altera o conteúdo." },
    practice: { instruction: "Abra o comentário, digite ao menos três caracteres e clique em Comentar.", expectedPayload: null, successMessage: "Você digitou e adicionou um comentário." }
  }),
  lesson({
    id: 29, module: M5, title: "Compartilhar uma apresentação",
    objective: "Abrir as opções de compartilhamento da apresentação.", explanation: "O botão Compartilhar controla quem pode acessar o arquivo. Nesta simulação nenhuma conta é conectada.",
    target: "share", event: { type: "share:open" }, caption: "As opções locais de compartilhamento foram abertas.",
    question: { prompt: "Qual botão controla o acesso de outras pessoas?", options: ["Compartilhar", "Layout", "Zoom", "Linha"], answer: 0, explanation: "O botão Compartilhar reúne as permissões de acesso.", hint: "Observe o botão azul no canto superior direito." },
    practice: { instruction: "Abra as opções de compartilhamento.", successMessage: "Você abriu as opções de compartilhamento." }
  }),
  lesson({
    id: 30, module: M5, title: "Iniciar apresentação de slides",
    objective: "Iniciar o modo de apresentação em tela cheia.", explanation: "O botão Apresentar mostra os slides para o público.",
    target: "present", event: { type: "presentation:start" }, caption: "A apresentação foi iniciada no slide selecionado.",
    question: { prompt: "Qual botão mostra os slides para o público?", options: ["Apresentar", "Comentário", "Plano de fundo", "Duplicar"], answer: 0, explanation: "Apresentar inicia a exibição dos slides.", hint: "Observe o botão com o símbolo de reprodução." },
    practice: { instruction: "Inicie a apresentação de slides.", successMessage: "Você iniciou a apresentação." }
  })
]);

export const googleSlidesFinalChallenge = Object.freeze({
  id: "final",
  title: "Prepare a apresentação para a aula",
  instruction: "Complete os dez itens usando o simulador. Cada ação será conferida no estado real da apresentação.",
  goals: Object.freeze([
    { id: "three-slides", label: "Crie 3 slides" },
    { id: "first-title", label: "Coloque um título no primeiro" },
    { id: "body-text", label: "Adicione texto" },
    { id: "bold-text", label: "Aplique negrito" },
    { id: "image", label: "Insira uma imagem" },
    { id: "layout", label: "Mude o layout de um slide" },
    { id: "reorder", label: "Reordene dois slides" },
    { id: "theme", label: "Escolha um tema" },
    { id: "transition", label: "Adicione uma transição" },
    { id: "present", label: "Inicie a apresentação" }
  ])
});
