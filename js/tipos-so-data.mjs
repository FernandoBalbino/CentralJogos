// Conteúdo da atividade "Tipos de Sistemas Operacionais" (matriz: Sistemas Operacionais → tipos).
export const TYPE_INFO = {
  mono: { label: "Monousuário", desc: "uma pessoa por vez", icon: "👤", color: "#6c5ce7" },
  multi: { label: "Multiusuário", desc: "várias ao mesmo tempo", icon: "👥", color: "#0d9f9a" },
  real: { label: "Tempo real", desc: "atrasar = falhar", icon: "⏱️", color: "#e4532f" },
  emb: { label: "Embarcado", desc: "dentro de um aparelho", icon: "🔌", color: "#d98a0b" },
  geral: { label: "Uso geral", desc: "pode esperar um pouco", icon: "🖥️", color: "#64748b" },
  pc: { label: "Computador", desc: "uso geral, vários programas", icon: "💻", color: "#64748b" }
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
    examples: ["Roteador Wi-Fi", "Smart TV", "Smartwatch", "Máquina de lavar"],
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
    title: "Quantas pessoas ao mesmo tempo?",
    hint: "O sistema aceita várias pessoas usando juntas?",
    bins: ["mono", "multi"],
    cards: [
      { id: "msdos", icon: "💾", name: "MS-DOS", detail: "Computador pessoal dos anos 80", answer: "mono", why: "O MS-DOS não tinha contas: atendia uma pessoa por vez." },
      { id: "win98", icon: "🪟", name: "Windows 98", detail: "PC de casa dos anos 90", answer: "mono", why: "O Windows 98 foi feito para uma pessoa por vez, sem separar usuários de verdade." },
      { id: "ios", icon: "📱", name: "iOS no iPhone", detail: "Celular com uma única conta", answer: "mono", why: "O iPhone tem uma conta só: tudo pertence a uma pessoa." },
      { id: "ubuntu-server", icon: "🐧", name: "Ubuntu Server", detail: "Servidor com 30 alunos conectados", answer: "multi", why: "Cada aluno entra com sua conta, todos ao mesmo tempo." },
      { id: "win-server", icon: "🗄️", name: "Windows Server", detail: "Funcionários no acesso remoto", answer: "multi", why: "Vários funcionários usam o mesmo servidor ao mesmo tempo." },
      { id: "unix", icon: "🏦", name: "Unix do banco", detail: "Centenas de terminais ligados", answer: "multi", why: "Centenas de pessoas usam o sistema central juntas." }
    ]
  },
  {
    id: "prazo",
    title: "O tempo é crítico?",
    hint: "Se atrasar um pouquinho, alguém corre perigo?",
    bins: ["real", "geral"],
    cards: [
      { id: "airbag", icon: "🚗", name: "Airbag do carro", detail: "Infla logo após a batida", answer: "real", why: "Se o airbag atrasar, ele não protege ninguém." },
      { id: "marcapasso", icon: "❤️", name: "Marca-passo", detail: "Estimula o coração", answer: "real", why: "O estímulo precisa chegar no momento exato, sempre." },
      { id: "marte", icon: "🤖", name: "Robô em Marte", detail: "VxWorks controlando rodas e braço", answer: "real", why: "Motores e sensores precisam responder dentro do prazo." },
      { id: "aviao", icon: "✈️", name: "Piloto automático", detail: "Corrige a rota do avião", answer: "real", why: "Um atraso na correção pode tirar o avião da rota." },
      { id: "trabalho", icon: "📝", name: "Digitar um trabalho", detail: "Windows 11 no notebook", answer: "geral", why: "Se demorar um segundo, ninguém se machuca." },
      { id: "navegar", icon: "🌐", name: "Navegar na internet", detail: "Ubuntu no laboratório", answer: "geral", why: "Uma página pode carregar um pouco mais devagar sem perigo." },
      { id: "fotos", icon: "🖼️", name: "Organizar fotos", detail: "macOS no computador de casa", answer: "geral", why: "Esperar um pouco não causa nenhum acidente." },
      { id: "download", icon: "⬇️", name: "Baixar um arquivo", detail: "ChromeOS no Chromebook", answer: "geral", why: "O download pode atrasar sem colocar ninguém em risco." }
    ]
  },
  {
    id: "aparelho",
    title: "Onde o sistema está?",
    hint: "Ele fica escondido dentro de um aparelho com uma função só?",
    bins: ["emb", "pc"],
    cards: [
      { id: "roteador", icon: "📶", name: "Roteador Wi-Fi", detail: "Distribui a internet da casa", answer: "emb", why: "O sistema do roteador só cuida da rede." },
      { id: "smart-tv", icon: "📺", name: "Smart TV", detail: "Canais e apps de vídeo", answer: "emb", why: "O sistema fica dentro da TV, feito para vídeo." },
      { id: "relogio", icon: "⌚", name: "Smartwatch", detail: "Passos e notificações", answer: "emb", why: "Sistema pequeno, econômico, dentro do relógio." },
      { id: "lavar", icon: "🧺", name: "Máquina de lavar", detail: "Controla água, giro e tempo", answer: "emb", why: "Ele só controla o ciclo de lavagem." },
      { id: "notebook", icon: "💻", name: "Notebook", detail: "Windows 11 com vários programas", answer: "pc", why: "Computador de uso geral: roda qualquer programa." },
      { id: "pc-lab", icon: "🖥️", name: "PC do laboratório", detail: "Ubuntu com navegador e editor", answer: "pc", why: "Serve para muitas tarefas diferentes." },
      { id: "chromebook", icon: "🎒", name: "Chromebook", detail: "ChromeOS para estudar", answer: "pc", why: "É um computador: navegador, documentos, apps…" },
      { id: "servidor", icon: "🗄️", name: "Servidor da escola", detail: "Contas e arquivos dos alunos", answer: "pc", why: "Servidor também é um computador de uso geral." }
    ]
  },
  {
    id: "final",
    title: "Desafio final: qual é o tipo?",
    hint: "Procure a pista: pessoas, prazo ou aparelho.",
    bins: ["mono", "multi", "real", "emb"],
    cards: [
      { id: "f-escola", icon: "🏫", name: "30 alunos entram no mesmo servidor ao mesmo tempo, cada um com sua senha.", answer: "multi", why: "Várias pessoas ao mesmo tempo: multiusuário." },
      { id: "f-robo", icon: "🦾", name: "O braço robótico deve parar em até 5 ms quando alguém entra na área.", answer: "real", why: "Prazo curto e garantido: tempo real." },
      { id: "f-lavar", icon: "🧺", name: "A máquina de lavar tem um sistema só para controlar o ciclo.", answer: "emb", why: "Dentro do aparelho, com uma tarefa: embarcado." },
      { id: "f-dos", icon: "💾", name: "No MS-DOS, outra pessoa só usa o PC quando a primeira sai.", answer: "mono", why: "Uma pessoa por vez: monousuário." },
      { id: "f-banco", icon: "🏦", name: "Centenas de caixas do banco usam o sistema central juntos.", answer: "multi", why: "Muitas pessoas juntas: multiusuário." },
      { id: "f-coracao", icon: "❤️", name: "O marca-passo nunca pode atrasar o estímulo ao coração.", answer: "real", why: "Não pode atrasar: tempo real." },
      { id: "f-tv", icon: "📺", name: "A smart TV tem um sistema dentro dela, feito só para vídeo.", answer: "emb", why: "Escondido no aparelho: embarcado." },
      { id: "f-celular", icon: "📱", name: "O celular tem uma única conta: tudo é de uma só pessoa.", answer: "mono", why: "Uma única pessoa: monousuário." }
    ]
  }
];

export const TOTAL_CARDS = PHASES.reduce((sum, phase) => sum + phase.cards.length, 0);
