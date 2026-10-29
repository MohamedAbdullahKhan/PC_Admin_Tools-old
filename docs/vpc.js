/* PC Admin & Performance Tool -- live demo
 * vpc.js : the VIRTUAL Windows PC that answers the demo. Everything here runs in the visitor's
 * browser. Nothing is sent to any network. The state persists between runs (set a static IP, then
 * run "Network Adapter & IP Configuration" and you see the new address), and a virtual clock (V.t,
 * seconds) drives the IP-change timeline that the Ping Host monitor observes. */
(function () {
  'use strict';

  var V = { t: 0 };                       // virtual clock, seconds (advanced by engine.vsleep)

  function maskToPrefix(m) {
    var n = 0;
    String(m).split('.').forEach(function (o) {
      var x = parseInt(o, 10);
      while (x) { n += x & 1; x >>= 1; }
    });
    return n;
  }
  function cidrToMask(n) {
    n = parseInt(n, 10);
    var out = [];
    for (var i = 0; i < 4; i++) {
      var b = Math.max(0, Math.min(8, n - 8 * i));
      out.push(256 - Math.pow(2, 8 - b));
    }
    return out.join('.');
  }
  function normMask(raw) {
    raw = String(raw).trim();
    return /^\d{1,2}$/.test(raw) ? cidrToMask(raw) : raw;
  }

  function create() {
    return {
      name: 'DEMO-PC01',
      domainJoined: true,
      domain: 'corp.demo.local',
      workgroup: 'WORKGROUP',
      ssd: true,
      os: 'Microsoft Windows 11 Pro',
      arch: '64-bit',
      version: '10.0.22631',
      build: '22631',
      manufacturer: 'Dell Inc.',
      model: 'OptiPlex 7090',
      cpu: '11th Gen Intel(R) Core(TM) i7-11700 @ 2.50GHz',
      cores: 8, threads: 16, mhz: 2500,
      ramGB: 32,
      bios: 'Dell Inc. v1.18.0', biosDate: '20230814', serial: '7KQ2R93',
      board: 'Dell Inc. 0K3CM7',
      gpu: 'Intel(R) UHD Graphics 750', gpuDriver: '31.0.101.2127',
      bootT: -(3 * 86400 + 5 * 3600 + 12 * 60),      // virtual seconds relative to V.t = 0
      pendingName: null,
      users: ['demo.user', 'admin', 'svc_backup', 'Public'],
      signedIn: ['demo.user'],
      adapters: [
        { name: 'Ethernet', desc: 'Intel(R) Ethernet Connection (14) I219-LM', status: 'Up', mac: '00-1A-2B-3C-4D-5E',
          speed: '1 Gbps', dhcp: false, ip: '192.168.1.50', mask: '255.255.255.0', gw: '192.168.1.1',
          dns: ['192.168.1.10', '8.8.8.8'], sentMB: 18422.6, recvMB: 96310.4, sentPk: 31204411, recvPk: 88412903 },
        { name: 'Wi-Fi', desc: 'Intel(R) Wi-Fi 6 AX201 160MHz', status: 'Disconnected', mac: '8C-8D-28-11-22-33',
          speed: '0 bps', dhcp: true, ip: null, mask: null, gw: null, dns: [], sentMB: 0, recvMB: 0, sentPk: 0, recvPk: 0 }
      ],
      services: [
        { n: 'Spooler', d: 'Print Spooler', s: 'Running', t: 'Automatic' },
        { n: 'wuauserv', d: 'Windows Update', s: 'Running', t: 'Manual' },
        { n: 'BITS', d: 'Background Intelligent Transfer Service', s: 'Running', t: 'Manual' },
        { n: 'W32Time', d: 'Windows Time', s: 'Running', t: 'Manual' },
        { n: 'Dnscache', d: 'DNS Client', s: 'Running', t: 'Automatic' },
        { n: 'Dhcp', d: 'DHCP Client', s: 'Running', t: 'Automatic' },
        { n: 'LanmanServer', d: 'Server', s: 'Running', t: 'Automatic' },
        { n: 'LanmanWorkstation', d: 'Workstation', s: 'Running', t: 'Automatic' },
        { n: 'WinRM', d: 'Windows Remote Management (WS-Management)', s: 'Running', t: 'Automatic' },
        { n: 'EventLog', d: 'Windows Event Log', s: 'Running', t: 'Automatic' },
        { n: 'WSearch', d: 'Windows Search', s: 'Running', t: 'Automatic' },
        { n: 'SysMain', d: 'SysMain', s: 'Running', t: 'Automatic' },
        { n: 'Schedule', d: 'Task Scheduler', s: 'Running', t: 'Automatic' },
        { n: 'MpsSvc', d: 'Windows Defender Firewall', s: 'Running', t: 'Automatic' },
        { n: 'WinDefend', d: 'Microsoft Defender Antivirus Service', s: 'Running', t: 'Automatic' },
        { n: 'Themes', d: 'Themes', s: 'Running', t: 'Automatic' },
        { n: 'TermService', d: 'Remote Desktop Services', s: 'Running', t: 'Manual' },
        { n: 'RemoteRegistry', d: 'Remote Registry', s: 'Stopped', t: 'Disabled' },
        { n: 'Fax', d: 'Fax', s: 'Stopped', t: 'Manual' },
        { n: 'XblAuthManager', d: 'Xbox Live Auth Manager', s: 'Stopped', t: 'Manual' },
        { n: 'CcmExec', d: 'SMS Agent Host', s: 'Running', t: 'Automatic' },
        { n: 'MSSQLSERVER', d: 'SQL Server (MSSQLSERVER)', s: 'Running', t: 'Automatic' },
        { n: 'vmms', d: 'Hyper-V Virtual Machine Management', s: 'Stopped', t: 'Manual' }
      ],
      vss: { C: { used: 18.2, alloc: 20.1, max: '10%', copies: 3 }, D: { used: 0, alloc: 0, max: 'UNBOUNDED', copies: 0 } },
      drives: {},                                      // { 'CORP\\demo.user': { Z: '\\\\fs01\\shared' } }
      tasks: [
        { path: '\\Microsoft\\Windows\\WindowsUpdate\\', name: 'Scheduled Start', state: 'Ready', last: '2026-10-28 03:00', next: '2026-10-29 03:00' },
        { path: '\\', name: 'Backup-Nightly', state: 'Ready', last: '2026-10-28 23:30', next: '2026-10-29 23:30' },
        { path: '\\', name: 'GoogleUpdateTaskMachineCore', state: 'Ready', last: '2026-10-28 09:14', next: '2026-10-29 09:14' }
      ],
      // IP-change timeline for the Ping Host monitor: [{from, ip}] ip === null means "link down"
      line: [{ from: -1e9, ip: '192.168.1.50' }],
      dnsRegIp: '192.168.1.50', dnsOldIp: '192.168.1.50', dnsRegFrom: -1e9,
      offlineUntil: -1,                                // reboot window (virtual seconds)
      log: []
    };
  }

  var vpc = create();

  function adapter(name) {
    var n = String(name).toLowerCase();
    for (var i = 0; i < vpc.adapters.length; i++) if (vpc.adapters[i].name.toLowerCase() === n) return vpc.adapters[i];
    return null;
  }
  function liveIp(t) {
    if (t === undefined) t = V.t;
    if (t < vpc.offlineUntil) return null;
    var cur = null;
    for (var i = 0; i < vpc.line.length; i++) if (vpc.line[i].from <= t) cur = vpc.line[i];
    return cur ? cur.ip : null;
  }
  function dnsIp(t) {
    if (t === undefined) t = V.t;
    return vpc.dnsRegFrom <= t ? vpc.dnsRegIp : vpc.dnsOldIp;
  }
  function isIpv4(s) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(s)); }
  function fqdn() { return vpc.domainJoined ? (vpc.name + '.' + vpc.domain).toLowerCase() : vpc.name.toLowerCase(); }
  function isMyName(h) {
    h = String(h).toLowerCase();
    return h === vpc.name.toLowerCase() || h === fqdn();
  }
  /** What a name resolves to right now (null = DNS has no answer). */
  function resolve(host, t) {
    if (isIpv4(host)) return host;
    if (!isMyName(host)) return null;
    return dnsIp(t);
  }
  /** Does a ping / WinRM connect to this address succeed right now? */
  function answers(addr, t) {
    var ip = isIpv4(addr) ? addr : resolve(addr, t);
    if (!ip) return false;
    return liveIp(t) === ip;
  }
  /** Schedule an address change as the real network stack would: instant config, short link flap. */
  function changeAddress(newIp, opts) {
    opts = opts || {};
    var oldIp = liveIp();
    var at = V.t + (opts.delay === undefined ? 2 : opts.delay);
    var gap = opts.gap === undefined ? 4 : opts.gap;
    vpc.line.push({ from: at, ip: null });
    vpc.line.push({ from: at + gap, ip: newIp });
    vpc.dnsOldIp = vpc.dnsRegIp;                 // the name keeps pointing at the old IP until it re-registers
    vpc.dnsRegIp = newIp;
    vpc.dnsRegFrom = at + gap + (opts.dnsLag === undefined ? 10 : opts.dnsLag);
    return { oldIp: oldIp, downAt: at, upAt: at + gap };
  }
  function reboot(secondsDown) {
    vpc.offlineUntil = V.t + secondsDown;
    vpc.bootT = V.t + secondsDown;
    if (vpc.pendingName) { vpc.name = vpc.pendingName; vpc.pendingName = null; }
  }
  function uptimeSeconds() { return Math.max(0, Math.round(V.t - vpc.bootT)); }
  function reset() { vpc = create(); return vpc; }

  window.PCAT_VPC = {
    V: V,
    get: function () { return vpc; },
    reset: reset,
    adapter: adapter,
    liveIp: liveIp,
    dnsIp: dnsIp,
    resolve: resolve,
    answers: answers,
    isIpv4: isIpv4,
    isMyName: isMyName,
    fqdn: fqdn,
    changeAddress: changeAddress,
    reboot: reboot,
    uptimeSeconds: uptimeSeconds,
    maskToPrefix: maskToPrefix,
    cidrToMask: cidrToMask,
    normMask: normMask
  };
})();
