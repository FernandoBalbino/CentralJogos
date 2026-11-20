// Conteúdo da atividade "Internet das Coisas" (matriz: Tópicos Avançados de Redes → novas tendências: IoT, 5G).
export const TYPE_INFO = {
  iot: { label: "É IoT", desc: "conecta na internet", icon: "📡", color: "#0d9f9a" },
  nao: { label: "Não é IoT", desc: "não se conecta", icon: "🚫", color: "#64748b" },
  sensor: { label: "Sensor", desc: "percebe e mede", icon: "👁️", color: "#6c5ce7" },
  atuador: { label: "Atuador", desc: "age e movimenta", icon: "✋", color: "#e4532f" },
  casa: { label: "Casa", desc: "casa inteligente", icon: "🏠", color: "#0d9f9a" },
  cidade: { label: "Cidade", desc: "cidade inteligente", icon: "🏙️", color: "#6c5ce7" },
  saude: { label: "Saúde", desc: "cuida do corpo", icon: "❤️", color: "#e4532f" },
  campo: { label: "Campo", desc: "plantação e fazenda", icon: "🌱", color: "#2f9e44" },
  seguro: { label: "Seguro", desc: "protege os aparelhos", icon: "🛡️", color: "#1f9d55" },
  perigo: { label: "Perigoso", desc: "facilita invasões", icon: "⚠️", color: "#e4532f" }
};

export const LESSONS = [
  {
    id: "iot-home",
    color: "#0d9f9a",
    icon: "🌐",
    title: "O que é IoT?",
    lead: "<b>Internet das Coisas</b>: objetos do dia a dia conectados à internet.",
    points: ["Eles <b>coletam dados</b> e <b>trocam informações</b> pela rede.", "Curiosidade: já existem <b>mais coisas conectadas</b> do que pessoas no planeta!"],
    examples: ["Lâmpada inteligente", "Câmera Wi-Fi", "Smartwatch", "Assistente de voz"],
    question: {
      text: "Qual destes é um objeto IoT?",
      options: [
        { text: "Lâmpada que acende pelo celular", correct: true },
        { text: "Lâmpada comum, com interruptor", correct: false }
      ],
      explain: "Isso! Ela se conecta à internet e recebe comandos pelo app."
    }
  },
  {
    id: "iot-flow",
    color: "#6c5ce7",
    icon: "🔄",
    title: "Como funciona",
    lead: "Tudo segue um caminho: <b>sensor → rede → nuvem → ação</b>.",
    points: ["O <b>sensor</b> mede, a <b>rede</b> leva o dado, a <b>nuvem</b> decide e o aparelho <b>age</b>.", "Exemplo: o quarto chegou a 28 °C e o ar-condicionado liga sozinho."],
    examples: ["Wi-Fi", "Bluetooth", "5G"],
    question: {
      text: "No ar-condicionado inteligente, quem “sente” que o quarto está quente?",
      options: [
        { text: "O sensor de temperatura", correct: true },
        { text: "A nuvem", correct: false },
        { text: "O controle remoto", correct: false }
      ],
      explain: "Exato! O sensor mede a temperatura e envia o dado."
    }
  },
  {
    id: "iot-plant",
    color: "#e4532f",
    icon: "🤖",
    title: "Sensores e atuadores",
    lead: "<b>Sensor</b> percebe. <b>Atuador</b> age.",
    points: ["Sensores são os “olhos”: temperatura, presença, umidade, luz.", "Atuadores são as “mãos”: motor, lâmpada, fechadura, válvula."],
    examples: ["Sensor de umidade", "Válvula de água"],
    question: {
      text: "Na irrigação automática, a válvula que abre a água é…",
      options: [
        { text: "Um sensor", correct: false },
        { text: "Um atuador", correct: true }
      ],
      explain: "Certo! A válvula age: ela abre e fecha a água."
    }
  },
  {
    id: "iot-areas",
    color: "#2f9e44",
    icon: "🏙️",
    title: "Onde a IoT aparece",
    lead: "Na <b>casa</b>, na <b>cidade</b>, na <b>saúde</b> e no <b>campo</b>.",
    points: ["Cidade: semáforo inteligente e ônibus com GPS no app.", "Campo: sensores na plantação avisam a hora de irrigar."],
    examples: [],
    question: {
      text: "O app que mostra onde o ônibus está agora é IoT na…",
      options: [
        { text: "Saúde", correct: false },
        { text: "Cidade", correct: true },
        { text: "Casa", correct: false }
      ],
      explain: "Isso! O ônibus envia a posição do GPS pela rede."
    }
  },
  {
    id: "iot-security",
    color: "#1f9d55",
    icon: "🔒",
    title: "Segurança na IoT",
    lead: "Coisa conectada também pode ser <b>invadida</b>.",
    points: ["Troque a <b>senha padrão</b> (como “admin”) e <b>atualize</b> o aparelho.", "O <b>5G</b> conecta milhares de coisas ao mesmo tempo: mais aparelhos, mais cuidado."],
    examples: [],
    question: {
      text: "A câmera nova veio com a senha “admin”. O que fazer?",
      options: [
        { text: "Deixar assim, é mais fácil", correct: false },
        { text: "Trocar por uma senha forte", correct: true }
      ],
      explain: "Perfeito! A senha padrão é a primeira que um invasor tenta."
    }
  }
];

export const PHASES = [
  {
    id: "e-iot",
    title: "É IoT ou não é?",
    hint: "Ele se conecta à internet?",
    bins: ["iot", "nao"],
    cards: [
      { id: "lampada-app", icon: "💡", name: "Lâmpada inteligente", detail: "Acende pelo app", answer: "iot", why: "Ela recebe comandos pela internet." },
      { id: "campainha", icon: "🔔", name: "Campainha com câmera", detail: "Avisa no celular", answer: "iot", why: "Ela manda o vídeo para o celular pela rede." },
      { id: "assistente", icon: "🔊", name: "Assistente de voz", detail: "Responde e liga a TV", answer: "iot", why: "Ele usa a internet para entender e responder." },
      { id: "lanterna", icon: "🔦", name: "Lanterna", detail: "Liga no botão", answer: "nao", why: "Não se conecta a nada: não é IoT." },
      { id: "ventilador", icon: "🌀", name: "Ventilador comum", detail: "Liga no botão", answer: "nao", why: "Sem conexão, sem IoT." },
      { id: "despertador", icon: "⏰", name: "Despertador de ponteiro", detail: "Funciona com pilha", answer: "nao", why: "Não troca dados com ninguém." }
    ]
  },
  {
    id: "sensor-atuador",
    title: "Sensor ou atuador?",
    hint: "Ele percebe alguma coisa ou faz alguma coisa?",
    bins: ["sensor", "atuador"],
    cards: [
      { id: "temperatura", icon: "🌡️", name: "Sensor de temperatura", detail: "Mede o calor", answer: "sensor", why: "Ele percebe a temperatura." },
      { id: "presenca", icon: "🚶", name: "Sensor de presença", detail: "Percebe quem passa", answer: "sensor", why: "Ele percebe movimento." },
      { id: "umidade", icon: "💧", name: "Sensor de umidade", detail: "Mede a água do solo", answer: "sensor", why: "Ele mede se a terra está seca." },
      { id: "camera", icon: "📷", name: "Câmera", detail: "Captura imagens", answer: "sensor", why: "A câmera percebe o que acontece: é um sensor de imagem." },
      { id: "portao", icon: "🚪", name: "Motor do portão", detail: "Abre e fecha", answer: "atuador", why: "O motor age: movimenta o portão." },
      { id: "fechadura", icon: "🔐", name: "Fechadura eletrônica", detail: "Tranca a porta", answer: "atuador", why: "Ela age: tranca e destranca." },
      { id: "valvula", icon: "🚿", name: "Válvula de irrigação", detail: "Libera a água", answer: "atuador", why: "A válvula age: abre a água." },
      { id: "sirene", icon: "🚨", name: "Sirene do alarme", detail: "Toca bem alto", answer: "atuador", why: "A sirene age: faz barulho." }
    ]
  },
  {
    id: "areas",
    title: "Onde está essa IoT?",
    hint: "Casa, cidade, saúde ou campo?",
    bins: ["casa", "cidade", "saude", "campo"],
    cards: [
      { id: "a-lampada", icon: "💡", name: "Lâmpada da sala que acende pelo app.", answer: "casa", why: "Casa inteligente." },
      { id: "a-assistente", icon: "🔊", name: "Assistente de voz que liga a TV do quarto.", answer: "casa", why: "Casa inteligente." },
      { id: "a-semaforo", icon: "🚦", name: "Semáforo que muda conforme o trânsito.", answer: "cidade", why: "Cidade inteligente." },
      { id: "a-onibus", icon: "🚌", name: "App mostra onde o ônibus está agora.", answer: "cidade", why: "Cidade inteligente." },
      { id: "a-relogio", icon: "⌚", name: "Relógio mede os batimentos do coração.", answer: "saude", why: "IoT cuidando da saúde." },
      { id: "a-glicose", icon: "🩺", name: "Sensor de glicose envia dados ao celular.", answer: "saude", why: "IoT cuidando da saúde." },
      { id: "a-plantacao", icon: "🌱", name: "Sensor avisa a hora de irrigar a plantação.", answer: "campo", why: "IoT no campo." },
      { id: "a-gado", icon: "🐄", name: "Coleira com GPS localiza o gado.", answer: "campo", why: "IoT no campo." }
    ]
  },
  {
    id: "seguranca",
    title: "Seguro ou perigoso?",
    hint: "Isso protege ou ajuda um invasor?",
    bins: ["seguro", "perigo"],
    cards: [
      { id: "trocar-senha", icon: "🔑", name: "Trocar a senha padrão", detail: "Da câmera nova", answer: "seguro", why: "Senha padrão é a primeira que o invasor tenta." },
      { id: "atualizar", icon: "🔄", name: "Atualizar o aparelho", detail: "Quando ele pedir", answer: "seguro", why: "A atualização corrige falhas de segurança." },
      { id: "duas-etapas", icon: "📲", name: "Verificação em duas etapas", detail: "No app da casa", answer: "seguro", why: "Mesmo com a senha, o invasor precisa do seu celular." },
      { id: "wifi-aberto", icon: "📶", name: "Wi-Fi sem senha", detail: "Na casa toda", answer: "perigo", why: "Qualquer pessoa entra na rede e chega aos aparelhos." },
      { id: "senha-123", icon: "🔓", name: "Senha “123456”", detail: "No roteador", answer: "perigo", why: "É uma das senhas mais fáceis de adivinhar." },
      { id: "postar-senha", icon: "📢", name: "Postar a senha do Wi-Fi", detail: "Nas redes sociais", answer: "perigo", why: "Senha é segredo: nunca publique." }
    ]
  }
];
