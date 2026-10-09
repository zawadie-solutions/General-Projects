// Single static page: a magenta app shell (top bar + icon rail) around a locations sidebar and
// the month's insights. All data is inserted via textContent / DOM APIs (never innerHTML),
// so review text cannot inject markup.
export const dashboardHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Google Review Monitor</title>
<link rel="icon" type="image/png" href="logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>try{if(localStorage.getItem('theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}</script>
<style>
  /* Same colour tokens as Ombeni AI (ombeni-ai/public/style.css), so this
     dashboard reads as part of the same product; the typeface here is Inter. Status colors (green =
     still available, red = removed) stay semantic, not brand chrome. */
  :root{
    --white:#ffffff; --bg:#F8FAFC; --surface:#ffffff; --hover:#F1F5F9; --text:#1E293B; --muted:#64748B; --border:#E2E8F0;
    --magenta:#E51A5A; --magenta-dark:#C8134C; --magenta-tint:#FDECF1; --magenta-ink:#C8134C; --link:#E51A5A;
    --green:#1DB881; --green-dark:#065F46; --green-tint:#D1FAE5; --green-line:#BBF0DA;
    --red:#991B1B; --red-tint:#FEE2E2; --red-line:#F7B9B9;
  }
  /* Dark theme: pitch-black page, near-black surfaces; the magenta shell is unchanged. */
  :root[data-theme="dark"]{
    --bg:#000000; --surface:#0A0A0B; --hover:#18191D; --text:#F1F5F9; --muted:#94A3B8; --border:#25272C;
    --magenta-tint:#2B0A16; --magenta-ink:#FF8FB1; --link:#FF6B98;
    --green-dark:#6EE7B7; --green-tint:#06281D; --green-line:#0F4A36;
    --red:#FCA5A5; --red-tint:#2A0C0C; --red-line:#5B1A1A;
  }
  *{box-sizing:border-box}
  html{color-scheme:light}
  html[data-theme="dark"]{color-scheme:dark}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 'Inter',system-ui,-apple-system,"Segoe UI",sans-serif;font-feature-settings:"cv11","ss01";-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  button,input,select{font-family:inherit}
  table,.totals,.loclist .n{font-variant-numeric:tabular-nums}
  a{color:var(--link)}
  a:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--magenta);outline-offset:1px}

  /* ---- app shell ---- */
  .shell{display:grid;grid-template-columns:68px minmax(0,1fr);grid-template-rows:52px minmax(0,1fr);height:100vh;background:var(--magenta)}
  .topbar{grid-column:1/-1;background:var(--magenta);color:var(--white);display:flex;align-items:center;gap:14px;padding:0 16px}
  .brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;letter-spacing:-.01em;white-space:nowrap}
  .brand .logo{width:32px;height:32px;border-radius:8px;background:var(--white);display:grid;place-items:center}
  .brand .logo img{display:block;width:19px;height:22px;object-fit:contain}
  .monthbar{display:none;align-items:center;gap:8px;min-width:0}
  .monthbar.show{display:flex}
  .monthbar label{font-size:12px;opacity:.92}
  .monthbar select{font:inherit;font-size:13px;font-weight:600;color:var(--text);background:var(--surface);border:1px solid var(--surface);border-radius:7px;padding:5px 9px;min-width:0;max-width:100%}
  .btn{font:inherit;font-size:13px;font-weight:600;color:var(--white);background:var(--magenta);border:1px solid var(--magenta);border-radius:7px;padding:6px 14px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:background .15s,box-shadow .15s,transform .15s}
  .btn[hidden]{display:none}
  .btn svg{flex:none;width:13px;height:13px;fill:currentColor}
  .btn:hover{background:var(--magenta-dark)}
  .btn:disabled{background:var(--border);border-color:var(--border);color:var(--muted);cursor:default}
  .btn.ghost{background:var(--surface);color:var(--text);border-color:var(--border)}
  .btn.ghost:hover{background:var(--hover)}
  .btn.ghost:disabled{background:var(--bg);color:var(--muted)}
  .btn.busy,.btn.busy:disabled{background:var(--magenta-tint);border-color:var(--magenta-tint);color:var(--magenta-ink);cursor:progress}
  .btn.ghost.busy,.btn.ghost.busy:disabled{background:var(--hover);border-color:var(--border);color:var(--text)}
  /* The page's one primary action: larger, with a soft magenta glow. */
  .btn.run{font-size:14px;padding:9px 20px 9px 16px;border-radius:9px;box-shadow:0 1px 2px rgba(229,26,90,.35),0 8px 18px -6px rgba(229,26,90,.55)}
  .btn.run:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(229,26,90,.35),0 12px 22px -6px rgba(229,26,90,.6)}
  .btn.run:active{transform:none}
  .btn.run:disabled{transform:none;box-shadow:none}
  .spin{flex:none;width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading{display:flex;align-items:center;gap:9px;color:var(--muted);padding:14px 0}
  .runbar{display:none;height:3px;border-radius:999px;background:var(--magenta-tint);overflow:hidden}
  .runbar.show{display:block}
  .runbar::before{content:"";display:block;width:35%;height:100%;border-radius:inherit;background:var(--magenta);animation:slide 1.4s ease-in-out infinite}
  @keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(290%)}}
  .skel{display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,var(--hover) 25%,var(--border) 50%,var(--hover) 75%);background-size:200% 100%;animation:shimmer 1.3s linear infinite}
  @keyframes shimmer{to{background-position:-200% 0}}
  .skel+.skel{margin-top:14px}
  .skel.short{width:45%} .skel.big{width:110px;height:30px}
  .loclist .skel{margin:9px 8px}
  @media (prefers-reduced-motion:reduce){.spin,.runbar::before,.skel{animation:none}.btn{transition:none}.btn.run:hover{transform:none}}
  .topbar :focus-visible{outline-color:var(--white)}
  .themebtn{margin-left:auto;width:32px;height:32px;display:grid;place-items:center;padding:0;color:var(--white);background:none;border:0;border-radius:8px;cursor:pointer}
  .themebtn:hover{background:var(--magenta-dark)}
  .themebtn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .themebtn .sun{display:none}
  :root[data-theme="dark"] .themebtn .sun{display:block}
  :root[data-theme="dark"] .themebtn .moon{display:none}
  .pill{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;white-space:nowrap}
  .pill .dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(255,255,255,.25)}
  .rail{padding:10px 6px;display:flex;flex-direction:column;gap:4px}
  .rail a{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 2px;border-radius:8px;color:var(--white);opacity:.82;text-decoration:none;font-size:10.5px;font-weight:500}
  .rail a:hover{opacity:1;background:var(--magenta-dark)}
  .rail a.active{opacity:1;font-weight:600;background:var(--magenta-dark)}
  .rail a:focus-visible{outline-color:var(--white)}
  .rail svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

  /* ---- content panel: locations column | main ---- */
  .panel{display:grid;grid-template-columns:288px minmax(0,1fr);min-width:0;min-height:0;background:var(--bg);border-top-left-radius:18px;overflow:hidden}
  .side{display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--surface);border-right:1px solid var(--border);padding:22px 16px 0}
  .side .label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .side .scope{font-weight:600;margin:4px 0 12px;overflow-wrap:anywhere}
  .side input{font:inherit;font-size:13px;width:100%;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:7px 10px}
  .loclist{list-style:none;flex:1;min-height:0;margin:10px -8px 0;padding:0 8px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:1px}
  .loclist button{font:inherit;font-size:13px;width:100%;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;text-align:left;color:var(--text);background:none;border:0;border-radius:7px;padding:7px 8px;cursor:pointer}
  .loclist button:hover{background:var(--hover)}
  .loclist button.active{background:var(--magenta-tint);color:var(--magenta-ink);font-weight:600}
  .loclist .n{flex:none;font-size:11.5px;font-weight:500;color:var(--muted);line-height:1.7}
  .loclist button.active .n{color:var(--magenta-ink)}
  .loclist .name{overflow-wrap:anywhere}

  .main{min-width:0;overflow-y:auto;scroll-behavior:smooth;padding:24px 28px 48px;display:flex;flex-direction:column;gap:20px}
  .main>*{flex:none}
  .pagehead{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
  .pagehead h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.02em}
  .schedule{color:var(--muted);font-size:12.5px;margin-top:4px}
  .monthnote{color:var(--muted);font-size:12.5px;margin-top:2px}
  .monthnote:empty{display:none}
  .banner{display:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600}
  .banner.show{display:block}
  .banner.bad{border:1px solid var(--red-line);background:var(--red-tint);color:var(--red)}
  .banner.note{border:1px solid var(--border);background:var(--surface);color:var(--muted);font-weight:500}

  /* ---- cards ---- */
  .card{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:16px 18px}
  .overview{display:grid;grid-template-columns:340px minmax(0,1fr);padding:0;overflow:hidden}
  .totals{padding:20px 22px;border-right:1px solid var(--border)}
  .totals .cap{font-size:12.5px;font-weight:500;color:var(--muted)}
  .totals .big{font-size:32px;font-weight:700;line-height:1.15;letter-spacing:-.02em;margin-top:2px}
  .totals .rows{margin-top:16px;border-top:1px solid var(--border)}
  .totals .line{display:grid;grid-template-columns:minmax(0,1fr) auto 50px;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
  .totals .line:last-child{border-bottom:0;padding-bottom:0}
  .totals .line .k{display:flex;align-items:center;gap:8px}
  .totals .line .k i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--muted)}
  .totals .line.green .k i{background:var(--green)} .totals .line.red .k i{background:var(--red)}
  .totals .line .v{font-weight:600;text-align:right}
  .totals .line .p{color:var(--muted);font-size:12.5px;text-align:right}
  .totals .line.hot .v{color:var(--red)}
  section h2{font-size:14px;margin:0 0 10px;color:var(--text)}
  .cardhead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  .cardhead .title{font-weight:700;overflow-wrap:anywhere;min-width:0}
  .cardhead .actions{display:flex;gap:8px;flex-wrap:wrap}
  .locnote{color:var(--muted);font-size:12.5px;margin-top:8px}
  .locnote:empty{display:none}
  .tablewrap{overflow-x:auto;margin-top:12px}
  table{border-collapse:collapse;width:100%;min-width:560px;font-size:13px}
  th{text-align:left;font-size:12px;font-weight:600;color:var(--muted);background:var(--bg);padding:8px 10px;white-space:nowrap;border-bottom:1px solid var(--border)}
  td{padding:10px;border-bottom:1px solid var(--border);vertical-align:top}
  tr:last-child td{border-bottom:0}
  td .who{font-weight:600}
  td .meta{color:var(--muted);font-size:12.5px;margin-top:2px;overflow-wrap:anywhere}
  td.nowrap{white-space:nowrap}
  td a{font-weight:600;white-space:nowrap}
  td a+a{margin-left:12px}
  td a:hover{text-decoration:none}
  .card.ok{background:var(--green-tint);border-color:var(--green-line)}
  .card.ok .headline{color:var(--green-dark)}
  .card.attn{background:var(--red-tint);border-color:var(--red-line)}
  .card.attn .headline{color:var(--red)}
  .headline{font-size:15px;font-weight:700;margin:0}
  .subline{font-size:13px;color:var(--muted);margin:4px 0 0}
  .card.attn .subline{color:var(--red);opacity:.85}
  .removed-list{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
  .removed-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--red-line);border-radius:8px;flex-wrap:wrap}
  .removed-list .left{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
  .removed-list .who{font-weight:600}
  .removed-list .where{color:var(--muted);font-weight:500;font-size:12.5px}
  .removed-list .right{display:flex;align-items:center;gap:10px;margin-left:auto}
  .removed-list .when{color:var(--muted);font-size:12.5px;white-space:nowrap}
  .removed-list a{font-weight:600;font-size:13px;white-space:nowrap}
  .removed-list a:hover{text-decoration:none}
  .review-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column}
  .review-list li{padding:10px 0;border-top:1px solid var(--border)}
  .review-list .top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  .review-list .who{font-weight:600}
  .review-list .links{display:flex;gap:12px;margin-left:auto}
  .review-list a{font-weight:600;font-size:13px;white-space:nowrap}
  .review-list .meta{color:var(--muted);font-size:12.5px;margin-top:3px;overflow-wrap:anywhere}
  .review-list .text{font-size:13px;margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere}
  .google-head{margin-top:16px;padding-top:14px;border-top:2px solid var(--border)}
  .google-head .name{font-weight:700}
  .google-head .meta{color:var(--muted);font-size:12.5px;margin-top:3px;overflow-wrap:anywhere}
  .tag{font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;white-space:nowrap}
  .tag.sent{background:var(--green-tint);color:var(--green-dark)}
  .tag.pending{background:var(--bg);color:var(--muted);border:1px solid var(--border)}
  .tag.failed{background:var(--red-tint);color:var(--red)}
  .activity{display:flex;flex-direction:column}
  .activity .row{display:flex;gap:14px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px}
  .activity .row:last-child{border-bottom:0}
  .activity .when{width:84px;flex:none;color:var(--muted);font-weight:600}
  .activity .what{color:var(--text)}
  .activity .what b{font-weight:600}
  .empty{color:var(--muted);padding:10px 0}

  @media (max-width:900px){
    .shell{grid-template-columns:minmax(0,1fr);height:auto;min-height:100vh}
    .rail{display:none}
    .panel{grid-template-columns:minmax(0,1fr);border-top-right-radius:18px}
    .side{border-right:0;border-bottom:1px solid var(--border);padding:18px 16px 4px}
    .loclist{flex:none;max-height:240px}
    .main{overflow:visible;padding:18px 16px 40px}
    .overview{grid-template-columns:minmax(0,1fr)}
    .totals{border-right:0}
    .chart{display:none}
    .brand span:last-child{display:none}
    .pill span:last-child{display:none}
    .monthbar{flex:1}
    .monthbar label{display:none}
    .monthbar select{flex:1}
  }
</style></head><body>
<div class="shell">
  <header class="topbar">
    <div class="brand"><span class="logo"><img src="logo.png" alt=""></span><span>Google Review Monitor</span></div>
    <div class="monthbar" id="monthbar"><label for="month">Month</label><select id="month"></select></div>
    <button class="themebtn" id="themeToggle" type="button" aria-label="Switch to dark theme" title="Switch to dark theme">
      <svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
      <svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
    <div class="pill"><span class="dot"></span><span>Monitoring active</span></div>
  </header>
  <nav class="rail" aria-label="Sections">
    <a href="#top" class="active"><svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Insights</a>
    <a href="#removedSection"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>Removed</a>
    <a href="#activitySection"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Activity</a>
  </nav>
  <div class="panel">
    <aside class="side" aria-label="Locations">
      <div class="label">Locations</div>
      <div class="scope" id="locScope"></div>
      <input id="locSearch" type="search" placeholder="Search locations…" aria-label="Search locations">
      <ul class="loclist" id="locList"><li class="skel"></li><li class="skel"></li><li class="skel"></li><li class="skel"></li><li class="skel"></li><li class="skel"></li></ul>
    </aside>

    <main class="main">
      <div class="pagehead" id="top">
        <div>
          <h1>Insights</h1>
          <div class="schedule" id="schedule">Loading…</div>
          <div class="monthnote" id="monthNote"></div>
        </div>
        <button class="btn run" id="runNow" type="button" hidden>Run now</button>
      </div>
      <div class="runbar" id="runBar" role="progressbar" aria-label="Check in progress"></div>
      <div class="banner bad" id="failBanner"></div>
      <div class="banner note" id="unknownBanner"></div>

        <div class="card overview">
          <div class="totals" id="stats"><span class="skel short"></span><span class="skel big"></span><span class="skel"></span><span class="skel"></span><span class="skel"></span></div>
          <div class="chart" id="chart"></div>
        </div>

        <section>
          <div class="card">
            <div class="cardhead">
              <div class="title" id="locTitle">Reviews by location</div>
              <div class="actions"><button class="btn" id="checkLocation" type="button" disabled>Check now</button><button class="btn ghost" id="loadGoogle" type="button" disabled>Load Google reviews</button></div>
            </div>
            <div class="locnote" id="locationNote"></div>
            <div id="reviews"></div>
            <div id="googleReviews"></div>
          </div>
        </section>

        <section id="removedSection">
          <h2>Review status</h2>
          <div id="status"><div class="card"><span class="skel short"></span><span class="skel"></span></div></div>
        </section>

        <section id="activitySection">
          <h2>Recent activity</h2>
          <div class="card"><div class="activity" id="activity"><span class="skel"></span><span class="skel short"></span></div></div>
        </section>
    </main>
  </div>
</div>
<script>
const $=id=>document.getElementById(id);
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
async function api(p){const r=await fetch(p);if(!r.ok)throw new Error(r.status);return r.json()}

const SVG_NS='http://www.w3.org/2000/svg';
const PLAY='M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z';
function icon(d){const s=document.createElementNS(SVG_NS,'svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');const p=document.createElementNS(SVG_NS,'path');p.setAttribute('d',d);s.append(p);return s}
/** Sets a button's label; busy swaps its icon for a spinner. */
function setBtn(btn,text,busy,iconPath){
  btn.classList.toggle('busy',!!busy);
  if(busy)btn.setAttribute('aria-busy','true');else btn.removeAttribute('aria-busy');
  btn.replaceChildren(...(busy?[el('span',null,'spin')]:iconPath?[icon(iconPath)]:[]),document.createTextNode(text));
}
function loadingRow(text){const d=el('div',null,'loading');d.append(el('span',null,'spin'),document.createTextNode(text));return d}

function applyTheme(dark){
  if(dark)document.documentElement.dataset.theme='dark';else delete document.documentElement.dataset.theme;
  const label='Switch to '+(dark?'light':'dark')+' theme', b=$('themeToggle');
  b.setAttribute('aria-label',label);b.title=label;
}
applyTheme(document.documentElement.dataset.theme==='dark');
$('themeToggle').onclick=()=>{
  const dark=document.documentElement.dataset.theme!=='dark';
  applyTheme(dark);
  try{localStorage.setItem('theme',dark?'dark':'light')}catch(e){}
};

let currentProject=null, availableMonths=[], runPoll=null;
function withProject(path){return currentProject?path+(path.includes('?')?'&':'?')+'project='+encodeURIComponent(currentProject):path}
function pickDefaultProject(list){
  const synced=list.filter(m=>m.lastSyncedAt).sort((a,b)=>new Date(b.lastSyncedAt)-new Date(a.lastSyncedAt));
  return (synced[0]||list[0]).projectGid;
}

async function loadMonths(){
  availableMonths=await api('api/available-months');
  const bar=$('monthbar');
  $('runNow').hidden=!availableMonths.length;
  if(!availableMonths.length){bar.classList.remove('show');$('runBar').classList.remove('show');$('monthNote').textContent='';return}
  bar.classList.add('show');
  if(!currentProject||!availableMonths.some(m=>m.projectGid===currentProject))currentProject=pickDefaultProject(availableMonths);

  const sel=$('month');sel.replaceChildren();
  for(const m of availableMonths){
    const o=el('option',m.name+(m.lastSyncedAt?'':' (never synced)'));
    o.value=m.projectGid;if(m.projectGid===currentProject)o.selected=true;sel.append(o);
  }
  sel.onchange=()=>{currentProject=sel.value;refresh()};

  const m=availableMonths.find(x=>x.projectGid===currentProject);
  const btn=$('runNow');
  const running=m&&m.runStatus==='running';
  btn.disabled=!!running;
  setBtn(btn,running?'Running check…':'Run now',running,PLAY);
  $('runBar').classList.toggle('show',!!running);
  // While a run is in progress, check back sooner than the regular minute so the page keeps up.
  clearTimeout(runPoll);
  if(running)runPoll=setTimeout(()=>refresh().catch(()=>{}),10000);
  $('monthNote').textContent=running?'A check is currently running for this month — this can take a while.'
    :m&&m.lastRunError?'Last run failed: '+m.lastRunError
    :m&&m.lastSyncedAt?'Last synced '+dayLabel(m.lastSyncedAt)+', '+timeLabel(m.lastSyncedAt)
    :'Never synced yet — click Run now.';
}

$('runNow').onclick=async()=>{
  if(!currentProject)return;
  const m=availableMonths.find(x=>x.projectGid===currentProject);
  const btn=$('runNow');btn.disabled=true;setBtn(btn,'Starting…',true);
  try{
    const r=await fetch('api/run-month',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectGid:currentProject,name:m&&m.name})});
    const j=await r.json();
    if(!j.started)$('monthNote').textContent='Could not start: '+(j.reason||'unknown error');
  }catch(e){$('monthNote').textContent='Failed to start: '+e.message}
  await loadMonths();
};

function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function dayLabel(d){
  const dt=new Date(d);
  const diff=Math.round((startOfDay(dt)-startOfDay(new Date()))/86400000);
  if(diff===0)return'Today';
  if(diff===-1)return'Yesterday';
  if(diff===1)return'Tomorrow';
  return dt.toLocaleDateString([], {month:'short',day:'numeric'});
}
function timeLabel(d){return new Date(d).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}
function pct(n,total){return total?(Math.round(n/total*1000)/10)+'%':'0%'}

async function loadSummary(){
  const s=await api(withProject('api/summary'));
  const st=$('stats');st.replaceChildren();
  st.append(el('div','Reviews monitored','cap'),el('div',s.monitored.toLocaleString(),'big'));
  const rows=el('div',null,'rows');
  for(const [k,v,c] of [['Still available',s.exists,'green'],['Removed',s.removed,'red'+(s.removed?' hot':'')],['Could not be checked',s.unknown,'']]){
    const line=el('div',null,'line '+c);
    const key=el('div',null,'k');key.append(document.createElement('i'),document.createTextNode(k));
    line.append(key,el('div',v.toLocaleString(),'v'),el('div',pct(v,s.monitored),'p'));
    rows.append(line);
  }
  st.append(rows);

  $('schedule').textContent='Last check: '+(s.lastCheckAt?dayLabel(s.lastCheckAt)+', '+timeLabel(s.lastCheckAt):'never')
    +'   ·   Next check: '+(s.nextCheckAt?dayLabel(s.nextCheckAt)+', '+timeLabel(s.nextCheckAt):'not scheduled');

  const fail=$('failBanner');
  if(s.notificationsFailing){fail.textContent=s.notificationsFailing+' removal notification(s) could not be emailed. They will be retried at the next run.';fail.classList.add('show')}
  else fail.classList.remove('show');

  const unk=$('unknownBanner');
  if(s.unknown){unk.textContent='⚠ '+s.unknown+' review(s) could not be checked. They will be retried automatically.';unk.classList.add('show')}
  else unk.classList.remove('show');

  return s;
}

function notifTag(r){
  if(!r.notification_sent)return r.last_notification_error?['Failed, will retry','failed']:['Pending','pending'];
  return ['Notified '+dayLabel(r.notification_sent_at),'sent'];
}

async function loadStatus(){
  const rows=await api(withProject('api/removed'));
  const box=$('status');box.replaceChildren();
  if(!rows.length){
    const c=el('div',null,'card ok');
    c.append(el('p','🟢 No new reviews have been removed.','headline'),el('p','Everything is working normally.','subline'));
    box.append(c);return;
  }
  const c=el('div',null,'card attn');
  c.append(el('p','🔴 '+rows.length+' review'+(rows.length>1?'s':'')+' removed','headline'),
    el('p','These reviews were detected as removed during the most recent check.','subline'));
  const list=el('ul',null,'removed-list');
  for(const r of rows){
    const li=document.createElement('li');
    const left=el('div',null,'left');left.append(el('span',r.reviewer_name||'Unknown reviewer','who'),el('span',r.location||'Unknown location','where'));
    const [tagText,tagCls]=notifTag(r);
    const right=el('div',null,'right');
    right.append(el('span','Removed '+dayLabel(r.removed_at),'when'), el('span',tagText,'tag '+tagCls));
    const a=el('a','View in Asana →');a.href=r.asana_task_url;a.target='_blank';a.rel='noopener noreferrer';
    right.append(a);
    li.append(left,right);
    list.append(li);
  }
  c.append(list);box.append(c);
}

const NO_LOCATION='__none__';
let currentLocation=null, locations=[];
const STATUS_TAG={REVIEW_EXISTS:['Still available','sent'],REVIEW_REMOVED:['Removed','failed'],UNKNOWN:['Not checked','pending']};
const locValue=l=>l.location==null?NO_LOCATION:l.location;
const locName=v=>v===NO_LOCATION?'Unknown location':v;

async function loadLocations(){
  locations=await api(withProject('api/locations'));
  if(!locations.some(l=>locValue(l)===currentLocation))currentLocation=null;
  const m=availableMonths.find(x=>x.projectGid===currentProject);
  $('locScope').textContent=(m?m.name:'All months')+' · '+locations.length+' location'+(locations.length===1?'':'s');
  renderLocations();
  await loadReviews();
}

function renderLocations(){
  const q=$('locSearch').value.trim().toLowerCase();
  const list=$('locList');list.replaceChildren();
  const shown=locations.filter(l=>!q||locName(locValue(l)).toLowerCase().includes(q));
  if(!shown.length){list.append(el('li',locations.length?'No locations match.':'No locations synced for this month yet.','empty'));return}
  for(const l of shown){
    const v=locValue(l);
    const b=el('button',null,v===currentLocation?'active':'');b.type='button';
    if(v===currentLocation)b.setAttribute('aria-current','true');
    b.append(el('span',locName(v),'name'),el('span',l.count,'n'));
    b.onclick=()=>selectLocation(v);
    const li=document.createElement('li');li.append(b);list.append(li);
  }
}
$('locSearch').oninput=renderLocations;

function selectLocation(v){
  currentLocation=v;
  $('locationNote').textContent='';$('googleReviews').replaceChildren();
  renderLocations();
  $('reviews').replaceChildren(loadingRow('Loading reviews…'));
  loadReviews().catch(showReviewsError);
}

let checkingLocation=false;
$('checkLocation').onclick=async()=>{
  if(!currentLocation||checkingLocation)return;
  const location=currentLocation, btn=$('checkLocation'), note=$('locationNote');
  checkingLocation=true;btn.disabled=true;setBtn(btn,'Checking…',true);
  note.textContent='Checking this location against Google — this can take a minute.';
  try{
    const r=await fetch('api/check-location',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({projectGid:currentProject,location:location===NO_LOCATION?null:location})});
    if(!r.ok)throw new Error(r.status);
    const j=await r.json();
    note.textContent=j.ok?'Checked '+j.checked+' review'+(j.checked===1?'':'s')+': '+j.exists+' still available, '+j.removed+' removed, '+j.unknown+' could not be checked.'
      :'Could not check: '+(j.reason||'unknown error');
  }catch(e){note.textContent='Check failed: '+e.message}
  checkingLocation=false;setBtn(btn,'Check now',false);
  await Promise.all([loadSummary(),loadStatus(),loadReviews(),loadActivity()]).catch(showReviewsError);
};

// Display only: shows what Google Places returns for the selected location. Changes nothing.
let loadingGoogle=false;
$('loadGoogle').onclick=async()=>{
  if(!currentLocation||currentLocation===NO_LOCATION||loadingGoogle)return;
  const location=currentLocation, btn=$('loadGoogle'), box=$('googleReviews');
  loadingGoogle=true;btn.disabled=true;setBtn(btn,'Loading…',true);
  const head=el('div',null,'google-head');
  try{
    const j=await api(withProject('api/places-reviews?location='+encodeURIComponent(location)));
    if(!j.ok){head.append(el('div','Could not load Google reviews: '+(j.reason||'unknown error'),'empty'))}
    else{
      const p=j.place;
      head.append(el('div','On Google: '+(p.name||'Unknown business'),'name'));
      const meta=[];
      if(p.address)meta.push(p.address);
      if(p.rating!=null)meta.push(p.rating+'★');
      if(p.totalReviews!=null)meta.push(p.totalReviews+' reviews on Google');
      if(!p.confirmed)meta.push('top search result, not confirmed against a review link');
      head.append(el('div',meta.join('  ·  '),'meta'));
      if(!p.reviews.length)head.append(el('div','Google Places returned no individual reviews for this business.','empty'));
      else{
        head.append(el('div','Showing the '+p.reviews.length+' review'+(p.reviews.length===1?'':'s')+' Google Places returns (it gives at most 5).','meta'));
        const list=el('ul',null,'review-list');
        for(const r of p.reviews){
          const li=document.createElement('li');
          const top=el('div',null,'top');
          top.append(el('span',r.author||'Unknown reviewer','who'));
          if(r.rating!=null)top.append(el('span',r.rating+'★','tag pending'));
          if(r.googleMapsUri&&/^https:\\/\\//.test(r.googleMapsUri)){
            const links=el('div',null,'links');
            const g=el('a','Google review →');g.href=r.googleMapsUri;g.target='_blank';g.rel='noopener noreferrer';
            links.append(g);top.append(links);
          }
          li.append(top);
          if(r.publishedAt)li.append(el('div','Posted '+new Date(r.publishedAt).toLocaleDateString([], {year:'numeric',month:'short',day:'numeric'}),'meta'));
          if(r.text)li.append(el('div',r.text,'text'));
          list.append(li);
        }
        head.append(list);
      }
    }
  }catch(e){head.append(el('div','Could not load Google reviews: '+e.message,'empty'))}
  loadingGoogle=false;setBtn(btn,'Load Google reviews',false);
  btn.disabled=!currentLocation||currentLocation===NO_LOCATION;
  if(currentLocation===location)box.replaceChildren(head);
};

function showReviewsError(e){$('reviews').replaceChildren(el('div','Failed to load reviews: '+e.message,'empty'))}

async function loadReviews(){
  const box=$('reviews');
  $('checkLocation').disabled=!currentLocation||checkingLocation;
  $('loadGoogle').disabled=!currentLocation||currentLocation===NO_LOCATION||loadingGoogle;
  $('locTitle').textContent=currentLocation?locName(currentLocation):'Reviews by location';
  if(!currentLocation){box.replaceChildren(el('div','Choose a location on the left to see its reviews for this month.','empty'));return}
  const q=currentLocation===NO_LOCATION?'api/reviews':'api/reviews?location='+encodeURIComponent(currentLocation);
  const rows=await api(withProject(q));
  if(!rows.length){box.replaceChildren(el('div','No reviews for this location.','empty'));return}
  const table=document.createElement('table');
  const hr=document.createElement('tr');
  for(const h of ['Reviewer','Status','Last checked','Links'])hr.append(el('th',h));
  const thead=document.createElement('thead');thead.append(hr);
  const tbody=document.createElement('tbody');
  for(const r of rows){
    const tr=document.createElement('tr');
    const who=document.createElement('td');
    who.append(el('div',r.reviewer_name||'Unknown reviewer','who'),el('div',r.asana_task_name+(r.rating?'  ·  '+r.rating+'★':''),'meta'));
    if(r.status==='UNKNOWN'&&r.last_error)who.append(el('div','Reason: '+r.last_error,'meta'));
    const [tagText,tagCls]=STATUS_TAG[r.status]||STATUS_TAG.UNKNOWN;
    const st=el('td',null,'nowrap');
    st.append(el('span',r.status==='UNKNOWN'&&r.last_checked_at?'Could not be checked':tagText,'tag '+tagCls));
    if(r.status==='REVIEW_REMOVED'&&r.removed_at)st.append(el('div','Removed '+dayLabel(r.removed_at),'meta'));
    const when=el('td',r.last_checked_at?dayLabel(r.last_checked_at)+', '+timeLabel(r.last_checked_at):'Never','nowrap');
    const links=el('td',null,'nowrap');
    const g=el('a','Google →');g.href=r.google_review_url;g.target='_blank';g.rel='noopener noreferrer';
    const a=el('a','Asana →');a.href=r.asana_task_url;a.target='_blank';a.rel='noopener noreferrer';
    links.append(g,a);
    tr.append(who,st,when,links);tbody.append(tr);
  }
  table.append(thead,tbody);
  const wrap=el('div',null,'tablewrap');wrap.append(table);
  box.replaceChildren(wrap);
}

async function loadActivity(){
  const days=await api(withProject('api/activity'));
  const box=$('activity');box.replaceChildren();
  if(!days.length){box.append(el('div','No checks recorded yet.','empty'));return}
  for(const d of days.slice(0,10)){
    const row=el('div',null,'row');
    const what=el('div',null,'what');
    if(d.removed>0){
      what.append(el('b',d.removed+' review'+(d.removed>1?'s':'')+' removed'),document.createTextNode(' — '));
      what.append(document.createTextNode([...new Set(d.removedDetails.map(x=>x.location||'Unknown location'))].join(', ')));
    } else {
      what.append(el('b','Check completed'),document.createTextNode(' — '+d.checked+' checked'));
    }
    row.append(el('div',dayLabel(d.date),'when'), what);
    box.append(row);
  }
}

async function refresh(){await loadMonths();await Promise.all([loadSummary(),loadStatus(),loadLocations(),loadActivity()])}
refresh().catch(e=>{$('schedule').textContent='Failed to load: '+e.message});
setInterval(refresh,60000);
</script></body></html>`;
