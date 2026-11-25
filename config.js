// Paste the Web app URL from your Apps Script deployment here (it ends in /exec).
// This URL is safe to publish: it only accepts answers, and every admin action
// is checked against the password stored in your Apps Script project.
window.QUIZ_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbw4sqbtBSvx5zu1hKkk0Q5vJvvydbgXhI65n1rpntmVnRgtBz4an8DkHBlhXuPU43Tr/exec",

  // Team names shown on the first screen.
  TEAMS: ["PMM", "SA", "NET", "EIT", "DevOps", "Support", "DM", "AM", "Sales", "Pre-Sales", "Management"],

  // How a phase is shown on screen, if different from its name below.
  // Renaming here needs no change to the Apps Script.
  PHASE_LABELS: { "Launch": "Launch Actions", "SD Creation": "Service Description Process", "MNO Integration Details": "MNO Integration Details Provision", "E2E Testing": "Upstream E2E Testing", "UAT": "Customer UAT", "Integration": "External/Internal Integration", "Configuration": "Configuration of Internal Systems (e.g. Dryad, Curry, Icarus etc.)" },

  // The phases participants put in order. The Apps Script accepts whatever is listed here,
  // so you can add or remove phases without redeploying it. After a change, re-save the
  // answer key on the admin page.
  PHASES: [
    "Engagement Checklist", "SD Creation", "Solution Analysis", "Project Plan", "Content Preparation",
    "MNO Content Approval", "MNO Integration Details",
    "System Delivery (Curry, Dryad, Reporting, SecureD)", "Integration", "Configuration",
    "E2E Testing", "UAT", "Launch"
  ]
};
