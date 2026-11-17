import { algorithms, algorithmById } from './algorithms.js';
import { generateData, patterns } from './data.js';
import { SortEngine, speedToEventsPerSecond } from './engine.js';
import { BarView } from './visual.js';
import { PALETTE_LABELS } from './palette.js';
import { SortImageAsset, ImageSortView, IMAGE_MODES, IMAGE_PIECES, IMAGE_THEMES, PIXEL_METRICS, imageCountFor, imageInputFor } from './image-sort.js';
import { settingsMarkup } from './settings-ui.js';
import { SortAudio } from './audio.js';
import { icon } from './icons.js';
import { algorithmDescriptions } from './descriptions.js';
import { CATEGORY_TITLES, groupCatalogAlgorithms, getGuideEntry } from './catalog.js';
import { CATALOG_CATEGORIES, LIBRARY_DEFAULT_SPEED, LIBRARY_SPEEDS, LIBRARY_COMPLETE_HOLD_MS, libraryInputSize, libraryEventsPerSecond, filterLibraryAlgorithms, algorithmsInCollection, isExperimentalSort, advanceLibraryCard } from './library.js';

const $ = (selector, root = document) => root.querySelector(selector);
const app = $('#app');
const sidebarMedia = window.matchMedia('(min-width: 621px)');
const initial = { page: 'home', algo: 'quickHoare', pattern: 'random', count: 100, speed: 82, style: 'bars', palette: 'rainbow', imageMode: 'strips', imageCount: 128, imageTheme: 'lake', imageMetric: 'brightness', soundOn: true, volume: 70, soundStyle: 'retro', sidebar: sidebarMedia.matches };
let cached = {};
try { cached = JSON.parse(localStorage.getItem('sortlab:prefs') || '{}') || {}; } catch { /* private browsing */ }
const state = { ...initial, ...cached, page: 'home', sidebar: sidebarMedia.matches, settings: false, picker: false, pickerCategory: '전체', pickerQuery: '', pickerTarget: 'main', librarySelected: 'quickHoare', libraryQuery: '', experimentQuery: '', libraryCategory: '전체', librarySpeed: LIBRARY_SPEEDS.includes(Number(cached.librarySpeed)) ? Number(cached.librarySpeed) : LIBRARY_DEFAULT_SPEED, librarySortMode: ['learning','name','complexity'].includes(cached.librarySortMode)?cached.librarySortMode:'learning', libraryPanel: '', guideSelected: 'bubble', guideQuery: '', compareIds: ['bubble', 'quickHoare', 'merge', 'heap'], compareSoundIndex: 1, playing: false, focus: false };
state.count = Math.max(5,Math.min(10000,Number.isFinite(Number(state.count))?Math.round(Number(state.count)):100));
if(!['bars','dots','circle','image'].includes(state.style))state.style='bars';
if(!PALETTE_LABELS[state.palette])state.palette='rainbow';
if(!IMAGE_MODES[state.imageMode])state.imageMode='strips';
if(!PIXEL_METRICS[state.imageMetric])state.imageMetric='brightness';
if(!IMAGE_THEMES[state.imageTheme])state.imageTheme='lake';
state.imageCount=imageCountFor(state.imageMode,state.imageCount||128);
let imageAsset=SortImageAsset.sample(state.imageTheme);
const sound = new SortAudio();
sound.enabled = state.soundOn;
sound.volume = state.volume / 100;
sound.style = state.soundStyle;
let engine = null, engineView = null, compareEngines = [], compareViews = [], miniEngines = [], libraryCards = [], libraryObserver = null, libraryDetail = null, libraryDetailFocus = null;
let lastFrame = 0, opAccumulator = 0, toastTimeout = null, focusTimeout = null;
let guideEngine=null, guideView=null, guidePlaying=false, guideAccumulator=0, guideLastDraw=0;
const categories = ['전체', ...CATALOG_CATEGORIES];
const SIZE_PRESETS = [100,500,1000,2000,5000,10000];
const standardAlgorithms = algorithmsInCollection(algorithms);
const experimentAlgorithms = algorithmsInCollection(algorithms,'experiment');
if (!algorithmById[state.algo] || isExperimentalSort(algorithmById[state.algo])) state.algo = 'quickHoare';
const sortedDemoIds = ['bubble', 'insertion', 'quickHoare', 'merge', 'heap', 'shell', 'cocktail', 'radixLsd', 'selection', 'timsort', 'pancake', 'comb'];

function persist() { const { algo, pattern, count, speed, style, palette, imageMode, imageCount, imageTheme, imageMetric, soundOn, volume, soundStyle, librarySpeed, librarySortMode } = state; try { localStorage.setItem('sortlab:prefs', JSON.stringify({ algo, pattern, count, speed, style, palette, imageMode, imageCount, imageTheme, imageMetric, soundOn, volume, soundStyle, librarySpeed, librarySortMode })); } catch { /* privacy mode */ } }
function ebutton(action, symbol, label, css = 'icon-btn', extra = '') { return `<button type="button" class="${css}" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(symbol)}</button>`; }
function formatCount(n) { return n.toLocaleString('ko-KR'); }
function shortName(id) { return algorithmById[id]?.name || id; }
function algoTitle(id) { const a=algorithmById[id];return a?`<span class="algo-title-stack"><span class="algo-ko">${escapeHtml(a.name)}</span><span class="algo-en">${escapeHtml(a.en)}</span></span>`:escapeHtml(id); }
function effectiveImageCount() { const chosen=state.page==='compare'?state.compareIds:[state.algo];const limit=Math.min(...chosen.map(id=>algorithmById[id]?.maxSize||Infinity));return imageCountFor(state.imageMode,state.imageCount,limit); }
function makeView(canvas,compact=false) { return state.style==='image'?new ImageSortView(canvas,{asset:imageAsset,mode:state.imageMode,metric:state.imageMetric,compact}):new BarView(canvas,{compact,style:state.style,palette:state.palette}); }
function refreshVisualViews(){if(state.page==='visual'&&$('#main-canvas'))engineView=makeView($('#main-canvas'));if(state.page==='compare'&&compareViews.length)compareViews=compareViews.map((_,i)=>makeView($('#compare-'+i),true));const cv=$('#main-canvas');if(cv)cv.setAttribute('aria-label',state.style==='image'?'이미지 정렬 시각화':'정렬 과정 시각화');}
function toast(message) { const t = $('#toast'); if (!t) return; t.textContent = message; t.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => t.classList.remove('show'), 3400); }

function renderShell() {
  app.innerHTML = `<div class="app${state.sidebar ? ' expanded' : ''}" id="layout"><aside class="rail" aria-label="탐색 메뉴">
    <div class="brand"><span class="brand-text">SortLab</span>${ebutton('sidebar', 'panel', '메뉴 열기 또는 닫기', 'rail-btn')}</div>
    <nav class="nav-list" aria-label="메인 메뉴">${[
      ['home', 'home', '홈'], ['library', 'book', '도감'], ['guide', 'guide', '알고리즘 해설'], ['visual', 'bars', '시각화'], ['compare', 'compare', '비교']
    ].map(([id, glyph, label]) => `<button type="button" data-action="nav" data-page="${id}" class="rail-btn nav${state.page===id?' active':''}" title="${label}" aria-label="${label}" ${state.page===id?'aria-current="page"':''}>${icon(glyph)}<span class="nav-name">${label}</span></button>`).join('')}<div class="nav-separator" aria-hidden="true"></div><button type="button" data-action="nav" data-page="experiment" class="rail-btn nav${state.page==='experiment'?' active':''}" title="패러디·실험" aria-label="패러디·실험 (일반 정렬과 별도)" ${state.page==='experiment'?'aria-current="page"':''}>${icon('sparkles')}<span class="nav-name">패러디·실험</span></button></nav>
    <div class="rail-bottom"><a class="rail-btn nav" href="https://github.com/oyueo-mm/SortLab" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub">${icon('github')}<span class="nav-name">GitHub</span></a><button class="rail-btn nav" data-action="settings-nav" title="설정" aria-label="설정">${icon('settings')}<span class="nav-name">설정</span></button></div>
  </aside><main class="workspace" id="workspace"><button class="icon-btn mobile-menu" data-action="sidebar" aria-label="메뉴">${icon('panel')}</button><div id="screen"></div></main></div><div id="modal-root"></div><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  renderPage();
}

function newSource(shufflePixels=false) { if(state.style==='image'&&['visual','compare'].includes(state.page))return imageInputFor(imageAsset,state.imageMode,effectiveImageCount(),state.pattern,state.imageMetric,shufflePixels);return generateData(state.count,state.pattern); }
function commonCompareData(input) { let n = input.length; for (const id of state.compareIds) { const algo = algorithmById[id]; if (algo.maxSize) n = Math.min(n, algo.maxSize); } if (state.compareIds.some(id => algorithmById[id].powerOfTwo)) n = 2 ** Math.floor(Math.log2(n)); return input.slice(0, Math.max(2,n)); }
function meter() { return '<div class="meter" id="meter" role="progressbar" aria-label="정렬 진행 상태"></div>'; }
function controls(compact = false) { return `<div class="controlbar" aria-label="재생 제어">${ebutton('shuffle','shuffle','새 배열')}${ebutton('step-back','step-back','한 단계 이전')}${ebutton('play','play','재생 또는 일시정지','play-button','id="play-button"')}${ebutton('step-forward','step-forward','한 단계 다음')}${ebutton('reset','reset','처음부터 다시 정렬')}</div>`; }
function topBar(withAlgo = true) { return `<div class="header-row"><div>${withAlgo?`<button class="algo-trigger" data-action="picker-main" aria-label="정렬 알고리즘 선택" title="알고리즘 선택">${algoTitle(state.algo)}<span class="muted-icon">${icon('chevron',14)}</span></button>`:''}</div><div class="header-right">${ebutton('details','info','정렬 정보')}${ebutton('sound','volume', '소리 켜기 또는 끄기','icon-btn','id="sound-button"')}${ebutton('settings','settings','설정')}${ebutton('focus','expand','집중 모드')}</div></div>`; }

function renderPage() {
  state.settings = false;
  state.playing = false;
  state.focus = false;
  app.classList.remove('focus','reveal');
  opAccumulator = 0;
  if (libraryObserver) libraryObserver.disconnect(); libraryObserver = null; libraryCards = []; libraryDetail = null; state.libraryPanel = ''; state.picker = false; $('#modal-root')?.replaceChildren();
  engine = null; engineView = null; compareEngines = []; compareViews = []; miniEngines = []; guideEngine=null;guideView=null;guidePlaying=false;guideAccumulator=0;
  const el = $('#screen');
  if (!el) return;
  if (state.page === 'home') {
    el.innerHTML = `<section class="screen home-screen"><div class="home-copy"><h1 class="home-title">SortLab</h1><button class="home-start" data-action="nav" data-page="visual">시작하기 ${icon('arrow',17)}</button></div><div class="home-mosaic">${[0,1,2,3].map(i => `<div class="home-mini" role="button" tabindex="0" data-action="mini" data-index="${i}" aria-label="미니 정렬 시각화 시작"><canvas id="mini-${i}" aria-hidden="true"></canvas><span class="mini-name" id="mini-name-${i}"></span><span class="mini-status"></span></div>`).join('')}</div></section>`;
    miniEngines = [0,1,2,3].map((i) => { const id = sortedDemoIds[[0,2,3,4][i]], source = new SortEngine(id,generateData(46,'random',Math.random())); $('#mini-name-'+i).textContent = shortName(id); return { engine: source, view: new BarView($('#mini-'+i),{ compact:true,palette:state.palette }), lastComplete:0, id }; });
  } else if (state.page === 'visual') {
    el.innerHTML = `<section class="screen visual-screen">${topBar(true)}<div class="visual-stage" id="main-stage"><canvas id="main-canvas" aria-label="정렬 과정 막대 시각화" role="img"></canvas><div id="hover-readout" class="hover-readout" aria-hidden="true"></div></div>${meter()}${controls()}<div class="micro-stats" id="main-stats"></div><div id="settings-host"></div></section>`;
    engine = new SortEngine(state.algo,newSource());
    engineView = makeView($('#main-canvas'));
    $('#main-canvas').addEventListener('pointermove',handleCanvasHover);
    $('#main-canvas').addEventListener('pointerleave',()=>{ engineView.hover = -1; $('#hover-readout')?.classList.remove('visible'); });
    showAlgoLimit(engine);
  } else if (state.page === 'compare') {
    el.innerHTML = `<section class="screen compare-screen"><div class="compare-header"><h1 class="compact-heading">비교</h1><div class="header-right">${ebutton('sound','volume','소리 켜기 또는 끄기','icon-btn','id="sound-button"')}${ebutton('settings','settings','설정')}</div></div><div class="compare-grid">${state.compareIds.map((id,i)=>`<div class="compare-card"><div class="compare-card-head"><button class="compare-select" data-action="picker-compare" data-index="${i}" title="정렬 알고리즘 바꾸기">${algoTitle(id)} ${icon('chevron',12)}</button>${ebutton('compare-sound',state.compareSoundIndex===i?'sound':'dots',`이 알고리즘 소리 재생`,'icon-btn'+(state.compareSoundIndex===i?' selected':''),`data-index="${i}"`)}</div><canvas id="compare-${i}" role="img" aria-label="${shortName(id)} 정렬 시각화"></canvas><div class="compare-actions"><span id="compare-stat-${i}" class="compare-stat"></span><span class="compare-stat" id="compare-end-${i}"></span></div></div>`).join('')}</div><div class="compare-footer">${meter()}${controls()}</div><div id="settings-host"></div></section>`;
    const data = newSource();
    const sharedData = commonCompareData(data);
    compareEngines = state.compareIds.map(id => new SortEngine(id,sharedData));
    compareViews = compareEngines.map((e,i)=>{ const canvas=$('#compare-'+i);canvas.dataset.initialKeyHash=e.initial.reduce((h,v)=>(Math.imul(h ^ v,16777619)>>>0),2166136261).toString(16);return makeView(canvas,true); });
    showCompareLimits(data);
  } else if (state.page === 'guide') {
    el.innerHTML = `<section class="screen guide-screen"><div class="guide-layout"><aside class="guide-index" aria-label="알고리즘 목차"><div class="guide-index-top"><h1>알고리즘 해설</h1><label class="guide-search">${icon('search',16)}<input id="guide-query" type="search" placeholder="알고리즘 검색" aria-label="해설 검색" autocomplete="off" value="${escapeHtml(state.guideQuery)}" /></label></div><nav class="guide-index-list" id="guide-index-list" aria-label="알고리즘 선택"></nav></aside><article class="guide-article" id="guide-article" aria-live="polite"></article></div></section>`;
    renderGuideIndex();renderGuideArticle();
  } else if (state.page === 'library' || state.page === 'experiment') {
    const experimental = state.page === 'experiment';
    el.innerHTML = `<section class="screen library-screen gallery-screen${experimental?' experiment-screen':''}">${experimental?'<div class="experiment-intro"><strong>패러디·실험</strong><span>일반 정렬과 다릅니다. 값을 삭제·변경하거나 정렬을 완료하지 못할 수 있어요.</span></div>':''}<div class="gallery-toolbar"><label class="gallery-search">${icon('search',16)}<input id="library-query" type="search" placeholder="검색" aria-label="${experimental?'패러디 실험':'정렬 알고리즘'} 검색" autocomplete="off" value="${escapeHtml(experimental?state.experimentQuery:state.libraryQuery)}" /></label><span id="gallery-count" class="gallery-count" aria-live="polite">${experimental?experimentAlgorithms.length:standardAlgorithms.length}</span>${experimental?'':ebutton('library-filter','filter','정렬 종류 필터','icon-btn gallery-tool')}${experimental?'':ebutton('library-order','bars','도감 정렬 순서','icon-btn gallery-tool')}${ebutton('library-settings','settings','미리보기 속도','icon-btn gallery-tool')}</div><div id="gallery-panel" class="gallery-panel" hidden></div><div class="${experimental?'gallery-grid':'gallery-catalog'}" id="library-items"></div></section>`;
    renderLibraryGallery();
  }
  document.querySelectorAll('.rail-btn.nav[data-page]').forEach(btn => { btn.classList.toggle('active',btn.dataset.page===state.page); btn.toggleAttribute('aria-current',btn.dataset.page===state.page); });
  setPlayIcon(); updateSoundIcon();
}

function escapeHtml(str) { return String(str).replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v])); }
function showAlgoLimit(eng) { if (eng.initial.length !== (state.style==='image'?state.imageCount:state.count)) toast(`${eng.algorithm.en}: 배열을 ${eng.initial.length}개로 제한했습니다.`); }
function showCompareLimits(source) { if(state.style==='image'&&source.length!==state.imageCount){toast('선택한 알고리즘의 제한에 맞춰 이미지 조각 수를 '+source.length+'개로 조절했습니다.');return;}const limited = compareEngines.filter(e => e.initial.length !== source.length); if (limited.length) toast('공정한 비교를 위해 모든 알고리즘에 같은 크기의 배열을 사용합니다.'); else if(compareEngines.some(e=>e.algorithm.altersInput||e.algorithm.mayNotFinish))toast('패러디: 값 삭제·변경이나 미완료가 발생할 수 있어 일반 정렬과 직접 비교하기 어렵습니다.'); }
function handleCanvasHover(evt) {
  if (!engineView || !engine) return;
  const index = engineView.nearestIndex(evt.clientX), rect = evt.currentTarget.getBoundingClientRect();
  engineView.hover = index;
  const readout = $('#hover-readout'); if (!readout) return;
  readout.textContent = state.style==='image'?(state.imageMode==='pixels'?`픽셀 ${index+1} · 정렬 키 ${engine.values[index]}`:`조각 ${index+1} · 원래 위치 ${engine.values[index]}`):`${index}  ·  ${engine.values[index]}`;
  readout.style.left = `${evt.clientX - rect.left}px`;
  readout.style.top = `${evt.clientY - rect.top}px`;
  readout.classList.add('visible');
}
function libraryCardMarkup(a) { return `<button type="button" class="gallery-card${a.category==='패러디'?' parody-card':''}" data-action="library-select" data-id="${a.id}" aria-label="${escapeHtml(a.name)} 자세히 보기" title="${escapeHtml(a.name)}"><span class="gallery-card-name">${escapeHtml(a.name)}</span><span class="gallery-card-en">${escapeHtml(a.en)}</span>${a.category==='패러디'?'<span class="gallery-card-type">실험</span>':''}<span class="gallery-canvas"><canvas id="gallery-${a.id}" aria-hidden="true"></canvas></span><span class="gallery-card-bottom"><span class="gallery-status" aria-hidden="true"></span></span></button>`; }
function renderLibraryGallery() {
  const root = $('#library-items'); if (!root) return;
  if (libraryObserver) libraryObserver.disconnect(); libraryObserver = null;
  const experimental=state.page==='experiment';const items = filterLibraryAlgorithms(algorithms, experimental?state.experimentQuery:state.libraryQuery, experimental?'전체':state.libraryCategory, experimental?'experiment':'standard',state.librarySortMode);
  const count = $('#gallery-count'); if (count) count.textContent = items.length;
  root.innerHTML = items.length ? (experimental?items.map(libraryCardMarkup).join(''):groupCatalogAlgorithms(items).map(group=>`<section class="gallery-chapter" id="catalog-${escapeHtml(group.category)}" data-category="${escapeHtml(group.category)}"><div class="gallery-chapter-head"><h2>${escapeHtml(group.title)}</h2><span aria-hidden="true" class="gallery-chapter-rule"></span></div><div class="gallery-grid">${group.items.map(libraryCardMarkup).join('')}</div></section>`).join('')) : `<div class="gallery-empty">검색 결과가 없습니다.</div>`;
  const start = performance.now();
  libraryCards = items.map((a,i) => { const node = root.querySelector(`[data-id="${a.id}"]`), canvas = node.querySelector('canvas'); return { id:a.id, node, engine:new SortEngine(a.id, generateData(libraryInputSize(a), 'random')), view:new BarView(canvas,{compact:true,palette:state.palette}), visible:false, accumulator:0, nextStart:start+(i%7)*110, lastDraw:0 }; });
  if ('IntersectionObserver' in window) { libraryObserver = new IntersectionObserver((entries) => { for (const entry of entries) { const card = libraryCards.find(c=>c.node===entry.target); if(card) card.visible=entry.isIntersecting; } }, {root:$('#workspace'),rootMargin:'60px 0px 60px 0px',threshold:0}); libraryCards.forEach(c=>libraryObserver.observe(c.node)); }
  else libraryCards.forEach(c=>{c.visible=true;});
}
function renderLibraryPanel() {
  const el=$('#gallery-panel'); if(!el)return;
  el.hidden=!state.libraryPanel;
  if(state.libraryPanel==='order')el.innerHTML=`<div class="gallery-panel-title">순서</div><div class="gallery-options">${[['learning','학습 순서'],['name','이름순'],['complexity','복잡도순']].map(([id,label])=>`<button type="button" class="gallery-option ${state.librarySortMode===id?'active':''}" data-action="library-order-select" data-value="${id}" aria-pressed="${state.librarySortMode===id}">${label}</button>`).join('')}</div>`;
  if(state.libraryPanel==='speed')el.innerHTML=`<div class="gallery-panel-title">속도</div><div class="gallery-options">${LIBRARY_SPEEDS.map(n=>`<button type="button" class="gallery-option ${n===state.librarySpeed?'active':''}" data-action="library-speed-select" data-value="${n}" aria-pressed="${n===state.librarySpeed}">${n}×</button>`).join('')}</div>`;
  if(state.libraryPanel==='filter')el.innerHTML=`<div class="gallery-panel-title">분류 이동</div><div class="gallery-options">${CATALOG_CATEGORIES.map(c=>`<button type="button" class="gallery-option" data-action="library-jump" data-value="${c}">${escapeHtml(CATEGORY_TITLES[c])}</button>`).join('')}</div><div class="gallery-panel-title gallery-filter-secondary">목록 필터</div><div class="gallery-options">${categories.map(c=>`<button type="button" class="gallery-option ${c===state.libraryCategory?'active':''}" data-action="library-category" data-value="${c}" aria-pressed="${c===state.libraryCategory}">${c}</button>`).join('')}</div>`;
}
function openLibraryDetail(id) {
  const a=algorithmById[id]; if(!a || !['library','experiment'].includes(state.page) || isExperimentalSort(a)!==(state.page==='experiment'))return;
  libraryDetailFocus=document.activeElement; state.librarySelected=id;
  const current=libraryCards.find(c=>c.id===id); const seed=current ? current.engine.initial : generateData(libraryInputSize(a),'random'); const desc=algorithmDescriptions[a.id]; const resultType=a.altersInput?'원본 값 변경':a.mayNotFinish?'완료 보장 없음':a.category==='패러디'?'원본 보존 · 정렬 완료':'원본 값 보존';
  libraryDetail={id,engine:new SortEngine(id,seed),view:null,playing:true,accumulator:0,lastDraw:0};
  $('#modal-root').innerHTML=`<div class="overlay library-overlay" data-action="library-close"><section class="gallery-detail-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-detail-title"><div class="gallery-detail-head"><div><h2 id="gallery-detail-title">${escapeHtml(a.name)}</h2><span class="gallery-detail-en">${escapeHtml(a.en)}</span></div>${ebutton('library-close','close','상세 닫기')}</div><div class="gallery-detail-stage"><canvas id="gallery-detail-canvas" role="img" aria-label="${escapeHtml(a.name)} 정렬 미리보기"></canvas></div>${a.category==='패러디'?'<div class="experiment-warning">패러디·실험 — 일반 도감과 분리된 실험 항목입니다.</div>':''}${a.category==='패러디'?`<div class="gallery-detail-explain">${escapeHtml(desc.summary)}<span>${escapeHtml(desc.detail)}</span></div>`:''}<div class="gallery-detail-controls">${ebutton('library-detail-reset','reset','다시 정렬')}${ebutton('library-detail-play','pause','일시정지','icon-btn gallery-detail-play','id="gallery-detail-play"')}${ebutton('library-detail-step','step-forward','한 단계 진행')}${ebutton('library-detail-new','shuffle','새 배열')}</div>${a.category==='패러디'?`<div class="gallery-detail-facts"><div><span>평균</span><strong>${escapeHtml(a.avg)}</strong></div><div><span>공간</span><strong>${escapeHtml(a.space)}</strong></div><div><span>유형</span><strong>패러디·실험</strong></div><div><span>결과</span><strong>${escapeHtml(resultType)}</strong></div></div>`:''}${a.category==='패러디'?'':`<div class="gallery-detail-links"><button type="button" class="gallery-guide-link" data-action="library-guide">해설 보기 ${icon('arrow',15)}</button><button type="button" class="gallery-open" data-action="library-open">시각화로 이동 ${icon('arrow',16)}</button></div>`}</section></div>`;
  libraryDetail.view=new BarView($('#gallery-detail-canvas'),{palette:state.palette});
  $('#modal-root [data-action="library-close"]:not(.overlay)')?.focus();
}
function closeLibraryDetail() { if(!libraryDetail)return; libraryDetail=null; $('#modal-root').replaceChildren(); if(libraryDetailFocus?.isConnected)libraryDetailFocus.focus(); libraryDetailFocus=null; }
function updateLibraryDetailPlay() { const btn=$('#gallery-detail-play'); if(btn&&libraryDetail){btn.innerHTML=icon(libraryDetail.playing?'pause':'play');btn.title=libraryDetail.playing?'일시정지':'재생';btn.setAttribute('aria-label',btn.title);} }
function resetLibraryDetail(fresh=false) { if(!libraryDetail)return; const a=algorithmById[libraryDetail.id]; const seed=fresh ? generateData(libraryInputSize(a),'random') : libraryDetail.engine.initial; libraryDetail.engine=new SortEngine(a.id,seed);libraryDetail.accumulator=0;libraryDetail.playing=true;updateLibraryDetailPlay(); }
function updateLibraryFrames(dt,now) {
  if (!libraryDetail) for(const card of libraryCards){
    if(!card.visible||now<card.nextStart)continue;
    if(card.engine.completed && now-card.engine.finishedAt>LIBRARY_COMPLETE_HOLD_MS){card.engine=new SortEngine(card.id,generateData(libraryInputSize(algorithmById[card.id]),'random'));card.accumulator=0;card.lastDraw=0;}
    else if(!card.engine.completed)card.accumulator=advanceLibraryCard(card.engine,card.accumulator,dt,state.librarySpeed);
    if(now-card.lastDraw>=33 || !card.lastDraw){card.view.draw(card.engine.values,{highlight:card.engine.highlight,completed:card.engine.completed&&!card.engine.failed,finishedAt:card.engine.finishedAt,now,altered:!!algorithmById[card.id]?.altersInput});card.lastDraw=now;card.node.classList.toggle('sorted',card.engine.completed&&!card.engine.failed);card.node.classList.toggle('failed',card.engine.failed);card.node.classList.toggle('altered',!!algorithmById[card.id]?.altersInput&&card.engine.completed&&!card.engine.failed);}
  }
  if(libraryDetail){const d=libraryDetail;if(d.playing){if(d.engine.completed){d.playing=false;updateLibraryDetailPlay();}else{d.accumulator=advanceLibraryCard(d.engine,d.accumulator,dt,state.librarySpeed);if(d.engine.completed){d.playing=false;updateLibraryDetailPlay();}}}if(now-d.lastDraw>=20||!d.lastDraw){d.view.draw(d.engine.values,{highlight:d.engine.highlight,completed:d.engine.completed&&!d.engine.failed,finishedAt:d.engine.finishedAt,now,altered:!!algorithmById[d.id]?.altersInput});d.lastDraw=now;}}
}
function renderSettings() { const host=$('#settings-host');if(!host)return;if(!state.settings){host.innerHTML='';return;}host.innerHTML=settingsMarkup(state,patterns,SIZE_PRESETS,imageAsset.name);const preview=$('#image-source-preview');if(preview)preview.getContext('2d')?.drawImage(imageAsset.canvas,0,0,preview.width,preview.height); }
function openPicker(target) {
  state.picker = true; state.pickerTarget = target; state.pickerCategory = '전체'; state.pickerQuery = '';
  $('#modal-root').innerHTML = `<div class="overlay" data-action="close-picker"><div class="picker" role="dialog" aria-modal="true" aria-label="알고리즘 선택"><div class="picker-top">${icon('search')}<input autofocus placeholder="정렬 알고리즘 검색" aria-label="알고리즘 검색" id="picker-query" autocomplete="off" />${ebutton('close-picker','close','닫기')}</div><div class="picker-categories">${ebutton('picker-scroll','chevron','분류 왼쪽으로','icon-btn picker-scroll-left')}<div class="picker-tabs" id="picker-tabs"></div>${ebutton('picker-scroll','chevron','분류 오른쪽으로','icon-btn picker-scroll-right')}</div><div class="picker-items" id="picker-items"></div></div></div>`;
  $('#picker-query').focus();
  renderPickerItems();
}
function closePicker() { state.picker = false; $('#modal-root').innerHTML = ''; }
function renderPickerItems() {
  const tabs = $('#picker-tabs'), items = $('#picker-items'); if (!tabs || !items) return;
  tabs.innerHTML = categories.map(category=>`<button class="tab-chip ${state.pickerCategory===category?'active':''}" data-action="picker-category" data-value="${category}">${category}</button>`).join('');
  const filtered = standardAlgorithms.filter(a=>(state.pickerCategory==='전체'||a.category===state.pickerCategory)&&`${a.name} ${a.en}`.toLowerCase().includes(state.pickerQuery.toLowerCase().trim()));
  items.innerHTML = filtered.length ? filtered.map(a=>`<button class="picker-item" data-action="picker-select" data-id="${a.id}"><span class="picker-item-name"><strong>${escapeHtml(a.name)}</strong><span>${escapeHtml(a.en)}</span></span><small>${escapeHtml(a.avg)}</small></button>`).join('') : '<div class="empty-text">결과가 없습니다.</div>';
}
function navigation(page) { if (!['home','visual','compare','library','guide','experiment'].includes(page)) return; state.page = page; if (!sidebarMedia.matches) { state.sidebar = false; $('#layout').classList.remove('expanded'); } renderPage(); }
function resetCurrent(changeArray = false,shufflePixels=false) {
  state.playing = false;
  opAccumulator = 0;
  const source = changeArray ? newSource(shufflePixels) : state.page === 'visual' ? engine?.initial || newSource() : compareEngines[0]?.initial || newSource();
  if (state.page === 'visual') { engine = new SortEngine(state.algo, source); showAlgoLimit(engine); }
  if (state.page === 'compare') { const sharedData = commonCompareData(source); compareEngines = state.compareIds.map(id => new SortEngine(id,sharedData)); compareEngines.forEach((e,i)=>{const cv=$('#compare-'+i);if(cv)cv.dataset.initialKeyHash=e.initial.reduce((h,v)=>(Math.imul(h^v,16777619)>>>0),2166136261).toString(16);});showCompareLimits(source); }
  if(state.style==='image')refreshVisualViews();
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
  compareEngines.forEach((e,i)=>{ const stat = $(`#compare-stat-${i}`), end = $(`#compare-end-${i}`); if (stat) stat.textContent=`비교 ${formatCount(e.comparisons)} · 교환 ${formatCount(e.swaps)}`; if (end) end.textContent=e.completed?(e.failed?'오류':e.algorithm.altersInput?'입력 변형':'완료'):''; });
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
  if (action==='picker-category') { const tabs=$('#picker-tabs'),scroll=tabs?.scrollLeft||0;state.pickerCategory=value;renderPickerItems();if(tabs)tabs.scrollLeft=scroll;return; }
  if (action==='picker-scroll') { const tabs=$('#picker-tabs');const direction=button.classList.contains('picker-scroll-left')?-1:1;tabs?.scrollBy({left:direction*230,behavior:'smooth'});return; }
  if (action==='picker-select') { const id = button.dataset.id; if(!algorithmById[id] || isExperimentalSort(algorithmById[id]))return; if (state.pickerTarget==='main') { state.algo=id; persist(); closePicker(); renderPage(); } else { state.compareIds[state.pickerTarget]=id; closePicker(); renderPage(); } return; }
  if (action==='close-picker') return closePicker();
  if (action==='play') return togglePlay();
  if (action==='step-forward' || action==='step-back') {
    state.playing=false;
    const engines=state.page==='visual'?[engine]:compareEngines;
    for(const e of engines) if(e) action==='step-forward'?e.stepForward():e.stepBack();
    setPlayIcon(); setMeters(); updateStats(); return;
  }
  if (action==='reset') return resetCurrent(false);
  if (action==='shuffle') return resetCurrent(true,state.style==='image'&&state.imageMode==='pixels');
  if (action==='sound') { state.soundOn=!state.soundOn; sound.setEnabled(state.soundOn); persist(); updateSoundIcon(); if (state.settings) renderSettings(); return; }
  if (action==='settings') { state.settings=!state.settings; renderSettings(); updateStats(); revealFocus(); return; }
  if (action==='count-preset') { state.count=Number(value);persist();renderSettings();resetCurrent(true);return; }
  if (action==='pattern') { state.pattern=value; persist(); renderSettings(); resetCurrent(true); return; }
  if (action==='style') {if(!['bars','dots','circle','image'].includes(value))return;const switchedImage=(state.style==='image')!==(value==='image');state.style=value;if(value==='image'&&!['random','ascending','descending','nearly'].includes(state.pattern))state.pattern='random';persist();refreshVisualViews();if(switchedImage)resetCurrent(true);renderSettings();return;}
  if (action==='palette') {if(!PALETTE_LABELS[value])return;state.palette=value;persist();refreshVisualViews();renderSettings();return;}
  if (action==='image-mode') {if(!IMAGE_MODES[value])return;state.imageMode=value;state.imageCount=imageCountFor(value,value==='strips'?128:value==='tiles'?64:256);persist();refreshVisualViews();resetCurrent(true);renderSettings();return;}
  if (action==='image-count') {const allowed=IMAGE_PIECES[state.imageMode];const size=Number(value);if(!allowed.includes(size))return;state.imageCount=size;persist();resetCurrent(true);renderSettings();return;}
  if (action==='image-theme') {if(!IMAGE_THEMES[value])return;state.imageTheme=value;imageAsset=SortImageAsset.sample(value);persist();refreshVisualViews();resetCurrent(true);renderSettings();return;}
  if (action==='image-metric') {if(!PIXEL_METRICS[value])return;state.imageMetric=value;persist();refreshVisualViews();resetCurrent(true);renderSettings();return;}
  if (action==='sound-style') { state.soundStyle=value; sound.style=value; persist(); renderSettings(); return; }
  if (action==='focus') { if (state.page!=='visual') return; state.focus=!state.focus; app.classList.toggle('focus',state.focus); app.classList.toggle('reveal',state.focus); if (state.focus) revealFocus(); else app.classList.remove('reveal'); return; }
  if (action==='details') {state.guideSelected=state.algo;navigation('guide');return;}
  if (action==='compare-sound') { state.compareSoundIndex=Number(button.dataset.index); document.querySelectorAll('[data-action="compare-sound"]').forEach(el=>{ const selected=Number(el.dataset.index)===state.compareSoundIndex; el.classList.toggle('selected',selected); el.innerHTML=icon(selected?'sound':'dots'); }); return; }
  if (action==='guide-select'||action==='guide-related') { const id=button.dataset.id;if(!getGuideEntry(id,algorithmById,algorithmDescriptions,standardAlgorithms))return;state.guideSelected=id;renderGuideIndex();renderGuideArticle();const article=$('#guide-article');if(article)article.scrollTop=0;return; }
  if (action==='guide-play') {if(!guideEngine)return;if(guideEngine.completed)resetGuide(true);else guidePlaying=!guidePlaying;updateGuidePlayIcon();return;}
  if (action==='guide-reset')return resetGuide(false);
  if (action==='guide-new')return resetGuide(true);
  if (action==='guide-step') {if(!guideEngine)return;guidePlaying=false;guideEngine.stepForward();updateGuidePlayIcon();return;}
  if (action==='guide-back') {if(!guideEngine)return;guidePlaying=false;guideEngine.stepBack();updateGuidePlayIcon();return;}
  if (action==='guide-visual') {state.algo=state.guideSelected;persist();navigation('visual');return;}
  if (action==='library-select') return openLibraryDetail(button.dataset.id);
  if (action==='library-guide') {state.guideSelected=state.librarySelected;closeLibraryDetail();navigation('guide');return;}
  if (action==='library-jump') {if(state.libraryCategory!=='전체'){state.libraryCategory='전체';renderLibraryGallery();}state.libraryPanel='';renderLibraryPanel();const section=document.querySelector(`[data-category="${value}"]`);section?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if (action==='library-close') { if(button.classList.contains('overlay')&&event.target!==button)return; return closeLibraryDetail(); }
  if (action==='library-open') { if(!algorithmById[state.librarySelected] || isExperimentalSort(algorithmById[state.librarySelected]))return; state.algo=state.librarySelected; persist(); navigation('visual'); return; }
  if (action==='library-settings' || action==='library-filter' || action==='library-order') {const panel=action==='library-settings'?'speed':action==='library-order'?'order':'filter';state.libraryPanel=state.libraryPanel===panel?'':panel;renderLibraryPanel();return;}
  if (action==='library-order-select') {state.librarySortMode=value;state.libraryPanel='';persist();renderLibraryPanel();renderLibraryGallery();return;}
  if (action==='library-speed-select') { state.librarySpeed=Number(value);state.libraryPanel='';persist();renderLibraryPanel();return;}
  if (action==='library-category') {state.libraryCategory=value;state.libraryPanel='';renderLibraryPanel();renderLibraryGallery();return;}
  if (action==='library-detail-play') {if(!libraryDetail)return;if(libraryDetail.engine.completed)resetLibraryDetail();else libraryDetail.playing=!libraryDetail.playing;updateLibraryDetailPlay();return;}
  if (action==='library-detail-reset')return resetLibraryDetail(false);
  if (action==='library-detail-new')return resetLibraryDetail(true);
  if (action==='library-detail-step'){if(!libraryDetail)return;libraryDetail.playing=false;libraryDetail.engine.stepForward();updateLibraryDetailPlay();return;}
  if (action==='mini') { const i=Number(button.dataset.index); state.algo=miniEngines[i]?.id || 'quickHoare'; persist(); navigation('visual'); }
}

document.addEventListener('click',actionHandler);
document.addEventListener('input', (event)=>{
  if (event.target.id==='picker-query') { state.pickerQuery=event.target.value; renderPickerItems(); }
  if (event.target.id==='guide-query'){state.guideQuery=event.target.value;renderGuideIndex();}
  if (event.target.id==='library-query') { if(state.page==='experiment')state.experimentQuery=event.target.value;else state.libraryQuery=event.target.value; renderLibraryGallery(); }
  const key=event.target.dataset.setting;
  if (key==='speed') { state.speed=Number(event.target.value); const label=$('#speed-label'); if(label) label.textContent=state.speed+'×'; persist(); }
  if (key==='count') { state.count=Math.max(5,Math.min(10000,Math.round(Number(event.target.value))));const number=$('#count-number');if(number)number.value=state.count;persist(); }
  if (key==='volume') { state.volume=Number(event.target.value); sound.volume=state.volume/100; const label=$('#volume-label'); if(label) label.textContent=state.volume+'%'; persist(); }
});
document.addEventListener('change',(event)=>{if(event.target?.id==='image-upload'){const file=event.target.files?.[0];if(!file)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){toast('PNG, JPG, WEBP 또는 GIF 이미지를 선택하세요.');return;}if(file.size>10*1024*1024){toast('이미지 크기는 10MB 이하로 제한됩니다.');return;}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);if(img.naturalWidth*img.naturalHeight>40000000){toast('이미지 해상도는 4,000만 픽셀 이하로 제한됩니다.');return;}try{imageAsset=SortImageAsset.fromImage(img,file.name.slice(0,50));state.imageTheme='upload';persist();refreshVisualViews();resetCurrent(true);renderSettings();toast('이미지를 적용했습니다.');}catch(error){toast('이미지를 처리하지 못했습니다.');}};img.onerror=()=>{URL.revokeObjectURL(url);toast('이미지를 열지 못했습니다.');};img.src=url;return;}const key=event.target?.dataset?.setting;if(key==='count'||key==='count-number'){state.count=Math.max(5,Math.min(10000,Math.round(Number(event.target.value)||100)));const slider=$('#count-range'),number=$('#count-number');if(slider)slider.value=state.count;if(number)number.value=state.count;persist();renderSettings();resetCurrent(true);}});
document.addEventListener('keydown',(event)=>{
  if (event.key==='Escape') { if (libraryDetail) closeLibraryDetail(); else if(['library','experiment'].includes(state.page)&&state.libraryPanel){state.libraryPanel='';renderLibraryPanel();}else if (state.picker) closePicker(); else if(state.settings){state.settings=false;renderSettings();updateStats();}else if(state.focus){state.focus=false;app.classList.remove('focus','reveal');} else if(state.sidebar){state.sidebar=false;$('#layout').classList.remove('expanded');} return; }
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
        opAccumulator+=dt*speedToEventsPerSecond(state.speed)*Math.max(1,Math.min(20,Math.round(engine.values.length/500)));
        const ops=Math.min(10000, Math.floor(opAccumulator));opAccumulator-=ops;
        const wasDone=engine.completed;
        const events=engine.run(ops);
        sound.consume(events,Math.max(1,...engine.values));
        if(!wasDone&&engine.completed) { state.playing=false;setPlayIcon();if(engine.failed)toast(engine.error);else sound.complete(); }
      }
      engineView.draw(engine.values,{highlight:engine.highlight,completed:engine.completed&&!engine.failed,finishedAt:engine.finishedAt,now,sequence:engine.operations,altered:!!engine.algorithm.altersInput});
      setMeters();updateStats();
    }
    if(state.page==='compare'&&compareEngines.length) {
      if(state.playing) {
        opAccumulator+=dt*speedToEventsPerSecond(state.speed)*Math.max(1,Math.min(20,Math.round((compareEngines[0]?.values.length||100)/500)));
        const ops=Math.min(8000,Math.floor(opAccumulator)); opAccumulator-=ops;
        compareEngines.forEach((e,i)=>{if(!e.completed) {const wasDone=e.completed, events=e.run(ops,3);if(i===state.compareSoundIndex)sound.consume(events,Math.max(1,...e.values));if(!wasDone&&e.completed&&i===state.compareSoundIndex&&!e.failed)sound.complete();}});
        if(compareEngines.every(e=>e.completed)){state.playing=false;setPlayIcon();const failed=compareEngines.filter(e=>e.failed);if(failed.length)toast(`${failed.length}개의 정렬이 중단되었습니다.`);}
      }
      compareViews.forEach((view,i)=>view.draw(compareEngines[i].values,{highlight:compareEngines[i].highlight,completed:compareEngines[i].completed&&!compareEngines[i].failed,finishedAt:compareEngines[i].finishedAt,now,sequence:compareEngines[i].operations,altered:!!compareEngines[i].algorithm.altersInput}));
      setMeters();updateStats();
    }
    if(state.page==='home') miniEngines.forEach((m,i)=>{
      if(m.engine.completed){if(!m.lastComplete)m.lastComplete=now;if(now-m.lastComplete>1050){const index=sortedDemoIds.indexOf(m.id);m.id=sortedDemoIds[(index+3+i)%sortedDemoIds.length];m.engine=new SortEngine(m.id,generateData(46, ['random','descending','nearly','duplicates'][i],Math.random()));m.lastComplete=0;const name=$('#mini-name-'+i);if(name)name.textContent=shortName(m.id);}}
      else m.engine.run(36,2);
      m.view.draw(m.engine.values,{highlight:m.engine.highlight,completed:m.engine.completed,finishedAt:m.engine.finishedAt,now,altered:!!m.engine.algorithm.altersInput});
    });
    if(state.page==='library'||state.page==='experiment')updateLibraryFrames(dt,now);
    if(state.page==='guide')updateGuideFrame(dt,now);
  }
  requestAnimationFrame(renderFrame);
}

renderShell();
sidebarMedia.addEventListener('change',event=>{state.sidebar=event.matches;$('#layout')?.classList.toggle('expanded',state.sidebar);});
requestAnimationFrame(renderFrame);
