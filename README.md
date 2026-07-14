PC Admin & Performance Tool -- Native Python GUI Edition  (v2.1)
================================================================

WHAT'S IN THIS FOLDER
  PCAdminTool.pyw      The complete tool (Tkinter GUI, 36 operations).
  requirements.txt     Just pywinrm -- Tkinter ships with Python itself.
  install_and_run.bat  Double-click: installs pywinrm, then opens the GUI.
  README.txt           This file.

REQUIREMENTS
  - Python 3.9+ installed on the admin workstation (from
    https://www.python.org/downloads/ -- tick "Add to PATH" during
    install; Tkinter is included by default on Windows installers).
  - WinRM enabled on TARGET machines you want to manage:
      Run on each target (as Admin):  Enable-PSRemoting -Force

HOW TO RUN
  1. Copy this whole folder to the admin workstation.
  2. Double-click install_and_run.bat
     (installs pywinrm if missing, then launches the GUI with pythonw
     so no console window stays open).
  3. In the GUI: enter target Hostname/IP, Username, Password, pick
     the Auth Transport, click Test Connection, select tasks, Run.

  Alternatively, once pywinrm is installed, you can just double-click
  PCAdminTool.pyw directly (Windows associates .pyw with pythonw.exe).

LOGS
  Every session writes a timestamped log to:
    PC_Admin_Logs\AdminTool_<hostname>_<timestamp>.log
  (created next to PCAdminTool.pyw)

NOTES
  - Operations marked with "!" are sensitive (may reboot the target,
    interrupt its network, or take many minutes). The tool shows a
    confirmation dialog listing them before running.
  - Same 36 operations, same categories, and the same PowerShell
    command bodies as the Web-Service Edition (app.py) -- this is a
    desktop-native port of that same operation library, no browser
    or server required.

(c) 2024-2026 Abdullah | All Rights Reserved | abuabdullah.be@outlook.com


****
PC Admin & Performance Tool -- Web-Service Edition  (v2.1)****
================================================================
Runs as a standalone network service on PORT 3030. Once started on a
host, anyone on the same allowed subnet can open it from a browser at:

    http://<hosting-machine-IP>:3030

All logs and session files are written LOCALLY on the hosting machine
(the "logs" folder next to app.py) -- not on the client's browser/PC.

WHAT'S IN THIS FOLDER
  app.py                        Flask backend, 36 remote PowerShell operations
  templates/index.html          Web UI (dark theme, category tabs, live log)
  pcadmintool_service.py        Windows Service wrapper (pywin32)
  requirements.txt              Flask, pywinrm, pywin32 (Windows only)
  install_service.bat           Windows / Windows Server: installs as a REAL
                                 Windows Service (shows in services.msc)
  uninstall_service.bat         Windows: stops & removes the service
  run_console_testmode.bat      Windows: quick foreground test run (not a
                                 service -- window must stay open)
  install_and_run.sh            Linux installer + launcher
  pcadmintool.service.template  Linux: optional systemd unit (real service)
  README.txt                    This file

WORKS ON
  - The HOSTING machine (runs this tool): Linux, Windows 10/11, or
    Windows Server 2016+, with Python 3.9+.
  - The TARGET machines it manages: must be Windows, with WinRM enabled
    (run once on each target, as Admin: Enable-PSRemoting -Force).
  - Any CLIENT browser on the same subnet, no install needed there --
    just a browser pointed at http://<hosting-IP>:3030

HOW TO RUN -- Windows / Windows Server  (installs as a real Service)
  1. Copy this folder to the machine that will host the service, e.g.
     C:\PCAdminTool\
  2. Double-click install_service.bat and approve the UAC prompt.
     This installs dependencies, registers "PC Admin & Performance
     Tool - Web Service" in services.msc with Startup Type = Automatic,
     opens firewall port 3030, and starts it immediately.
  3. Open services.msc to confirm -- you'll see it listed, Status
     "Running", Startup type "Automatic". It will keep running in the
     background (no console window) and restart automatically on reboot.
  4. Share the URL with anyone on the same subnet:
        http://<this-machine-IP-or-name>:3030
  5. To stop/remove it later, run uninstall_service.bat.

  Prefer to just test it first without installing a service? Run
  run_console_testmode.bat instead (foreground only, window must stay open).

HOW TO RUN -- Linux
  1. Copy this folder to the host.
  2. chmod +x install_and_run.sh && ./install_and_run.sh
     (or ./install_and_run.sh --daemon to background it)
  3. To install as a real systemd service (auto-start on boot, restart
     on crash, equivalent to the Windows Service above), see
     pcadmintool.service.template.

FIREWALL
  Make sure TCP port 3030 is allowed inbound on the hosting machine so
  other hosts on the subnet can reach it. install_and_run.bat attempts
  this automatically on Windows via netsh; on Linux, open it with your
  distro's firewall tool, e.g.:
    sudo ufw allow 3030/tcp
    sudo firewall-cmd --add-port=3030/tcp --permanent && sudo firewall-cmd --reload

LOGS & FILES
  Every run writes: logs/AdminTool_<hostname>_<timestamp>.log
  on the HOSTING machine (wherever app.py lives), regardless of which
  browser/client triggered the run.

WHY NOT WAITRESS?
  This tool streams live task output to the browser as it runs (Server-
  Sent Events). Werkzeug's threaded server (what app.py uses via
  app.run(..., threaded=True)) flushes each line immediately, which SSE
  needs. Waitress buffers responses before sending, which makes the web
  UI look "stuck" after clicking Run -- so both the service wrapper and
  the console/Linux launchers deliberately run app.py directly instead.

SECURITY NOTE
  Credentials are submitted from the browser to this service over plain
  HTTP by default and used to open a WinRM session to the target. Only
  run this on a trusted, access-controlled subnet, or put it behind
  HTTPS (a reverse proxy such as nginx/IIS with a TLS certificate) for
  anything beyond an isolated internal network.

(c) 2024-2026 Abdullah | All Rights Reserved | abuabdullah.be@outlook.com



PC Admin & Performance Tool -- PowerShell GUI Edition  (v2.7)
================================================================

WHAT'S IN THIS FOLDER
  PCAdminTool.ps1      The complete tool (WinForms GUI, 36 operations).
  Run-AdminTool.bat     Double-click launcher. Requests Administrator
                         rights automatically, then opens the GUI.
  README.txt            This file.

REQUIREMENTS
  - Windows 7 SP1 or later (client running the tool)
  - PowerShell 5.0+ (built in to Windows 7 SP1+/8.1/10/11)
  - Zero external modules / zero installs -- uses only
    System.Windows.Forms and System.Drawing (built in to .NET)
  - WinRM enabled on TARGET machines you want to manage:
      Run on each target (as Admin):  Enable-PSRemoting -Force

HOW TO RUN
  1. Copy this whole folder to the admin workstation.
  2. Double-click Run-AdminTool.bat
  3. Approve the UAC prompt (the tool needs to run elevated so it
     can open outbound PSRemoting sessions with your credentials).
  4. In the GUI: enter target Hostname/IP, Username, Password,
     pick the Auth Transport, click Test Connection, select the
     tasks you want, click Perform / Run.

LOGS
  Every session writes a timestamped log to:
    PC_Admin_Logs\AdminTool_<hostname>_<timestamp>.log
  (created next to PCAdminTool.ps1)

NOTES
  - Operations marked with "!" are sensitive (may reboot the
    target, interrupt its network, or take many minutes). The
    tool shows a confirmation dialog listing them before running.
  - If Run-AdminTool.bat is blocked by SmartScreen ("Windows
    protected your PC"), click "More info" -> "Run anyway" (this
    is expected for unsigned scripts from outside the Store).

(c) 2024-2026 Abdullah | All Rights Reserved | abuabdullah.be@outlook.com
