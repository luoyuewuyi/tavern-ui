/* 绿茶宝藏女孩 · 状态栏逻辑
   读取 window.__statusRaw，解析 <StatusBlock> 字段，渲染到 DOM
   轮询兜底 + 事件订阅（非MVU卡，无VARIABLE_UPDATE_ENDED，用轮询）
   日志前缀统一 [绿茶状态栏] */

(function () {
  const TAG = "[绿茶状态栏]";
  console.log(TAG, "脚本启动");

  const root = document.getElementById("status-root");
  if (!root) { console.error(TAG, "未找到#status-root"); return; }

  // 字段名映射（处理可能的冒号变体）
  const STAGES = ["警惕", "试探", "动摇", "真心", "沦陷"];
  const PHASES = ["初遇试探", "鱼塘翻车", "雪中送炭", "告白被拒", "堵截挽回"];

  function parseStatusBlock(raw) {
    if (!raw) return null;
    const fields = {};
    const lines = String(raw).split(/\r?\n+/);
    for (const line of lines) {
      const m = line.match(/^\s*([^\s:：]+)\s*[:：]\s*(.+?)\s*$/);
      if (m) fields[m[1].trim()] = m[2].trim();
    }
    return fields;
  }

  function readRaw() {
    try {
      if (typeof window.__statusRaw !== "undefined" && window.__statusRaw) {
        return window.__statusRaw;
      }
    } catch (e) { console.error(TAG, "读取__statusRaw异常", e); }
    return null;
  }

  function pct(str) {
    if (!str) return 0;
    const m = String(str).match(/(\d+)/);
    const n = m ? parseInt(m[1], 10) : 0;
    return Math.max(0, Math.min(100, isNaN(n) ? 0 : n));
  }

  function heartStageClass(stage) {
    if (!stage) return "";
    if (stage.indexOf("沦陷") >= 0 || stage.indexOf("真心") >= 0) return "sakura";
    return "";
  }

  function pondDots(state) {
    // 完好=4 alive, 动摇=3 alive 1 gone, 已翻车=2 gone, 已崩盘=4 gone
    const total = 4;
    let alive = 0;
    if (state && state.indexOf("完好") >= 0) alive = 4;
    else if (state && state.indexOf("动摇") >= 0) alive = 3;
    else if (state && state.indexOf("已翻车") >= 0) alive = 1;
    else if (state && state.indexOf("已崩盘") >= 0) alive = 0;
    else if (state && state.indexOf("翻车") >= 0) alive = 1;
    else alive = 2;
    let html = "";
    for (let i = 0; i < total; i++) {
      const cls = i < alive ? "fish-dot alive" : "fish-dot gone";
      html += `<span class="${cls}"></span>`;
    }
    return html;
  }

  function timelineHtml(phase) {
    const cur = PHASES.indexOf(phase);
    return PHASES.map((p, i) => {
      let cls = "tl-node";
      if (i === cur) cls += " active";
      else if (cur >= 0 && i < cur) cls += " passed";
      return `<div class="${cls}"><div class="tl-mark"></div><div class="tl-label">${p}</div></div>`;
    }).join("");
  }

  function esc(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function render(fields) {
    if (!fields) {
      root.innerHTML = `<div class="empty"><div class="teapot">🍵</div>等待采茶中…<br><span style="opacity:.6">柳婷婷尚未登场</span></div>`;
      return;
    }
    const name = esc(fields["姓名"] || fields["姓名:"] || "柳婷婷");
    const scene = esc(fields["当前场景"] || "—");
    const time = esc(fields["时间"] || "—");
    const phase = esc(fields["章节阶段"] || "—");
    const grade = esc(fields["坏女人品级"] || "B级");
    const stage = esc(fields["好感阶段"] || "—");
    const progress = esc(fields["攻略进度"] || "—");
    const truthRaw = fields["真心度"] || "0";
    const truth = pct(truthRaw);
    const pond = esc(fields["鱼塘状态"] || "—");
    const emotion = esc(fields["当前情绪"] || "—");
    const thought = esc(fields["心理活动"] || "");

    const stageCls = heartStageClass(fields["好感阶段"] || "");
    const pondCls = (fields["鱼塘状态"] || "").indexOf("翻车") >= 0 || (fields["鱼塘状态"] || "").indexOf("崩盘") >= 0 ? "warn" : "good";

    // 茶杯水位 = 真心度（水位y从底向上）
    const waterY = 60 - (truth / 100) * 42; // 杯内 18-60 范围
    const waterH = (truth / 100) * 42;

    root.innerHTML = `
      <div class="hero">
        <div class="hero-row">
          <div class="tea-cup">
            <svg viewBox="0 0 80 80">
              <defs>
                <linearGradient id="teaG" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="#2d5440"/>
                  <stop offset="100%" stop-color="#7cc5a0"/>
                </linearGradient>
                <clipPath id="cupClip">
                  <path d="M18 22 L62 22 L57 64 Q57 70 51 70 L29 70 Q23 70 23 64 Z"/>
                </clipPath>
              </defs>
              <ellipse cx="40" cy="22" rx="22" ry="6" fill="none" stroke="#2d5440" stroke-width="2.5"/>
              <g clip-path="url(#cupClip)">
                <rect class="cup-water" x="14" y="${waterY}" width="52" height="${waterH + 6}" fill="url(#teaG)" opacity="0.85"/>
                <ellipse cx="40" cy="${waterY}" rx="22" ry="3.5" fill="#c8e6c9" opacity="0.6"/>
                <g class="cup-leaf" transform="translate(40 ${waterY})">
                  <path d="M0 -4 Q6 -1 4 4 Q-2 3 -3 -1 Q-1 -3 0 -4 Z" fill="#7cc5a0" opacity="0.9"/>
                </g>
              </g>
              <path d="M18 22 L62 22 L57 64 Q57 70 51 70 L29 70 Q23 70 23 64 Z" fill="none" stroke="#7cc5a0" stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M62 30 Q70 34 68 42 Q66 48 60 48" fill="none" stroke="#7cc5a0" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="hero-text">
            <div class="hero-name">${name}<span class="grade-tag">${grade}</span></div>
            <div class="hero-stage">
              <span><span class="dot sakura"></span>${stage}</span>
              <span><span class="dot"></span>${scene}</span>
              <span style="color:var(--ink-faint)">${time}</span>
            </div>
          </div>
        </div>
        <div class="heart-meter">
          <div class="heart-fill" style="width:${truth}%"></div>
          <div class="heart-label">
            <span class="lh">真心度</span>
            <span class="rh">${truth}%</span>
          </div>
        </div>
      </div>

      <div class="collapsible open" id="c1">
        <div class="collap-head" onclick="window.__toggleC('c1')">
          <h2><span class="idx">01</span>当前状态</h2>
          <div class="chev"></div>
        </div>
        <div class="collap-body">
          <div class="fields">
            <div class="field"><span class="k">阶段</span><span class="v">${phase}</span></div>
            <div class="field"><span class="k">好感</span><span class="v ${stageCls}">${stage}</span></div>
            <div class="field full"><span class="k">攻略进度</span><span class="v">${progress}</span></div>
            <div class="field full"><span class="k">鱼塘状态</span>
              <span class="v ${pondCls}">${pond}</span>
              <div class="pond-viz">${pondDots(fields["鱼塘状态"])}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="collapsible open" id="c2">
        <div class="collap-head" onclick="window.__toggleC('c1')">
          <h2><span class="idx">02</span>她此刻内心</h2>
          <div class="chev"></div>
        </div>
        <div class="collap-body">
          <div class="fields">
            <div class="field full"><span class="k">当前情绪</span><span class="v sakura">${emotion}</span></div>
            ${thought ? `<div class="quote"><div class="qtext">${thought}</div></div>` : ""}
          </div>
        </div>
      </div>

      <div class="collapsible" id="c3">
        <div class="collap-head" onclick="window.__toggleC('c3')">
          <h2><span class="idx">03</span>剧情阶段线</h2>
          <div class="chev"></div>
        </div>
        <div class="collap-body">
          <div class="timeline">${timelineHtml(fields["章节阶段"])}</div>
        </div>
      </div>

      <div class="foot">采茶人手记<span class="sep">·</span>江临渊视角</div>
    `;
    console.log(TAG, "渲染完成", { truth, stage, phase, pond });
  }

  // 折叠切换
  window.__toggleC = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("open");
  };

  // 初始空态
  render(null);

  // 轮询读取（非MVU，正则注入__statusRaw后重渲染）
  let lastSig = "";
  let pollTimer = null;
  function tick() {
    const raw = readRaw();
    if (raw) {
      const sig = String(raw).slice(0, 80) + String(raw).length;
      if (sig !== lastSig) {
        lastSig = sig;
        const fields = parseStatusBlock(raw);
        if (fields && Object.keys(fields).length) {
          render(fields);
        }
      }
    } else {
      lastSig = "";
      render(null);
    }
  }
  // 启动
  tick();
  pollTimer = setInterval(tick, 800);
  // 页面隐藏时暂停
  window.addEventListener("pagehide", () => { if (pollTimer) clearInterval(pollTimer); });

  console.log(TAG, "脚本就绪，轮询中");
})();
