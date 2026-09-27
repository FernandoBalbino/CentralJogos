import {
  INSTALLER_STORAGE_KEY,
  INSTALLER_STEPS,
  VIRTUAL_DISKS,
  EDITIONS,
  createInstallerState,
  restoreInstallerState,
  nextInstallerStep,
  previousInstallerStep,
  canAdvanceInstaller,
  selectedVirtualDisk
} from "./windows-installer-core.mjs";

const ASSET = "./assets/windows-installer";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const fluent = (name, alt = "") => `<img src="${ASSET}/fluent/${name}.svg" alt="${escapeHtml(alt)}">`;
const desktopIcon = (name, alt = "") => `<img src="${ASSET}/desktop/${name}.png" alt="${escapeHtml(alt)}">`;
const brandMark = (os) => os === "windows10"
  ? `<img class="wi-brand-mark" src="./assets/items/windows.svg" alt="">`
  : `<img class="wi-brand-mark" src="${ASSET}/desktop/start.png" alt="">`;
const osName = (os) => os === "windows10" ? "Windows 10" : "Windows 11";

const GUIDE = {
  boot: ["Inicialização", "O computador está iniciando pela mídia de instalação simulada.", "Aguarde a tela de configuração."],
  language: ["Idioma e teclado", "Escolha o idioma, o formato regional e o teclado usados na instalação.", "Confira as opções e avance."],
  install: ["Iniciar instalação", "O instalador está pronto para iniciar a cópia do sistema.", "Selecione Instalar agora."],
  key: ["Chave do produto", "Uma instalação real pode solicitar uma chave. Aqui você pode seguir sem informar uma chave verdadeira.", "Use a opção de continuar sem chave."],
  edition: ["Edição", "Home, Pro e Education atendem a contextos diferentes. A edição escolhida aparecerá no sistema final.", "Escolha uma edição e avance."],
  license: ["Licença", "Leia o resumo educacional e confirme que deseja continuar a simulação.", "Marque a caixa para avançar."],
  type: ["Tipo de instalação", "Esta atividade representa uma instalação limpa iniciada pela mídia de instalação.", "Escolha a instalação personalizada."],
  disk: ["Onde instalar", "Os dois HDs virtuais já têm espaço preparado. Os nomes de partição aparecem como no instalador, mas você só precisa escolher o HD.", "Selecione um HD e avance."],
  progress: ["Instalação", "Os arquivos e recursos do sistema estão sendo preparados no HD escolhido.", "Aguarde o progresso automático."],
  restart: ["Reinicialização", "Após copiar os arquivos, o computador reinicia para continuar a configuração.", "Aguarde; a instalação continuará."],
  region: ["Região", "A região ajusta formatos como data e hora.", "Confirme a região."],
  keyboard: ["Layout do teclado", "O layout define como as teclas digitam símbolos e acentos.", "Confirme o teclado."],
  secondKeyboard: ["Segundo layout", "Um segundo layout é opcional neste laboratório.", "Adicione ou ignore."],
  network: ["Rede", "As redes exibidas são fictícias. Nenhuma conexão real será feita.", "Selecione uma rede simulada."],
  updates: ["Verificando atualizações", "Esta verificação é apenas visual e não acessa a internet.", "Aguarde a próxima tela."],
  device: ["Nome do dispositivo", "O nome ajuda a identificar o computador em uma rede.", "Digite um nome fictício curto."],
  purpose: ["Uso do computador", "A configuração pode variar entre uso pessoal e escolar ou profissional.", "Escolha o contexto simulado."],
  account: ["Conta de usuário", "Crie uma identidade fictícia para este laboratório. Ela aparecerá no desktop.", "Informe um nome de usuário fictício."],
  credential: ["Proteção da conta", "Use apenas uma senha ou PIN fictício. O valor não será salvo.", "Digite e confirme o valor fictício."],
  security: ["Perguntas de segurança", "Estas respostas também são fictícias e não serão salvas.", "Preencha as respostas para continuar."],
  privacy: ["Privacidade", "Escolha quais recursos estariam ativados no sistema instalado.", "Revise as opções e confirme."],
  prepare: ["Preparando o desktop", "A configuração inicial foi concluída. O sistema está preparando a área de trabalho.", "Aguarde a inicialização final."],
  desktop: ["Instalação concluída", "O sistema chegou à área de trabalho. Em um PC real, seria hora de verificar drivers, atualizações e ativação.", "Você pode reiniciar o laboratório ou voltar à Central."]
};

class WindowsInstaller {
  constructor() {
    this.root = null;
    this.active = false;
    this.state = this.load();
    this.timer = null;
    this.progressTimer = null;
    this.message = "";
    this.startMenuOpen = false;
    this.onClick = this.onClick.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onInput = this.onInput.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
  }

  load() {
    try { return restoreInstallerState(JSON.parse(sessionStorage.getItem(INSTALLER_STORAGE_KEY))); }
    catch { return null; }
  }

  save() {
    try {
      if (this.state) sessionStorage.setItem(INSTALLER_STORAGE_KEY, JSON.stringify(this.state));
      else sessionStorage.removeItem(INSTALLER_STORAGE_KEY);
    } catch { /* O laboratório continua funcional sem armazenamento. */ }
  }

  mount(root) {
    this.root = root;
    if (!root) return;
    root.addEventListener("click", this.onClick);
    root.addEventListener("change", this.onChange);
    root.addEventListener("input", this.onInput);
    root.addEventListener("keydown", this.onKeydown);
  }

  enter() {
    this.active = true;
    this.state = this.load();
    this.render();
  }

  leave() {
    this.active = false;
    this.clearTimers();
    document.body.classList.remove("windows-installer-immersive");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  clearTimers() {
    clearTimeout(this.timer);
    clearInterval(this.progressTimer);
    this.timer = null;
    this.progressTimer = null;
  }

  start(os) {
    this.clearTimers();
    this.state = createInstallerState(os);
    this.save();
    this.render();
    this.root?.requestFullscreen?.().catch(() => {});
  }

  setStep(step) {
    this.clearTimers();
    this.message = "";
    this.state.step = step;
    if (step === "progress") this.state.progress = 0;
    if (step === "desktop") this.state.completed = true;
    this.save();
    this.render();
  }

  next() {
    if (!canAdvanceInstaller(this.state)) {
      this.feedback("Complete esta etapa antes de continuar.");
      return;
    }
    this.setStep(nextInstallerStep(this.state));
  }

  feedback(message) {
    this.message = message;
    const element = this.root?.querySelector(".wi-feedback");
    if (element) element.textContent = message;
  }

  render() {
    if (!this.root || !this.active) return;
    document.body.classList.toggle("windows-installer-immersive", Boolean(this.state));
    if (!this.state) {
      this.root.innerHTML = `<div class="wi-chooser">
        <a class="wi-home-link" href="#/">← Voltar à Central de Jogos</a>
        <span class="wi-chooser-kicker">Laboratório de informática</span>
        <h1>Simulador de Instalação do Windows</h1>
        <p>Escolha um sistema operacional para iniciar a instalação simulada.</p>
        <div class="wi-os-options">
          <button type="button" class="wi-os-card" data-action="start" data-os="windows10">
            ${brandMark("windows10")}<span>Windows 10</span><small>Instalação limpa · 22H2</small><strong>Instalar Windows 10 →</strong>
          </button>
          <button type="button" class="wi-os-card" data-action="start" data-os="windows11">
            ${brandMark("windows11")}<span>Windows 11</span><small>Instalação limpa · 25H2</small><strong>Instalar Windows 11 →</strong>
          </button>
        </div>
        <p class="wi-disclaimer">Tudo acontece neste navegador. Nenhum HD real será alterado.</p>
      </div>`;
      return;
    }
    const { os, step } = this.state;
    const guide = GUIDE[step];
    const steps = INSTALLER_STEPS[os];
    const stepNumber = steps.indexOf(step) + 1;
    this.root.innerHTML = `<div class="wi-shell wi-${os}" data-step="${step}">
      <div class="wi-toolbar">
        <span>${brandMark(os)} <b>Laboratório · ${osName(os)}</b></span>
        <div><button type="button" data-action="fullscreen">Tela cheia</button><button type="button" data-action="exit">Sair do simulador</button></div>
      </div>
      <div class="wi-workspace">
        <section class="wi-stage" aria-label="Simulação da instalação do ${osName(os)}">${this.renderStage()}</section>
        <aside class="wi-guide" aria-label="Guia da instalação">
          <span class="wi-guide-kicker">GUIA DA INSTALAÇÃO</span>
          <small>Etapa ${stepNumber} de ${steps.length}</small>
          <h2>${guide[0]}</h2><p>${guide[1]}</p>
          <div class="wi-guide-next"><b>Próximo passo</b><span>${guide[2]}</span></div>
          ${step === "desktop" ? `<div class="wi-guide-actions"><button type="button" data-action="restart">Reiniciar laboratório</button><button type="button" data-action="reset">Escolher outro sistema</button></div>` : ""}
          <p class="wi-simulated-note">Ambiente fictício. Nenhum sistema será instalado neste computador.</p>
        </aside>
      </div>
    </div>`;
    this.scheduleAutoStep();
  }

  setupFrame(title, content, actions = "") {
    return `<div class="wi-setup-backdrop"><div class="wi-setup-window">
      <div class="wi-setup-head">${brandMark(this.state.os)} <span>Instalação do ${osName(this.state.os)}</span></div>
      <div class="wi-setup-body"><h1>${title}</h1>${content}<p class="wi-feedback" role="alert">${escapeHtml(this.message)}</p></div>
      <div class="wi-setup-actions">${actions}</div>
    </div><div class="wi-setup-bottom"><span>© Microsoft Corporation · Recriação educacional</span><span>1&nbsp;&nbsp; Coletando informações &nbsp;&nbsp; 2&nbsp;&nbsp; Instalando o Windows</span></div></div>`;
  }

  oobeFrame(title, content, actions = "") {
    return `<div class="wi-oobe-backdrop"><div class="wi-oobe-card">
      <div class="wi-oobe-logo">${brandMark(this.state.os)} <span>${osName(this.state.os)}</span></div>
      <div class="wi-oobe-content"><h1>${title}</h1>${content}<p class="wi-feedback" role="alert">${escapeHtml(this.message)}</p></div>
      <div class="wi-oobe-actions">${actions}</div>
    </div></div>`;
  }

  nextButton(label = "Avançar", disabled = false) {
    return `<button class="wi-primary" type="button" data-action="next" ${disabled ? "disabled" : ""}>${label}</button>`;
  }

  backButton() {
    return `<button class="wi-secondary" type="button" data-action="back">Voltar</button>`;
  }

  renderStage() {
    const s = this.state;
    switch (s.step) {
      case "boot": return `<div class="wi-boot"><div class="wi-boot-content">${brandMark(s.os)}<div class="wi-spinner" aria-label="Inicializando"></div><p>Iniciando pela mídia de instalação...</p></div></div>`;
      case "language": return this.setupFrame("Instalação do Windows", `<div class="wi-language-fields">
        <label>Idioma a instalar<select data-field="language"><option>Português (Brasil)</option><option>English (United States)</option></select></label>
        <label>Formato de hora e moeda<select data-field="region"><option>Brasil</option><option>Portugal</option><option>Estados Unidos</option></select></label>
        <label>Teclado ou método de entrada<select data-field="keyboard"><option>Português (Brasil ABNT2)</option><option>Português (Brasil ABNT)</option><option>Inglês (Estados Unidos)</option></select></label>
      </div>`, this.nextButton());
      case "install": return this.setupFrame("Instalação do Windows", `<div class="wi-install-now">${brandMark(s.os)}<button class="wi-primary" type="button" data-action="next">Instalar agora</button><p>Reparar o computador</p></div>`);
      case "key": return this.setupFrame("Ativar o Windows", `<p>Digite uma chave fictícia no formato XXXXX-XXXXX-XXXXX-XXXXX-XXXXX ou continue sem chave.</p>
        <label class="wi-field">Chave do produto<input id="wi-product-key" type="text" maxlength="29" autocomplete="off" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" aria-describedby="wi-key-note"></label>
        <small id="wi-key-note">Não digite uma chave real. A chave não será armazenada.</small>`,
        `${this.backButton()}<button class="wi-text-button" type="button" data-action="skip-key">Não tenho uma chave do produto</button><button class="wi-primary" type="button" data-action="key-next">Avançar</button>`);
      case "edition": return this.setupFrame(`Selecione o sistema operacional que deseja instalar`, `<p>Selecione a edição correspondente a esta instalação simulada.</p>
        <fieldset class="wi-editions"><legend>Edições disponíveis</legend>${EDITIONS.map((edition) => `<label><input type="radio" name="wi-edition" value="${edition}" ${s.edition === edition ? "checked" : ""}><span>${osName(s.os)} ${edition}</span></label>`).join("")}</fieldset>`,
        `${this.backButton()}${this.nextButton("Avançar", !s.edition)}`);
      case "license": return this.setupFrame("Avisos e termos de licença aplicáveis", `<div class="wi-license-text"><h2>Termos de licença do software Microsoft</h2><p>Esta é uma versão educacional resumida. A instalação real apresenta os termos completos do produto e exige sua leitura e aceitação.</p><p>O simulador não instala ou ativa o Windows e não coleta dados do aluno.</p></div>
        <label class="wi-check"><input type="checkbox" data-field="licenseAccepted" ${s.licenseAccepted ? "checked" : ""}> Aceito continuar esta instalação simulada.</label>`,
        `${this.backButton()}${this.nextButton("Avançar", !s.licenseAccepted)}`);
      case "type": return this.setupFrame("Que tipo de instalação você deseja?", `<div class="wi-type-options">
        <button type="button" data-action="upgrade"><b>Atualização: instalar o Windows e manter arquivos, configurações e aplicativos</b><span>Disponível quando o instalador é iniciado dentro do Windows atual.</span></button>
        <button type="button" data-action="next"><b>Personalizada: instalar apenas o Windows (avançado)</b><span>Realizar uma instalação limpa no HD virtual escolhido.</span></button>
      </div>`, this.backButton());
      case "disk": return this.setupFrame("Onde você quer instalar o Windows?", `<div class="wi-disk-table" role="radiogroup" aria-label="HDs virtuais disponíveis">
        <div class="wi-disk-heading"><span>Nome</span><span>Tamanho total</span><span>Espaço livre</span><span>Tipo</span></div>
        ${VIRTUAL_DISKS.map((disk) => `<label class="wi-disk-row ${s.diskId === disk.id ? "is-selected" : ""}">
          <span><input type="radio" name="wi-disk" value="${disk.id}" ${s.diskId === disk.id ? "checked" : ""}>${fluent("hard_drive")}${disk.label}</span>
          <span>${disk.sizeGb} GB</span><span>${disk.sizeGb} GB</span><span>${disk.type}</span>
        </label>`).join("")}
      </div><p class="wi-disk-hint">Ambos os HDs são fictícios e já estão prontos para instalação.</p>`,
        `${this.backButton()}${this.nextButton("Avançar", !s.diskId)}`);
      case "progress": {
        const disk = selectedVirtualDisk(s);
        const phases = ["Copiando arquivos do Windows", "Preparando arquivos para instalação", "Instalando recursos", "Instalando atualizações", "Finalizando"];
        const phaseIndex = s.progress < 22 ? 0 : s.progress < 65 ? 1 : s.progress < 82 ? 2 : s.progress < 95 ? 3 : 4;
        return this.setupFrame("Instalando o Windows", `<div class="wi-progress-list">${phases.map((phase, index) => `<div class="${index < phaseIndex ? "done" : index === phaseIndex ? "current" : ""}">${index < phaseIndex ? "✓" : index === phaseIndex ? "•" : "○"} ${phase}${index === phaseIndex ? ` (<span id="wi-progress-percent">${s.progress}</span>%)` : ""}</div>`).join("")}</div>
          <div class="wi-progress-track"><span style="width:${s.progress}%"></span></div><p>Destino: ${escapeHtml(disk?.label || "HD virtual")}</p>`);
      }
      case "restart": return `<div class="wi-boot"><div class="wi-boot-content">${brandMark(s.os)}<div class="wi-spinner" aria-label="Reinicializando"></div><p>O Windows precisa reiniciar para continuar.</p><small>Não pressione nenhuma tecla.</small></div></div>`;
      case "region": return this.oobeFrame("Esta é a região correta?", `<div class="wi-oobe-illustration">${fluent("building")}</div><label class="wi-field">País ou região<select data-field="region"><option>Brasil</option><option>Portugal</option><option>Estados Unidos</option></select></label>`, this.nextButton("Sim"));
      case "keyboard": return this.oobeFrame("Este é o layout de teclado correto?", `<label class="wi-field">Layout do teclado<select data-field="keyboard"><option>Português (Brasil ABNT2)</option><option>Português (Brasil ABNT)</option><option>Inglês (Estados Unidos)</option></select></label>`, this.nextButton("Sim"));
      case "secondKeyboard": return this.oobeFrame("Deseja adicionar um segundo layout de teclado?", `<p>Você poderá alterar esta opção depois de concluir a instalação.</p>`, `<button class="wi-secondary" type="button" data-action="next">Ignorar</button><button class="wi-primary" type="button" data-action="next">Adicionar</button>`);
      case "network": return this.oobeFrame("Vamos conectar você a uma rede", `<div class="wi-oobe-illustration">${fluent("wifi_1")}</div><p>Redes fictícias para esta atividade. Nenhuma conexão real será realizada.</p><div class="wi-networks">${["WiFi_Escola", "LAB_INFORMATICA", "Visitantes"].map((name) => `<label><input type="radio" name="wi-network" value="${name}" ${s.network === name ? "checked" : ""}>${fluent("wifi_1")}<span>${name}</span></label>`).join("")}</div>`, this.nextButton("Conectar", !s.network));
      case "updates": return this.oobeFrame("Verificando atualizações", `<div class="wi-spinner wi-spinner-blue" aria-label="Verificando"></div><p>Verificação simulada. Nenhuma conexão externa será feita.</p>`);
      case "device": return this.oobeFrame("Vamos dar um nome ao seu dispositivo", `<p>Use letras, números e hífen, até 15 caracteres.</p><label class="wi-field">Nome do computador<input data-field="deviceName" type="text" maxlength="15" autocomplete="off" value="${escapeHtml(s.deviceName)}" placeholder="PC-LAB01"></label>`, this.nextButton("Avançar", !canAdvanceInstaller(s)));
      case "purpose": return this.oobeFrame("Como você deseja configurar este dispositivo?", `<div class="wi-purpose"><label><input type="radio" name="wi-purpose" value="personal" ${s.purpose === "personal" ? "checked" : ""}>Configurar para uso pessoal</label><label><input type="radio" name="wi-purpose" value="work" ${s.purpose === "work" ? "checked" : ""}>Configurar para trabalho ou escola</label></div>`, this.nextButton());
      case "account": return this.oobeFrame(s.os === "windows10" ? "Quem usará este computador?" : "Vamos configurar sua conta", `<p>${s.os === "windows11" ? "Este é um cadastro fictício para a demonstração. Não use uma conta Microsoft real." : "Crie uma conta local fictícia para o laboratório."}</p>
        <label class="wi-field">Nome de usuário<input data-field="username" type="text" maxlength="40" autocomplete="off" value="${escapeHtml(s.username)}" placeholder="Aluno"></label>
        ${s.os === "windows11" ? `<label class="wi-field">Conta fictícia<input data-field="accountEmail" type="email" autocomplete="off" value="${escapeHtml(s.accountEmail || "aluno@exemplo.com")}" placeholder="aluno@exemplo.com"></label><small>Use apenas um endereço terminado em @exemplo.com.</small>` : ""}`,
        this.nextButton("Avançar", !s.username));
      case "credential": return this.oobeFrame(s.os === "windows10" ? "Crie uma senha" : "Configure um PIN", `<p>Use um valor fictício. Ele só será comparado nesta tela e não será salvo.</p>
        <label class="wi-field">${s.os === "windows10" ? "Senha fictícia" : "PIN fictício"}<input id="wi-secret" type="password" autocomplete="off" inputmode="${s.os === "windows11" ? "numeric" : "text"}" minlength="4"></label>
        <label class="wi-field">Confirmar ${s.os === "windows10" ? "senha" : "PIN"}<input id="wi-secret-confirm" type="password" autocomplete="off" inputmode="${s.os === "windows11" ? "numeric" : "text"}" minlength="4"></label>`, `<button class="wi-primary" type="button" data-action="credential-next">Avançar</button>`);
      case "security": return this.oobeFrame("Perguntas de segurança", `<p>Responda com informações inventadas para esta simulação.</p><div class="wi-security-questions">
        ${["Qual era o nome da sua primeira escola?", "Qual é sua cidade fictícia favorita?", "Qual é o nome do seu personagem fictício?"].map((question, index) => `<label class="wi-field">${question}<input class="wi-security-answer" type="text" autocomplete="off" aria-label="Resposta fictícia ${index + 1}"></label>`).join("")}</div>`, `<button class="wi-primary" type="button" data-action="security-next">Avançar</button>`);
      case "privacy": return this.oobeFrame("Escolha as configurações de privacidade", `<div class="wi-privacy">
        ${[["location", "Localização", "Permitir que aplicativos usem a localização simulada."], ["diagnostics", "Dados de diagnóstico", "Compartilhar dados opcionais de diagnóstico."], ["experiences", "Experiências personalizadas", "Personalizar sugestões no sistema."]].map(([key, title, description]) => `<label><span><b>${title}</b><small>${description}</small></span><input type="checkbox" data-privacy="${key}" ${s.privacy[key] ? "checked" : ""}></label>`).join("")}</div>`, this.nextButton("Aceitar"));
      case "prepare": return `<div class="wi-prepare"><div class="wi-spinner" aria-label="Preparando"></div><h1>Estamos preparando tudo para você</h1><p>Isso pode levar alguns instantes.</p></div>`;
      case "desktop": return this.renderDesktop();
      default: return "";
    }
  }

  renderDesktop() {
    const s = this.state;
    const is11 = s.os === "windows11";
    return `<div class="wi-desktop ${is11 ? "wi-desktop-11" : "wi-desktop-10"}">
      <div class="wi-desktop-icons"><button type="button" data-action="desktop-info">${desktopIcon("recycle-bin")}<span>Lixeira</span></button>
        <button type="button" data-action="desktop-info">${desktopIcon("computer")}<span>Este Computador</span></button>
        <button type="button" data-action="desktop-info">${desktopIcon("explorer")}<span>Explorador de Arquivos</span></button></div>
      <div class="wi-desktop-watermark">${osName(s.os)} ${escapeHtml(s.edition)}</div>
      <p class="wi-feedback wi-desktop-notice" role="status">${escapeHtml(this.message)}</p>
      ${this.startMenuOpen ? `<div class="wi-start-menu"><strong>${osName(s.os)} ${escapeHtml(s.edition)}</strong><p>Olá, ${escapeHtml(s.username || "Aluno")}!</p><small>${escapeHtml(s.deviceName || "PC-LAB")}</small><p>Instalação simulada concluída.</p></div>` : ""}
      <div class="wi-taskbar"><div class="wi-taskbar-main"><button type="button" data-action="start-menu" aria-label="Abrir menu Iniciar">${is11 ? desktopIcon("start") : brandMark("windows10")}</button><button type="button" data-action="desktop-info" aria-label="Pesquisar">${desktopIcon("search")}</button><button type="button" data-action="desktop-info" aria-label="Explorador de Arquivos">${desktopIcon("explorer")}</button><button type="button" data-action="desktop-info" aria-label="Configurações">${desktopIcon("settings")}</button></div><div class="wi-tray">◉ ▰ <time>${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div></div>
    </div>`;
  }

  scheduleAutoStep() {
    this.clearTimers();
    const step = this.state?.step;
    if (step === "boot" || step === "restart" || step === "updates" || step === "prepare") {
      const delay = { boot: 3000, restart: 4200, updates: 3000, prepare: 3900 }[step];
      this.timer = setTimeout(() => {
        if (this.active && this.state?.step === step) this.setStep(nextInstallerStep(this.state));
      }, delay);
    } else if (step === "progress") {
      this.progressTimer = setInterval(() => {
        if (!this.active || this.state?.step !== "progress") return this.clearTimers();
        const increment = this.state.progress < 15 ? 3 : this.state.progress < 75 ? 2 : 1;
        this.state.progress = Math.min(100, this.state.progress + increment);
        this.save();
        if (this.state.progress === 100) {
          this.clearTimers();
          this.timer = setTimeout(() => this.active && this.state?.step === "progress" && this.setStep("restart"), 1200);
        } else {
          // A mudança de fase altera somente a tela de progresso; o timer atual é preservado.
          const stage = this.root?.querySelector(".wi-stage");
          if (stage) stage.innerHTML = this.renderStage();
        }
      }, 800);
    }
  }

  onClick(event) {
    const control = event.target.closest("[data-action]");
    if (!control || !this.root?.contains(control)) return;
    const action = control.dataset.action;
    if (action === "start") return this.start(control.dataset.os);
    if (action === "exit") { window.location.hash = "#/"; return; }
    if (action === "fullscreen") {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else this.root.requestFullscreen?.().catch(() => this.feedback("O navegador não permitiu tela cheia."));
      return;
    }
    if (action === "reset") {
      this.clearTimers(); this.state = null; this.startMenuOpen = false; this.save();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      this.render(); return;
    }
    if (action === "restart") return this.start(this.state.os);
    if (action === "back") return this.setStep(previousInstallerStep(this.state));
    if (action === "skip-key") { this.state.productKeySkipped = true; return this.setStep("edition"); }
    if (action === "key-next") {
      const key = this.root.querySelector("#wi-product-key")?.value.trim().toUpperCase() || "";
      if (!/^([A-Z0-9]{5}-){4}[A-Z0-9]{5}$/.test(key)) return this.feedback("Use o formato fictício indicado ou selecione ‘Não tenho uma chave do produto’. ");
      this.state.productKeySkipped = false;
      return this.setStep("edition");
    }
    if (action === "upgrade") return this.feedback("Para atualizar, o instalador teria de ser iniciado dentro do Windows atual. Nesta atividade, escolha Personalizada.");
    if (action === "credential-next") {
      const value = this.root.querySelector("#wi-secret")?.value || "";
      const confirm = this.root.querySelector("#wi-secret-confirm")?.value || "";
      if (value.length < 4 || value !== confirm) return this.feedback("Digite pelo menos quatro caracteres fictícios iguais nos dois campos.");
      if (this.state.os === "windows11" && !/^\d{4,}$/.test(value)) return this.feedback("O PIN fictício deve conter apenas números.");
      return this.setStep(nextInstallerStep(this.state));
    }
    if (action === "security-next") {
      const answers = [...this.root.querySelectorAll(".wi-security-answer")].map((input) => input.value.trim());
      if (answers.length !== 3 || answers.some((answer) => !answer)) return this.feedback("Preencha as três respostas fictícias.");
      return this.setStep("privacy");
    }
    if (action === "start-menu") { this.startMenuOpen = !this.startMenuOpen; this.render(); return; }
    if (action === "desktop-info") return this.feedback("A instalação simulada terminou. Use o menu Iniciar para ver o perfil configurado.");
    if (action === "next" && this.state?.step === "account" && this.state.os === "windows11") {
      const email = this.root.querySelector('[data-field="accountEmail"]')?.value.trim().toLowerCase() || "";
      if (!/^[a-z0-9._+-]+@exemplo\.com$/.test(email)) return this.feedback("Use apenas um endereço fictício terminado em @exemplo.com.");
      this.state.accountEmail = email;
      this.save();
    }
    if (action === "next") this.next();
  }

  onChange(event) {
    if (!this.state) return;
    const target = event.target;
    if (target.name === "wi-edition") this.state.edition = target.value;
    else if (target.name === "wi-disk") this.state.diskId = target.value;
    else if (target.name === "wi-network") this.state.network = target.value;
    else if (target.name === "wi-purpose") this.state.purpose = target.value;
    else if (target.dataset.field === "licenseAccepted") this.state.licenseAccepted = target.checked;
    else if (target.dataset.privacy) this.state.privacy[target.dataset.privacy] = target.checked;
    else if (target.dataset.field === "language" || target.dataset.field === "region" || target.dataset.field === "keyboard") this.state[target.dataset.field] = target.value;
    else return;
    this.save();
    this.updateContinueButton();
    if (target.name === "wi-disk") {
      this.root.querySelectorAll(".wi-disk-row").forEach((row) => row.classList.toggle("is-selected", row.querySelector("input")?.checked));
    }
  }

  onInput(event) {
    if (!this.state) return;
    const field = event.target.dataset.field;
    if (!["deviceName", "username", "accountEmail"].includes(field)) return;
    if (field === "accountEmail") {
      const email = event.target.value.trim().toLowerCase();
      this.state.accountEmail = /^[a-z0-9._+-]+@exemplo\.com$/.test(email) ? email : "";
    } else this.state[field] = event.target.value;
    this.save();
    this.updateContinueButton();
  }

  updateContinueButton() {
    const button = this.root?.querySelector('[data-action="next"].wi-primary');
    if (button) button.disabled = !canAdvanceInstaller(this.state);
  }

  onKeydown(event) {
    if (event.key === "Escape" && this.state && !document.fullscreenElement) {
      // Esc fecha o modo de tela cheia do navegador; a saída do laboratório usa o botão próprio.
      return;
    }
    if (event.key === "Enter" && event.target.matches(".wi-field input") && this.state?.step === "device") {
      event.preventDefault();
      this.next();
    }
  }
}

export const windowsInstaller = new WindowsInstaller();
