export const SUPPORT_GAME_DATA_VERSION = "2.0.0";

export const supportSlotTypes = [
  { id: "verificar", label: "Verificar", icon: "visibility", hint: "O que observar primeiro" },
  { id: "causa", label: "Possível causa", icon: "settings", hint: "O que pode causar o problema" },
  { id: "solucao", label: "Solução", icon: "check_circle", hint: "O que fazer para resolver" }
];

const levelOneTickets = [
  {
    id: "wifi", number: "01", title: "Wi-Fi não funciona",
    message: "O Wi-Fi do meu notebook não funciona.", icon: "wifi",
    summary: { verificar: "Wi-Fi ativado", causa: "adaptador desativado", solucao: "ativar e reconectar" }
  },
  {
    id: "lento", number: "02", title: "Notebook lento",
    message: "Meu notebook está muito lento.", icon: "timer",
    summary: { verificar: "armazenamento", causa: "pouco espaço disponível", solucao: "liberar espaço" }
  },
  {
    id: "audio", number: "03", title: "Computador sem som",
    message: "Meu computador está sem som.", icon: "volume_up",
    summary: { verificar: "volume e saída", causa: "mudo ou saída incorreta", solucao: "corrigir volume e saída" }
  }
];

const levelOneCards = [
  { id: "wifi-verificar", text: "Verificar se o Wi-Fi está ativado no notebook.", icon: "visibility", ticketId: "wifi", type: "verificar" },
  { id: "wifi-causa", text: "O adaptador Wi-Fi está desativado.", icon: "settings", ticketId: "wifi", type: "causa" },
  { id: "wifi-solucao", text: "Ativar o Wi-Fi e conectar novamente à rede.", icon: "wifi", ticketId: "wifi", type: "solucao" },
  { id: "lento-verificar", text: "Verificar quanto espaço livre existe no armazenamento.", icon: "storage", ticketId: "lento", type: "verificar" },
  { id: "lento-causa", text: "O armazenamento está quase completamente cheio.", icon: "timer", ticketId: "lento", type: "causa" },
  { id: "lento-solucao", text: "Liberar espaço removendo arquivos e programas desnecessários.", icon: "restart_alt", ticketId: "lento", type: "solucao" },
  { id: "audio-verificar", text: "Verificar o volume e o dispositivo de saída de áudio.", icon: "volume_up", ticketId: "audio", type: "verificar" },
  { id: "audio-causa", text: "O áudio está no mudo ou com a saída incorreta.", icon: "volume_off", ticketId: "audio", type: "causa" },
  { id: "audio-solucao", text: "Ativar o volume e selecionar o dispositivo de áudio correto.", icon: "speaker", ticketId: "audio", type: "solucao" },
  { id: "distrator-formatar", text: "Formatar imediatamente o computador.", icon: "restart_alt", ticketId: null, type: "distrator" },
  { id: "distrator-monitor", text: "Trocar o monitor por outro.", icon: "tv", ticketId: null, type: "distrator" },
  { id: "distrator-senha", text: "Alterar a senha da conta do usuário.", icon: "security", ticketId: null, type: "distrator" }
];

const levelTwoTickets = [
  {
    id: "mouse", number: "04", title: "Mouse não funciona",
    message: "O mouse sem fio do meu computador não funciona.", icon: "mouse",
    summary: { verificar: "luz do mouse", causa: "pilha descarregada", solucao: "trocar a pilha" }
  },
  {
    id: "teclado", number: "05", title: "Teclado não funciona",
    message: "Meu teclado não responde quando eu digito.", icon: "touch_app",
    summary: { verificar: "conexão do cabo", causa: "cabo desconectado", solucao: "reconectar e testar" }
  },
  {
    id: "impressora", number: "06", title: "Impressora não imprime",
    message: "A impressora está ligada, mas não imprime.", icon: "print",
    summary: { verificar: "papel na bandeja", causa: "bandeja sem papel", solucao: "colocar papel e reenviar" }
  }
];

const levelTwoCards = [
  { id: "mouse-verificar", text: "Verificar se a luz do mouse sem fio acende.", icon: "visibility", ticketId: "mouse", type: "verificar" },
  { id: "mouse-causa", text: "A pilha do mouse está descarregada.", icon: "mouse", ticketId: "mouse", type: "causa" },
  { id: "mouse-solucao", text: "Trocar a pilha do mouse e testar novamente.", icon: "restart_alt", ticketId: "mouse", type: "solucao" },
  { id: "teclado-verificar", text: "Verificar se o cabo do teclado está bem conectado.", icon: "settings_ethernet", ticketId: "teclado", type: "verificar" },
  { id: "teclado-causa", text: "O cabo do teclado está solto ou desconectado.", icon: "close", ticketId: "teclado", type: "causa" },
  { id: "teclado-solucao", text: "Reconectar o cabo do teclado e testar novamente.", icon: "check_circle", ticketId: "teclado", type: "solucao" },
  { id: "impressora-verificar", text: "Verificar se há papel na bandeja da impressora.", icon: "visibility", ticketId: "impressora", type: "verificar" },
  { id: "impressora-causa", text: "A bandeja da impressora está sem papel.", icon: "insert_drive_file", ticketId: "impressora", type: "causa" },
  { id: "impressora-solucao", text: "Colocar papel na bandeja e reenviar a impressão.", icon: "print", ticketId: "impressora", type: "solucao" },
  { id: "distrator-sistema", text: "Reinstalar o sistema operacional.", icon: "developer_mode", ticketId: null, type: "distrator" },
  { id: "distrator-webcam", text: "Trocar a webcam do computador.", icon: "tv", ticketId: null, type: "distrator" },
  { id: "distrator-brilho", text: "Alterar o brilho da tela.", icon: "graphic_eq", ticketId: null, type: "distrator" }
];

export const supportLevels = [
  {
    id: "nivel-1", number: 1, label: "Primeiros atendimentos",
    description: "Conectividade, desempenho e áudio",
    tickets: levelOneTickets, cards: levelOneCards
  },
  {
    id: "nivel-2", number: 2, label: "Novos periféricos",
    description: "Mouse, teclado e impressão",
    tickets: levelTwoTickets, cards: levelTwoCards
  }
];

export const supportTickets = supportLevels.flatMap((level) => level.tickets);
export const supportCards = supportLevels.flatMap((level) => level.cards);
