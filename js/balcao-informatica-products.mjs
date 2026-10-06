const product = (id, name, category, file, knowledge) => Object.freeze({ id, name, category, image: `./assets/items/${file}.jpg`, alt: name, knowledge });
export const CATEGORIES = Object.freeze({ all: "Todos", peripherals: "Periféricos", storage: "Armazenamento", components: "Componentes", network: "Rede" });
export const PRODUCTS = Object.freeze([
  product("mouse", "Mouse", "peripherals", "mouse", "Controla o ponteiro e permite selecionar elementos na tela."),
  product("keyboard", "Teclado", "peripherals", "teclado", "Permite digitar textos, números e comandos."),
  product("monitor", "Monitor", "peripherals", "monitor", "Exibe as imagens produzidas pelo computador."),
  product("webcam", "Webcam", "peripherals", "webcam", "Captura imagens e vídeo para aulas, chamadas e gravações."),
  product("headset", "Headset", "peripherals", "headset", "Reúne fones e microfone para ouvir e falar com privacidade."),
  product("printer", "Impressora", "peripherals", "impressora", "Transfere textos e imagens do computador para o papel."),
  product("speakers", "Caixa de som", "peripherals", "caixa-som", "Reproduz áudio no ambiente para várias pessoas ouvirem."),
  product("hd", "HD", "storage", "disco-rigido", "Armazena arquivos de forma permanente em discos magnéticos. É uma opção para grande capacidade com menor custo por espaço."),
  product("ssd", "SSD", "storage", "ssd", "Armazena arquivos sem partes móveis. Substituir um HD por SSD reduz o tempo de carregamento do sistema e dos programas."),
  product("usb", "Pen drive", "storage", "pen-drive", "Transporta arquivos em um dispositivo pequeno conectado à porta USB."),
  product("ram", "Memória RAM", "components", "memoria-ram", "Mantém temporariamente dados dos programas em uso. Mais capacidade ajuda quando falta memória ao abrir vários programas."),
  product("gpu", "Placa de vídeo", "components", "placa-video", "Processa gráficos e imagens. Pode melhorar jogos quando o limite está no processamento gráfico."),
  product("cpu", "Processador", "components", "processador", "Executa instruções, cálculos e o processamento geral dos programas."),
  product("motherboard", "Placa-mãe", "components", "placa-mae", "É a placa principal onde os componentes se conectam e se comunicam."),
  product("psu", "Fonte", "components", "fonte-alimentacao", "Converte a energia elétrica da tomada e alimenta os componentes internos."),
  product("cooler", "Cooler", "components", "cooler", "Ajuda a dissipar o calor do processador para manter sua temperatura adequada."),
  product("router", "Roteador", "network", "roteador", "Encaminha dados entre redes e, em modelos com Wi-Fi, compartilha a conexão sem fio."),
]);
export const PRODUCT_BY_ID = Object.freeze(Object.fromEntries(PRODUCTS.map(p => [p.id, p])));
export const catalogForPhase = phase => PRODUCTS.filter(p => p.category === "peripherals" || phase >= 1 && p.category === "storage" || phase >= 2 && p.category === "components" || phase >= 3 && p.category === "network");
