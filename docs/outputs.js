/* PC Admin & Performance Tool -- live demo
 * outputs.js : what each of the 90 tasks prints on the virtual PC. The wording mirrors the real
 * PowerShell bodies (see the "</> PowerShell" viewer for the real script). Numbers are plausible
 * and vary slightly between runs. Tasks that change something update the virtual PC's state. */
(function () {
  'use strict';
  var P = window.PCAT_VPC, V = P.V;

  function r(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(r(a, b + 1)); }
  function f(n, d) { return Number(n).toFixed(d === undefined ? 2 : d); }
  function pad(s, n) { s = String(s); return s.length >= n ? s : s + new Array(n - s.length + 1).join(' '); }
  function lpad(s, n) { s = String(s); return s.length >= n ? s : new Array(n - s.length + 1).join(' ') + s; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  function hms(d) { return two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function guid(seed) {
    var h = 0, s = String(seed), i;
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    function hex(n) { var o = ''; while (o.length < n) { h = (h * 1103515245 + 12345) >>> 0; o += ('0000000' + h.toString(16)).slice(-8); } return o.slice(0, n); }
    return '{' + hex(8) + '-' + hex(4) + '-' + hex(4) + '-' + hex(4) + '-' + hex(12) + '}';
  }
  function whoami(c) { return c.user; }
  function ok(out, dur, extra) { var o = { out: out, dur: dur || 1, ok: true }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }

  var G = {};

  /* ───────────────────────── Cleanup ───────────────────────── */
  function profiles() {
    var v = P.get(), rows = [];
    v.users.forEach(function (u) { rows.push(u); });
    return rows;
  }
  G.clear_user_temp = function (c) {
    var v = P.get(), out = ['Running as : ' + whoami(c), 'Computer   : ' + v.name, 'Found ' + profiles().length + ' user profile folder(s) under C:\\Users'];
    var total = 0, denied = 0;
    profiles().forEach(function (u) {
      var mb = r(20, 900), items = ri(80, 4200);
      if (u === 'Public') { out.push('    [' + u + '] No temp folder (profile never fully loaded)'); return; }
      total += mb;
      if (v.signedIn.indexOf(u) >= 0) { denied++; out.push('    [' + u + '] Freed ' + f(mb, 1) + ' MB  (' + ri(2, 14) + ' file(s) skipped -- in use / access denied)'); }
      else out.push('    [' + u + '] Freed ' + f(mb, 1) + ' MB  (' + items + ' items)');
    });
    out.push('    [Windows\\ServiceProfiles\\NetworkService] Freed ' + f(r(0.2, 6), 1) + ' MB');
    out.push('------------------------------------------------');
    out.push('Profiles processed: ' + profiles().length + '   |   TOTAL FREED: ' + f(total, 1) + ' MB');
    if (denied) out.push("NOTE: " + denied + " profile(s) had files in use and were partially skipped (normal for the logged-in user's active session)");
    return ok(out, 4.2);
  };
  G.clear_windows_temp = function () { return ok(['Deleted ' + ri(120, 900) + ' items | Freed: ' + f(r(40, 700)) + ' MB'], 1.6); };
  G.clear_prefetch = function () { return ok(['Removed ' + ri(120, 260) + ' prefetch files | Freed: ' + f(r(4, 22)) + ' MB'], 0.9); };
  G.clear_thumbnail_cache = function () {
    var out = [], tot = 0;
    profiles().forEach(function (u) { if (u === 'Public') return; var mb = r(8, 160); tot += mb; out.push('[' + u + '] Removed ' + ri(3, 14) + ' files | Freed: ' + f(mb, 1) + ' MB'); });
    out.push('Total thumbnail cache freed: ' + f(tot, 1) + ' MB');
    return ok(out, 1.4);
  };
  G.clear_wu_cache = function () {
    return ok(['Stopping Windows Update & BITS services...', 'Cache cleared | Freed: ' + f(r(200, 3400)) + ' MB', 'Windows Update & BITS services restarted'], 3.1);
  };
  G.flush_dns = function (c) {
    var v = P.get(), a = P.adapter('Ethernet'), gw = a && a.gw ? a.gw : '(none)';
    var before = ri(60, 420);
    return ok(['SAFE FLUSH -- local DNS cache only', 'Entries before : ' + before, 'Entries after  : ' + ri(0, 6),
      'Gateway ' + gw + ' : ' + (a && a.gw ? 'reachable' : 'not configured'), 'DNS flushed safely -- domain connectivity preserved'], 1.3);
  };
  G.clear_browser_cache = function () {
    var out = [], tot = 0;
    profiles().forEach(function (u) {
      if (u === 'Public') return;
      [['Chrome', 20, 900], ['Edge', 10, 500]].forEach(function (b) { var mb = r(b[1], b[2]); tot += mb; out.push('[' + u + '] ' + b[0] + ': Freed ' + f(mb, 1) + ' MB'); });
      if (u === 'demo.user') { var m2 = r(20, 300); tot += m2; out.push('[' + u + '] Firefox: Freed ' + f(m2, 1) + ' MB'); }
    });
    out.push('TOTAL browser cache freed: ' + f(tot, 1) + ' MB');
    return ok(out, 3.4);
  };
  G.clear_event_logs = function () {
    var out = [];
    [['Application', ri(900, 6000)], ['System', ri(900, 7000)], ['Setup', ri(20, 300)], ['Windows PowerShell', ri(200, 2500)], ['Microsoft-Windows-WinRM/Operational', ri(20, 600)]].forEach(function (l) { out.push('Cleared: ' + l[0] + ' (' + l[1] + ' entries)'); });
    out.push('SKIPPED: Microsoft-Windows-Sysmon/Operational (184,220 entries) -- too large, would hang session');
    return ok(out, 5.2);
  };
  G.empty_recycle_bin = function () { return ok(['Recycle Bin emptied: ' + ri(3, 140) + ' items removed'], 1.1); };
  G.disk_cleanup = function () {
    return ok(['Configuring Disk Cleanup categories...', 'Configured 18 cleanup categories', 'Launching cleanmgr (max wait: 10 minutes)...', 'Disk Cleanup completed (exit code: 0)'], 38);
  };

  /* ───────────────────────── Disk ───────────────────────── */
  G.disk_space_report = function () {
    var out = ['Drive   FS         Total     Used      Free      Used%   Health', '──────────────────────────────────────────────────────────────────'];
    [['C', 'NTFS', 476.3, 331.8], ['D', 'NTFS', 931.5, 612.0]].forEach(function (d) {
      var free = d[2] - d[3], pct = Math.round(d[3] / d[2] * 100), warn = pct >= 90 ? '  !!' : '';
      out.push(d[0] + ':      ' + pad(d[1], 10) + ' ' + pad(f(d[2], 1) + ' GB', 9) + ' ' + pad(f(d[3], 1) + ' GB', 9) + ' ' + pad(f(free, 1) + ' GB', 9) + ' ' + pct + '%' + warn + '   Healthy');
    });
    return ok(out, 1.2);
  };
  G.defrag_drives = function () {
    var v = P.get(), out = [];
    ['C', 'D'].forEach(function (d) { out.push('Optimizing drive ' + d + ': (NTFS)...'); out.push('Drive ' + d + ': optimization complete'); });
    return ok(out, 22);
  };
  G.disk_health_scan = function () {
    var out = [];
    ['C', 'D'].forEach(function (d) { out.push('Scanning Drive ' + d + ': ...'); out.push('Drive ' + d + ': Scan=Completed | Health=Healthy | FS=NTFS'); });
    return ok(out, 7.5);
  };
  G.large_files_report = function () {
    var names = ['C:\\hiberfil.sys', 'C:\\pagefile.sys', 'C:\\Users\\demo.user\\Downloads\\win11_23H2_x64.iso', 'C:\\Users\\demo.user\\AppData\\Local\\Temp\\vm_snapshot.vhdx',
      'C:\\ProgramData\\Microsoft\\Windows\\Containers\\BaseImages\\base.wim', 'C:\\Windows\\SoftwareDistribution\\Download\\a91c.esd', 'C:\\Users\\admin\\Documents\\backup_2026-09.zip',
      'C:\\Windows\\MEMORY.DMP', 'C:\\Program Files\\Microsoft SQL Server\\MSSQL16\\DATA\\crm.mdf', 'C:\\Program Files\\Microsoft SQL Server\\MSSQL16\\DATA\\crm_log.ldf',
      'C:\\Windows\\WinSxS\\amd64_microsoft-windows-d..ent-ui_31bf3856ad364e35.dll', 'C:\\Users\\demo.user\\Videos\\training.mp4', 'C:\\Users\\svc_backup\\dump.bak',
      'C:\\Windows\\Installer\\1f3a2.msp', 'C:\\Windows\\System32\\config\\SOFTWARE', 'C:\\Users\\demo.user\\OneDrive\\archive.pst', 'C:\\Windows\\Logs\\CBS\\CBS.log',
      'C:\\ProgramData\\Docker\\image\\layer.tar', 'C:\\Users\\admin\\Desktop\\old_profile.zip', 'C:\\Windows\\System32\\DriverStore\\FileRepository\\nv_dispi.inf\\nvoglv64.dll'];
    var sizes = [], i, s = 18.4;
    for (i = 0; i < 20; i++) { sizes.push(s); s *= r(0.62, 0.9); }
    var out = ['Scanning C: drive for large files (>100MB)...', 'Size (GB)    Path', '─────────────────────────────────────────────────────────'];
    for (i = 0; i < 20; i++) out.push(lpad(f(sizes[i], 3), 8) + ' GB   ' + names[i % names.length]);
    out.push('Total large files found: 20');
    return ok(out, 14);
  };

  /* ───────────────────────── Performance ───────────────────────── */
  G.high_perf_power = function () { return ok(['Power plan set to: High Performance', 'Active: Power Scheme GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  (High performance)'], 0.8); };
  G.visual_effects_perf = function () { return ok(['Visual effects set to Best Performance', 'Animations & shadows disabled', 'Note: Re-login required for full effect'], 1.0); };
  G.optimize_ram = function () {
    var v = P.get(), tot = v.ramGB, ub = r(14, 22), ua = ub - r(0.6, 3.2);
    return ok(['RAM BEFORE — Total: ' + f(tot, 1) + ' GB | Used: ' + f(ub) + ' GB | Free: ' + f(tot - ub) + ' GB',
      'RAM AFTER  — Total: ' + f(tot, 1) + ' GB | Used: ' + f(ua) + ' GB | Free: ' + f(tot - ua) + ' GB', 'Recovered : ' + f(ub - ua) + ' GB'], 3.3);
  };
  G.tune_sysmain = function () {
    var v = P.get(), s = v.services.filter(function (x) { return x.n === 'SysMain'; })[0];
    if (v.ssd) {
      if (s.s === 'Stopped') return ok(['SSD detected on this system', 'SysMain already stopped/disabled'], 1);
      s.s = 'Stopped'; s.t = 'Disabled';
      return ok(['SSD detected on this system', 'SysMain DISABLED (recommended for SSD performance)'], 1.4);
    }
    s.s = 'Running'; s.t = 'Automatic';
    return ok(['HDD-only system — SysMain kept ACTIVE', 'SysMain re-enabled for HDD performance'], 1.2);
  };
  G.restart_search = function () {
    var v = P.get(), s = v.services.filter(function (x) { return x.n === 'WSearch'; })[0]; s.s = 'Running';
    return ok(['Windows Search indexer restarted successfully'], 4.1);
  };
  G.startup_report = function () {
    return ok(['=== STARTUP REGISTRY ENTRIES ===', '[HKLM:\\...\\Run] SecurityHealth = %windir%\\system32\\SecurityHealthSystray.exe', '[HKLM:\\...\\Run] RtkAudUService = "C:\\Windows\\System32\\DriverStore\\FileRepository\\realtekservice\\RtkAudUService64.exe" -background',
      '[HKCU:\\...\\Run] OneDrive = "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe" /background', '[HKCU:\\...\\Run] Teams = "C:\\Users\\demo.user\\AppData\\Local\\Microsoft\\Teams\\Update.exe" --processStart "Teams.exe"',
      '=== WIN32 STARTUP COMMANDS ===', '[CORP\\demo.user] OneDrive — "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe" /background', '[Public] Dell SupportAssist — C:\\Program Files\\Dell\\SupportAssistAgent\\bin\\SupportAssistAgent.exe',
      '=== ENABLED THIRD-PARTY SCHEDULED TASKS ===', '\\GoogleUpdateTaskMachineCore', '\\Backup-Nightly', '\\Dell\\SupportAssistAgentAutoUpdate'], 2.3);
  };
  G.pagefile_report = function () {
    var ram = P.get().ramGB;
    return ok(['RAM Installed     : ' + f(ram, 1) + ' GB', 'Auto-Managed PF   : True', 'Page File Path    : C:\\pagefile.sys', 'Allocated Size    : 4864 MB', 'Current Usage     : ' + ri(380, 1200) + ' MB', 'Peak Usage        : ' + ri(1500, 3200) + ' MB',
      'Recommended Range : ' + Math.round(ram * 1.5 * 1024) + ' MB — ' + Math.round(ram * 3 * 1024) + ' MB (1.5x–3x RAM)'], 1.1);
  };
  G.non_essential_services = function () {
    return ok(['=== THIRD-PARTY AUTO-START SERVICES ===', pad('CcmExec', 40) + ' RAM: ' + ri(60, 140) + ' MB', pad('MSSQLSERVER', 40) + ' RAM: ' + ri(900, 2200) + ' MB',
      pad('DellClientManagementService', 40) + ' RAM: ' + ri(30, 80) + ' MB', pad('SupportAssistAgent', 40) + ' RAM: ' + ri(40, 120) + ' MB', pad('GoogleUpdaterService', 40) + ' RAM: ' + ri(4, 12) + ' MB'], 1.8);
  };
  G.perf_hardware_report_cim = function () {
    var v = P.get();
    return ok(['=== CPU ===', v.cpu + '  cores=' + v.cores + ' threads=' + v.threads + ' maxMHz=' + v.mhz + ' load=' + ri(3, 28) + '%', '=== MEMORY MODULES ===',
      'DIMM A1: 16 GB  3200 MHz  Samsung', 'DIMM B1: 16 GB  3200 MHz  Samsung', 'RAM free now: ' + f(r(11, 19)) + ' GB of ' + f(v.ramGB * 0.996) + ' GB',
      '=== DISKS ===', 'SAMSUNG MZVL2512HCJQ-00B00  477 GB  status=OK  iface=SCSI', 'WDC WD10EZEX-08WN4A0  932 GB  status=OK  iface=IDE',
      '=== BIOS / BOARD ===', 'BIOS: ' + v.bios + '  serial=' + v.serial, 'Board: ' + v.board, '=== GPU ===', v.gpu + '  driver=' + v.gpuDriver], 2.4);
  };
  G.perf_trim_ssd = function (c) {
    var vol = (c.p.VOLUME || 'C').replace(':', '').toUpperCase();
    if (vol !== 'C' && vol !== 'D') return ok(['Volume ' + vol + ': not found.'], 0.4, { ok: false });
    if (vol === 'D') return ok(['Volume D: media type = HDD', 'This is a spinning disk -- ReTrim does not apply. Use \'Defragment\' instead. Nothing done.'], 0.7);
    return ok(['Volume C: media type = SSD', 'Performing retrim on (C:)...', 'The operation completed successfully.', 'Retrim finished.'], 6.2);
  };
  G.perf_wmi_verify_repository = function () { return ok(['Verifying the WMI repository (read-only)...', 'WMI repository is consistent'], 2.8); };
  G.perf_rebuild_perf_counters = function () {
    return ok(['Rebuilding performance counters (lodctr /R)...', 'Info: Successfully rebuilt performance counter setting from system backup store', 'Re-syncing with WMI performance adapter...',
      'Done. Monitoring tools may need a restart to pick the counters up.'], 9.4);
  };

  /* ───────────────────────── Windows Health ───────────────────────── */
  G.system_info = function () {
    var v = P.get(), up = P.uptimeSeconds(), d = Math.floor(up / 86400), h = Math.floor(up % 86400 / 3600), m = Math.floor(up % 3600 / 60), s = up % 60;
    var boot = new Date(Date.now() - up * 1000);
    return ok(['Hostname     : ' + v.name, 'Manufacturer : ' + v.manufacturer + ' ' + v.model, 'OS           : ' + v.os + ' ' + v.arch, 'OS Build     : ' + v.version + ' (Build ' + v.build + ')',
      'CPU          : ' + v.cpu, 'CPU Cores    : ' + v.cores + ' Physical / ' + v.threads + ' Logical', 'CPU Speed    : ' + v.mhz + ' MHz', 'RAM Total    : ' + f(v.ramGB) + ' GB', 'BIOS         : ' + v.bios,
      'Last Boot    : ' + ymd(boot) + ' ' + hms(boot), 'Uptime       : ' + d + 'd ' + h + 'h ' + m + 'm ' + s + 's', 'Domain       : ' + (v.domainJoined ? v.domain : v.workgroup),
      'Logged Users : ' + (v.signedIn[0] ? 'CORP\\' + v.signedIn[0] : '(none)')], 1.5);
  };
  G.top_processes = function () {
    var procs = [['chrome', 142.3, 1840, 8812], ['MsMpEng', 96.8, 412, 3120], ['sqlservr', 88.2, 2104, 4420], ['Teams', 61.4, 960, 9204], ['explorer', 40.2, 318, 6112], ['svchost', 31.9, 142, 1260], ['OneDrive', 22.1, 204, 7740], ['dwm', 19.6, 188, 1176], ['CcmExec', 14.2, 96, 3868], ['WmiPrvSE', 9.7, 74, 5020]];
    var out = ['=== TOP 10 PROCESSES BY CPU ===', 'Process Name                     CPU (s)      RAM (MB)', '──────────────────────────────────────────────────────────'];
    procs.forEach(function (p) { out.push(pad(p[0], 33) + lpad(f(p[1], 1), 8) + ' s   ' + lpad(p[2], 8) + ' MB'); });
    out.push('=== TOP 10 PROCESSES BY RAM ===', 'Process Name                     RAM (MB)     PID', '──────────────────────────────────────────────────────────');
    procs.slice().sort(function (a, b) { return b[2] - a[2]; }).forEach(function (p) { out.push(pad(p[0], 33) + lpad(p[2], 8) + ' MB   PID:' + p[3]); });
    return ok(out, 1.4);
  };
  G.run_sfc = function () {
    return ok(['Starting SFC scan — this may take several minutes...', 'Beginning system scan.  This process will take some time.', 'Beginning verification phase of system scan.', 'Verification 100% complete.',
      'Windows Resource Protection did not find any integrity violations.', 'SFC scan complete'], 128);
  };
  G.run_dism = function () {
    return ok(['Running DISM CheckHealth...', 'Deployment Image Servicing and Management tool', 'Version: 10.0.22621.2792', 'Image Version: ' + P.get().version + '.4602', 'No component store corruption detected.', 'The operation completed successfully.',
      'Running DISM ScanHealth...', '[==========================100.0%==========================] ', 'No component store corruption detected.', 'The operation completed successfully.'], 94);
  };
  G.wu_history = function () {
    var out = ['=== LAST 20 WINDOWS UPDATES INSTALLED ===', 'Date          HotFix ID       Description', '───────────────────────────────────────────────────────────'];
    var kb = ['KB5044285', 'KB5043145', 'KB5041585', 'KB5040442', 'KB5039302', 'KB5037771', 'KB5036893', 'KB5035853', 'KB5034765', 'KB5034123'];
    kb.forEach(function (k, i) { out.push(ymd(daysAgo(7 + i * 14)) + '    ' + pad(k, 15) + ' ' + (i % 3 === 0 ? 'Security Update' : i % 3 === 1 ? 'Update' : 'Cumulative Update')); });
    return ok(out, 2.2);
  };
  G.recent_errors = function () {
    var out = ['=== SYSTEM ERRORS/WARNINGS (last 24 hours) ===', '[02:14] Microsoft-Windows-DistributedCOM: The server {A9F2…} did not register with DCOM within the required timeout.',
      '[07:41] Microsoft-Windows-Time-Service: The time provider NtpClient is configured to acquire time from one or more time sources, however none of the sources are currently accessible.',
      '=== APPLICATION ERRORS (last 24 hours) ===', '[09:03] Application Error: Faulting application name: OneDrive.exe, version: 24.201.1006.0001, exception code: 0xc0000005',
      '[11:26] MsiInstaller: Product: Dell SupportAssist -- Update could not be installed. Error 1603.'];
    return ok(out, 2.9);
  };
  G.installed_software = function () {
    var apps = [['7-Zip 23.01 (x64)', '23.01', 400], ['Google Chrome', '129.0.6668.101', 12], ['Microsoft Edge', '129.0.2792.89', 9], ['Microsoft Office 365 ProPlus', '16.0.17928.20156', 30], ['Microsoft Teams Classic', '1.7.00.26001', 18],
      ['Notepad++ (64-bit)', '8.6.9', 120], ['VMware Tools', '12.4.0.23259341', 200], ['Dell SupportAssist', '4.1.13.0', 60], ['Adobe Acrobat (64-bit)', '24.003.20112', 25], ['Microsoft SQL Server 2022', '16.0.1000.6', 340],
      ['Zoom Workplace (64-bit)', '6.2.3 (45123)', 15], ['PuTTY release 0.81 (64-bit)', '0.81.0.0', 90]];
    var out = ['=== INSTALLED APPLICATIONS ===', 'Total: ' + apps.length + ' applications', 'Application Name                                  Version          Installed', '─────────────────────────────────────────────────────────────────────────────'];
    apps.forEach(function (a) { out.push(pad(a[0], 50) + ' ' + pad(a[1], 16) + ' ' + ymd(daysAgo(a[2]))); });
    return ok(out, 2.6);
  };
  G.run_dism_restorehealth = function () {
    return ok(['Running DISM RestoreHealth (needs the target to reach Windows Update or a repair source)...', 'Deployment Image Servicing and Management tool', 'Version: 10.0.22621.2792', 'Image Version: ' + P.get().version + '.4602',
      '[==========================100.0%==========================] ', 'The restore operation completed successfully.', 'The operation completed successfully.', 'DISM exit code: 0  (0 = success, 3010 = success but reboot needed)', "Tip: run 'Run System File Checker (SFC)' afterwards."], 412);
  };
  G.dism_component_cleanup = function (c) {
    var reset = c.p.RESET_BASE === 'true', out = ['=== ANALYZE COMPONENT STORE ===', 'Component Store (WinSxS) information:', 'Windows Explorer Reported Size of Component Store : 9.84 GB', 'Actual Size of Component Store : 8.21 GB',
      'Shared with Windows : 5.02 GB', 'Backups and Disabled Features : 2.77 GB', 'Cache and Temporary Data : 0.42 GB', 'Date of Last Cleanup : ' + ymd(daysAgo(41)), 'Number of Reclaimable Packages : 6', 'Component Store Cleanup Recommended : Yes',
      reset ? '=== START COMPONENT CLEANUP /ResetBase ===' : '=== START COMPONENT CLEANUP ===', '[==========================100.0%==========================] ', 'The operation completed successfully.', 'DISM exit code: 0'];
    return ok(out, 301);
  };
  G.chkdsk_online_scan = function (c) {
    var vol = (c.p.VOLUME || 'C').toUpperCase().replace(':', '');
    return ok(['Online read-only scan of ' + vol + ': (this can take several minutes)...', 'The type of the file system is NTFS.', 'Stage 1: Examining basic file system structure ...', '  512000 file records processed.', 'File verification completed.',
      'Stage 2: Examining file name linkage ...', '  612344 index entries processed.', 'Index verification completed.', 'Stage 3: Examining security descriptors ...', 'Security descriptor verification completed.',
      'Windows has scanned the file system and found no problems.', 'No further action is required.', 'chkdsk exit code: 0  (0 = no errors, 1 = errors found/fixed, 2/3 = cleanup needed)'], 186);
  };

  /* ───────────────────────── Network ───────────────────────── */
  function up(a) { return a && a.status === 'Up' && a.ip; }
  function dnsText(a) { return a.dns.length ? a.dns.join(', ') : '(none)'; }
  G.net_ip_config = function () {
    var out = ['=== NETWORK ADAPTERS ==='], any = false;
    P.get().adapters.forEach(function (a) {
      if (!up(a)) return; any = true;
      out.push('Adapter      : ' + a.name, 'IPv4 Address : ' + a.ip, 'Prefix Len   : /' + P.maskToPrefix(a.mask), 'Default GW   : ' + (a.gw || ''), 'DNS Servers  : ' + dnsText(a), 'MAC Address  : ' + a.mac,
        '──────────────────────────────────────────────');
    });
    if (!any) out.push('No active IPv4 adapters found');
    return ok(out, 1.1);
  };
  G.net_connectivity = function () {
    var a = P.adapter('Ethernet'), live = up(a);
    function row(n, addr, good, ms) { return pad(n, 28) + ' ' + pad(addr, 26) + ' ' + (good ? 'OK  ' : 'FAIL') + '   ' + (good ? ms + ' ms' : 'timeout'); }
    return ok(['Target                      Address                   Status   Latency', '─────────────────────────────────────────────────────────────────────',
      row('Default gateway', a && a.gw || '-', live, ri(1, 3)), row('Primary DNS', a && a.dns[0] || '-', live, ri(1, 4)), row('Domain controller', 'dc01.' + P.get().domain, live, ri(1, 6)),
      row('Internet (Cloudflare)', '1.1.1.1', live, ri(8, 22)), row('Internet (Google)', '8.8.8.8', live, ri(9, 26)), row('google.com', 'google.com', live, ri(10, 30))], 6.4);
  };
  G.net_adapter_stats = function () {
    var out = [];
    P.get().adapters.forEach(function (a) {
      if (a.status !== 'Up') return;
      out.push('Adapter  : ' + a.name + ' — ' + a.desc, 'Status   : ' + a.status + '  |  Speed: ' + a.speed + '  |  MAC: ' + a.mac, 'Sent     : ' + f(a.sentMB) + ' MB (' + a.sentPk + ' pkts)', 'Received : ' + f(a.recvMB) + ' MB (' + a.recvPk + ' pkts)',
        '──────────────────────────────────────────────────────────');
    });
    if (!out.length) out.push('No active adapters found');
    return ok(out, 1.0);
  };
  G.reset_network = function (c) {
    var a = P.adapter('Ethernet'), ip = P.liveIp();
    if (ip) P.changeAddress(ip, { delay: c && c.push ? 9 : 2, gap: c && c.push ? 5 : 3, dnsLag: 0 });
    return ok(['Resetting Winsock catalog...', 'Winsock reset complete', 'Resetting TCP/IP stack (IPv4 & IPv6)...', 'TCP/IP stack reset complete', 'Flushing DNS resolver cache...', 'Releasing IP address...', 'Renewing IP address...',
      'Network stack reset complete', 'NOTE: A REBOOT is recommended to fully apply Winsock/TCP-IP changes'], 6.1, { net: { changes: !!ip, newIp: ip } });
  };
  G.dns_test = function () {
    var out = ['=== DNS RESOLUTION LATENCY TEST ===', 'Domain                        IP Address         Latency', '──────────────────────────────────────────────────────────'];
    [['google.com', '142.250.185.78'], ['microsoft.com', '20.70.246.20'], ['github.com', '140.82.121.4'], ['cloudflare.com', '104.16.132.229'], ['dc01.' + P.get().domain, '192.168.1.10']].forEach(function (d) { out.push(pad(d[0], 30) + ' ' + pad(d[1], 19) + ' ' + ri(2, 38) + ' ms'); });
    return ok(out, 3.2);
  };
  G.firewall_status = function () {
    return ok(['=== WINDOWS FIREWALL PROFILES ===', 'Domain        : Enabled=True  Inbound=Block  Outbound=Allow', 'Private       : Enabled=True  Inbound=Block  Outbound=Allow', 'Public        : Enabled=True  Inbound=Block  Outbound=Allow',
      '=== ANTIVIRUS / SECURITY PRODUCTS ===', 'AV: Windows Defender | State: 397568', '=== TOP LISTENING PORTS (TCP) ===', '  135   svchost      445   System       1433  sqlservr', '  3389  svchost      5985  System       49664 lsass'], 2.1);
  };
  G.active_connections = function () {
    var rows = [['chrome', '192.168.1.50:51022', '142.250.185.78:443', 'Established'], ['Teams', '192.168.1.50:50911', '52.113.194.132:443', 'Established'], ['OneDrive', '192.168.1.50:50744', '13.107.42.12:443', 'Established'],
      ['System', '192.168.1.50:445', '192.168.1.77:50214', 'Established'], ['sqlservr', '192.168.1.50:1433', '192.168.1.30:50441', 'Established'], ['svchost', '192.168.1.50:5985', P.get().adapters[0].ip ? '192.168.1.5:49822' : '-', 'Established'], ['chrome', '192.168.1.50:51030', '151.101.1.69:443', 'TimeWait']];
    var out = ['=== ACTIVE TCP CONNECTIONS ===', 'Process                    Local                      Remote                     State', '─────────────────────────────────────────────────────────────────────────────────────'];
    rows.forEach(function (x) { out.push(pad(x[0], 27) + ' ' + pad(x[1], 27) + ' ' + pad(x[2], 27) + ' ' + x[3]); });
    return ok(out, 1.2);
  };

  /* ───────────────────────── Power Recycle ───────────────────────── */
  var DEV = {
    disks: [['OK', 'DiskDrive', 'SAMSUNG MZVL2512HCJQ-00B00', 'SCSI\\DISK&VEN_NVME&PROD_SAMSUNG_MZVL2512\\5&1A2B3C4D&0&000000'], ['OK', 'DiskDrive', 'WDC WD10EZEX-08WN4A0', 'SCSI\\DISK&VEN_WDC&PROD_WD10EZEX-08WN4A0\\4&2F1E0D9C&0&010000']],
    ctrl: [['OK', 'SCSIAdapter', 'Standard NVM Express Controller', 'PCI\\VEN_144D&DEV_A80A&SUBSYS_A801144D&REV_00\\4&1C2D3E4F&0&0010'], ['OK', 'SCSIAdapter', 'Standard SATA AHCI Controller', 'PCI\\VEN_8086&DEV_43D2&SUBSYS_09F61028&REV_11\\3&11583659&0&FA']],
    usb: [['OK', 'USB', 'USB Root Hub (USB 3.0)', 'USB\\ROOT_HUB30\\4&1B2C3D4E&0&0'], ['OK', 'USB', 'Logitech USB Receiver', 'USB\\VID_046D&PID_C534\\5&2A1D3E6B&0&2'], ['OK', 'USB', 'USB Composite Device', 'USB\\VID_0BDA&PID_8153\\000001'], ['OK', 'USB', 'USB Input Device', 'USB\\VID_413C&PID_2113\\6&3F2A1B0C&0&1']]
  };
  function devLine(d) { return pad(d[0], 8) + pad(d[1], 14) + pad(d[2], 36) + d[3]; }
  function allDevices() { return DEV.disks.concat(DEV.ctrl, DEV.usb); }
  G.pr_collect_evidence = function () {
    return ok(['=== TOP 20 PROCESSES BY CPU ===', '  chrome 142.3s | MsMpEng 96.8s | sqlservr 88.2s | Teams 61.4s | explorer 40.2s ...', '=== CPU LOAD (3 samples, 1s apart) ===', '  ' + ri(4, 20) + '%  ' + ri(4, 20) + '%  ' + ri(4, 20) + '%',
      '=== PHYSICAL DISK STATUS ===', '  SAMSUNG MZVL2512HCJQ-00B00   Healthy   OK', '  WDC WD10EZEX-08WN4A0         Healthy   OK', '=== LAST 100 SYSTEM LOG EVENTS (summary) ===', '  Information: 88   Warning: 9   Error: 3   Critical: 0',
      '--- Most recent Warning/Error/Critical entries (up to 15) ---', '  [07:41] Warning  Time-Service  NtpClient cannot reach a time source', '  [02:14] Error    DistributedCOM  DCOM server did not register'], 4.4);
  };
  G.pr_diagnose_driver_hang = function () {
    var v = P.get(), pend = v.services.filter(function (s) { return /Pending/.test(s.s); });
    var out = ['=== TOP 10 PROCESSES BY CPU ===', '  chrome 142.3s | MsMpEng 96.8s | sqlservr 88.2s | Teams 61.4s | explorer 40.2s', '=== SERVICES STUCK IN A PENDING STATE ==='];
    if (pend.length) { pend.forEach(function (s) { out.push('  ' + s.n + ' [' + s.d + '] = ' + s.s); }); out.push("A pending service above may be the 'hanging driver' -- try 'Restart a Specific Service' (Remote Tools)"); }
    else out.push('No services currently stuck in a pending state.');
    return ok(out, 2.5);
  };
  G.pr_list_storage_devices = function () {
    var out = ['=== DISK DRIVE CLASS DEVICES ==='];
    DEV.disks.forEach(function (d) { out.push(devLine(d)); });
    out.push('=== SCSI / STORAGE CONTROLLER CLASS DEVICES ===');
    DEV.ctrl.forEach(function (d) { out.push(devLine(d)); });
    out.push('WARNING: never disable the controller hosting the boot/system volume -- it can crash the target immediately.', "Copy an InstanceId above into 'Cycle a Device Driver' to disable/re-enable it.");
    return ok(out, 1.6);
  };
  G.pr_list_usb_devices = function () {
    var out = ['=== USB CLASS DEVICES ==='];
    DEV.usb.forEach(function (d) { out.push(devLine(d)); });
    out.push("Copy an InstanceId above into 'Cycle a Device Driver' to disable/re-enable one specific USB device,", "or use 'Cycle All USB Hub Devices' to cycle every USB-matching device at once.");
    return ok(out, 1.4);
  };
  G.pr_cycle_device_by_id = function (c) {
    var id = (c.p.DEVICE_ID || '').trim(), hit = allDevices().filter(function (d) { return d[3].toLowerCase() === id.toLowerCase(); })[0];
    if (!hit) return ok(['No device found with InstanceId: ' + id, "Run one of the 'List ... Devices' reports first and copy the exact InstanceId."], 0.9, { ok: false });
    return ok(['BEFORE: ' + hit[2] + '  [OK]', 'Disabling device...', 'Enabling device...', 'AFTER : ' + hit[2] + '  [OK]', 'Device cycled successfully.'], 5.3);
  };
  function flapEth(secs) {
    var ip = P.liveIp();
    if (ip) P.changeAddress(ip, { delay: 1, gap: secs || 4, dnsLag: 0 });
    return !!ip;
  }
  G.pr_restart_all_adapters = function () {
    var out = ['=== RESTARTING ALL NETWORK ADAPTERS ===', "If this session is on the adapter being restarted you may see a short gap -- the tool auto-reconnects."];
    P.get().adapters.forEach(function (a) { out.push('Restarting: ' + a.name + ' [' + a.status + ']'); });
    var ch = flapEth(5);
    out.push('=== POST-RESTART STATUS ===');
    P.get().adapters.forEach(function (a) { out.push(a.name + ': ' + a.status); });
    return ok(out, 9.8, { net: { changes: ch, newIp: P.liveIp(V.t + 99) } });
  };
  function adapterOp(label) {
    return function (c) {
      var name = c.p.ADAPTER || 'Ethernet', a = P.adapter(name), v = P.get();
      if (!a) { var o = ["Adapter '" + name + "' not found. Available adapters:"]; v.adapters.forEach(function (x) { o.push('  ' + x.name + '  [' + x.status + ']'); }); return ok(o, 0.6, { ok: false }); }
      var out = ['BEFORE: ' + a.name + ' = ' + a.status];
      var ch = a.name === 'Ethernet' ? flapEth(5) : false;
      out.push(label === 'cycle' ? 'Disabling ' + a.name + '...' : 'Restarting ' + a.name + '...');
      if (label === 'cycle') out.push('Enabling ' + a.name + '...');
      out.push('AFTER : ' + a.name + ' = ' + a.status);
      return ok(out, 7.2, { net: { changes: ch, newIp: P.liveIp(V.t + 99) } });
    };
  }
  G.pr_restart_named_adapter = adapterOp('restart');
  G.pr_disable_enable_adapter = adapterOp('cycle');
  G.pr_cycle_usb_hubs = function () {
    var out = ['=== CYCLING ALL USB-MATCHING PNP DEVICES ==='];
    DEV.usb.forEach(function (d) { out.push('Cycling: ' + d[2]); });
    out.push('Cycled ' + DEV.usb.length + ' USB device(s).');
    return ok(out, 8.4);
  };
  G.pr_firmware_info = function () {
    var v = P.get();
    return ok(['=== FIRMWARE / BIOS INFO (Get-ComputerInfo can take a few seconds) ===', 'BIOS Version      : ' + v.bios, 'BIOS Manufacturer : ' + v.manufacturer, 'BIOS Release Date : ' + v.biosDate.slice(0, 4) + '-' + v.biosDate.slice(4, 6) + '-' + v.biosDate.slice(6),
      'Firmware Type     : Uefi', 'System Model      : ' + v.manufacturer + ' ' + v.model], 5.6);
  };
  G.pr_force_restart = function () { return ok(['Forcing an immediate restart -- any unsaved work on the target WILL be lost.', 'The connection will drop now; this is expected.'], 1.0, { reboot: true }); };
  G.pr_wake_armed_devices = function () {
    return ok(['=== DEVICES CURRENTLY ARMED TO WAKE THIS SYSTEM ===', 'Logitech USB Receiver', 'Intel(R) Ethernet Connection (14) I219-LM', '=== DEVICES THAT CAN BE PROGRAMMED TO WAKE THIS SYSTEM ===', 'Intel(R) Ethernet Connection (14) I219-LM', 'Logitech USB Receiver', 'USB Composite Device', 'Standard PS/2 Keyboard'], 1.1);
  };
  G.pr_disable_hibernation = function () {
    return ok(['Disabling hibernation (also removes hiberfil.sys and Fast Startup/hybrid-sleep behavior)...', 'Verifying available sleep states...', 'The following sleep states are available on this system:', '    Standby (S0 Low Power Idle) Network Connected',
      'The following sleep states are not available on this system:', '    Hibernate', '        Hibernation has not been enabled.', '    Hybrid Sleep', '        Hibernation is not available.', '    Fast Startup', '        Hibernation is not available.'], 1.8);
  };
  G.pr_force_signout_restart = function () { return ok(['Signing out and restarting now (shutdown /g) -- Windows will try to reopen registered apps on next login.', 'Any unsaved work WILL be lost. The connection will drop now; this is expected.'], 1.0, { reboot: true }); };
  G.pr_full_soft_recycle = function (c) {
    var auto = c.p.AUTO_RESTART !== 'false', out = ['=== FULL SOFT-RECYCLE: NETWORK + USB CYCLE + RESTART ===', 'This is the closest software-only equivalent to a physical power recycle.', '[1/3] Restarting network adapters...'];
    var ch = flapEth(5);
    out.push('[2/3] Cycling USB-matching devices...');
    if (auto) { out.push('[3/3] Restarting the computer now (shutdown /g)...'); return ok(out, 12, { reboot: true }); }
    out.push('[3/3] Auto-Restart is OFF -- network + USB cycle complete, restart skipped.', "Run 'Force Restart Now' or 'Force Sign-out & Restart' (Power Recycle) manually when ready.");
    return ok(out, 12, { net: { changes: ch, newIp: P.liveIp(V.t + 99) } });
  };

  /* ───────────────────────── Remote Tools: IP / DHCP ───────────────────────── */
  function adapterNotFound(name) {
    var o = ["Adapter '" + name + "' not found. Available adapters:"];
    P.get().adapters.forEach(function (x) { o.push('  ' + x.name); });
    return o;
  }
  function resultingConfig(a) {
    return ['=== RESULTING CONFIGURATION ===', 'IPv4 Address : ' + a.ip, 'Gateway      : ' + a.gw, 'DNS Servers  : ' + a.dns.join(', ')];
  }
  /** Shared by Set Static IP (inline) and Push: Set Static IP. */
  function staticIp(c, push) {
    var name = c.p.ADAPTER || 'Ethernet', a = P.adapter(name);
    if (!a) return ok(adapterNotFound(name), 0.6, { ok: false });
    var ip = c.p.IP, mask = P.normMask(c.p.MASK || '255.255.255.0'), gw = c.p.GATEWAY, d1 = c.p.DNS1 || '', d2 = c.p.DNS2 || '';
    var prefix = P.maskToPrefix(mask), dns = [d1, d2].filter(Boolean);
    var same = a.ip === ip && a.mask === mask && a.gw === gw && (!d1 || a.dns[0] === d1) && (!d2 || a.dns[1] === d2);
    var out = [];
    if (push) out.push('PUSH: ' + ip + ' / ' + mask + ' (/' + prefix + '), gateway ' + gw + ', DNS ' + d1 + ' ' + d2 + " on '" + name + "' -- everything in one pass");
    else out.push('Target configuration on \'' + name + '\': ' + ip + ' / ' + mask + ' (/' + prefix + '), gateway ' + gw + ', DNS ' + (dns.join(' ') || '(unchanged)'));
    if (same && !push) { out.push('Already configured exactly like this -- nothing to change.'); return ok(out.concat(resultingConfig(a)), 1.2, { net: { changes: false } }); }
    var oldIp = a.ip;
    if (!push) out.push('Applying IP, mask, gateway and DNS together (attempt 1 of 3)...');
    out.push('Ok.', 'Ok.', 'Ok.');
    out.push(push ? 'VERIFIED on the target: IP address, subnet mask, gateway and DNS match.' : 'VERIFIED: IP address, subnet mask, gateway and DNS all match the requested values.');
    a.ip = ip; a.mask = mask; a.gw = gw; a.dhcp = false;
    if (dns.length) a.dns = dns.slice();
    a.status = 'Up';
    var changes = oldIp !== ip, tl = null;
    if (changes && name.toLowerCase() === 'ethernet') tl = P.changeAddress(ip, { delay: push ? 9 : 2, gap: 5, dnsLag: 12 });
    return ok(out.concat(resultingConfig(a)), push ? 6 : 22.4, { net: { changes: changes, newIp: ip, oldIp: oldIp, tl: tl } });
  }
  G.rt_set_static_ip = function (c) { return staticIp(c, false); };
  G.np_static_ip = function (c) { return staticIp(c, true); };
  function dhcpOp(c, push) {
    var name = c.p.ADAPTER || 'Ethernet', a = P.adapter(name);
    if (!a) return ok(adapterNotFound(name), 0.6, { ok: false });
    var oldIp = a.ip, lease = '192.168.1.' + ri(120, 199);
    var out = ["Switching '" + name + "' to DHCP (address + DNS together)...", 'Ok.', 'Ok.'];
    a.dhcp = true; a.ip = lease; a.mask = '255.255.255.0'; a.gw = '192.168.1.1'; a.dns = ['192.168.1.10', '192.168.1.11']; a.status = 'Up';
    var changes = oldIp !== lease, tl = null;
    if (changes && name.toLowerCase() === 'ethernet') tl = P.changeAddress(lease, { delay: push ? 9 : 2, gap: 5, dnsLag: 12 });
    out.push('VERIFIED: DHCP is enabled and a lease was obtained (' + lease + ').');
    return ok(out.concat(resultingConfig(a)), 14.6, { net: { changes: changes, newIp: lease, oldIp: oldIp, tl: tl } });
  }
  G.rt_set_dhcp = function (c) { return dhcpOp(c, false); };
  G.np_dhcp = function (c) { return dhcpOp(c, true); };
  G.np_flush_dns = G.flush_dns;
  G.np_reset_tcpip = function (c) { c.push = true; return G.reset_network(c); };

  /* ───────────────────────── Remote Tools: rename ───────────────────────── */
  var AD_TAKEN = ['dc01', 'dc02', 'filesrv01', 'exists-pc', 'sqlprod01'];
  function renameHead(v, newName) {
    return ['Current name : ' + v.name, 'Renaming to  : ' + newName, 'Membership   : ' + (v.domainJoined ? 'DOMAIN ' + v.domain : 'WORKGROUP ' + v.workgroup)];
  }
  function restartTail(c, v) {
    return c.p.AUTO_RESTART !== 'false'
      ? ['Rename submitted -- target restarts in 15 seconds']
      : ['Rename submitted -- this does NOT auto-restart. Run \'Force Restart Now\' (Power Recycle) when ready.'];
  }
  G.rt_rename_pc_domain = function (c) {
    var v = P.get(), nn = (c.p.NEW_NAME || '').toUpperCase(), out = renameHead(v, nn);
    if (!v.domainJoined) return ok(out.concat(["This target is NOT domain-joined -- use 'Rename Computer (Workgroup/Local)' instead. Nothing was changed."]), 1.0);
    if (nn === v.name) return ok(out.concat(['Computer is already named ' + nn + ' -- nothing to do.']), 0.8);
    out.push('Using the username/password you connected with as an explicit DOMAIN credential', '(built on the target, so no CredSSP / double-hop is needed).');
    if (AD_TAKEN.indexOf(nn.toLowerCase()) >= 0) {
      out.push('Method 1 failed: Cannot rename computer; a computer account named ' + nn + ' already exists in the domain.', 'Method 2 failed, code 2224: the account already exists (a computer with the new name already exists in AD)',
        'Rename FAILED -- nothing was changed.', 'Check: (1) the account is Domain Admin / has rename rights on the computer object,', '       (2) no computer object named ' + nn + ' already exists in Active Directory.');
      return ok(out, 3.4, { ok: false });
    }
    out.push('Method 1 (Rename-Computer -DomainCredential) succeeded.');
    v.pendingName = nn;
    var tail = restartTail(c, v);
    return ok(out.concat(tail), 3.9, { reboot: c.p.AUTO_RESTART !== 'false' });
  };
  G.rt_rename_pc_workgroup = function (c) {
    var v = P.get(), nn = (c.p.NEW_NAME || '').toUpperCase(), out = renameHead(v, nn);
    if (v.domainJoined) return ok(out.concat(['This target IS joined to domain ' + v.domain + '. A local-only rename would leave its AD computer', "account out of sync and can break domain logon -- use 'Rename Computer (Domain-Joined)'. Nothing was changed."]), 1.0);
    if (nn === v.name) return ok(out.concat(['Computer is already named ' + nn + ' -- nothing to do.']), 0.8);
    out.push('Method 1 (Rename-Computer) succeeded.');
    v.pendingName = nn;
    return ok(out.concat(restartTail(c, v)), 3.1, { reboot: c.p.AUTO_RESTART !== 'false' });
  };
  G.rt_rename_pc_wmic_legacy = function (c) {
    var v = P.get(), nn = (c.p.NEW_NAME || '').toUpperCase(), out = renameHead(v, nn);
    if (nn === v.name) return ok(out.concat(['Computer is already named ' + nn + ' -- nothing to do.']), 0.8);
    if (v.domainJoined) out.push('Domain-joined target: using the WMI rename method via CIM with your credentials (avoids putting a password on a wmic command line).');
    else out.push('wmic.exe found -- using it (workgroup target).', 'Method execution successful.', 'Out Parameters:', 'instance of __PARAMETERS', '{', '        ReturnValue = 0;', '};');
    out.push('WMI Win32_ComputerSystem.Rename succeeded.');
    v.pendingName = nn;
    out.push("Rename submitted -- this does NOT auto-restart. Run 'Force Restart Now' (Power Recycle) when ready.");
    return ok(out, 3.3);
  };

  /* ───────────────────────── Remote Tools: VSS ───────────────────────── */
  function vol(c) { return (c.p.VOLUME || 'C').replace(':', '').toUpperCase(); }
  function pct(sizeGB, total) { return Math.round(sizeGB / total * 100); }
  var VOLSIZE = { C: 476.3, D: 931.5 };
  G.rt_vss_view = function () {
    var v = P.get(), out = ['=== VSS SHADOW STORAGE (size/usage per volume) ===', 'vssadmin 1.1 - Volume Shadow Copy Service administrative command-line tool', '(C) Copyright 2001-2013 Microsoft Corp.', ''];
    ['C', 'D'].forEach(function (d) {
      var s = v.vss[d];
      if (!s.alloc && !s.copies) { return; }
      var maxGB = /%/.test(s.max) ? VOLSIZE[d] * parseInt(s.max, 10) / 100 : (/UNBOUNDED/i.test(s.max) ? VOLSIZE[d] : parseFloat(s.max));
      out.push('Shadow Copy Storage association', '   For volume: (' + d + ':)\\\\?\\Volume' + guid('vol' + d) + '\\', '   Shadow Copy Storage volume: (' + d + ':)\\\\?\\Volume' + guid('vol' + d) + '\\',
        '   Used Shadow Copy Storage space: ' + f(s.used, 1) + ' GB (' + pct(s.used, VOLSIZE[d]) + '%)', '   Allocated Shadow Copy Storage space: ' + f(s.alloc, 1) + ' GB (' + pct(s.alloc, VOLSIZE[d]) + '%)',
        '   Maximum Shadow Copy Storage space: ' + (/UNBOUNDED/i.test(s.max) ? 'UNBOUNDED (' + f(VOLSIZE[d], 1) + ' GB)' : f(maxGB, 1) + ' GB (' + s.max + ')'), '');
    });
    out.push('=== VSS SHADOW COPIES (instances) ===');
    var n = v.vss.C.copies;
    if (!n) out.push('No items found that satisfy the query.');
    for (var i = 0; i < n; i++) {
      var d = daysAgo(n - i);
      out.push('Contents of shadow copy set ID: ' + guid('set' + i), '   Contained 1 shadow copies at creation time: ' + (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() + ' 3:00:1' + i + ' AM',
        '      Shadow Copy ID: ' + guid('copy' + i), '         Original Volume: (C:)\\\\?\\Volume' + guid('volC') + '\\', '         Provider: \'Microsoft Software Shadow Copy provider 1.0\'', '         Type: ClientAccessible', '');
    }
    return ok(out, 2.4);
  };
  G.rt_vss_delete_all = function () {
    var v = P.get(), n = v.vss.C.copies + v.vss.D.copies;
    v.vss.C.copies = 0; v.vss.D.copies = 0; v.vss.C.used = 0; v.vss.D.used = 0;
    return ok(['Deleting ALL VSS shadow copies on ALL volumes -- IRREVERSIBLE, removes every System Restore /', 'previous-versions recovery point on this machine.', 'vssadmin 1.1 - Volume Shadow Copy Service administrative command-line tool', '',
      'Do you really want to delete ' + n + ' shadow copies (Y/N): [N]? Y', '', 'Successfully deleted ' + n + ' shadow copies.', 'Done.'], 4.8);
  };
  G.rt_vss_delete_volume_all = function (c) {
    var v = P.get(), d = vol(c), s = v.vss[d];
    if (!s) return ok(['Deleting ALL VSS shadow copies on volume ' + d + ' -- IRREVERSIBLE for that volume.', 'Error: Volume ' + d + ': not found.'], 0.9, { ok: false });
    var n = s.copies; s.copies = 0; s.used = 0;
    return ok(['Deleting ALL VSS shadow copies on volume ' + d + ' -- IRREVERSIBLE for that volume.', n ? 'Successfully deleted ' + n + ' shadow copies.' : 'No items found that satisfy the query.', 'Done.'], 3.1);
  };
  G.rt_vss_delete_oldest = function (c) {
    var v = P.get(), raw = (c.p.VOLUME || '').trim(), out = [];
    function one(d) {
      var s = v.vss[d]; if (!s || !s.copies) { out.push('  No items found that satisfy the query.'); return; }
      s.copies--; s.used = Math.max(0, s.used - 5.9);
      out.push('  Successfully deleted the oldest shadow copy (' + guid('old' + d + s.copies) + ').');
    }
    if (!raw) { out.push('No volume specified -- deleting the oldest shadow copy on every fixed volume that has one.'); ['C', 'D'].forEach(function (d) { out.push('--- ' + d + ': ---'); one(d); }); }
    else { var d = raw.replace(':', '').toUpperCase(); out.push('Deleting the oldest VSS shadow copy on volume ' + d); one(d); }
    return ok(out, 3.0);
  };
  G.rt_vss_resize_storage = function (c) {
    var v = P.get(), d = vol(c), s = v.vss[d], size = (c.p.MAXSIZE || '10%').toUpperCase();
    function line(x) { return '   Maximum Shadow Copy Storage space: ' + x; }
    var out = ['=== BEFORE (volume ' + d + ') ==='];
    if (!s || (!s.alloc && !s.copies)) {
      out.push('Error: No shadow copy storage association found for volume ' + d + ':', 'Setting maximum shadow storage on ' + d + ' to ' + size + ' ...', 'Error: Volume ' + d + ': has no shadow storage association.',
        'RESIZE FAILED (exit 2). Typical causes: no shadow storage association exists yet for this volume', '(create a shadow copy first), the size is below 1MB, or the volume letter is wrong.');
      return ok(out, 1.6, { ok: false });
    }
    out.push(line(/UNBOUNDED/i.test(s.max) ? 'UNBOUNDED' : s.max), 'Setting maximum shadow storage on ' + d + ' to ' + size + ' ...', 'Successfully resized the shadow copy storage association', '=== AFTER ===');
    s.max = size; out.push(line(size));
    return ok(out, 2.2);
  };

  /* ───────────────────────── Remote Tools: services / tasks ───────────────────────── */
  G.rt_run_scheduled_task_query = function (c) {
    var v = P.get(), q = (c.p.TASK_NAME || '').toLowerCase().replace(/^\\/, '');
    var hit = v.tasks.filter(function (t) { return t.name.toLowerCase() === q || (t.path + t.name).toLowerCase() === '\\' + q; });
    if (!hit.length) {
      var close = v.tasks.filter(function (t) { return t.name.toLowerCase().indexOf(q.slice(0, 4)) >= 0; });
      var o = ["No exact match for '" + c.p.TASK_NAME + "'. Closest matches:"];
      (close.length ? close : v.tasks).forEach(function (t) { o.push('  ' + t.path + t.name); });
      return ok(o, 1.4, { ok: false });
    }
    var t = hit[0];
    return ok(['=== ' + t.path + t.name + ' ===', 'State          : ' + t.state, 'LastRunTime    : ' + t.last, 'NextRunTime    : ' + t.next, 'LastTaskResult : 0', 'Author         : CORP\\admin', 'Triggers       : Daily at ' + t.next.slice(11)], 1.5);
  };
  G.rt_restart_service = function (c) {
    var v = P.get(), nm = (c.p.SERVICE_NAME || '').trim(), svc = v.services.filter(function (s) { return s.n.toLowerCase() === nm.toLowerCase(); })[0];
    if (!svc) {
      var byDisp = v.services.filter(function (s) { return s.d.toLowerCase() === nm.toLowerCase(); });
      var o = ["Service '" + nm + "' not found. Use 'List All Services' to find the exact Name (not DisplayName)."];
      if (byDisp.length) o.push("Note: that text is the DISPLAY name of the service whose Name is '" + byDisp[0].n + "' -- run this again with that Name.");
      return ok(o, 0.8, { ok: false });
    }
    var out = ['BEFORE: ' + svc.n + ' [' + svc.d + '] = ' + svc.s + '  (StartType: ' + svc.t + ')'];
    if (svc.t === 'Disabled') { out.push('WARNING: service is not Running after restart -- check its dependencies or the System event log.'); return ok(out, 1.2, { ok: false }); }
    svc.s = 'Running';
    out.push('Restarting service...', 'AFTER : ' + svc.n + ' [' + svc.d + '] = ' + svc.s);
    return ok(out, 3.6);
  };
  G.rt_list_all_services = function () {
    var v = P.get(), out = ['=== ALL SERVICES (Name | Status | StartType) ==='], run = 0;
    v.services.slice().sort(function (a, b) { return a.n.toLowerCase() < b.n.toLowerCase() ? -1 : 1; }).forEach(function (s) { if (s.s === 'Running') run++; out.push(pad(s.n, 28) + ' | ' + pad(s.s, 8) + ' | ' + s.t); });
    out.push('Total: ' + v.services.length + ' services -- ' + run + ' running');
    return ok(out, 1.2);
  };

  /* ───────────────────────── Remote Tools: network drives ───────────────────────── */
  function acct(c) { return (c.p.USER_ACCOUNT || '').trim(); }
  function accKey(a) { return a.indexOf('\\') < 0 && a.indexOf('@') < 0 ? 'CORP\\' + a : a; }
  function accShort(a) { var s = a.split('\\').pop().split('@')[0].toLowerCase(); return s; }
  function known(a) { var s = accShort(a); return P.get().users.map(function (u) { return u.toLowerCase(); }).indexOf(s) >= 0 || s === 'administrator'; }
  function sid(a) { return 'S-1-5-21-3459281116-2231849922-1980274401-' + (1100 + accShort(a).length * 7); }
  function profLine(a) {
    var on = P.get().signedIn.map(function (u) { return u.toLowerCase(); }).indexOf(accShort(a)) >= 0;
    return on ? 'Profile       : profile registry already loaded (user is signed in or has a running process)' : 'Profile       : user is not signed in -- profile registry loaded temporarily';
  }
  G.rt_map_network_drive = function (c) {
    var v = P.get(), a = acct(c), L = (c.p.DRIVE_LETTER || 'Z').replace(':', '').toUpperCase(), share = c.p.SHARE_PATH, out = ['=== MAP NETWORK DRIVE FOR A USER ===', 'Shared folder : ' + share, 'Drive letter  : ' + L + ':', 'For account   : ' + a];
    if (!known(a)) { out.push("ERROR: no local or domain account matching '" + a + "' was found on this PC (it has never signed in here)."); return ok(out, 1.4, { ok: false }); }
    out.push('Account found : ' + accShort(a) + '  [' + sid(a) + ']');
    if (L === 'C' || L === 'D') { out.push('ERROR: ' + L + ': is already a local disk on this PC -- choose a different drive letter.'); return ok(out, 0.8, { ok: false }); }
    var server = share.replace(/^\\\\/, '').split('\\')[0];
    out.push('Network check : ' + server + ' answers on TCP 445 from this PC.', profLine(a));
    var key = accKey(a).toLowerCase(), m = v.drives[key] = v.drives[key] || {}, old = m[L];
    if (old && old.toLowerCase() === share.toLowerCase()) { out.push(L + ': is already saved for this user with the same share -- registry left as it is.'); }
    else if (old && c.p.REPLACE_EXISTING !== 'true') { out.push('STOPPED: ' + L + ': is already saved for this user as ' + old + ". Tick 'Replace an existing mapping' to overwrite it, or use another drive letter."); return ok(out, 1.1, { ok: false }); }
    else { if (old) out.push('Replacing the saved mapping ' + L + ': -> ' + old); m[L] = share; out.push("Saved in the user's profile: " + L + ': -> ' + share + ' (reconnects at every sign-in)'); }
    if (c.p.APPLY_NOW !== 'false') {
      if (v.signedIn.map(function (u) { return u.toLowerCase(); }).indexOf(accShort(a)) >= 0) out.push("User is signed in -- connecting the drive inside their own session now...", 'Live connect complete: ' + L + ': is now connected in the user\'s session.');
      else out.push('This user is not signed in at a desktop right now -- the drive will connect at their next sign-in.');
    } else out.push('Apply-now is OFF -- the drive appears at the next sign-in.');
    return ok(out, 4.6);
  };
  G.rt_unmap_network_drive = function (c) {
    var v = P.get(), a = acct(c), L = (c.p.DRIVE_LETTER || 'Z').replace(':', '').toUpperCase(), out = ['=== REMOVE MAPPED NETWORK DRIVE FOR A USER ===', 'Drive letter  : ' + L + ':', 'For account   : ' + a];
    if (!known(a)) { out.push("ERROR: no local or domain account matching '" + a + "' was found on this PC."); return ok(out, 1.2, { ok: false }); }
    out.push('Account found : ' + accShort(a) + '  [' + sid(a) + ']', profLine(a));
    var key = accKey(a).toLowerCase(), m = v.drives[key] || {};
    if (m[L]) { out.push('Removed the saved mapping ' + L + ': -> ' + m[L] + " from the user's profile."); delete m[L]; }
    else out.push('No saved mapping for ' + L + ": in this user's profile -- nothing to remove from the registry.");
    if (c.p.APPLY_NOW === 'false') out.push("Disconnect-now is OFF -- if the drive is connected in the user's session it stays until they sign out.");
    else if (v.signedIn.map(function (u) { return u.toLowerCase(); }).indexOf(accShort(a)) >= 0) out.push("User is signed in -- disconnecting the drive inside their own session now...", 'Live disconnect complete: ' + L + ": was disconnected in the user's session.");
    else out.push('This user is not signed in at a desktop right now -- nothing to disconnect live.');
    return ok(out, 3.9);
  };
  G.rt_list_mapped_drives = function (c) {
    var v = P.get(), a = acct(c), out = ['=== MAPPED NETWORK DRIVES (saved in each user\'s profile) ==='], list;
    if (!a) { out.push("No account given -- listing every user whose profile is currently loaded (signed in)."); list = v.signedIn.slice(); }
    else { if (!known(a)) { out.push("ERROR: no local or domain account matching '" + a + "' was found on this PC."); return ok(out, 1, { ok: false }); } list = [accShort(a)]; }
    if (!list.length) out.push('No signed-in user profiles found.');
    list.forEach(function (u) {
      var key = accKey(u).toLowerCase(), m = v.drives[key] || {}, on = v.signedIn.map(function (x) { return x.toLowerCase(); }).indexOf(u.toLowerCase()) >= 0, ks = Object.keys(m);
      out.push('User : ' + u + '   [' + sid(u) + ']', '       signed in at a desktop: ' + (on ? 'yes' : 'no') + '   |   profile registry: ' + (on ? 'already loaded' : 'loaded temporarily'));
      if (!ks.length) out.push('       no saved mapped drives'); else ks.forEach(function (k) { out.push('       ' + k + ':  ' + m[k]); });
    });
    out.push('Note: this lists what is SAVED in the profile (reconnected at every sign-in). Whether a drive is connected', 'right now is only visible inside that user\'s own session -- ask them to open This PC, or check for a red X.');
    return ok(out, 3.2);
  };

  /* ───────────────────────── Admin consoles (run on the admin PC) ───────────────────────── */
  var MMC = {
    rt_open_computer_management: ['compmgmt.msc', '\\\\'], ac_open_disk_management: ['diskmgmt.msc', '\\\\'], ac_open_device_manager: ['devmgmt.msc', '\\\\'],
    ac_open_services: ['services.msc', '\\\\'], ac_open_event_viewer: ['eventvwr.msc', ''], ac_open_shared_folders: ['fsmgmt.msc', '\\\\']
  };
  function consoleLines(id, host, user) {
    var out = [];
    if (MMC[id] || id === 'ac_open_admin_share' || id === 'ac_open_firewall') out.push('Authenticated to ' + host + ' as ' + user + ' (net use IPC$).');
    if (MMC[id]) {
      var m = MMC[id], arg = '/computer:' + m[1] + host;
      out.push('Launched: mmc.exe ' + m[0] + ' ' + arg, 'If the console shows the LOCAL computer instead, right-click its root node > Connect to another computer > ' + host + '.');
      if (id === 'ac_open_device_manager') out.push('Windows 8 / Server 2012 and later show remote devices read-only. For driver changes use \'Open Remote Desktop\'.');
    } else if (id === 'ac_open_admin_share') out.push('Launched: explorer \\\\' + host + '\\C$');
    else if (id === 'ac_open_firewall') out.push('Launched Windows Firewall with Advanced Security (LOCAL view). To manage the TARGET:', "  1. Right-click 'Windows Defender Firewall with Advanced Security' (top-left node)", "  2. Choose 'Connect to Another Computer...'", "  3. Pick 'Another computer', type " + host + ', OK.');
    else if (id === 'ac_open_remote_shell') out.push('Launched a PowerShell window connected to ' + host + ' (Negotiate).', 'Inside it, run anything: cleanmgr /sagerun:1, defrag C: /U, netsh advfirewall show allprofiles, Get-NetAdapter ...');
    else if (id === 'ac_open_remote_cmd') out.push('Launched: winrs -r:' + host + ' -u:' + user + ' cmd  (new window).', 'Type the password in that window when it asks -- winrs will not take it safely any other way.');
    else if (id === 'ac_open_rdp') out.push('Stored the credential for TERMSRV/' + host + ' on this PC.', 'Launched: mstsc /v:' + host, 'Inside the session you have EVERYTHING: devmgmt.msc, dfrgui, cleanmgr, wf.msc, ncpa.cpl, services.msc ...', 'When finished, remove the stored credential:  cmdkey /delete:TERMSRV/' + host);
    out.push('(Demo: in the real tool this opens the genuine Windows window on YOUR admin PC. A browser page cannot open desktop windows.)');
    return out;
  }
  Object.keys({ rt_open_computer_management: 1, ac_open_disk_management: 1, ac_open_device_manager: 1, ac_open_services: 1, ac_open_event_viewer: 1, ac_open_shared_folders: 1, ac_open_admin_share: 1, ac_open_firewall: 1, ac_open_remote_shell: 1, ac_open_remote_cmd: 1, ac_open_rdp: 1 })
    .forEach(function (id) { G[id] = function (c) { return ok(consoleLines(id, c.host, c.user), 0.5, { local: true }); }; });

  window.PCAT_OUT = { G: G, consoleIds: Object.keys(MMC).concat(['ac_open_admin_share', 'ac_open_firewall', 'ac_open_remote_shell', 'ac_open_remote_cmd', 'ac_open_rdp']), helpers: { pad: pad, lpad: lpad, ymd: ymd, hms: hms } };
})();
