export const SUPPORT_GAME_DATA_VERSION = "1.0.0";

export const supportSlotTypes = [
  {
    id: "verificar",
    label: "Verificar",
    icon: "visibility",
    hint: "O que observar primeiro"
  },
  {
    id: "causa",
    label: "Possível causa",
    icon: "settings",
    hint: "O que pode causar o problema"
  },
  {
    id: "solucao",
    label: "Solução",
    icon: "check_circle",
    hint: "O que fazer para resolver"
  }
];
export const supportTickets = [
  {
    id: "wifi",
    number: "01",
    title: "Wi-Fi não funciona",
    message: "O Wi-Fi do meu notebook não funciona.",
    icon: "wifi",
    summary: {
      verificar: "Wi-Fi ativado",
      causa: "adaptador desativado",
      solucao: "ativar e reconectar"
    }
  },
  {
    id: "lento",
    number: "02",
    title: "Notebook lento",
    message: "Meu notebook está muito lento.",
    icon: "timer",
    summary: {
      verificar: "armazenamento",
      causa: "pouco espaço disponível",
      solucao: "liberar espaço"
    }
  },
  {
    id: "audio",
    number: "03",
    title: "Computador sem som",
    message: "Meu computador está sem som.",
    icon: "volume_up",
    summary: {
      verificar: "volume e saída",
      causa: "mudo ou saída incorreta",
      solucao: "corrigir volume e saída"
    }
  }
];

export const supportCards = [
  {
    id: "wifi-verificar",
    text: "Verificar se o Wi-Fi está ativado no notebook.",
    icon: "visibility",
    ticketId: "wifi",
    type: "verificar"
  },
  {
    id: "wifi-causa",
    text: "O adaptador Wi-Fi está desativado.",
    icon: "settings",
    ticketId: "wifi",
    type: "causa"
  },
  {
    id: "wifi-solucao",
    text: "Ativar o Wi-Fi e conectar novamente à rede.",
    icon: "wifi",
    ticketId: "wifi",
    type: "solucao"
  },
  {
    id: "lento-verificar",
    text: "Verificar quanto espaço livre existe no armazenamento.",
    icon: "storage",
    ticketId: "lento",
    type: "verificar"
  },
  {
    id: "lento-causa",
    text: "O armazenamento está quase completamente cheio.",
    icon: "timer",
    ticketId: "lento",
    type: "causa"
  },
  {
    id: "lento-solucao",
    text: "Liberar espaço removendo arquivos e programas desnecessários.",
    icon: "restart_alt",
    ticketId: "lento",
    type: "solucao"
  },
  {
    id: "audio-verificar",
    text: "Verificar o volume e o dispositivo de saída de áudio.",
    icon: "volume_up",
    ticketId: "audio",
    type: "verificar"
  },
  {
    id: "audio-causa",
    text: "O áudio está no mudo ou com a saída incorreta.",
    icon: "volume_off",
    ticketId: "audio",
    type: "causa"
  },
  {
    id: "audio-solucao",
    text: "Ativar o volume e selecionar o dispositivo de áudio correto.",
    icon: "speaker",
    ticketId: "audio",
    type: "solucao"
  },
  {
    id: "distrator-formatar",
    text: "Formatar imediatamente o computador.",
    icon: "restart_alt",
    ticketId: null,
    type: "distrator"
  },
  {
    id: "distrator-monitor",
    text: "Trocar o monitor por outro.",
    icon: "tv",
    ticketId: null,
    type: "distrator"
  },
  {
    id: "distrator-senha",
    text: "Alterar a senha da conta do usuário.",
    icon: "security",
    ticketId: null,
    type: "distrator"
  }
];
