const ELEMENTS = [...DATA_1, ...DATA_2].map(r => ({
  z: r[0], sym: r[1], zh: r[2], en: r[3], cat: r[4], row: r[5], col: r[6], raw: r
}));
const EL_BY_Z = Object.fromEntries(ELEMENTS.map(e => [e.z, e]));

const state = {
  propKey: "eneg",
  mode: "chroma",      // "chroma" | "depth" | "dual" | "cat"
  chromaMap: "turbo",
  depthMap: "cyan",
  invert: false,
  relief3d: false,
  scale: "linear",     // "linear" | "log"
  selectedZ: 9,
  filterCat: -1,
  query: "",
  light: false
};

function currentProp() { return PROPS.find(p => p.key === state.propKey); }

function getStats(prop) {
  const vals = ELEMENTS.map(e => e.raw[prop.idx]).filter(v => v !== null && v !== undefined && !Number.isNaN(v));
  const posVals = vals.filter(v => v > 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const logMin = posVals.length ? Math.min(...posVals) : 1e-4;
  const sorted = [...vals].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  return { min, max, logMin, med, count: vals.length };
}

function normVal(val, stats) {
  if (val === null || val === undefined) return null;
  let t;
  if (state.scale === "log") {
    const safeV = Math.max(val, stats.logMin);
    const a = Math.log10(stats.logMin), b = Math.log10(Math.max(stats.max, stats.logMin * 10));
    t = b === a ? 0.5 : (Math.log10(safeV) - a) / (b - a);
  } else {
    t = stats.max === stats.min ? 0.5 : (val - stats.min) / (stats.max - stats.min);
  }
  t = Math.max(0, Math.min(1, t));
  return state.invert ? 1 - t : t;
}

function colorForT(t) {
  if (state.mode === "depth") {
    const dm = DEPTH_MAPS[state.depthMap];
    return interpStops(state.light ? dm.stopsLight : dm.stopsDark, t);
  }
  return interpStops(CHROMA_MAPS[state.chromaMap].stops, t);
}

const cellDom = {};

function buildGrid() {
  const grid = document.getElementById("ptGrid");
  grid.innerHTML = "";
  for (let c = 1; c <= 18; c++) {
    const d = document.createElement("div");
    d.className = "axis-lbl";
    d.style.gridRow = "1"; d.style.gridColumn = String(c + 1);
    d.textContent = c;
    grid.appendChild(d);
  }
  for (let r = 1; r <= 7; r++) {
    const d = document.createElement("div");
    d.className = "axis-lbl";
    d.style.gridRow = String(r + 1); d.style.gridColumn = "1";
    d.textContent = r;
    grid.appendChild(d);
  }
  const fLabels = [{ row: 9, txt: "镧系" }, { row: 10, txt: "锕系" }];
  fLabels.forEach(fl => {
    const d = document.createElement("div");
    d.className = "axis-lbl";
    d.style.gridRow = String(fl.row + 1); d.style.gridColumn = "1 / 4";
    d.textContent = fl.txt;
    grid.appendChild(d);
  });
  const slots = [
    { r: 6, c: 3, label: "57-71", sub: "La-Lu", cat: 8 },
    { r: 7, c: 3, label: "89-103", sub: "Ac-Lr", cat: 9 }
  ];
  slots.forEach(s => {
    const d = document.createElement("div");
    d.className = "f-slot";
    d.style.gridRow = String(s.r + 1); d.style.gridColumn = String(s.c + 1);
    d.innerHTML = `<strong>${s.label}</strong><span>${s.sub}</span>`;
    d.onclick = () => { state.filterCat = state.filterCat === s.cat ? -1 : s.cat; renderAll(); };
    grid.appendChild(d);
  });
  ELEMENTS.forEach(el => {
    const cell = document.createElement("div");
    cell.className = "el-cell";
    cell.style.gridRow = String(el.row + 1);
    cell.style.gridColumn = String(el.col + 1);
    cell.innerHTML = `
      <div class="el-top"><span>${el.z}</span><span class="el-cat-dot"></span></div>
      <div class="el-mid"><span class="el-sym">${el.sym}</span><span class="el-zh">${el.zh}</span></div>
      <div class="el-val">--</div>
      <div class="depth-fill-bar" style="width:0%"></div>`;
    cell.addEventListener("mouseenter", () => onHoverElement(el));
    cell.addEventListener("mouseleave", () => hideLegendPointer());
    cell.addEventListener("click", () => { state.selectedZ = el.z; renderAll(); });
    grid.appendChild(cell);
    cellDom[el.z] = cell;
  });
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function renderAll() {
  const prop = currentProp();
  const stats = getStats(prop);
  const use3d = state.relief3d || state.mode === "dual";
  document.getElementById("ptPerspective").classList.toggle("relief-3d", use3d);

  const q = state.query.trim().toLowerCase();
  ELEMENTS.forEach(el => {
    const cell = cellDom[el.z];
    const val = el.raw[prop.idx];
    const t = normVal(val, stats);
    const valNode = cell.querySelector(".el-val");
    const barNode = cell.querySelector(".depth-fill-bar");

    const matchQ = !q || el.sym.toLowerCase().includes(q) || el.zh.includes(q) || el.en.toLowerCase().includes(q) || String(el.z) === q;
    const matchCat = state.filterCat === -1 || el.cat === state.filterCat;
    cell.classList.toggle("dimmed", !(matchQ && matchCat));
    cell.classList.toggle("selected", el.z === state.selectedZ);

    if (state.mode === "cat") {
      cell.classList.remove("no-data");
      const rgb = hexToRgb(CATS[el.cat].color);
      cell.style.background = rgbStr(rgb);
      cell.style.color = textContrast(rgb);
      cell.style.transform = "";
      cell.style.boxShadow = "";
      valNode.textContent = val !== null ? prop.fmt(val) : "—";
      barNode.style.width = "0%";
      return;
    }

    if (t === null) {
      cell.classList.add("no-data");
      cell.style.background = "";
      cell.style.color = "var(--muted)";
      cell.style.transform = "";
      cell.style.boxShadow = "";
      valNode.textContent = "暂无";
      barNode.style.width = "0%";
    } else {
      cell.classList.remove("no-data");
      const rgb = colorForT(t);
      cell.style.background = rgbStr(rgb);
      cell.style.color = textContrast(rgb);
      valNode.textContent = prop.fmt(val);
      barNode.style.width = state.mode === "depth" ? `${Math.round(t * 100)}%` : "0%";
      if (use3d) {
        const zLift = Math.round(t * 28);
        const shade = `rgb(${Math.max(0,rgb[0]-55)},${Math.max(0,rgb[1]-55)},${Math.max(0,rgb[2]-55)})`;
        cell.style.transform = `translateZ(${zLift}px) translateY(${-Math.round(t * 6)}px)`;
        cell.style.boxShadow = `0 ${Math.max(2, Math.round(t * 9))}px 0 ${shade}, 0 ${Math.round(t * 16 + 4)}px 14px rgba(0,0,0,0.42)`;
      } else {
        cell.style.transform = "";
        cell.style.boxShadow = "";
      }
    }
  });

  renderLegend(prop, stats);
  renderDetail(EL_BY_Z[state.selectedZ], prop, stats);
  syncToolbarUI();
}

function renderLegend(prop, stats) {
  document.getElementById("propName").textContent = `${prop.name} (${prop.unit})`;
  document.getElementById("propDesc").textContent = prop.desc;
  const track = document.getElementById("gradTrack");
  const ticks = document.getElementById("gradTicks");
  if (state.mode === "cat") {
    track.style.background = `linear-gradient(90deg, ${CATS.map(c => c.color).join(",")})`;
    ticks.innerHTML = `<span>元素化学族分类着色模式（点击右侧图例可筛选单族）</span>`;
    document.getElementById("statSummary").innerHTML = `有效数据：<strong>${stats.count}</strong> / 118 元素`;
    return;
  }
  const samples = [];
  for (let i = 0; i <= 20; i++) samples.push(rgbStr(colorForT(i / 20)));
  track.style.background = `linear-gradient(90deg, ${samples.join(",")})`;
  const tickVals = [0, 0.25, 0.5, 0.75, 1].map(p => {
    const tp = state.invert ? 1 - p : p;
    if (state.scale === "log") {
      const a = Math.log10(stats.logMin), b = Math.log10(Math.max(stats.max, stats.logMin * 10));
      return prop.fmt(Math.pow(10, a + tp * (b - a)));
    }
    return prop.fmt(stats.min + tp * (stats.max - stats.min));
  });
  ticks.innerHTML = tickVals.map(v => `<span>${v}</span>`).join("");
  document.getElementById("statSummary").innerHTML =
    `范围：<strong>${prop.fmt(stats.min)}</strong> ~ <strong>${prop.fmt(stats.max)}</strong> ${prop.unit}<br>中位数：<strong>${prop.fmt(stats.med)}</strong> · 有效值 ${stats.count}/118`;
}

function onHoverElement(el) {
  const prop = currentProp();
  const stats = getStats(prop);
  const val = el.raw[prop.idx];
  const ptr = document.getElementById("gradPointer");
  if (val !== null && state.mode !== "cat") {
    const t = normVal(val, stats);
    ptr.style.left = `${(t * 100).toFixed(1)}%`;
    ptr.style.opacity = "1";
    ptr.querySelector("span").textContent = `${el.sym} ${prop.fmt(val)}`;
  } else {
    ptr.style.opacity = "0";
  }
  renderDetail(el, prop, stats);
}

function hideLegendPointer() {
  document.getElementById("gradPointer").style.opacity = "0";
  const prop = currentProp();
  renderDetail(EL_BY_Z[state.selectedZ], prop, getStats(prop));
}

function drawSparkline(svgId, list, activeZ, prop) {
  const svg = document.getElementById(svgId);
  const pts = list.filter(e => e.raw[prop.idx] !== null);
  if (pts.length < 2) {
    svg.innerHTML = `<text x="50%" y="38" text-anchor="middle" fill="var(--muted)" font-size="11">有效数据点不足</text>`;
    return;
  }
  const vals = pts.map(e => e.raw[prop.idx]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const W = 280, H = 62, padX = 12, padY = 10;
  const coords = pts.map((e, i) => {
    const x = padX + (i / (pts.length - 1)) * (W - padX * 2);
    const ratio = max === min ? 0.5 : (e.raw[prop.idx] - min) / (max - min);
    const y = H - padY - ratio * (H - padY * 2);
    return { e, x, y };
  });
  const poly = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const circles = coords.map(c => {
    const isCur = c.e.z === activeZ;
    return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isCur ? 4.5 : 2.4}" fill="${isCur ? "#facc15" : "var(--accent)"}" stroke="${isCur ? "#000" : "none"}" stroke-width="1"/>` +
           (isCur ? `<text x="${c.x.toFixed(1)}" y="${Math.max(10, c.y - 7).toFixed(1)}" text-anchor="middle" fill="var(--text)" font-size="9.5" font-weight="700">${c.e.sym}</text>` : "");
  }).join("");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `<polyline fill="none" stroke="var(--accent)" stroke-width="1.8" points="${poly}" opacity="0.85"/>${circles}`;
}

function renderDetail(el, activeProp, activeStats) {
  const tile = document.getElementById("heroTile");
  const val = el.raw[activeProp.idx];
  const t = normVal(val, activeStats);
  if (state.mode === "cat" || t === null) {
    const rgb = hexToRgb(CATS[el.cat].color);
    tile.style.background = rgbStr(rgb);
    tile.style.color = textContrast(rgb);
  } else {
    const rgb = colorForT(t);
    tile.style.background = rgbStr(rgb);
    tile.style.color = textContrast(rgb);
  }
  tile.innerHTML = `<span class="hz">${el.z}</span><span class="hsym">${el.sym}</span><span class="hzh">${el.zh}</span>`;
  const periodNum = el.row === 9 ? 6 : (el.row === 10 ? 7 : el.row);
  const groupTxt = el.row >= 9 ? (el.row === 9 ? "镧系 (f区)" : "锕系 (f区)") : `第 ${el.col} 族`;
  document.getElementById("heroInfo").innerHTML = `
    <div style="font-size:15px;font-weight:700">${el.zh} · ${el.en}</div>
    <div style="font-size:12px;color:var(--muted);margin-top:2px">${CATS[el.cat].name} ｜ 第 ${periodNum} 周期 · ${groupTxt}</div>
    <div style="font-size:12px;margin-top:5px;color:var(--accent);font-weight:600">当前 ${activeProp.name}：${val !== null ? activeProp.fmt(val) + " " + activeProp.unit : "暂无实验测定值"}</div>`;

  const listNode = document.getElementById("propList");
  listNode.innerHTML = PROPS.map(p => {
    const st = getStats(p);
    const v = el.raw[p.idx];
    const ratio = v !== null ? Math.max(4, Math.round(((v - st.min) / (st.max - st.min || 1)) * 100)) : 0;
    return `<div class="prop-item ${p.key === state.propKey ? "active-prop" : ""}" data-prop="${p.key}">
      <span>${p.name}</span>
      <div class="prop-bar-bg"><div class="prop-bar-fg" style="width:${ratio}%"></div></div>
      <span style="font-variant-numeric:tabular-nums;font-weight:600">${v !== null ? p.fmt(v) + " " + p.unit : "—"}</span>
    </div>`;
  }).join("");
  listNode.querySelectorAll(".prop-item").forEach(n => {
    n.onclick = () => { state.propKey = n.dataset.prop; renderAll(); };
  });

  const samePeriod = ELEMENTS.filter(e => (e.row === el.row)).sort((a, b) => a.col - b.col);
  const sameGroup = el.row >= 9
    ? ELEMENTS.filter(e => e.col === el.col && e.row >= 9).sort((a, b) => a.row - b.row)
    : ELEMENTS.filter(e => e.col === el.col && e.row <= 7).sort((a, b) => a.row - b.row);
  document.getElementById("periodTrendLbl").textContent = el.row >= 9 ? `${el.row === 9 ? "镧系" : "锕系"}递变趋势` : `第 ${periodNum} 周期递变趋势`;
  document.getElementById("groupTrendLbl").textContent = el.row >= 9 ? "同列f区对比" : `第 ${el.col} 族递变趋势`;
  drawSparkline("sparkPeriod", samePeriod, el.z, activeProp);
  drawSparkline("sparkGroup", sameGroup, el.z, activeProp);
}

function syncToolbarUI() {
  document.querySelectorAll("[data-prop-btn]").forEach(b => b.classList.toggle("active", b.dataset.propBtn === state.propKey));
  document.querySelectorAll("[data-mode-btn]").forEach(b => b.classList.toggle("active", b.dataset.modeBtn === state.mode));
  document.querySelectorAll("[data-scale-btn]").forEach(b => b.classList.toggle("active", b.dataset.scaleBtn === state.scale));
  document.getElementById("chromaSelect").style.display = (state.mode === "chroma" || state.mode === "dual") ? "" : "none";
  document.getElementById("depthSelect").style.display = state.mode === "depth" ? "" : "none";
  document.getElementById("btnRelief").classList.toggle("active", state.relief3d || state.mode === "dual");
  document.getElementById("btnInvert").classList.toggle("active", state.invert);
}

function initUI() {
  const propBar = document.getElementById("propBtns");
  propBar.innerHTML = PROPS.map(p => `<button class="btn" data-prop-btn="${p.key}">${p.name}</button>`).join("");
  propBar.querySelectorAll("button").forEach(b => b.onclick = () => { state.propKey = b.dataset.propBtn; renderAll(); });

  document.querySelectorAll("[data-mode-btn]").forEach(b => b.onclick = () => { state.mode = b.dataset.modeBtn; renderAll(); });
  document.querySelectorAll("[data-scale-btn]").forEach(b => b.onclick = () => { state.scale = b.dataset.scaleBtn; renderAll(); });

  const cs = document.getElementById("chromaSelect");
  cs.innerHTML = Object.entries(CHROMA_MAPS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  cs.onchange = () => { state.chromaMap = cs.value; renderAll(); };

  const ds = document.getElementById("depthSelect");
  ds.innerHTML = Object.entries(DEPTH_MAPS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  ds.onchange = () => { state.depthMap = ds.value; renderAll(); };

  const catSel = document.getElementById("catFilter");
  catSel.innerHTML = `<option value="-1">全部元素族 (118)</option>` + CATS.map((c, i) => `<option value="${i}">${c.name}</option>`).join("");
  catSel.onchange = () => { state.filterCat = Number(catSel.value); renderAll(); };

  document.getElementById("btnRelief").onclick = () => { state.relief3d = !state.relief3d; renderAll(); };
  document.getElementById("btnInvert").onclick = () => { state.invert = !state.invert; renderAll(); };
  document.getElementById("btnTheme").onclick = () => {
    state.light = !state.light;
    document.body.classList.toggle("light", state.light);
    document.getElementById("btnTheme").textContent = state.light ? "深色界面" : "浅色界面";
    renderAll();
  };
  document.getElementById("searchBox").oninput = e => { state.query = e.target.value; renderAll(); };

  buildGrid();
  renderAll();
}

window.addEventListener("DOMContentLoaded", initUI);
