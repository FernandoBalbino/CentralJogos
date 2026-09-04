export const GOOGLE_SLIDES_COURSE_DATA_VERSION = 1;

export const GOOGLE_SLIDES_DEMO_TYPES = Object.freeze(["script", "webm"]);

export const GOOGLE_SLIDES_DEMO_ACTIONS = Object.freeze([
  "move",
  "click",
  "open-menu",
  "select-option",
  "wait",
  "highlight",
  "announce"
]);

export const GOOGLE_SLIDES_DEMO_TARGETS = Object.freeze([
  "slide-canvas",
  "new-slide",
  "slide-thumb-1",
  "slide-thumb-2",
  "slide-menu",
  "delete-slide"
]);

export const GOOGLE_SLIDES_PRACTICE_ACTIONS = Object.freeze([
  "canvas:focus",
  "slide:create",
  "slide:select",
  "slide:delete"
]);

const scriptDemo = (caption, steps) => ({
  type: "script",
  caption,
  steps
});

export const demoStepCount = (demo) => demo?.type === "script"
  ? Math.max(0, demo.steps?.length || 0)
  : demo?.type === "webm" ? 1 : 0;

export const googleSlidesLessons = Object.freeze([
  Object.freeze({
    id: 1,
    module: "Conhecendo o Google Apresentações",
    title: "Conhecendo a área do slide",
    objective: "Identificar onde o conteúdo da apresentação é criado.",
    explanation: "A área branca no centro é o slide. É nela que você organiza títulos, textos e imagens.",
    demo: scriptDemo(
      "O cursor destacou a área branca onde o conteúdo do slide é criado.",
      [
        { action: "announce", text: "Observe a área grande e branca no centro da tela." },
        { action: "move", target: "slide-canvas", duration: 650 },
        { action: "click", target: "slide-canvas", effect: { type: "canvas:focus" } },
        { action: "highlight", target: "slide-canvas", duration: 850 },
        { action: "announce", text: "Esta é a área do slide. Aqui entram títulos, textos e imagens." }
      ]
    ),
    question: Object.freeze({
      prompt: "Onde você cria títulos, textos e imagens?",
      options: Object.freeze([
        "Na área do slide",
        "No painel de miniaturas",
        "Na barra de menus",
        "No botão Compartilhar"
      ]),
      answer: 0,
      explanation: "A área branca no centro é o espaço de criação do slide.",
      hint: "Observe novamente qual área grande ficou destacada."
    }),
    practice: Object.freeze({
      instruction: "Clique na área branca do slide.",
      expectedAction: "canvas:focus",
      successMessage: "Você identificou a área do slide."
    })
  }),
  Object.freeze({
    id: 2,
    module: "Conhecendo o Google Apresentações",
    title: "Criar novo slide",
    objective: "Adicionar um slide à apresentação usando o botão +.",
    explanation: "O botão + cria um novo slide e adiciona uma miniatura ao painel esquerdo.",
    demo: scriptDemo(
      "O cursor clicou no botão + e um novo slide apareceu no painel de miniaturas.",
      [
        { action: "announce", text: "Observe o botão + no início da barra de ferramentas." },
        { action: "move", target: "new-slide", duration: 650 },
        { action: "click", target: "new-slide", effect: { type: "slide:create" } },
        { action: "wait", duration: 350 },
        { action: "highlight", target: "slide-thumb-2", duration: 850 },
        { action: "announce", text: "O novo slide foi criado e já está selecionado." }
      ]
    ),
    question: Object.freeze({
      prompt: "Qual botão cria um novo slide?",
      options: Object.freeze(["Tema", "+", "Transição", "Plano de fundo"]),
      answer: 1,
      explanation: "O botão + adiciona um novo slide à apresentação.",
      hint: "Observe novamente o primeiro botão da barra de ferramentas."
    }),
    practice: Object.freeze({
      instruction: "Adicione um novo slide.",
      expectedAction: "slide:create",
      successMessage: "Você criou um novo slide."
    })
  }),
  Object.freeze({
    id: 3,
    module: "Conhecendo o Google Apresentações",
    title: "Excluir slide",
    objective: "Remover um slide selecionado pelo menu Slide.",
    explanation: "Selecione a miniatura e use Slide → Excluir slide para remover somente aquele slide.",
    demo: scriptDemo(
      "O segundo slide foi selecionado e removido pelo comando Slide → Excluir slide.",
      [
        { action: "announce", text: "Primeiro, selecione a miniatura do slide que será removido." },
        { action: "move", target: "slide-thumb-2", duration: 600 },
        { action: "click", target: "slide-thumb-2", effect: { type: "slide:select", payload: { id: "slide-2" } } },
        { action: "move", target: "slide-menu", duration: 500 },
        { action: "open-menu", target: "slide-menu", menu: "slide" },
        { action: "move", target: "delete-slide", duration: 450 },
        { action: "select-option", target: "delete-slide", effect: { type: "slide:delete" } },
        { action: "highlight", target: "slide-thumb-1", duration: 700 },
        { action: "announce", text: "O segundo slide desapareceu e o primeiro voltou a ficar selecionado." }
      ]
    ),
    question: Object.freeze({
      prompt: "Em qual menu está o comando Excluir slide?",
      options: Object.freeze(["Formatar", "Ferramentas", "Slide", "Ajuda"]),
      answer: 2,
      explanation: "O comando Excluir slide fica dentro do menu Slide.",
      hint: "Observe novamente o nome do menu aberto pelo cursor."
    }),
    practice: Object.freeze({
      instruction: "Selecione e exclua o segundo slide.",
      expectedAction: "slide:delete",
      expectedPayload: Object.freeze({ deletedSlideId: "slide-2" }),
      successMessage: "Você excluiu o segundo slide."
    })
  })
]);
