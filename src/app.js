/* Mission Top Marks – Englisch-Vokabeltrainer für Romy */
(function(){
'use strict';
const KEY = 'romy-englisch-nov26-v1';
const LEVELS = [
  { n:'Beginner', at:0 }, { n:'Learner', at:200 }, { n:'Scholar', at:500 },
  { n:'Expert', at:1000 }, { n:'Top Marks!', at:1600 }
];
const SETS = [
  { k:'pol', label:'Politik' }, { k:'mon', label:'Text 6' }, { k:'arg', label:'Skills Lab' }, { k:'bx', label:'Brexit' },
  { k:'alle', label:'Alle' }, { k:'fehler', label:'Fehlerliste' }
];
const DIRS = [ { k:'en', label:'EN → DE' }, { k:'de', label:'DE → EN' }, { k:'mix', label:'Gemischt' } ];
const SSETS = [ { k:'n', label:'Nomen' }, { k:'v', label:'Verben' }, { k:'adj', label:'Adjektive' }, { k:'adv', label:'Adverbien' }, { k:'alle', label:'Alle' }, { k:'fehler', label:'Fehlerliste' } ];
const AID_LABEL = { ex:'Beispielsatz', def:'Definition', wf:'Wortfamilie', col:'Kollokationen', syn:'Synonym' };

/* ---------- Zustand ---------- */
let S = { box:{}, right:{}, wrong:{}, xp:0, steps:{}, set:'pol', dir:'en', sset:'v', best:0, sbest:0, tests:[], testDate:null };
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch(e){}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }

const byId = {}; W.forEach(w => byId[w.id] = w); SYN.forEach(s => byId[s.id] = s);
const $ = s => document.querySelector(s);
const view = () => $('#view');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const decode = s => String(s).replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&');
const stripTags = s => String(s).replace(/<[^>]+>/g,'');
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const rnd = a => a[Math.floor(Math.random()*a.length)];

/* ---------- Wortformen ---------- */
function speakForm(w){
  let s = decode(w.en);
  s = s.replace(/\(to\)\s*/g,'to ').replace(/\s*\(MP\)/g,'').replace(/\s*\((n|Pl)\)/g,'').replace(/\(([^)]*)\)/g,'$1');
  s = s.replace(/sb\.\/sth\./g,'somebody').replace(/sth\./g,'something').replace(/sb\./g,'somebody').replace(/…/g,'').replace(/\s*\/\s*/g,' or ');
  return s.replace(/\s+/g,' ').trim();
}
function enMain(w){ return w.gap[0]; }
function sheetOf(w){ return SHEETS[w.s]; }
function enHtml(w){ return esc(decode(w.en)) + (w.ipa ? '<span class="ipa">[' + esc(w.ipa) + ']</span>' : ''); }
function aidHtml(a){ return esc(a.x).replace(/\[\[([^\]]+)\]\]/g,'<b>$1</b>'); }
function aidQuiz(a){ return esc(a.x).replace(/\[\[([^\]]+)\]\]/g,'<span class="blank">&nbsp;</span>'); }
function aidWord(a){ const m = /\[\[([^\]]+)\]\]/.exec(a.x); return m ? m[1] : null; }
const AID_QUIZ = ['ex','def','wf','syn'];

/* ---------- Antwort prüfen ---------- */
const ART_DE = /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer) /;
const ART_EN = /^(the|a|an|to) /;
const FILL_EN = /\b(sth|sb|something|somebody|someone|one's)\b/g;
const FILL_DE = /\b(etw|etwas|jd|jdn|jdm|jmd|jmdn|jmdm|jemand|jemanden|jemandem)\b/g;
function norm(s, lang){
  s = decode(stripTags(s)).toLowerCase().normalize('NFC');
  s = s.replace(/[¿?¡!.,;:"'’“”„()\[\]…]/g,' ').replace(/[\/\-–—]/g,' ');
  s = s.replace(lang==='de' ? FILL_DE : FILL_EN, ' ');
  s = s.replace(/\s+/g,' ').trim();
  s = s.replace(lang==='de' ? ART_DE : ART_EN,'');
  if (lang !== 'de') s = s.replace(ART_EN,'');
  return s.trim();
}
const deacc = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss');
const fold = s => deacc(s).replace(/ae|oe|ue/g, m => m[0]);
const squash = s => s.replace(/ /g,'');
function lev(a, b){
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({length:b.length+1}, (_,i)=>i);
  let prev2 = null;
  for (let i=1;i<=a.length;i++){ const cur=[i]; for (let j=1;j<=b.length;j++){ cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    if (i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) cur[j] = Math.min(cur[j], prev2[j-2]+1); } prev2 = prev; prev = cur; }
  return prev[b.length];
}
/* Schreibvarianten einer Vorgabe: Klammern weglassen oder einsetzen ("(to) win" -> "win" / "to win"), "/in" entfernen */
function variants(s){
  s = decode(stripTags(s)).replace(/\/in\b/g,'').replace(/\(in\)/g,'').replace(/\(n\)|\(Pl\)|\(MP\)/g,'');
  return [ s.replace(/\s*\([^)]*\)/g,''), s.replace(/\(([^)]*)\)/g,'$1') ];
}
const SPLIT = /\s*(?:\/|;|,|–|—|\bbzw\.?\b|\boder\b|\bor\b)\s*/;
function matchOne(ni, alts, lang){
  let near = false;
  const f = lang==='de' ? fold : deacc;
  for (const na of alts){
    if (ni === na) return 'ok';
    if (f(ni) === f(na)) return 'ok';
    if (squash(f(ni)) === squash(f(na))) return 'ok';
    const tol = na.length >= 12 ? 2 : na.length >= 5 ? 1 : 0;
    if (tol && lev(f(ni), f(na)) <= tol) near = true;
  }
  return near ? 'near' : 'bad';
}
/* alts: explizit erlaubte Antworten; display: die Vorgabe vom Blatt (alle Schreibweisen darin gelten); keys: Stichwörter für lange Erklärungen */
function check(input, alts, lang, display, keys){
  if (!norm(input, lang)) return 'empty';
  const whole = new Set(alts.map(a => norm(a, lang)));
  const parts = new Set(whole);
  if (display){
    variants(display).forEach(v => { whole.add(norm(v, lang)); v.split(SPLIT).forEach(x => { const n = norm(x, lang); if (n) parts.add(n); }); });
  }
  const inVars = variants(input).map(v => norm(v, lang)).filter(Boolean);
  let best = 'bad';
  for (const v of inVars){ const r = matchOne(v, whole, lang); if (r === 'ok') return 'ok'; if (r === 'near') best = 'near'; }
  if (best === 'near') return 'near';
  for (const v of variants(input)){
    const ps = v.split(SPLIT).map(x => norm(x, lang)).filter(Boolean);
    if (ps.length < 2) continue;
    const rs = ps.map(x => matchOne(x, parts, lang));
    if (rs.every(r => r === 'ok')) return 'ok';
    if (rs.every(r => r !== 'bad')) best = 'near';
  }
  if (keys && keys.length){ const fi = fold(norm(input, lang)); if (keys.some(k => fi.includes(fold(k)))) return 'ok'; }
  return best;
}
function checkWord(input, w, dir){
  if (dir === 'en') return check(input, w.deA, 'de', w.de, w.keys);
  return check(input, w.enA.concat(w.gap), 'en', w.en);
}

/* ---------- Lernstand ---------- */
const box = id => S.box[id] || 0;
const weak = w => (S.wrong[w.id]||0) > 0 && box(w.id) < 3;
function pool(set){
  if (set === 'alle') return W.slice();
  if (set === 'fehler') return W.filter(weak);
  return W.filter(w => w.s === set);
}
function spool(set){
  if (set === 'alle') return SYN.slice();
  if (set === 'fehler') return SYN.filter(weak);
  return SYN.filter(s => s.cls === set);
}
function masteryOf(p){ if (!p.length) return 0; return Math.round(100 * p.reduce((a,w)=>a+box(w.id),0) / (3*p.length)); }
function mastery(set){ return masteryOf(pool(set)); }
function markRight(w, n){ S.right[w.id] = (S.right[w.id]||0)+1; S.box[w.id] = Math.min(3, box(w.id)+1); award(n==null?10:n); save(); }
function markNear(w){ S.box[w.id] = Math.min(3, box(w.id)+1); S.wrong[w.id] = (S.wrong[w.id]||0)+1; award(5); save(); }
function markWrong(w){ S.wrong[w.id] = (S.wrong[w.id]||0)+1; S.box[w.id] = 0; save(); }
function pick(p, n){
  const scored = p.map(w => ({ w, s: box(w.id)*2 + (S.right[w.id]||0) - 2*(S.wrong[w.id]||0) + Math.random()*4 }));
  scored.sort((a,b)=>a.s-b.s);
  return shuffle(scored.slice(0, Math.min(n, p.length)).map(x=>x.w));
}

/* ---------- XP / Kopf ---------- */
function levelOf(xp){ let l = LEVELS[0], next = null; for (let i=0;i<LEVELS.length;i++){ if (xp >= LEVELS[i].at){ l = LEVELS[i]; next = LEVELS[i+1]||null; } } return { l, next }; }
function award(n){ if (!n) return; S.xp += n; renderHead(); toast('+'+n+' XP'); }
function renderHead(){
  const { l, next } = levelOf(S.xp);
  $('#lvl').textContent = l.n;
  const pct = next ? Math.round(100*(S.xp-l.at)/(next.at-l.at)) : 100;
  $('#xpfill').style.width = pct+'%';
  $('#xpnum').textContent = S.xp + ' XP' + (next ? ' · '+(next.at-S.xp)+' bis '+next.n : '');
}
let toastT; function toast(msg){ const t=$('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('show'), 1300); }

/* ---------- Sprache ---------- */
let voice = null;
function pickVoice(){ try { const vs = speechSynthesis.getVoices(); voice = vs.find(v=>/^en[-_]GB/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null; } catch(e){} }
if ('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, rate){
  if (!('speechSynthesis' in window)) { toast('Kein Ton auf diesem Gerät'); return; }
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; if (voice) u.voice = voice; u.rate = rate || 0.9; speechSynthesis.speak(u); } catch(e){}
}

/* ---------- Bausteine ---------- */
function chips(list, cur, poolFn, onPick){
  const d = document.createElement('div'); d.className = 'chips';
  list.forEach(it => {
    const b = document.createElement('button'); b.type='button';
    b.className = 'chip'+(it.cls?' '+it.cls:'')+(it.k===cur?' on':'');
    b.textContent = it.label + (it.k==='fehler' ? ' ('+poolFn('fehler').length+')' : '');
    if (it.k==='fehler' && !poolFn('fehler').length) b.disabled = true;
    b.onclick = () => onPick(it.k);
    d.appendChild(b);
  });
  return d;
}
function setChips(cur, onPick){ return chips(SETS, cur, pool, onPick); }
function dirChips(cur, onPick){ return chips(DIRS, cur, pool, onPick); }
function ssetChips(cur, onPick){ return chips(SSETS, cur, spool, onPick); }
function el(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function progressLine(results, total, cur){
  let h = '<div class="progress-line">';
  for (let i=0;i<total;i++){ h += '<i class="'+(results[i]||(i===cur?'cur':''))+'"></i>'; }
  return h+'</div>';
}
function testDate(){ if (!S.testDate) return null; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(S.testDate); return m ? new Date(+m[1], +m[2]-1, +m[3]) : null; }
function fmtDate(d){ return d.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' }); }
function countdownText(){
  const td = testDate();
  if (!td) return 'Testdatum noch nicht eingetragen.';
  const today = new Date(); today.setHours(0,0,0,0);
  const d = Math.round((td - today)/86400000);
  if (d === 0) return 'Heute ist der Test. You can do this!';
  if (d === 1) return 'Der Test ist morgen. Heute wird gesprintet.';
  if (d > 1) return 'Noch '+d+' Tage bis zum Test.';
  return 'Der Test war am '+td.toLocaleDateString('de-DE')+' – zum Wiederholen trotzdem gut.';
}

/* ---------- Router ---------- */
const ROUTES = { plan:vPlan, woerter:vWords, karten:vCards, ueben:vPractice, synonyme:vSyn, test:vTest, spick:vCheat };
let current = null;
function go(hash){ location.hash = hash; }
function route(){
  const h = (location.hash||'#plan').slice(1).split('-')[0];
  const fn = ROUTES[h] || vPlan;
  document.querySelectorAll('nav.tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#'+h));
  try { speechSynthesis.cancel(); } catch(e){}
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  const v = view(); v.innerHTML = ''; v.scrollTop = 0; window.scrollTo(0,0);
  const sec = document.createElement('section'); sec.className = 'view'; v.appendChild(sec);
  current = h; fn(sec);
}
window.addEventListener('hashchange', route);

/* =========================================================
   PLAN
   ========================================================= */
const STEPS = [
  { k:'1', t:'Politik kennenlernen', s:'Karten EN → DE, jede Karte einmal laut lesen. Eselsbrücke lesen, wenn das Wort fremd ist.', min:12, go:()=>{S.set='pol';S.dir='en';save();go('#karten');} },
  { k:'2', t:'Politik im Multiple Choice', s:'Beide Richtungen gemischt. Fehler landen automatisch in der Fehlerliste.', min:5, go:()=>startPractice('mc','pol','mix') },
  { k:'3', t:'Text 6 und Skills Lab: Karten', s:'Die 23 Textvokabeln mit ihren Sätzen. Achte auf Präpositionen (divided over, dissimilar to, rooted in).', min:8, go:()=>{S.set='mon';S.dir='en';save();go('#karten');} },
  { k:'4', t:'Brexit kennenlernen', s:'Karten EN → DE. Bei den langen deutschen Erklärungen reicht später das Stichwort.', min:10, go:()=>{S.set='bx';S.dir='en';save();go('#karten');} },
  { k:'5', t:'Texte und Brexit im Multiple Choice', s:'Alle Blätter gemischt, beide Richtungen.', min:6, go:()=>startPractice('mc','alle','mix') },
  { k:'6', t:'Schreiben DE → EN, alle Blätter', s:'Der Ernstfall: Deutsch sehen, Englisch tippen. Zwei Runden.', min:15, go:()=>startPractice('write','alle','de') },
  { k:'7', t:'Memory Aids und Lückentexte', s:'Definition oder Beispielsatz vom Blatt sehen, das Wort tippen. So fragt die Lehrerin vielleicht.', min:10, go:()=>startPractice('aid','alle','en') },
  { k:'8', t:'Synonyme: Zuordnen, dann Ersetzen', s:'Erst Multiple Choice durch alle Wortarten, dann im Satz ersetzen. Ziel: zu jedem Wort drei Alternativen parat.', min:15, go:()=>startSyn('smc','alle') },
  { k:'9', t:'Pause: mindestens 30 Minuten', s:'Nichts tun, essen, rausgehen. Das Gehirn speichert jetzt. Ohne Pause verpufft die Hälfte.', min:30 },
  { k:'10', t:'Nur die Fehlerliste', s:'Blitzrunde und danach Schreiben. Bis die Liste leer ist oder nur noch 3 Wörter hat.', min:10, go:()=>startPractice('blitz','fehler','mix') },
  { k:'11', t:'Synonyme: Drei nennen', s:'Zu jedem abgenutzten Wort drei Synonyme tippen. Das ist die Königsdisziplin.', min:10, go:()=>startSyn('sthree','alle') },
  { k:'12', t:'Spickzettel vor dem Schlafen', s:'Einmal in Ruhe durchlesen, Englisch dabei leise mitsprechen. Dann Handy weg. Schlaf festigt Vokabeln.', min:5, go:()=>go('#spick') },
  { k:'13', t:'Morgen früh: Generalprobe', s:'25 Aufgaben wie im echten Test, benotet. Bei Note 1 bist du fertig. Sonst noch einmal Fehlerliste.', min:12, go:()=>go('#test') }
];
function vPlan(sec){
  const total = STEPS.reduce((a,s)=>a+s.min,0);
  const done = STEPS.filter(s=>S.steps[s.k]).length;
  const td = testDate();
  sec.appendChild(el(`
    <div class="poster">
      <span class="stamp">Test me!</span>
      <div class="eyebrow">Vokabeltest Englisch${td?' · '+esc(fmtDate(td)):''}</div>
      <h2 style="margin:.25rem 0 .4rem">Romys Sprint zur 1</h2>
      <p class="countdown" style="margin:0 0 .5rem"><button type="button" id="setdate" title="Testdatum ändern">${esc(countdownText())}</button></p>
      <div class="datebox" id="datebox" hidden><label for="tdate" class="small">Testdatum:</label><input type="date" id="tdate" value="${esc(S.testDate||'')}"><button class="btn sm" id="tdsave">Speichern</button></div>
      <p style="margin:0">${W.length} Vokabeln aus vier Blättern: <b>Politik</b> (${pool('pol').length}), <b>Text 6 Monarchie</b> (${pool('mon').length}), <b>Skills Lab</b> (${pool('arg').length}), <b>Brexit</b> (${pool('bx').length}) – dazu <span class="hl">${SYN.length} Synonymgruppen</span> aus dem Thesaurus. Plan: etwa ${total} Minuten inklusive Pause, aufgeteilt in heute Abend und morgen früh.</p>
    </div>`));
  const db = sec.querySelector('#datebox');
  sec.querySelector('#setdate').onclick = () => { db.hidden = !db.hidden; if (!db.hidden) sec.querySelector('#tdate').focus(); };
  sec.querySelector('#tdsave').onclick = () => { S.testDate = sec.querySelector('#tdate').value || null; save(); route(); };
  const prog = el('<div class="prog"></div>');
  ['pol','mon','arg','bx'].forEach(k => {
    const m = mastery(k);
    const c = el(`<button class="pcard" type="button"><span class="eyebrow">${esc(SHEETS[k].short)}</span><span class="n">${m}%</span><div class="bar"><i style="width:${m}%"></i></div><span class="small muted">${pool(k).length} Wörter · ${pool(k).filter(w=>box(w.id)===3).length} sicher</span></button>`);
    c.onclick = () => { S.set = k; save(); go('#karten'); };
    prog.appendChild(c);
  });
  const sm = masteryOf(SYN);
  const sc = el(`<button class="pcard" type="button"><span class="eyebrow">Synonyme</span><span class="n">${sm}%</span><div class="bar y"><i style="width:${sm}%"></i></div><span class="small muted">${SYN.length} Gruppen · ${SYN.filter(w=>box(w.id)===3).length} sicher</span></button>`);
  sc.onclick = () => go('#synonyme'); prog.appendChild(sc);
  sec.appendChild(prog);
  const f = pool('fehler').length, sf = spool('fehler').length;
  sec.appendChild(el(`<div class="note ${f+sf?'r':'g'} row between"><div><b>Fehlerliste: ${f} ${f===1?'Wort':'Wörter'}${sf?', '+sf+' Synonymgruppe'+(sf===1?'':'n'):''}</b><br><span class="small">${f+sf?'Diese hast du schon einmal falsch gehabt. Sie verschwinden, sobald du sie dreimal richtig hast.':'Noch leer. Sie füllt sich automatisch beim Üben.'}</span></div><div class="row">${f?'<button class="btn sm" id="pf">Wörter üben</button>':''}${sf?'<button class="btn sm" id="psf">Synonyme üben</button>':''}</div></div>`));
  if (f) sec.querySelector('#pf').onclick = () => startPractice('write','fehler','de');
  if (sf) sec.querySelector('#psf').onclick = () => startSyn('swrite','fehler');

  sec.appendChild(el(`<div class="row between"><h2>Der Plan</h2><span class="muted small">${done}/${STEPS.length} erledigt</span></div>`));
  const ol = el('<ol class="steps"></ol>');
  STEPS.forEach(st => {
    const li = el(`<li class="${S.steps[st.k]?'done':''}"><span class="k">${S.steps[st.k]?'✓':st.k}</span><div class="t"><b>${esc(st.t)}</b> <span class="muted small">· ${st.min} Min.</span><small>${esc(st.s)}</small></div><div class="row" style="flex-wrap:nowrap"></div></li>`);
    const acts = li.querySelector('.row');
    if (st.go){ const b = el('<button class="btn sm primary">Los</button>'); b.onclick = st.go; acts.appendChild(b); }
    const chk = el(`<button class="iconbtn" title="Als erledigt markieren" aria-label="Erledigt umschalten">${S.steps[st.k]?'↺':'☐'}</button>`);
    chk.onclick = () => { S.steps[st.k] = !S.steps[st.k]; if (S.steps[st.k]) award(15); save(); route(); };
    acts.appendChild(chk);
    ol.appendChild(li);
  });
  sec.appendChild(ol);
  sec.appendChild(el(`
    <details class="fam"><summary>Warum der Plan so aufgebaut ist</summary><div class="body stack">
      <p><b>Abrufen statt Anschauen.</b> Jedes Mal, wenn du ein Wort aus dem Gedächtnis holst, wird die Spur stärker. Deshalb gibt es hier fast nur Übungen, bei denen du antworten musst.</p>
      <p><b>Beide Richtungen.</b> Im Test musst du vermutlich Deutsch → Englisch schreiben oder zu einer Definition das Wort finden. Beides ist schwerer als Erkennen, deshalb kommt es nach dem Kennenlernen am häufigsten dran.</p>
      <p><b>Fehler sind Gold.</b> Jedes falsche Wort landet in der Fehlerliste und wird öfter abgefragt. So übst du genau das, was noch wackelt, und nicht alles gleich oft.</p>
      <p><b>Synonyme in drei Stufen.</b> Erst erkennen (Multiple Choice), dann im Satz ersetzen, dann drei nennen. Wer zu jedem abgenutzten Wort drei Alternativen hat, kann im Test nichts mehr verlieren.</p>
      <p><b>Pause und Schlaf.</b> Nach einer Lernphase mit Pause behältst du deutlich mehr. Die Wiederholung morgen früh ist der wichtigste Teil.</p>
    </div></details>
    `));
  sec.appendChild(el(`
    <div class="note y"><b>Im Test selbst:</b> Präpositionen mitschreiben (<i>divided <b>over</b>, dissimilar <b>to</b>, contribute <b>to</b>, rooted <b>in</b></i>), Titel groß schreiben (<i>Prime Minister, House of Commons</i>), <i>customs</i> immer im Plural. Bei Synonymen lieber drei nennen als eins – und keins, das nur so ähnlich klingt. Lies die deutsche Vorgabe genau: „Regierungschef“ ist <i>head of government</i>, „Staatsoberhaupt“ ist <i>head of state</i>.</div>`));
}

/* =========================================================
   WÖRTER
   ========================================================= */
let wordFilter = '';
function vWords(sec){
  sec.appendChild(el('<h2>Wörter &amp; Eselsbrücken</h2>'));
  sec.appendChild(setChips(S.set, k => { S.set = k; save(); route(); }));
  const inp = el('<input class="search" id="search" type="search" placeholder="Suchen (englisch oder deutsch)…" autocomplete="off">');
  inp.value = wordFilter; sec.appendChild(inp);
  const list = el('<div class="wl"></div>'); sec.appendChild(list);
  function draw(){
    list.innerHTML = '';
    const q = norm(wordFilter, 'en');
    let p = pool(S.set);
    if (q) p = W.filter(w => deacc(norm(w.en,'en')).includes(deacc(q)) || fold(norm(w.de,'de')).includes(fold(q)));
    if (!p.length) list.appendChild(el('<p class="muted">Nichts gefunden.</p>'));
    p.forEach(w => {
      const b = box(w.id);
      const d = el(`<div class="w ${weak(w)?'weak':''}">
        <div class="en">${enHtml(w)}${w.line?'<span class="ln">l. '+w.line+'</span>':''}</div>
        <div class="acts"><button class="iconbtn" title="Anhören" aria-label="Anhören">🔊</button><button class="iconbtn" title="Eselsbrücke" aria-label="Eselsbrücke">💡</button></div>
        <div class="de">${esc(w.de)}</div>
        ${w.aid?'<div class="aid"><span class="lbl">'+AID_LABEL[w.aid.t]+'</span>'+aidHtml(w.aid)+'</div>':''}
        <div class="boxes" title="Lernstand ${b}/3"><i class="${b>0?'f':''}"></i><i class="${b>1?'f':''}"></i><i class="${b>2?'f':''}"></i></div>
      </div>`);
      const [sp, tip] = d.querySelectorAll('.iconbtn');
      sp.onclick = () => speak(speakForm(w));
      tip.onclick = () => { let t = d.querySelector('.tip'); if (t) { t.remove(); return; } t = el('<div class="tip">'+w.tip+'<br><span class="muted">'+esc(w.sent.replace('___', enMain(w)))+' – '+esc(w.sentDe)+'</span></div>'); d.appendChild(t); };
      list.appendChild(d);
    });
  }
  inp.oninput = () => { wordFilter = inp.value; draw(); };
  draw();
  sec.appendChild(el('<details class="fam"><summary>Wortfamilien: ein Stamm, viele Vokabeln</summary><div class="body stack small">'+FAMILIES.map(f=>'<p>'+f+'</p>').join('')+'</div></details>'));
  sec.appendChild(el('<details class="fam"><summary>Stolperfallen</summary><div class="body tblwrap"><table>'+TRAPS.map(t=>'<tr><th>'+esc(t.k)+'</th><td>'+t.v+'</td></tr>').join('')+'</table></div></details>'));
  const sb = el('<button class="btn">Spickzettel öffnen</button>'); sb.onclick = () => go('#spick'); sec.appendChild(sb);
}

/* =========================================================
   KARTEN
   ========================================================= */
function vCards(sec){
  sec.appendChild(el('<h2>Karteikarten</h2>'));
  const top = el('<div class="stack"></div>');
  top.appendChild(setChips(S.set, k => { S.set = k; save(); route(); }));
  top.appendChild(dirChips(S.dir, k => { S.dir = k; save(); route(); }));
  sec.appendChild(top);
  let p = pool(S.set);
  if (!p.length){ sec.appendChild(el('<p class="note g">Die Fehlerliste ist leer. Wähle ein Blatt.</p>')); return; }
  let queue = pick(p, p.length);
  const total = queue.length; let seen = 0, known = 0, again = 0;
  const wrap = el('<div class="stack"></div>'); sec.appendChild(wrap);
  function next(){
    wrap.innerHTML = '';
    if (!queue.length){
      wrap.appendChild(el(`<div class="card ink stack"><h3>Runde fertig</h3><p>${total} Karten, <b>${known}</b> gleich gewusst, <b>${again}</b> noch einmal angeschaut.</p><div class="row"><button class="btn primary" id="r1">Noch eine Runde</button><button class="btn" id="r2">Jetzt Multiple Choice</button></div></div>`));
      wrap.querySelector('#r1').onclick = route;
      wrap.querySelector('#r2').onclick = () => startPractice('mc', S.set, S.dir);
      if (again === 0) confetti();
      return;
    }
    const w = queue[0];
    const front = S.dir === 'mix' ? (Math.random()<.5?'en':'de') : S.dir;
    const f = el(`<div class="flash" tabindex="0" role="button" aria-label="Karte umdrehen"><div class="inner">
      <div class="face"><span class="lang eyebrow">${front==='en'?'English':'Deutsch'}</span><span class="cnt muted small">${seen+1} / ${total}</span><div class="word">${front==='en'?enHtml(w):esc(w.de)}</div><span class="muted small">Tippen zum Umdrehen</span></div>
      <div class="face back"><span class="lang eyebrow">${front==='en'?'Deutsch':'English'}</span><span class="cnt muted small">${sheetOf(w).short}${w.line?' · l. '+w.line:''}</span><div class="word">${front==='en'?esc(w.de):enHtml(w)}</div><div class="hint muted" id="hint" hidden></div></div>
    </div></div>`);
    let flipped = false;
    const flip = () => { flipped = !flipped; f.classList.toggle('flipped', flipped); if (flipped && front==='de') speak(speakForm(w)); };
    f.onclick = flip; f.onkeydown = e => { if (e.key===' '||e.key==='Enter'){ e.preventDefault(); flip(); } };
    wrap.appendChild(f);
    if (front==='en') setTimeout(()=>speak(speakForm(w)), 150);
    const tools = el('<div class="row between"><div class="row"><button class="btn sm ghost" id="sp">🔊 Anhören</button><button class="btn sm ghost" id="tp">💡 Eselsbrücke</button></div><span class="muted small">Stand '+box(w.id)+'/3</span></div>');
    tools.querySelector('#sp').onclick = () => speak(speakForm(w));
    tools.querySelector('#tp').onclick = () => { const h = f.querySelector('#hint'); h.innerHTML = w.tip + (w.aid ? '<br><span class="small">'+AID_LABEL[w.aid.t]+': '+aidHtml(w.aid)+'</span>' : ''); h.hidden = false; if (!flipped) flip(); };
    wrap.appendChild(tools);
    const btns = el('<div class="row"><button class="btn bad grow" id="no">Nochmal</button><button class="btn ok grow" id="yes">Gewusst</button></div>');
    btns.querySelector('#yes').onclick = () => { queue.shift(); seen++; known++; markRight(w, 5); next(); };
    btns.querySelector('#no').onclick = () => { queue.shift(); seen++; again++; S.wrong[w.id]=(S.wrong[w.id]||0)+1; S.box[w.id]=Math.max(0,box(w.id)-1); save(); queue.splice(Math.min(3,queue.length),0,w); seen--; next(); };
    wrap.appendChild(btns);
    wrap.appendChild(el('<p class="muted small" style="margin:0">„Nochmal“ legt die Karte drei Plätze weiter hinten wieder ein. Erst umdrehen, dann ehrlich antworten.</p>'));
  }
  next();
}

/* =========================================================
   ÜBEN
   ========================================================= */
const MODES = [
  { k:'mc', t:'Multiple Choice', s:'Vier Antworten, eine stimmt. Zum Warmwerden.', dir:true },
  { k:'write', t:'Schreiben', s:'Antwort tippen, mit Präposition. So wie im Test.', dir:true },
  { k:'gap', t:'Lückentext', s:'Ein englischer Satz, ein fehlendes Wort oder eine Wendung.' },
  { k:'aid', t:'Memory Aid', s:'Definition, Beispielsatz oder Wortfamilie vom Blatt: Welches Wort ist gemeint?' },
  { k:'dict', t:'Diktat', s:'Hören und auf Englisch schreiben. Trainiert Rechtschreibung.' },
  { k:'pairs', t:'Paare', s:'Memory: Englisch und Deutsch zusammenbringen.' },
  { k:'blitz', t:'Blitzrunde', s:'60 Sekunden, so viele wie möglich. Rekord knacken.', dir:true }
];
let pr = { mode:'mc', set:S.set, dir:'mix' };
function startPractice(mode, set, dir){ pr = { mode, set, dir: dir||'mix' }; S.set = set; save(); if (current === 'ueben') { route(); } else go('#ueben'); setTimeout(()=>{ const b = $('#start'); if (b) b.click(); }, 0); }
function modePool(mode, set){ const p = pool(set); return mode==='aid' ? p.filter(w => w.aid && AID_QUIZ.includes(w.aid.t)) : p; }
function vPractice(sec){
  sec.appendChild(el('<h2>Üben</h2>'));
  const grid = el('<div class="opts"></div>');
  MODES.forEach(m => { const b = el(`<button class="opt ${pr.mode===m.k?'right':''}"><b>${m.t}</b><br><span class="small muted">${m.s}</span></button>`); b.onclick = () => { pr.mode = m.k; route(); }; grid.appendChild(b); });
  sec.appendChild(grid);
  sec.appendChild(setChips(pr.set, k => { pr.set = k; S.set = k; save(); route(); }));
  const m = MODES.find(x=>x.k===pr.mode);
  if (m.dir) sec.appendChild(dirChips(pr.dir, k => { pr.dir = k; route(); }));
  if (pr.mode==='blitz') sec.appendChild(el('<p class="muted small" style="margin:0">Rekord: <b>'+(S.best||0)+'</b> richtige in 60 Sekunden.</p>'));
  const start = el('<button class="btn primary big" id="start">Runde starten</button>');
  start.onclick = () => runRound(sec);
  const mp = modePool(pr.mode, pr.set);
  if (!mp.length){ start.disabled = true; sec.appendChild(el('<p class="note g">'+(pr.set==='fehler'?'Die Fehlerliste ist leer. Wähle ein Blatt.':'Auf diesem Blatt gibt es keine Memory Aids. Wähle Politik, Text 6 oder Skills Lab.')+'</p>')); }
  else if (pr.mode==='aid') sec.appendChild(el('<p class="muted small" style="margin:0">'+mp.length+' Wörter mit Memory Aid in dieser Auswahl.</p>'));
  sec.appendChild(start);
}

let timerHandle = null;
function runRound(sec){
  sec.innerHTML = '';
  const p = modePool(pr.mode, pr.set);
  const n = pr.mode==='pairs' ? 6 : (pr.mode==='blitz' ? p.length : Math.min(10, p.length));
  let items = pick(p, n);
  if (pr.mode==='blitz') items = shuffle(p);
  const results = []; let i = 0, ok = 0, near = 0;
  const head = el('<div class="row between"><span class="eyebrow">'+MODES.find(x=>x.k===pr.mode).t+' · '+esc(SETS.find(s=>s.k===pr.set).label)+'</span><button class="btn sm ghost" id="quit">Abbrechen</button></div>');
  head.querySelector('#quit').onclick = route;
  sec.appendChild(head);
  const prog = el('<div></div>'); sec.appendChild(prog);
  const body = el('<div class="q"></div>'); sec.appendChild(body);

  if (pr.mode==='pairs') return pairsGame(body, items, prog);
  if (pr.mode==='blitz') return blitz(body, items, prog);

  function dirFor(){ if (['gap','dict','aid'].includes(pr.mode)) return 'de'; return pr.dir==='mix' ? (Math.random()<.5?'en':'de') : pr.dir; }
  function record(w, r){
    results.push(r);
    if (r==='ok'){ ok++; markRight(w, 10); } else if (r==='near'){ near++; markNear(w); } else markWrong(w);
  }
  function finish(){
    prog.innerHTML = progressLine(results, items.length, -1);
    const pts = ok + near*0.5, pct = Math.round(100*pts/items.length);
    body.innerHTML = '';
    const wrongs = items.filter((w,k)=>results[k]!=='ok');
    body.appendChild(el(`<div class="card ink stack"><h3>${pct===100?'Perfekt. Brilliant!':pct>=80?'Stark. Well done!':pct>=60?'Gut dabei. Weiter so.':'Das wird. Die Fehler kommen jetzt öfter dran.'}</h3>
      <p><b>${ok}</b> richtig, <b>${near}</b> fast richtig (Tippfehler), <b>${items.length-ok-near}</b> falsch · ${pct}%</p>
      ${wrongs.length?'<ul class="result-list">'+wrongs.map(w=>'<li class="'+(results[items.indexOf(w)])+'"><span>'+(results[items.indexOf(w)]==='near'?'~':'✗')+'</span><div><b>'+esc(w.en)+'</b> – '+esc(w.de)+'<div class="small muted">'+w.tip+'</div></div></li>').join('')+'</ul>':''}
      <div class="row">${wrongs.length?'<button class="btn primary" id="again">Nur diese wiederholen</button>':''}<button class="btn" id="new">Neue Runde</button><button class="btn ghost" id="back">Zurück</button></div></div>`));
    if (wrongs.length) body.querySelector('#again').onclick = () => { items = shuffle(wrongs); results.length = 0; i = 0; ok = 0; near = 0; step(); };
    body.querySelector('#new').onclick = () => runRound(sec);
    body.querySelector('#back').onclick = route;
    if (pct===100 && items.length>=5) confetti();
  }
  function step(){
    if (i >= items.length) return finish();
    prog.innerHTML = progressLine(results, items.length, i);
    const w = items[i]; body.innerHTML = '';
    const dir = dirFor();
    const after = r => { record(w, r); i++; };
    if (pr.mode==='mc') mcQuestion(body, w, dir, p, r => { after(r); setTimeout(step, r==='ok'?700:0); });
    else if (pr.mode==='write') writeQuestion(body, w, dir, r => { after(r); }, step);
    else if (pr.mode==='gap') gapQuestion(body, w, r => { after(r); }, step);
    else if (pr.mode==='aid') aidQuestion(body, w, r => { after(r); }, step);
    else if (pr.mode==='dict') dictQuestion(body, w, r => { after(r); }, step);
  }
  step();
}

function mcQuestion(body, w, dir, p, done){
  const src = p.length >= 4 ? p : W;
  const distract = shuffle(src.filter(x=>x.id!==w.id && (dir==='en'? x.de!==w.de : x.en!==w.en))).slice(0,3);
  const opts = shuffle([w].concat(distract));
  body.appendChild(el('<div class="eyebrow">'+(dir==='en'?'Was heißt das auf Deutsch?':'Wie heißt das auf Englisch?')+'</div>'));
  const pm = el('<div class="prompt">'+(dir==='en'? enHtml(w) : esc(w.de))+'</div>'); body.appendChild(pm);
  if (dir==='en'){ const sp = el('<button class="btn sm ghost">🔊 Anhören</button>'); sp.onclick = () => speak(speakForm(w)); body.appendChild(sp); speak(speakForm(w)); }
  const grid = el('<div class="opts"></div>');
  opts.forEach(o => {
    const b = el('<button class="opt">'+(dir==='en'?esc(o.de):esc(o.en))+'</button>');
    b.onclick = () => {
      grid.querySelectorAll('.opt').forEach(x=>x.disabled=true);
      const r = o.id===w.id ? 'ok' : 'bad';
      b.classList.add(r==='ok'?'right':'wrong');
      if (r==='bad'){
        grid.querySelectorAll('.opt').forEach((x,k)=>{ if (opts[k].id===w.id) x.classList.add('right'); });
        body.appendChild(el('<div class="fb bad"><b>'+esc(w.en)+'</b> = '+esc(w.de)+'<br><span class="small">'+w.tip+'</span></div>'));
        const nx = el('<button class="btn primary">Weiter</button>'); nx.onclick = () => done('bad'); body.appendChild(nx); setTimeout(()=>nx.focus(), 350);
      } else { if (dir==='de') speak(speakForm(w)); done('ok'); }
    };
    grid.appendChild(b);
  });
  body.appendChild(grid);
}

/* Eingabefeld mit Prüfung. checkFn(input) -> ok | near | bad | empty */
function answerBox(body, checkFn, onResult, next, correctHtml, placeholder, nearMsg){
  const inp = el('<input class="ans" id="ans" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+esc(placeholder||'Antwort tippen…')+'">');
  body.appendChild(inp);
  const btn = el('<button class="btn primary">Prüfen</button>'); body.appendChild(btn);
  let doneFlag = false;
  function evaluate(){
    if (doneFlag) return;
    const r = checkFn(inp.value);
    if (r==='empty'){ inp.focus(); return; }
    doneFlag = true; inp.disabled = true; btn.remove();
    inp.classList.add(r);
    const msg = r==='ok' ? '<b>Richtig.</b> ' : r==='near' ? '<b>'+(nearMsg||'Fast: kleiner Tippfehler.')+'</b> Richtig ist: ' : '<b>Leider nicht.</b> Richtig ist: ';
    body.appendChild(el('<div class="fb '+r+'">'+msg+correctHtml+'</div>'));
    onResult(r);
    const nx = el('<button class="btn primary">Weiter</button>'); nx.onclick = next; body.appendChild(nx);
    if (r==='ok') setTimeout(next, 900); else setTimeout(()=>nx.focus(), 350);
  }
  btn.onclick = evaluate; inp.onkeydown = e => { if (e.key==='Enter') evaluate(); };
  setTimeout(()=>inp.focus(), 50);
  return inp;
}
function writeQuestion(body, w, dir, onResult, next){
  body.appendChild(el('<div class="eyebrow">'+(dir==='en'?'Auf Deutsch':'Auf Englisch')+' · '+esc(sheetOf(w).short)+'</div>'));
  body.appendChild(el('<div class="prompt">'+(dir==='en'? enHtml(w) : esc(w.de))+'</div>'));
  if (dir==='en'){ const sp = el('<button class="btn sm ghost">🔊 Anhören</button>'); sp.onclick = () => speak(speakForm(w)); body.appendChild(sp); }
  if (dir==='en' && w.keys) body.appendChild(el('<p class="muted small" style="margin:0">Lange Erklärung auf dem Blatt: Das Stichwort reicht.</p>'));
  const correct = dir==='en' ? esc(w.de) : '<b>'+esc(w.en)+'</b>';
  answerBox(body, v => checkWord(v, w, dir), r => { onResult(r); if (dir==='de') speak(speakForm(w)); if (r!=='ok') body.appendChild(el('<div class="note small">'+w.tip+'</div>')); }, next, correct);
}
function gapQuestion(body, w, onResult, next){
  body.appendChild(el('<div class="eyebrow">Setze das fehlende Wort ein · '+esc(sheetOf(w).short)+'</div>'));
  body.appendChild(el('<div class="ctx">'+esc(w.sent).replace('___','<span class="blank">&nbsp;</span>')+'</div>'));
  body.appendChild(el('<div class="muted">'+esc(w.sentDe)+'</div>'));
  const full = w.sent.replace('___', w.gap[0]);
  answerBox(body, v => check(v, w.gap, 'en'), r => { onResult(r); speak(full); if (r!=='ok') body.appendChild(el('<div class="note small">'+w.tip+'</div>')); }, next, '<b>'+esc(w.gap[0])+'</b> – '+esc(full), 'Fehlendes Wort…');
}
function aidQuestion(body, w, onResult, next){
  const a = w.aid;
  body.appendChild(el('<div class="eyebrow">'+AID_LABEL[a.t]+' vom Blatt · '+esc(sheetOf(w).short)+'</div>'));
  body.appendChild(el('<div class="ctx">'+(a.t==='def'?'<i>'+esc(a.x)+'</i>':aidQuiz(a))+'</div>'));
  body.appendChild(el('<div class="muted small">'+(a.t==='def'?'Welches Wort wird hier definiert?':a.t==='syn'?'Welches Wort vom Blatt passt dazu?':'Welches Wort fehlt?')+'</div>'));
  const mark = aidWord(a);
  const alts = w.enA.concat(w.gap, mark ? [mark] : []);
  answerBox(body, v => check(v, alts, 'en', w.en), r => { onResult(r); speak(speakForm(w)); if (r!=='ok') body.appendChild(el('<div class="note small">'+esc(w.de)+' · '+w.tip+'</div>')); }, next, '<b>'+esc(w.en)+'</b> – '+esc(w.de), 'Wort tippen…');
}
function dictQuestion(body, w, onResult, next){
  const text = speakForm(w);
  body.appendChild(el('<div class="eyebrow">Hören und schreiben · '+esc(sheetOf(w).short)+'</div>'));
  const row = el('<div class="row"><button class="btn" id="p1">🔊 Abspielen</button><button class="btn ghost" id="p2">🐢 Langsam</button></div>');
  row.querySelector('#p1').onclick = () => speak(text, 0.9); row.querySelector('#p2').onclick = () => speak(text, 0.6);
  body.appendChild(row);
  body.appendChild(el('<div class="muted small">Bedeutung: '+esc(w.de)+'</div>'));
  setTimeout(()=>speak(text, 0.9), 200);
  answerBox(body, v => check(v, w.gap.concat(w.enA, [text]), 'en', w.en), onResult, next, '<b>'+esc(w.en)+'</b>');
}

function pairsGame(body, items, prog){
  prog.innerHTML = '';
  const tiles = shuffle(items.flatMap(w => [{w, k:'en', t:esc(decode(w.en))}, {w, k:'de', t:esc(w.de)}]));
  const grid = el('<div class="mem"></div>'); body.appendChild(grid);
  body.appendChild(el('<p class="muted small" style="margin:0">Tippe eine gelbe (englische) und eine weiße (deutsche) Karte, die zusammengehören.</p>'));
  let sel = null, moves = 0, found = 0, lock = false;
  tiles.forEach(tile => {
    const b = el('<button class="mcard '+tile.k+'">'+tile.t+'</button>');
    b.onclick = () => {
      if (lock || b.classList.contains('done')) return;
      if (sel && sel.b === b){ b.classList.remove('sel'); sel = null; return; }
      b.classList.add('sel');
      if (!sel){ sel = {tile, b}; if (tile.k==='en') speak(speakForm(tile.w)); return; }
      moves++;
      if (sel.tile.w.id === tile.w.id && sel.tile.k !== tile.k){
        found++; sel.b.classList.remove('sel'); b.classList.remove('sel'); sel.b.classList.add('done'); b.classList.add('done'); sel = null;
        if (found === items.length){
          const pct = Math.round(100*items.length/moves);
          award(items.length*5 + (moves===items.length?20:0));
          body.appendChild(el(`<div class="card ink stack"><h3>Alle Paare gefunden</h3><p>${moves} Züge für ${items.length} Paare (${pct}% Treffer).</p><div class="row"><button class="btn primary" id="n">Neue Runde</button><button class="btn ghost" id="b">Zurück</button></div></div>`));
          body.querySelector('#n').onclick = () => runRound(body.parentElement); body.querySelector('#b').onclick = route;
          if (moves===items.length) confetti();
        }
      } else {
        lock = true; const a = sel.b; sel = null;
        a.classList.add('wrong'); b.classList.add('wrong');
        setTimeout(()=>{ a.classList.remove('sel','wrong'); b.classList.remove('sel','wrong'); lock = false; }, 650);
      }
    };
    grid.appendChild(b);
  });
}

function blitz(body, items, prog){
  let left = 60, score = 0, i = 0, wrong = [];
  prog.innerHTML = '<div class="row between"><span class="timer" id="tm">60</span><span class="eyebrow">Richtig: <b id="sc">0</b></span></div>';
  const tm = prog.querySelector('#tm'), sc = prog.querySelector('#sc');
  function end(){
    clearInterval(timerHandle); timerHandle = null; body.innerHTML = '';
    const rec = score > (S.best||0); if (rec){ S.best = score; save(); confetti(); }
    award(score*3);
    body.appendChild(el(`<div class="card ink stack"><h3>${rec?'Neuer Rekord!':'Zeit um'}</h3><p><b>${score}</b> richtig in 60 Sekunden${rec?'':' · Rekord: '+(S.best||0)}.</p>
      ${wrong.length?'<p class="small">Daneben: '+wrong.map(w=>'<b>'+esc(w.en)+'</b> ('+esc(w.de)+')').join(', ')+'</p>':''}
      <div class="row"><button class="btn primary" id="n">Noch einmal</button><button class="btn ghost" id="b">Zurück</button></div></div>`));
    body.querySelector('#n').onclick = () => runRound(body.parentElement); body.querySelector('#b').onclick = route;
  }
  timerHandle = setInterval(()=>{ left--; tm.textContent = left; if (left<=10) tm.classList.add('low'); if (left<=0) end(); }, 1000);
  function q(){
    if (i >= items.length){ items = shuffle(items); i = 0; }
    const w = items[i++]; body.innerHTML = '';
    const dir = pr.dir==='mix' ? (Math.random()<.5?'en':'de') : pr.dir;
    const src = items.length >= 4 ? items : W;
    const distract = shuffle(src.filter(x=>x.id!==w.id && (dir==='en'? x.de!==w.de : x.en!==w.en))).slice(0,3);
    const opts = shuffle([w].concat(distract));
    body.appendChild(el('<div class="prompt">'+(dir==='en'?enHtml(w):esc(w.de))+'</div>'));
    const grid = el('<div class="opts"></div>');
    opts.forEach(o => { const b = el('<button class="opt">'+(dir==='en'?esc(o.de):esc(o.en))+'</button>');
      b.onclick = () => { if (o.id===w.id){ score++; sc.textContent = score; S.box[w.id]=Math.min(3,box(w.id)+1); b.classList.add('right'); setTimeout(q, 150); } else { b.classList.add('wrong'); markWrong(w); wrong.push(w); grid.querySelectorAll('.opt').forEach((x,k)=>{ x.disabled=true; if (opts[k].id===w.id) x.classList.add('right'); }); setTimeout(q, 1100); } };
      grid.appendChild(b); });
    body.appendChild(grid);
  }
  q();
}

/* =========================================================
   SYNONYME (Thesaurus for commonly overused words)
   ========================================================= */
const SMODES = [
  { k:'smc', t:'Welches passt?', s:'Ein abgenutztes Wort, vier Kandidaten, einer ist ein Synonym vom Blatt.' },
  { k:'srev', t:'Rückwärts', s:'Ein Synonym sehen: Welches abgenutzte Wort ersetzt es?' },
  { k:'sodd', t:'Ausreißer', s:'Drei gehören zu einer Gruppe, eins nicht. Welches?' },
  { k:'swrite', t:'Ersetzen', s:'Ein Satz mit dem abgenutzten Wort. Tippe ein besseres.' },
  { k:'sthree', t:'Drei nennen', s:'Zu einem Wort drei verschiedene Synonyme tippen. Königsdisziplin.' },
  { k:'spairs', t:'Paare', s:'Memory: abgenutztes Wort und Synonym zusammenbringen.' },
  { k:'sblitz', t:'Blitzrunde', s:'60 Sekunden Zuordnen, so viele wie möglich.' }
];
let spr = { mode:'smc', set:S.sset };
const synWords = g => g.syn.map(x => x[0]);
const inGroup = (g, word) => synWords(g).some(x => norm(x,'en') === norm(word,'en'));
const owHtml = g => '<span class="hl">'+esc(g.w)+'</span>';
const synSent = g => esc(g.sent).replace(/\*([^*]+)\*/, '<span class="ow">$1</span>');
const synSentPlain = (g, repl) => g.sent.replace(/\*([^*]+)\*/, repl || '$1');
function synListHtml(g){ return g.syn.map(x => '<span>'+esc(x[0])+' <i>'+esc(x[1])+'</i></span>').join(' '); }
/* Distraktoren: Synonyme aus anderen Gruppen derselben Wortart, die nicht in g vorkommen */
function foreignSyns(g, n){
  const others = SYN.filter(x => x.cls === g.cls && x.id !== g.id);
  const cand = shuffle(others.flatMap(o => o.syn.map(x => ({ word:x[0], de:x[1], g:o })))).filter(c => !inGroup(g, c.word));
  const out = [], seen = new Set();
  for (const c of cand){ if (seen.has(c.word)) continue; seen.add(c.word); out.push(c); if (out.length >= n) break; }
  return out;
}
function startSyn(mode, set){ spr = { mode, set: set||'alle' }; S.sset = spr.set; save(); if (current === 'synonyme') route(); else go('#synonyme'); setTimeout(()=>{ const b = $('#sstart'); if (b) b.click(); }, 0); }
function synCheck(input, g){ return check(input, synWords(g), 'en'); }
/* Drei nennen: ok bei 3 verschiedenen Treffern, near bei 2 */
function synThreeCheck(input, g){
  if (!norm(input,'en')) return { r:'empty', hits:[], misses:[] };
  const parts = input.split(/\s*(?:,|;|\/|\n|\band\b|\bund\b|\s{2,})\s*/).map(x=>x.trim()).filter(Boolean);
  const hits = new Set(), misses = [];
  parts.forEach(p => { const n = norm(p,'en'); if (!n) return; const m = synWords(g).find(x => matchOne(n, [norm(x,'en')], 'en') === 'ok'); if (m) hits.add(m); else misses.push(p); });
  const h = Array.from(hits);
  return { r: h.length >= 3 ? 'ok' : h.length === 2 ? 'near' : 'bad', hits:h, misses };
}

function vSyn(sec){
  sec.appendChild(el('<h2>Synonyme</h2>'));
  sec.appendChild(el('<p class="muted small" style="margin:0">Der Thesaurus für abgenutzte Wörter: '+SYN.length+' Gruppen, '+SYN.reduce((a,s)=>a+s.syn.length,0)+' Alternativen. Im Test sollst du das abgenutzte Wort durch ein genaueres ersetzen können.</p>'));
  const grid = el('<div class="opts"></div>');
  SMODES.forEach(m => { const b = el(`<button class="opt ${spr.mode===m.k?'right':''}"><b>${m.t}</b><br><span class="small muted">${m.s}</span></button>`); b.onclick = () => { spr.mode = m.k; route(); }; grid.appendChild(b); });
  sec.appendChild(grid);
  sec.appendChild(ssetChips(spr.set, k => { spr.set = k; S.sset = k; save(); route(); }));
  if (spr.mode==='sblitz') sec.appendChild(el('<p class="muted small" style="margin:0">Rekord: <b>'+(S.sbest||0)+'</b> richtige in 60 Sekunden.</p>'));
  const start = el('<button class="btn primary big" id="sstart">Runde starten</button>');
  start.onclick = () => runSynRound(sec);
  if (!spool(spr.set).length){ start.disabled = true; sec.appendChild(el('<p class="note g">Die Fehlerliste ist leer. Wähle eine Wortart.</p>')); }
  sec.appendChild(start);
  /* Liste */
  sec.appendChild(el('<div class="row between"><h3>Die Liste</h3><span class="muted small">Antippen für Beispielsatz</span></div>'));
  const list = el('<div class="syngrid"></div>');
  const p = spool(spr.set);
  let lastCls = null;
  p.forEach(g => {
    if (spr.set==='alle' && g.cls !== lastCls){ lastCls = g.cls; list.appendChild(el('<div class="eyebrow" style="margin-top:.4rem">'+SYN_CLS[g.cls]+'</div>')); }
    const b = box(g.id);
    const d = el(`<div class="syn ${weak(g)?'weak':''}"><div class="row between"><div class="ow">${owHtml(g)}<small>${esc(g.de)}</small></div><div class="boxes" style="grid-column:auto"><i class="${b>0?'f':''}"></i><i class="${b>1?'f':''}"></i><i class="${b>2?'f':''}"></i></div></div><div class="list">${synListHtml(g)}</div></div>`);
    d.onclick = () => { let t = d.querySelector('.tip'); if (t){ t.remove(); return; } d.appendChild(el('<div class="tip" style="margin-top:.4rem">'+synSent(g)+'</div>')); };
    list.appendChild(d);
  });
  sec.appendChild(list);
  sec.appendChild(el('<p class="muted small">Vom Blatt: „Keep in mind that the choices offered in a thesaurus do not all mean exactly the same thing.“ Deshalb steht hinter jedem Synonym die deutsche Bedeutung.</p>'));
}

function runSynRound(sec){
  sec.innerHTML = '';
  const p = spool(spr.set);
  const n = spr.mode==='spairs' ? 6 : (spr.mode==='sblitz' ? p.length : Math.min(10, p.length));
  let items = pick(p, n);
  if (spr.mode==='sblitz') items = shuffle(p);
  const results = []; let i = 0, ok = 0, near = 0;
  const head = el('<div class="row between"><span class="eyebrow">'+SMODES.find(x=>x.k===spr.mode).t+' · '+esc(SSETS.find(s=>s.k===spr.set).label)+'</span><button class="btn sm ghost" id="quit">Abbrechen</button></div>');
  head.querySelector('#quit').onclick = route;
  sec.appendChild(head);
  const prog = el('<div></div>'); sec.appendChild(prog);
  const body = el('<div class="q"></div>'); sec.appendChild(body);
  if (spr.mode==='spairs') return synPairs(body, items);
  if (spr.mode==='sblitz') return synBlitz(body, items, prog);
  function record(g, r){ results.push(r); if (r==='ok'){ ok++; markRight(g, 10); } else if (r==='near'){ near++; markNear(g); } else markWrong(g); }
  function finish(){
    prog.innerHTML = progressLine(results, items.length, -1);
    const pts = ok + near*0.5, pct = Math.round(100*pts/items.length);
    body.innerHTML = '';
    const wrongs = items.filter((g,k)=>results[k]!=='ok');
    body.appendChild(el(`<div class="card ink stack"><h3>${pct===100?'Perfekt. Brilliant!':pct>=80?'Stark. Well done!':pct>=60?'Gut dabei. Weiter so.':'Das wird. Diese Gruppen kommen jetzt öfter dran.'}</h3>
      <p><b>${ok}</b> richtig, <b>${near}</b> fast, <b>${items.length-ok-near}</b> falsch · ${pct}%</p>
      ${wrongs.length?'<ul class="result-list">'+wrongs.map(g=>'<li class="'+(results[items.indexOf(g)])+'"><span>'+(results[items.indexOf(g)]==='near'?'~':'✗')+'</span><div><b>'+esc(g.w)+'</b> → '+esc(synWords(g).join(', '))+'</div></li>').join('')+'</ul>':''}
      <div class="row">${wrongs.length?'<button class="btn primary" id="again">Nur diese wiederholen</button>':''}<button class="btn" id="new">Neue Runde</button><button class="btn ghost" id="back">Zurück</button></div></div>`));
    if (wrongs.length) body.querySelector('#again').onclick = () => { items = shuffle(wrongs); results.length = 0; i = 0; ok = 0; near = 0; step(); };
    body.querySelector('#new').onclick = () => runSynRound(sec);
    body.querySelector('#back').onclick = route;
    if (pct===100 && items.length>=5) confetti();
  }
  function step(){
    if (i >= items.length) return finish();
    prog.innerHTML = progressLine(results, items.length, i);
    const g = items[i]; body.innerHTML = '';
    const after = r => { record(g, r); i++; };
    const m = spr.mode;
    if (m==='smc') synMc(body, g, r => { after(r); setTimeout(step, r==='ok'?700:0); });
    else if (m==='srev') synRev(body, g, r => { after(r); setTimeout(step, r==='ok'?700:0); });
    else if (m==='sodd') synOdd(body, g, r => { after(r); setTimeout(step, r==='ok'?700:0); });
    else if (m==='swrite') synWrite(body, g, after, step);
    else if (m==='sthree') synThree(body, g, after, step);
  }
  step();
}
function mcGrid(body, opts, isRight, onPick, explainHtml){
  const grid = el('<div class="opts"></div>');
  opts.forEach(o => {
    const b = el('<button class="opt">'+o.html+'</button>');
    b.onclick = () => {
      grid.querySelectorAll('.opt').forEach(x=>x.disabled=true);
      const r = isRight(o) ? 'ok' : 'bad';
      b.classList.add(r==='ok'?'right':'wrong');
      if (r==='bad'){
        grid.querySelectorAll('.opt').forEach((x,k)=>{ if (isRight(opts[k])) x.classList.add('right'); });
        body.appendChild(el('<div class="fb bad">'+explainHtml+'</div>'));
        const nx = el('<button class="btn primary">Weiter</button>'); nx.onclick = () => onPick('bad'); body.appendChild(nx); setTimeout(()=>nx.focus(), 350);
      } else onPick('ok');
    };
    grid.appendChild(b);
  });
  body.appendChild(grid);
}
function synMc(body, g, done){
  const right = rnd(g.syn);
  const opts = shuffle([{ html:esc(right[0]), ok:true }].concat(foreignSyns(g, 3).map(c => ({ html:esc(c.word), ok:false }))));
  body.appendChild(el('<div class="eyebrow">Welches Wort ist ein Synonym vom Blatt?</div>'));
  body.appendChild(el('<div class="prompt">'+owHtml(g)+' <span class="muted small">'+esc(g.de)+'</span></div>'));
  mcGrid(body, opts, o => o.ok, done, '<b>'+esc(g.w)+'</b> → '+esc(synWords(g).join(', ')));
}
function synRev(body, g, done){
  const s = rnd(g.syn);
  const others = shuffle(SYN.filter(x => x.cls === g.cls && x.id !== g.id && !inGroup(x, s[0]))).slice(0,3);
  const opts = shuffle([{ html:owHtml(g), g }].concat(others.map(o => ({ html:owHtml(o), g:o }))));
  body.appendChild(el('<div class="eyebrow">Welches abgenutzte Wort ersetzt dieses Synonym?</div>'));
  body.appendChild(el('<div class="prompt">'+esc(s[0])+' <span class="muted small">'+esc(s[1])+'</span></div>'));
  mcGrid(body, opts, o => o.g.id === g.id, done, '<b>'+esc(s[0])+'</b> steht bei <b>'+esc(g.w)+'</b>: '+esc(synWords(g).join(', ')));
}
function synOdd(body, g, done){
  const three = shuffle(g.syn).slice(0,3).map(x => ({ html:esc(x[0]), odd:false }));
  const odd = foreignSyns(g, 1)[0];
  const opts = shuffle(three.concat([{ html:esc(odd.word), odd:true }]));
  body.appendChild(el('<div class="eyebrow">Ausreißer finden</div>'));
  body.appendChild(el('<div class="prompt">Drei sind Synonyme für '+owHtml(g)+', eins nicht.</div>'));
  mcGrid(body, opts, o => o.odd, done, '<b>'+esc(odd.word)+'</b> ('+esc(odd.de)+') gehört zu <b>'+esc(odd.g.w)+'</b>. Zu <b>'+esc(g.w)+'</b>: '+esc(synWords(g).join(', ')));
}
function synWrite(body, g, onResult, next){
  body.appendChild(el('<div class="eyebrow">Ersetze das markierte Wort durch ein Synonym vom Blatt</div>'));
  body.appendChild(el('<div class="ctx">'+synSent(g)+'</div>'));
  body.appendChild(el('<div class="muted small">'+esc(g.w)+' = '+esc(g.de)+' · '+g.syn.length+' Möglichkeiten</div>'));
  answerBox(body, v => synCheck(v, g), r => { onResult(r); if (r!=='ok') body.appendChild(el('<div class="note small">Alle vom Blatt: '+synListHtml(g).replace(/<span>/g,'<span style="margin-right:.5em">')+'</div>')); }, next, esc(synWords(g).join(', ')), 'Besseres Wort…');
}
function synThree(body, g, onResult, next){
  body.appendChild(el('<div class="eyebrow">Nenne drei Synonyme vom Blatt</div>'));
  body.appendChild(el('<div class="prompt">'+owHtml(g)+' <span class="muted small">'+esc(g.de)+'</span></div>'));
  body.appendChild(el('<div class="muted small">Mit Komma trennen. Beispielsatz: '+synSent(g)+'</div>'));
  let res = null;
  answerBox(body, v => { res = synThreeCheck(v, g); return res.r; }, r => {
    onResult(r);
    body.appendChild(el('<div class="note small">'+(res.hits.length?'Getroffen: <b>'+esc(res.hits.join(', '))+'</b>. ':'')+(res.misses.length?'Nicht auf dem Blatt: '+esc(res.misses.join(', '))+'. ':'')+'Alle: '+esc(synWords(g).join(', '))+'</div>'));
  }, next, esc(synWords(g).join(', ')), 'z. B. huge, massive, enormous', 'Fast: zwei getroffen, drei sollten es sein.');
}
function synPairs(body, items){
  const tiles = shuffle(items.flatMap(g => { const s = rnd(g.syn); return [{ g, k:'en', t:esc(g.w) }, { g, k:'de', t:esc(s[0]) }]; }));
  const grid = el('<div class="mem"></div>'); body.appendChild(grid);
  body.appendChild(el('<p class="muted small" style="margin:0">Tippe ein gelbes (abgenutztes) Wort und das weiße Synonym, das dazugehört.</p>'));
  let sel = null, moves = 0, found = 0, lock = false;
  tiles.forEach(tile => {
    const b = el('<button class="mcard '+tile.k+'">'+tile.t+'</button>');
    b.onclick = () => {
      if (lock || b.classList.contains('done')) return;
      if (sel && sel.b === b){ b.classList.remove('sel'); sel = null; return; }
      b.classList.add('sel');
      if (!sel){ sel = {tile, b}; return; }
      moves++;
      if (sel.tile.g.id === tile.g.id && sel.tile.k !== tile.k){
        found++; sel.b.classList.remove('sel'); b.classList.remove('sel'); sel.b.classList.add('done'); b.classList.add('done'); sel = null;
        if (found === items.length){
          award(items.length*5 + (moves===items.length?20:0));
          body.appendChild(el(`<div class="card ink stack"><h3>Alle Paare gefunden</h3><p>${moves} Züge für ${items.length} Paare.</p><div class="row"><button class="btn primary" id="n">Neue Runde</button><button class="btn ghost" id="b">Zurück</button></div></div>`));
          body.querySelector('#n').onclick = () => runSynRound(body.parentElement); body.querySelector('#b').onclick = route;
          if (moves===items.length) confetti();
        }
      } else {
        lock = true; const a = sel.b; sel = null;
        a.classList.add('wrong'); b.classList.add('wrong');
        setTimeout(()=>{ a.classList.remove('sel','wrong'); b.classList.remove('sel','wrong'); lock = false; }, 650);
      }
    };
    grid.appendChild(b);
  });
}
function synBlitz(body, items, prog){
  let left = 60, score = 0, i = 0, wrong = [];
  prog.innerHTML = '<div class="row between"><span class="timer" id="tm">60</span><span class="eyebrow">Richtig: <b id="sc">0</b></span></div>';
  const tm = prog.querySelector('#tm'), sc = prog.querySelector('#sc');
  function end(){
    clearInterval(timerHandle); timerHandle = null; body.innerHTML = '';
    const rec = score > (S.sbest||0); if (rec){ S.sbest = score; save(); confetti(); }
    award(score*3);
    body.appendChild(el(`<div class="card ink stack"><h3>${rec?'Neuer Rekord!':'Zeit um'}</h3><p><b>${score}</b> richtig in 60 Sekunden${rec?'':' · Rekord: '+(S.sbest||0)}.</p>
      ${wrong.length?'<p class="small">Daneben: '+wrong.map(g=>'<b>'+esc(g.w)+'</b>').join(', ')+'</p>':''}
      <div class="row"><button class="btn primary" id="n">Noch einmal</button><button class="btn ghost" id="b">Zurück</button></div></div>`));
    body.querySelector('#n').onclick = () => runSynRound(body.parentElement); body.querySelector('#b').onclick = route;
  }
  timerHandle = setInterval(()=>{ left--; tm.textContent = left; if (left<=10) tm.classList.add('low'); if (left<=0) end(); }, 1000);
  function q(){
    if (i >= items.length){ items = shuffle(items); i = 0; }
    const g = items[i++]; body.innerHTML = '';
    const rev = Math.random() < .5;
    let opts, isRight, promptHtml;
    if (rev){ const s = rnd(g.syn); const others = shuffle(SYN.filter(x => x.cls === g.cls && x.id !== g.id && !inGroup(x, s[0]))).slice(0,3);
      opts = shuffle([{ html:owHtml(g), ok:true }].concat(others.map(o => ({ html:owHtml(o), ok:false })))); isRight = o => o.ok; promptHtml = esc(s[0]); }
    else { opts = shuffle([{ html:esc(rnd(g.syn)[0]), ok:true }].concat(foreignSyns(g, 3).map(c => ({ html:esc(c.word), ok:false })))); isRight = o => o.ok; promptHtml = owHtml(g); }
    body.appendChild(el('<div class="prompt">'+promptHtml+'</div>'));
    const grid = el('<div class="opts"></div>');
    opts.forEach(o => { const b = el('<button class="opt">'+o.html+'</button>');
      b.onclick = () => { if (isRight(o)){ score++; sc.textContent = score; S.box[g.id]=Math.min(3,box(g.id)+1); b.classList.add('right'); setTimeout(q, 150); } else { b.classList.add('wrong'); markWrong(g); wrong.push(g); grid.querySelectorAll('.opt').forEach((x,k)=>{ x.disabled=true; if (isRight(opts[k])) x.classList.add('right'); }); setTimeout(q, 1100); } };
      grid.appendChild(b); });
    body.appendChild(grid);
  }
  q();
}

/* =========================================================
   TEST
   ========================================================= */
function grade(pct){ return pct>=95?1:pct>=80?2:pct>=65?3:pct>=50?4:pct>=30?5:6; }
const TEST_N = 25;
function vTest(sec){
  sec.appendChild(el('<h2>Test</h2>'));
  const last = S.tests && S.tests.length ? S.tests[S.tests.length-1] : null;
  sec.appendChild(el(`<div class="card ink stack"><h3>Generalprobe</h3><p>${TEST_N} Aufgaben wie im echten Test: 8 Politik, 4 Text 6, 3 Skills Lab, 5 Brexit – die Hälfte Deutsch → Englisch, die Hälfte Englisch → Deutsch, alles getippt. Dazu 5 Synonym-Aufgaben (ein Synonym ersetzen, drei nennen). Am Ende gibt es eine Note.${last?' Letzte Probe: <b>Note '+last.g+'</b> ('+last.pct+'%).':''}</p><button class="btn primary big" id="gp">Generalprobe starten</button></div>`));
  sec.querySelector('#gp').onclick = () => runTest(sec);
  sec.appendChild(el(`<div class="card stack"><h3>Abfragen lassen</h3><p class="small">Für Mama, Papa oder eine Freundin: Die deutsche Seite wird gezeigt, Romy antwortet laut auf Englisch. Dann „Antwort zeigen“ und bewerten. Bei Synonymen: das abgenutzte Wort wird gezeigt, Romy nennt drei Alternativen.</p><div id="askset"></div><div class="row"><button class="btn" id="ask">Vokabeln abfragen</button><button class="btn" id="asks">Synonyme abfragen</button></div></div>`));
  let askSet = S.set === 'fehler' && !pool('fehler').length ? 'alle' : S.set;
  const holder = sec.querySelector('#askset');
  const drawChips = () => { holder.innerHTML = ''; holder.appendChild(setChips(askSet, k => { askSet = k; drawChips(); })); };
  drawChips();
  sec.querySelector('#ask').onclick = () => runAsk(sec, askSet, false);
  sec.querySelector('#asks').onclick = () => runAsk(sec, 'alle', true);
  if (S.tests && S.tests.length > 1) sec.appendChild(el('<p class="muted small">Bisherige Proben: '+S.tests.map(t=>'Note '+t.g).join(' · ')+'</p>'));
}
function runTest(sec){
  sec.innerHTML = '';
  const vocab = shuffle(pick(pool('pol'),8).concat(pick(pool('mon'),4), pick(pool('arg'),3), pick(pool('bx'),5)));
  const dirs = shuffle(vocab.map((_,k)=>k%2?'en':'de'));
  const syns = pick(SYN, 5);
  const tasks = vocab.map((w,k) => ({ kind:'v', w, dir:dirs[k] })).concat(syns.map((g,k) => ({ kind: k<3 ? 's1' : 's3', g })));
  const results = []; let i = 0;
  sec.appendChild(el('<div class="row between"><span class="eyebrow">Generalprobe · '+tasks.length+' Aufgaben</span><button class="btn sm ghost" id="q">Abbrechen</button></div>'));
  sec.querySelector('#q').onclick = route;
  const prog = el('<div></div>'); sec.appendChild(prog);
  const body = el('<div class="q"></div>'); sec.appendChild(body);
  function step(){
    if (i >= tasks.length) return finish();
    prog.innerHTML = progressLine(results.map(()=>'ok'), tasks.length, i);
    body.innerHTML = '';
    const t = tasks[i];
    let promptHtml, sub = '', checkFn, placeholder = 'Antwort…';
    if (t.kind==='v'){
      sub = t.dir==='en' ? 'auf Deutsch' : 'auf Englisch';
      promptHtml = t.dir==='en' ? enHtml(t.w) : esc(t.w.de);
      checkFn = v => checkWord(v, t.w, t.dir);
    } else if (t.kind==='s1'){
      sub = 'Synonym: ersetze das markierte Wort';
      promptHtml = '<div class="ctx">'+synSent(t.g)+'</div>';
      checkFn = v => synCheck(v, t.g); placeholder = 'Besseres Wort…';
    } else {
      sub = 'Synonyme: nenne drei';
      promptHtml = owHtml(t.g)+' <span class="muted small">'+esc(t.g.de)+'</span>';
      checkFn = v => synThreeCheck(v, t.g).r; placeholder = 'drei Wörter, mit Komma';
    }
    body.appendChild(el('<div class="eyebrow">Aufgabe '+(i+1)+' von '+tasks.length+' · '+sub+'</div>'));
    body.appendChild(el('<div class="prompt">'+promptHtml+'</div>'));
    const inp = el('<input class="ans" id="ans" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="'+esc(placeholder)+'">');
    body.appendChild(inp);
    const btn = el('<button class="btn primary">Weiter</button>'); body.appendChild(btn);
    const submit = () => { const r = checkFn(inp.value); results.push({ t, r: r==='empty'?'bad':r, you: inp.value }); i++; step(); };
    btn.onclick = submit; inp.onkeydown = e => { if (e.key==='Enter') submit(); };
    setTimeout(()=>inp.focus(), 50);
  }
  function finish(){
    prog.innerHTML = ''; body.innerHTML = '';
    let pts = 0;
    results.forEach(x => { pts += x.r==='ok'?1:x.r==='near'?0.5:0; const it = x.t.w || x.t.g; if (x.r==='ok') markRight(it, 0); else if (x.r==='near') markNear(it); else markWrong(it); });
    const pct = Math.round(100*pts/results.length), g = grade(pct);
    S.tests = (S.tests||[]).concat([{ g, pct, at: Date.now() }]).slice(-10); S.xp += g<=2 ? 100 : 40; save(); renderHead();
    body.appendChild(el(`<div class="card ink stack" style="text-align:center"><div class="eyebrow">Deine Note</div><div class="grade ${g<=2?'good':''}">${g}</div><p><b>${pts} von ${results.length} Punkten</b> (${pct}%). ${g===1?'Das sitzt. Morgen genauso.':g===2?'Sehr gut. Die paar Fehler unten noch einmal, dann ist die 1 drin.':g===3?'Solide Basis. Jetzt gezielt die Fehlerliste.':'Noch nicht. Mach die Fehlerliste mit Karten und Schreiben, dann noch eine Probe.'}</p></div>`));
    const ul = el('<ul class="result-list"></ul>');
    results.forEach(x => {
      const label = x.t.w ? '<b>'+esc(x.t.w.en)+'</b> – '+esc(x.t.w.de) : '<b>'+esc(x.t.g.w)+'</b> → '+esc(synWords(x.t.g).join(', '));
      ul.appendChild(el('<li class="'+x.r+'"><span>'+(x.r==='ok'?'✓':x.r==='near'?'~':'✗')+'</span><div>'+label+(x.r!=='ok'?'<div class="you">Deine Antwort: '+(esc(x.you)||'(leer)')+'</div>':'')+'</div></li>'));
    });
    body.appendChild(ul);
    const row = el('<div class="row"><button class="btn primary" id="f">Fehler üben</button><button class="btn" id="n">Neue Probe</button><button class="btn ghost" id="b">Zurück</button></div>');
    row.querySelector('#f').onclick = () => startPractice('write','fehler','de'); row.querySelector('#n').onclick = () => runTest(sec); row.querySelector('#b').onclick = route;
    body.appendChild(row);
    if (g<=2) confetti();
  }
  step();
}
function runAsk(sec, set, synMode){
  sec.innerHTML = '';
  const items = shuffle(synMode ? SYN.slice() : pool(set)); let i = 0, right = 0; const missed = [];
  sec.appendChild(el('<div class="row between"><span class="eyebrow">Abfrage · '+(synMode?'Synonyme':esc(SETS.find(s=>s.k===set).label))+'</span><button class="btn sm ghost" id="q">Beenden</button></div>'));
  sec.querySelector('#q').onclick = route;
  const body = el('<div class="q"></div>'); sec.appendChild(body);
  function step(){
    body.innerHTML = '';
    if (i >= items.length){
      body.appendChild(el(`<div class="card ink stack"><h3>Fertig</h3><p><b>${right}</b> von ${items.length} richtig.</p>${missed.length?'<p class="small">Noch einmal: '+missed.map(w=>'<b>'+esc(w.en||w.w)+'</b>').join(', ')+'</p>':''}<div class="row"><button class="btn primary" id="n">Noch einmal</button><button class="btn ghost" id="b">Zurück</button></div></div>`));
      body.querySelector('#n').onclick = () => runAsk(sec, set, synMode); body.querySelector('#b').onclick = route; return;
    }
    const w = items[i];
    body.appendChild(el('<div class="muted small">'+(i+1)+' / '+items.length+' · '+(synMode?SYN_CLS[w.cls]:esc(sheetOf(w).short))+'</div>'));
    const box_ = synMode
      ? el('<div class="reveal"><span class="eyebrow">Abgenutztes Wort</span><div class="big">'+esc(w.w)+' <span class="muted small">'+esc(w.de)+'</span></div><div id="sol" hidden><span class="eyebrow">Synonyme vom Blatt</span><div class="big" style="font-size:1.15rem">'+esc(synWords(w).join(', '))+'</div></div></div>')
      : el('<div class="reveal"><span class="eyebrow">Deutsch</span><div class="big">'+esc(w.de)+'</div><div id="sol" hidden><span class="eyebrow">English</span><div class="big">'+enHtml(w)+'</div>'+(w.aid?'<div class="muted small">'+AID_LABEL[w.aid.t]+': '+aidHtml(w.aid)+'</div>':'')+'</div></div>');
    body.appendChild(box_);
    const rv = el('<button class="btn big">Antwort zeigen</button>'); body.appendChild(rv);
    const judge = el('<div class="row" hidden><button class="btn bad grow">Falsch</button><button class="btn ok grow">Richtig</button></div>'); body.appendChild(judge);
    rv.onclick = () => { box_.querySelector('#sol').hidden = false; rv.hidden = true; judge.hidden = false; if (!synMode) speak(speakForm(w)); };
    judge.children[0].onclick = () => { markWrong(w); missed.push(w); i++; step(); };
    judge.children[1].onclick = () => { markRight(w, 0); right++; i++; step(); };
  }
  step();
}

/* =========================================================
   SPICKZETTEL
   ========================================================= */
function vCheat(sec){
  sec.appendChild(el('<div class="row between"><h2>Spickzettel</h2><span class="muted small">Zum Durchlesen vor dem Schlafen. Nicht für den Test!</span></div>'));
  const c = el('<div class="cheat"></div>');
  ['pol','mon','arg','bx'].forEach(k => {
    c.appendChild(el('<h3>'+esc(SHEETS[k].name)+'</h3>'));
    pool(k).forEach(w => c.appendChild(el('<p><span class="e">'+esc(decode(w.en))+'</span>'+(w.line?' <i class="muted">l. '+w.line+'</i>':'')+' – '+esc(w.de)+'</p>')));
  });
  c.appendChild(el('<h3>Thesaurus: abgenutzte Wörter</h3>'));
  let lastCls = null;
  SYN.forEach(g => { if (g.cls !== lastCls){ lastCls = g.cls; c.appendChild(el('<p class="eyebrow">'+SYN_CLS[g.cls]+'</p>')); } c.appendChild(el('<p><span class="e">'+esc(g.w)+'</span> → '+esc(synWords(g).join(', '))+'</p>')); });
  TRAPS.forEach(t => c.appendChild(el('<h3>'+esc(t.k)+'</h3><p>'+t.v+'</p>')));
  sec.appendChild(c);
  sec.appendChild(el('<p class="muted small">Tipp: Über das Browsermenü „Drucken“ passt der Zettel auf zwei Seiten.</p>'));
}

/* ---------- Konfetti ---------- */
function confetti(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confetti'), ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ['#C8102E','#012169','#FFFFFF','#F7DE2A','#2B8A4F'];
  const ps = Array.from({length:140}, () => ({ x: Math.random()*cv.width, y: -20-Math.random()*cv.height*0.5, r: 4+Math.random()*5, c: rnd(cols), vy: 2+Math.random()*3, vx: -1.5+Math.random()*3, a: Math.random()*6 }));
  let t = 0; const id = setInterval(()=>{
    ctx.clearRect(0,0,cv.width,cv.height); t++;
    ps.forEach(p => { p.y += p.vy; p.x += p.vx; p.a += .1; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6); ctx.restore(); });
    if (t > 160){ clearInterval(id); ctx.clearRect(0,0,cv.width,cv.height); }
  }, 16);
}

/* ---------- Start ---------- */
window.__MTM = { check, checkWord, norm, speakForm, synThreeCheck, W, SYN };
renderHead();
route();
})();
