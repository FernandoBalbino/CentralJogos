const image = (src) => ({ type: "image", src });
const symbol = (id) => ({ type: "symbol", id, src: "./assets/memory-game/tech-illustrations.svg" });

export const memoryCategories = [
  { id: "hardware", label: "Hardware", icon: "▣", description: "Peças e armazenamento" },
  { id: "software", label: "Software", icon: "◫", description: "Sistemas e aplicativos" },
  { id: "peripherals", label: "Periféricos", icon: "⌨", description: "Entrada, saída e híbridos" },
  { id: "networks", label: "Redes", icon: "⌁", description: "Tipos, protocolos e serviços" },
  { id: "topologies", label: "Topologias", icon: "⌘", description: "Organização das conexões" },
  { id: "security", label: "Firewall e VPN", icon: "◇", description: "Proteção e acesso seguro" },
  { id: "malware", label: "Malware", icon: "⚠", description: "Ameaças digitais" },
  { id: "wireless", label: "Comunicação sem fio", icon: "◌", description: "Tecnologias por ondas" }
];

export const memoryGamePairs = [
  // Hardware — 11
  { id: "hardware-hd", name: "HD", category: "hardware", visual: image("./assets/items/disco-rigido.jpg"), definition: "Armazena arquivos e programas de forma permanente usando discos magnéticos.", alt: "Disco rígido aberto mostrando discos magnéticos" },
  { id: "hardware-ssd", name: "SSD", category: "hardware", visual: image("./assets/items/ssd.jpg"), definition: "Armazena dados permanentemente em memória eletrônica, com acesso rápido e sem partes móveis.", alt: "Unidade de armazenamento em estado sólido" },
  { id: "hardware-ram", name: "Memória RAM", category: "hardware", visual: image("./assets/items/memoria-ram.jpg"), definition: "Mantém temporariamente os dados dos programas em uso e perde o conteúdo ao desligar.", alt: "Módulo de memória temporária de computador" },
  { id: "hardware-cpu", name: "Processador / CPU", category: "hardware", visual: image("./assets/items/processador.jpg"), definition: "Executa instruções, realiza cálculos e coordena as principais tarefas do computador.", alt: "Processador de computador" },
  { id: "hardware-motherboard", name: "Placa-mãe", category: "hardware", visual: image("./assets/items/placa-mae.jpg"), definition: "Interliga os componentes internos e permite que eles troquem dados e recebam energia.", alt: "Placa principal com conectores e circuitos" },
  { id: "hardware-psu", name: "Fonte de alimentação", category: "hardware", visual: image("./assets/items/fonte-alimentacao.jpg"), definition: "Converte a energia da tomada e distribui as tensões adequadas aos componentes internos.", alt: "Fonte de energia para computador" },
  { id: "hardware-gpu", name: "Placa de vídeo", category: "hardware", visual: image("./assets/items/placa-video.jpg"), definition: "Processa imagens e gráficos para enviá-los ao dispositivo de exibição.", alt: "Placa dedicada ao processamento gráfico" },
  { id: "hardware-cooler", name: "Cooler", category: "hardware", visual: image("./assets/items/cooler.jpg"), definition: "Ajuda a retirar o calor dos componentes para evitar superaquecimento.", alt: "Ventoinha para resfriamento de computador" },
  { id: "hardware-network-card", name: "Placa de rede", category: "hardware", visual: symbol("network-card"), definition: "Fornece a interface física ou sem fio usada pelo dispositivo para participar de uma rede.", alt: "Placa com conector e ondas de rede" },
  { id: "hardware-pendrive", name: "Pendrive", category: "hardware", visual: image("./assets/items/pen-drive.jpg"), definition: "Transporta arquivos em memória portátil conectada normalmente a uma porta USB.", alt: "Unidade portátil conectada por USB" },
  { id: "hardware-external-hd", name: "HD externo", category: "hardware", visual: image("./assets/items/hd-externo.jpg"), definition: "Oferece armazenamento permanente portátil em uma unidade conectada externamente.", alt: "Unidade externa para armazenamento de arquivos" },

  // Software — 8
  { id: "software-operating-system", name: "Sistema operacional", category: "software", visual: symbol("operating-system"), definition: "Gerencia o hardware, os arquivos e a execução dos demais programas do dispositivo.", alt: "Camadas entre usuário, programas e componentes físicos" },
  { id: "software-windows", name: "Windows", category: "software", visual: image("./assets/items/windows.svg"), definition: "Família de sistemas para computadores conhecida pela interface com janelas e menu Iniciar.", alt: "Logotipo de um sistema da Microsoft" },
  { id: "software-linux", name: "Linux", category: "software", visual: image("./assets/side-game/brands/linux.svg"), definition: "Família de sistemas de código aberto usada em computadores, servidores e outros dispositivos.", alt: "Pinguim associado a uma família de sistemas de código aberto" },
  { id: "software-chrome", name: "Google Chrome", category: "software", visual: image("./assets/items/google-chrome.svg"), definition: "Programa usado para acessar sites e aplicações disponíveis na Web.", alt: "Logotipo circular colorido de um navegador" },
  { id: "software-google-docs", name: "Google Docs", category: "software", visual: symbol("google-docs"), definition: "Editor on-line que permite criar textos e colaborar com outras pessoas em tempo real.", alt: "Folha azul representando um editor de textos on-line" },
  { id: "software-browser", name: "Navegador", category: "software", visual: symbol("browser"), definition: "Interpreta páginas da Web e permite visitar sites por meio de endereços e links.", alt: "Janela com barra de endereço e página da Web" },
  { id: "software-application", name: "Aplicativo", category: "software", visual: symbol("application"), definition: "Programa criado para ajudar o usuário a realizar uma tarefa específica.", alt: "Grade de pequenos programas em uma tela" },
  { id: "software-software", name: "Software", category: "software", visual: symbol("software"), definition: "Conjunto de instruções e dados que orienta o funcionamento de um dispositivo.", alt: "Linhas de código dentro de uma janela" },

  // Periféricos — 15
  { id: "peripheral-keyboard", name: "Teclado", category: "peripherals", visual: image("./assets/items/teclado.jpg"), definition: "Permite inserir letras, números e comandos por meio de teclas.", alt: "Dispositivo com teclas para digitação" },
  { id: "peripheral-mouse", name: "Mouse", category: "peripherals", visual: image("./assets/items/mouse.jpg"), definition: "Controla o ponteiro e envia cliques e movimentos ao computador.", alt: "Dispositivo apontador de mão" },
  { id: "peripheral-microphone", name: "Microfone", category: "peripherals", visual: image("./assets/items/microfone.jpg"), definition: "Captura sons e os transforma em dados que podem ser gravados ou transmitidos.", alt: "Dispositivo para captura de som" },
  { id: "peripheral-webcam", name: "Webcam", category: "peripherals", visual: image("./assets/items/webcam.jpg"), definition: "Captura imagens e vídeos para chamadas, gravações ou transmissões.", alt: "Câmera pequena para computador" },
  { id: "peripheral-scanner", name: "Scanner", category: "peripherals", visual: image("./assets/items/scanner.jpg"), definition: "Digitaliza documentos ou fotografias em papel, criando arquivos no computador.", alt: "Equipamento de mesa para digitalização" },
  { id: "peripheral-biometric", name: "Leitor biométrico", category: "peripherals", visual: image("./assets/items/leitor-biometrico.jpg"), definition: "Captura uma característica do corpo, como a impressão digital, para identificação.", alt: "Sensor para leitura de impressão digital" },
  { id: "peripheral-barcode", name: "Leitor de código de barras", category: "peripherals", visual: image("./assets/items/leitor-codigo-barras.jpg"), definition: "Captura padrões de barras para inserir rapidamente o código de um produto.", alt: "Leitor manual apontado para um código de barras" },
  { id: "peripheral-monitor", name: "Monitor", category: "peripherals", visual: image("./assets/items/monitor.jpg"), definition: "Exibe visualmente textos, imagens, vídeos e a interface do computador.", alt: "Tela usada para exibir a imagem do computador" },
  { id: "peripheral-printer", name: "Impressora", category: "peripherals", visual: image("./assets/items/impressora.jpg"), definition: "Produz em papel uma cópia física de textos e imagens digitais.", alt: "Equipamento que imprime em papel" },
  { id: "peripheral-speaker", name: "Caixa de som", category: "peripherals", visual: image("./assets/items/caixa-som.jpg"), definition: "Transforma sinais do computador em áudio que pode ser ouvido no ambiente.", alt: "Alto-falante para reprodução de áudio" },
  { id: "peripheral-projector", name: "Projetor", category: "peripherals", visual: image("./assets/items/projetor.jpg"), definition: "Amplia a imagem do computador sobre uma parede ou tela de projeção.", alt: "Equipamento para projetar imagens" },
  { id: "peripheral-headphones", name: "Fone de ouvido", category: "peripherals", visual: image("./assets/items/fone-ouvido.jpg"), definition: "Reproduz áudio diretamente para uma pessoa, sem espalhá-lo pelo ambiente.", alt: "Fones usados sobre as orelhas" },
  { id: "peripheral-headset", name: "Headset", category: "peripherals", visual: image("./assets/items/headset.jpg"), definition: "Combina reprodução de áudio e captura de voz no mesmo acessório.", alt: "Fones com microfone acoplado" },
  { id: "peripheral-touchscreen", name: "Tela touchscreen", category: "peripherals", visual: image("./assets/items/touchscreen.jpg"), definition: "Exibe informações e também recebe comandos quando o usuário toca sua superfície.", alt: "Tela sendo controlada pelo toque" },
  { id: "peripheral-multifunction", name: "Impressora multifuncional", category: "peripherals", visual: image("./assets/items/multifuncional.jpg"), definition: "Reúne impressão e digitalização, podendo tanto receber quanto enviar dados ao computador.", alt: "Equipamento que imprime e digitaliza" },

  // Topologias — 5
  { id: "topology-star", name: "Topologia em estrela", category: "topologies", visual: symbol("topology-star"), definition: "Todos os dispositivos se conectam diretamente a um ponto central da rede.", alt: "Cinco computadores ligados a um equipamento central" },
  { id: "topology-bus", name: "Topologia em barramento", category: "topologies", visual: symbol("topology-bus"), definition: "Os dispositivos compartilham um único cabo principal para trocar dados.", alt: "Computadores ligados ao longo de um cabo principal" },
  { id: "topology-ring", name: "Topologia em anel", category: "topologies", visual: symbol("topology-ring"), definition: "Cada dispositivo se liga a dois vizinhos, formando um caminho fechado.", alt: "Computadores conectados em um circuito fechado" },
  { id: "topology-mesh", name: "Topologia em malha", category: "topologies", visual: symbol("topology-mesh"), definition: "Existem vários caminhos entre os dispositivos, aumentando a tolerância a falhas.", alt: "Nós de rede unidos por várias conexões cruzadas" },
  { id: "topology-tree", name: "Topologia em árvore", category: "topologies", visual: symbol("topology-tree"), definition: "A rede se organiza em níveis, com ramificações que partem de pontos superiores.", alt: "Rede hierárquica com ramos em diferentes níveis" },

  // Redes — 15
  { id: "network-lan", name: "LAN", category: "networks", visual: symbol("lan"), definition: "Conecta dispositivos em uma área pequena, como residência, laboratório, escola ou empresa.", alt: "Dispositivos conectados dentro de um prédio" },
  { id: "network-man", name: "MAN", category: "networks", visual: symbol("man"), definition: "Interliga diferentes pontos distribuídos pela área de uma cidade.", alt: "Prédios de uma cidade ligados em rede" },
  { id: "network-wan", name: "WAN", category: "networks", visual: symbol("wan"), definition: "Cobre grandes distâncias e pode conectar cidades, estados ou países.", alt: "Mapa com pontos distantes interligados" },
  { id: "network-router", name: "Roteador", category: "networks", visual: image("./assets/items/roteador.jpg"), definition: "Encaminha dados entre redes diferentes e escolhe o caminho até o destino.", alt: "Equipamento de rede com antenas" },
  { id: "network-switch", name: "Switch", category: "networks", visual: symbol("switch"), definition: "Conecta dispositivos na mesma rede local e envia os dados à porta do destino adequado.", alt: "Equipamento com várias portas de rede conectadas" },
  { id: "network-ip", name: "Endereço IP", category: "networks", visual: symbol("ip-address"), definition: "Identifica logicamente um dispositivo para que ele possa enviar e receber dados em uma rede.", alt: "Computador identificado pelo número 192.168.1.10" },
  { id: "network-mac", name: "Endereço MAC", category: "networks", visual: symbol("mac-address"), definition: "Identificador associado à interface de rede de um dispositivo.", alt: "Placa de rede com identificador hexadecimal" },
  { id: "network-mask", name: "Máscara de sub-rede", category: "networks", visual: symbol("subnet-mask"), definition: "Indica qual parte de um endereço representa a rede e qual parte representa o dispositivo.", alt: "Endereço dividido visualmente entre rede e dispositivo" },
  { id: "network-gateway", name: "Gateway", category: "networks", visual: symbol("gateway"), definition: "É o caminho usado por um dispositivo para alcançar outras redes.", alt: "Computadores passando por um roteador para chegar à Internet" },
  { id: "network-dns", name: "DNS", category: "networks", visual: symbol("dns"), definition: "Relaciona nomes de domínio aos respectivos endereços de rede.", alt: "Nome de site apontando para um endereço numérico" },
  { id: "network-dhcp", name: "DHCP", category: "networks", visual: symbol("dhcp"), definition: "Fornece automaticamente endereços e outras configurações de rede aos dispositivos.", alt: "Roteador distribuindo configurações a três computadores" },
  { id: "network-nat", name: "NAT", category: "networks", visual: symbol("nat"), definition: "Traduz endereços privados para permitir que vários dispositivos compartilhem um acesso externo.", alt: "Vários endereços privados convertidos em um endereço público" },
  { id: "network-ipv4", name: "IPv4", category: "networks", visual: symbol("ipv4"), definition: "Usa endereços de 32 bits, normalmente escritos como quatro números decimais separados por pontos.", alt: "Exemplo de endereço com quatro grupos decimais" },
  { id: "network-ipv6", name: "IPv6", category: "networks", visual: symbol("ipv6"), definition: "Usa endereços de 128 bits, ampliando muito a quantidade de identificadores disponíveis.", alt: "Exemplo de endereço longo com grupos hexadecimais" },
  { id: "network-modem", name: "Modem", category: "networks", visual: image("./assets/items/modem.jpg"), definition: "Adapta o sinal do provedor ao meio de comunicação usado para levar a conexão até o local.", alt: "Equipamento que recebe o sinal do provedor" },

  // Segurança — 2
  { id: "security-firewall", name: "Firewall", category: "security", visual: symbol("firewall"), definition: "Controla o tráfego de entrada e saída utilizando regras de segurança.", alt: "Internet separada da rede interna por um escudo e uma parede" },
  { id: "security-vpn", name: "VPN", category: "security", visual: symbol("vpn"), definition: "Cria uma conexão protegida entre o dispositivo e outro ponto da rede.", alt: "Computador e servidor ligados por um túnel protegido" },

  // Malware — 8
  { id: "malware-virus", name: "Vírus", category: "malware", visual: symbol("virus"), definition: "Anexa-se a arquivos ou programas e se espalha quando o conteúdo infectado é executado.", alt: "Arquivo com símbolo de ameaça se multiplicando" },
  { id: "malware-worm", name: "Worm", category: "malware", visual: symbol("worm"), definition: "Espalha-se automaticamente entre dispositivos e redes sem depender de cópia manual pelo usuário.", alt: "Ameaça se propagando por vários computadores conectados" },
  { id: "malware-trojan", name: "Cavalo de Troia", category: "malware", visual: symbol("trojan"), definition: "Disfarça-se de programa ou arquivo legítimo para enganar o usuário.", alt: "Presente aparentemente confiável escondendo um símbolo de ameaça" },
  { id: "malware-spyware", name: "Spyware", category: "malware", visual: symbol("spyware"), definition: "Coleta informações do usuário ou do computador sem autorização.", alt: "Olho observando dados em uma tela" },
  { id: "malware-ransomware", name: "Ransomware", category: "malware", visual: symbol("ransomware"), definition: "Pode bloquear ou criptografar arquivos e exigir pagamento para liberá-los.", alt: "Arquivos bloqueados por um cadeado com cobrança" },
  { id: "malware-adware", name: "Adware", category: "malware", visual: symbol("adware"), definition: "Exibe anúncios indesejados e pode acompanhar hábitos de navegação.", alt: "Muitas janelas de anúncio cobrindo uma tela" },
  { id: "malware-keylogger", name: "Keylogger", category: "malware", visual: symbol("keylogger"), definition: "Registra aquilo que é digitado no teclado sem o conhecimento do usuário.", alt: "Teclado monitorado por um olho" },
  { id: "malware-rootkit", name: "Rootkit", category: "malware", visual: symbol("rootkit"), definition: "Oculta a presença de uma ameaça e mantém acesso privilegiado ao sistema.", alt: "Ameaça escondida sob as camadas de um sistema" },

  // Comunicação sem fio — 5
  { id: "wireless-wifi", name: "Wi-Fi", category: "wireless", visual: image("./assets/side-game/icons/wifi.svg"), definition: "Permite que dispositivos participem de uma rede local utilizando ondas de rádio.", alt: "Ondas de uma conexão local sem fio" },
  { id: "wireless-bluetooth", name: "Bluetooth", category: "wireless", visual: image("./assets/side-game/icons/bluetooth.svg"), definition: "Permite comunicação sem fio de curta distância entre dispositivos próximos.", alt: "Símbolo de comunicação pessoal de curta distância" },
  { id: "wireless-nfc", name: "NFC", category: "wireless", visual: symbol("nfc"), definition: "Troca informações quando dois dispositivos são aproximados a poucos centímetros.", alt: "Celular aproximado de uma etiqueta de comunicação" },
  { id: "wireless-infrared", name: "Infravermelho", category: "wireless", visual: symbol("infrared"), definition: "Transmite dados por luz invisível e normalmente exige curta distância e direção direta.", alt: "Controle remoto enviando feixes de luz a um aparelho" },
  { id: "wireless-satellite", name: "Comunicação via satélite", category: "wireless", visual: symbol("satellite"), definition: "Envia sinais por equipamentos no espaço para alcançar áreas muito distantes.", alt: "Antenas no solo trocando sinais por um satélite" }
];

export const memoryPairMap = new Map(memoryGamePairs.map((pair) => [pair.id, pair]));
