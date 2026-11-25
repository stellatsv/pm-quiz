# Project Delivery Quiz

A mobile-friendly team quiz: teams put the 11 phases of a project delivery in order and estimate the days each one takes. Answers are saved to a Google Sheet you own, and a password-protected admin page scores and ranks the teams.

- **Quiz (for participants):** `https://<your-username>.github.io/<repo>/`
- **Admin (for you):** `https://<your-username>.github.io/<repo>/admin.html`

No sign-in is needed to take the quiz. The admin password is checked by Google Apps Script, so it never appears in the website code.

## Setup (about 10 minutes)

### 1. Create the answer sheet and its backend
1. Create a new Google Sheet (any name, e.g. "Delivery Quiz Answers").
2. In the Sheet, go to **Extensions → Apps Script**.
3. Delete the starter code and paste in everything from [`apps-script/Code.gs`](apps-script/Code.gs). Save.
4. Go to **Project Settings** (gear icon) → **Script properties** → **Add script property**:
   - Property: `ADMIN_PASSWORD`
   - Value: the password you want for the admin page
5. Select **Deploy → New deployment**, choose type **Web app**, and set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Select **Deploy**, approve the permissions Google asks for, and copy the **Web app URL** (it ends in `/exec`).

### 2. Connect the website
1. Open `config.js` in this repo and replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with the Web app URL.
2. While you're there, change `TEAMS` to your real team names.
3. Commit the change.

### 3. Turn on GitHub Pages
1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. After a minute or two, the site is live at the addresses above.

## Running the quiz
1. Open the admin page, sign in, and fill in **Answer key and scoring** (positions, days, and the sequence/days balance). Save.
2. Share the quiz link with the teams. Answers appear on the admin page within 15 seconds.
3. Select **Close submissions** when time is up. Within about 20 seconds, everyone who submitted sees their personal results: their score and, for each step, whether they had the right position and days, with the correct answer. Anyone who didn't submit sees the correct order.
4. To run it again, select **Start a new round** (clears the board) and **Reopen submissions**.

Every answer is also kept as a row in the **Submissions** tab of your Google Sheet, including earlier rounds.

## Scoring
- **Sequence (per phase):** full credit in the right position, two-thirds if one place off, one-third if two places off, nothing beyond that.
- **Any order blocks:** on the admin page, mark neighbouring steps **Any order** to accept them in any arrangement within their positions. A step placed outside its block is scored by its distance from the nearest edge of the block.
- **Days left blank (TBD)** count for order only.
- **Days (per phase):** credit falls in a straight line with the size of the miss, reaching zero at 100% off. If the answer is 10 days, 15 or 5 earns half credit.
- **Score:** a weighted mix of the two, out of 100. Ties go to the team that submitted first.

## Good to know
- If you edit `Code.gs` later, redeploy with **Deploy → Manage deployments → Edit → Version: New version** so the URL stays the same.
- To change the admin password, update `ADMIN_PASSWORD` in Script properties. No redeploy is needed.
- To add, remove or reorder phases, edit `PHASES` in `config.js` only, then re-save the answer key on the admin page. To rename a phase on screen without affecting saved data, use `PHASE_LABELS`.
- The quiz is open to anyone with the link, and team choice is on the honour system.
