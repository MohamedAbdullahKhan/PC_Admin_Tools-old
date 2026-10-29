/* PC Admin & Performance Tool -- live demo
 * engine.js : the run loop. It mirrors how the real tool runs a batch (see app.py / the Web edition):
 *   connect -> run the ticked tasks IN LIST ORDER -> tag every output line by keyword -> footer.
 * It also reproduces the special flows: inline network changes (connection drop -> expected message ->
 * reconnect on the old host AND the new IP -> status block), Network Push (send, 8 s grace, "pushed"),
 * Ping Host (continuous monitor, no login), reboot-class tasks, and long tasks (detached engine).
 * Time is VIRTUAL (V.t): a 3-minute SFC scan takes seconds of real time. Nothing touches a network. */
(function () {
  'use strict';
  var P = window.PCAT_VPC, V = P.V, O = window.PCAT_OUT, G = O.G, OPS = window.PCAT_OPS;
  var OPMAP = {}, ORDER = {};
  OPS.forEach(function (o, i) { OPMAP[o.id] = o; ORDER[o.id] = i; });

  var SPEED = { slow: { k: 0.25, cap: 2200, ping: 1500 }, normal: { k: 0.06, cap: 800, ping: 650 }, fast: { k: 0.012, cap: 160, ping: 150 } };
  var S = { speed: 'normal', stop: false, running: false };
  var hooks = { onEvent: function () {}, onTick: function () {} };
  var LOCAL = {}; O.consoleIds.forEach(function (i) { LOCAL[i] = 1; });
  var PUSH_MSG = { np_static_ip: 'Static IP set cmd pushed to the target machine', np_dhcp: 'DHCP set cmd pushed to the target machine',
    np_flush_dns: 'Flush DNS cmd pushed to the target machine', np_reset_tcpip: 'Reset TCP/IP & Winsock cmd pushed to the target machine' };
  var PUSH_DROPS = { np_static_ip: 1, np_dhcp: 1, np_reset_tcpip: 1 };
  var HINT_LOCAL = 'Admin Consoles run on YOUR admin PC';

  function emit(type, text, extra) { var ev = { type: type, text: text || '' }; if (extra) for (var k in extra) ev[k] = extra[k]; hooks.onEvent(ev); }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDur(s) { s = Math.round(s); return s >= 60 ? Math.floor(s / 60) + 'm ' + two(s % 60) + 's' : s + 's'; }

  function sleepReal(ms) {
    return new Promise(function (res) {
      var end = Date.now() + ms;
      (function tick() { if (S.stop || Date.now() >= end) return res(); setTimeout(tick, Math.max(1, Math.min(40, end - Date.now()))); })();
    });
  }
  /** Advance the virtual clock by `sec`; wait a scaled, capped real time so the log "plays". */
  function vsleep(sec, ping) {
    V.t += sec;
    var sp = SPEED[S.speed] || SPEED.normal;
    return sleepReal(ping ? sp.ping : Math.min(sec * 1000 * sp.k, sp.cap)).then(function () { hooks.onTick(); });
  }

  /** Same keyword auto-tagging the real tool applies to every output line. */
  function tagFor(text) {
    var l = text.toLowerCase();
    if (/\b(error|fail(ed|ure)?|denied|exception)\b/.test(l)) return 'error';
    if (/\b(warn(ing)?|skip(ped)?|not found|empty|already|none|cannot)\b|⚠/.test(l)) return 'warning';
    if (/\b(freed|cleared|complete(d)?|restarted|ok|pass(ed)?|removed|deleted|verified|success(fully)?)\b|✓/.test(l)) return 'success';
    return 'output';
  }
  function emitLines(lines) { lines.forEach(function (l) { emit(tagFor(l), '  ' + l); }); }

  function clock(startWall, startV) { var d = new Date(startWall + (V.t - startV) * 1000); return two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()); }

  /* ───────── connection ───────── */
  function connectCheck(host, transport) {
    var v = P.get();
    if (transport === 'kerberos' && P.isIpv4(host)) return { ok: false, msg: 'Kerberos needs a host NAME (it builds a service principal name), not an IP address. Use the computer name, or pick the NTLM transport.' };
    if (!P.isIpv4(host) && !P.isMyName(host)) return { ok: false, msg: 'Could not resolve "' + host + '" (DNS: no such host). In this demo use the IP ' + (P.liveIp() || P.get().adapters[0].ip) + ' or the name ' + v.name + '.' };
    if (V.t < v.offlineUntil) return { ok: false, msg: 'Connection to ' + host + ' timed out on port 5985: the target is restarting (back in about ' + Math.ceil(v.offlineUntil - V.t) + ' s).' };
    if (!P.answers(host, V.t)) {
      var live = P.liveIp(), res = P.isIpv4(host) ? null : P.resolve(host, V.t), hint = '';
      if (!live) hint = ' The target has no network link right now.';
      else if (res && res !== live) hint = ' Hint: the name still resolves to ' + res + ' (DNS has not updated yet) but the PC is now at ' + live + ' -- connect by IP ' + live + '.';
      else if (P.isIpv4(host)) hint = ' Hint: nothing answers at ' + host + '; the PC is at ' + live + '.';
      return { ok: false, msg: 'Connection to ' + host + ' timed out on port 5985 (WinRM).' + hint };
    }
    return { ok: true, msg: 'Connected to ' + host + ' (WinRM, ' + (transport || 'ntlm').toUpperCase() + ') -- target computer name: ' + v.name };
  }
  function testConnection(host, user, pass, transport) {
    return vsleep(1.2).then(function () { var r = connectCheck(host, transport); return { status: r.ok ? 'success' : 'error', msg: r.msg }; });
  }

  function statusBlock() {
    var out = ['=== TARGET STATUS AFTER RECONNECT ==='], any = false;
    P.get().adapters.forEach(function (a) {
      if (a.status !== 'Up' || !a.ip) return; any = true;
      out.push('Adapter      : ' + a.name, 'IPv4 Address : ' + a.ip + '  (/' + P.maskToPrefix(a.mask) + ')', 'Gateway      : ' + (a.gw || ''), 'DNS Servers  : ' + (a.dns.join(', ') || '(none)'), 'Mode         : ' + (a.dhcp ? 'DHCP' : 'Static'));
    });
    if (!any) out.push('No active IPv4 adapter');
    return out;
  }

  /** Inline network change: connection drops (expected), reconnect on the old host AND the new IP, never retry the change. */
  function inlineDrop(res, ctx, st) {
    var oldHost = ctx.host, cands = [oldHost], out = res.out, idx = -1, i;
    if (res.net.newIp && cands.indexOf(res.net.newIp) < 0) cands.push(res.net.newIp);
    for (i = 0; i < out.length; i++) if (/^(VERIFIED|=== RESULTING)/.test(out[i])) { idx = i; break; }
    var pre = idx >= 0 ? out.slice(0, idx) : out, post = idx >= 0 ? out.slice(idx) : statusBlock();
    emitLines(pre);
    return vsleep(2.5).then(function () {
      emit('warning', '  ! Connection to the target dropped -- this is EXPECTED: the network setting changed under the session. The change is NOT repeated.');
      emit('info', '  Reconnecting on ' + oldHost + (cands.length > 1 ? ' and on the NEW IP ' + cands[1] : '') + ' (up to 10 attempts)...');
      var n = 0;
      function attempt() {
        if (S.stop) return Promise.resolve(false);
        n++;
        return vsleep(3).then(function () {
          var hit = null; cands.forEach(function (h) { if (!hit && P.answers(h, V.t)) hit = h; });
          if (hit) {
            emit('success', '  Reconnected via ' + hit + ' (attempt ' + n + ' of 10)');
            if (hit !== oldHost) emit('info', '  Continuing the run on the new address ' + hit);
            ctx.host = hit; return true;
          }
          emit('dim', '  attempt ' + n + ' of 10: no answer from ' + cands.join(' / ') + ' yet...');
          return n >= 10 ? false : attempt();
        });
      }
      return attempt().then(function (okc) {
        if (!okc) {
          emit('warning', '  Could not reconnect after 10 attempts. The change WAS applied on the target; later tasks that need a connection are skipped.');
          emit('warning', "  Use 'Ping Host' (Network Push) to see when it is back and on which IP.");
          st.linkDropped = true; return;
        }
        emitLines(post);
      });
    });
  }

  function runPing(ctx, st) {
    var p = ctx.p, v = P.get(), typed = ctx.hostTyped, watch = [p.WATCH_IP1, p.WATCH_IP2].filter(function (x) { return x && x.trim(); }).map(function (x) { return x.trim(); });
    var isName = !P.isIpv4(typed), startWall = Date.now(), startV = V.t, round = 0, prevSig = null, quiet = 0, MAX = 6 * 3600;
    var shown = [typed].concat(isName ? ['(its DNS answer)'] : []); watch.forEach(function (w) { if (shown.indexOf(w) < 0) shown.push(w); });
    emit('info', '  Ping Host (no WinRM login needed): watching ' + shown.join(', ') + ' every ~2 s.');
    emit('info', '  Press STOP to end the monitor (it also ends by itself after 6 hours). It prints every CHANGE and which IP is LIVE.');
    function round1() {
      if (S.stop || V.t - startV > MAX) {
        emit('warning', S.stop ? '  Ping monitor stopped by you after ' + round + ' round(s) (' + fmtDur(V.t - startV) + ').' : '  Ping monitor ended after 6 hours.');
        return Promise.resolve();
      }
      round++;
      var t = V.t, ips = [], parts = [], resolved = null, sig = [];
      if (isName) {
        resolved = P.resolve(typed, t);
        parts.push(resolved ? typed + ' resolves to ' + resolved : typed + ' does NOT resolve (no DNS answer)');
        sig.push('dns=' + resolved);
        if (resolved) ips.push(resolved);
      } else ips.push(typed);
      watch.forEach(function (w) { if (ips.indexOf(w) < 0) ips.push(w); });
      var live = [];
      ips.forEach(function (ip) {
        var up = P.liveIp(t) === ip;
        if (up) live.push(ip);
        parts.push(ip + ': ' + (up ? 'PING OK ' + (1 + Math.floor(Math.random() * 3)) + 'ms TTL=128, WinRM port open' : 'NO REPLY'));
        sig.push(ip + '=' + up);
      });
      var sigS = sig.join('|'), changed = prevSig !== null && sigS !== prevSig, first = prevSig === null;
      var tag = first ? '[START ] ' : changed ? '[CHANGE ] ' : '[       ] ';
      var line = '  [' + clock(startWall, startV) + '] #' + round + ' ' + tag + parts.join(' | ');
      emit(changed ? (live.length ? 'success' : 'warning') : (live.length ? 'output' : 'error'), line);
      if (first || changed) emit(live.length ? 'success' : 'warning', '      LIVE IP now: ' + (live.length ? live.join(', ') : 'none answering' + (P.liveIp(t) ? ' (the PC is up on an IP you are not watching -- add the NEW IP in "Also watch this IP")' : '')));
      if (changed || first) quiet = 0; else quiet++;
      if (quiet && quiet % 5 === 0) emit('dim', '  ... still monitoring (round ' + round + ', no change in the last 5 rounds)');
      prevSig = sigS;
      return vsleep(2, true).then(round1);
    }
    return round1();
  }

  /* ───────── one task ───────── */
  function runTask(id, ctx, st) {
    var op = OPMAP[id], isLocal = !!LOCAL[id], isPing = id === 'np_ping_host';
    if (isPing) return runPing(ctx, st).then(function () { return { ok: true }; });
    if (!isLocal) {
      if (st.restarting) { emit('warning', '  Skipped: the target is restarting -- this task needs the connection. Run it again once the PC is back.'); return Promise.resolve({ skipped: true }); }
      if (st.linkDropped) { emit('warning', "  Skipped: a network change was pushed to the target, so this task cannot use the old connection. Use 'Ping Host' to see when it is back."); return Promise.resolve({ skipped: true }); }
    }
    var gen = G[id];
    if (!gen) { emit('error', '  Demo has no simulation for ' + id); return Promise.resolve({ ok: false }); }
    if (/^np_/.test(id)) ctx.push = true;
    var res = gen(ctx);
    if (isLocal) {
      emit('dim', '  (' + HINT_LOCAL + ' -- they are launchers, nothing runs on the target)');
      emitLines(res.out); return vsleep(0.6).then(function () { return { ok: true }; });
    }
    if (PUSH_MSG[id]) {                                                 // Network Push: send, do not wait for the result
      emit('info', '  ' + res.out[0]);
      emit('dim', '  Sending the command and NOT waiting for a reply (push only)...');
      return vsleep(8).then(function () {
        emit('success', '  ' + PUSH_MSG[id]);
        if (res.ok === false) emit('dim', '  (a push does not report the result -- verify with "Network Adapter & IP Configuration" or Ping Host)');
        if (PUSH_DROPS[id] && res.net && res.net.changes) st.linkDropped = true;
        return { ok: true };
      });
    }
    if (op.long) {                                                       // long tasks use the detached engine
      emit('info', '  Started on the target via: one-shot scheduled task running as SYSTEM (survives a dropped connection)');
      var steps = 4, i = 0;
      return (function loop() {
        if (S.stop) { emit('warning', '  STOP requested -- the task keeps running on the target; collect its result from the log later.'); return Promise.resolve({ ok: true }); }
        if (i >= steps) { emitLines(res.out); return Promise.resolve({ ok: res.ok !== false }); }
        i++;
        return vsleep(res.dur / steps).then(function () { if (i < steps) emit('dim', '  ... still running on the target (' + fmtDur(res.dur / steps * i) + ' elapsed)'); return loop(); });
      })();
    }
    if (res.net && res.net.changes) return inlineDrop(res, ctx, st).then(function () { return { ok: res.ok !== false }; });
    return vsleep(res.dur).then(function () {
      emitLines(res.out);
      if (res.reboot) {
        var wait = (/rename/.test(id)) ? 15 : 1;
        return vsleep(wait).then(function () {
          emit('warning', '  ! Connection lost -- EXPECTED: the target is restarting now.');
          P.reboot(75); st.restarting = true;
          return { ok: res.ok !== false };
        });
      }
      return { ok: res.ok !== false };
    });
  }

  /* ───────── batch ───────── */
  function run(opt) {
    if (S.running) return Promise.resolve();
    S.running = true; S.stop = false;
    var ids = opt.tasks.slice().sort(function (a, b) { return ORDER[a] - ORDER[b]; }), total = ids.length;
    var st = { linkDropped: false, restarting: false }, ctx0 = { user: opt.user, host: opt.host, hostTyped: opt.host };
    var needWinrm = ids.some(function (i) { return !LOCAL[i] && i !== 'np_ping_host'; }), counts = { ok: 0, fail: 0, skip: 0 }, idx = 0;
    emit('header', '=== PC ADMIN & PERFORMANCE TOOL v3.8 -- DEMO RUN (virtual PC) ===');
    emit('info', '  Target    : ' + opt.host + '    User: ' + opt.user + '    Transport: ' + (opt.transport || 'ntlm'));
    emit('info', '  Tasks     : ' + total + ' selected -- they run in LIST order, not click order');
    emit('dim', '  DEMO: everything is simulated in your browser. Nothing is sent to any network.');
    emit('blank', '');
    hooks.onTick();
    var chain = Promise.resolve(true);
    if (needWinrm) {
      chain = vsleep(1.2).then(function () {
        var c = connectCheck(opt.host, opt.transport);
        if (!c.ok) { emit('error', '  CONNECTION FAILED: ' + c.msg); emit('warning', '  No task was run.'); return false; }
        emit('success', '  ' + c.msg); emit('blank', ''); return true;
      });
    }
    return chain.then(function (connected) {
      if (!connected) { counts.fail = total; return null; }
      return ids.reduce(function (p, id) {
        return p.then(function () {
          var op = OPMAP[id], myIdx = idx++;
          if (S.stop) { counts.skip++; return; }
          emit('task_start', '[' + (myIdx + 1) + '/' + total + '] ' + op.label, { idx: myIdx, total: total, label: op.label });
          var ctx = { p: (opt.params && opt.params[id]) || {}, user: opt.user, host: ctx0.host, hostTyped: ctx0.hostTyped, id: id };
          return runTask(id, ctx, st).then(function (r) {
            ctx0.host = ctx.host;
            if (r.skipped) counts.skip++;
            else if (r.ok === false) { counts.fail++; emit('error', '  ✗ ' + op.label + ' reported a problem'); }
            else { counts.ok++; emit('success', '  ✓ ' + op.label + ' -- done'); }
            emit('progress', '', { value: Math.round((myIdx + 1) / total * 100) });
            emit('blank', '');
          });
        });
      }, Promise.resolve());
    }).then(function () {
      emit('header', '=== SUMMARY: ' + counts.ok + ' done, ' + counts.fail + ' with problems, ' + counts.skip + ' skipped' + (S.stop ? ' (stopped by you)' : '') + ' ===');
      emit('done', '', { success: counts.fail === 0 });
      S.running = false; hooks.onTick();
    });
  }

  window.PCAT_ENGINE = {
    run: run,
    stop: function () { S.stop = true; },
    isRunning: function () { return S.running; },
    setSpeed: function (s) { if (SPEED[s]) S.speed = s; },
    testConnection: testConnection,
    hooks: hooks, tagFor: tagFor
  };
})();
