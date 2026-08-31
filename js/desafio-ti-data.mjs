const makeQuestions = (categoryId, groups) => groups.flatMap(([value, entries]) => entries.map((entry, index) => ({
  id: `${categoryId}-${value}-${index + 1}`,
  categoryId,
  value,
  type: entry[0],
  prompt: entry[1],
  answer: entry[2],
  explanation: entry[3]
})));

export const desafioCategories = [
  { id: "hardware", label: "Hardware", shortLabel: "Hardware", color: "#58d6ff" },
  { id: "software", label: "Software e Sistemas", shortLabel: "Software", color: "#a78bfa" },
  { id: "perifericos", label: "Periféricos", shortLabel: "Periféricos", color: "#ffba68" },
  { id: "redes-basicas", label: "Redes Básicas", shortLabel: "Redes", color: "#4ade80" },
  { id: "topologias", label: "Topologias", shortLabel: "Topologias", color: "#f472b6" },
  { id: "seguranca", label: "Segurança Digital", shortLabel: "Segurança", color: "#facc15" },
  { id: "malware", label: "Malware", shortLabel: "Malware", color: "#fb7185" },
  { id: "firewall-vpn", label: "Firewall e VPN", shortLabel: "Firewall + VPN", color: "#2dd4bf" },
  { id: "sem-fio", label: "Tecnologias sem Fio", shortLabel: "Sem Fio", color: "#60a5fa" },
  { id: "misturando", label: "Misturando Tudo", shortLabel: "Misturando", color: "#c084fc" }
];

const hardwareQuestions = makeQuestions("hardware", [
  [100, [
    ["direta", "Qual componente executa cálculos e instruções dentro do computador?", "Processador", "O processador interpreta instruções e realiza os cálculos necessários aos programas."],
    ["direta", "Qual memória guarda temporariamente os dados dos programas que estão em uso?", "Memória RAM", "A RAM mantém dados temporários e perde seu conteúdo quando o computador é desligado."],
    ["identificacao", "Qual peça distribui energia elétrica para os componentes do computador?", "Fonte de alimentação", "A fonte converte e distribui energia adequada para cada componente interno."]
  ]],
  [200, [
    ["comparacao", "Entre HD e SSD, qual normalmente inicia o sistema e abre programas mais rápido?", "SSD", "O SSD não usa partes mecânicas e costuma acessar dados com muito mais rapidez."],
    ["direta", "Em qual componente ficam conectados processador, memória e placas de expansão?", "Placa-mãe", "A placa-mãe interliga e permite a comunicação entre os principais componentes."],
    ["identificacao", "Qual componente é responsável por gerar as imagens enviadas ao monitor?", "Placa de vídeo", "A placa de vídeo processa elementos gráficos e produz o sinal de imagem."]
  ]],
  [300, [
    ["situacao", "Um computador fica muito lento ao abrir vários programas ao mesmo tempo. Qual componente pode estar faltando?", "Memória RAM", "Mais RAM permite manter mais programas e dados ativos simultaneamente."],
    ["situacao", "O computador desliga quando esquenta demais. Qual peça deve ser verificada primeiro por resfriar o processador?", "Cooler", "O cooler remove calor do processador e ajuda a evitar superaquecimento."],
    ["situacao", "É preciso levar arquivos grandes entre computadores sem usar Internet. Qual dispositivo pequeno e removível pode ser usado?", "Pendrive", "O pendrive armazena arquivos e pode ser conectado a diferentes computadores."]
  ]],
  [400, [
    ["problema", "Após uma queda de energia, os arquivos salvos continuam no computador, mas tudo que estava apenas aberto desapareceu. Quais dois componentes explicam isso?", "SSD ou HD e memória RAM", "O armazenamento mantém arquivos sem energia, enquanto a RAM guarda temporariamente o que está em uso."],
    ["problema", "Um editor de vídeo precisa melhorar a renderização de efeitos sem trocar todo o computador. Qual componente dedicado deve ser priorizado?", "Placa de vídeo", "Uma placa de vídeo mais capaz acelera tarefas gráficas e muitos processos de renderização."],
    ["problema", "O computador não liga e nenhum ventilador gira, embora a tomada funcione. Qual componente interno é uma causa provável?", "Fonte de alimentação", "Uma fonte com defeito pode impedir que todos os demais componentes recebam energia."]
  ]],
  [500, [
    ["raciocinio", "Para deixar um computador mais rápido ao ligar e também permitir mais programas abertos, quais duas melhorias atendem cada necessidade?", "Instalar um SSD e aumentar a memória RAM", "O SSD acelera o acesso aos arquivos; mais RAM amplia a capacidade de manter programas ativos."],
    ["raciocinio", "Um HD externo e um pendrive podem guardar arquivos. Qual diferença prática costuma orientar a escolha entre eles?", "Capacidade e portabilidade", "HDs externos costumam oferecer mais espaço; pendrives são menores e mais fáceis de transportar."],
    ["raciocinio", "Por que trocar apenas o monitor não aumenta a velocidade com que o computador executa cálculos?", "Porque o monitor é um dispositivo de saída", "O monitor apenas exibe imagens; o processamento ocorre em componentes internos, principalmente no processador."]
  ]]
]);

const softwareQuestions = makeQuestions("software", [
  [100, [
    ["direta", "Como chamamos o conjunto de programas e instruções de um computador?", "Software", "Software é a parte lógica formada por programas, aplicativos e sistemas."],
    ["direta", "Qual programa permite acessar e visualizar sites na Internet?", "Navegador", "Navegadores interpretam páginas da Web e permitem interagir com elas."],
    ["identificacao", "Windows e Linux são exemplos de quê?", "Sistemas operacionais", "Eles gerenciam o computador e oferecem uma base para executar aplicativos."]
  ]],
  [200, [
    ["identificacao", "Google Chrome é sistema operacional, navegador ou peça de hardware?", "Navegador", "Chrome é um programa usado para acessar páginas e serviços da Web."],
    ["direta", "Qual tipo de software gerencia arquivos, memória, dispositivos e aplicativos?", "Sistema operacional", "O sistema operacional coordena recursos do computador e a execução de programas."],
    ["verdadeiro-falso", "Verdadeiro ou falso: Linux é um componente físico instalado dentro do gabinete.", "Falso", "Linux é um sistema operacional, portanto é software."]
  ]],
  [300, [
    ["situacao", "Uma turma quer escrever o mesmo documento pela Internet ao mesmo tempo. Qual aplicativo citado no curso atende essa necessidade?", "Google Docs", "O Google Docs permite edição colaborativa de documentos online."],
    ["situacao", "Um arquivo foi baixado, mas não abre porque falta o programa adequado. O problema está principalmente no hardware ou no software?", "Software", "É necessário um aplicativo capaz de interpretar o formato do arquivo."],
    ["comparacao", "Qual é a diferença básica entre sistema operacional e aplicativo?", "O sistema gerencia o computador; o aplicativo realiza uma tarefa", "Aplicativos dependem do sistema operacional para acessar os recursos do equipamento."]
  ]],
  [400, [
    ["problema", "O teclado funciona na tela de entrada, mas deixa de responder após o sistema iniciar por causa de uma configuração. Isso indica falha física ou de software?", "Falha de software", "Se o dispositivo funciona antes do sistema carregar, configurações ou programas podem estar causando a falha."],
    ["problema", "Um computador tem peças novas, mas não inicia porque nenhum sistema foi instalado. O que está faltando?", "Um sistema operacional", "Sem sistema operacional, o computador não oferece o ambiente normal para executar aplicativos."],
    ["problema", "Dois navegadores exibem o mesmo site, mas um apresenta erro após instalar uma extensão. Qual ação inicial é mais coerente?", "Desativar a extensão", "Extensões alteram o navegador e podem causar incompatibilidades sem envolver o hardware."]
  ]],
  [500, [
    ["raciocinio", "Por que um aplicativo criado para um sistema operacional pode não funcionar em outro?", "Porque depende de recursos e formatos específicos do sistema", "Sistemas oferecem interfaces diferentes, e o aplicativo precisa ser compatível com elas."],
    ["raciocinio", "Um computador possui ótimo hardware, mas programas mal configurados continuam lentos. O que isso demonstra?", "Hardware e software influenciam o desempenho", "Boas peças não compensam completamente programas com falhas ou configurações inadequadas."],
    ["raciocinio", "Qual opção descreve melhor a relação entre navegador e Internet?", "O navegador é uma ferramenta que acessa serviços da Internet", "Internet é a rede; navegador é um programa usado para acessar conteúdos, especialmente da Web."]
  ]]
]);

const peripheralQuestions = makeQuestions("perifericos", [
  [100, [
    ["classificacao", "Teclado é periférico de entrada, saída ou híbrido?", "Entrada", "O teclado envia letras, números e comandos para o computador."],
    ["classificacao", "Monitor é periférico de entrada, saída ou híbrido?", "Saída", "O monitor apresenta visualmente informações produzidas pelo computador."],
    ["classificacao", "Tela touchscreen é periférico de entrada, saída ou híbrido?", "Híbrido", "Ela exibe imagens e também recebe comandos pelo toque."]
  ]],
  [200, [
    ["identificacao", "Qual periférico captura voz e outros sons para o computador?", "Microfone", "O microfone transforma sons em dados de entrada."],
    ["identificacao", "Qual periférico transforma documentos em papel em arquivos digitais?", "Scanner", "O scanner captura a imagem de documentos e a envia ao computador."],
    ["identificacao", "Qual periférico projeta a imagem do computador em uma parede ou tela grande?", "Projetor", "O projetor é um dispositivo de saída visual usado para grandes públicos."]
  ]],
  [300, [
    ["situacao", "Uma loja quer registrar rapidamente os códigos impressos nas embalagens. Qual periférico deve usar?", "Leitor de código de barras", "O leitor captura o código e envia a identificação do produto ao sistema."],
    ["situacao", "Uma chamada de vídeo precisa enviar imagem e receber som sem usar o microfone do notebook. Quais periféricos são necessários?", "Webcam e fone de ouvido", "A webcam envia imagem e o fone reproduz o áudio recebido."],
    ["classificacao", "Por que um headset pode ser considerado periférico híbrido?", "Porque recebe e envia áudio", "Seus fones produzem som e seu microfone captura som."]
  ]],
  [400, [
    ["problema", "Um caixa eletrônico mostra opções e recebe a escolha quando o cliente toca na tela. Qual classificação descreve essa tela?", "Periférico híbrido", "A tela envia informações ao usuário e recebe comandos por toque."],
    ["problema", "Uma empresa quer copiar um documento e também digitalizá-lo para enviar por e-mail. Qual equipamento reúne as duas funções?", "Impressora multifuncional", "A multifuncional combina impressão, cópia e digitalização."],
    ["problema", "Um sistema precisa liberar a entrada após reconhecer a impressão digital. Qual dispositivo de entrada deve ser instalado?", "Leitor biométrico", "O leitor biométrico captura uma característica física para identificação."]
  ]],
  [500, [
    ["raciocinio", "Uma impressora comum e uma multifuncional produzem páginas. O que torna a multifuncional também um dispositivo de entrada?", "Seu scanner", "O scanner captura documentos, enviando dados para o computador."],
    ["raciocinio", "Em uma videoconferência, a caixa de som funciona, mas ninguém ouve o aluno. Qual fluxo falhou e qual periférico verificar?", "Entrada; verificar o microfone", "Ouvir os demais confirma a saída; transmitir a própria voz depende da entrada de áudio."],
    ["raciocinio", "Mouse e projetor estão ligados ao mesmo computador. Por que pertencem a classes diferentes?", "O mouse envia comandos e o projetor apresenta informações", "A direção do fluxo de dados define entrada e saída."]
  ]]
]);

const networkQuestions = makeQuestions("redes-basicas", [
  [100, [
    ["direta", "O que é uma rede de computadores?", "Um conjunto de dispositivos conectados para trocar dados e recursos", "Uma rede permite comunicação e compartilhamento entre dispositivos."],
    ["direta", "Como chamamos a rede mundial que conecta bilhões de dispositivos?", "Internet", "A Internet interliga muitas redes ao redor do mundo."],
    ["identificacao", "Qual equipamento normalmente conecta a rede de casa à Internet e distribui a conexão?", "Roteador", "O roteador encaminha a comunicação entre a rede local e outras redes."]
  ]],
  [200, [
    ["classificacao", "Uma rede que conecta computadores dentro de uma escola normalmente é classificada como quê?", "LAN", "LAN é uma rede local, limitada a uma área como casa, laboratório ou escola."],
    ["classificacao", "Uma rede que abrange uma cidade é normalmente classificada como quê?", "MAN", "MAN cobre uma área metropolitana, maior do que uma rede local."],
    ["classificacao", "Uma rede que conecta filiais em países diferentes é normalmente classificada como quê?", "WAN", "WAN conecta grandes distâncias, podendo atravessar regiões e países."]
  ]],
  [300, [
    ["situacao", "Computadores de um laboratório precisam usar a mesma impressora. Que vantagem da rede está sendo utilizada?", "Compartilhamento de recursos", "A rede permite que vários dispositivos utilizem um recurso comum."],
    ["comparacao", "Internet e Wi-Fi significam a mesma coisa?", "Não", "Internet é a rede global; Wi-Fi é uma forma sem fio de conectar um dispositivo a uma rede local."],
    ["situacao", "O celular está conectado ao Wi-Fi, mas o serviço da operadora caiu. Ele pode ficar na rede local sem acessar a Internet?", "Sim", "A conexão local por Wi-Fi pode existir mesmo quando o acesso externo à Internet falha."]
  ]],
  [400, [
    ["problema", "Uma escola quer conectar muitos computadores por cabos dentro do laboratório. Qual equipamento central é adequado para interligá-los?", "Switch", "O switch conecta dispositivos dentro da mesma rede local."],
    ["problema", "O notebook abre arquivos de outro computador da sala, mas nenhum site externo. O que isso indica sobre a rede?", "A rede local funciona, mas o acesso à Internet não", "A comunicação interna confirma a LAN; o acesso externo é um serviço separado."],
    ["problema", "Uma empresa conecta escritórios de bairros diferentes dentro da mesma cidade. Qual classificação é mais adequada?", "MAN", "Uma rede metropolitana interliga pontos espalhados por uma cidade."]
  ]],
  [500, [
    ["raciocinio", "Por que conectar dois computadores entre si não significa automaticamente que eles tenham acesso à Internet?", "Porque rede local e acesso à Internet são serviços diferentes", "Os computadores podem trocar dados localmente sem uma ligação com a rede mundial."],
    ["raciocinio", "Uma rede de escola cresce para ligar unidades em cidades diferentes. Qual mudança de classificação é esperada?", "De LAN para WAN", "A ampliação para longas distâncias transforma a rede local em uma rede de grande alcance."],
    ["raciocinio", "Roteador e switch podem conectar dispositivos. Qual diferença básica entre eles?", "O switch conecta a rede local; o roteador liga redes diferentes", "O switch organiza a comunicação interna e o roteador encaminha dados entre redes."]
  ]]
]);

const topologyQuestions = makeQuestions("topologias", [
  [100, [
    ["direta", "Em qual topologia os computadores se conectam a um equipamento central?", "Topologia em estrela", "Na estrela, as conexões partem de um ponto central."],
    ["direta", "Em qual topologia os dispositivos formam um círculo fechado?", "Topologia em anel", "No anel, cada dispositivo se liga aos vizinhos, formando um circuito."],
    ["direta", "Em qual topologia vários dispositivos compartilham um cabo principal?", "Topologia em barramento", "No barramento, um meio principal é compartilhado pelos dispositivos."]
  ]],
  [200, [
    ["identificacao", "Qual topologia possui muitos caminhos possíveis entre os dispositivos?", "Topologia em malha", "Na malha existem várias interligações, oferecendo rotas alternativas."],
    ["identificacao", "Qual topologia organiza ramificações em níveis, lembrando galhos?", "Topologia em árvore", "A árvore combina uma estrutura hierárquica com vários ramos."],
    ["identificacao", "Uma sala tem todos os cabos ligados ao mesmo switch. Qual topologia visual isso forma?", "Estrela", "O switch ocupa o centro das conexões da topologia em estrela."]
  ]],
  [300, [
    ["situacao", "Se o cabo de apenas um computador romper em uma topologia estrela, o que normalmente acontece com os demais?", "Continuam funcionando", "Cada dispositivo possui sua própria ligação com o ponto central."],
    ["situacao", "Uma rede precisa de caminhos alternativos caso uma ligação falhe. Qual topologia oferece maior redundância?", "Malha", "As múltiplas conexões da malha permitem escolher outro caminho."],
    ["situacao", "Uma empresa quer organizar setores, andares e salas em ramificações hierárquicas. Qual topologia representa melhor essa ideia?", "Árvore", "A topologia em árvore organiza a rede em níveis e ramificações."]
  ]],
  [400, [
    ["problema", "Em uma rede estrela, o equipamento central parou. Qual é o impacto provável?", "Toda a rede ligada a ele perde comunicação", "O ponto central é essencial para que os dispositivos conversem."],
    ["problema", "Uma falha no cabo principal interrompe vários computadores que dividem o mesmo meio. Qual topologia provavelmente está sendo usada?", "Barramento", "No barramento, todos dependem do cabo principal compartilhado."],
    ["problema", "Uma rede continua comunicando mesmo após uma ligação ser cortada porque há outras rotas. Qual topologia explica isso?", "Malha", "A malha oferece caminhos redundantes entre os pontos."]
  ]],
  [500, [
    ["raciocinio", "Compare estrela e malha: qual é mais simples de instalar e qual oferece mais caminhos alternativos?", "Estrela é mais simples; malha oferece mais alternativas", "A estrela concentra conexões; a malha usa diversas ligações redundantes."],
    ["raciocinio", "Por que uma árvore pode ser entendida como uma combinação de várias estrelas?", "Porque cada ramo pode ter seu próprio ponto central", "Grupos em estrela podem ser ligados em níveis para formar uma hierarquia."],
    ["raciocinio", "Qual vantagem da estrela sobre o barramento facilita descobrir um cabo defeituoso?", "Cada dispositivo possui uma conexão separada", "A ligação individual ajuda a isolar a falha sem afetar todos os demais."]
  ]]
]);

const securityQuestions = makeQuestions("seguranca", [
  [100, [
    ["direta", "Qual programa ajuda a detectar e remover programas maliciosos?", "Antivírus", "O antivírus analisa arquivos e comportamentos em busca de ameaças."],
    ["direta", "Como chamamos uma cópia de segurança dos arquivos?", "Backup", "O backup permite recuperar dados após perda, falha ou ataque."],
    ["direta", "Qual recurso pede uma segunda confirmação além da senha?", "Autenticação em dois fatores", "O segundo fator dificulta o acesso mesmo quando uma senha é descoberta."]
  ]],
  [200, [
    ["identificacao", "Qual senha é mais forte: '123456' ou uma frase longa com letras, números e símbolos?", "A frase longa com letras, números e símbolos", "Comprimento e variedade tornam a senha mais difícil de adivinhar."],
    ["verdadeiro-falso", "Verdadeiro ou falso: usar a mesma senha em todos os serviços reduz o risco.", "Falso", "Se uma senha vazar, todas as contas que a reutilizam ficam ameaçadas."],
    ["situacao", "Um anexo inesperado chegou de um remetente desconhecido. Qual é a atitude mais segura?", "Não abrir e confirmar a origem", "Anexos inesperados podem instalar ameaças ou roubar informações."]
  ]],
  [300, [
    ["situacao", "Um site pede sua senha, mas o endereço possui uma letra trocada. O que fazer?", "Fechar o site e acessar pelo endereço oficial", "Endereços parecidos são usados para enganar e capturar credenciais."],
    ["situacao", "O computador será formatado amanhã. Qual ação protege os trabalhos importantes?", "Fazer backup", "Uma cópia separada permite restaurar os arquivos depois da formatação."],
    ["situacao", "Uma conta enviou alerta de acesso desconhecido. Quais duas ações são prioritárias?", "Trocar a senha e ativar dois fatores", "Essas medidas bloqueiam o acesso anterior e adicionam uma camada de proteção."]
  ]],
  [400, [
    ["problema", "Um aluno instalou um programa pirata e o computador começou a exibir comportamentos estranhos. Qual decisão teria reduzido o risco?", "Usar software de fonte confiável", "Programas alterados podem carregar códigos maliciosos escondidos."],
    ["problema", "Todos os arquivos estão apenas no notebook. Ele foi furtado. Qual prática teria evitado a perda total?", "Manter backup em outro local", "Uma cópia separada continua disponível quando o equipamento original é perdido."],
    ["problema", "Uma mensagem urgente pede um código de confirmação recebido no celular. Por que não se deve enviar esse código?", "Porque ele é um fator de autenticação", "O código pode permitir que outra pessoa conclua o acesso à conta."]
  ]],
  [500, [
    ["raciocinio", "Por que antivírus atualizado e backup são proteções complementares, não substitutas?", "Um tenta impedir a ameaça; o outro recupera os dados", "Mesmo uma boa proteção pode falhar, e o backup reduz o impacto da perda."],
    ["raciocinio", "Uma senha longa vazou em um serviço. Por que o segundo fator ainda pode proteger a conta?", "Porque o invasor ainda não possui a segunda confirmação", "O segundo fator cria uma barreira independente da senha."],
    ["raciocinio", "Qual é mais seguro: confiar apenas no nome do remetente ou verificar endereço, contexto e links? Por quê?", "Verificar endereço, contexto e links", "O nome exibido pode ser falsificado; vários sinais ajudam a confirmar a legitimidade."]
  ]]
]);

const malwareQuestions = makeQuestions("malware", [
  [100, [
    ["direta", "Como chamamos qualquer programa criado para causar dano ou agir sem permissão?", "Malware", "Malware é o termo geral para diferentes tipos de programas maliciosos."],
    ["direta", "Qual ameaça bloqueia arquivos e exige pagamento para liberá-los?", "Ransomware", "Ransomware sequestra dados e cobra um resgate."],
    ["direta", "Qual golpe usa mensagens falsas para roubar senhas e dados?", "Phishing", "Phishing imita comunicações confiáveis para enganar a vítima."]
  ]],
  [200, [
    ["identificacao", "Qual malware se disfarça de programa útil para ser instalado pela vítima?", "Cavalo de Troia", "O trojan parece legítimo, mas executa uma ação maliciosa escondida."],
    ["identificacao", "Qual malware observa atividades e coleta informações do usuário escondido?", "Spyware", "Spyware espiona hábitos, dados e outras atividades sem consentimento."],
    ["identificacao", "Qual malware consegue se espalhar automaticamente entre computadores?", "Worm", "O worm se replica e se propaga sem depender de anexar-se a outro arquivo."]
  ]],
  [300, [
    ["situacao", "Um e-mail imita o banco e manda clicar em um link para confirmar a senha. Qual golpe está sendo usado?", "Phishing", "A mensagem falsa tenta levar a vítima a entregar seus dados."],
    ["situacao", "Um jogo gratuito instala escondido um programa que monitora os sites visitados. Qual ameaça é essa?", "Spyware", "O spyware coleta informações e acompanha atividades sem autorização."],
    ["situacao", "Um arquivo infectado altera outros arquivos quando é executado. Qual tipo de malware é provável?", "Vírus", "O vírus se associa a arquivos e se espalha quando eles são executados."]
  ]],
  [400, [
    ["problema", "Uma empresa encontra a mesma ameaça em muitos computadores, mesmo sem os usuários abrirem anexos. Qual malware se encaixa melhor?", "Worm", "Worms podem explorar conexões e se espalhar automaticamente."],
    ["problema", "Um aplicativo aparentemente normal abriu uma porta escondida para um invasor. Qual ameaça descreve melhor o caso?", "Cavalo de Troia", "O trojan engana o usuário com uma aparência útil enquanto executa outra ação."],
    ["problema", "Uma mensagem ameaça cancelar a conta em dez minutos e pede login em um link estranho. Quais sinais indicam phishing?", "Urgência e link suspeito", "Golpistas usam pressão emocional e endereços falsos para reduzir a atenção da vítima."]
  ]],
  [500, [
    ["raciocinio", "Qual diferença principal separa vírus e worm quanto à forma de propagação?", "O vírus depende de arquivo ou ação; o worm se espalha sozinho", "Ambos são maliciosos, mas usam mecanismos diferentes para alcançar novos dispositivos."],
    ["raciocinio", "Por que pagar um ransomware não garante recuperar os arquivos?", "Porque o criminoso pode não fornecer a chave", "Não existe garantia de cooperação, e o pagamento ainda financia o ataque."],
    ["raciocinio", "Um programa espiona senhas e depois bloqueia arquivos. Ele pode combinar categorias de malware?", "Sim", "Um ataque pode reunir várias funções maliciosas no mesmo programa ou campanha."]
  ]]
]);

const firewallVpnQuestions = makeQuestions("firewall-vpn", [
  [100, [
    ["direta", "Qual recurso controla conexões e ajuda a bloquear acessos indesejados?", "Firewall", "O firewall aplica regras ao tráfego que entra e sai da rede ou dispositivo."],
    ["direta", "Qual tecnologia cria um túnel protegido para a comunicação pela Internet?", "VPN", "A VPN protege a comunicação entre o dispositivo e o serviço de VPN."],
    ["direta", "Firewall serve principalmente para filtrar conexões ou guardar arquivos?", "Filtrar conexões", "Ele decide quais comunicações podem passar conforme regras de segurança."]
  ]],
  [200, [
    ["identificacao", "Um programa tenta receber uma conexão inesperada e o sistema pergunta se deve permitir. Qual recurso gerou o aviso?", "Firewall", "O firewall solicita uma decisão antes de liberar certas conexões."],
    ["identificacao", "Qual recurso pode fazer um site enxergar a localização do servidor usado na conexão?", "VPN", "O acesso pode parecer vir do servidor de VPN, e não diretamente do usuário."],
    ["verdadeiro-falso", "Verdadeiro ou falso: uma VPN substitui todas as outras medidas de segurança.", "Falso", "VPN protege a conexão, mas não impede senhas fracas, golpes ou arquivos maliciosos."]
  ]],
  [300, [
    ["situacao", "Um funcionário precisa acessar recursos da empresa fora do escritório por uma conexão protegida. Qual tecnologia pode ser usada?", "VPN", "Uma VPN permite criar um caminho protegido para acesso remoto."],
    ["situacao", "Um jogo desconhecido pede permissão para receber conexões externas. Qual recurso deve analisar essa solicitação?", "Firewall", "O firewall controla se o programa poderá aceitar esse tipo de comunicação."],
    ["comparacao", "Qual diferença básica existe entre firewall e VPN?", "Firewall filtra conexões; VPN protege o caminho da comunicação", "Eles atuam de formas diferentes e podem ser usados juntos."]
  ]],
  [400, [
    ["problema", "Mesmo usando VPN, um usuário digitou a senha em uma página falsa. Por que a VPN não impediu o golpe?", "Porque ela não identifica todas as páginas falsas", "A VPN protege o transporte dos dados, mas não corrige uma decisão enganada do usuário."],
    ["problema", "Um serviço legítimo deixou de funcionar após novas regras de segurança. Qual configuração deve ser revisada primeiro?", "As regras do firewall", "Uma regra restritiva pode ter bloqueado uma conexão necessária."],
    ["problema", "A empresa quer proteger o acesso remoto e limitar conexões não autorizadas. Quais dois recursos podem trabalhar juntos?", "VPN e firewall", "A VPN protege o acesso remoto e o firewall controla as conexões permitidas."]
  ]],
  [500, [
    ["raciocinio", "Por que desligar o firewall para resolver um bloqueio não é uma solução segura permanente?", "Porque libera conexões que deveriam ser controladas", "O correto é ajustar somente a regra necessária, mantendo a proteção ativa."],
    ["raciocinio", "Uma VPN protege o trecho até seu servidor. Que cuidado continua obrigatório depois disso?", "Usar serviços confiáveis e práticas seguras", "A conexão protegida não torna todo site legítimo nem elimina golpes e malware."],
    ["raciocinio", "Firewall e antivírus observam o mesmo tipo de ameaça?", "Não", "O firewall controla comunicações; o antivírus procura códigos e comportamentos maliciosos no dispositivo."]
  ]]
]);

const wirelessQuestions = makeQuestions("sem-fio", [
  [100, [
    ["direta", "Qual tecnologia conecta notebooks e celulares a uma rede local sem cabos?", "Wi-Fi", "Wi-Fi permite comunicação sem fio dentro da área de cobertura."],
    ["direta", "Qual tecnologia costuma conectar fones de ouvido ao celular a curta distância?", "Bluetooth", "Bluetooth liga dispositivos próximos com baixo consumo de energia."],
    ["direta", "Qual tecnologia permite pagamento por aproximação do celular?", "NFC", "NFC troca dados a poucos centímetros e é comum em pagamentos."]
  ]],
  [200, [
    ["identificacao", "Qual tecnologia antiga de controle remoto exige apontar o emissor para o aparelho?", "Infravermelho", "O infravermelho normalmente depende de linha direta entre emissor e receptor."],
    ["identificacao", "Qual comunicação é usada para alcançar locais muito distantes por equipamentos em órbita?", "Satélite", "Satélites retransmitem sinais entre grandes áreas da superfície."],
    ["comparacao", "Wi-Fi ou Bluetooth: qual é mais comum para conectar um computador ao roteador?", "Wi-Fi", "Wi-Fi foi projetado para acesso à rede local; Bluetooth é comum entre acessórios próximos."]
  ]],
  [300, [
    ["situacao", "Um aluno quer enviar áudio do celular para uma caixa de som próxima sem Internet. Qual tecnologia usar?", "Bluetooth", "Bluetooth realiza a conexão direta entre os dois dispositivos."],
    ["situacao", "Uma etiqueta é lida quando o celular encosta nela. Qual tecnologia provavelmente está sendo usada?", "NFC", "NFC funciona em distância muito curta e pode ler pequenas etiquetas."],
    ["situacao", "Uma área rural sem cabos recebe sinal por uma antena apontada para o céu. Qual meio pode estar sendo usado?", "Satélite", "Comunicação via satélite atende regiões onde a infraestrutura terrestre é limitada."]
  ]],
  [400, [
    ["problema", "O controle remoto para de funcionar quando há um objeto na frente, mas o fone sem fio continua tocando. Que tecnologias explicam isso?", "Infravermelho no controle e Bluetooth no fone", "Infravermelho precisa de linha direta; Bluetooth atravessa pequenos obstáculos."],
    ["problema", "O celular está no Wi-Fi, mas o Bluetooth foi desligado. Qual função ainda pode continuar?", "Acesso à rede Wi-Fi", "As tecnologias são independentes e atendem finalidades diferentes."],
    ["problema", "Para evitar pagamento por aproximação acidental a vários metros, qual característica do NFC ajuda?", "O alcance muito curto", "A comunicação normalmente exige que os dispositivos estejam a poucos centímetros."]
  ]],
  [500, [
    ["raciocinio", "Por que Bluetooth não costuma substituir Wi-Fi como conexão principal de uma turma inteira à rede?", "Porque foi pensado para curto alcance e poucos dispositivos", "Wi-Fi oferece uma estrutura mais adequada para vários equipamentos acessarem a rede."],
    ["raciocinio", "Compare satélite e NFC quanto à distância de comunicação.", "Satélite cobre grandes distâncias; NFC opera a centímetros", "As duas tecnologias sem fio foram criadas para necessidades opostas de alcance."],
    ["raciocinio", "Um relógio usa Bluetooth com o celular e o celular usa Wi-Fi com o roteador. Por que duas tecnologias são úteis?", "Cada conexão atende um alcance e uma finalidade", "Bluetooth liga acessórios próximos; Wi-Fi conecta o celular à rede local."]
  ]]
]);

const mixedQuestions = makeQuestions("misturando", [
  [100, [
    ["identificacao", "Mouse é hardware ou software?", "Hardware", "O mouse é uma parte física conectada ao computador."],
    ["identificacao", "Google Chrome é hardware ou software?", "Software", "Chrome é um programa navegador."],
    ["identificacao", "Qual tecnologia aparece em uma rede sem fio doméstica: Wi-Fi ou NFC?", "Wi-Fi", "Wi-Fi conecta vários dispositivos à rede local."]
  ]],
  [200, [
    ["classificacao", "Um headset combina quais dois fluxos de dados?", "Entrada e saída", "O microfone envia áudio e os fones reproduzem áudio."],
    ["comparacao", "Qual protege contra perda de arquivos: backup ou navegador?", "Backup", "Backup mantém uma cópia que pode ser recuperada."],
    ["identificacao", "Qual componente armazena arquivos sem energia: RAM ou SSD?", "SSD", "O SSD mantém os dados depois que o computador é desligado."]
  ]],
  [300, [
    ["situacao", "A turma quer projetar um documento criado no Google Docs. Cite um software e um hardware envolvidos.", "Google Docs e projetor", "O aplicativo cria o conteúdo e o projetor apresenta a imagem."],
    ["situacao", "Um link falso pede senha enquanto o usuário está no Wi-Fi. Qual é o golpe e qual atitude ajuda?", "Phishing; não fornecer a senha", "A forma de conexão não torna uma mensagem falsa confiável."],
    ["situacao", "O computador abre programas lentamente e perde dados que estavam apenas em uso ao desligar. Quais componentes estão envolvidos?", "Armazenamento e memória RAM", "O armazenamento afeta a abertura; a RAM mantém temporariamente o que está ativo."]
  ]],
  [400, [
    ["problema", "Uma videoconferência tem imagem e áudio de saída, mas não envia voz. O sistema e a Internet funcionam. Qual componente verificar?", "Microfone", "O problema está no periférico responsável pela entrada de áudio."],
    ["problema", "Um programa falso instala spyware. Quais duas camadas poderiam reduzir o risco antes e depois da instalação?", "Baixar de fonte confiável e usar antivírus", "A prevenção evita o arquivo; o antivírus pode detectar a ameaça."],
    ["problema", "Uma rede estrela perdeu toda a comunicação quando um único equipamento desligou. Qual equipamento central pode ser o responsável?", "Switch", "Os dispositivos da estrela dependem do equipamento no centro."]
  ]],
  [500, [
    ["raciocinio", "Explique por que ter Wi-Fi conectado, navegador aberto e firewall ativo representa três funções diferentes.", "Wi-Fi conecta à rede, navegador acessa sites e firewall filtra conexões", "Cada recurso atua em uma camada diferente da experiência."],
    ["raciocinio", "Um ransomware atingiu arquivos sem backup. Quais medidas teriam atuado na prevenção e na recuperação?", "Antivírus e cuidados com links; backup para recuperação", "Prevenção reduz a chance do ataque e backup reduz seu impacto."],
    ["raciocinio", "Um touchscreen exibe um alerta de phishing e recebe o toque para fechá-lo. Quais três conceitos aparecem?", "Saída, entrada e segurança digital", "A tela mostra informação, recebe comando e o alerta trata de uma tentativa de golpe."]
  ]]
]);

export const desafioQuestions = [
  ...hardwareQuestions,
  ...softwareQuestions,
  ...peripheralQuestions,
  ...networkQuestions,
  ...topologyQuestions,
  ...securityQuestions,
  ...malwareQuestions,
  ...firewallVpnQuestions,
  ...wirelessQuestions,
  ...mixedQuestions
];

export const desafioFinalQuestions = [
  { id: "final-1", prompt: "Um computador inicia lentamente, trava com muitos programas e não possui cópia dos trabalhos. Cite uma melhoria para cada problema.", answer: "SSD, mais memória RAM e backup", explanation: "Cada medida atua em armazenamento, capacidade de trabalho e proteção dos dados." },
  { id: "final-2", prompt: "Qual conjunto protege melhor uma conta: senha repetida e curta ou senha longa, exclusiva e autenticação em dois fatores?", answer: "Senha longa, exclusiva e autenticação em dois fatores", explanation: "A combinação reduz adivinhação, reutilização de vazamentos e acessos apenas com a senha." },
  { id: "final-3", prompt: "Uma escola conecta computadores a um switch e o switch a um roteador. Qual função básica cada equipamento cumpre?", answer: "O switch conecta a rede local e o roteador liga redes diferentes", explanation: "Eles trabalham juntos, mas atendem etapas diferentes da comunicação." },
  { id: "final-4", prompt: "Por que um backup desconectado do computador pode ajudar contra ransomware?", answer: "Porque a ameaça pode não alcançar essa cópia", explanation: "Uma cópia separada pode permanecer disponível mesmo quando os arquivos originais são bloqueados." },
  { id: "final-5", prompt: "Um aluno recebe um link falso pelo Wi-Fi. O Wi-Fi causou o golpe? Explique.", answer: "Não; Wi-Fi é apenas o meio de conexão", explanation: "O phishing depende do engano da mensagem, não da tecnologia usada para acessar a rede." },
  { id: "final-6", prompt: "Compare RAM e SSD quanto à permanência dos dados e ao papel no computador.", answer: "RAM é temporária e mantém o que está em uso; SSD armazena arquivos", explanation: "Os componentes têm funções complementares e comportamentos diferentes sem energia." },
  { id: "final-7", prompt: "Uma empresa usa VPN e firewall. Por que ainda precisa orientar funcionários contra phishing?", answer: "Porque essas tecnologias não impedem que alguém entregue dados em uma página falsa", explanation: "Segurança técnica e comportamento consciente precisam atuar juntos." },
  { id: "final-8", prompt: "Qual topologia oferece caminhos alternativos e qual usa um ponto central?", answer: "Malha oferece caminhos alternativos; estrela usa um ponto central", explanation: "A estrutura das conexões determina as vantagens e os riscos de cada topologia." },
  { id: "final-9", prompt: "Em uma aula online, webcam, microfone, monitor e fone participam. Classifique o fluxo de cada um.", answer: "Webcam e microfone são entrada; monitor e fone são saída", explanation: "A classificação depende da direção em que os dados circulam." },
  { id: "final-10", prompt: "Por que instalar um programa pirata pode afetar tanto software quanto arquivos pessoais?", answer: "Porque ele pode conter malware", explanation: "Um instalador alterado pode executar código malicioso e acessar dados do usuário." },
  { id: "final-11", prompt: "NFC, Bluetooth e Wi-Fi são sem fio. Ordene-os do menor para o maior alcance típico.", answer: "NFC, Bluetooth e Wi-Fi", explanation: "NFC opera a centímetros, Bluetooth a curta distância e Wi-Fi cobre uma área local maior." },
  { id: "final-12", prompt: "Qual é a diferença entre perder acesso à Internet e perder a rede local?", answer: "A rede local ainda pode permitir comunicação interna sem Internet", explanation: "Internet é o acesso externo; a rede local conecta os dispositivos próximos." }
];
