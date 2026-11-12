// Library preview policy is intentionally separate from the main visualizer speed.
export const LIBRARY_DEFAULT_SPEED = 1;
export const LIBRARY_SPEEDS = [.25, .5, 1, 2];
export const LIBRARY_COMPLETE_HOLD_MS = 2000;
export const LIBRARY_BASE_EVENTS_PER_SECOND = 24;
export function libraryInputSize(algo) { if(algo.id==='bogo'||algo.id==='bozo')return 4;if(algo.id==='stooge')return 12;if(algo.id==='slow')return 8;if(algo.id==='miracle')return 8;if(algo.powerOfTwo)return 16;return Math.min(24,algo.maxSize||24); }
export function libraryEventsPerSecond(speed=LIBRARY_DEFAULT_SPEED) { const safe=LIBRARY_SPEEDS.includes(Number(speed))?Number(speed):LIBRARY_DEFAULT_SPEED;return LIBRARY_BASE_EVENTS_PER_SECOND*safe; }
export function isExperimentalSort(a) { return a.category==='패러디'; }
export function algorithmsInCollection(algorithms,collection='standard') { return algorithms.filter(a=>collection==='experiment'?isExperimentalSort(a):!isExperimentalSort(a)); }
export function filterLibraryAlgorithms(algorithms,query='',category='전체',collection='standard'){const q=String(query).toLowerCase().trim();return algorithmsInCollection(algorithms,collection).filter(a=>(category==='전체'||category===a.category)&&`${a.name} ${a.en} ${a.category}`.toLowerCase().includes(q));}
export function advanceLibraryCard(engine,accumulator,dt,speed=LIBRARY_DEFAULT_SPEED){if(engine.completed)return 0;const next=accumulator+Math.max(0,Math.min(.05,dt))*libraryEventsPerSecond(speed);const ops=Math.min(8,Math.floor(next));if(ops)engine.run(ops,2);return Math.min(8,next-ops);}
