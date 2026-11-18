// Experimental algorithms are deliberately isolated from ordinary sorting claims.
const C=(i,j)=>({t:'c',i,j}),S=(i,j)=>({t:'s',i,j}),W=(i,v)=>({t:'w',i,v});
function* sw(a,i,j){if(i===j)return;[a[i],a[j]]=[a[j],a[i]];yield S(i,j);}
function* wr(a,i,v){a[i]=v;yield W(i,v);}
function* bogobogo(a){let seed=a.reduce((s,v,i)=>(Math.imul(s,1664525)+v+i+1013904223)>>>0,12345),attempts=0;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};function* ordered(n){for(let i=1;i<n;i++){yield C(i-1,i);if(a[i-1]>a[i])return false;}return true;}function* shuffle(n){for(let i=n-1;i>0;i--){yield* sw(a,i,Math.floor(rand()*(i+1)));if(++attempts>4500)throw Error('Bogobogo Sort: 안전한 시도 한도에 도달했습니다.');}}function* sort(n){if(n<=1)return;if(yield* ordered(n))return;for(let i=0;i<1500;i++){yield* sort(n-1);if(yield* ordered(n))return;yield* shuffle(n);}throw Error('Bogobogo Sort: 제한된 시도 횟수 안에 정렬하지 못했습니다.');}yield* sort(a.length);}
function* sillySort(a){function* sort(lo,hi){const n=hi-lo;if(n<2)return;yield* sort(lo,hi-1);yield C(hi-2,hi-1);if(a[hi-2]>a[hi-1])yield* sw(a,hi-2,hi-1);yield* sort(lo,hi-1);}yield* sort(0,a.length);}
function* burntPancake(a){for(let i=0;i<a.length;i++)if((a[i]+i)%3===0)yield* wr(a,i,-a[i]);function* flip(n){for(let i=0,j=n-1;i<=j;i++,j--){if(i===j){yield* wr(a,i,-a[i]);continue;}yield* sw(a,i,j);yield* wr(a,i,-a[i]);yield* wr(a,j,-a[j]);}}for(let end=a.length;end>1;end--){let pos=0;for(let i=1;i<end;i++){yield C(pos,i);if(Math.abs(a[i])>Math.abs(a[pos]))pos=i;}if(pos===end-1&&a[pos]>0)continue;if(pos>0)yield* flip(pos+1);if(a[0]>0)yield* flip(1);yield* flip(end);}if(a.length&&a[0]<0)yield* flip(1);}
export const extraExperimental=[
{id:'bogobogo',name:'보고보고 정렬',en:'Bogobogo Sort (bounded simulation)',category:'패러디',avg:'극단적 무작위 반복',space:'O(n) 재귀',stable:false,fn:bogobogo,mayNotFinish:true,maxSize:4},
{id:'sillySort',name:'실리 정렬',en:'Silly Sort',category:'패러디',avg:'O(2^n) 수준',space:'O(n) 재귀',stable:false,fn:sillySort,maxSize:11},
{id:'burntPancake',name:'번트 팬케이크 정렬',en:'Burnt Pancake Sort (signed-orientation demo)',category:'패러디',avg:'O(n²)',space:'O(1)',stable:false,fn:burntPancake,maxSize:80,signed:true}
];
