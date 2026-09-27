import test from "node:test";
import assert from "node:assert/strict";
import {
  VIRTUAL_DISKS,
  EDITIONS,
  INSTALLER_STEPS,
  createInstallerState,
  restoreInstallerState,
  nextInstallerStep,
  canAdvanceInstaller,
  selectedVirtualDisk
} from "../js/windows-installer-core.mjs";

test("os dois sistemas têm etapas completas e desktops separados", () => {
  for (const os of ["windows10", "windows11"]) {
    const state = createInstallerState(os);
    assert.equal(state.step, "boot");
    assert.equal(INSTALLER_STEPS[os][0], "boot");
    assert.equal(INSTALLER_STEPS[os].at(-1), "desktop");
    for (const step of ["language", "key", "edition", "license", "type", "disk", "progress", "restart", "network", "account", "credential", "privacy"]) {
      assert.ok(INSTALLER_STEPS[os].includes(step), `${os} sem ${step}`);
    }
  }
  assert.ok(INSTALLER_STEPS.windows10.includes("security"));
  assert.ok(INSTALLER_STEPS.windows11.includes("device"));
  assert.ok(INSTALLER_STEPS.windows11.includes("updates"));
  assert.deepEqual(EDITIONS, ["Home", "Pro", "Education"]);
});

test("licença e HD precisam ser escolhidos antes de avançar", () => {
  const state = createInstallerState("windows11");
  state.step = "license";
  assert.equal(canAdvanceInstaller(state), false);
  state.licenseAccepted = true;
  assert.equal(canAdvanceInstaller(state), true);
  state.step = "disk";
  assert.equal(canAdvanceInstaller(state), false);
  assert.equal(VIRTUAL_DISKS.length, 2);
  for (const disk of VIRTUAL_DISKS) {
    state.diskId = disk.id;
    assert.equal(canAdvanceInstaller(state), true);
    assert.equal(selectedVirtualDisk(state), disk);
  }
  state.diskId = "disco-inexistente";
  assert.equal(canAdvanceInstaller(state), false);
});

test("estado retomado preserva seleção e elimina credenciais", () => {
  const state = createInstallerState("windows10");
  Object.assign(state, {
    step: "desktop", edition: "Education", diskId: "disk1", username: "Aluno",
    password: "segredo", pin: "1234", securityAnswers: ["a", "b", "c"],
    completed: true
  });
  const restored = restoreInstallerState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.step, "desktop");
  assert.equal(restored.edition, "Education");
  assert.equal(restored.diskId, "disk1");
  assert.equal(restored.username, "Aluno");
  assert.equal(restored.completed, true);
  assert.equal("password" in restored, false);
  assert.equal("pin" in restored, false);
  assert.equal("securityAnswers" in restored, false);
});

test("e-mail fora do domínio fictício não é retomado", () => {
  const state = createInstallerState("windows11");
  state.accountEmail = "pessoa@exemplo-real.com";
  assert.equal(restoreInstallerState(state).accountEmail, "");
  state.accountEmail = "aluno@exemplo.com";
  assert.equal(restoreInstallerState(state).accountEmail, "aluno@exemplo.com");
});

test("a instalação chega à configuração inicial depois do progresso e reinício", () => {
  const state = createInstallerState("windows11");
  state.step = "disk";
  state.diskId = "disk0";
  assert.equal(nextInstallerStep(state), "progress");
  state.step = "progress";
  assert.equal(nextInstallerStep(state), "restart");
  state.step = "restart";
  assert.equal(nextInstallerStep(state), "region");
});
