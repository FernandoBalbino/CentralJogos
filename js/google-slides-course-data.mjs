export const GOOGLE_SLIDES_COURSE_DATA_VERSION = 2;

export const GOOGLE_SLIDES_DEMO_TYPES = Object.freeze(["script", "webm"]);

export const GOOGLE_SLIDES_DEMO_ACTIONS = Object.freeze([
  "move", "click", "double-click", "drag", "select-text", "type",
  "open-menu", "select-option", "wait", "highlight", "announce"
]);

export const GOOGLE_SLIDES_DEMO_TARGETS = Object.freeze([
  "slides-mark", "slide-canvas", "thumbnails-panel", "new-slide",
  "slide-thumb-1", "slide-thumb-2", "slide-menu", "delete-slide",
  "duplicate-slide", "reorder-slide", "title-placeholder", "body-placeholder",
  "text-element-1", "format-menu", "font-size", "font-family", "text-style", "text-color",
  "text-align", "layout", "background", "theme", "insert-menu", "insert-image",
  "insert-shape", "text-box", "line", "image-resize", "image-move", "transition",
  "animate", "comment", "share", "present"
]);

export const GOOGLE_SLIDES_PRACTICE_ACTIONS = Object.freeze([
  "app:identify", "canvas:focus", "thumbnails:focus", "slide:create", "slide:select",
  "slide:delete", "slide:duplicate", "slide:reorder", "text:title", "text:create",
  "text:select", "text:font-size", "text:font", "text:style", "text:color",
  "text:align", "layout:change", "background:change", "theme:change", "image:insert",
  "image:resize", "image:move", "shape:insert", "textbox:insert", "line:insert",
  "transition:change", "animation:add", "comment:add", "share:open", "presentation:start"
]);

export const demoStepCount = (demo) => demo?.type === "script"
  ? Math.max(0, demo.steps?.length || 0)
  : demo?.type === "webm" ? 1 : 0;

const scriptedDemo = ({ caption, target, effect, menu = null, optionTarget = null, announcement, preSteps = [] }) => {
  const steps = [{ action: "announce", text: announcement }];
  steps.push(...preSteps);
  if (menu) {
    steps.push(
      { action: "move", target, duration: 520 },
      { action: "open-menu", target, menu },
      { action: "move", target: optionTarget, duration: 420 },
      { action: "select-option", target: optionTarget, effect }
    );
  } else {
    steps.push(
      { action: "move", target, duration: 560 },
      { action: "click", target, effect },
      { action: "highlight", target, duration: 700 }
    );
  }
  steps.push({ action: "announce", text: caption });
  return { type: "script", caption, steps };
};

const lesson = ({ id, module, title, objective, explanation, target, event, caption, question, practice, menu, optionTarget, preSteps }) => Object.freeze({
  id,
  module,
  title,
  objective,
  explanation,
  demo: scriptedDemo({
    caption,
    target,
    effect: event,
    menu,
    optionTarget,
    preSteps,
    announcement: `Observe como realizar a ação: ${title.toLocaleLowerCase("pt-BR")}.`
  }),
  question: Object.freeze({ ...question, options: Object.freeze(question.options) }),
  practice: Object.freeze({
    instruction: practice.instruction,
    expectedAction: event.type,
    expectedPayload: event.payload ? Object.freeze(event.payload) : undefined,
    successMessage: practice.successMessage
  })
});

const M1 = "Módulo 1 — Conhecendo o Google Apresentações";
const M2 = "Módulo 2 — Texto";
const M3 = "Módulo 3 — Organização dos slides";
const M4 = "Módulo 4 — Elementos visuais";
const M5 = "Módulo 5 — Apresentação";

export const googleSlidesLessons = Object.freeze([
  lesson({
    id: 1, module: M1, title: "O que é o Google Apresentações",
    objective: "Reconhecer o aplicativo usado para criar apresentações com slides.",
    explanation: "O Google Apresentações organiza ideias em slides com textos, imagens e outros elementos.",
    target: "slides-mark", event: { type: "app:identify" }, caption: "O ícone amarelo identifica o Google Apresentações.",
    question: { prompt: "Para que serve o Google Apresentações?", options: ["Criar apresentações em slides", "Editar planilhas", "Enviar e-mails", "Compactar arquivos"], answer: 0, explanation: "Ele é usado para criar e apresentar conteúdos em slides.", hint: "Pense no tipo de arquivo exibido na área central." },
    practice: { instruction: "Clique no ícone amarelo do Google Apresentações.", successMessage: "Você reconheceu o Google Apresentações." }
  }),
  lesson({
    id: 2, module: M1, title: "Identificar a área do slide",
    objective: "Identificar onde o conteúdo da apresentação é criado.", explanation: "A área branca no centro é o slide. É nela que você organiza títulos, textos e imagens.",
    target: "slide-canvas", event: { type: "canvas:focus" }, caption: "A área branca central é o espaço de criação do slide.",
    question: { prompt: "Onde você cria títulos, textos e imagens?", options: ["Na área do slide", "No painel de miniaturas", "Na barra de menus", "No botão Compartilhar"], answer: 0, explanation: "A área branca no centro é o espaço de criação do slide.", hint: "Observe novamente qual área grande ficou destacada." },
    practice: { instruction: "Clique na área branca do slide.", successMessage: "Você identificou a área do slide." }
  }),
  lesson({
    id: 3, module: M1, title: "Painel de miniaturas",
    objective: "Reconhecer o painel que mostra a sequência dos slides.", explanation: "As miniaturas à esquerda mostram a ordem dos slides e permitem selecioná-los.",
    target: "thumbnails-panel", event: { type: "thumbnails:focus" }, caption: "O painel esquerdo mostra pequenas versões de todos os slides.",
    question: { prompt: "O que aparece no painel de miniaturas?", options: ["A sequência dos slides", "A lista de fontes", "Os comentários", "Os arquivos apagados"], answer: 0, explanation: "As miniaturas representam os slides na ordem da apresentação.", hint: "Observe as pequenas páginas numeradas no lado esquerdo." },
    practice: { instruction: "Clique no painel de miniaturas.", successMessage: "Você localizou o painel de miniaturas." }
  }),
  lesson({
    id: 4, module: M1, title: "Criar um novo slide",
    objective: "Adicionar um slide à apresentação usando o botão +.", explanation: "O botão + cria um novo slide e adiciona uma miniatura ao painel esquerdo.",
    target: "new-slide", event: { type: "slide:create" }, caption: "O botão + criou e selecionou um novo slide.",
    question: { prompt: "Qual botão cria um novo slide?", options: ["Tema", "+", "Transição", "Plano de fundo"], answer: 1, explanation: "O botão + adiciona um novo slide à apresentação.", hint: "Observe novamente o primeiro botão da barra de ferramentas." },
    practice: { instruction: "Adicione um novo slide.", successMessage: "Você criou um novo slide." }
  }),
  lesson({
    id: 5, module: M1, title: "Selecionar um slide",
    objective: "Escolher um slide pelo painel de miniaturas.", explanation: "Clique em uma miniatura para escolher qual slide será editado.",
    target: "slide-thumb-2", event: { type: "slide:select", payload: { id: "slide-2" } }, caption: "A borda azul mostra que o segundo slide está selecionado.",
    question: { prompt: "Como escolher um slide para editar?", options: ["Clicando na miniatura", "Clicando em Ajuda", "Mudando o zoom", "Fechando a página"], answer: 0, explanation: "A miniatura seleciona o slide correspondente.", hint: "Observe onde apareceu a borda azul." },
    practice: { instruction: "Selecione o segundo slide.", successMessage: "Você selecionou o segundo slide." }
  }),
  lesson({
    id: 6, module: M1, title: "Excluir um slide",
    objective: "Remover um slide selecionado pelo menu Slide.", explanation: "Selecione a miniatura e use Slide → Excluir slide para remover somente aquele slide.",
    target: "slide-menu", menu: "slide", optionTarget: "delete-slide", preSteps: [{ action: "move", target: "slide-thumb-2", duration: 420 }, { action: "click", target: "slide-thumb-2", effect: { type: "slide:select", payload: { id: "slide-2" } } }], event: { type: "slide:delete", payload: { deletedSlideId: "slide-2" } }, caption: "O segundo slide foi removido pelo comando Excluir slide.",
    question: { prompt: "Em qual menu está o comando Excluir slide?", options: ["Formatar", "Ferramentas", "Slide", "Ajuda"], answer: 2, explanation: "O comando Excluir slide fica dentro do menu Slide.", hint: "Observe novamente o nome do menu aberto." },
    practice: { instruction: "Selecione e exclua o segundo slide.", successMessage: "Você excluiu o segundo slide." }
  }),
  lesson({
    id: 7, module: M2, title: "Adicionar título",
    objective: "Preencher o espaço de título do slide.", explanation: "O campo maior do layout é reservado para o título principal.",
    target: "title-placeholder", event: { type: "text:title", payload: { value: "Minha apresentação" } }, caption: "O título Minha apresentação foi inserido no slide.",
    question: { prompt: "Qual campo recebe o assunto principal do slide?", options: ["Título", "Zoom", "Tema", "Miniatura"], answer: 0, explanation: "O campo de título apresenta o assunto principal.", hint: "Observe o campo maior no centro do slide." },
    practice: { instruction: "Adicione um título ao slide.", successMessage: "Você adicionou um título." }
  }),
  lesson({
    id: 8, module: M2, title: "Adicionar texto",
    objective: "Inserir uma informação no campo de texto do slide.", explanation: "O campo de conteúdo recebe frases curtas que explicam o título.",
    target: "body-placeholder", event: { type: "text:create", payload: { value: "Conteúdo da aula" } }, caption: "Um texto foi adicionado abaixo do título.",
    question: { prompt: "Onde inserir uma explicação abaixo do título?", options: ["No campo de texto", "No botão Compartilhar", "No zoom", "No menu Ajuda"], answer: 0, explanation: "O campo de texto guarda as informações do slide.", hint: "Observe o campo menor abaixo do título." },
    practice: { instruction: "Adicione um texto ao slide.", successMessage: "Você adicionou um texto." }
  }),
  lesson({
    id: 9, module: M2, title: "Selecionar texto",
    objective: "Selecionar um texto antes de formatá-lo.", explanation: "A seleção informa qual texto receberá a próxima alteração.",
    target: "text-element-1", event: { type: "text:select", payload: { id: "text-1" } }, caption: "O texto selecionado ganhou uma borda azul.",
    question: { prompt: "O que deve ser feito antes de formatar um texto?", options: ["Selecionar o texto", "Excluir o slide", "Iniciar a apresentação", "Alterar o tema"], answer: 0, explanation: "Primeiro selecione o texto que será modificado.", hint: "Observe qual elemento ganhou a borda azul." },
    practice: { instruction: "Selecione o texto do slide.", successMessage: "Você selecionou o texto." }
  }),
  lesson({
    id: 10, module: M2, title: "Alterar tamanho da fonte",
    objective: "Aumentar o tamanho do texto selecionado.", explanation: "O controle de tamanho deixa o texto maior ou menor.",
    target: "format-menu", menu: "format", optionTarget: "font-size", event: { type: "text:font-size", payload: { size: 28 } }, caption: "O tamanho do texto foi alterado para 28.",
    question: { prompt: "Qual controle deixa as letras maiores?", options: ["Tamanho da fonte", "Plano de fundo", "Transição", "Comentário"], answer: 0, explanation: "O tamanho da fonte controla a altura das letras.", hint: "Observe o número exibido na barra de ferramentas." },
    practice: { instruction: "Aumente o texto para o tamanho 28.", successMessage: "Você alterou o tamanho da fonte." }
  }),
  lesson({
    id: 11, module: M2, title: "Alterar fonte",
    objective: "Trocar o estilo das letras do texto selecionado.", explanation: "A lista de fontes muda o desenho das letras sem alterar o conteúdo.",
    target: "format-menu", menu: "format", optionTarget: "font-family", event: { type: "text:font", payload: { font: "Verdana" } }, caption: "A fonte do texto foi alterada para Verdana.",
    question: { prompt: "O que muda ao escolher outra fonte?", options: ["O desenho das letras", "A ordem dos slides", "O plano de fundo", "O compartilhamento"], answer: 0, explanation: "A fonte define a aparência das letras.", hint: "Observe o nome que mudou na barra de ferramentas." },
    practice: { instruction: "Altere a fonte do texto para Verdana.", successMessage: "Você alterou a fonte." }
  }),
  lesson({
    id: 12, module: M2, title: "Negrito, itálico e sublinhado",
    objective: "Aplicar três estilos de destaque ao texto.", explanation: "Negrito, itálico e sublinhado ajudam a destacar partes importantes.",
    target: "format-menu", menu: "format", optionTarget: "text-style", event: { type: "text:style" }, caption: "O texto recebeu negrito, itálico e sublinhado.",
    question: { prompt: "Qual destes recursos destaca a escrita?", options: ["Negrito", "Miniatura", "Transição", "Plano de fundo"], answer: 0, explanation: "Negrito, itálico e sublinhado são estilos de texto.", hint: "Observe os símbolos B, I e U." },
    practice: { instruction: "Aplique negrito, itálico e sublinhado.", successMessage: "Você aplicou os três estilos." }
  }),
  lesson({
    id: 13, module: M2, title: "Alterar cor do texto",
    objective: "Aplicar uma nova cor ao texto selecionado.", explanation: "A cor do texto pode destacar palavras e organizar informações.",
    target: "format-menu", menu: "format", optionTarget: "text-color", event: { type: "text:color", payload: { color: "#1a73e8" } }, caption: "O texto foi alterado para azul.",
    question: { prompt: "Qual controle muda a cor das letras?", options: ["Cor do texto", "Layout", "Novo slide", "Apresentar"], answer: 0, explanation: "O controle Cor do texto altera a cor das letras.", hint: "Observe o botão com a letra A colorida." },
    practice: { instruction: "Altere a cor do texto para azul.", successMessage: "Você alterou a cor do texto." }
  }),
  lesson({
    id: 14, module: M2, title: "Alinhamento",
    objective: "Centralizar o texto dentro do slide.", explanation: "O alinhamento posiciona o texto à esquerda, ao centro ou à direita.",
    target: "format-menu", menu: "format", optionTarget: "text-align", event: { type: "text:align", payload: { align: "center" } }, caption: "O texto foi centralizado.",
    question: { prompt: "Qual alinhamento coloca o texto no meio?", options: ["Centralizado", "À esquerda", "Justificado", "Vertical"], answer: 0, explanation: "O alinhamento centralizado posiciona o texto no meio.", hint: "Observe como as linhas ficaram no centro." },
    practice: { instruction: "Centralize o texto do slide.", successMessage: "Você centralizou o texto." }
  }),
  lesson({
    id: 15, module: M3, title: "Alterar layout",
    objective: "Trocar a organização dos campos do slide.", explanation: "O layout define onde títulos e conteúdos aparecem.",
    target: "layout", event: { type: "layout:change", payload: { layout: "title-body" } }, caption: "O slide agora usa o layout Título e corpo.",
    question: { prompt: "O que o layout controla?", options: ["A organização dos campos", "A conexão de internet", "O nome do arquivo", "O volume do computador"], answer: 0, explanation: "O layout organiza os espaços de conteúdo.", hint: "Observe a posição dos campos dentro do slide." },
    practice: { instruction: "Mude o layout para Título e corpo.", successMessage: "Você alterou o layout." }
  }),
  lesson({
    id: 16, module: M3, title: "Duplicar um slide",
    objective: "Criar uma cópia do slide selecionado.", explanation: "Duplicar mantém o conteúdo e cria uma nova miniatura igual.",
    target: "slide-menu", menu: "slide", optionTarget: "duplicate-slide", event: { type: "slide:duplicate" }, caption: "Uma cópia do slide apareceu no painel de miniaturas.",
    question: { prompt: "O que acontece ao duplicar um slide?", options: ["Uma cópia é criada", "Todos os slides são apagados", "A apresentação inicia", "A fonte muda"], answer: 0, explanation: "Duplicar cria uma nova cópia do slide selecionado.", hint: "Observe a nova miniatura com o mesmo conteúdo." },
    practice: { instruction: "Duplique o slide selecionado.", successMessage: "Você duplicou o slide." }
  }),
  lesson({
    id: 17, module: M3, title: "Reordenar slides",
    objective: "Mover um slide para outra posição na sequência.", explanation: "A ordem das miniaturas também é a ordem da apresentação.",
    target: "slide-menu", menu: "slide", optionTarget: "reorder-slide", event: { type: "slide:reorder", payload: { id: "slide-2", toIndex: 0 } }, caption: "O segundo slide foi movido para a primeira posição.",
    question: { prompt: "O que muda ao reordenar miniaturas?", options: ["A sequência da apresentação", "A cor da fonte", "O tamanho da imagem", "O acesso à internet"], answer: 0, explanation: "A ordem das miniaturas define a sequência dos slides.", hint: "Observe qual miniatura passou a aparecer primeiro." },
    practice: { instruction: "Mova o segundo slide para a primeira posição.", successMessage: "Você reordenou os slides." }
  }),
  lesson({
    id: 18, module: M3, title: "Alterar plano de fundo",
    objective: "Mudar a cor de fundo do slide selecionado.", explanation: "O plano de fundo muda a superfície do slide sem alterar seus textos.",
    target: "background", event: { type: "background:change", payload: { color: "#fff2cc" } }, caption: "O plano de fundo do slide ficou amarelo-claro.",
    question: { prompt: "O que muda com Plano de fundo?", options: ["A superfície do slide", "A ordem das miniaturas", "A conta do usuário", "O nome da fonte"], answer: 0, explanation: "Plano de fundo altera a cor atrás do conteúdo.", hint: "Observe a cor da área inteira do slide." },
    practice: { instruction: "Aplique o plano de fundo amarelo-claro.", successMessage: "Você alterou o plano de fundo." }
  }),
  lesson({
    id: 19, module: M3, title: "Aplicar tema",
    objective: "Aplicar um estilo visual a toda a apresentação.", explanation: "O tema combina cores e aparência para manter os slides consistentes.",
    target: "theme", event: { type: "theme:change", payload: { theme: "dourado" } }, caption: "O tema Dourado foi aplicado à apresentação.",
    question: { prompt: "Para que serve um tema?", options: ["Padronizar a aparência", "Excluir imagens", "Reordenar slides", "Corrigir a internet"], answer: 0, explanation: "O tema mantém um estilo visual consistente.", hint: "Observe as cores aplicadas ao conjunto da apresentação." },
    practice: { instruction: "Aplique o tema Dourado.", successMessage: "Você aplicou um tema." }
  }),
  lesson({
    id: 20, module: M4, title: "Inserir imagem",
    objective: "Adicionar uma imagem local ao slide.", explanation: "O comando Imagem adiciona um elemento visual ao slide.",
    target: "insert-menu", menu: "insert", optionTarget: "insert-image", event: { type: "image:insert" }, caption: "Uma imagem de exemplo foi inserida no slide.",
    question: { prompt: "Em qual menu você encontra Imagem?", options: ["Inserir", "Ajuda", "Arquivo", "Organizar"], answer: 0, explanation: "O menu Inserir reúne os elementos adicionados ao slide.", hint: "Observe o menu aberto antes da imagem aparecer." },
    practice: { instruction: "Insira uma imagem no slide.", successMessage: "Você inseriu uma imagem." }
  }),
  lesson({
    id: 21, module: M4, title: "Redimensionar imagem",
    objective: "Aumentar uma imagem já inserida no slide.", explanation: "Redimensionar altera largura e altura da imagem.",
    target: "image-resize", event: { type: "image:resize", payload: { scale: 1.25 } }, caption: "A imagem ficou maior, mantendo-se dentro do slide.",
    question: { prompt: "O que significa redimensionar uma imagem?", options: ["Mudar seu tamanho", "Excluir o slide", "Adicionar comentário", "Trocar o tema"], answer: 0, explanation: "Redimensionar muda a largura e a altura.", hint: "Observe como a imagem ficou maior." },
    practice: { instruction: "Aumente o tamanho da imagem.", successMessage: "Você redimensionou a imagem." }
  }),
  lesson({
    id: 22, module: M4, title: "Mover imagem",
    objective: "Reposicionar uma imagem dentro do slide.", explanation: "Mover altera a posição da imagem sem mudar seu conteúdo.",
    target: "image-move", event: { type: "image:move", payload: { x: 62, y: 48 } }, caption: "A imagem foi movida para o lado direito do slide.",
    question: { prompt: "O que muda quando uma imagem é movida?", options: ["Sua posição", "Seu formato de arquivo", "O número de slides", "A fonte do texto"], answer: 0, explanation: "Mover modifica a posição da imagem no slide.", hint: "Observe em qual lado a imagem terminou." },
    practice: { instruction: "Mova a imagem para o lado direito.", successMessage: "Você moveu a imagem." }
  }),
  lesson({
    id: 23, module: M4, title: "Inserir formas",
    objective: "Adicionar uma forma geométrica ao slide.", explanation: "Formas ajudam a criar destaques, diagramas e sinalizações.",
    target: "insert-menu", menu: "insert", optionTarget: "insert-shape", event: { type: "shape:insert", payload: { kind: "rectangle" } }, caption: "Um retângulo foi adicionado ao slide.",
    question: { prompt: "Para que uma forma pode ser usada?", options: ["Criar destaques e diagramas", "Entrar na conta Google", "Aumentar o zoom do navegador", "Apagar o arquivo"], answer: 0, explanation: "Formas organizam e destacam informações visuais.", hint: "Observe o retângulo que apareceu no slide." },
    practice: { instruction: "Insira uma forma retangular.", successMessage: "Você inseriu uma forma." }
  }),
  lesson({
    id: 24, module: M4, title: "Inserir caixa de texto",
    objective: "Adicionar uma caixa de texto independente.", explanation: "A caixa de texto pode ser posicionada livremente no slide.",
    target: "text-box", event: { type: "textbox:insert", payload: { value: "Nova caixa de texto" } }, caption: "Uma caixa de texto independente foi criada.",
    question: { prompt: "Qual ferramenta cria texto fora dos campos do layout?", options: ["Caixa de texto", "Tema", "Transição", "Miniatura"], answer: 0, explanation: "A caixa de texto cria uma área de escrita livre.", hint: "Observe o botão com a letra T." },
    practice: { instruction: "Insira uma caixa de texto.", successMessage: "Você inseriu uma caixa de texto." }
  }),
  lesson({
    id: 25, module: M4, title: "Inserir linha ou seta",
    objective: "Adicionar uma seta para conectar informações.", explanation: "Linhas e setas mostram direção ou relação entre elementos.",
    target: "line", event: { type: "line:insert", payload: { kind: "arrow" } }, caption: "Uma seta foi adicionada ao slide.",
    question: { prompt: "Quando uma seta é útil?", options: ["Para indicar direção", "Para trocar a fonte", "Para excluir o tema", "Para abrir o arquivo"], answer: 0, explanation: "Setas indicam direção e conexão.", hint: "Observe o elemento que aponta para a direita." },
    practice: { instruction: "Insira uma seta no slide.", successMessage: "Você inseriu uma seta." }
  }),
  lesson({
    id: 26, module: M5, title: "Adicionar transição",
    objective: "Escolher um efeito de passagem entre slides.", explanation: "A transição aparece quando a apresentação passa de um slide para outro.",
    target: "transition", event: { type: "transition:change", payload: { transition: "dissolver" } }, caption: "A transição Dissolver foi aplicada ao slide.",
    question: { prompt: "Quando a transição aparece?", options: ["Na passagem entre slides", "Ao digitar uma palavra", "Ao abrir o menu Ajuda", "Ao alterar a fonte"], answer: 0, explanation: "Transições acontecem entre um slide e o próximo.", hint: "Pense no momento em que a apresentação avança." },
    practice: { instruction: "Adicione a transição Dissolver.", successMessage: "Você adicionou uma transição." }
  }),
  lesson({
    id: 27, module: M5, title: "Entender animações",
    objective: "Aplicar um efeito de entrada a um elemento do slide.", explanation: "Animações controlam como textos e imagens aparecem durante a apresentação.",
    target: "animate", event: { type: "animation:add", payload: { animation: "aparecer" } }, caption: "O efeito Aparecer foi aplicado ao texto.",
    question: { prompt: "O que uma animação controla?", options: ["Como um elemento aparece", "A senha da conta", "A ordem dos arquivos", "A conexão Wi-Fi"], answer: 0, explanation: "Animações controlam a entrada e o movimento dos elementos.", hint: "Observe qual efeito foi aplicado ao texto." },
    practice: { instruction: "Aplique a animação Aparecer.", successMessage: "Você adicionou uma animação." }
  }),
  lesson({
    id: 28, module: M5, title: "Adicionar comentário",
    objective: "Registrar uma observação para colaborar com outras pessoas.", explanation: "Comentários permitem sugerir melhorias sem alterar o conteúdo do slide.",
    target: "comment", event: { type: "comment:add", payload: { value: "Revise este slide" } }, caption: "Um comentário foi adicionado à apresentação.",
    question: { prompt: "Para que serve um comentário?", options: ["Registrar uma observação", "Apagar todos os slides", "Mudar o tema", "Iniciar a apresentação"], answer: 0, explanation: "Comentários guardam observações de colaboração.", hint: "Pense em uma mensagem que não altera o conteúdo." },
    practice: { instruction: "Adicione um comentário ao slide.", successMessage: "Você adicionou um comentário." }
  }),
  lesson({
    id: 29, module: M5, title: "Compartilhar uma apresentação",
    objective: "Abrir as opções de compartilhamento da apresentação.", explanation: "O botão Compartilhar controla quem pode acessar o arquivo. Nesta simulação nenhuma conta é conectada.",
    target: "share", event: { type: "share:open" }, caption: "As opções locais de compartilhamento foram abertas.",
    question: { prompt: "Qual botão controla o acesso de outras pessoas?", options: ["Compartilhar", "Layout", "Zoom", "Linha"], answer: 0, explanation: "O botão Compartilhar reúne as permissões de acesso.", hint: "Observe o botão azul no canto superior direito." },
    practice: { instruction: "Abra as opções de compartilhamento.", successMessage: "Você abriu as opções de compartilhamento." }
  }),
  lesson({
    id: 30, module: M5, title: "Iniciar apresentação de slides",
    objective: "Iniciar o modo de apresentação em tela cheia.", explanation: "O botão Apresentar mostra os slides para o público.",
    target: "present", event: { type: "presentation:start" }, caption: "A apresentação foi iniciada no slide selecionado.",
    question: { prompt: "Qual botão mostra os slides para o público?", options: ["Apresentar", "Comentário", "Plano de fundo", "Duplicar"], answer: 0, explanation: "Apresentar inicia a exibição dos slides.", hint: "Observe o botão com o símbolo de reprodução." },
    practice: { instruction: "Inicie a apresentação de slides.", successMessage: "Você iniciou a apresentação." }
  })
]);

export const googleSlidesFinalChallenge = Object.freeze({
  id: "final",
  title: "Prepare a apresentação para a aula",
  instruction: "Complete os dez itens usando o simulador. Cada ação será conferida no estado real da apresentação.",
  goals: Object.freeze([
    { id: "three-slides", label: "Crie 3 slides" },
    { id: "first-title", label: "Coloque um título no primeiro" },
    { id: "body-text", label: "Adicione texto" },
    { id: "bold-text", label: "Aplique negrito" },
    { id: "image", label: "Insira uma imagem" },
    { id: "layout", label: "Mude o layout de um slide" },
    { id: "reorder", label: "Reordene dois slides" },
    { id: "theme", label: "Escolha um tema" },
    { id: "transition", label: "Adicione uma transição" },
    { id: "present", label: "Inicie a apresentação" }
  ])
});
