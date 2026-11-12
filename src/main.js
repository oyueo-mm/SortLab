import { algorithms, algorithmById } from './algorithms.js';
import { generateData, patterns } from './data.js';
import { SortEngine, speedToEventsPerSecond } from './engine.js';
import { BarView } from './visual.js';
import { SortAudio } from './audio.js';
import { icon } from './icons.js';

const $ = (selector, root = document) => root.querySelector(selector);
const app = $('#app');
const initial = { page: 'home', algo: 'quickHoare', pattern: 'random', count: 100, speed: 82, style: 'bars', soundOn: true, volume: 30, soundStyle: 'retro', sidebar: false };
let cached = {};
try { cached = JSON.parse(localStorage.getItem('sortlab:prefs') || '{}') || {}; } catch { /* private browsing */ }
const state = { ...initial, ...cached, page: 'home', sidebar: false, settings: false, picker: false, pickerCategory: '전체', pickerQuery: '', pickerTarget: 'main', librarySelected: 'quickHoare', libraryQuery: '', compareIds: ['bubble', 'quickHoare', 'merge', 'heap'], compareSoundIndex: 1, playing: false, focus: false };
const sound = new SortAudio();
sound.enabled = state.soundOn;
sound.volume = state.volume / 100;
sound.style = state.soundStyle;
let engine = null, engineView = null, compareEngines = [], compareViews = [], miniEngines = [], libraryEngine = null, libraryView = null;
let lastFrame = 0, opAccumulator = 0, toastTimeout = null, focusTimeout = null;
const categories = ['전체', '기초', '고급', '분포', '하이브리드', '특수'];
const sortedDemoIds = ['bubble', 'insertion', 'quickHoare', 'merge', 'heap', 'shell', 'cocktail', 'radixLsd', 'selection', 'timsort', 'pancake', 'comb'];

function persist() { const { algo, pattern, count, speed, style, soundOn, volume, soundStyle } = state; try { localStorage.setItem('sortlab:prefs', JSON.stringify({ algo, pattern, count, speed, style, soundOn, volume, soundStyle })); } catch { /* privacy mode */ } }
function ebutton(action, symbol, label, css = 'icon-btn', extra = '') { return `<button type="button" class="${css}" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(symbol)}</button>`; }
function formatCount(n) { return n.toLocaleString('ko-KR'); }
function shortName(id) { return algorithmById[id]?.en.split(' · ')[0] || id; }
function toast(message) { const t = $('#toast'); if (!t) return; t.textContent = message; t.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.classList.remove('show'), 3400); }

function renderShell() {
  app.innerHTML = `<div class="app${state.sidebar ? ' expanded' : ''}" id="layout"><aside class="rail" aria-label="탐색 메뉴">
    <div class="brand"><span class="brand-text">SortLab</span>${ebutton('sidebar', 'panel', '메뉴 열기 또는 닫기', 'rail-btn')}</div>
    <nav class="nav-list" aria-label="메인 메뉴">${[
      ['home', 'home', '홈'], ['visual', 'bars', '시각화'], ['compare', 'compare', '비교'], ['library', 'book', '도감']
    ].map(([id, glyph, label]) => `<button type="button" data-action="nav" data-page="${id}" class="rail-btn nav${state.page===id?' active':''}" title="${label}" aria-label="${label}" ${state.page===id?'aria-current="page"':''}>${icon(glyph)}<span class="nav-name">${label}</span></button>`).join('')}</nav>
    <div class="rail-bottom"><a class="rail-btn nav" href="https://github.com/oyueo-mm/SortLab" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub">${icon('github')}<span class="nav-name">GitHub</span></a><button class="rail-btn nav" data-action="settings-nav" title="설정" aria-label="설정">${icon('settings')}<span class="nav-name">설정</span></button></div>
  </aside><main class="workspace" id="workspace"><button class="icon-btn mobile-menu" data-action="sidebar" aria-label="메뉴">${icon('panel')}</button><div id="screen"></div></main></div><div id="modal-root"></div><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  renderPage();
}

function newSource() { return generateData(state.count, state.pattern); }
function commonCompareData(input) { let n = input.length; for (const id of state.compareIds) { const algo = algorithmById[id]; if (algo.maxSize) n = Math.min(n, algo.maxSize); } if (state.compareIds.some(id => algorithmById[id].powerOfTwo)) n = 2 ** Math.floor(Math.log2(n)); return input.slice(0, Math.max(2,n)); }
function meter() { return '<div class="meter" id="meter" role="progressbar" aria-label="정렬 진행 상태"></div>'; }
function controls(compact = false) { return `<div class="controlbar" aria-label="재생 제어">${ebutton('shuffle','shuffle','새 배열')}${ebutton('step-back','step-back','한 단계 이전')}${ebutton('play','play','재생 또는 일시정지','play-button','id="play-button"')}${ebutton('step-forward','step-forward','한 단계 다음')}${ebutton('reset','reset','처음부터 다시 정렬')}</div>`; }
function topBar(withAlgo = true) { return `<div class="header-row"><div>${withAlgo?`<button class="algo-trigger" data-action="picker-main" aria-label="정렬 알고리즘 선택" title="알고리즘 선택">${shortName(state.algo)}<span class="muted-icon">${icon('chevron',14)}</span></button>`:''}</div><div class="header-right">${ebutton('details','info','정렬 정보')}${ebutton('sound','volume', '소리 켜기 또는 끄기','icon-btn','id="sound-button"')}${ebutton('settings','settings','설정')}${ebutton('focus','expand','집중 모드')}</div></div>`; }

function renderPage() {
  state.settings = false;
  state.playing = false;
  state.focus = false;
  app.classList.remove('focus','reveal');
  opAccumulator = 0;
  engine = null; engineView = null; compareEngines = []; compareViews = []; miniEngines = []; libraryEngine = null; libraryView = null;
  const el = $('#screen');
  if (!el) return;
  if (state.page === 'home') {
    el.innerHTML = `<section class="screen home-screen"><div class="home-copy"><h1 class="home-title">SortLab</h1><button class="home-start" data-action="nav" data-page="visual">시작하기 ${icon('arrow',17)}</button></div><div class="home-mosaic">${[0,1,2,3].map(i => `<div class="home-mini" role="button" tabindex="0" data-action="mini" data-index="${i}" aria-label="미니 정렬 시각화 시작"><canvas id="mini-${i}" aria-hidden="true"></canvas><span class="mini-name" id="mini-name-${i}"></span><span class="mini-status"></span></div>`).join('')}</div></section>`;
    miniEngines = [0,1,2,3].map((i) => { const id = sortedDemoIds[[0,2,3,4][i]], source = new SortEngine(id,generateData(46,'random',Math.random())); $('#mini-name-'+i).textContent = shortName(id); return { engine: source, view: new BarView($('#mini-'+i),{ compact:true }), lastComplete:0, id }; });
  } else if (state.page === 'visual') {
    el.innerHTML = `<section class="screen visual-screen">${topBar(true)}<div class="visual-stage" id="main-stage"><canvas id="main-canvas" aria-label="정렬 과정 막대 시각화" role="img"></canvas><div id="hover-readout" class="hover-readout" aria-hidden="true"></div></div>${meter()}${controls()}<div class="micro-stats" id="main-stats"></div><div id="settings-host"></div></section>`;
    engine = new SortEngine(state.algo,newSource());
    engineView = new BarView($('#main-canvas'),{ style:state.style });
    $('#main-canvas').addEventListener('pointermove',handleCanvasHover);
    $('#main-canvas').addEventListener('pointerleave',()=>{ engineView.hover = -1; $('#hover-readout')?.classList.remove('visible'); });
    showAlgoLimit(engine);
  } else if (state.page === 'compare') {
    el.innerHTML = `<section class="screen compare-screen"><div class="compare-header"><h1 class="compact-heading">비교</h1><div class="header-right">${ebutton('sound','volume','소리 켜기 또는 끄기','icon-btn','id="sound-button"')}${ebutton('settings','settings','설정')}</div></div><div class="compare-grid">${state.compareIds.map((id,i)=>`<div class="compare-card"><div class="compare-card-head"><button class="compare-select" data-action="picker-compare" data-index="${i}" title="정렬 알고리즘 바꾸기">${shortName(id)} ${icon('chevron',12)}</button>${ebutton('compare-sound',state.compareSoundIndex===i?'sound':'dots',`이 알고리즘 소리 재생`,'icon-btn'+(state.compareSoundIndex===i?' selected':''),`data-index="${i}"`)}</div><canvas id="compare-${i}" role="img" aria-label="${shortName(id)} 정렬 시각화"></canvas><div class="compare-actions"><span id="compare-stat-${i}" class="compare-stat"></span><span class="compare-stat" id="compare-end-${i}"></span></div></div>`).join('')}</div><div class="compare-footer">${meter()}${controls()}</div><div id="settings-host"></div></section>`;
    const data = newSource();
    const sharedData = commonCompareData(data);
    compareEngines = state.compareIds.map(id => new SortEngine(id,sharedData));
    compareViews = compareEngines.map((_,i)=>new BarView($('#compare-'+i),{compact:true}));
    showCompareLimits(data);
  } else if (state.page === 'library') {
    el.innerHTML = `<section class="screen library-screen"><div class="library-header"><h1 class="compact-heading">도감</h1><span class="screen-pill">${algorithms.length}</span></div><div class="library-layout"><div class="library-list"><label class="library-search">${icon('search',15)}<input id="library-query" type="search" placeholder="알고리즘 검색" aria-label="알고리즘 검색" autocomplete="off" value="${escapeHtml(state.libraryQuery)}" /></label><div id="library-items"></div></div><div class="library-detail" id="library-detail"></div></div></section>`;
    renderLibraryList(); renderLibraryDetail();
  }
  document.querySelectorAll('.rail-btn.nav[data-page]').forEach(btn => { btn.classList.toggle('active',btn.dataset.page===state.page); btn.toggleAttribute('aria-current',btn.dataset.page===state.page); });
  setPlayIcon(); updateSoundIcon();
}

function escapeHtml(str) { return String(str).replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v])); }
function showAlgoLimit(eng) { if (eng.initial.length !== state.count) toast(`${eng.algorithm.en}: 배열을 ${eng.initial.length}개로 제한했습니다.`); }
function showCompareLimits(source) { const limited = compareEngines.filter(e => e.initial.length !== source.length); if (limited.length) toast('공정한 비교를 위해 모든 알고리즘에 같은 크기의 배열을 사용합니다.'); }
function handleCanvasHover(evt) {
  if (!engineView || !engine) return;
  const index = engineView.nearestIndex(evt.clientX), rect = evt.currentTarget.getBoundingClientRect();
  engineView.hover = index;
  const readout = $('#hover-readout'); if (!readout) return;
  readout.textContent = `${index}  ·  ${engine.values[index]}`;
  readout.style.left = `${evt.clientX - rect.left}px`;
  readout.style.top = `${evt.clientY - rect.top}px`;
  readout.classList.add('visible');
}
function renderLibraryList() {
  const root = $('#library-items'); if (!root) return;
  const query = state.libraryQuery.toLowerCase().trim();
  const items = algorithms.filter(a => `${a.name} ${a.en} ${a.category}`.toLowerCase().includes(query));
  root.innerHTML = items.length ? items.map(a => `<button class="library-row ${a.id===state.librarySelected?'active':''}" data-action="library-select" data-id="${a.id}"><span>${escapeHtml(a.name)}</span><small>${a.category}</small></button>`).join('') : `<div class="library-no-results">검색 결과가 없습니다.</div>`;
}
function renderLibraryDetail() {
  const a = algorithmById[state.librarySelected] || algorithms[0], root = $('#library-detail'); if (!root) return;
  root.innerHTML = `<div><h2>${escapeHtml(a.name)}</h2><div class="en">${escapeHtml(a.en)}</div></div><canvas id="library-preview" aria-label="${a.name} 시각화"></canvas><div class="library-tags"><span>${a.category}</span><span>평균 ${escapeHtml(a.avg)}</span><span>공간 ${escapeHtml(a.space)}</span><span>${a.stable?'안정 정렬':'비안정 정렬'}</span>${a.maxSize?`<span>최대 ${a.maxSize}개</span>`:''}${a.powerOfTwo?'<span>2의 거듭제곱 개수</span>':''}</div><div class="detail-bottom"><button class="action-small" data-action="library-open">실행 ${icon('arrow',15)}</button>${ebutton('library-reset','reset','미리보기 다시 보기')}</div>`;
  libraryEngine = new SortEngine(a.id, generateData(42,'random'));
  libraryView = new BarView($('#library-preview'));
}
function renderSettings() {
  const host = $('#settings-host'); if (!host) return;
  if (!state.settings) { host.innerHTML = ''; return; }
  const patternButtons = patterns.map(p=>`<button class="choice ${state.pattern===p.id?'active':''}" data-action="pattern" data-value="${p.id}">${p.name}</button>`).join('');
  host.innerHTML = `<div class="settings-panel" role="dialog" aria-label="정렬 설정"><div class="setting-row"><span class="setting-label">설정</span>${ebutton('settings','close','닫기')}</div>
   <div class="setting-section"><div class="setting-row"><label class="setting-label" for="count-range">배열</label><span class="setting-value" id="count-label">${state.count}</span></div><input class="setting-range" data-setting="count" id="count-range" type="range" min="5" max="1000" step="1" value="${state.count}" aria-label="배열 크기" /></div>
   <div class="setting-section"><div class="setting-row"><label class="setting-label" for="speed-range">속도</label><span class="setting-value" id="speed-label">${state.speed}×</span></div><input class="setting-range" data-setting="speed" id="speed-range" type="range" min="1" max="200" step="1" value="${state.speed}" aria-label="정렬 속도" /></div>
   <div class="setting-section"><span class="setting-label">배열 형태</span><div class="button-group">${patternButtons}</div></div>
   ${state.page === 'visual' ? `<div class="setting-section"><span class="setting-label">표현</span><div class="button-group">${[['bars','막대'],['dots','점'],['circle','원형']].map(([id,name])=>`<button class="choice ${state.style===id?'active':''}" data-action="style" data-value="${id}">${name}</button>`).join('')}</div></div>`:''}
   <hr class="setting-line"/>
   <div class="setting-row"><span class="setting-label">사운드</span><button class="toggle ${state.soundOn?'on':''}" role="switch" aria-checked="${state.soundOn}" data-action="sound" aria-label="사운드 켜기 또는 끄기"></button></div>
   <div class="setting-section"><div class="setting-row"><label class="setting-label" for="volume-range">볼륨</label><span class="setting-value" id="volume-label">${state.volume}%</span></div><input class="setting-range" data-setting="volume" id="volume-range" type="range" min="0" max="100" step="1" value="${state.volume}" /></div>
   <div class="setting-section"><span class="setting-label">음색</span><div class="button-group">${[['retro','레트로'],['soft','부드러운'],['click','기계음'],['synth','신시사이저']].map(([id,name])=>`<button class="choice ${state.soundStyle===id?'active':''}" data-action="sound-style" data-value="${id}">${name}</button>`).join('')}</div></div></div>`;
}
function openPicker(target) {
  state.picker = true; state.pickerTarget = target; state.pickerCategory = '전체'; state.pickerQuery = '';
  $('#modal-root').innerHTML = `<div class="overlay" data-action="close-picker"><div class="picker" role="dialog" aria-modal="true" aria-label="알고리즘 선택"><div class="picker-top">${icon('search')}<input autofocus placeholder="정렬 알고리즘 검색" aria-label="알고리즘 검색" id="picker-query" autocomplete="off" />${ebutton('close-picker','close','닫기')}</div><div class="picker-tabs" id="picker-tabs"></div><div class="picker-items" id="picker-items"></div></div></div>`;
  $('#picker-query').focus();
  renderPickerItems();
}
function closePicker() { state.picker = false; $('#modal-root').innerHTML = ''; }
function renderPickerItems() {
  const tabs = $('#picker-tabs'), items = $('#picker-items'); if (!tabs || !items) return;
  tabs.innerHTML = categories.map(category=>`<button class="tab-chip ${state.pickerCategory===category?'active':''}" data-action="picker-category" data-value="${category}">${category}</button>`).join('');
  const filtered = algorithms.filter(a=>(state.pickerCategory==='전체'||a.category===state.pickerCategory)&&`${a.name} ${a.en}`.toLowerCase().includes(state.pickerQuery.toLowerCase().trim()));
  items.innerHTML = filtered.length ? filtered.map(a=>`<button class="picker-item" data-action="picker-select" data-id="${a.id}"><span>${escapeHtml(a.name)}</span><small>${escapeHtml(a.avg)}</small></button>`).join('') : '<div class="empty-text">결과가 없습니다.</div>';
}
function navigation(page) { if (!['home','visual','compare','library'].includes(page)) return; state.page = page; state.sidebar = false; $('#layout').classList.remove('expanded'); renderPage(); }
function resetCurrent(changeArray = false) {
  state.playing = false;
  opAccumulator = 0;
  const source = changeArray ? newSource() : state.page === 'visual' ? engine?.initial || newSource() : compareEngines[0]?.initial || newSource();
  if (state.page === 'visual') { engine = new SortEngine(state.algo, source); showAlgoLimit(engine); }
  if (state.page === 'compare') { const sharedData = commonCompareData(source); compareEngines = state.compareIds.map(id => new SortEngine(id,sharedData)); showCompareLimits(source); }
  setPlayIcon(); updateStats();
}
function togglePlay() {
  if (state.page !== 'visual' && state.page !== 'compare') return;
  const done = state.page==='visual'?engine?.completed:compareEngines.every(e=>e.completed);
  if (done) resetCurrent(false);
  state.playing = !state.playing;
  if (state.playing) sound.unlock();
  setPlayIcon();
}
function setPlayIcon() { const btn = $('#play-button'); if (btn) { btn.innerHTML = icon(state.playing?'pause':'play'); btn.setAttribute('aria-label',state.playing?'일시정지':'재생'); btn.title = state.playing?'일시정지':'재생'; } }
function updateSoundIcon() { const btn = $('#sound-button'); if (btn) { btn.innerHTML = icon(state.soundOn?'volume':'mute'); btn.setAttribute('aria-label',state.soundOn?'사운드 끄기':'사운드 켜기'); btn.title = state.soundOn?'사운드 끄기':'사운드 켜기'; } }
function setMeters() { const meter = $('#meter'); if (!meter) return; const engs = state.page==='visual'?[engine]:compareEngines; meter.classList.toggle('running',state.playing); meter.classList.toggle('complete',!!engs.length&&engs.every(e=>e?.completed&&!e?.failed)); meter.classList.toggle('failed',engs.some(e=>e?.failed)); meter.setAttribute('aria-valuetext',engs.every(e=>e.completed)?'완료':state.playing?'정렬 중':'대기'); }
function updateStats() {
  const stats = $('#main-stats');
  if (stats && engine) { stats.innerHTML = `<span>비교 ${formatCount(engine.comparisons)}</span><span>교환 ${formatCount(engine.swaps)}</span><span>쓰기 ${formatCount(engine.writes)}</span>`; stats.classList.toggle('show',state.settings); }
  compareEngines.forEach((e,i)=>{ const stat = $(`#compare-stat-${i}`), end = $(`#compare-end-${i}`); if (stat) stat.textContent=`비교 ${formatCount(e.comparisons)} · 교환 ${formatCount(e.swaps)}`; if (end) end.textContent=e.completed?(e.failed?'오류':'완료'):''; });
}
function revealFocus() { if (!state.focus) return; app.classList.add('reveal'); clearTimeout(focusTimeout); focusTimeout=setTimeout(()=>{ if (state.focus&&!state.settings&&!state.picker) app.classList.remove('reveal'); },2200); }

function actionHandler(event) {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action, value = button.dataset.value;
  if (action === 'close-picker' && button.classList.contains('overlay') && event.target !== button) return;
  if (action==='nav') return navigation(button.dataset.page);
  if (action==='sidebar') { state.sidebar = !state.sidebar; $('#layout').classList.toggle('expanded',state.sidebar); return; }
  if (action==='settings-nav') { if (state.page!=='visual'&&state.page!=='compare') navigation('visual'); state.settings = !state.settings; renderSettings(); updateStats(); return; }
  if (action==='picker-main') return openPicker('main');
  if (action==='picker-compare') return openPicker(Number(button.dataset.index));
  if (action==='picker-category') { state.pickerCategory=value; renderPickerItems(); return; }
  if (action==='picker-select') { const id = button.dataset.id; if (state.pickerTarget==='main') { state.algo=id; persist(); closePicker(); renderPage(); } else { state.compareIds[state.pickerTarget]=id; closePicker(); renderPage(); } return; }
  if (action==='close-picker') return closePicker();
  if (action==='play') return togglePlay();
  if (action==='step-forward' || action==='step-back') {
    state.playing=false;
    const engines=state.page==='visual'?[engine]:compareEngines;
    for(const e of engines) if(e) action==='step-forward'?e.stepForward():e.stepBack();
    setPlayIcon(); setMeters(); updateStats(); return;
  }
  if (action==='reset') return resetCurrent(false);
  if (action==='shuffle') return resetCurrent(true);
  if (action==='sound') { state.soundOn=!state.soundOn; sound.setEnabled(state.soundOn); persist(); updateSoundIcon(); if (state.settings) renderSettings(); return; }
  if (action==='settings') { state.settings=!state.settings; renderSettings(); updateStats(); revealFocus(); return; }
  if (action==='pattern') { state.pattern=value; persist(); renderSettings(); resetCurrent(true); return; }
  if (action==='style') { state.style=value; if(engineView) engineView.style=value; persist(); renderSettings(); return; }
  if (action==='sound-style') { state.soundStyle=value; sound.style=value; persist(); renderSettings(); return; }
  if (action==='focus') { if (state.page!=='visual') return; state.focus=!state.focus; app.classList.toggle('focus',state.focus); app.classList.toggle('reveal',state.focus); if (state.focus) revealFocus(); else app.classList.remove('reveal'); return; }
  if (action==='details') { const a=algorithmById[state.algo]; state.playing=false; setPlayIcon(); state.librarySelected=a.id; navigation('library'); return; }
  if (action==='compare-sound') { state.compareSoundIndex=Number(button.dataset.index); document.querySelectorAll('[data-action="compare-sound"]').forEach(el=>{ const selected=Number(el.dataset.index)===state.compareSoundIndex; el.classList.toggle('selected',selected); el.innerHTML=icon(selected?'sound':'dots'); }); return; }
  if (action==='library-select') { state.librarySelected=button.dataset.id; renderLibraryList(); renderLibraryDetail(); return; }
  if (action==='library-open') { state.algo=state.librarySelected; persist(); navigation('visual'); return; }
  if (action==='library-reset') return renderLibraryDetail();
  if (action==='mini') { const i=Number(button.dataset.index); state.algo=miniEngines[i]?.id || 'quickHoare'; persist(); navigation('visual'); }
}

document.addEventListener('click',actionHandler);
document.addEventListener('input', (event)=>{
  if (event.target.id==='picker-query') { state.pickerQuery=event.target.value; renderPickerItems(); }
  if (event.target.id==='library-query') { state.libraryQuery=event.target.value; renderLibraryList(); }
  const key=event.target.dataset.setting;
  if (key==='speed') { state.speed=Number(event.target.value); const label=$('#speed-label'); if(label) label.textContent=state.speed+'×'; persist(); }
  if (key==='count') { state.count=Number(event.target.value); const label=$('#count-label'); if(label) label.textContent=state.count; persist(); resetCurrent(true); }
  if (key==='volume') { state.volume=Number(event.target.value); sound.volume=state.volume/100; const label=$('#volume-label'); if(label) label.textContent=state.volume+'%'; persist(); }
});
document.addEventListener('keydown',(event)=>{
  if (event.key==='Escape') { if (state.picker) closePicker(); else if(state.settings){state.settings=false;renderSettings();updateStats();}else if(state.focus){state.focus=false;app.classList.remove('focus','reveal');} else if(state.sidebar){state.sidebar=false;$('#layout').classList.remove('expanded');} return; }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.target.closest('button')) { if (event.key==='Enter') return; }
  if (state.picker) return;
  if (event.key===' ' && ['visual','compare'].includes(state.page)) { event.preventDefault(); togglePlay(); }
  if (event.key==='ArrowRight' && ['visual','compare'].includes(state.page)) { event.preventDefault(); state.playing=false; const engines=state.page==='visual'?[engine]:compareEngines; engines.forEach(e=>e?.stepForward());setPlayIcon(); }
  if (event.key==='ArrowLeft' && ['visual','compare'].includes(state.page)) { event.preventDefault(); state.playing=false; const engines=state.page==='visual'?[engine]:compareEngines; engines.forEach(e=>e?.stepBack());setPlayIcon(); }
  if (event.key.toLowerCase()==='f' && state.page==='visual') { state.focus=!state.focus;app.classList.toggle('focus',state.focus);app.classList.toggle('reveal',state.focus);revealFocus(); }
});
document.addEventListener('pointermove',revealFocus,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.playing=false;setPlayIcon();}});

function renderFrame(now) {
  const dt=Math.min(.05, Math.max(0,(now-lastFrame)/1000||0)); lastFrame=now;
  if (!document.hidden) {
    if (state.page==='visual'&&engine) {
      if(state.playing&&!engine.completed) {
        opAccumulator+=dt*speedToEventsPerSecond(state.speed);
        const ops=Math.min(10000, Math.floor(opAccumulator));opAccumulator-=ops;
        const wasDone=engine.completed;
        const events=engine.run(ops);
        sound.consume(events,Math.max(1,...engine.values));
        if(!wasDone&&engine.completed) { state.playing=false;setPlayIcon();if(engine.failed)toast(engine.error);else sound.complete(); }
      }
      engineView.draw(engine.values,{highlight:engine.highlight,completed:engine.completed&&!engine.failed,finishedAt:engine.finishedAt,now});
      setMeters();updateStats();
    }
    if(state.page==='compare'&&compareEngines.length) {
      if(state.playing) {
        opAccumulator+=dt*speedToEventsPerSecond(state.speed);
        const ops=Math.min(8000,Math.floor(opAccumulator)); opAccumulator-=ops;
        compareEngines.forEach((e,i)=>{if(!e.completed) {const wasDone=e.completed, events=e.run(ops,3);if(i===state.compareSoundIndex)sound.consume(events,Math.max(1,...e.values));if(!wasDone&&e.completed&&i===state.compareSoundIndex&&!e.failed)sound.complete();}});
        if(compareEngines.every(e=>e.completed)){state.playing=false;setPlayIcon();const failed=compareEngines.filter(e=>e.failed);if(failed.length)toast(`${failed.length}개의 정렬이 중단되었습니다.`);}
      }
      compareViews.forEach((view,i)=>view.draw(compareEngines[i].values,{highlight:compareEngines[i].highlight,completed:compareEngines[i].completed&&!compareEngines[i].failed,finishedAt:compareEngines[i].finishedAt,now}));
      setMeters();updateStats();
    }
    if(state.page==='home') miniEngines.forEach((m,i)=>{
      if(m.engine.completed){if(!m.lastComplete)m.lastComplete=now;if(now-m.lastComplete>1050){const index=sortedDemoIds.indexOf(m.id);m.id=sortedDemoIds[(index+3+i)%sortedDemoIds.length];m.engine=new SortEngine(m.id,generateData(46, ['random','descending','nearly','duplicates'][i],Math.random()));m.lastComplete=0;const name=$('#mini-name-'+i);if(name)name.textContent=shortName(m.id);}}
      else m.engine.run(36,2);
      m.view.draw(m.engine.values,{highlight:m.engine.highlight,completed:m.engine.completed,finishedAt:m.engine.finishedAt,now});
    });
    if(state.page==='library'&&libraryEngine){if(!libraryEngine.completed)libraryEngine.run(50,2);else if(now-libraryEngine.finishedAt>1300)libraryEngine=new SortEngine(state.librarySelected,generateData(42,'random'));libraryView.draw(libraryEngine.values,{highlight:libraryEngine.highlight,completed:libraryEngine.completed,finishedAt:libraryEngine.finishedAt,now});}
  }
  requestAnimationFrame(renderFrame);
}

renderShell();
requestAnimationFrame(renderFrame);
