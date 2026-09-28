const hardware = (id, name, file, capabilities, explanation) => ({ id, name, image: `./assets/items/${file}`, categories: ["hardware"], capabilities, explanation });
const software = (id, name, image, capability, explanation) => ({ id, name, image, categories: ["software"], capabilities: [capability], explanation });

export const cartItems = [
  hardware("mouse", "Mouse", "mouse.jpg", ["point", "input"], "O mouse é um periférico de entrada: permite clicar e selecionar."),
  hardware("keyboard", "Teclado", "teclado.jpg", ["type", "input"], "O teclado envia letras, números e comandos para o computador."),
  hardware("monitor", "Monitor", "monitor.jpg", ["display", "output"], "O monitor é um periférico de saída: exibe imagens e informações."),
  hardware("printer", "Impressora", "impressora.jpg", ["print", "output"], "A impressora transforma o trabalho digital em uma cópia no papel."),
  hardware("webcam", "Webcam", "webcam.jpg", ["video", "input"], "A webcam captura imagens e vídeos. Aqui ela não representa um microfone."),
  hardware("microphone", "Microfone", "microfone.jpg", ["record", "input"], "O microfone captura a voz e envia o som ao computador."),
  hardware("speaker", "Caixa de som", "caixa-som.jpg", ["listen", "output"], "A caixa de som reproduz áudio; ela não grava a voz."),
  hardware("headset", "Headset com microfone", "headset.jpg", ["record", "listen", "input", "output"], "Este headset tem microfone para gravar a voz e fones para ouvir."),
  hardware("ssd", "SSD", "ssd.jpg", ["storage"], "O SSD guarda arquivos mesmo quando o computador está desligado."),
  hardware("hd", "HD", "disco-rigido.jpg", ["storage"], "O HD é um dispositivo de armazenamento permanente de arquivos."),
  hardware("usb", "Pendrive", "pen-drive.jpg", ["storage"], "O pendrive armazena arquivos e mantém os dados sem energia."),
  hardware("ram", "Memória RAM", "memoria-ram.jpg", ["temporary-memory"], "A RAM guarda dados temporários e perde seu conteúdo ao desligar."),
  hardware("cpu", "Processador", "processador.jpg", ["processing"], "O processador executa instruções e cálculos dos programas."),
  hardware("motherboard", "Placa-mãe", "placa-mae.jpg", ["connection"], "A placa-mãe conecta os componentes internos do computador."),
  hardware("gpu", "Placa de vídeo", "placa-video.jpg", ["graphics"], "A placa de vídeo processa gráficos que serão exibidos no monitor."),
  hardware("router", "Roteador", "roteador.jpg", ["network"], "O roteador encaminha dados entre redes e compartilha a conexão."),
  software("word", "Microsoft Word", "./assets/windows-file-organizer/icons/word.svg", "document", "O Word permite escrever e formatar documentos."),
  software("excel", "Microsoft Excel", "./assets/windows-file-organizer/icons/excel.svg", "spreadsheet", "O Excel organiza planilhas e faz cálculos com fórmulas."),
  software("powerpoint", "PowerPoint", "./assets/windows-file-organizer/icons/powerpoint.svg", "presentation", "O PowerPoint cria apresentações organizadas em slides."),
  software("sheets", "Google Sheets", "./assets/google-sheets/google-sheets.ico", "spreadsheet", "O Google Sheets cria planilhas com tabelas, fórmulas e cálculos."),
  software("slides", "Google Slides", "./assets/google-slides/google-slides.ico", "presentation", "O Google Slides permite criar e apresentar sequências de slides."),
  software("chrome", "Google Chrome", "./assets/items/google-chrome.svg", "browse", "O Chrome é um navegador usado para acessar páginas da internet."),
  { id: "folder", name: "Pasta", image: "./assets/windows-file-organizer/icons/folder.svg", categories: ["organization"], capabilities: ["organize"], explanation: "Uma pasta organiza arquivos; ela não é um dispositivo físico de armazenamento." },
  { id: "pdf", name: "Arquivo PDF", image: "./assets/windows-file-organizer/icons/pdf.svg", categories: ["file"], capabilities: ["read-document"], explanation: "PDF é um formato de arquivo. Ele não é um programa de edição de textos." },
  software("writer", "LibreOffice Writer", "./assets/items/libreoffice-writer.svg", "document", "O LibreOffice Writer permite escrever e formatar documentos.")
];
export const cartItemMap = Object.fromEntries(cartItems.map(item => [item.id, item]));

const objective = (id, text, capability, distractors, reminder) => ({ id, text, capability, distractors, reminder });
const objectives = [
  objective("click", "Preciso de um periférico de entrada para clicar e selecionar coisas.", "point", ["keyboard", "monitor", "webcam"], "A missão pede um dispositivo para clicar e selecionar."),
  objective("typing", "Preciso digitar um texto no computador.", "type", ["mouse", "monitor", "printer"], "Precisamos inserir letras e números pelo teclado."),
  objective("seeing", "Preciso visualizar as informações do computador.", "display", ["gpu", "webcam", "printer"], "A missão pede a tela em que vemos as informações."),
  objective("saving", "Preciso guardar meus arquivos mesmo depois de desligar o computador.", "storage", ["ram", "cpu", "folder", "motherboard"], "Precisamos de armazenamento que mantenha os dados sem energia."),
  objective("presenting", "Preciso criar uma apresentação de slides.", "presentation", ["excel", "sheets", "word", "pdf"], "A missão pede um programa para criar slides."),
  objective("calculating", "Preciso criar uma planilha com cálculos.", "spreadsheet", ["word", "powerpoint", "slides", "pdf"], "Precisamos de uma planilha com fórmulas."),
  objective("writing", "Preciso escrever e formatar um documento.", "document", ["pdf", "excel", "powerpoint", "folder"], "Precisamos de um editor de documentos."),
  objective("recording", "Preciso gravar minha voz no computador.", "record", ["speaker", "webcam", "monitor", "keyboard"], "A missão pede um equipamento que capture a voz."),
  objective("printing", "Preciso imprimir meu trabalho em uma folha.", "print", ["monitor", "pdf", "webcam", "keyboard"], "Precisamos produzir uma cópia física no papel.")
];
const finalTexts = [
  "Preciso apontar, clicar e selecionar elementos na tela.",
  "Preciso inserir letras e números usando um periférico de entrada.",
  "Preciso de um periférico de saída que mostre imagens na tela.",
  "Preciso de um dispositivo que mantenha os arquivos armazenados sem energia.",
  "Preciso organizar minha explicação em uma sequência de slides.",
  "Preciso usar fórmulas para calcular os valores de uma tabela.",
  "Preciso produzir um documento com títulos, parágrafos e texto formatado.",
  "Preciso capturar áudio da minha voz para salvar uma gravação.",
  "Preciso transformar meu trabalho digital em uma cópia no papel."
];
export const cartPhases = [
  ...objectives.map((item, index) => ({ id: index + 1, objectives: [item] })),
  { id: 10, objectives: objectives.map((item, index) => ({ ...item, id: `final-${item.id}`, text: finalTexts[index] })) }
];
export const CART_ASSETS = [...new Set(cartItems.map(item => item.image)), "./assets/maze-game/player-sprites.png", "./assets/maze-game/lab-props.png"];
