export const WINDOWS_MISSION_DATA_VERSION = "1.0.0";

export const windowsMissions = [
  {
    id: "abrir-explorador",
    number: "01",
    title: "Encontre o Explorador de Arquivos",
    shortTitle: "Abrir o Explorador",
    message: "Preciso abrir a pasta Documentos, mas não sei por onde começar.",
    lesson: {
      lead: "O Explorador de Arquivos mostra as pastas e os arquivos do computador.",
      path: [
        { label: "Iniciar", icon: "apps" },
        { label: "Explorador", icon: "folder" },
        { label: "Documentos", icon: "description" }
      ]
    },
    actions: [
      { id: "abrir-iniciar", label: "abrir o Menu Iniciar", icon: "apps" },
      { id: "procurar-explorador", label: "procurar Explorador de Arquivos", icon: "visibility" },
      { id: "abrir-explorador", label: "abrir o Explorador de Arquivos", icon: "folder" },
      { id: "selecionar-documentos", label: "selecionar Documentos", icon: "description" }
    ],
    solution: ["abrir-iniciar", "procurar-explorador", "abrir-explorador", "selecionar-documentos"],
    startOrder: ["selecionar-documentos", "abrir-explorador", "abrir-iniciar", "procurar-explorador"],
    hint: "Comece pelo botão Iniciar. Depois procure o Explorador de Arquivos e abra a pasta Documentos.",
    success: "Você abriu o Explorador e chegou à pasta Documentos.",
    station: 0
  },
  {
    id: "encontrar-download",
    number: "02",
    title: "Encontre o arquivo baixado",
    shortTitle: "Localizar Downloads",
    message: "Baixei a atividade, mas não sei onde ela foi parar.",
    lesson: {
      lead: "Downloads guarda, normalmente, os arquivos que chegam da internet.",
      path: [
        { label: "Iniciar", icon: "apps" },
        { label: "Explorador", icon: "folder" },
        { label: "Downloads", icon: "arrow_downward" }
      ]
    },
    actions: [
      { id: "abrir-explorador", label: "abrir o Explorador", icon: "folder" },
      { id: "selecionar-downloads", label: "selecionar Downloads", icon: "arrow_downward" },
      { id: "localizar-atividade", label: "localizar atividade.pdf", icon: "picture_as_pdf" },
      { id: "mover-documentos", label: "mover para Documentos", icon: "description" }
    ],
    solution: ["abrir-explorador", "selecionar-downloads", "localizar-atividade", "mover-documentos"],
    startOrder: ["mover-documentos", "localizar-atividade", "abrir-explorador", "selecionar-downloads"],
    hint: "Abra o Explorador e escolha Downloads na coluna esquerda. Localize atividade.pdf antes de movê-lo.",
    success: "Arquivo encontrado e guardado em Documentos.",
    station: 1
  },
  {
    id: "criar-pasta",
    number: "03",
    title: "Crie uma pasta para a disciplina",
    shortTitle: "Criar uma pasta",
    message: "Meus trabalhos estão misturados. Quero uma pasta chamada SISTEMAS.",
    lesson: {
      lead: "Pastas ajudam a reunir arquivos do mesmo assunto e facilitam encontrá-los depois.",
      path: [
        { label: "Documentos", icon: "description" },
        { label: "Nova pasta", icon: "folder" },
        { label: "Renomear", icon: "touch_app" }
      ]
    },
    actions: [
      { id: "abrir-documentos", label: "abrir Documentos", icon: "description" },
      { id: "nova-pasta", label: "clicar em Nova pasta", icon: "folder" },
      { id: "digitar-nome", label: "digitar SISTEMAS", icon: "touch_app" },
      { id: "confirmar-enter", label: "pressionar Enter", icon: "check_circle" }
    ],
    solution: ["abrir-documentos", "nova-pasta", "digitar-nome", "confirmar-enter"],
    startOrder: ["digitar-nome", "confirmar-enter", "abrir-documentos", "nova-pasta"],
    hint: "Primeiro abra Documentos. Use Nova pasta, escreva SISTEMAS e confirme com Enter.",
    success: "A pasta SISTEMAS foi criada e já pode receber seus trabalhos.",
    station: 2
  },
  {
    id: "copiar-arquivo",
    number: "04",
    title: "Faça uma cópia de segurança",
    shortTitle: "Copiar um arquivo",
    message: "Quero copiar trabalho.docx para a pasta SISTEMAS sem apagar o original.",
    lesson: {
      lead: "Copiar mantém o arquivo original. Recortar move o arquivo para outro lugar.",
      path: [
        { label: "Selecionar", icon: "touch_app" },
        { label: "Ctrl + C", icon: "description" },
        { label: "Ctrl + V", icon: "check_circle" }
      ]
    },
    actions: [
      { id: "selecionar-arquivo", label: "selecionar trabalho.docx", icon: "description" },
      { id: "copiar", label: "pressionar Ctrl + C", icon: "touch_app" },
      { id: "abrir-destino", label: "abrir a pasta SISTEMAS", icon: "folder" },
      { id: "colar", label: "pressionar Ctrl + V", icon: "check_circle" }
    ],
    solution: ["selecionar-arquivo", "copiar", "abrir-destino", "colar"],
    startOrder: ["colar", "abrir-destino", "selecionar-arquivo", "copiar"],
    hint: "Selecione o arquivo e copie com Ctrl + C. Abra a pasta de destino e cole com Ctrl + V.",
    success: "A cópia foi criada e o arquivo original continuou no lugar.",
    station: 0
  },
  {
    id: "trocar-janelas",
    number: "05",
    title: "Troque entre duas janelas",
    shortTitle: "Organizar janelas",
    message: "Preciso consultar o navegador e voltar ao texto sem fechar nenhum programa.",
    lesson: {
      lead: "Minimizar esconde uma janela sem fechá-la. A barra de tarefas permite abri-la novamente.",
      path: [
        { label: "Minimizar", icon: "arrow_downward" },
        { label: "Barra de tarefas", icon: "apps" },
        { label: "Restaurar", icon: "visibility" }
      ]
    },
    actions: [
      { id: "minimizar-texto", label: "minimizar o editor de texto", icon: "arrow_downward" },
      { id: "consultar-navegador", label: "consultar a janela do navegador", icon: "language" },
      { id: "usar-barra", label: "clicar no editor na barra de tarefas", icon: "apps" },
      { id: "continuar-texto", label: "continuar o trabalho no editor", icon: "description" }
    ],
    solution: ["minimizar-texto", "consultar-navegador", "usar-barra", "continuar-texto"],
    startOrder: ["usar-barra", "continuar-texto", "minimizar-texto", "consultar-navegador"],
    hint: "Minimize o editor, consulte o navegador e use o ícone do editor na barra de tarefas para voltar.",
    success: "Você alternou entre as janelas sem perder o trabalho.",
    station: 1
  },
  {
    id: "desligar-seguranca",
    number: "06",
    title: "Desligue o computador com segurança",
    shortTitle: "Desligar corretamente",
    message: "A aula terminou. Como desligar sem perder arquivos ou causar problemas?",
    lesson: {
      lead: "Salve o trabalho e use a opção Desligar. Segurar o botão de energia deve ser o último recurso.",
      path: [
        { label: "Salvar", icon: "description" },
        { label: "Iniciar", icon: "apps" },
        { label: "Desligar", icon: "restart_alt" }
      ]
    },
    actions: [
      { id: "salvar-trabalho", label: "salvar o trabalho aberto", icon: "description" },
      { id: "fechar-programas", label: "fechar os programas", icon: "close" },
      { id: "abrir-iniciar", label: "abrir o Menu Iniciar", icon: "apps" },
      { id: "escolher-desligar", label: "escolher Energia e Desligar", icon: "restart_alt" }
    ],
    solution: ["salvar-trabalho", "fechar-programas", "abrir-iniciar", "escolher-desligar"],
    startOrder: ["escolher-desligar", "abrir-iniciar", "salvar-trabalho", "fechar-programas"],
    hint: "Salve primeiro, feche os programas e só então use Iniciar → Energia → Desligar.",
    success: "Treinamento concluído: você já domina as ações básicas do Windows.",
    station: 2
  }
];
