(function () {
  const credits = window.assetCredits || {};

  const categoryInfo = {
    entrada: {
      name: "Entrada",
      eyebrow: "Envia dados ao computador",
      description: "Captura comandos, voz, imagem ou movimento.",
      color: "#00a6a6",
      icon: "IN"
    },
    saida: {
      name: "Saída",
      eyebrow: "Mostra o resultado",
      description: "Apresenta informações em imagem, som ou objeto.",
      color: "#ee5d41",
      icon: "OUT"
    },
    hardware: {
      name: "Hardware",
      eyebrow: "Componentes internos",
      description: "Peças que processam, armazenam ou alimentam o computador.",
      color: "#7157d9",
      icon: "HW"
    },
    software: {
      name: "Software",
      eyebrow: "Programas e sistemas",
      description: "Instruções e aplicativos que executam tarefas.",
      color: "#ef9d21",
      icon: "SW"
    },
    hibrido: {
      name: "Periféricos híbridos",
      eyebrow: "Entrada e saída",
      description: "Recebem e também enviam dados.",
      color: "#2379ca",
      icon: "↔"
    }
  };

  const rawItems = [
    ["teclado", "Teclado", "entrada", "Teclado de computador"],
    ["mouse", "Mouse", "entrada", "Mouse de computador"],
    ["microfone", "Microfone", "entrada", "Microfone para computador"],
    ["scanner", "Scanner", "entrada", "Scanner de mesa"],
    ["webcam", "Webcam", "entrada", "Câmera webcam"],
    ["leitor-codigo-barras", "Leitor de código de barras", "entrada", "Leitor de código de barras"],
    ["mesa-digitalizadora", "Mesa digitalizadora", "entrada", "Mesa digitalizadora com caneta"],
    ["leitor-biometrico", "Leitor biométrico", "entrada", "Leitor biométrico de impressão digital"],

    ["monitor", "Monitor", "saida", "Monitor de computador"],
    ["impressora", "Impressora", "saida", "Impressora de computador"],
    ["caixa-som", "Caixa de som", "saida", "Caixas de som para computador"],
    ["fone-ouvido", "Fone de ouvido", "saida", "Fone de ouvido sem microfone"],
    ["projetor", "Projetor", "saida", "Projetor de vídeo"],
    ["plotter", "Plotter", "saida", "Impressora plotter"],
    ["impressora-3d", "Impressora 3D", "saida", "Impressora 3D"],
    ["painel-led", "Painel de LED", "saida", "Painel eletrônico de LED"],

    ["processador", "Processador", "hardware", "Processador de computador"],
    ["placa-mae", "Placa-mãe", "hardware", "Placa-mãe de computador"],
    ["memoria-ram", "Memória RAM", "hardware", "Módulo de memória RAM"],
    ["ssd", "SSD", "hardware", "Unidade de estado sólido SSD"],
    ["disco-rigido", "Disco rígido", "hardware", "Disco rígido de computador"],
    ["placa-video", "Placa de vídeo", "hardware", "Placa de vídeo GPU"],
    ["fonte-alimentacao", "Fonte de alimentação", "hardware", "Fonte de alimentação de computador"],
    ["cooler", "Cooler", "hardware", "Cooler de processador"],

    ["windows", "Windows", "software", "Logotipo do Windows"],
    ["ubuntu", "Ubuntu", "software", "Logotipo do Ubuntu"],
    ["google-chrome", "Google Chrome", "software", "Logotipo do Google Chrome"],
    ["mozilla-firefox", "Mozilla Firefox", "software", "Logotipo do Mozilla Firefox"],
    ["libreoffice-writer", "LibreOffice Writer", "software", "Logotipo do LibreOffice Writer"],
    ["vlc", "VLC Media Player", "software", "Logotipo do VLC Media Player"],
    ["gimp", "GIMP", "software", "Mascote do editor GIMP"],
    ["seven-zip", "7-Zip", "software", "Logotipo do 7-Zip"],

    ["touchscreen", "Monitor touchscreen", "hibrido", "Monitor com tela sensível ao toque"],
    ["multifuncional", "Impressora multifuncional", "hibrido", "Impressora multifuncional com scanner"],
    ["headset", "Headset com microfone", "hibrido", "Headset com fones e microfone"],
    ["modem", "Modem", "hibrido", "Modem de computador"],
    ["roteador", "Roteador", "hibrido", "Roteador sem fio"],
    ["pen-drive", "Pen drive", "hibrido", "Unidade de memória USB"],
    ["hd-externo", "HD externo", "hibrido", "Disco rígido externo"],
    ["gravador-dvd", "Gravador de DVD", "hibrido", "Unidade gravadora de DVD"]
  ];

  const classificationItems = rawItems.map(([id, name, category, alt]) => ({
    id,
    nome: name,
    categoria: category,
    imagem: `./assets/items/${id}.${category === "software" ? "svg" : "jpg"}?v=1.0.0`,
    alt,
    fonte: credits[id]?.source || "Fonte registrada no arquivo de créditos",
    licenca: credits[id]?.license || "Consulte a fonte"
  }));

  const terms = [
    ["kernel", "Kernel", "É o núcleo do sistema operacional e faz a ligação entre os programas e o hardware."],
    ["processo", "Processo", "É um programa que está sendo executado pelo sistema operacional."],
    ["memoria", "Memória", "Guarda temporariamente os dados e instruções usados pelos programas."],
    ["arquivo", "Arquivo", "É uma unidade de informação salva, como um texto, imagem ou música."],
    ["pasta", "Pasta", "Organiza arquivos e outras pastas dentro do armazenamento."],
    ["usuario", "Usuário", "Representa uma pessoa ou perfil autorizado a utilizar o sistema."],
    ["senha", "Senha", "Ajuda a proteger o acesso a uma conta ou recurso."],
    ["terminal", "Terminal", "Permite controlar o sistema digitando comandos de texto."],
    ["comando", "Comando", "É uma instrução dada ao sistema para realizar uma ação."],
    ["janela", "Janela", "É a área visual onde um programa ou documento aparece na interface."],
    ["icone", "Ícone", "É uma pequena imagem que representa um aplicativo, arquivo ou ação."],
    ["menu-iniciar", "Menu Iniciar", "Reúne atalhos para programas, configurações e opções do sistema."],
    ["area-trabalho", "Área de trabalho", "É o espaço principal da interface gráfica após o acesso ao sistema."],
    ["barra-tarefas", "Barra de tarefas", "Mostra programas abertos e atalhos usados com frequência."],
    ["lixeira", "Lixeira", "Guarda temporariamente arquivos excluídos antes da remoção definitiva."],
    ["gerenciador-arquivos", "Gerenciador de arquivos", "Permite navegar, copiar, mover, renomear e excluir arquivos."],
    ["gerenciador-tarefas", "Gerenciador de tarefas", "Mostra processos em execução e o consumo de recursos do computador."],
    ["configuracoes", "Configurações", "Reúnem opções para personalizar e controlar o funcionamento do sistema."],
    ["driver", "Driver", "É o software que permite ao sistema operacional se comunicar com um dispositivo."],
    ["aplicativo", "Aplicativo", "É um programa criado para ajudar o usuário a realizar uma tarefa."],
    ["servico", "Serviço", "É um processo que funciona em segundo plano para atender o sistema ou outros programas."],
    ["sistema-arquivos", "Sistema de arquivos", "Define como os dados são organizados e encontrados no armazenamento."],
    ["diretorio", "Diretório", "É uma estrutura usada pelo sistema para agrupar arquivos e outros diretórios."],
    ["permissao", "Permissão", "Define quem pode ler, alterar ou executar um arquivo ou recurso."],
    ["atualizacao", "Atualização", "Instala melhorias, correções de erros e proteções de segurança."],
    ["rede", "Rede", "Permite que o computador troque dados com outros dispositivos."],
    ["firewall", "Firewall", "Controla conexões de rede para ajudar a bloquear acessos indevidos."],
    ["backup", "Backup", "É uma cópia de segurança usada para recuperar dados perdidos."],
    ["interface-grafica", "Interface gráfica", "Permite interagir com o sistema usando janelas, botões, menus e ícones."],
    ["area-transferencia", "Área de transferência", "Guarda temporariamente conteúdos copiados ou recortados." ]
  ];

  const normalizeTerm = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/gi, "c")
    .toUpperCase();

  const hangmanTerms = terms.map(([id, termo, explicacao]) => ({
    id,
    termo,
    termoNormalizado: normalizeTerm(termo),
    explicacao
  }));

  window.gameData = { categoryInfo, classificationItems, hangmanTerms, normalizeTerm };
})();
