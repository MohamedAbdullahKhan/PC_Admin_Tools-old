# GitHub Live Demo - Setup Guide (v19 demo site)

Goal: visitors open **https://mohamedabdullahkhan.github.io/PC-AdminTools/** and use the tool's pages, options and functions live in their browser.
The demo is a **simulation** (a virtual Windows PC inside the page). Nothing is installed, nothing is sent anywhere.

## PART A - Put the demo into your repository (no tools needed, browser only)

1. Unzip `PC-AdminTools-GitHub-Demo-v19.zip` on your computer. You get a folder named **docs** (plus this guide).
   - If you cannot see a file called `.nojekyll` inside `docs`, that is normal (names starting with a dot are hidden). It is there.
2. Open https://github.com/MohamedAbdullahKhan/PC-AdminTools and sign in.
3. Click **Add file** -> **Upload files**.
4. Open the unzipped **docs** folder, select **everything inside it** (index.html, style.css, 5 .js files, .nojekyll) and drag it into the GitHub page.
   - Important: they must end up inside a folder called `docs` in the repo. To do that: on the GitHub page, instead of dropping files, drag the whole **docs folder** itself onto the upload area. GitHub keeps the folder.
   - If `.nojekyll` did not upload (hidden file): click **Add file** -> **Create new file**, type `docs/.nojekyll` as the name, leave the content empty, click **Commit changes**.
5. Scroll down, write a message such as `Add live demo`, choose **Commit directly to the main branch**, click **Commit changes**.

## PART B - Turn on GitHub Pages

1. In the repository click **Settings** (top row of tabs).
2. In the left menu click **Pages**.
3. Under **Build and deployment** -> **Source** choose **Deploy from a branch**.
4. Under **Branch** choose **main** and the folder **/docs**, then click **Save**.
5. Wait 1-3 minutes, refresh the Pages screen. It shows: *Your site is live at https://mohamedabdullahkhan.github.io/PC-AdminTools/*
6. Open the link. You should see "Remote Windows admin, try it live". Click **Open the live demo**.

If you get a 404: wait 2 more minutes; check that `docs/index.html` exists on the main branch and that Pages points to main + /docs. (The Pages option is also unavailable for private repos on a free GitHub plan - make the repository public, or upgrade.)

## PART C - Link it from your README

Add this at the top of the repository's README.md:

```
[![Live demo](https://img.shields.io/badge/Live%20demo-try%20it%20in%20your%20browser-1d4ed8)](https://mohamedabdullahkhan.github.io/PC-AdminTools/)
```

## PART D - Test it on your own PC before uploading (optional)

1. Install Python 3 (python.org, tick "Add python.exe to PATH").
2. Open a terminal in the unzipped folder and run: `python -m http.server 3040 --directory docs`
   (3040 is the next free port after 3039. If it is in use, try 3041.)
3. Open http://localhost:3040 in your browser. Press Ctrl+C in the terminal to stop.

## How visitors use it (what to tell them)

1. Click a **scenario** button (for example *Change IP safely: Push + Ping*), or tick tasks yourself in the left list.
2. Press **RUN SELECTED TASKS**, confirm the warning, and watch the colour-coded log.
3. The **Virtual PC** bar shows the pretend PC changing (IP, link, DNS, uptime). Press **STOP** to end Ping Host.
4. Click **</> PowerShell** under any task to read the real script it would send.
5. **Demo speed** (Slow/Normal/Fast) and **Reset virtual PC** are in the right panel.
- Demo connection: host `192.168.1.50` or `DEMO-PC01`, any username/password.

## Updating later
Replace the files in `docs/` (Add file -> Upload files -> same names overwrite). The site refreshes in 1-3 minutes. If the real tool gains/changes tasks, regenerate `docs/ops-data.js` (see the reference MD, section "Regenerating ops-data.js").

## Honest limits
- Simulated output; numbers are random, wording follows the real tool. Admin Console tasks only describe what they would open.
- The page makes no network calls (strict Content-Security-Policy) and contains no contact details.
