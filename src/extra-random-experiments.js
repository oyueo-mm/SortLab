// Deliberately bounded educational random-comparator experiments.
const C=(i,j)=>({t:'c',i,j}),S=(i,j)=>({t:'s',i,j});
function* sw(a,i,j){if(i===j)return;[a[i],a[j]]=[a[j],a[i]];yield S(i,j);}
function generator(seed){let state=seed||0x9e3779b9;return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
function* isSorted(a){for(let i=1;i<a.length;i++){yield C(i-1,i);if(a[i-1]>a[i])return false;}return true;}
function* annealingSort(a){const n=a.length;if(n<=1)return;const rnd=generator(a.reduce((x,v,i)=>(Math.imul(x,31)+v+i)>>>0,44221));for(let temp=Math.max(2,Math.floor(n/2));temp>=1;temp=Math.floor(temp/2)){for(let repetition=0;repetition<n*8;repetition++){const i=Math.floor(rnd()*n),delta=1+Math.floor(rnd()*temp),j=Math.min(n-1,i+delta);if(i===j)continue;yield C(i,j);if(a[i]>a[j])yield* sw(a,i,j);}if(temp===1)break;}if(!(yield* isSorted(a)))throw Error('어닐링 정렬: 정해진 비교 횟수 안에 완료되지 않았습니다.');}
function* spinBottleSort(a){const n=a.length;if(n<2)return;const rnd=generator(a.reduce((x,v,i)=>(Math.imul(x,33)+v+i)>>>0,12881));for(let pass=0;pass<Math.max(1,n*n*8);pass++){if((pass%n)===0&&(yield* isSorted(a)))return;let i=Math.floor(rnd()*n),j=Math.floor(rnd()*n);if(i===j)continue;if(i>j)[i,j]=[j,i];yield C(i,j);if(a[i]>a[j])yield* sw(a,i,j);}if(!(yield* isSorted(a)))throw Error('스핀더보틀 정렬: 안전한 시도 한도에 도달했습니다.');}
export const extraRandomExperiments=[
{id:'annealingSort',name:'어닐링 정렬',en:'Annealing Sort (bounded educational simulation)',category:'패러디',avg:'확률적·종료 보장 없음',space:'O(1)',stable:false,fn:annealingSort,mayNotFinish:true,maxSize:32},
{id:'spinBottle',name:'스핀더보틀 정렬',en:'Spin-the-bottle Sort (bounded simulation)',category:'패러디',avg:'확률적·비효율적',space:'O(1)',stable:false,fn:spinBottleSort,mayNotFinish:true,maxSize:24}
];
