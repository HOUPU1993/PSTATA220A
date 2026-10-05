// Shared page behavior: theme toggle, TOC highlight, projection demo.
(function () {
  // Theme toggle (remembered per browser if storage works)
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) {}
  const btn = document.createElement("button");
  btn.className = "theme-toggle";
  btn.type = "button";
  btn.textContent = "切换深/浅色";
  btn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
  document.body.appendChild(btn);

  // Highlight current section in TOC
  const links = Array.from(document.querySelectorAll("nav.toc ol a"));
  if (links.length && "IntersectionObserver" in window) {
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          links.forEach(a => a.classList.remove("active"));
          const a = map.get(en.target.id);
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "0px 0px -70% 0px" });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
  }

  // Projection demo: project y onto span{x} in R^2
  const svg = document.getElementById("proj-demo");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const S = 40;                      // pixels per unit
  const toPx = v => [v[0] * S, -v[1] * S];
  const state = { x: [3, 1], y: [1, 3] };

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  const g = el("g", {});
  svg.appendChild(g);

  function arrow(v, from, color, width, dash) {
    const [x1, y1] = toPx(from), [x2, y2] = toPx([from[0] + v[0], from[1] + v[1]]);
    const line = el("line", { x1, y1, x2, y2, stroke: color, "stroke-width": width,
      "marker-end": "url(#ah-" + color.replace(/[^a-z]/gi, "") + ")" });
    if (dash) line.setAttribute("stroke-dasharray", dash);
    return line;
  }

  function draw() {
    const css = getComputedStyle(document.documentElement);
    const cY = css.getPropertyValue("--vec-y").trim();
    const cH = css.getPropertyValue("--vec-hat").trim();
    const cP = css.getPropertyValue("--vec-perp").trim();
    const cM = css.getPropertyValue("--muted").trim();
    const cB = css.getPropertyValue("--border").trim();
    g.innerHTML = "";

    const defs = el("defs", {});
    [cY, cH, cP, cM].forEach(c => {
      const m = el("marker", { id: "ah-" + c.replace(/[^a-z]/gi, ""), viewBox: "0 0 10 10",
        refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
      m.appendChild(el("path", { d: "M0,0 L10,5 L0,10 z", fill: c }));
      defs.appendChild(m);
    });
    g.appendChild(defs);

    // grid + axes
    for (let i = -6; i <= 6; i++) {
      g.appendChild(el("line", { x1: i * S, y1: -6 * S, x2: i * S, y2: 6 * S, stroke: cB, "stroke-width": i === 0 ? 1.5 : 0.5 }));
      g.appendChild(el("line", { x1: -6 * S, y1: i * S, x2: 6 * S, y2: i * S, stroke: cB, "stroke-width": i === 0 ? 1.5 : 0.5 }));
    }

    const x = state.x, y = state.y;
    const xx = x[0] * x[0] + x[1] * x[1];
    const c = (x[0] * y[0] + x[1] * y[1]) / xx;
    const yhat = [c * x[0], c * x[1]];
    const yperp = [y[0] - yhat[0], y[1] - yhat[1]];

    // span{x}: a long line through the origin
    const L = 20 / Math.sqrt(xx);
    const [a1, b1] = toPx([-L * x[0], -L * x[1]]), [a2, b2] = toPx([L * x[0], L * x[1]]);
    g.appendChild(el("line", { x1: a1, y1: b1, x2: a2, y2: b2, stroke: cH, "stroke-width": 6, opacity: 0.18 }));

    g.appendChild(arrow(x, [0, 0], cM, 2.5));
    g.appendChild(arrow(yhat, [0, 0], cH, 4));
    g.appendChild(arrow(yperp, yhat, cP, 3, "6 4"));
    g.appendChild(arrow(y, [0, 0], cY, 3));

    const label = (txt, v, color, dy) => {
      const [px, py] = toPx(v);
      const t = el("text", { x: px + 8, y: py + (dy || -8), fill: color, "font-size": 16, "font-weight": 700 });
      t.textContent = txt;
      g.appendChild(t);
    };
    label("x", x, cM);
    label("y", y, cY);
    label("ŷ = Py", yhat, cH, 22);

    // drag handles
    [["x", x, cM], ["y", y, cY]].forEach(([key, v, color]) => {
      const [px, py] = toPx(v);
      const h = el("circle", { cx: px, cy: py, r: 11, fill: color, opacity: 0.35, style: "cursor:grab" });
      h.dataset.key = key;
      g.appendChild(h);
    });

    const f = n => (Math.abs(n) < 5e-3 ? 0 : n).toFixed(2);
    document.getElementById("proj-readout").innerHTML =
      "y = (" + f(y[0]) + ", " + f(y[1]) + ")　ŷ = (" + f(yhat[0]) + ", " + f(yhat[1]) +
      ")　y⊥ = (" + f(yperp[0]) + ", " + f(yperp[1]) + ")<br>x′y⊥ = " +
      f(x[0] * yperp[0] + x[1] * yperp[1]) + "（永远是 0：残差和 x 垂直）";
  }

  let dragging = null;
  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [Math.max(-5.8, Math.min(5.8, p.x / S)), Math.max(-5.8, Math.min(5.8, -p.y / S))];
  }
  svg.addEventListener("pointerdown", e => {
    const k = e.target.dataset && e.target.dataset.key;
    if (k) { dragging = k; svg.setPointerCapture(e.pointerId); }
  });
  svg.addEventListener("pointermove", e => {
    if (!dragging) return;
    const p = svgPoint(e);
    if (dragging === "x" && Math.hypot(p[0], p[1]) < 0.5) return; // keep x nonzero
    state[dragging] = p;
    draw();
  });
  svg.addEventListener("pointerup", () => { dragging = null; });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  draw();
})();
