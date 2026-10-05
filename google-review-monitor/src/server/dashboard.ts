// Single static page. Palette is strictly white / green / red. All data is inserted via
// textContent / DOM APIs (never innerHTML), so review text cannot inject markup.
export const dashboardHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Google Review Monitor</title>
<style>
  :root{
    --white:#ffffff; --green:#1b7f3b; --green-dark:#0f5a28; --green-tint:#eaf6ee; --green-line:#cfe6d6;
    --red:#c62828; --red-tint:#fdecec; --red-line:#f3c7c7;
  }
  *{box-sizing:border-box}
  html{color-scheme:light}
  body{margin:0;background:var(--white);color:var(--green-dark);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
  header{background:var(--green);color:var(--white);padding:18px 24px}
  header h1{margin:0;font-size:20px;font-weight:650}
  header .sub{margin-top:4px;font-size:13px;opacity:.92}
  main{max-width:1180px;margin:0 auto;padding:20px 24px 40px}
  .alert{display:none;margin:0 0 16px;padding:10px 14px;border:1px solid var(--red-line);background:var(--red-tint);color:var(--red);border-radius:8px;font-weight:600}
  .alert.show{display:block}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
  .stat{border:1px solid var(--green-line);border-radius:10px;padding:12px 16px;background:var(--white)}
  .stat b{display:block;font-size:28px;line-height:1.1}
  .stat span{font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .stat.green{background:var(--green-tint)} .stat.green b{color:var(--green)}
  .stat.red{background:var(--red-tint);border-color:var(--red-line)} .stat.red b,.stat.red span{color:var(--red)}
  .filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
  .filters label{font-size:12px;display:flex;gap:6px;align-items:center}
  select,input{font:inherit;color:var(--green-dark);background:var(--white);border:1px solid var(--green-line);border-radius:8px;padding:6px 9px}
  select:focus,input:focus,button:focus-visible,a:focus-visible{outline:2px solid var(--green);outline-offset:1px}
  .wrap{overflow-x:auto;border:1px solid var(--green-line);border-radius:10px}
  table{border-collapse:collapse;width:100%;min-width:900px}
  th{background:var(--green-tint);color:var(--green-dark);text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.04em;padding:9px 12px;border-bottom:1px solid var(--green-line)}
  td{padding:10px 12px;border-bottom:1px solid var(--green-line);vertical-align:top}
  tr:last-child td{border-bottom:0}
  tr.removed td{background:var(--red-tint)}
  tr.removed td:first-child{box-shadow:inset 4px 0 0 var(--red)}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:650;border:1px solid transparent}
  .badge.ok{background:var(--green);color:var(--white)}
  .badge.bad{background:var(--red);color:var(--white)}
  .badge.unk{background:var(--white);color:var(--red);border-color:var(--red)}
  .stars{color:var(--green);letter-spacing:1px;font-size:13px}
  tr.removed .stars{color:var(--red)}
  .text{margin-top:2px;max-width:340px;white-space:pre-line;overflow-wrap:anywhere}
  .text.clip{cursor:pointer}
  .red{color:var(--red);font-weight:600} .green{color:var(--green);font-weight:600}
  a{color:var(--green);font-weight:600} tr.removed a{color:var(--red)}
  button{font:inherit;font-size:12px;color:var(--green);background:var(--white);border:1px solid var(--green);border-radius:6px;padding:2px 8px;cursor:pointer}
  button:hover{background:var(--green-tint)}
  tr.hist td{background:var(--white);color:var(--green-dark);font-size:12px;white-space:pre-line}
  .empty{padding:28px;text-align:center}
</style></head><body>
<header><h1>Google Review Monitor</h1><div class="sub" id="last">Loading…</div></header>
<main>
  <div class="alert" id="alert"></div>
  <div class="stats" id="stats"></div>
  <div class="filters">
    <select id="status" aria-label="Status"><option value="">All statuses</option><option value="REVIEW_REMOVED">Removed</option><option value="REVIEW_EXISTS">Still available</option><option value="UNKNOWN">Unknown</option></select>
    <select id="location" aria-label="Location"><option value="">All locations</option></select>
    <select id="month" aria-label="Month"><option value="">All months</option></select>
    <label>From <input type="date" id="from"></label>
    <label>To <input type="date" id="to"></label>
  </div>
  <div class="wrap"><table><thead><tr><th>Location</th><th>Reviewer</th><th>Review</th><th>Month</th><th>Status</th><th>Removed</th><th>Last checked</th><th>Notification</th><th>Links</th></tr></thead><tbody id="rows"></tbody></table></div>
</main>
<script>
const $=id=>document.getElementById(id);
const fmt=d=>d?new Date(d).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—';
const fmtD=d=>d?new Date(d).toLocaleDateString([], {dateStyle:'medium'}):'—';
const BADGE={REVIEW_REMOVED:['Removed','bad'],REVIEW_EXISTS:['Available','ok'],UNKNOWN:['Unknown','unk']};
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
async function api(p){const r=await fetch(p);if(!r.ok)throw new Error(r.status);return r.json()}

async function loadSummary(){
  const s=await api('/api/summary');
  const st=$('stats');st.replaceChildren();
  for(const [k,v,c] of [['Monitored',s.monitored,''],['Still available',s.exists,'green'],['Removed',s.removed,s.removed?'red':''],['Unknown',s.unknown,'']]){
    const d=el('div',null,'stat '+c);d.append(el('b',v),el('span',k));st.append(d)}
  $('last').textContent='Last check: '+fmt(s.lastCheckAt)+'  ·  Last notification: '+fmt(s.lastNotificationAt);
  const a=$('alert');
  if(s.notificationsFailing){a.textContent=s.notificationsFailing+' removal notification(s) could not be emailed. They will be retried at the next run.';a.classList.add('show')}
  else a.classList.remove('show');
}
async function loadFilters(){
  const f=await api('/api/filters');
  for(const [id,arr] of [['location',f.locations],['month',f.months]])for(const v of arr){const o=el('option',v);o.value=v;$(id).append(o)}
}
function reviewCell(r){
  const td=document.createElement('td');
  if(r.rating)td.append(el('div','★'.repeat(r.rating)+'☆'.repeat(5-r.rating),'stars'));
  const full=r.review_text||'—',clip=full.length>160;
  const t=el('div',clip?full.slice(0,160)+'…':full,'text'+(clip?' clip':''));
  if(clip){let open=false;t.title='Click to expand';t.onclick=()=>{open=!open;t.textContent=open?full:full.slice(0,160)+'…'}}
  td.append(t);return td}
function linkTo(text,href){const a=el('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a}
async function loadRows(){
  const q=new URLSearchParams();for(const id of ['status','location','month','from','to'])if($(id).value)q.set(id,$(id).value);
  const rows=await api('/api/reviews?'+q);const tb=$('rows');tb.replaceChildren();
  if(!rows.length){const tr=document.createElement('tr'),td=el('td','No reviews match.','empty');td.colSpan=9;tr.append(td);tb.append(tr);return}
  for(const r of rows){
    const tr=document.createElement('tr');if(r.status==='REVIEW_REMOVED')tr.className='removed';
    const [lab,cls]=BADGE[r.status]||[r.status,'unk'];
    const nCell=el('td');
    if(r.status!=='REVIEW_REMOVED')nCell.textContent='—';
    else if(r.notification_sent){nCell.textContent='Sent '+fmtD(r.notification_sent_at);nCell.className='green'}
    else{nCell.textContent=r.last_notification_error?'Failed, will retry':'Pending';nCell.className='red'}
    const links=el('td');const h=el('button','History');h.onclick=()=>toggleHist(r.id,tr);
    links.append(linkTo('Asana',r.asana_task_url),' · ',linkTo('Google',r.google_review_url),' ',h);
    tr.append(el('td',r.location||'—'),el('td',r.reviewer_name||'—'),reviewCell(r),el('td',r.month||'—'),
      (()=>{const td=el('td');td.append(el('span',lab,'badge '+cls));return td})(),
      el('td',fmtD(r.removed_at)),el('td',fmt(r.last_checked_at)),nCell,links);
    tb.append(tr);
  }
}
async function toggleHist(id,tr){
  const next=tr.nextSibling;if(next&&next.className==='hist'){next.remove();return}
  const h=await api('/api/reviews/'+id+'/history');const t=document.createElement('tr');t.className='hist';
  const td=el('td',h.map(x=>fmt(x.checked_at)+' — '+x.result+(x.reason?' ('+x.reason+')':'')).join('\\n')||'No checks yet');td.colSpan=9;t.append(td);tr.after(t);
}
for(const id of ['status','location','month','from','to'])$(id).onchange=loadRows;
async function refresh(){await Promise.all([loadSummary(),loadRows()])}
loadFilters().then(refresh).catch(e=>{$('last').textContent='Failed to load: '+e.message});
setInterval(refresh,60000);
</script></body></html>`;
