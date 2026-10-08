// Single static page. Palette is strictly white / green / red. All data is inserted via
// textContent / DOM APIs (never innerHTML), so review text cannot inject markup.
export const dashboardHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Google Review Monitor</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  /* Same design tokens as Ombeni AI (ombeni-ai/public/style.css), so this
     dashboard reads as part of the same product. Status colors (green =
     still available, red = removed) stay semantic, not brand chrome. */
  :root{
    --white:#ffffff; --bg:#F8FAFC; --text:#1E293B; --muted:#64748B; --border:#E2E8F0;
    --magenta:#E51A5A; --magenta-dark:#C8134C; --magenta-tint:#FDECF1;
    --green:#1DB881; --green-dark:#065F46; --green-tint:#D1FAE5; --green-line:#BBF0DA;
    --red:#991B1B; --red-tint:#FEE2E2; --red-line:#F7B9B9;
  }
  *{box-sizing:border-box}
  html{color-scheme:light}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 'Plus Jakarta Sans',system-ui,-apple-system,"Segoe UI",sans-serif}
  header{background:var(--magenta);color:var(--white);padding:18px 24px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
  header h1{margin:0;font-size:20px;font-weight:650}
  header .sub{margin-top:4px;font-size:13px;opacity:.92}
  .pill{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:650;white-space:nowrap;padding-top:2px}
  .pill .dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(255,255,255,.25)}
  main{max-width:820px;margin:0 auto;padding:20px 24px 48px}
  .banner{display:none;margin:0 0 12px;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600}
  .banner.show{display:block}
  .banner.bad{border:1px solid var(--red-line);background:var(--red-tint);color:var(--red)}
  .banner.note{border:1px solid var(--border);background:var(--white);color:var(--muted);font-weight:500}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}
  .stat{border:1px solid var(--border);border-radius:10px;padding:14px 16px;background:var(--white);text-align:center}
  .stat b{display:block;font-size:30px;line-height:1.1}
  .stat span{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  .stat.green{background:var(--green-tint);border-color:var(--green-line)} .stat.green b{color:var(--green-dark)}
  .stat.red{background:var(--red-tint);border-color:var(--red-line)} .stat.red b,.stat.red span{color:var(--red)}
  .schedule{text-align:center;color:var(--muted);font-size:12.5px;margin-bottom:6px}
  .monthbar{display:none;justify-content:center;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}
  .monthbar.show{display:flex}
  .monthbar select{font:inherit;font-size:13px;color:var(--text);background:var(--white);border:1px solid var(--border);border-radius:7px;padding:4px 9px}
  .monthbar button{font:inherit;font-size:12.5px;font-weight:650;color:var(--white);background:var(--magenta);border:1px solid var(--magenta);border-radius:7px;padding:4px 11px;cursor:pointer}
  .monthbar button:hover{background:var(--magenta-dark)}
  .monthbar button:disabled{background:var(--border);border-color:var(--border);color:var(--muted);cursor:default}
  .monthnote{text-align:center;color:var(--muted);font-size:12px;margin-bottom:18px}
  section{margin-bottom:24px}
  section h2{font-size:14px;margin:0 0 10px;color:var(--text)}
  .card{border:1px solid var(--border);border-radius:10px;background:var(--white);padding:16px 18px}
  .card.ok{background:var(--green-tint);border-color:var(--green-line)}
  .card.ok .headline{color:var(--green-dark)}
  .card.attn{background:var(--red-tint);border-color:var(--red-line)}
  .card.attn .headline{color:var(--red)}
  .headline{font-size:15px;font-weight:700;margin:0}
  .subline{font-size:13px;color:var(--muted);margin:4px 0 0}
  .card.attn .subline{color:var(--red);opacity:.85}
  .removed-list{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
  .removed-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:var(--white);border:1px solid var(--red-line);border-radius:8px;flex-wrap:wrap}
  .removed-list .left{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
  .removed-list .who{font-weight:650}
  .removed-list .where{color:var(--muted);font-weight:500;font-size:12.5px}
  .removed-list .right{display:flex;align-items:center;gap:10px;margin-left:auto}
  .removed-list .when{color:var(--muted);font-size:12.5px;white-space:nowrap}
  .removed-list a{color:var(--magenta);font-weight:650;font-size:13px;white-space:nowrap}
  .removed-list a:hover{text-decoration:none}
  .tag{font-size:11px;font-weight:650;padding:1px 7px;border-radius:999px;white-space:nowrap}
  .tag.sent{background:var(--green-tint);color:var(--green-dark)}
  .tag.pending{background:var(--bg);color:var(--muted);border:1px solid var(--border)}
  .tag.failed{background:var(--red-tint);color:var(--red)}
  .activity{display:flex;flex-direction:column}
  .activity .row{display:flex;gap:14px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px}
  .activity .row:last-child{border-bottom:0}
  .activity .when{width:84px;flex:none;color:var(--muted);font-weight:600}
  .activity .what{color:var(--text)}
  .activity .what b{font-weight:650}
  .activity .removed-tag{color:var(--red);font-weight:650}
  .empty{color:var(--muted);padding:10px 0}
  a{color:var(--magenta)}
  a:focus-visible{outline:2px solid var(--magenta);outline-offset:1px}
</style></head><body>
<header>
  <div><h1>Google Review Monitor</h1><div class="sub">Automatically checks disputed Google reviews every morning</div></div>
  <div class="pill"><span class="dot"></span><span>Monitoring active</span></div>
</header>
<main>
  <div class="banner bad" id="failBanner"></div>
  <div class="banner note" id="unknownBanner"></div>
  <div class="stats" id="stats"></div>
  <div class="schedule" id="schedule">Loading…</div>
  <div class="monthbar" id="monthbar"><label for="month">Month:</label><select id="month"></select><button id="runNow" type="button">Run now</button></div>
  <div class="monthnote" id="monthNote"></div>

  <section>
    <h2>Review status</h2>
    <div id="status"></div>
  </section>

  <section>
    <h2>Recent activity</h2>
    <div class="card"><div class="activity" id="activity"></div></div>
  </section>
</main>
<script>
const $=id=>document.getElementById(id);
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
async function api(p){const r=await fetch(p);if(!r.ok)throw new Error(r.status);return r.json()}

let currentProject=null, availableMonths=[];
function withProject(path){return currentProject?path+(path.includes('?')?'&':'?')+'project='+encodeURIComponent(currentProject):path}
function pickDefaultProject(list){
  const synced=list.filter(m=>m.lastSyncedAt).sort((a,b)=>new Date(b.lastSyncedAt)-new Date(a.lastSyncedAt));
  return (synced[0]||list[0]).projectGid;
}

async function loadMonths(){
  availableMonths=await api('api/available-months');
  const bar=$('monthbar');
  if(!availableMonths.length){bar.classList.remove('show');$('monthNote').textContent='';return}
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
  btn.textContent=running?'Running…':'Run now';
  $('monthNote').textContent=running?'A check is currently running for this month — this can take a while.'
    :m&&m.lastRunError?'Last run failed: '+m.lastRunError
    :m&&m.lastSyncedAt?'Last synced '+dayLabel(m.lastSyncedAt)+', '+timeLabel(m.lastSyncedAt)
    :'Never synced yet — click Run now.';
}

$('runNow').onclick=async()=>{
  if(!currentProject)return;
  const m=availableMonths.find(x=>x.projectGid===currentProject);
  const btn=$('runNow');btn.disabled=true;btn.textContent='Starting…';
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

async function loadSummary(){
  const s=await api(withProject('api/summary'));
  const st=$('stats');st.replaceChildren();
  for(const [k,v,c] of [['Monitored',s.monitored,''],['Still available',s.exists,'green'],['Removed',s.removed,s.removed?'red':'']]){
    const d=el('div',null,'stat '+c);d.append(el('b',v),el('span',k));st.append(d)}

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

async function refresh(){await loadMonths();await Promise.all([loadSummary(),loadStatus(),loadActivity()])}
refresh().catch(e=>{$('schedule').textContent='Failed to load: '+e.message});
setInterval(refresh,60000);
</script></body></html>`;
