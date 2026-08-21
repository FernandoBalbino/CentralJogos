export const SIDE_GAME_DATA_VERSION = 1;

export const optionSets = Object.freeze({
  nature: Object.freeze([
    { id: "hardware", label: "Hardware", direction: "left", icon: "arrow_back.svg" },
    { id: "neither", label: "Nenhum dos dois", direction: "center", icon: "arrow_downward.svg" },
    { id: "software", label: "Software", direction: "right", icon: "arrow_forward.svg" }
  ]),
  peripheral: Object.freeze([
    { id: "input", label: "Entrada", direction: "left", icon: "arrow_back.svg" },
    { id: "hybrid", label: "Híbrido", direction: "center", icon: "arrow_downward.svg" },
    { id: "output", label: "Saída", direction: "right", icon: "arrow_forward.svg" }
  ])
});

const itemAsset = (id, extension) => `./assets/items/${id}.${extension}`;
const iconAsset = (name) => `./assets/side-game/icons/${name}.svg`;
const brandAsset = (name) => `./assets/side-game/brands/${name}.svg`;

const materialAttribution = (icon) => ({
  source: "https://github.com/google/material-design-icons",
  license: "Apache-2.0",
  author: "Google",
  title: `Material Symbol: ${icon}`
});

const simpleIconsAttribution = (icon) => ({
  source: "https://github.com/simple-icons/simple-icons",
  license: "CC0-1.0; marcas pertencem aos respectivos titulares",
  author: "Simple Icons e titular da marca",
  title: `Simple Icon: ${icon}`
});

const legacy = (id, name, mode, answer, extension, alt, explanation) => ({
  id, name, mode, answer, image: itemAsset(id, extension), alt, explanation, creditId: id
});

const material = (id, name, mode, answer, icon, alt, explanation) => ({
  id, name, mode, answer, image: iconAsset(icon), alt, explanation,
  attribution: materialAttribution(icon)
});

const brand = (id, name, answer, icon, alt, explanation) => ({
  id, name, mode: "nature", answer, image: brandAsset(icon), alt, explanation,
  attribution: simpleIconsAttribution(icon)
});

export const sideGameItems = Object.freeze([
  legacy("teclado", "Teclado", "peripheral", "input", "jpg", "Teclado de computador", "O teclado envia letras, números e comandos para o computador, por isso é um periférico de entrada."),
  legacy("mouse", "Mouse", "peripheral", "input", "jpg", "Mouse de computador", "O mouse envia movimentos e cliques para o computador, funcionando como periférico de entrada."),
  legacy("microfone", "Microfone", "peripheral", "input", "jpg", "Microfone para computador", "O microfone captura o som e o envia ao computador em forma de dados."),
  legacy("scanner", "Scanner", "peripheral", "input", "jpg", "Scanner de mesa", "O scanner transforma documentos e imagens físicas em dados digitais enviados ao computador."),
  legacy("webcam", "Webcam", "peripheral", "input", "jpg", "Câmera webcam", "A webcam captura imagens e vídeo e os envia para o computador."),
  legacy("leitor-codigo-barras", "Leitor de código de barras", "peripheral", "input", "jpg", "Leitor de código de barras", "O leitor captura o código impresso e envia sua informação ao computador."),
  legacy("mesa-digitalizadora", "Mesa digitalizadora", "peripheral", "input", "jpg", "Mesa digitalizadora com caneta", "A mesa digitalizadora envia ao computador os movimentos e a pressão realizados com a caneta."),
  legacy("leitor-biometrico", "Leitor biométrico", "peripheral", "input", "jpg", "Leitor biométrico de impressão digital", "O leitor biométrico captura uma característica física e envia os dados para identificação."),

  legacy("monitor", "Monitor", "peripheral", "output", "jpg", "Monitor de computador", "O monitor recebe dados do computador e apresenta imagens ao usuário."),
  legacy("impressora", "Impressora", "peripheral", "output", "jpg", "Impressora de computador", "A impressora recebe dados do computador e produz uma saída em papel."),
  legacy("caixa-som", "Caixa de som", "peripheral", "output", "jpg", "Caixas de som para computador", "A caixa de som recebe o áudio processado pelo computador e o reproduz."),
  legacy("fone-ouvido", "Fone de ouvido", "peripheral", "output", "jpg", "Fone de ouvido sem microfone", "O fone recebe o sinal de áudio do computador e o apresenta ao usuário."),
  legacy("projetor", "Projetor", "peripheral", "output", "jpg", "Projetor de vídeo", "O projetor recebe imagens do computador e as exibe em uma superfície maior."),
  legacy("plotter", "Plotter", "peripheral", "output", "jpg", "Impressora plotter", "O plotter recebe desenhos do computador e os imprime em grande formato."),
  legacy("impressora-3d", "Impressora 3D", "peripheral", "output", "jpg", "Impressora 3D", "A impressora 3D recebe um modelo digital e produz um objeto físico."),
  legacy("painel-led", "Painel de LED", "peripheral", "output", "jpg", "Painel eletrônico de LED", "O painel recebe dados e os apresenta visualmente por meio de LEDs."),

  legacy("processador", "Processador", "nature", "hardware", "jpg", "Processador de computador", "O processador é uma peça física que executa instruções e cálculos."),
  legacy("placa-mae", "Placa-mãe", "nature", "hardware", "jpg", "Placa-mãe de computador", "A placa-mãe é o componente físico que conecta e permite a comunicação entre as peças."),
  legacy("memoria-ram", "Memória RAM", "nature", "hardware", "jpg", "Módulo de memória RAM", "A memória RAM é um componente físico que guarda temporariamente os dados dos programas em execução."),
  legacy("ssd", "SSD", "nature", "hardware", "jpg", "Unidade de estado sólido SSD", "O SSD é um dispositivo físico usado para armazenar dados de forma permanente."),
  legacy("disco-rigido", "Disco rígido", "nature", "hardware", "jpg", "Disco rígido de computador", "O disco rígido é uma peça física de armazenamento magnético."),
  legacy("placa-video", "Placa de vídeo", "nature", "hardware", "jpg", "Placa de vídeo GPU", "A placa de vídeo é um componente físico que processa e gera imagens."),
  legacy("fonte-alimentacao", "Fonte de alimentação", "nature", "hardware", "jpg", "Fonte de alimentação de computador", "A fonte é uma peça física que converte e distribui energia para o computador."),
  legacy("cooler", "Cooler", "nature", "hardware", "jpg", "Cooler de processador", "O cooler é um componente físico usado para retirar calor das peças."),

  legacy("windows", "Windows", "nature", "software", "svg", "Logotipo do Windows", "Windows é um sistema operacional, portanto é software."),
  legacy("ubuntu", "Ubuntu", "nature", "software", "svg", "Logotipo do Ubuntu", "Ubuntu é uma distribuição de sistema operacional baseada em Linux."),
  legacy("google-chrome", "Google Chrome", "nature", "software", "svg", "Logotipo do Google Chrome", "Google Chrome é um navegador instalado e executado como software."),
  legacy("mozilla-firefox", "Mozilla Firefox", "nature", "software", "svg", "Logotipo do Mozilla Firefox", "Mozilla Firefox é um navegador, portanto é software."),
  legacy("libreoffice-writer", "LibreOffice Writer", "nature", "software", "svg", "Logotipo do LibreOffice Writer", "LibreOffice Writer é um aplicativo de edição de textos."),
  legacy("vlc", "VLC Media Player", "nature", "software", "svg", "Logotipo do VLC Media Player", "VLC é um programa usado para reproduzir áudio e vídeo."),
  legacy("gimp", "GIMP", "nature", "software", "svg", "Mascote do editor GIMP", "GIMP é um aplicativo de edição de imagens."),
  legacy("seven-zip", "7-Zip", "nature", "software", "svg", "Logotipo do 7-Zip", "7-Zip é um programa usado para compactar e descompactar arquivos."),

  legacy("touchscreen", "Monitor touchscreen", "peripheral", "hybrid", "jpg", "Monitor com tela sensível ao toque", "Ele mostra imagens e também recebe toques do usuário, combinando saída e entrada."),
  legacy("multifuncional", "Impressora multifuncional", "peripheral", "hybrid", "jpg", "Impressora multifuncional com scanner", "Ela imprime dados e também digitaliza documentos, realizando saída e entrada."),
  legacy("headset", "Headset com microfone", "peripheral", "hybrid", "jpg", "Headset com fones e microfone", "O fone reproduz áudio e o microfone captura som, reunindo saída e entrada."),
  legacy("modem", "Modem", "peripheral", "hybrid", "jpg", "Modem de computador", "O modem recebe e envia dados durante uma comunicação de rede."),
  legacy("roteador", "Roteador", "peripheral", "hybrid", "jpg", "Roteador sem fio", "O roteador recebe e encaminha dados entre dispositivos e redes."),
  legacy("pen-drive", "Pen drive", "peripheral", "hybrid", "jpg", "Unidade de memória USB", "O pen drive permite ler dados dele e gravar novos dados nele."),
  legacy("hd-externo", "HD externo", "peripheral", "hybrid", "jpg", "Disco rígido externo", "O HD externo envia arquivos ao computador e também recebe arquivos para armazenamento."),
  legacy("gravador-dvd", "Gravador de DVD", "peripheral", "hybrid", "jpg", "Unidade gravadora de DVD", "Ele lê dados de discos e também grava dados em mídias compatíveis."),

  material("placa-rede", "Placa de rede", "nature", "hardware", "settings_ethernet", "Ícone de conexão de rede", "A placa de rede é o componente físico que conecta o computador a uma rede."),
  material("switch-rede", "Switch de rede", "nature", "hardware", "router", "Ícone de equipamento de rede", "O switch é um equipamento físico que interliga dispositivos em uma rede local."),
  brand("linux", "Linux", "software", "linux", "Logotipo do Linux", "Linux é o núcleo de um sistema operacional e, portanto, é software."),
  brand("android", "Android", "software", "android", "Logotipo do Android", "Android é um sistema operacional usado principalmente em dispositivos móveis."),
  material("microsoft-word", "Microsoft Word", "nature", "software", "description", "Ícone de documento de texto", "Microsoft Word é um aplicativo de edição de textos."),
  material("driver-dispositivo", "Driver de dispositivo", "nature", "software", "developer_mode", "Ícone de software de dispositivo", "Driver é o software que permite ao sistema operacional controlar um dispositivo."),
  material("antivirus", "Antivírus", "nature", "software", "security", "Ícone de proteção digital", "Antivírus é um programa criado para detectar e bloquear ameaças."),
  material("bios-uefi", "BIOS/UEFI", "nature", "software", "memory", "Ícone de firmware em chip", "BIOS e UEFI são firmware: software armazenado em memória não volátil que inicializa o computador."),
  material("sistema-operacional", "Sistema operacional", "nature", "software", "developer_mode", "Ícone de sistema operacional", "Sistema operacional é o conjunto de programas que administra o hardware e os aplicativos."),
  material("aplicativo", "Aplicativo", "nature", "software", "apps", "Ícone de aplicativos", "Aplicativo é um programa desenvolvido para realizar tarefas para o usuário."),

  material("internet", "Internet", "nature", "neither", "language", "Ícone de globo representando a Internet", "Internet é uma rede mundial de redes; não é, por si só, uma peça nem um programa."),
  material("wifi", "Wi-Fi", "nature", "neither", "wifi", "Símbolo de Wi-Fi", "Wi-Fi é uma tecnologia de comunicação sem fio; o adaptador é hardware e seu driver é software."),
  material("bluetooth", "Bluetooth", "nature", "neither", "bluetooth", "Símbolo de Bluetooth", "Bluetooth é um padrão de comunicação sem fio, não uma peça ou programa específico."),
  material("arquivo-pdf", "Arquivo PDF", "nature", "neither", "picture_as_pdf", "Ícone de arquivo PDF", "Um PDF é um arquivo com dados em determinado formato, não o programa que o abre."),
  material("senha", "Senha", "nature", "neither", "vpn_key", "Ícone de chave representando uma senha", "Senha é uma informação usada para autenticação, não hardware nem software."),
  material("endereco-ip", "Endereço IP", "nature", "neither", "settings_ethernet", "Ícone de endereço de rede", "Endereço IP é um identificador lógico atribuído a um dispositivo em rede."),
  material("url", "URL", "nature", "neither", "http", "Ícone de endereço web", "URL é o endereço usado para localizar um recurso na web."),
  material("usuario", "Usuário", "nature", "neither", "person", "Ícone de pessoa usuária", "Usuário representa uma pessoa ou identidade que utiliza o sistema."),
  material("pasta", "Pasta", "nature", "neither", "folder", "Ícone de pasta", "Pasta é uma estrutura lógica usada para organizar arquivos."),
  material("arquivo", "Arquivo", "nature", "neither", "insert_drive_file", "Ícone de arquivo", "Arquivo é uma unidade de dados armazenada, não o hardware nem o programa."),
  material("dado", "Dado", "nature", "neither", "storage", "Ícone de dados armazenados", "Dado é uma representação de informação que pode ser processada ou armazenada."),
  material("rede-computadores", "Rede de computadores", "nature", "neither", "device_hub", "Ícone de dispositivos conectados", "Rede é o conjunto de dispositivos e conexões que permite a troca de dados."),
  material("html", "Linguagem HTML", "nature", "neither", "code", "Ícone de código HTML", "HTML é uma linguagem de marcação usada para estruturar páginas."),
  material("algoritmo", "Algoritmo", "nature", "neither", "account_tree", "Ícone de fluxo de algoritmo", "Algoritmo é uma sequência abstrata de passos para resolver um problema."),
  material("bit", "Bit", "nature", "neither", "filter_1", "Ícone do número um", "Bit é a menor unidade de informação digital e pode assumir os valores zero ou um."),

  material("touchpad", "Touchpad", "peripheral", "input", "touch_app", "Ícone de superfície sensível ao toque", "O touchpad captura movimentos e toques e os envia ao computador."),
  material("trackball", "Trackball", "peripheral", "input", "mouse", "Ícone de dispositivo apontador", "O trackball envia ao computador o movimento realizado ao girar sua esfera."),
  material("joystick", "Joystick sem vibração", "peripheral", "input", "sports_esports", "Ícone de joystick", "Sem retorno tátil, o joystick envia posições e comandos ao computador como entrada."),
  material("impressora-termica", "Impressora térmica", "peripheral", "output", "print", "Ícone de impressora térmica", "A impressora térmica recebe dados do computador e os imprime em papel térmico."),
  material("tv-monitor", "TV usada como monitor", "peripheral", "output", "tv", "Ícone de televisão", "Usada como monitor, a TV recebe o sinal do computador e apresenta imagem e som."),
  material("subwoofer", "Subwoofer", "peripheral", "output", "speaker", "Ícone de alto-falante", "O subwoofer recebe o áudio do computador e reproduz principalmente frequências graves."),
  material("interface-audio", "Interface de áudio USB", "peripheral", "hybrid", "graphic_eq", "Ícone de interface de áudio", "A interface recebe áudio de microfones ou instrumentos e também envia som para fones e caixas."),
  material("leitor-gravador-cartao", "Leitor/gravador de cartão", "peripheral", "hybrid", "sd_card", "Ícone de cartão de memória", "O dispositivo lê dados do cartão e também grava novos dados nele."),
  material("controle-vibracao", "Controle com vibração", "peripheral", "hybrid", "sports_esports", "Ícone de controle de videogame", "O controle envia comandos e recebe do computador o retorno tátil produzido pela vibração.")
]);

export const sideGameItemMap = new Map(sideGameItems.map((item) => [item.id, item]));

export const getOptionsForItem = (item) => optionSets[item.mode] || optionSets.nature;

export const getAnswerLabel = (item) => getOptionsForItem(item)
  .find((option) => option.id === item.answer)?.label || item.answer;

export const getQuestionForItem = (item) => item.mode === "peripheral"
  ? "Que tipo de periférico é?"
  : "O que este item é?";
