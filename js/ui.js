/* ============================================================
 * ui.js — 界面层：对白、HUD、提示、任务日志
 * ============================================================ */

const UI = (() => {
  const el = (id) => document.getElementById(id);

  /* ---------------- 对白系统 ---------------- */
  const dlg = {
    box: null, nameEl: null, textEl: null,
    queue: [], onDone: null, active: false,
  };

  function initDialogue() {
    dlg.box = el('dialogue');
    dlg.nameEl = el('dialogue-name');
    dlg.textEl = el('dialogue-text');
  }

  // lines: [{name, text}], onDone 回调
  function showDialogue(lines, onDone) {
    dlg.queue = lines.slice();
    dlg.onDone = onDone || null;
    dlg.active = true;
    dlg.box.classList.remove('hidden');
    nextLine();
  }

  function nextLine() {
    if (dlg.queue.length === 0) {
      endDialogue();
      return;
    }
    const line = dlg.queue.shift();
    dlg.nameEl.textContent = line.name || '';
    dlg.nameEl.style.display = line.name ? 'block' : 'none';
    dlg.textEl.textContent = line.text;
  }

  function endDialogue() {
    dlg.active = false;
    dlg.box.classList.add('hidden');
    const cb = dlg.onDone;
    dlg.onDone = null;
    if (cb) cb();
  }

  function dialogueActive() { return dlg.active; }
  // 推进对白；返回 true 表示已消费这次输入
  function advanceDialogue() {
    if (!dlg.active) return false;
    nextLine();
    return true;
  }

  /* ---------------- HUD ---------------- */
  function setHp(hp, maxHp) {
    const pct = Math.max(0, hp) / maxHp * 100;
    el('hp-bar').style.width = pct + '%';
    el('hp-text').textContent = `${Math.max(0, hp)} / ${maxHp}`;
  }

  function setObjective(text) {
    el('quest-objective').textContent = text || '—';
  }

  /* ---------------- 提示气泡 ---------------- */
  let toastTimer = null;
  function toast(msg, ms = 1800) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    // 重启入场动画
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  /* ---------------- 任务日志面板 ---------------- */
  function renderQuestLog(quests) {
    const list = el('quest-log-list');
    list.innerHTML = '';
    quests.forEach((q) => {
      const li = document.createElement('li');
      li.className = q.state; // active / done / locked
      let status = '';
      if (q.state === 'done') status = '已完成';
      else if (q.state === 'active') status = q.progress || '进行中';
      else status = '未解锁';
      li.innerHTML = `<span class="status">${status}</span>${q.title}` +
                     (q.state !== 'locked' && q.desc ? `<br><small style="color:#9c93ab">${q.desc}</small>` : '');
      list.appendChild(li);
    });
  }

  function toggleQuestLog(quests) {
    const panel = el('quest-log');
    const willShow = panel.classList.contains('hidden');
    if (willShow) renderQuestLog(quests);
    panel.classList.toggle('hidden');
    return !panel.classList.contains('hidden');
  }
  function questLogOpen() { return !el('quest-log').classList.contains('hidden'); }

  return {
    initDialogue, showDialogue, dialogueActive, advanceDialogue,
    setHp, setObjective, toast,
    renderQuestLog, toggleQuestLog, questLogOpen,
  };
})();
