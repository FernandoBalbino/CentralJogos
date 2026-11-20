// Conteúdo da atividade "Tipos de Sistemas Operacionais" (matriz: Sistemas Operacionais → tipos).
export const TYPE_INFO = {
  mono: { label: "Monousuário", desc: "uma pessoa por vez", icon: "👤", color: "#6c5ce7" },
  multi: { label: "Multiusuário", desc: "várias ao mesmo tempo", icon: "👥", color: "#0d9f9a" },
  real: { label: "Tempo real", desc: "não pode atrasar", icon: "⏱️", color: "#e4532f" },
  emb: { label: "Embarcado", desc: "dentro de um aparelho", icon: "🔌", color: "#d98a0b" },
  geral: { label: "Pode esperar", desc: "atrasar não é perigoso", icon: "⏳", color: "#64748b" },
  pc: { label: "Computador", desc: "roda vários programas", icon: "💻", color: "#64748b" }
};

// Logos já armazenados no projeto (créditos em ATTRIBUTIONS.md e js/credits-data.js).
// "color" pinta logos de uma cor só (Simple Icons) com máscara CSS.
export const LOGOS = {
  windows: { src: "./assets/items/windows.svg", name: "Windows" },
  ubuntu: { src: "./assets/items/ubuntu.svg", name: "Ubuntu" },
  chrome: { src: "./assets/items/google-chrome.svg", name: "ChromeOS" },
  linux: { src: "./assets/side-game/brands/linux.svg", name: "Linux" },
  android: { src: "./assets/side-game/brands/android.svg", name: "Android", color: "#3ddc84" }
};

export const LESSONS = [
  {
    id: "mono",
    type: "mono",
    title: "Monousuário",
    lead: "Só <b>uma pessoa</b> usa o sistema por vez.",
    points: ["Para outra pessoa usar, a primeira precisa sair.", "Comum em computadores antigos e em aparelhos pessoais."],
    examples: ["MS-DOS", "Windows 98", "iOS (iPhone)"],
    question: {
      text: "Ana está usando um PC com MS-DOS. O que Bruno precisa fazer para usar?",
      options: [
        { text: "Esperar a Ana terminar e sair", correct: true },
        { text: "Entrar ao mesmo tempo com outra conta", correct: false }
      ],
      explain: "Isso! No monousuário, só uma pessoa usa por vez."
    }
  },
  {
    id: "multi",
    type: "multi",
    title: "Multiusuário",
    lead: "<b>Várias pessoas</b> usam o mesmo sistema <b>ao mesmo tempo</b>.",
    points: ["Cada usuário tem sua conta, seus arquivos e suas permissões.", "O acesso pode ser por terminais ou pela rede."],
    examples: ["Linux (Ubuntu Server)", "Windows Server", "Unix"],
    question: {
      text: "30 alunos entram no mesmo servidor ao mesmo tempo, cada um com sua pasta. Que tipo de SO é esse?",
      options: [
        { text: "Multiusuário", correct: true },
        { text: "Monousuário", correct: false }
      ],
      explain: "Exato! Várias pessoas, ao mesmo tempo, cada uma com sua conta."
    }
  },
  {
    id: "real",
    type: "real",
    title: "Tempo real",
    lead: "Responde <b>dentro de um prazo garantido</b>. Atrasar é falhar.",
    points: ["Não basta ser rápido: precisa ser <b>previsível</b>, sempre.", "Usado onde um atraso pode causar acidentes."],
    examples: ["FreeRTOS", "VxWorks (robôs da NASA)", "QNX (carros)"],
    experiment: true,
    question: {
      text: "O que é mais importante em um SO de tempo real?",
      options: [
        { text: "Cumprir o prazo, sempre", correct: true },
        { text: "Ter muitos aplicativos", correct: false },
        { text: "Ter a tela mais bonita", correct: false }
      ],
      explain: "Isso! O prazo precisa ser cumprido toda vez."
    }
  },
  {
    id: "emb",
    type: "emb",
    title: "Embarcado",
    lead: "Fica <b>dentro de um aparelho</b> e faz uma tarefa específica.",
    points: ["Usa pouca memória e pouca energia.", "Muitas vezes você nem percebe que ele existe."],
    examples: ["Ar-condicionado", "Micro-ondas", "Roteador Wi-Fi", "Smart TV"],
    question: {
      text: "Qual destes aparelhos tem um SO embarcado?",
      options: [
        { text: "Notebook do laboratório", correct: false },
        { text: "Roteador Wi-Fi", correct: true }
      ],
      explain: "Certo! O roteador tem um sistema escondido só para distribuir a internet."
    }
  },
  {
    id: "combo",
    type: "combo",
    title: "Os tipos se combinam",
    lead: "Um mesmo sistema pode ter <b>mais de uma característica</b>.",
    points: ["O sistema do airbag é <b>embarcado</b> e de <b>tempo real</b>.", "O servidor da escola é <b>multiusuário</b>."],
    examples: [],
    question: {
      text: "O sistema que controla o airbag do carro é…",
      options: [
        { text: "Multiusuário", correct: false },
        { text: "Embarcado e de tempo real", correct: true },
        { text: "Um computador de uso geral", correct: false }
      ],
      explain: "Perfeito! Fica dentro do carro e nunca pode atrasar."
    }
  }
];

export const PHASES = [
  {
    id: "usuarios",
    title: "Quantas pessoas usam ao mesmo tempo?",
    hint: "Uma pessoa por vez ou várias juntas?",
    bins: ["mono", "multi"],
    cards: [
      { id: "msdos", icon: "💾", name: "MS-DOS", detail: "Computador dos anos 80", answer: "mono", why: "O MS-DOS atendia uma pessoa por vez." },
      { id: "iphone", icon: "📱", name: "iPhone (iOS)", detail: "Celular com uma conta só", answer: "mono", why: "O iPhone tem uma única conta: a do dono." },
      { id: "relogio-user", icon: "⌚", name: "Smartwatch", detail: "Só o dono usa", answer: "mono", why: "O relógio é de uma pessoa só." },
      { id: "ubuntu-server", logo: "ubuntu", name: "Ubuntu Server", detail: "30 alunos logados juntos", answer: "multi", why: "Cada aluno entra com sua conta, todos ao mesmo tempo." },
      { id: "win-server", logo: "windows", name: "Windows Server", detail: "Funcionários conectados juntos", answer: "multi", why: "Vários funcionários usam o mesmo servidor ao mesmo tempo." },
      { id: "linux-banco", logo: "linux", name: "Linux do banco", detail: "Centenas de caixas ao mesmo tempo", answer: "multi", why: "Muitas pessoas usam o mesmo sistema juntas." }
    ]
  },
  {
    id: "prazo",
    title: "Pode atrasar?",
    hint: "Se atrasar um pouquinho, alguém corre perigo?",
    bins: ["real", "geral"],
    cards: [
      { id: "airbag", icon: "🚗", name: "Airbag", detail: "Infla logo após a batida", answer: "real", why: "Se o airbag atrasar, ele não protege ninguém." },
      { id: "abs", icon: "🛑", name: "Freio ABS", detail: "Evita que a roda trave", answer: "real", why: "O freio precisa agir na hora, sem atraso." },
      { id: "marcapasso", icon: "❤️", name: "Marca-passo", detail: "Ajuda o coração a bater", answer: "real", why: "O estímulo precisa chegar no momento exato." },
      { id: "robo", icon: "🦾", name: "Robô da fábrica", detail: "Para se alguém chegar perto", answer: "real", why: "Se o robô demorar para parar, alguém se machuca." },
      { id: "windows-word", logo: "windows", name: "Windows 11", detail: "Abrir o Word", answer: "geral", why: "Se o Word demorar um segundo, ninguém se machuca." },
      { id: "android-zap", logo: "android", name: "Android", detail: "Abrir o WhatsApp", answer: "geral", why: "A mensagem pode demorar um pouco sem perigo." },
      { id: "ar-temp", icon: "❄️", name: "Ar-condicionado", detail: "Mudar a temperatura", answer: "geral", why: "Esfriar alguns segundos depois não é perigoso." },
      { id: "tv-youtube", icon: "📺", name: "Smart TV", detail: "Abrir o YouTube", answer: "geral", why: "O vídeo pode carregar devagar sem risco." }
    ]
  },
  {
    id: "aparelho",
    title: "Onde fica o sistema?",
    hint: "Escondido num aparelho ou num computador?",
    bins: ["emb", "pc"],
    cards: [
      { id: "ar", icon: "❄️", name: "Ar-condicionado", detail: "Controla a temperatura", answer: "emb", why: "Tem um sistema só para controlar o ar." },
      { id: "microondas", icon: "🍿", name: "Micro-ondas", detail: "Timer e potência", answer: "emb", why: "O sistema dele só cuida do tempo e da potência." },
      { id: "roteador", icon: "📶", name: "Roteador Wi-Fi", detail: "Distribui a internet", answer: "emb", why: "O sistema do roteador só cuida da rede." },
      { id: "lavar", icon: "🧺", name: "Máquina de lavar", detail: "Água, giro e tempo", answer: "emb", why: "Ele só controla o ciclo de lavagem." },
      { id: "notebook", logo: "windows", name: "Notebook com Windows", detail: "Jogos, Word, navegador…", answer: "pc", why: "Computador: roda qualquer programa." },
      { id: "pc-lab", logo: "ubuntu", name: "PC com Ubuntu", detail: "Laboratório da escola", answer: "pc", why: "Serve para muitas tarefas diferentes." },
      { id: "chromebook", logo: "chrome", name: "Chromebook", detail: "ChromeOS", answer: "pc", why: "É um computador: navegador, documentos, apps…" },
      { id: "macbook", icon: "💻", name: "MacBook", detail: "macOS", answer: "pc", why: "Computador de uso geral, como o notebook." }
    ]
  },
  {
    id: "final",
    title: "Desafio final: qual é o tipo?",
    hint: "Procure a pista: pessoas, tempo ou aparelho.",
    bins: ["mono", "multi", "real", "emb"],
    cards: [
      { id: "f-escola", icon: "🏫", name: "30 alunos fazem login no mesmo servidor, ao mesmo tempo.", answer: "multi", why: "Várias pessoas juntas: multiusuário." },
      { id: "f-banco", icon: "🏦", name: "Vários caixas do banco usam o mesmo sistema juntos.", answer: "multi", why: "Muitas pessoas juntas: multiusuário." },
      { id: "f-abs", icon: "🛑", name: "O freio ABS tem que agir na hora, sem atraso.", answer: "real", why: "Não pode atrasar: tempo real." },
      { id: "f-coracao", icon: "❤️", name: "O marca-passo nunca pode atrasar.", answer: "real", why: "Não pode atrasar: tempo real." },
      { id: "f-ar", icon: "❄️", name: "O ar-condicionado tem um sistema só para controlar a temperatura.", answer: "emb", why: "Escondido no aparelho: embarcado." },
      { id: "f-micro", icon: "🍿", name: "O micro-ondas tem um sistema escondido para o timer.", answer: "emb", why: "Escondido no aparelho: embarcado." },
      { id: "f-dos", icon: "💾", name: "No MS-DOS, só uma pessoa usa o computador por vez.", answer: "mono", why: "Uma pessoa por vez: monousuário." },
      { id: "f-iphone", icon: "📱", name: "O iPhone tem só uma conta: a do dono.", answer: "mono", why: "Uma pessoa só: monousuário." }
    ]
  }
];

// Questão especial sobre o sistema dos Chromebooks da turma.
export const BONUS = {
  text: "Na escola, cada aluno entra no Chromebook com a própria conta Google e só vê os seus arquivos. Então o ChromeOS é…",
  options: [
    { text: "Monousuário", correct: false },
    { text: "Multiusuário", correct: true },
    { text: "Embarcado", correct: false }
  ],
  wrong: "Ainda não. Pense: várias pessoas, cada uma com sua conta.",
  facts: [
    "Por dentro do ChromeOS existe um <b>Linux</b>! Ele usa o mesmo núcleo (o <b>kernel</b>) do Ubuntu e do Android — são “primos”.",
    "Ele se <b>atualiza sozinho</b>: baixa a versão nova enquanto você usa e instala quando o Chromebook reinicia."
  ]
};

export const TOTAL_CARDS = PHASES.reduce((sum, phase) => sum + phase.cards.length, 0);
