/* PC Admin & Performance Tool -- live demo
 * ui.js : the interface. A faithful clone of the Web-Service edition's page (templates/index.html):
 * same tabs, task rows, parameter fields, client-side validators, danger confirmation, log colours.
 * Everything is built with textContent (visitor-typed values are echoed into the log), never innerHTML. */
(function () {
  'use strict';
  var OPS = window.PCAT_OPS, CATS = window.PCAT_CATS, E = window.PCAT_ENGINE, P = window.PCAT_VPC;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function two(n) { return (n < 10 ? '0' : '') + n; }

  var DANGER = {}; OPS.forEach(function (o) { if (o.danger) DANGER[o.id] = 1; });
  var OPBY = {}; OPS.forEach(function (o) { OPBY[o.id] = o; });
  var selected = {}, paramValues = {}, openScript = {}, activeCat = 'all', running = false, runHistory = [];
  OPS.forEach(function (op) {
    if (op.params && op.params.length) { paramValues[op.id] = {}; op.params.forEach(function (p) { paramValues[op.id][p.key] = p.default || ''; }); }
  });

  /* ---- same validators as the real page (client-side mirror of app.py) ---- */
  var KIND_PATTERNS = {
    ipv4: /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/,
    subnetmask: /^([0-9]|[12][0-9]|3[0-2])$|^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/,
    computername: /^[A-Za-z0-9]([A-Za-z0-9-]{0,13}[A-Za-z0-9])?$/,
    adaptername: /^[A-Za-z0-9 ()./#_-]{1,64}$/,
    servicename: /^[A-Za-z0-9 _.$#+()-]{1,256}$/,
    taskname: /^[A-Za-z0-9 _.\\-]{1,200}$/,
    deviceid: /^[A-Za-z0-9\\&_{}-]{1,300}$/,
    drive: /^[A-Za-z]:?$/,
    uncpath: /^\\\\[A-Za-z0-9][A-Za-z0-9._-]{0,200}(?:\\(?!\.+(?:\\|$))[A-Za-z0-9 _.$#@&+(),~-]{1,80}){1,30}$/,
    mapdrive: /^[D-Zd-z]:?$/,
    vsssize: /^(UNBOUNDED|\d{1,3}%|\d{1,9}(KB|MB|GB|TB|PB|EB))$/i,
    useraccount: /^(?:(?:\.|[A-Za-z0-9][A-Za-z0-9._-]{0,62})\\)?[A-Za-z0-9_.-][A-Za-z0-9 _.-]{0,63}$|^[A-Za-z0-9._-]{1,64}@[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/
  };
  var KIND_HINTS = {
    ipv4: 'a dotted IPv4 address, e.g. 192.168.1.100', subnetmask: 'a dotted mask such as 255.255.255.0, or a CIDR number 0-32',
    computername: '1-15 letters, digits or hyphens (no leading/trailing hyphen)', adaptername: 'letters, digits, spaces and ( ) . / # _ -',
    servicename: 'the exact service Name: letters, digits, spaces and _ . - $ # + ( ) (max 256 chars)', taskname: 'letters, digits, spaces and _ . - \\',
    deviceid: 'a PNP Instance ID copied exactly from a device list', drive: 'one drive letter, e.g. C',
    uncpath: 'a UNC path such as \\\\server\\share or \\\\server\\share\\folder (backslashes)', mapdrive: 'a drive letter D to Z (A, B and C are reserved)',
    useraccount: 'DOMAIN\\user, user@domain.com or .\\localuser', vsssize: 'a size such as 10%, 20GB, 51200MB or UNBOUNDED (a unit is required)'
  };
  function clientValid(kind, raw) {
    var pat = KIND_PATTERNS[kind]; if (!pat) return true;
    var s = raw.trim(); if (kind === 'uncpath') { s = s.replace(/\\+$/, ''); if (s.length > 260) return false; }
    return pat.test(s);
  }

  /* ---- modal (replaces alert/confirm) ---- */
  function modal(title, body, buttons) {
    return new Promise(function (resolve) {
      var ov = el('div', 'ov'), d = el('div', 'dlg'), prev = document.activeElement;
      d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
      d.appendChild(el('h4', '', title)); d.appendChild(el('pre', '', body));
      var row = el('div', 'btns');
      function done(v) { document.removeEventListener('keydown', key); ov.remove(); if (prev && prev.focus) prev.focus(); resolve(v); }
      function key(e) { if (e.key === 'Escape') done(false); }
      buttons.forEach(function (b, i) {
        var bt = el('button', b.cls, b.label); bt.type = 'button'; bt.onclick = function () { done(b.value); }; row.appendChild(bt);
        if (i === buttons.length - 1) setTimeout(function () { bt.focus(); }, 0);
      });
      d.appendChild(row); ov.appendChild(d); document.body.appendChild(ov); document.addEventListener('keydown', key);
    });
  }
  function alertBox(title, body) { return modal(title, body, [{ label: 'OK', cls: 'btn-primary', value: true }]); }

  /* ---- tabs + task list ---- */
  function buildTabs() {
    var tabs = $('tabs'); tabs.textContent = '';
    var keys = [['all', 'All'], ['sel', 'Selected']].concat(CATS.map(function (c) { return [c, c]; }));
    keys.forEach(function (k) {
      var b = el('button', k[0] === activeCat ? 'active' : '', k[1]); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.key = k[0];
      b.onclick = function () { activeCat = k[0]; renderTasks(); }; tabs.appendChild(b);
    });
  }
  function selCount() { return Object.keys(selected).length; }
  function renderTasks() {
    Array.prototype.forEach.call($('tabs').children, function (b) {
      var on = b.dataset.key === activeCat; b.className = on ? 'active' : ''; b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (b.dataset.key === 'sel') b.textContent = 'Selected (' + selCount() + ')';
    });
    var list = $('tasklist'), top = list.scrollTop; list.textContent = '';
    var shown = OPS.filter(function (o) { return activeCat === 'all' ? true : activeCat === 'sel' ? !!selected[o.id] : o.category === activeCat; });
    if (!shown.length) list.appendChild(el('div', 'hint', 'Nothing selected yet - tick a few tasks, or use a scenario above.'));
    shown.forEach(function (op) {
      var danger = !!DANGER[op.id], row = el('div', 'task' + (selected[op.id] ? ' checked' : '') + (danger ? ' danger' : ''));
      row.appendChild(el('div', 'cbx'));
      var info = el('div', 'info'); info.appendChild(el('div', 'lbl', (danger ? '! ' : '') + op.label)); info.appendChild(el('div', 'desc', op.description));
      row.appendChild(info); row.appendChild(el('div', 'cat', op.category));
      row.onclick = function () { if (selected[op.id]) delete selected[op.id]; else selected[op.id] = 1; renderTasks(); updateCount(); };
      var src = el('div', 'src'), sb = el('button', '', openScript[op.id] ? 'hide PowerShell' : '</> PowerShell'); sb.type = 'button';
      sb.onclick = function (e) { e.stopPropagation(); openScript[op.id] = !openScript[op.id]; renderTasks(); };
      src.appendChild(sb); row.appendChild(src);
      if (openScript[op.id]) {
        row.appendChild(el('div', 'scriptnote', 'The real script the tool sends to the target (read-only here - never executed):'));
        var pre = el('pre', 'script', op.command); pre.onclick = function (e) { e.stopPropagation(); }; row.appendChild(pre);
      }
      if (op.params && op.params.length) {
        var pdiv = el('div', 'params'); pdiv.onclick = function (e) { e.stopPropagation(); };
        op.params.forEach(function (p) {
          var wrap = el('div', 'pf' + ((op.params.length === 1 || p.wide) ? ' wide' : ''));
          if (p.kind === 'bool') {
            wrap.className = 'pf wide pf-bool';
            var l2 = el('label', 'chk-label'), chk = el('input'); chk.type = 'checkbox';
            chk.checked = (paramValues[op.id][p.key] || 'true') !== 'false';
            chk.onchange = function () { paramValues[op.id][p.key] = chk.checked ? 'true' : 'false'; };
            l2.appendChild(chk); l2.appendChild(el('span', '', p.label)); wrap.appendChild(l2);
            if (p.help) wrap.appendChild(el('div', 'chk-help', p.help));
            pdiv.appendChild(wrap); return;
          }
          var lbl = el('label', '', p.label + (p.required === false ? ' (optional)' : '')), inp = el('input');
          inp.type = 'text'; inp.value = paramValues[op.id][p.key] || ''; inp.placeholder = p.help || p.default || '';
          inp.title = KIND_HINTS[p.kind] || ''; inp.autocomplete = 'off'; inp.spellcheck = false;
          inp.setAttribute('aria-label', p.label);
          inp.oninput = function () {
            paramValues[op.id][p.key] = inp.value; var raw = inp.value.trim();
            var ok = raw === '' ? (p.required === false) : clientValid(p.kind, raw); inp.classList.toggle('invalid', !ok);
          };
          wrap.appendChild(lbl); wrap.appendChild(inp); pdiv.appendChild(wrap);
        });
        row.appendChild(pdiv);
      }
      list.appendChild(row);
    });
    list.scrollTop = top;
  }
  function updateCount() { var n = selCount(); $('count').textContent = n + ' task' + (n !== 1 ? 's' : '') + ' selected'; var t = $('tabs').querySelector('[data-key="sel"]'); if (t) t.textContent = 'Selected (' + n + ')'; }

  /* ---- log ---- */
  var logEl, lineCount = 0, MAXLINES = 2500;
  function tagFor(type) {
    var m = { header: 'hdr', info: 'info', dim: 'dim', success: 'ok', error: 'err', warning: 'warn', task_start: 'task', output: 'out' };
    return m[type] || type;
  }
  function logLine(tag, text) {
    var near = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 40;
    var d = el('div', 'l-' + tag, text); logEl.appendChild(d); lineCount++;
    while (lineCount > MAXLINES) { logEl.removeChild(logEl.firstChild); lineCount--; }
    if (near) logEl.scrollTop = logEl.scrollHeight;
  }
  function logClear() { logEl.textContent = ''; lineCount = 0; }
  function welcome() {
    logClear();
    var w = el('div', 'welcome', 'Ready. This is a demo: the target is a virtual Windows PC (DEMO-PC01).\nTick tasks on the left (or pick a scenario above) and press RUN SELECTED TASKS.');
    logEl.appendChild(w);
  }

  function handleEvent(ev) {
    if (ev.type === 'progress') { $('prg').value = ev.value; return; }
    if (ev.type === 'task_start') { $('taskline').textContent = ev.text; $('stat').textContent = '[' + (ev.idx + 1) + '/' + ev.total + '] ' + ev.label; logLine('task', ev.text); return; }
    if (ev.type === 'blank') { logLine('dim', ''); return; }
    if (ev.type === 'done') { $('stat').textContent = ev.success ? 'All tasks completed -- log saved' : 'Stopped / completed with errors -- review log'; $('taskline').textContent = ''; return; }
    logLine(tagFor(ev.type), ev.text || '');
  }

  /* ---- virtual PC panel ---- */
  function fmtUp(s) { var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d + 'd ' + h + 'h ' + m + 'm'; }
  function refreshVpc() {
    var v = P.get(), a = P.adapter('Ethernet'), live = P.liveIp(), V = P.V;
    $('vName').textContent = v.name + (v.pendingName ? ' (renaming to ' + v.pendingName + ')' : '') + (v.domainJoined ? ' - ' + v.domain : '');
    $('vNet').textContent = a.ip ? a.ip + ' /' + P.maskToPrefix(a.mask) + (a.dhcp ? ' (DHCP)' : ' (static)') : 'no address';
    var lk = $('vLink');
    if (V.t < v.offlineUntil) { lk.textContent = 'RESTARTING (back in ' + Math.ceil(v.offlineUntil - V.t) + ' s)'; lk.className = 'warn'; }
    else if (!live) { lk.textContent = 'DOWN (link flap)'; lk.className = 'down'; }
    else { lk.textContent = 'UP at ' + live; lk.className = 'up'; }
    var dn = P.dnsIp(); $('vDns').textContent = v.name.toLowerCase() + ' -> ' + dn + (dn !== live && live ? '  (stale)' : '');
    $('vUp').textContent = fmtUp(P.uptimeSeconds());
    var cd = new Date(Date.now() + V.t * 1000); $('vClock').textContent = two(cd.getHours()) + ':' + two(cd.getMinutes()) + ':' + two(cd.getSeconds());
    $('hintHost').textContent = live || (a.ip || '-'); $('hintName').textContent = v.name;
    var run = v.services.filter(function (s) { return s.s === 'Running'; }).length, dr = [];
    Object.keys(v.drives).forEach(function (u) { Object.keys(v.drives[u]).forEach(function (l) { dr.push(u + ' ' + l + ': ' + v.drives[u][l]); }); });
    $('vDetail').textContent = 'Adapter     : Ethernet  ' + (a.ip || '-') + '  mask ' + (a.mask || '-') + '  gw ' + (a.gw || '-') + '  dns ' + (a.dns.join(', ') || '-') +
      '\nServices    : ' + run + ' running / ' + v.services.length + ' total\nVSS (C:)    : ' + v.vss.C.copies + ' shadow copies, ' + v.vss.C.used.toFixed(1) + ' GB used, max ' + v.vss.C.max +
      '\nMapped drv  : ' + (dr.length ? dr.join('; ') : 'none') + '\nDisk type   : ' + (v.ssd ? 'SSD' : 'HDD') + '\nThe state above changes when you run tasks that change things.';
  }

  /* ---- run ---- */
  function collect() {
    var issues = [], params = {}, ids = Object.keys(selected);
    ids.forEach(function (id) {
      var op = OPBY[id]; if (!op.params || !op.params.length) return; params[id] = {};
      op.params.forEach(function (p) {
        var raw = (paramValues[id][p.key] || '').trim(); if (!raw && p.default) raw = p.default;
        if (!raw) { if (p.required !== false) issues.push(op.label + ' -> ' + p.label + ' is required'); params[id][p.key] = ''; return; }
        if (p.kind !== 'bool' && !clientValid(p.kind, raw)) issues.push(op.label + ' -> ' + p.label + ': "' + raw + '" is not valid -- expected ' + (KIND_HINTS[p.kind] || 'a different format'));
        params[id][p.key] = raw;
      });
    });
    return { issues: issues, params: params, ids: ids };
  }
  function setRunning(on) {
    running = on; $('btnRun').disabled = on; $('btnStop').disabled = !on; $('dot').className = on ? 'dot live' : 'dot';
  }
  function runTasks() {
    if (running) return;
    var host = $('hostname').value.trim(), user = $('username').value.trim(), transport = $('transport').value;
    if (!selCount()) { alertBox('Nothing to run', 'Select at least one task.'); return; }
    if (!host) { alertBox('Missing target', 'Enter hostname or IP.'); return; }
    if (!user) { alertBox('Missing credentials', 'Enter credentials.'); return; }
    var c = collect();
    if (c.issues.length) { alertBox('Fix these before running', c.issues.map(function (s) { return '  * ' + s; }).join('\n')); return; }
    var dng = c.ids.filter(function (id) { return DANGER[id]; });
    var go = dng.length ? modal('Confirm sensitive tasks', 'WARNING: ' + dng.length + ' sensitive op(s):\n\n' + dng.map(function (id) { return '  * ' + OPBY[id].label; }).join('\n') +
      '\n\nSome require reboots or may interrupt network.\n(Demo: nothing real is touched.)\n\nContinue?',
      [{ label: 'Cancel', cls: 'btn-ghost', value: false }, { label: 'Continue', cls: 'btn-run', value: true }]) : Promise.resolve(true);
    go.then(function (yes) {
      if (!yes) return;
      setRunning(true); logClear(); $('prg').value = 0; $('stat').textContent = 'Starting...';
      var started = new Date(), before = lineCount;
      E.run({ host: host, user: user, transport: transport, tasks: c.ids, params: c.params }).then(function () {
        setRunning(false); refreshVpc();
        var n = new Date(); runHistory.unshift({ name: 'run_' + n.getFullYear() + two(n.getMonth() + 1) + two(n.getDate()) + '_' + two(started.getHours()) + two(started.getMinutes()) + two(started.getSeconds()) + '.log', lines: lineCount, tasks: c.ids.length, at: n.toLocaleTimeString() });
        if (!$('logsPanel').classList.contains('hidden')) renderLogs();
      });
    });
  }
  function renderLogs() {
    var p = $('logsPanel'); p.textContent = ''; p.appendChild(el('h4', '', 'Recent Logs (this browser session only)'));
    if (!runHistory.length) p.appendChild(el('div', 'hint', 'No logs yet - run something first. (The real tool saves these on the host machine.)'));
    runHistory.slice(0, 20).forEach(function (r) { p.appendChild(el('div', '', r.name + ' · ' + r.tasks + ' task(s) · ' + r.lines + ' lines · ' + r.at)); });
  }

  /* ---- scenarios ---- */
  var SCEN = [
    { t: 'Quick clean-up', d: 'Temp files, browser cache, recycle bin, then a disk report.', sel: ['clear_user_temp', 'clear_windows_temp', 'clear_browser_cache', 'empty_recycle_bin', 'disk_space_report'] },
    { t: 'Health check', d: 'System info, top processes, recent errors, network and connectivity.', sel: ['system_info', 'top_processes', 'recent_errors', 'net_ip_config', 'net_connectivity'] },
    { t: 'Change IP safely: Push + Ping', d: 'Push a new static IP without waiting, then watch old IP, new IP and DNS live. Press STOP when done.',
      sel: ['np_static_ip', 'np_ping_host'], params: { np_static_ip: { ADAPTER: 'Ethernet', IP: '192.168.1.75', MASK: '255.255.255.0', GATEWAY: '192.168.1.1', DNS1: '192.168.1.10', DNS2: '8.8.8.8' }, np_ping_host: { WATCH_IP1: '192.168.1.75', WATCH_IP2: '192.168.1.50' } }, host: 'name' },
    { t: 'Change IP inline + reconnect', d: 'Connection drops (expected), the tool reconnects on the NEW IP and prints the status.', sel: ['rt_set_static_ip'],
      params: { rt_set_static_ip: { ADAPTER: 'Ethernet', IP: '192.168.1.60', MASK: '24', GATEWAY: '192.168.1.1', DNS1: '192.168.1.10', DNS2: '' } }, host: 'name' },
    { t: 'Rename PC + restart', d: 'Domain-joined rename, auto restart, remaining tasks skipped while it reboots.', sel: ['system_info', 'rt_rename_pc_domain', 'run_dism_restorehealth'], params: { rt_rename_pc_domain: { NEW_NAME: 'FINANCE-PC07', AUTO_RESTART: 'true' } } },
    { t: 'Map a network drive', d: 'Map Z: for a user, then list that user\'s mapped drives.', sel: ['rt_map_network_drive', 'rt_list_mapped_drives'],
      params: { rt_map_network_drive: { SHARE_PATH: '\\\\fs01\\shared', DRIVE_LETTER: 'Z', USER_ACCOUNT: 'CORP\\demo.user', APPLY_NOW: 'true', REPLACE_EXISTING: 'false' }, rt_list_mapped_drives: {} } },
    { t: 'Shadow copies (VSS)', d: 'View, delete the oldest, resize storage to 20GB, view again.', sel: ['rt_vss_view', 'rt_vss_delete_oldest', 'rt_vss_resize_storage'], params: { rt_vss_delete_oldest: { VOLUME: 'C' }, rt_vss_resize_storage: { VOLUME: 'C', MAXSIZE: '20GB' } } },
    { t: 'Long jobs: SFC, DISM, CHKDSK', d: 'See the detached engine with "still running" lines.', sel: ['run_sfc', 'run_dism_restorehealth', 'chkdsk_online_scan'], params: { chkdsk_online_scan: { VOLUME: 'C' } } }
  ];
  function applyScenario(s) {
    if (running) { alertBox('A run is in progress', 'Press STOP (or wait for it to finish) before starting another scenario.'); return; }
    P.reset(); selected = {}; Object.keys(paramValues).forEach(function (id) { OPBY[id].params.forEach(function (p) { paramValues[id][p.key] = p.default || ''; }); });
    s.sel.forEach(function (id) { selected[id] = 1; });
    if (s.params) Object.keys(s.params).forEach(function (id) { Object.keys(s.params[id]).forEach(function (k) { paramValues[id][k] = s.params[id][k]; }); });
    $('hostname').value = s.host === 'name' ? P.get().name : '192.168.1.50';
    activeCat = 'sel'; renderTasks(); updateCount(); refreshVpc(); welcome();
    logLine('info', 'Scenario loaded: ' + s.t + ' (virtual PC reset to defaults). Press RUN SELECTED TASKS.');
    $('app').scrollIntoView({ block: 'start' });
  }
  function buildScenarios() {
    var box = $('scen');
    SCEN.forEach(function (s) { var b = el('button'); b.type = 'button'; b.appendChild(el('b', '', s.t)); b.appendChild(el('span', '', s.d)); b.onclick = function () { applyScenario(s); }; box.appendChild(b); });
  }

  /* ---- init ---- */
  function init() {
    logEl = $('log');
    var dn = Object.keys(DANGER).length; $('statDanger').textContent = dn; $('statOps').textContent = OPS.length; $('statOps2').textContent = OPS.length; $('statCats').textContent = CATS.length;
    var tb = $('catTable').querySelector('tbody');
    CATS.forEach(function (c) {
      var ops = OPS.filter(function (o) { return o.category === c; }), tr = el('tr');
      tr.appendChild(el('td', '', c)); tr.appendChild(el('td', '', String(ops.length)));
      tr.appendChild(el('td', '', ops.slice(0, 3).map(function (o) { return o.label; }).join(' · ')));
      tb.appendChild(tr);
    });
    $('username').value = 'CORP\\admin'; $('password').value = 'demo'; $('hostname').value = '192.168.1.50';
    $('showpw').onchange = function () { $('password').type = this.checked ? 'text' : 'password'; };
    $('btnTest').onclick = function () {
      var host = $('hostname').value.trim(), user = $('username').value.trim();
      if (!host) { alertBox('Test Connection', 'Enter hostname or IP.'); return; }
      if (!user) { alertBox('Test Connection', 'Enter credentials.'); return; }
      var b = $('btnTest'); b.disabled = true; b.textContent = 'Testing...';
      E.testConnection(host, user, $('password').value, $('transport').value).then(function (r) {
        logLine(r.status === 'success' ? 'ok' : 'err', '  ' + r.msg); alertBox('Test Connection', r.msg); b.disabled = false; b.textContent = 'Test Connection'; refreshVpc();
      });
    };
    $('btnAll').onclick = function () { OPS.filter(function (o) { return activeCat === 'all' || (activeCat === 'sel' ? true : o.category === activeCat); }).forEach(function (o) { selected[o.id] = 1; }); renderTasks(); updateCount(); };
    $('btnNone').onclick = function () { selected = {}; renderTasks(); updateCount(); };
    $('btnRun').onclick = runTasks;
    $('btnStop').onclick = function () { E.stop(); logLine('warn', '  ! STOP requested -- finishing current task...'); };
    $('btnLogs').onclick = function () { var p = $('logsPanel'); p.classList.toggle('hidden'); if (!p.classList.contains('hidden')) renderLogs(); };
    $('btnClearLog').onclick = function () { if (!running) welcome(); };
    $('btnCopy').onclick = function () {
      var t = Array.prototype.map.call(logEl.children, function (n) { return n.textContent; }).join('\n');
      var b = $('btnCopy'); function f(m) { b.textContent = m; setTimeout(function () { b.textContent = 'Copy log'; }, 1500); }
      try { navigator.clipboard.writeText(t).then(function () { f('Copied'); }, function () { f('Not allowed'); }); } catch (e) { f('Not allowed'); }
    };
    $('speed').onchange = function () { E.setSpeed(this.value); };
    $('btnReset').onclick = function () { if (running) return; P.reset(); refreshVpc(); logLine('info', 'Virtual PC reset to defaults (DEMO-PC01 at 192.168.1.50).'); };
    E.hooks.onEvent = handleEvent; E.hooks.onTick = refreshVpc;
    buildScenarios(); buildTabs(); renderTasks(); updateCount(); refreshVpc(); welcome();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
