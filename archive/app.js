// 두 안(A: 틈날때버는월급, B: 월급루팡)이 함께 쓰는 엔진. 문구·색은 각 html의 CFG에서 정함.
// 시연용: 계정·기록은 브라우저 localStorage에만 저장.
(function(){
const C=window.CFG,K=C.key;
const $=id=>document.getElementById(id);
const won=n=>Math.round(n).toLocaleString()+'원';
const dkey=d=>(d||new Date()).toDateString();
const now=()=>new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
const mmss=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(x).padStart(2,'0')};
const ld=k=>{try{return JSON.parse(localStorage.getItem(K+k))}catch(e){return null}};
const st=(k,v)=>{try{localStorage.setItem(K+k,JSON.stringify(v))}catch(e){}};
const SEC=15,PER=10,CAP=300;
const ADS=[['점심 배달비 0원','배달앱 A'],['사무실 원두 정기배송','커피브랜드 B'],['오후 간식 묶음 배송','간식몰 C'],['목·어깨 편한 의자','가구 D'],['퇴근길 운동 1회 무료','피트니스 E'],['회의록 자동 정리 툴','SaaS F'],['주말 근교 숙소 특가','여행 G'],['직장인 영어 첫 달 무료','교육 H']].map((a,i)=>({id:i,title:a[0],brand:a[1]}));
const ITEMS=[['편의점 1천원권',1000],['아메리카노',4500],['배달 쿠폰 5천원',5000],['치킨 세트',20000]];
const JOBS=['IT·개발','마케팅·광고','영업','디자인','경영지원','제조·생산','금융','공공·교육'];

// 상태
const fresh=()=>({wage:0,job:'',pt:0,day:dkey(),secToday:0,secAll:0,days:{},seen:[],ptToday:0,log:[],missions:[]});
let DB=ld('users')||{},cur=ld('cur');if(cur&&!DB[cur])cur=null;
let S;
function loadU(){S=cur?DB[cur].s:(ld('guest')||fresh());if(S.day!==dkey()){S.day=dkey();S.secToday=0;S.seen=[];S.ptToday=0;S.missions=[]}}
loadU();
const save=()=>{S.days[dkey()]=S.secToday;if(cur){DB[cur].s=S;st('users',DB)}else st('guest',S)};
const perSec=()=>S.wage?S.wage*10000/12/209/3600:0; // 연봉(만원) → 초당 (월 209시간 기준)

// 등급
function grade(sec){const m=sec/60;const G=C.grades;let g=G[0];for(const x of G)if(m>=x[0])g=x;return g}

// 토스트
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),2000)}

// ===== 틈(루팡) 타이머 =====
let running=false,tStart=0,base=0,tick=null;
function startT(){if(!S.wage){openSetup(startT);return}running=true;tStart=Date.now();base=S.secToday;$('go').textContent=C.stopLabel;$('go').classList.add('on');tick=setInterval(updT,250);updT()}
function stopT(){running=false;clearInterval(tick);const add=(Date.now()-tStart)/1000;S.secToday=base+add;S.secAll+=add;save();$('go').textContent=C.goLabel;$('go').classList.remove('on');
 if(add>=5){S.log.unshift([now(),`${C.sessionWord} ${mmss(add)} · ${won(add*perSec())} 상당`,0]);save();toast(`${mmss(add)} 동안 ${won(add*perSec())} 벌었어요`)}
 checkMissions();render()}
function updT(){const sec=running?base+(Date.now()-tStart)/1000:S.secToday;
 $('tTime').textContent=mmss(sec);$('tMoney').textContent=won(sec*perSec());
 const g=grade(sec);$('tGrade').textContent=g[1];$('tGradeSub').textContent=g[2];
 const G=C.grades,ix=G.indexOf(g),nx=G[ix+1];$('tNext').textContent=nx?`다음 등급 '${nx[1]}'까지 ${Math.ceil(nx[0]-sec/60)}분`:'최고 등급 달성!';
 if(running&&Math.floor(sec)%60===0)checkMissions(sec)}
$('go').onclick=()=>running?stopT():startT();

// ===== 설정(연봉·업종) =====
let afterSetup=null;
function openSetup(fn){afterSetup=fn||null;$('sWage').value=S.wage||'';$('sJob').innerHTML=JOBS.map(j=>`<option ${j===S.job?'selected':''}>${j}</option>`).join('');$('setup').classList.add('on')}
$('sGo').onclick=()=>{const w=+$('sWage').value;if(!(w>=1000&&w<=100000)){$('sErr').textContent='연봉을 만원 단위로 넣어주세요 (예: 4200)';return}S.wage=w;S.job=$('sJob').value;save();$('setup').classList.remove('on');render();const f=afterSetup;afterSetup=null;if(f)f()};
$('sX').onclick=()=>$('setup').classList.remove('on');
$('editWage')&&($('editWage').onclick=e=>{e.preventDefault();openSetup()});

// ===== 미션 =====
const MISS=C.missions; // [id, 제목, 조건함수 key, 보상]
function mDone(m,sec){sec=sec??S.secToday;const h=new Date().getHours();
 if(m[2]==='m5')return sec>=300;if(m[2]==='m15')return sec>=900;if(m[2]==='ad1')return S.seen.length>=1;if(m[2]==='ad3')return S.seen.length>=3;if(m[2]==='lunch')return sec>=60&&h>=13&&h<15;return false}
function checkMissions(sec){let n=0;MISS.forEach(m=>{if(!S.missions.includes(m[0])&&mDone(m,sec)){S.missions.push(m[0]);const a=Math.min(m[3],CAP-S.ptToday);if(a>0){S.pt+=a;S.ptToday+=a;S.log.unshift([now(),'미션: '+m[1],a])}n++;toast(`미션 완료! ${m[1]} +${a}P`)}});if(n){save();render()}}

// ===== 광고(보너스) =====
let Q=[],qi=0,t=0,tm=null,quizOn=false,got=0;
const avail=()=>ADS.filter(a=>!S.seen.includes(a.id));
function play(n){if(!guard(()=>play(n)))return;if(S.ptToday>=CAP)return toast('오늘 적립 한도를 채웠어요');Q=avail().slice(0,n);if(!Q.length)return toast('오늘 광고를 다 봤어요');qi=0;got=0;$('player').classList.add('on');$('pClose').textContent='그만 보기';startAd()}
function startAd(){t=0;quizOn=false;const a=Q[qi];$('pBrand').textContent=a.brand+' · 광고';$('pTitle').textContent=a.title;$('pQuiz').innerHTML='';$('pMsg').textContent='';$('pBar').style.width=0;$('pScr').className='scr c'+(a.id%4);$('pCnt').textContent=Q.length>1?`${qi+1}/${Q.length}`:'';clearInterval(tm);tm=setInterval(adTick,1000);adTick(true)}
function adTick(first){if(document.hidden){$('pStat').textContent='탭을 벗어나 일시정지';return}if(!first)t++;$('pBar').style.width=t/SEC*100+'%';$('pStat').textContent=(SEC-t)+'초';
 if(t>=SEC){clearInterval(tm);const a=Q[qi];quizOn=true;const o=[a.brand,...ADS.filter(x=>x.id!==a.id).map(x=>x.brand).sort(()=>Math.random()-.5).slice(0,2)].sort(()=>Math.random()-.5);
  $('pBrand').textContent='확인 문제';$('pTitle').textContent='방금 본 광고의 브랜드는?';$('pScr').className='scr';$('pStat').textContent='';$('pQuiz').innerHTML=o.map(x=>`<button data-b="${x}">${x}</button>`).join('')}}
$('pQuiz').onclick=e=>{const b=e.target.closest('button');if(!b||!quizOn)return;quizOn=false;const a=Q[qi],ok=b.dataset.b===a.brand;S.seen.push(a.id);$('pQuiz').innerHTML='';
 if(ok){const g=Math.min(PER,CAP-S.ptToday);S.pt+=g;S.ptToday+=g;got+=g;S.log.unshift([now(),a.brand+' 광고 보너스',g]);$('pTitle').textContent=`+${g}P`}else{$('pTitle').textContent='아쉽게 오답!';$('pMsg').textContent='이번 광고는 적립되지 않았어요'}
 save();checkMissions();render();qi++;if(qi<Q.length&&S.ptToday<CAP)setTimeout(startAd,1200);else{$('pMsg').textContent=`이번에 ${got}P 받았어요`;$('pClose').textContent='닫기'}};
$('pClose').onclick=()=>{clearInterval(tm);quizOn=false;$('player').classList.remove('on')};
document.querySelectorAll('[data-ad]').forEach(b=>b.onclick=()=>play(+b.dataset.ad));

// ===== 로그인(건너뛰기 가능, 교환할 때만 필수) =====
let skip=!!ld('skip'),after=null,signup=false,must=false;
function guard(fn,need){if(cur||(skip&&!need))return true;after=fn;must=!!need;signup=false;mode();$('aErr').textContent='';$('aPw').value='';$('auth').classList.add('on');return false}
function mode(){$('aT').textContent=signup?'회원가입':'로그인';$('aGo').textContent=signup?'가입':'로그인';$('aSw').textContent=signup?'로그인으로':'회원가입';$('aSkip').style.display=must?'none':'';
 $('aS').innerHTML=must?'<b>교환은 로그인이 필요해요.</b> 지금까지 모은 포인트는 로그인하면 그대로 옮겨져요.':'지금은 <b>건너뛰어도 돼요.</b> 기록과 포인트는 이 브라우저에 보관되고, <b>교환할 때</b> 로그인하면 계정으로 옮겨져요.'}
$('aSw').onclick=()=>{signup=!signup;mode()};
$('aX').onclick=()=>{after=null;$('auth').classList.remove('on')};
$('aSkip').onclick=()=>{skip=true;st('skip',1);$('auth').classList.remove('on');render();const f=after;after=null;if(f)f()};
$('aPw').onkeydown=e=>{if(e.key==='Enter')$('aGo').click()};
async function hash(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(K+s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return'f'+h}}
$('aGo').onclick=async()=>{const id=$('aId').value.trim().toLowerCase(),pw=$('aPw').value;
 if(!/^[a-z0-9]{4,16}$/.test(id))return $('aErr').textContent='아이디는 영문·숫자 4~16자예요.';if(pw.length<6)return $('aErr').textContent='비밀번호는 6자 이상이에요.';
 const h=await hash(pw);
 if(signup){if(DB[id])return $('aErr').textContent='이미 있는 아이디예요.';DB[id]={h,s:fresh()};DB[id].s.pt=100;DB[id].s.log=[[now(),'가입 축하',100]]}
 else{if(!DB[id])return $('aErr').textContent='없는 아이디예요. 회원가입을 눌러주세요.';if(DB[id].h!==h)return $('aErr').textContent='비밀번호가 맞지 않아요.'}
 const g=ld('guest'),A=DB[id].s;if(g){A.pt+=g.pt;A.secAll+=g.secAll;A.log=[...g.log,...A.log].slice(0,80);if(!A.wage){A.wage=g.wage;A.job=g.job}for(const d in g.days)A.days[d]=Math.max(A.days[d]||0,g.days[d]);if(A.day===g.day){A.secToday=Math.max(A.secToday,g.secToday);A.seen=[...new Set([...A.seen,...g.seen])];A.ptToday+=g.ptToday}st('guest',null)}
 cur=id;st('cur',id);st('users',DB);loadU();$('auth').classList.remove('on');toast(signup?'가입 완료! +100P':id+' 님 환영해요');render();const f=after;after=null;if(f)f()};
$('authBtn').onclick=()=>{if(cur){if(running)stopT();cur=null;st('cur',null);loadU();render();toast('로그아웃했어요')}else guard(null)};
function buy(i){if(!guard(()=>buy(i),true))return;const it=ITEMS[i];if(S.pt<it[1])return toast(`${(it[1]-S.pt).toLocaleString()}P 더 모아야 해요`);S.pt-=it[1];S.log.unshift([now(),'교환: '+it[0],-it[1]]);save();render();toast(`'${it[0]}' 교환 완료 (시연용)`)}
window.__buy=buy;

// ===== 업종 대항전 (시연용 가상 수치 + 내 기록) =====
function league(){const seed=new Date().getDate();return JOBS.map((j,i)=>({j,m:Math.round(18+((i*37+seed*13)%29)+(j===S.job?S.secToday/60:0))})).sort((a,b)=>b.m-a.m)}

// ===== 명세서 카드 =====
function weekSec(){let s=0;for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);s+=(i===0?S.secToday:(S.days[dkey(d)]||0))}return s}
function slipText(){const w=weekSec(),g=grade(S.secToday);return `[${C.name}] ${C.slipTitle}\n오늘 ${C.sessionWord}: ${mmss(S.secToday)} (${won(S.secToday*perSec())} 상당)\n이번 주: ${mmss(w)} (${won(w*perSec())} 상당)\n등급: ${g[1]}\n${C.slipFooter}`}
$('copySlip').onclick=async()=>{try{await navigator.clipboard.writeText(slipText()+'\n'+location.href);toast('복사했어요! 단톡방에 붙여넣어 보세요')}catch(e){toast('복사가 막혀 있어요. 화면을 캡처해 주세요')}};

// ===== 렌더 =====
function render(){
 $('who').textContent=cur?cur+' 님':'게스트';$('authBtn').textContent=cur?'로그아웃':'로그인';
 $('ptTop').textContent=S.pt.toLocaleString()+'P';
 $('wageInfo').innerHTML=S.wage?`연봉 ${S.wage.toLocaleString()}만원 · ${S.job} · 1분에 <b>${won(perSec()*60)}</b> <a href="#" id="editWage2">수정</a>`:'연봉을 넣으면 쉬는 시간이 돈으로 보여요';
 const e2=$('editWage2');if(e2)e2.onclick=e=>{e.preventDefault();openSetup()};
 if(!running)updT();
 // 주간 막대
 const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push([d,i===0?S.secToday:(S.days[dkey(d)]||0)])}
 const mx=Math.max(60,...days.map(x=>x[1]));
 $('week').innerHTML=days.map(([d,s])=>`<div class="wk"><div class="wb"><i style="height:${s/mx*100}%"></i></div><span>${'일월화수목금토'[d.getDay()]}</span></div>`).join('');
 $('weekSum').textContent=`이번 주 ${mmss(weekSec())} · ${won(weekSec()*perSec())} 상당`;
 // 미션
 $('miss').innerHTML=MISS.map(m=>{const d=S.missions.includes(m[0]);return `<li class="${d?'done':''}"><span>${d?'✔':'○'} ${m[1]}</span><b>+${m[3]}P</b></li>`}).join('');
 // 리그
 const L=league();$('league').innerHTML=L.map((x,i)=>`<li class="${x.j===S.job?'me':''}"><span>${i+1}. ${x.j}${x.j===S.job?' (우리)':''}</span><b>평균 ${x.m}분</b></li>`).join('');
 // 광고 버튼
 const av=avail().length;document.querySelectorAll('[data-ad]').forEach(b=>b.disabled=!av||S.ptToday>=CAP);$('adLeft').textContent=`오늘 남은 보너스 광고 ${av}편 · 적립 ${S.ptToday}/${CAP}P`;
 // 교환
 $('shop').innerHTML=ITEMS.map((it,i)=>{const r=Math.min(1,S.pt/it[1]);return `<div class="item"><div><b>${it[0]}</b><span>${it[1].toLocaleString()}P</span></div><div class="mb"><i style="width:${r*100}%"></i></div><button class="btn sm ${r<1?'ghost':''}" onclick="__buy(${i})">${r<1?(it[1]-S.pt).toLocaleString()+'P 남음':'교환'}</button></div>`}).join('');
 // 명세서
 const g=grade(S.secToday);$('slip').innerHTML=`<div class="sl-h">${C.slipTitle}<span>${new Date().toLocaleDateString('ko-KR')}</span></div>
  <div class="sl-r"><span>성명</span><b>${cur||'익명의 직장인'}</b></div><div class="sl-r"><span>소속</span><b>${S.job||'-'}</b></div>
  <div class="sl-r"><span>오늘 ${C.sessionWord}</span><b>${mmss(S.secToday)}</b></div><div class="sl-r"><span>오늘 지급액(상당)</span><b class="acc">${won(S.secToday*perSec())}</b></div>
  <div class="sl-r"><span>이번 주 누계</span><b>${won(weekSec()*perSec())}</b></div><div class="sl-r"><span>등급</span><b>${g[1]}</b></div><div class="sl-f">${C.slipFooter}</div>`;
 // 기록
 $('log').innerHTML=S.log.length?S.log.slice(0,8).map(l=>`<li><span>${l[0]} · ${l[1]}</span><b>${l[2]?(l[2]>0?'+':'')+l[2]+'P':''}</b></li>`).join(''):'<li class="mute">아직 기록이 없어요</li>';
}
render();
})();
