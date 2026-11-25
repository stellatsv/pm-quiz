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
  const label = p => (cfg.PHASE_LABELS && cfg.PHASE_LABELS[p]) || p;

  function setMsg(el, text, err) {
    el.hidden = !text; el.textContent = text || ""; el.classList.toggle("err", !!err);
  }

  function summaryList(el, steps) {
    el.innerHTML = "";
    steps.forEach((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="n">${i + 1}</span><span></span><span class="d"></span>`;
      li.children[1].textContent = label(s.phase);
      li.children[2].textContent = `${s.days} ${s.days === 1 ? "day" : "days"}`;
      el.appendChild(li);
    });
  }


  // Drag-to-reorder for a list of .step rows with a .grip handle and a .num label.
  // Calls onChange() after every move (drop or arrow key).
  function makeSortable(ol, onChange) {
    /* Pointer drag: mouse, touch and pen.
       The held step is lifted out of the list (position:fixed) and follows the pointer exactly;
       a placeholder holds its slot, and the other steps slide out of the way. */
    let drag=null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function startDrag(e,li,grip){
      if(drag || (e.button!==undefined && e.button!==0)) return;
      e.preventDefault();
      try{ grip.setPointerCapture(e.pointerId); }catch(err){}
      const r=li.getBoundingClientRect();
      const ph=document.createElement("li");
      ph.className="step-placeholder"; ph.style.height=r.height+"px";
      ol.insertBefore(ph,li);
      Object.assign(li.style,{position:"fixed",left:r.left+"px",top:r.top+"px",width:r.width+"px",margin:"0"});
      li.classList.add("dragging");
      document.body.classList.add("is-dragging");
      drag={li,grip,ph,ol,id:e.pointerId,offsetY:e.clientY-r.top,top:r.top,pointerY:e.clientY,raf:0,lastIndex:-1};
      grip.addEventListener("pointermove",onDrag);
      grip.addEventListener("pointerup",endDrag);
      grip.addEventListener("pointercancel",endDrag);
      grip.addEventListener("lostpointercapture",endDrag);
      drag.raf=requestAnimationFrame(tick);
    }

    function onDrag(e){
      if(!drag || e.pointerId!==drag.id) return;
      e.preventDefault();
      drag.pointerY=e.clientY;
    }

    // Runs every frame while dragging: position the card, auto-scroll, reorder.
    function tick(){
      if(!drag) return;
      update(true);
      drag.raf=requestAnimationFrame(tick);
    }
    function update(scroll){
      const {li,ph,ol}=drag;
      // Keep the card inside the list area
      const listR=ol.getBoundingClientRect(), h=li.offsetHeight;
      let top=drag.pointerY-drag.offsetY;
      top=Math.max(listR.top-h/2, Math.min(listR.bottom-h/2, top));
      drag.top=top;
      li.style.top=top+"px";

      // Auto-scroll when the pointer is near the top, or near the sticky footer
      const foot=document.querySelector(".foot");
      const bottomEdge=foot ? foot.getBoundingClientRect().top : window.innerHeight;
      const zone=80, y=drag.pointerY;
      let speed=0;
      if(y<zone) speed=-Math.ceil((zone-y)/zone*14);
      else if(y>bottomEdge-zone) speed=Math.ceil((y-(bottomEdge-zone))/zone*14);
      if(speed && scroll) window.scrollBy(0,speed);

      // Find the slot under the card's centre
      const others=[...ol.children].filter(n=>n!==li && n!==ph);
      // Use layout positions (offsetTop), not animated ones, so sliding steps don't cause flicker
      // Swap at half overlap: moving up, the card's top edge passes a step's midpoint;
      // moving down, its bottom edge does.
      const base=ph.getBoundingClientRect().top-ph.offsetTop;
      const midOf=n=>base+n.offsetTop+n.offsetHeight/2;
      let target;
      if(top < base+ph.offsetTop){
        target=others.find(n=>top < midOf(n)) || null;
      } else {
        const bottom=top+h;
        let last=-1; others.forEach((n,i)=>{ if(bottom > midOf(n)) last=i; });
        target=others[last+1] || null;
      }
      let next=ph.nextElementSibling; if(next===li) next=li.nextElementSibling;
      if(next!==target) moveWithAnimation(()=>ol.insertBefore(ph,target), others);
    }

    // FLIP: measure, move, then animate each sibling from its old spot to the new one.
    function moveWithAnimation(mutate, nodes){
      const before=new Map(nodes.map(n=>[n,n.getBoundingClientRect().top]));
      mutate();
      if(reduceMotion) { renumberLive(); return; }
      nodes.forEach(n=>{
        const dy=before.get(n)-n.getBoundingClientRect().top;
        if(!dy) return;
        n.style.transition="none";
        n.style.transform=`translateY(${dy}px)`;
        n.getBoundingClientRect();
        n.style.transition="transform .18s cubic-bezier(.2,.7,.3,1)";
        n.style.transform="";
      });
      renumberLive();
      if(navigator.vibrate) { try{ navigator.vibrate(4); }catch(e){} }
    }

    // Show the numbers the steps would have if dropped now.
    function renumberLive(){
      if(!drag) return;
      let i=0;
      [...drag.ol.children].forEach(n=>{
        if(n===drag.li) return;
        const target = n===drag.ph ? drag.li : n;
        target.querySelector(".num").textContent=++i;
      });
    }

    function endDrag(e){
      if(!drag || (e && e.pointerId!==undefined && e.pointerId!==drag.id)) return;
      const {li,grip,ph,ol}=drag;
      cancelAnimationFrame(drag.raf);
      if(e && e.type==="pointerup" && e.clientY!==undefined){ drag.pointerY=e.clientY; }
      update(false); // settle on the slot under the final pointer position
      grip.removeEventListener("pointermove",onDrag);
      grip.removeEventListener("pointerup",endDrag);
      grip.removeEventListener("pointercancel",endDrag);
      grip.removeEventListener("lostpointercapture",endDrag);
      try{ grip.releasePointerCapture(drag.id); }catch(err){}
      drag=null;

      const finish=()=>{
        ol.insertBefore(li,ph); ph.remove();
        li.classList.remove("dragging","dropping");
        Object.assign(li.style,{position:"",left:"",top:"",width:"",margin:"",transition:"",transform:""});
        [...ol.children].forEach(n=>{ n.style.transition=""; n.style.transform=""; });
        document.body.classList.remove("is-dragging");
        onChange();
      };
      if(reduceMotion){ finish(); return; }
      // Glide the card into its slot, then drop it in
      const target=ph.getBoundingClientRect().top;
      li.classList.add("dropping");
      li.style.transition="top .16s cubic-bezier(.2,.7,.3,1)";
      li.style.top=target+"px";
      let done=false;
      const once=()=>{ if(done) return; done=true; finish(); };
      li.addEventListener("transitionend",once,{once:true});
      setTimeout(once,220);
    }

    ol.addEventListener("pointerdown", e => {
      const grip = e.target.closest(".grip");
      if (grip && ol.contains(grip)) startDrag(e, grip.closest("li"), grip);
    });
    ol.addEventListener("keydown", e => {
      const grip = e.target.closest(".grip"); if (!grip || !ol.contains(grip)) return;
      const li = grip.closest("li");
      if (e.key === "ArrowUp" && li.previousElementSibling) { e.preventDefault(); ol.insertBefore(li, li.previousElementSibling); onChange(); grip.focus(); }
      if (e.key === "ArrowDown" && li.nextElementSibling) { e.preventDefault(); ol.insertBefore(li.nextElementSibling, li); onChange(); grip.focus(); }
    });
  }

  const GRIP = '<svg viewBox="0 0 14 20" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="2"/><circle cx="11" cy="3" r="2"/><circle cx="3" cy="10" r="2"/><circle cx="11" cy="10" r="2"/><circle cx="3" cy="17" r="2"/><circle cx="11" cy="17" r="2"/></svg>';

  /* ---------- Scoring (same on the admin page and the participant results page) ---------- */
  // The range of correct positions (0-based) for a phase: one slot, or a whole
  // "any order" block when the phase belongs to one of the key's groups.
  function block(p, k) {
    const ci = k.order.indexOf(p); if (ci < 0) return null;
    const g = (k.groups || []).find(g => g.includes(p));
    if (!g) return { lo: ci, hi: ci };
    const idx = g.map(q => k.order.indexOf(q)).filter(i => i >= 0);
    return { lo: Math.min(...idx), hi: Math.max(...idx) };
  }
  const posLabel = b => b.lo === b.hi ? `#${b.lo + 1}` : `#${b.lo + 1}–${b.hi + 1}`;

  function stepResult(st, gi, k) {
    const b = block(st.phase, k); if (!b) return null;
    const dist = gi < b.lo ? b.lo - gi : gi > b.hi ? gi - b.hi : 0;
    const c = k.days[st.phase], timed = Number.isInteger(c);
    const daysCredit = !timed ? null : c === 0 ? (st.days === 0 ? 1 : 0) : Math.max(0, 1 - Math.abs(st.days - c) / c);
    return { b, dist, orderCredit: Math.max(0, 1 - dist / 3), c, timed, daysCredit, daysOk: !timed || st.days === c };
  }

  function scoreSub(s, k) {
    const steps = s.steps || [], n = k.order.length;
    // Steps with days left blank (TBD) count for order only.
    const timed = k.order.filter(p => Number.isInteger(k.days[p])).length;
    let o = 0, d = 0;
    steps.forEach((st, gi) => {
      const r = stepResult(st, gi, k); if (!r) return;
      o += r.orderCredit;
      if (r.timed) d += r.daysCredit;
    });
    const orderPct = o / n * 100, daysPct = timed ? d / timed * 100 : 0;
    const w = timed ? (k.orderWeight ?? 50) / 100 : 1;
    return { orderPct, daysPct, total: w * orderPct + (1 - w) * daysPct };
  }

  window.Quiz = { cfg, api, $, setMsg, summaryList, label, makeSortable, GRIP, block, posLabel, stepResult, scoreSub };
})();
