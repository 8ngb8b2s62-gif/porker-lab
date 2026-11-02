import {PokerEngine,STREET_NAMES,formatHand,HAND_NAMES,eval7,icmEquities,icmBubbleFactor,randomInt} from './engine.js?v=41';
import {ROW_RANKS,SPOT_LABELS,handAt,holeToLabel,keyForRange,roughRangeClass,explainHand,exampleSchema,validateImportedSpot} from './ranges.js?v=41';

const $=id=>document.getElementById(id),num=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=x=>Number(x).toLocaleString('ja-JP',{maximumFractionDigits:1});
const pct=x=>(x*100).toFixed(1)+'%';
const STORE='poker-lab-v04-local';
let store={history:[],solvers:{},quiz:{right:0,total:0}};
try{let saved=JSON.parse(localStorage.getItem(STORE)||'null');if(saved&&typeof saved==='object'){store={history:Array.isArray(saved.history)?saved.history:[],solvers:saved.solvers&&typeof saved.solvers==='object'?saved.solvers:{},quiz:saved.quiz&&typeof saved.quiz==='object'?saved.quiz:{right:0,total:0}}}}catch(e){console.warn('Storage not accessible',e)}
function save(){try{localStorage.setItem(STORE,JSON.stringify(store))}catch(e){toast('端末への保存ができませんでした。空き容量や設定を確認してください。')}}
let game=null,sessionStart=Date.now(),sessionHand=0,baseBB=100,lastLevel=0,sessionMode='MTT',lastRecorded='',scenarioIndex=0,selectedHand='AA',overlayOpen=false,raiseSet=false,quiz=null,sessionFieldStart=9,sessionFieldLeft=9,sessionPaid=1;
const focusHands=['A9s','KJo','77','QTs','JJ','A5s','KQs','T9s','AQo','88','AJo','66','KTs','ATs','JTs','99','KQo','55'];
const SCENARIOS=[
 {name:'UTG · 11BB · A9s',mode:'MTT',hero:'UTG',stack:11,hole:['As','9s'],board:['9d','7h','2c','Qd','3s']},
 {name:'BTN · 40BB · AJs',mode:'MTT',hero:'BTN',stack:40,hole:['As','Js'],board:['Jh','8s','4s','2d','3s']},
 {name:'BB defend · 25BB · KQo',mode:'MTT',hero:'BB',stack:25,hole:['Kh','Qc'],board:['Kd','9c','4h','2s','Jd']},
 {name:'CO · 15BB · 77',mode:'MTT',hero:'CO',stack:15,hole:['7h','7s'],board:['Ad','9h','7c','4d','2c']},
 {name:'HJ · 30BB · AQo',mode:'MTT',hero:'HJ',stack:30,hole:['Ah','Qd'],board:['Qh','8c','5s','Ts','2c']},
 {name:'BTN vs BB · 100BB · AKs',mode:'CASH',hero:'BTN',stack:100,hole:['Ad','Kd'],board:['Ks','7c','3h','8s','2d']},
 {name:'CO · 100BB · T9s',mode:'CASH',hero:'CO',stack:100,hole:['Th','9h'],board:['Jh','8h','2c','Qd','4s']},
 {name:'SB · 100BB · 88',mode:'CASH',hero:'SB',stack:100,hole:['8d','8c'],board:['As','8h','5c','Jd','2s']},
 {name:'UTG · 60BB · KQs',mode:'CASH',hero:'UTG',stack:60,hole:['Ks','Qs'],board:['Qc','Ts','2s','7h','9d']},
 {name:'BB · 100BB · A5s',mode:'CASH',hero:'BB',stack:100,hole:['Ac','5c'],board:['Kc','8c','2h','4d','3c']}
];
function toast(message){let el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3200)}
function setScreen(name){for(const el of document.querySelectorAll('.screen'))el.hidden=el.id!=='screen-'+name;for(const b of document.querySelectorAll('#navbar button'))b.classList.toggle('active',b.dataset.screen===name);if(name==='ranges')renderRanges();if(name==='stats')renderStats();if(name==='data')renderData();window.scrollTo({top:0,behavior:'instant'});}
for(const b of document.querySelectorAll('#navbar button'))b.onclick=()=>setScreen(b.dataset.screen);
function choice(id){return $(id).value}
function scenarioForSettings(){let s=SCENARIOS.find(s=>String(scenarioIndex)===choice('scenarioSelect'))||SCENARIOS[scenarioIndex]||SCENARIOS[0];if(s.mode!==choice('playMode'))s=SCENARIOS.find(s=>s.mode===choice('playMode'));return s;}
function fillScenarios(){const mode=choice('playMode');let list=SCENARIOS.map((s,i)=>({...s,i})).filter(s=>s.mode===mode);if(!list.length)return;$('scenarioSelect').innerHTML=list.map(s=>`<option value="${s.i}">${esc(s.name)}</option>`).join('');scenarioIndex=list[0].i;}
function forcedFromHand(label,blocked=[]){let a=label[0],b=label[1],pair=label.length===2,suited=label.endsWith('s');let suits='shdc';for(let t=0;t<100;t++){let suit1=suits[randomInt(4)],suit2=pair?suits.filter(x=>x!==suit1)[randomInt(3)]:(suited?suit1:suits.filter(x=>x!==suit1)[randomInt(3)]);let h=[a+suit1,b+suit2];if(h.every(c=>!blocked.includes(c)))return h;}return null;}
function getHeroPreset(scenario=null){if(scenario)return scenario.hole;if(choice('dealMode')==='focus')return forcedFromHand(focusHands[randomInt(focusHands.length)]);return null;}
function getBlindLevel(){if(sessionMode!=='MTT')return 0;let interval=Math.max(1,num(choice('blindInterval'),10));return Math.min(30,choice('blindType')==='time'?Math.floor((Date.now()-sessionStart)/(interval*60_000)):Math.floor(sessionHand/interval));}
function bbForLevel(level){const schedule=[100,150,200,300,400,600,800,1200,1600,2400,3200,4800,6400,9600,12800,19200];if(level<schedule.length)return schedule[level];return Math.round(schedule.at(-1)*Math.pow(1.5,level-schedule.length+1)/100)*100;}
function startSession(){
 try{
  sessionStart=Date.now();sessionHand=0;lastRecorded='';overlayOpen=false;$('learningOverlay').hidden=true;
  sessionMode=choice('playMode');sessionFieldStart=sessionMode==='MTT'?Math.max(num(choice('fieldSize'),54),num(choice('tableSize'),9)):num(choice('tableSize'),9);sessionFieldLeft=sessionFieldStart;sessionPaid=Math.max(1,Math.floor(sessionFieldStart*.15));const scenario=choice('playType')==='scenario'?scenarioForSettings():null;
  const n=clamp(num(choice('tableSize'),9),2,9),stack=scenario?scenario.stack:num(choice('stackBB'),40),hero=scenario?scenario.hero:choice('heroPosition');
  baseBB=100;lastLevel=0;game=new PokerEngine({players:n,mode:sessionMode,stackBB:stack,bb:100,ante:sessionMode==='CASH'?'none':choice('anteMode'),heroPosition:hero,aiMode:choice('aiMode'),adaptive:true,forcedHero:getHeroPreset(scenario),forcedBoard:scenario?.board});
  game.autoUntilHero();renderPlay();
  toast('新しいセッションを開始しました');
 }catch(e){console.error(e);toast('開始エラー: '+e.message)}
}
function nextHand(){
 try{
  if(!game)return startSession();
  if(choice('playType')==='scenario'){
   const available=SCENARIOS.map((s,i)=>({...s,i})).filter(s=>s.mode===sessionMode);
   let spot=available[(available.findIndex(s=>s.i===scenarioIndex)+1)%available.length];
   scenarioIndex=spot.i;$('scenarioSelect').value=String(spot.i);
   startSession();return;
  }
  if(game.players[0].stack<=0){toast('チップがなくなりました。新しいセッションを開始してください');return}
  sessionHand++;if(sessionMode==='MTT'&&sessionFieldLeft>game.alive().length){let other=sessionFieldLeft-game.alive().length;let knocked=Math.max(0,Math.round(other*(.025+Math.random()*.055)));sessionFieldLeft=Math.max(game.alive().length,sessionFieldLeft-knocked);}lastLevel=getBlindLevel();const newBB=bbForLevel(lastLevel);game.bb=newBB;game.sb=Math.floor(newBB/2);game.heroMemory=game.getHeroMemory();
  if(choice('dealMode')==='focus')game.button=game.nextLiving(game.button);
  if(choice('dealMode')==='focus')game.startHand({forcedHero:getHeroPreset()});else game.nextHand();
  game.autoUntilHero();raiseSet=false;renderPlay();
 }catch(e){console.error(e);toast('次ハンドエラー: '+e.message)}
}
function cardHtml(c){if(!c)return '<div class="playing-card back">♠</div>';const suit={s:'♠',h:'♥',d:'♦',c:'♣'}[c[1]];return `<div class="playing-card ${c[1]==='h'||c[1]==='d'?'red':''}"><span>${esc(c[0])}</span><span class="suit">${suit}</span></div>`;}
function lastAction(idx){let line=[...game.log].reverse().find(x=>x.player===idx);return line?line.text.split('·').slice(-1).join('·').trim():'';}
function renderSeats(){const n=game.players.length,heroIndex=0;const html=game.players.map((p,i)=>{let theta=Math.PI/2+2*Math.PI*i/n,x=50+47*Math.cos(theta),y=49+50*Math.sin(theta);let status=p.folded?'folded':p.stack===0&&!p.allIn?'out':'';if(p.allIn)status+=' allined';let active=game.turn===i&&!game.complete;return `<div class="seat ${i===heroIndex?'hero':''} ${active?'turn':''} ${status}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" title="${esc(game.posOf(i))}"><div class="seat-name">${i===0?'YOU':esc(p.name)} ${game.button===i?'●':''}</div><div class="seat-position">${esc(game.posOf(i))}</div><div class="seat-stack">${pretty(p.stack/game.bb)} BB</div><div class="seat-action">${p.allIn?'ALL-IN':p.folded?'FOLD':esc(lastAction(i)).slice(0,12)}</div>${p.bet?`<div class="seat-bet">${pretty(p.bet/game.bb)} BB</div>`:''}</div>`}).join('');$('seats').innerHTML=html;}
function renderPlay(){if(!game)return;const hero=game.players[0],street=game.street;renderSeats();
 $('handHead').innerHTML=`<strong>HAND #${game.handNo}</strong><small>${esc(game.mode)} · ${game.liveOrder().length}max · ${esc(choice('playType')==='scenario'?'固定スポット':'状況対応')} · ${pretty(game.bb)}チップ/BB</small>`;
 $('streetPills').innerHTML=STREET_NAMES.map((s,i)=>`<span class="${street===i?'on':''}">${s}</span>`).join('');
 $('tableStatus').innerHTML=game.mode==='MTT'?`LEVEL ${getBlindLevel()+1}<br>残り約${sessionFieldLeft}/${sessionFieldStart}人<br>入賞${sessionPaid}人（他卓推定）`:'CASH · 連続ハンド練習';
 $('potDisplay').textContent=pretty(game.pot()/game.bb)+' BB';
 $('boardCards').innerHTML=Array.from({length:5},(_,i)=>game.board[i]?cardHtml(game.board[i]):'<div class="playing-card back placeholder">♠</div>').join('');
 $('heroMeta').textContent='YOU · '+game.posOf(0)+' · '+holeToLabel(hero.hole);
 $('heroCards').innerHTML=hero.hole.map(cardHtml).join('');
 $('heroStack').textContent=pretty(hero.stack/game.bb)+' BB';
 $('heroStatus').textContent=hero.folded?'フォールド済み':hero.allIn?'オールイン':game.complete?'ハンド終了':game.turn===0?'あなたの番':'相手がプレー中';
 $('actionHistory').innerHTML=game.log.slice(-32).reverse().map(line=>`<div class="${line.player===0?'hero-line':''}"><small class="muted">${STREET_NAMES[line.street]||''}</small> ${esc(line.text)}</div>`).join('');
 $('historyCount').textContent=game.log.length+' 件';$('reviewPanel').hidden=!game.complete;$('actionPanel').hidden=game.complete;
 if(game.complete){recordHand();renderReview();return}
 if(game.turn!==0){$('actionPrompt').textContent='相手のアクションを処理中';$('basicActions').innerHTML='';$('raiseControls').hidden=true;return;}
 renderActions();
}
function renderActions(){const legal=game.legal(0),hero=game.players[0];if(!legal)return;
 $('actionPrompt').textContent=legal.toCall?`コール ${pretty(legal.toCall/game.bb)} BB またはレイズ`:'チェック またはベット';
 $('potOddsLabel').textContent=legal.toCall?'必要勝率 '+pct(legal.toCall/(game.pot()+legal.toCall)):'POT '+pretty(game.pot()/game.bb)+' BB';
 const options=[];if(legal.canFold)options.push({label:'FOLD',class:'fold-button',action:'fold'});if(legal.canCheck)options.push({label:'CHECK',class:'call-button',action:'check'});if(legal.canCall)options.push({label:legal.callAmount===hero.stack?'CALL ALL-IN':'CALL '+pretty(legal.callAmount/game.bb)+' BB',class:'call-button',action:'call'});
 $('basicActions').innerHTML=options.map((x,i)=>`<button class="btn ${x.class}" data-action="${x.action}">${x.label}</button>`).join('');
 $('basicActions').querySelectorAll('button').forEach(b=>b.onclick=()=>takeHeroAction(b.dataset.action));
 $('raiseControls').hidden=!legal.canRaise;
 if(legal.canRaise){let min=legal.minRaiseTo,max=legal.maxRaiseTo,step=Math.max(1,Math.floor(game.bb/10));
  $('raiseSlider').min=min;$('raiseSlider').max=max;$('raiseSlider').step=1;$('raiseAmount').min=(min/game.bb).toFixed(2);$('raiseAmount').max=(max/game.bb).toFixed(2);$('raiseAmount').step='0.1';
  if(!raiseSet||num($('raiseAmount').value)*game.bb<min||num($('raiseAmount').value)*game.bb>max){let initial=Math.min(max,Math.max(min,Math.round((game.currentBet+(game.street===0?game.bb*1.2:game.pot()*.5))/step)*step));$('raiseAmount').value=(initial/game.bb).toFixed(1);raiseSet=true;}
  const preset=game.street===0?[{p:'MIN',a:min},{p:'2.2BB',a:Math.round(2.2*game.bb)},{p:'2.5BB',a:Math.round(2.5*game.bb)},{p:'3BB',a:Math.round(3*game.bb)},{p:'4BB',a:Math.round(4*game.bb)},{p:'MAX',a:max}]:[25,33,50,75,100,150].map(p=>({p:p+'%',a:Math.round((game.currentBet+legal.toCall)+(game.pot()+legal.toCall)*p/100)}));
  $('sizePresets').innerHTML=preset.map((s,i)=>`<button data-amount="${clamp(s.a,min,max)}">${s.p}</button>`).join('');
  $('sizePresets').querySelectorAll('button').forEach(b=>b.onclick=()=>setRaise(num(b.dataset.amount)));
  $('raiseSlider').value=clamp(Math.round(num($('raiseAmount').value)*game.bb),min,max);updateRaiseText();
  $('legalHint').textContent=`最小：${pretty(min/game.bb)} BB / 最大：${pretty(max/game.bb)} BB（合計額） · 残り ${pretty(hero.stack/game.bb)} BB`;
 }
 $('actionHint').textContent=choice('feedbackMode')==='instant'?'学習モード：判断後に理論解説を表示（GTO頻度ではありません）':'実戦モード：正解・レビューはハンド終了後に表示';
}
function setRaise(v){const L=game.legal(0);if(!L)return;let val=clamp(Math.round(v),L.minRaiseTo,L.maxRaiseTo);$('raiseAmount').value=(val/game.bb).toFixed(1);$('raiseSlider').value=val;updateRaiseText();}
function updateRaiseText(){if(!game)return;$('raiseValue').textContent=pretty(num($('raiseAmount').value))+' BB';}
$('raiseSlider').oninput=e=>{raiseSet=true;setRaise(num(e.target.value))};$('raiseAmount').oninput=()=>{raiseSet=true;updateRaiseText()};
$('raiseSubmit').onclick=()=>{const L=game.legal(0),v=Math.round(num($('raiseAmount').value,-1)*game.bb);if(!L)return;if(v<L.minRaiseTo||v>L.maxRaiseTo){toast(`レイズ額は ${pretty(L.minRaiseTo/game.bb)}〜${pretty(L.maxRaiseTo/game.bb)} BB`);return;}takeHeroAction('raise',v)};
$('allInButton').onclick=()=>takeHeroAction('allin');
function takeHeroAction(type,amount){
 try{
  if(!game||game.complete||game.turn!==0||overlayOpen)return;
  game.act(0,type,amount);const decision=game.decisions.at(-1);raiseSet=false;
  if(choice('feedbackMode')==='instant'&&decision){overlayOpen=true;showLearning(decision);renderPlay();return;}
  game.autoUntilHero();renderPlay();
 }catch(e){console.error(e);toast(e.message)}
}
function theoryForDecision(d){
 const hand=holeToLabel(d.hole);const p=Number((d.potBefore/d.bb).toFixed(1));const odds=d.toCall?pct(d.toCall/(d.potBefore+d.toCall)):'—';
 const lines=[];
 if(d.street===0){lines.push('ポジション '+d.position+'、ハンド '+hand+'、有効スタック約'+pretty(d.stackBefore/d.bb)+'BB。相手のオープン位置・サイズとアンティでレンジは大きく変わる。');if(d.stackBefore/d.bb<=20)lines.push('ショートスタックではレイズ・コール・オールインの適正な構成を考える。');}
 else {let suits=d.board.map(c=>c[1]);lines.push('ボード '+formatHand(d.board)+'。相手のレンジ、ナッツ優位性、バックドア、ブロッカーを確認する。');if(suits.some(s=>suits.filter(x=>x===s).length>=3))lines.push('同じスートが3枚以上あるため、完成フラッシュとフラッシュドローを区別する。');lines.push('ベットサイズを選ぶときは、残りのストリートとSPRを意識する。');}
 if(d.toCall)lines.push('この局面の単純な必要勝率は約'+odds+'。ただしポストフロップは将来のベットや実現エクイティを別に検討する。');
 if(d.action==='fold')lines.push('フォールドはポットを放棄する判断。相手のバリュー・ブラフ比率とコールの期待値を比較したい。');
 if(['raise','allin'].includes(d.action))lines.push('ベット・レイズはバリュー／ブラフ／プロテクションの目的を整理する。適切な頻度は未計算。');
 return {hand,pot:p,odds,lines};
}
function showLearning(d){
 const t=theoryForDecision(d), amount=d.action==='raise'||d.action==='allin'?` · ${pretty((d.amount||0)/d.bb)}BB`:'';
 const choices=[['FOLD','fold'],[d.toCall?'CALL':'CHECK',d.toCall?'call':'check'],[d.toCall?'RAISE':'BET','raise'],['ALL-IN','allin']];
 $('learningContent').innerHTML=`<div class="review-context">${STREET_NAMES[d.street]} · ${esc(t.hand)} · ${esc(d.position)} · POT ${pretty(t.pot)}BB</div><div class="review-choice">あなたの選択 <strong>${esc(d.action.toUpperCase())}${amount}</strong></div><div class="review-actions">${choices.map(([label,key])=>`<div class="review-action ${d.action===key?'chosen':''}"><b>${label}</b><span>頻度 —</span><span>EV —</span></div>`).join('')}</div><div class="source-status">THEORY BASED / ソルバー未検証 · 頻度・EVは未算出</div><details class="review-details"><summary>理由を詳しく見る</summary><ul>${t.lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ul></details>`;
 $('resumeHand').textContent=game.complete?'ハンド結果を見る →':'プレーを続ける →';
 $('learningOverlay').hidden=false;
}
$('resumeHand').onclick=()=>{overlayOpen=false;$('learningOverlay').hidden=true;try{if(!game.complete)game.autoUntilHero();renderPlay()}catch(e){toast(e.message)}};
function recordHand(){if(!game||!game.complete)return;let id=sessionStart+'-'+game.handNo;if(lastRecorded===id)return;lastRecorded=id;let h=game.players[0],net=h.stack-game.heroDealtStack;let row={id,date:new Date().toISOString(),mode:game.mode,hand:holeToLabel(h.hole),cards:h.hole.slice(),board:game.board.slice(),net,bb:game.bb,handNo:game.handNo,decisions:game.decisions.slice(),result:game.result?.type||'unknown',ai:game.aiMode};store.history.unshift(row);store.history=store.history.slice(0,300);save();}
function renderReview(){const result=game.result,hero=game.players[0],net=hero.stack-game.heroDealtStack;let resultLine=net>=0?`+${pretty(net/game.bb)} BB`:`${pretty(net/game.bb)} BB`;
 let showdownText='';if(result?.type==='showdown'){const shown=game.inHand().map(p=>`<div>${esc(p.name)} ${esc(formatHand(p.hole))} · ${esc(HAND_NAMES[result.ranks[p.id]?.[0]]||'—')}</div>`).join('');showdownText=`<div class="result-cards">${shown}</div>`;}
 $('resultSummary').innerHTML=`<div class="result-hero"><span class="muted tiny">${esc(result?.type==='showdown'?'SHOWDOWN':result?.type==='fold'?'FOLD END':'HAND END')}</span><br><b>${esc(resultLine)} · ${esc(result?.description||'')}</b>${showdownText}</div><div class="source-status">プレーした選択を全件記録。GTO採点・EV損失は、条件一致の検証済みソルバーデータがないため算出していません。</div>`;
 $('decisionReview').innerHTML=game.decisions.length?game.decisions.map((d,i)=>{const t=theoryForDecision(d);return `<div class="review-item"><h3>${i+1}. ${STREET_NAMES[d.street]} · ${esc(t.hand)} · ${esc(d.action.toUpperCase())}</h3><p>ポット ${pretty(t.pot)}BB / 必要勝率 ${t.odds} / 自分の位置 ${esc(d.position)}</p>${t.lines.map(l=>`<p>・${esc(l)}</p>`).join('')}<span class="review-status">THEORY BASED / 未採点</span></div>`}).join(''):'<p class="muted">あなたの判断順が来る前にハンドが終了しました。</p>';
}
$('newSession').onclick=()=>{if(game&&!game.complete&&!confirm('現在のハンドを破棄して新しいセッションを始めますか？'))return;startSession();};$('applySettings').onclick=()=>{if(game&&!game.complete&&!confirm('現在のハンドを破棄して設定を反映しますか？'))return;startSession();};$('nextHand').onclick=nextHand;
$('playMode').onchange=()=>{fillScenarios();if(choice('playMode')==='CASH')$('anteMode').value='none'};
$('scenarioSelect').onchange=()=>{scenarioIndex=num(choice('scenarioSelect'))};
$('playType').onchange=()=>{if(choice('playType')==='scenario')$('advancedSettings').open=true;toast('新しいセッション開始で設定を反映します')};

// RANGE LIBRARY
const positions=['UTG','UTG+1','MP','LJ','HJ','CO','BTN','SB','BB'];
let selectedRangeContext=null,selectedRangeImport=null;
function rangeContext(){return {format:choice('rangeFormat'),table:choice('rangeTable'),stack:choice('rangeStack'),hero:choice('rangeHero'),spot:choice('rangeSpot'),opener:choice('rangeOpener'),openSize:choice('rangeOpenSize'),ante:choice('rangeAnte')}}
function initRangeControls(){for(const id of ['rangeHero','rangeOpener'])$(id).innerHTML=positions.map(s=>`<option value="${s}">${s}</option>`).join('');$('rangeHero').value='BTN';$('rangeOpener').value='CO';for(const id of ['rangeFormat','rangeTable','rangeStack','rangeHero','rangeSpot','rangeOpener','rangeOpenSize','rangeAnte'])$(id).addEventListener('change',renderRanges)}
function importedRange(ctx){return store.solvers[keyForRange(ctx)]||null;}
function renderRanges(){const ctx=rangeContext();selectedRangeContext=ctx;selectedRangeImport=importedRange(ctx);const source=$('rangeSource');source.textContent=selectedRangeImport?`ユーザー提供データ · ${selectedRangeImport.source} · ${Object.keys(selectedRangeImport.actions).length}/169ハンド（自動検証なし）`:`参考モデル · ${SPOT_LABELS[ctx.spot]} · ソルバー未検証 / 正確な頻度は表示しません`;
 let counts={raise:0,call:0,mix:0,fold:0},markup='';for(let i=0;i<13;i++)for(let j=0;j<13;j++){let h=handAt(i,j),imp=selectedRangeImport?.actions?.[h],category=roughRangeClass(h,ctx);counts[category]++;let style='',cl='range-cell '+(imp?'imported':category);if(imp){style=` style="--raise:${imp.raise}%;--call:${imp.call}%"`;}markup+=`<button class="${cl} ${selectedHand===h?'selected':''}" data-hand="${h}" aria-label="${h}"${style}><span class="range-text">${h}</span></button>`;}
 $('rangeMatrix').innerHTML=markup;$('rangeMatrix').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedHand=b.dataset.hand;renderRanges()});
 $('rangeSummary').textContent=selectedRangeImport?`この条件で${Object.keys(selectedRangeImport.actions).length}種類のハンドを取り込み済み。未登録マスは参考モデルです。`:`教材上の分類：レイズ系${counts.raise} / コール系${counts.call} / 境界${counts.mix} / フォールド寄り${counts.fold}（GTO頻度とは無関係）`;
 renderRangeDetail(selectedHand,ctx);
}
function renderRangeDetail(hand,ctx){let imp=selectedRangeImport?.actions?.[hand],category=roughRangeClass(hand,ctx),e=explainHand(hand,ctx,category);$('handDetail').innerHTML=`<div class="hand-detail-head"><strong>${esc(hand)}</strong><span class="muted small">${esc(ctx.hero)} · ${esc(ctx.stack)}BB · ${esc(SPOT_LABELS[ctx.spot])}</span></div>${imp?`<div class="range-freq"><div class="freq-tile">RAISE<strong>${imp.raise}%</strong></div><div class="freq-tile">CALL<strong>${imp.call}%</strong></div><div class="freq-tile">FOLD<strong>${imp.fold}%</strong></div></div><p class="muted small">ユーザー取り込み値。出典：${esc(selectedRangeImport.source)} / 利用権限：${esc(selectedRangeImport.license)} / 計算日：${esc(selectedRangeImport.computedAt)}。本アプリは計算精度を検証しません。</p>`:`<div class="source-status">${esc(e.title)} · 教材上の参考分類 / 頻度・EVなし</div>`}<p class="muted small">${e.notes.map(esc).join('<br>')}</p><p class="warning-text tiny">${esc(e.warning)}</p>`;}

// POT ODDS QUIZ
function makeQuiz(){let call=[5,10,15,20,25,30,40,50][randomInt(8)],pot=call*([1.5,2,2.5,3,4,5,6][randomInt(7)]);let correct=100*call/(pot+call);let choices=[correct,correct+5,correct-5,correct+10].map(v=>clamp(Math.round(v*10)/10,2,95));choices=[...new Set(choices)];while(choices.length<4)choices.push(choices.at(-1)+4);choices.sort(()=>Math.random()-.5);quiz={call,pot,correct,answered:false,choices};$('quizPot').textContent=pretty(pot)+' BB';$('quizCall').textContent=pretty(call)+' BB';$('quizFeedback').hidden=true;$('quizAnswers').innerHTML=choices.map((x,i)=>`<button data-answer="${x}">${x.toFixed(1)}%</button>`).join('');$('quizAnswers').querySelectorAll('button').forEach(b=>b.onclick=()=>answerQuiz(num(b.dataset.answer)));renderQuizScore();}
function answerQuiz(answer){if(!quiz||quiz.answered)return;quiz.answered=true;let right=Math.abs(answer-quiz.correct)<0.11;store.quiz.total=(store.quiz.total||0)+1;if(right)store.quiz.right=(store.quiz.right||0)+1;save();for(const b of $('quizAnswers').querySelectorAll('button')){let v=num(b.dataset.answer);b.disabled=true;if(Math.abs(v-quiz.correct)<.11)b.classList.add('correct');if(!right&&v===answer)b.classList.add('wrong')};$('quizFeedback').innerHTML=`<strong>${right?'正解！':'惜しい！'} 正解 ${quiz.correct.toFixed(1)}%</strong><br>必要勝率 = コール額 ÷（相手ベット後のポット + コール額） = ${quiz.call} ÷（${quiz.pot} + ${quiz.call}）。`;$('quizFeedback').hidden=false;renderQuizScore();}
function renderQuizScore(){$('quizScore').textContent=`正解 ${store.quiz.right||0} / ${store.quiz.total||0}`;}
$('nextQuiz').onclick=makeQuiz;

// ICM
function setupICM(){const n=num(choice('icmPlayers'),6);let stacks=[50,35,24,18,12,10,9,8,7].slice(0,n),prizes=[500,300,180,110,70,40,20,10,5].slice(0,n);$('icmStacks').innerHTML=stacks.map((v,i)=>`<div class="icm-row"><label>${i===0?'YOU':i+1+'位'}</label><input data-stack="${i}" type="number" min="0" step="1" inputmode="numeric" value="${v}"></div>`).join('');$('icmPayouts').innerHTML=prizes.map((v,i)=>`<div class="icm-row"><label>${i+1}位</label><input data-prize="${i}" type="number" min="0" step="1" inputmode="numeric" value="${v}"></div>`).join('');$('bfHero').innerHTML=stacks.map((_,i)=>`<option value="${i}">${i===0?'YOU':i+1+'番'}</option>`).join('');$('bfVillain').innerHTML=$('bfHero').innerHTML;$('bfHero').value='0';$('bfVillain').value='1';$('icmResult').innerHTML='';$('bfResult').textContent='';}
function readICM(){let stacks=[...document.querySelectorAll('[data-stack]')].map(i=>num(i.value,NaN)),prizes=[...document.querySelectorAll('[data-prize]')].map(i=>num(i.value,NaN));if(stacks.length<2||stacks.some(v=>v<=0||!Number.isFinite(v))||stacks.reduce((a,b)=>a+b,0)<=0)throw Error('参加中の全員に正のスタックを入力してください');if(prizes.length!==stacks.length||prizes.some(v=>v<0||!Number.isFinite(v))||prizes.some((v,i)=>i&&v>prizes[i-1]))throw Error('賞金は1位から降順に入力してください');return {stacks,prizes};}
$('icmPlayers').onchange=setupICM;$('icmExample').onclick=setupICM;
$('calcICM').onclick=()=>{try{let {stacks,prizes}=readICM(),res=icmEquities(stacks,prizes);$('icmResult').innerHTML='<table class="icm-result-table"><thead><tr><th>プレイヤー</th><th>スタック</th><th>ICM賞金EV</th></tr></thead><tbody>'+res.map((v,i)=>`<tr><td>${i===0?'YOU':'P'+(i+1)}</td><td>${pretty(stacks[i])}</td><td>${pretty(v)}</td></tr>`).join('')+`</tbody></table><p class="muted small">賞金総額 ${pretty(prizes.reduce((a,b)=>a+b,0))} / 賞金EV合計 ${pretty(res.reduce((a,b)=>a+b,0))}。ICMは順位確率モデルであり、GTO戦略の計算ではありません。</p>`;}catch(e){toast(e.message)}};
$('calcBF').onclick=()=>{try{const {stacks,prizes}=readICM();let hero=num(choice('bfHero')),villain=num(choice('bfVillain')),transfer=num($('bfTransfer').value);if(hero===villain)throw Error('自分と相手は別々に選んでください');if(transfer<=0)throw Error('チップ数は1以上にしてください');let res=icmBubbleFactor(stacks,prizes,hero,villain,transfer);$('bfResult').innerHTML=`<strong>参考バブルファクター：${res.factor==null?'算出不可':res.factor.toFixed(2)}</strong><br>勝利時の賞金EV増加：${pretty(res.upside)} / 敗北時の減少：${pretty(res.downside)}<br>必要勝率に相当する比率：${res.breakeven==null?'—':pct(res.breakeven)}<br><span class="warning-text">実際のオールイン・ポットオッズ計算ではありません。相手のレンジ・フォールドエクイティ等は未計算。</span>`;}catch(e){toast(e.message)}};

// STATS
function renderStats(){let history=store.history,decisions=history.flatMap(h=>h.decisions||[]),net=history.reduce((a,h)=>a+h.net/(h.bb||100),0),showdowns=history.filter(h=>h.result==='showdown').length;
 const data=[['記録したハンド',history.length],['自分の判断',decisions.length],['チップ損益（概算BB）',(net>=0?'+':'')+net.toFixed(1)],['ショーダウン',showdowns],['ポットオッズ正解',(store.quiz.right||0)+' / '+(store.quiz.total||0)],['ソルバーデータ',Object.keys(store.solvers).length+'スポット']];$('metrics').innerHTML=data.map(([label,val])=>`<div class="metric"><span>${esc(label)}</span><strong>${esc(val)}</strong></div>`).join('');
 const groups=STREET_NAMES.map((s,i)=>({street:s,count:decisions.filter(d=>d.street===i).length})),max=Math.max(1,...groups.map(g=>g.count));$('streetStats').innerHTML=groups.map(g=>`<div class="stat-row"><div class="row between"><b>${g.street}</b><span>${g.count} 回</span></div><div class="stat-track"><div style="width:${g.count/max*100}%"></div></div></div>`).join('');
 $('recentHands').innerHTML=history.length?history.slice(0,25).map(h=>`<div class="recent-hand"><div><b>${esc(h.hand)} · ${esc(h.mode)}</b><small>${new Date(h.date).toLocaleString('ja-JP')} · ${h.decisions?.length||0}判断</small></div><b class="${h.net>=0?'win':'loss'}">${h.net>=0?'+':''}${pretty(h.net/(h.bb||100))} BB</b></div>`).join(''):'<p class="muted small">まだプレー記録がありません。</p>';
}

// DATA MANAGEMENT
function downloadJson(name,data){let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);let a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
$('exportAll').onclick=()=>downloadJson('poker-lab-backup.json',{schema:'poker-lab-backup-v04',exportedAt:new Date().toISOString(),data:store});
$('exportSchema').onclick=()=>downloadJson('poker-lab-range-sample.json',exampleSchema());
async function readJsonFile(input){let file=input.files?.[0];if(!file)throw Error('ファイルを選択してください');if(file.size>5_000_000)throw Error('5MB以下のJSONを使用してください');let content=await file.text();return JSON.parse(content)}
$('importAll').onchange=async e=>{try{let doc=await readJsonFile(e.target);if(doc.schema!=='poker-lab-backup-v04'||!doc.data)throw Error('POKER LAB v0.4用のバックアップではありません');if(!confirm('端末内の保存済みデータをバックアップ内容で上書きしますか？'))return;let raw=doc.data;store={history:Array.isArray(raw.history)?raw.history.slice(0,300):[],quiz:raw.quiz&&typeof raw.quiz==='object'?raw.quiz:{right:0,total:0},solvers:{}};for(const s of Object.values(raw.solvers||{})){let imported=validateImportedSpot(s);store.solvers[keyForRange(imported.context)]=imported}save();renderData();toast('バックアップを読み込みました')}catch(err){toast('読み込み失敗: '+err.message)}finally{e.target.value=''}};
$('importSolver').onchange=async e=>{try{let doc=await readJsonFile(e.target);if(doc.schema!=='poker-lab-range-v1'||!Array.isArray(doc.spots))throw Error('poker-lab-range-v1 のspots配列が必要です');if(doc.spots.length>500)throw Error('一度に500スポット以下で取り込んでください');let cleaned=doc.spots.map(validateImportedSpot);for(const s of cleaned)store.solvers[keyForRange(s.context)]=s;save();renderData();renderRanges();$('importMessage').textContent=`${cleaned.length}スポットを取り込みました（自動でGTO検証済みとは扱いません）`;toast('レンジデータを取り込みました')}catch(err){toast('読み込み失敗: '+err.message)}finally{e.target.value=''}};
$('clearAll').onclick=()=>{if(!confirm('保存したハンド履歴・問題成績・取り込みレンジを全削除します。元に戻せません。実行しますか？'))return;store={history:[],solvers:{},quiz:{right:0,total:0}};save();renderData();makeQuiz();toast('端末内のデータを削除しました')};
function renderData(){$('solverCount').textContent=`登録済み：${Object.keys(store.solvers).length}スポット · ${store.history.length}ハンド記録`;}

function init(){fillScenarios();initRangeControls();setupICM();makeQuiz();renderRanges();renderData();startSession();if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=41').catch(e=>console.warn('SW',e)));}window.addEventListener('online',()=>{$('connectionStatus').textContent='ONLINE'});window.addEventListener('offline',()=>{$('connectionStatus').textContent='OFFLINE'});$('connectionStatus').textContent=navigator.onLine?'ONLINE':'OFFLINE';}
init();
