// Paste the Web app URL from your Apps Script deployment here (it ends in /exec).
// This URL is safe to publish: it only accepts answers, and every admin action
// is checked against the password stored in your Apps Script project.
window.QUIZ_CONFIG = {
  API_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",

  // Team names shown on the first screen.
  TEAMS: ["Team Alpha", "Team Bravo", "Team Charlie", "Team Delta", "Team Echo", "Team Foxtrot"],

  // The phases participants put in order. If you change these, change PHASES in Code.gs too.
  PHASES: [
    "Engagement Checklist", "SD Creation", "Project Plan", "Content Preparation",
    "MNO Content Approval", "MNO Integration Details", "Integration", "Configuration",
    "E2E Testing", "UAT", "Launch"
  ]
};
