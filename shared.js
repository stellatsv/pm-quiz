// Helpers shared by the quiz page and the admin page.
(function () {
  const cfg = window.QUIZ_CONFIG;

  // Apps Script accepts a plain-text POST without a CORS preflight.
  async function api(body, timeoutMs = 20000) {
    if (!cfg.API_URL || cfg.API_URL.startsWith("PASTE_")) {
      const e = new Error("not_configured"); e.code = "not_configured"; throw e;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(cfg.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      const data = await res.json();
      if (!data.ok) { const e = new Error(data.error || "error"); e.code = data.error || "error"; throw e; }
      return data;
    } catch (err) {
      if (!err.code) err.code = "network";
      throw err;
    } finally { clearTimeout(t); }
  }

  const $ = id => document.getElementById(id);

  function setMsg(el, text, err) {
    el.hidden = !text; el.textContent = text || ""; el.classList.toggle("err", !!err);
  }

  function summaryList(el, steps) {
    el.innerHTML = "";
    steps.forEach((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="n">${i + 1}</span><span></span><span class="d"></span>`;
      li.children[1].textContent = s.phase;
      li.children[2].textContent = `${s.days} ${s.days === 1 ? "day" : "days"}`;
      el.appendChild(li);
    });
  }

  window.Quiz = { cfg, api, $, setMsg, summaryList };
})();
