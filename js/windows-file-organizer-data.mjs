export const WINDOWS_FILE_ORGANIZER_DATA_VERSION = 1;

const ICON_ROOT = "./assets/windows-file-organizer/icons";

export const CATEGORIES = [
  { id: "documents", label: "Documentos", shortLabel: "Documentos" },
  { id: "spreadsheets", label: "Planilhas", shortLabel: "Planilhas" },
  { id: "presentations", label: "Apresentações", shortLabel: "Apresentações" },
  { id: "images", label: "Imagens", shortLabel: "Imagens" },
  { id: "videos", label: "Vídeos", shortLabel: "Vídeos" },
  { id: "music", label: "Músicas", shortLabel: "Músicas" },
  { id: "programs", label: "Programas", shortLabel: "Programas" },
  { id: "archives", label: "Compactados", shortLabel: "Compactados" }
];

export const FILE_TYPES = [
  { extension: ".pdf", category: "documents", icon: `${ICON_ROOT}/pdf.svg`, sampleName: "curriculo.pdf", title: "PDF", fileTypeLabel: "Documento PDF (.pdf)", explanation: "Documento que mantém a formatação ao ser compartilhado." },
  { extension: ".docx", category: "documents", icon: `${ICON_ROOT}/word.svg`, sampleName: "trabalho.docx", title: "DOCX", fileTypeLabel: "Documento do Microsoft Word (.docx)", explanation: "Texto editável, normalmente criado no Microsoft Word." },
  { extension: ".txt", category: "documents", icon: `${ICON_ROOT}/text.svg`, sampleName: "anotacoes.txt", title: "TXT", fileTypeLabel: "Documento de Texto (.txt)", explanation: "Texto simples, sem imagens ou formatação avançada." },
  { extension: ".xlsx", category: "spreadsheets", icon: `${ICON_ROOT}/excel.svg`, sampleName: "notas.xlsx", title: "XLSX", fileTypeLabel: "Planilha do Microsoft Excel (.xlsx)", explanation: "Planilha usada para tabelas, cálculos e dados." },
  { extension: ".pptx", category: "presentations", icon: `${ICON_ROOT}/powerpoint.svg`, sampleName: "seminario.pptx", title: "PPTX", fileTypeLabel: "Apresentação do Microsoft PowerPoint (.pptx)", explanation: "Apresentação formada por slides." },
  { extension: ".jpg", category: "images", icon: `${ICON_ROOT}/photo-jpg.svg`, sampleName: "ferias.jpg", title: "JPG", fileTypeLabel: "Imagem JPEG (.jpg)", explanation: "Imagem compactada, muito usada em fotografias." },
  { extension: ".png", category: "images", icon: `${ICON_ROOT}/photo-png.svg`, sampleName: "foto_turma.png", title: "PNG", fileTypeLabel: "Imagem PNG (.png)", explanation: "Imagem que pode manter fundo transparente." },
  { extension: ".mp4", category: "videos", icon: `${ICON_ROOT}/video.svg`, sampleName: "aula_windows.mp4", title: "MP4", fileTypeLabel: "Vídeo MP4 (.mp4)", explanation: "Arquivo de vídeo com imagem e som." },
  { extension: ".mp3", category: "music", icon: `${ICON_ROOT}/music.svg`, sampleName: "musica.mp3", title: "MP3", fileTypeLabel: "Áudio MP3 (.mp3)", explanation: "Arquivo de áudio, música ou gravação." },
  { extension: ".zip", category: "archives", icon: `${ICON_ROOT}/archive.svg`, sampleName: "materiais.zip", title: "ZIP", fileTypeLabel: "Pasta compactada (.zip)", explanation: "Reúne e compacta um ou mais arquivos." },
  { extension: ".exe", category: "programs", icon: `${ICON_ROOT}/minecraft-launcher.png`, sampleName: "minecraft.exe", title: "EXE", fileTypeLabel: "Aplicativo (.exe)", explanation: "Programa que pode ser executado no Windows." }
];

const typeByExtension = new Map(FILE_TYPES.map((type) => [type.extension, type]));

const makeFile = ({ id, realName, displayName = realName, icon, sizeLabel }) => {
  const extension = realName.slice(realName.lastIndexOf(".")).toLowerCase();
  const type = typeByExtension.get(extension);
  if (!type) throw new Error(`Extensão sem cadastro: ${extension}`);
  return {
    id,
    realName,
    displayName,
    extension,
    category: type.category,
    icon: icon || type.icon,
    fileTypeLabel: type.fileTypeLabel,
    sizeLabel
  };
};

export const CONNECTION_FILES = [
  makeFile({ id: "connect-curriculo", realName: "curriculo.pdf", sizeLabel: "428 KB" }),
  makeFile({ id: "connect-trabalho", realName: "trabalho.docx", sizeLabel: "82 KB" }),
  makeFile({ id: "connect-anotacoes", realName: "anotacoes.txt", sizeLabel: "4 KB" }),
  makeFile({ id: "connect-notas", realName: "notas.xlsx", sizeLabel: "36 KB" }),
  makeFile({ id: "connect-seminario", realName: "seminario.pptx", sizeLabel: "3,2 MB" }),
  makeFile({ id: "connect-ferias", realName: "ferias.jpg", sizeLabel: "2,1 MB" }),
  makeFile({ id: "connect-turma", realName: "foto_turma.png", sizeLabel: "1,8 MB" }),
  makeFile({ id: "connect-aula", realName: "aula_windows.mp4", sizeLabel: "18,7 MB" }),
  makeFile({ id: "connect-musica", realName: "musica.mp3", sizeLabel: "4,6 MB" }),
  makeFile({ id: "connect-materiais", realName: "materiais.zip", sizeLabel: "7,4 MB" }),
  makeFile({ id: "connect-minecraft", realName: "minecraft.exe", icon: `${ICON_ROOT}/minecraft-launcher.png`, sizeLabel: "812 KB" })
];

const challenge = (id, realName, folderIds, icon, sizeLabel) => ({
  id,
  file: makeFile({ id: `guided-${id}`, realName, icon, sizeLabel }),
  folderIds
});

export const GUIDED_CHALLENGES = [
  challenge("pdf", "curriculo.pdf", ["documents", "videos"], null, "428 KB"),
  challenge("docx", "trabalho.docx", ["documents", "images"], null, "82 KB"),
  challenge("txt", "anotacoes.txt", ["documents", "programs"], null, "4 KB"),
  challenge("xlsx", "notas.xlsx", ["spreadsheets", "music"], null, "36 KB"),
  challenge("pptx", "seminario.pptx", ["presentations", "documents"], null, "3,2 MB"),
  challenge("jpg", "ferias.jpg", ["images", "spreadsheets"], null, "2,1 MB"),
  challenge("png", "foto_turma.png", ["images", "videos"], null, "1,8 MB"),
  challenge("mp4", "aula_windows.mp4", ["videos", "documents"], null, "18,7 MB"),
  challenge("mp3", "musica.mp3", ["music", "spreadsheets"], null, "4,6 MB"),
  challenge("zip", "materiais.zip", ["archives", "images"], null, "7,4 MB"),
  challenge("exe", "minecraft.exe", ["programs", "documents"], `${ICON_ROOT}/minecraft-launcher.png`, "812 KB")
];

export const DESKTOP_LEVEL_WITH_EXTENSIONS = [
  makeFile({ id: "visible-curriculo", realName: "curriculo.pdf", sizeLabel: "428 KB" }),
  makeFile({ id: "visible-historia", realName: "trabalho_historia.docx", sizeLabel: "96 KB" }),
  makeFile({ id: "visible-anotacoes", realName: "anotacoes.txt", sizeLabel: "4 KB" }),
  makeFile({ id: "visible-notas", realName: "notas.xlsx", sizeLabel: "36 KB" }),
  makeFile({ id: "visible-orcamento", realName: "orcamento.xlsx", sizeLabel: "44 KB" }),
  makeFile({ id: "visible-seminario", realName: "seminario.pptx", sizeLabel: "3,2 MB" }),
  makeFile({ id: "visible-redes", realName: "trabalho_redes.pptx", sizeLabel: "2,8 MB" }),
  makeFile({ id: "visible-ferias", realName: "ferias.jpg", sizeLabel: "2,1 MB" }),
  makeFile({ id: "visible-turma", realName: "turma.png", sizeLabel: "1,8 MB" }),
  makeFile({ id: "visible-perfil", realName: "perfil.jpg", sizeLabel: "684 KB" }),
  makeFile({ id: "visible-aula", realName: "aula_windows.mp4", sizeLabel: "18,7 MB" }),
  makeFile({ id: "visible-passeio", realName: "passeio.mp4", sizeLabel: "24,3 MB" }),
  makeFile({ id: "visible-musica", realName: "musica.mp3", sizeLabel: "4,6 MB" }),
  makeFile({ id: "visible-podcast", realName: "podcast.mp3", sizeLabel: "12,4 MB" }),
  makeFile({ id: "visible-audio", realName: "audio_aula.mp3", sizeLabel: "8,1 MB" }),
  makeFile({ id: "visible-minecraft", realName: "minecraft.exe", icon: `${ICON_ROOT}/minecraft-launcher.png`, sizeLabel: "812 KB" }),
  makeFile({ id: "visible-chrome", realName: "chrome.exe", icon: `${ICON_ROOT}/chrome.svg`, sizeLabel: "2,4 MB" }),
  makeFile({ id: "visible-discord", realName: "discord.exe", icon: `${ICON_ROOT}/discord.svg`, sizeLabel: "91,5 MB" }),
  makeFile({ id: "visible-materiais", realName: "materiais.zip", sizeLabel: "7,4 MB" }),
  makeFile({ id: "visible-fotos", realName: "fotos.zip", sizeLabel: "15,9 MB" })
];

export const DESKTOP_LEVEL_WITHOUT_EXTENSIONS = [
  makeFile({ id: "hidden-curriculo", realName: "curriculo.pdf", displayName: "Currículo", sizeLabel: "430 KB" }),
  makeFile({ id: "hidden-exercicios", realName: "lista_exercicios.docx", displayName: "Lista de Exercícios", sizeLabel: "74 KB" }),
  makeFile({ id: "hidden-anotacoes", realName: "anotacoes_aula.txt", displayName: "Anotações da Aula", sizeLabel: "6 KB" }),
  makeFile({ id: "hidden-notas", realName: "notas_turma.xlsx", displayName: "Notas da Turma", sizeLabel: "41 KB" }),
  makeFile({ id: "hidden-gastos", realName: "controle_gastos.xlsx", displayName: "Controle de Gastos", sizeLabel: "52 KB" }),
  makeFile({ id: "hidden-hardware", realName: "apresentacao_hardware.pptx", displayName: "Apresentação de Hardware", sizeLabel: "4,1 MB" }),
  makeFile({ id: "hidden-redes", realName: "projeto_redes.pptx", displayName: "Trabalho de Redes", sizeLabel: "3,4 MB" }),
  makeFile({ id: "hidden-praia", realName: "foto_praia.jpg", displayName: "Foto da Praia", sizeLabel: "2,5 MB" }),
  makeFile({ id: "hidden-turma", realName: "foto_turma.png", displayName: "Foto da Turma", sizeLabel: "2,1 MB" }),
  makeFile({ id: "hidden-perfil", realName: "perfil_aluno.jpg", displayName: "Perfil", sizeLabel: "712 KB" }),
  makeFile({ id: "hidden-aula", realName: "aula_windows.mp4", displayName: "Aula de Windows", sizeLabel: "19,2 MB" }),
  makeFile({ id: "hidden-viagem", realName: "viagem.mp4", displayName: "Viagem", sizeLabel: "27,8 MB" }),
  makeFile({ id: "hidden-musica", realName: "minha_musica.mp3", displayName: "Minha Música", sizeLabel: "5,1 MB" }),
  makeFile({ id: "hidden-podcast", realName: "podcast_escola.mp3", displayName: "Podcast da Escola", sizeLabel: "14,3 MB" }),
  makeFile({ id: "hidden-audio", realName: "audio_aula.mp3", displayName: "Áudio da Aula", sizeLabel: "8,6 MB" }),
  makeFile({ id: "hidden-minecraft", realName: "minecraft.exe", displayName: "Minecraft", icon: `${ICON_ROOT}/minecraft-launcher.png`, sizeLabel: "812 KB" }),
  makeFile({ id: "hidden-chrome", realName: "chrome.exe", displayName: "Google Chrome", icon: `${ICON_ROOT}/chrome.svg`, sizeLabel: "2,4 MB" }),
  makeFile({ id: "hidden-discord", realName: "discord.exe", displayName: "Discord", icon: `${ICON_ROOT}/discord.svg`, sizeLabel: "91,5 MB" }),
  makeFile({ id: "hidden-material", realName: "material_aula.zip", displayName: "Material da Aula", sizeLabel: "9,2 MB" }),
  makeFile({ id: "hidden-fotos", realName: "fotos_viagem.zip", displayName: "Fotos da Viagem", sizeLabel: "18,6 MB" })
];

export const MEDIA = {
  drag: {
    video: "./assets/windows-file-organizer/media/drag-file.webm",
    poster: "./assets/windows-file-organizer/media/drag-file.webp"
  },
  properties: {
    video: "./assets/windows-file-organizer/media/open-properties.webm",
    poster: "./assets/windows-file-organizer/media/open-properties.webp"
  }
};

export const categoryById = new Map(CATEGORIES.map((category) => [category.id, category]));
export const fileTypeByExtension = typeByExtension;
