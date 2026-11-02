/* POKER LAB - independent Texas Hold'em game engine (ES module) */
export const RANKS='23456789TJQKA';
export const SUITS='shdc';
export const STREET_NAMES=['PREFLOP','FLOP','TURN','RIVER'];
export const allCards=()=>[...SUITS].flatMap(s=>[...RANKS].map(r=>r+s));
export const randomInt=n=>Math.floor(Math.random()*n);
export function shuffle(cards){for(let i=cards.length-1;i>0;i--){let j=randomInt(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
const value=c=>RANKS.indexOf(c[0])+2;
export function compareRanks(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){let d=(a[i]||0)-(b[i]||0);if(d)return Math.sign(d)}return 0;}
function fiveRank(cards){
 const v=cards.map(value).sort((a,b)=>b-a);const counts={};v.forEach(x=>counts[x]=(counts[x]||0)+1);
 const group=Object.entries(counts).map(([rank,count])=>({rank:+rank,count})).sort((a,b)=>b.count-a.count||b.rank-a.rank);
 let unique=[...new Set(v)];if(unique.includes(14))unique.push(1);
 let straight=0;for(let i=0;i<=unique.length-5;i++){if(unique[i]-unique[i+4]===4){straight=unique[i];break;}}
 const flush=cards.every(c=>c[1]===cards[0][1]);
 if(straight&&flush)return [8,straight];
 if(group[0].count===4)return [7,group[0].rank,group[1].rank];
 if(group[0].count===3&&group[1].count===2)return [6,group[0].rank,group[1].rank];
 if(flush)return [5,...v];
 if(straight)return [4,straight];
 if(group[0].count===3)return [3,group[0].rank,...group.slice(1).map(g=>g.rank).sort((a,b)=>b-a)];
 if(group[0].count===2&&group[1].count===2){let pairs=group.filter(g=>g.count===2).map(g=>g.rank).sort((a,b)=>b-a);return [2,...pairs,group.find(g=>g.count===1).rank]}
 if(group[0].count===2)return [1,group[0].rank,...group.slice(1).map(g=>g.rank).sort((a,b)=>b-a)];
 return [0,...v];
}
export function eval7(cards){if(cards.length<5)throw Error('Need 5 or more cards');let best=null;for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){let z=fiveRank([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(!best||compareRanks(z,best)>0)best=z;}return best;}
export const HAND_NAMES=['ハイカード','ワンペア','ツーペア','スリーカード','ストレート','フラッシュ','フルハウス','フォーカード','ストレートフラッシュ'];
export function handClass(hole){let r1=value(hole[0]),r2=value(hole[1]),hi=Math.max(r1,r2),lo=Math.min(r1,r2),pair=hi===lo,suit=hole[0][1]===hole[1][1],gap=hi-lo;let score=pair?Math.min(.97,.42+hi/25):Math.min(.91,.09+hi/27+lo/53+(suit?.09:0)+(gap===1?.07:gap===2?.035:0));if(hi===14)score+=.045;return Math.min(.98,score)}
export const formatHand=cards=>cards.map(c=>c[0]+({s:'♠',h:'♥',d:'♦',c:'♣'}[c[1]])).join(' ');
export function positionLabels(n){if(n===2)return ['BTN/SB','BB'];if(n===3)return ['BTN','SB','BB'];if(n===4)return ['BTN','SB','BB','CO'];if(n===5)return ['BTN','SB','BB','HJ','CO'];if(n===6)return ['BTN','SB','BB','UTG','HJ','CO'];if(n===7)return ['BTN','SB','BB','UTG','LJ','HJ','CO'];if(n===8)return ['BTN','SB','BB','UTG','UTG+1','LJ','HJ','CO'];return ['BTN','SB','BB','UTG','UTG+1','MP','LJ','HJ','CO'];}
export function estimateEquity(hole,board,opponents=1,trials=32){
 if(!hole?.length||hole.length!==2)return .5;const excluded=new Set([...hole,...board]);let pack=allCards().filter(c=>!excluded.has(c)),wins=0;
 for(let t=0;t<trials;t++){
  let drawn=shuffle(pack.slice()).slice(0,(5-board.length)+2*opponents);let runout=[...board,...drawn.slice(0,5-board.length)];let own=eval7([...hole,...runout]);let competitors=[];for(let i=0;i<opponents;i++)competitors.push(eval7([...drawn.slice(5-board.length+2*i,5-board.length+2*i+2),...runout]));let ahead=competitors.filter(x=>compareRanks(own,x)<0).length;if(!ahead){let ties=competitors.filter(x=>compareRanks(own,x)===0).length;wins+=1/(ties+1)}
 }
 return wins/trials;
}

// Human-readable 6-max baseline ranges. Coaching heuristics, NOT solver GTO.
const PREF_RANKS='23456789TJQKA';
const OPEN_6={
 UTG:'66+ A5s A4s ATs+ KTs+ QTs+ JTs T9s AJo+ KQo',
 HJ:'55+ A2s-A5s A8s+ K9s+ Q9s+ J9s+ T9s 98s ATo+ KJo+',
 CO:'33+ A2s+ K7s+ Q8s+ J8s+ T8s+ 97s 86s 76s 65s A8o+ KTo+ QTo+ JTo',
 BTN:'22+ A2s+ K2s+ Q5s+ J6s+ T6s+ 96s+ 85s+ 75s+ 64s+ 54s A2o+ K8o+ Q9o+ J9o+ T9o',
 SB:'22+ A2s+ K5s+ Q7s+ J7s+ T7s+ 97s+ 86s+ 75s+ 64s+ 54s A2o+ K9o+ Q9o+ JTo',
 BB:'22+ A2s+ K2s+ Q2s+ J2s+ T2s+ 92s+ 82s+ 72s+ 62s+ 52s+ A2o+ K2o+ Q2o+ J2o+ T2o+'
};
const DEFEND_6={
 early:'88+ AQs+ AKo KQs QJs JTs',
 mid:'66+ AJs+ AQo+ KJs+ KQo QJs JTs T9s 98s',
 late:'55+ A9s+ AJo+ KTs+ KQo QTs+ JTs T9s 98s 87s',
 blind:'22+ A2s+ A7o+ K7s+ KTo+ Q8s+ QTo+ J8s+ JTo T8s+ 98s 87s 76s 65s 54s'
};
function codeOf(hole){let a=hole[0][0],b=hole[1][0];if(a===b)return a+a;return PREF_RANKS.indexOf(a)>PREF_RANKS.indexOf(b)? a+b+(hole[0][1]===hole[1][1]?'s':'o'):b+a+(hole[0][1]===hole[1][1]?'s':'o');}
function tokenMatches(hand,t){
 if(t.includes('-')){let [first,last]=t.split('-');if(first.length!==3||last.length!==3||hand.length!==3||first[0]!==last[0]||first[0]!==hand[0]||first[2]!==last[2]||hand[2]!==first[2])return false;let v=PREF_RANKS.indexOf(hand[1]),lo=PREF_RANKS.indexOf(first[1]),hi=PREF_RANKS.indexOf(last[1]);return v>=Math.min(lo,hi)&&v<=Math.max(lo,hi);}
 if(t.endsWith('+')){let base=t.slice(0,-1);if(base.length===2)return hand.length===2&&PREF_RANKS.indexOf(hand[0])>=PREF_RANKS.indexOf(base[0]);if(base.length===3&&hand.length===3)return hand[0]===base[0]&&hand[2]===base[2]&&PREF_RANKS.indexOf(hand[1])>=PREF_RANKS.indexOf(base[1]);}
 return hand===t;
}
function inRange(hand,range){return range.split(/\s+/).some(t=>tokenMatches(hand,t));}
function preflopPosition(pos){return pos==='BTN/SB'?'SB':pos==='LJ'||pos==='UTG+1'||pos==='MP'?'UTG':pos;}
export class PokerEngine{
 constructor({players=6,mode='MTT',stackBB=40,bb=100,ante='bba',heroPosition='BTN',aiMode='human',adaptive=true,profiles=[],heroMemory=null,forcedHero=null,forcedBoard=null,blindHands=10,level=0}={}){
  this.mode=mode;this.aiMode=aiMode;this.adaptive=adaptive;this.bb=Math.max(2,Math.round(bb));this.sb=Math.floor(this.bb/2);this.ante=ante;this.level=level;this.handNo=0;this.heroMemory=heroMemory||{hands:0,open:0,raises:0,calls:0,folds:0,bets:0,postActions:0};this.settings={forcedHero,forcedBoard,heroPosition,blindHands};this.log=[];this.decisions=[];this.history=[];this.complete=false;this.result=null;this.street=0;this.board=[];this.displayBoard=[];this.presetBoard=[];
  let n=Math.max(2,Math.min(9,players));this.players=Array.from({length:n},(_,i)=>({id:i,name:i===0?'YOU':`AI ${i}`,stack:Math.round(stackBB*this.bb),hole:[],bet:0,committed:0,folded:false,allIn:false,needsAction:false,actedSinceFullRaise:false,aiProfile:profiles[i]||['TAG','LAG','Station','Nit','Tricky','TAG','LAG','Station'][Math.max(0,i-1)%8]}));
  this.button=this.buttonForHero(heroPosition);this.startHand({forcedHero,forcedBoard});
 }
 alive(){return this.players.filter(p=>p.stack>0)}
 buttonForHero(pos){let n=this.players.length,offset=positionLabels(n).findIndex(p=>p===pos||p.startsWith(pos+'/'));if(offset<0)offset=0;return (n-offset)%n;}
 activeIndexes(){return this.players.map((p,i)=>p.stack>0?i:-1).filter(i=>i>=0)}
 nextLiving(idx){for(let x=1;x<=this.players.length;x++){let j=(idx+x)%this.players.length;if(this.players[j].stack>0)return j}return idx}
 nextHand(){if(this.players[0].stack<=0)return false;if(this.alive().length<2){let replace=this.players.find((p,i)=>i!==0&&p.stack<=0);if(replace){replace.stack=this.bb*35;replace.name='AI 新席';replace.aiProfile='TAG';}}this.button=this.nextLiving(this.button);this.startHand();return true}
 posOf(idx){let live=this.handOrder||this.liveOrder();let from=live.indexOf(this.button),ix=live.indexOf(idx);if(ix<0)return 'OUT';return positionLabels(live.length)[(ix-from+live.length)%live.length]||'MP'}
 liveOrder(){return this.players.map((p,i)=>p.stack>0?i:-1).filter(i=>i>=0)}
 firstLeftOf(idx,filter){for(let k=1;k<=this.players.length;k++){let i=(idx+k)%this.players.length;if(filter(this.players[i]))return i}return -1}
 startHand({forcedHero=null,forcedBoard=null}={}){
  this.handNo++;this.complete=false;this.result=null;this.street=0;this.log=[];this.decisions=[];this.board=[];this.displayBoard=[];this.deck=shuffle(allCards());this.presetBoard=[];this.currentBet=0;this.lastRaise=this.bb;this.turn=-1;this.lastAggressor=-1;this.heroDealtStack=this.players[0].stack;this.players.forEach(p=>{p.hole=[];p.bet=0;p.committed=0;p.folded=p.stack<=0;p.allIn=false;p.needsAction=p.stack>0;p.actedSinceFullRaise=false;});
  let take=c=>{let ind=this.deck.indexOf(c);if(ind<0)throw Error('Invalid forced cards: '+c);this.deck.splice(ind,1);return c};
  const preset=forcedHero&&Array.isArray(forcedHero)&&forcedHero.length===2?forcedHero:null;
  if(preset)this.players[0].hole=preset.map(take);
  if(forcedBoard&&Array.isArray(forcedBoard)&&forcedBoard.length===5)this.presetBoard=forcedBoard.map(take);
  let active=this.liveOrder();this.handOrder=active.slice();if(!active.includes(this.button)&&active.length)this.button=this.nextLiving(this.button);if(active.length<2){this.complete=true;this.result={type:'tournament-end',winners:[],pot:0};return}
  let sbIdx=active.length===2?this.button:this.nextLiving(this.button);let bbIdx=this.nextLiving(sbIdx);this.sbIndex=sbIdx;this.bbIndex=bbIdx;
  for(let r=0;r<2;r++){let start=sbIdx;for(let i=0;i<active.length;i++){let idx=active[(active.indexOf(start)+i)%active.length];if(this.players[idx].hole.length<2)this.players[idx].hole.push(this.deck.pop());}}
  if(this.ante==='bba')this.post(this.players[bbIdx],this.bb,false,'ANTE');else if(this.ante==='all')active.forEach(i=>this.post(this.players[i],Math.max(1,Math.floor(this.bb/10)),false,'ANTE'));
  this.post(this.players[sbIdx],this.sb,true,'SB');this.post(this.players[bbIdx],this.bb,true,'BB');this.currentBet=Math.max(...this.players.map(p=>p.bet));
  this.players.forEach(p=>p.needsAction=!p.folded&&!p.allIn);this.turn=this.firstLeftOf(bbIdx,p=>p.needsAction);this.log.push({street:0,text:`ハンド #${this.handNo} / SB ${this.players[sbIdx].name}・BB ${this.players[bbIdx].name}`,type:'info'});this.advanceIfNecessary();
 }
 post(p,amount,isBet=true,kind='POST'){
  let paid=Math.max(0,Math.min(p.stack,Math.round(amount)));p.stack-=paid;p.committed+=paid;if(isBet)p.bet+=paid;if(p.stack===0)p.allIn=true;return paid;
 }
 pot(){return this.players.reduce((sum,p)=>sum+p.committed,0)}
 inHand(){return this.players.filter(p=>!p.folded&&p.hole.length===2)}
 canAct(){return this.players.filter(p=>!p.folded&&!p.allIn&&p.hole.length===2)}
 legal(idx=this.turn){let p=this.players[idx];if(!p||p.folded||p.allIn)return null;let toCall=Math.max(0,this.currentBet-p.bet),maxTo=p.bet+p.stack,minTo=this.currentBet===0?this.bb:this.currentBet+this.lastRaise;let raiseAllowed=!p.actedSinceFullRaise&&maxTo>this.currentBet;return {toCall,canCheck:toCall===0,canFold:toCall>0,canCall:toCall>0,callAmount:Math.min(p.stack,toCall),canRaise:raiseAllowed,minRaiseTo:Math.min(minTo,maxTo),minimumFullRaiseTo:minTo,maxRaiseTo:maxTo,pot:this.pot(),stack:p.stack};}
 acting(){return this.turn>=0?this.players[this.turn]:null}
 act(idx,type,amount){if(this.complete||this.turn!==idx)throw Error('今はそのプレイヤーの番ではありません');let p=this.players[idx],leg=this.legal(idx);if(!leg)throw Error('行動できません');let before=this.pot(),wasUnopened=this.currentBet===0,paid=0,label='';
  if(type==='fold'){if(!leg.canFold)throw Error('チェックできる場面です');p.folded=true;p.needsAction=false;label='FOLD';}
  else if(type==='check'){if(!leg.canCheck)throw Error('チェック不可');p.needsAction=false;label='CHECK';}
  else if(type==='call'){if(!leg.canCall)throw Error('コール不可');paid=this.post(p,leg.toCall,true);p.needsAction=false;label=`CALL ${(paid/this.bb).toFixed(1)}BB`;}
  else if(type==='raise'||type==='allin'){
   if(!leg.canRaise){if(type==='allin'&&leg.toCall>=p.stack)return this.act(idx,'call');throw Error('レイズ不可');}
   let total=type==='allin'?leg.maxRaiseTo:Math.round(amount);if(!Number.isFinite(total)||total<=this.currentBet||total>leg.maxRaiseTo)throw Error('ベット額が不正です');if(total<leg.minimumFullRaiseTo&&total!==leg.maxRaiseTo)throw Error('最小レイズ額を下回っています');
   let increase=total-this.currentBet,full=increase>=this.lastRaise;paid=this.post(p,total-p.bet,true);this.currentBet=p.bet;if(full){this.lastRaise=increase;this.players.forEach(q=>{if(q!==p&&!q.folded&&!q.allIn)q.actedSinceFullRaise=false;})}this.players.forEach(q=>{if(q!==p&&!q.folded&&!q.allIn&&q.bet<this.currentBet)q.needsAction=true});p.needsAction=false;this.lastAggressor=idx;label=type==='allin'||p.allIn?`ALL-IN ${(p.bet/this.bb).toFixed(1)}BB`:(wasUnopened?`BET ${(p.bet/this.bb).toFixed(1)}BB`:`RAISE ${(p.bet/this.bb).toFixed(1)}BB`);
  }else throw Error('行動が不正');
  p.actedSinceFullRaise=true;this.log.push({street:this.street,player:idx,text:`${p.name} · ${label}`,type,amount:paid,pot:this.pot()});
  if(idx===0){let decision={street:this.street,board:this.board.slice(),hole:p.hole.slice(),position:this.posOf(0),potBefore:before,toCall:leg.toCall,minimum:leg.minimumFullRaiseTo,action:type,amount:paid,betTotal:p.bet,stackBefore:p.stack+paid,bb:this.bb,tableSize:this.liveOrder().length,handNo:this.handNo,mode:this.mode,aiMode:this.aiMode};this.decisions.push(decision);}
  this.turn=this.firstLeftOf(idx,q=>q.needsAction&&!q.folded&&!q.allIn);this.advanceIfNecessary();return this.log[this.log.length-1];
 }
 advanceIfNecessary(){
  if(this.complete)return;
  let remain=this.inHand();if(remain.length===1){this.awardUncontested(remain[0]);return}
  if(this.turn>=0&&this.players[this.turn]?.needsAction)return;
  if(this.street===3||this.canAct().length<=1){this.dealToRiver();this.showdown();return}
  this.street++;this.reveal();this.currentBet=0;this.lastRaise=this.bb;this.lastAggressor=-1;this.players.forEach(p=>{p.bet=0;p.actedSinceFullRaise=false;p.needsAction=!p.folded&&!p.allIn});this.turn=this.firstLeftOf(this.button,p=>p.needsAction);this.log.push({street:this.street,text:`── ${STREET_NAMES[this.street]} ──`,type:'street'});if(this.turn<0){this.dealToRiver();this.showdown()}
 }
 reveal(){let count=this.street===1?3:1;for(let j=0;j<count;j++)this.board.push(this.presetBoard.length?this.presetBoard.shift():this.deck.pop());}
 dealToRiver(){while(this.street<3){this.street++;this.reveal();this.log.push({street:this.street,text:`── ${STREET_NAMES[this.street]} (ALL-IN RUNOUT) ──`,type:'street'});} }
 awardUncontested(p){let sum=this.pot();p.stack+=sum;this.complete=true;this.result={type:'fold',winners:[p.id],pot:sum,payouts:{[p.id]:sum},description:`${p.name} が ${ (sum/this.bb).toFixed(1)}BB を獲得（相手フォールド）`};this.log.push({street:this.street,text:this.result.description,type:'result'});}
 showdown(){let contenders=this.inHand();if(!contenders.length)throw Error('no contenders');let ranks={};contenders.forEach(p=>ranks[p.id]=eval7([...p.hole,...this.board]));let thresholds=[...new Set(this.players.map(p=>p.committed).filter(x=>x>0))].sort((a,b)=>a-b);let prev=0,payouts={};let slices=[];
  for(let cap of thresholds){let contributor=this.players.filter(p=>p.committed>=cap),amount=(cap-prev)*contributor.length;prev=cap;if(!amount)continue;let eligible=contributor.filter(p=>!p.folded),winners=eligible.filter(p=>eligible.every(q=>compareRanks(ranks[p.id],ranks[q.id])>=0));if(!winners.length)continue;let each=Math.floor(amount/winners.length),rem=amount%winners.length;winners.forEach((p,i)=>{let won=each+(i<rem?1:0);p.stack+=won;payouts[p.id]=(payouts[p.id]||0)+won;});slices.push({amount,winners:winners.map(p=>p.id),cap});}
  this.complete=true;let winners=Object.keys(payouts).filter(k=>payouts[k]>0).map(Number);this.result={type:'showdown',pot:this.pot(),winners,payouts,ranks,slices,description:winners.map(id=>`${this.players[id].name} +${(payouts[id]/this.bb).toFixed(1)}BB`).join(' / ')};this.log.push({street:3,text:`SHOWDOWN · ${this.result.description}`,type:'result'});
 }
 getHeroMemory(){let m={...this.heroMemory},pre=this.decisions.filter(d=>d.street===0);m.hands++;if(pre.some(d=>['call','raise','allin'].includes(d.action)))m.open++;if(pre.some(d=>['raise','allin'].includes(d.action)))m.raises++;this.decisions.forEach(d=>{if(d.action==='call')m.calls++;if(d.action==='fold')m.folds++;if(d.action==='raise'||d.action==='allin')m.bets++;if(d.street>0)m.postActions++});return m;}
 aiDecision(idx){
  const p=this.players[idx],L=this.legal(idx);if(!L)return null;
  const pos=preflopPosition(this.posOf(idx)),hand=codeOf(p.hole),stack=p.stack/this.bb;
  const opponents=Math.max(1,this.inHand().length-1);
  const raised=this.log.filter(a=>a.street===0&&(a.type==='raise'||a.type==='allin')).length;
  const opponentOpening=this.log.filter(a=>a.street===0&&(a.type==='raise'||a.type==='allin')).at(-1);
  const opener=opponentOpening?preflopPosition(this.posOf(opponentOpening.player)):'UTG';
  const rand=Math.random();
  const makeRaise=(target)=>({type:'raise',amount:Math.min(L.maxRaiseTo,Math.max(L.minimumFullRaiseTo,Math.round(target)))});
  const fullRaiseAvailable=L.canRaise && L.maxRaiseTo>=L.minimumFullRaiseTo;
  if(this.street===0){
   // Unopened pots: open-raise or fold; never open-limp. BB gets a free check.
   if(raised===0){
    if(L.toCall===0&&this.currentBet===this.bb)return {type:'check'};
    const openRange=OPEN_6[pos]||OPEN_6.UTG;
    let opened=inRange(hand,openRange);
    // Narrow short-stack RFI; wide recreational deviations are intentionally small.
    if(stack<=14&&['UTG','HJ'].includes(pos))opened=opened&&inRange(hand,'44+ A7s+ ATo+ KTs+ KQo QJs JTs');
    if(!opened)return L.canCheck?{type:'check'}:{type:'fold'};
    if(stack<=11&&pos!=='BB')return {type:'allin'};
    if(!L.canRaise)return L.canCheck?{type:'check'}:{type:'call'};
    return makeRaise(this.bb*(pos==='SB'?2.5:this.mode==='CASH'?2.5:2.2));
   }
   // Under a raise: progressively stricter responses to 3bets and 4bets.
   const effective=(p.stack+p.bet)/this.bb;
   const premium=inRange(hand,'QQ+ AKs AKo');
   const monster=inRange(hand,'KK+');
   if(raised>=3){if(monster&&L.canRaise&&effective<=70)return {type:'allin'};return (monster||hand==='QQ'||hand==='AKs')&&L.toCall<=p.stack*.42?{type:'call'}:{type:'fold'};}
   if(raised===2){
    if(monster&&L.canRaise){if(effective<=65)return {type:'allin'};return makeRaise(this.currentBet*2.2);}
    if(inRange(hand,'JJ+ AKs AKo AQs')&&L.toCall<=p.stack*(effective<=40?.65:.26))return {type:'call'};
    return {type:'fold'};
   }
   const openerEarly=['UTG','HJ'].includes(opener);
   const defenderRange=pos==='BB'&&!openerEarly?DEFEND_6.blind:DEFEND_6[openerEarly?'early':opener==='CO'?'mid':'late'];
   const viable=inRange(hand,defenderRange);
   const costBB=L.toCall/this.bb;
   const triple=this.inHand().filter(q=>q.id!==idx&&!q.folded&&q.bet>=this.bb*1.8).length>1;
   const veryStrong=inRange(hand,openerEarly?'QQ+ AKs AKo':'JJ+ AKs AKo AQs');
   const threebetBluff=this.aiMode!=='gto'&&inRange(hand,'A5s A4s KTs QTs JTs') && !triple && ['CO','BTN','SB','BB'].includes(pos) && !openerEarly && rand<.15;
   if(L.canRaise&&(veryStrong||threebetBluff) && rand<(veryStrong?.80:1)){
    if(effective<=17&&veryStrong)return {type:'allin'};
    if(fullRaiseAvailable){const target=this.currentBet*(pos==='SB'||pos==='BB'?4.0:3.2)+(triple?this.bb:0);return makeRaise(target);}
   }
   if(viable&&costBB<=Math.max(1,effective*.22)&&(!triple||premium||inRange(hand,'77+ AJs+ KQs QJs JTs T9s')))return {type:'call'};
   // Cheap BB defend, but not any-two versus an arbitrarily large raise.
   if(pos==='BB'&&costBB<=1.5&&inRange(hand,OPEN_6.BTN))return {type:'call'};
   return L.canCheck?{type:'check'}:{type:'fold'};
  }
  // Postflop: conservative multiway play, realistic fractions, less random huge aggression.
  let equity=estimateEquity(p.hole,this.board,Math.min(3,opponents),this.street===3?40:28);
  const boardRanks=this.board.map(c=>value(c)),holeRanks=p.hole.map(c=>value(c));
  const paired=holeRanks[0]===holeRanks[1]||holeRanks.some(r=>boardRanks.includes(r));
  const overpair=holeRanks[0]===holeRanks[1]&&holeRanks[0]>Math.max(...boardRanks);
  const topPair=holeRanks.some(r=>r===Math.max(...boardRanks));
  const strong=(topPair||overpair||equity>(opponents>1?.66:.69));
  const multi=opponents>1;
  if(L.toCall===0){
   if(!L.canRaise)return {type:'check'};
   const chance=(strong?(multi?.34:.62):(paired?(multi?.10:.25):(multi?.02:.12)))*(this.aiMode==='gto'?.75:1);
   if(rand>=chance)return {type:'check'};
   let sizing=(strong?.55:.33)*this.pot();
   if(multi)sizing*=.78;
   if(L.maxRaiseTo<=this.bb*2&&strong)return {type:'allin'};
   return makeRaise(this.currentBet+Math.max(this.bb,sizing));
  }
  const odds=L.toCall/(this.pot()+L.toCall);
  const risk=(multi?.095:.045)+(L.toCall>p.stack*.40?.065:0);
  if(equity+ (paired?.015:0) < odds+risk && !overpair)return {type:'fold'};
  if(L.canRaise&&strong&&!multi&&equity>.76&&rand<.16&&L.toCall<p.stack*.2){
   if(fullRaiseAvailable)return makeRaise(this.currentBet+Math.max(this.lastRaise,this.pot()*.65));
  }
  return {type:'call'};
 }
 autoUntilHero(max=250){let loop=0;while(!this.complete&&this.turn!==0&&loop++<max){if(this.turn<0){this.advanceIfNecessary();continue}let a=this.aiDecision(this.turn),id=this.turn;try{this.act(id,a.type,a.amount)}catch(e){let leg=this.legal(id);this.act(id,leg?.canCheck?'check':'call')}}if(loop>=max)throw Error('Auto action exceeded safe limit');}
}
export function icmEquities(stacks,payouts){
 const n=stacks.length;if(n<2||n>10)throw Error('ICMは2〜10人の入力に対応');if(stacks.some(x=>!Number.isFinite(x)||x<0)||stacks.reduce((a,b)=>a+b,0)<=0)throw Error('スタックが不正');let prizes=Array.from({length:n},(_,i)=>Number(payouts[i]||0));let states=new Float64Array(1<<n);states[0]=1;let out=new Array(n).fill(0);let totals=new Float64Array(1<<n);for(let mask=1;mask<(1<<n);mask++){let bit=mask&-mask,i=Math.log2(bit)|0;totals[mask]=totals[mask^bit]+stacks[i]}
 const sum=totals[(1<<n)-1];for(let mask=0;mask<(1<<n);mask++){let prob=states[mask];if(!prob)continue;let placed=0;for(let m=mask;m;m&=m-1)placed++;if(placed===n)continue;let rest=sum-totals[mask];if(rest<=0)continue;for(let j=0;j<n;j++)if(!(mask&(1<<j))&&stacks[j]>0){let p=prob*stacks[j]/rest;out[j]+=p*prizes[placed];states[mask|(1<<j)]+=p;}}
 return out;
}
export function icmBubbleFactor(stacks,payouts,hero,villain,transfer){let stake=Math.max(0,Math.floor(transfer)),base=icmEquities(stacks,payouts)[hero];if(hero===villain||!stake)return null;let win=stacks.slice(),lose=stacks.slice();let w=Math.min(stake,win[villain]),l=Math.min(stake,lose[hero]);win[hero]+=w;win[villain]-=w;lose[hero]-=l;lose[villain]+=l;let upside=icmEquities(win,payouts)[hero]-base,downside=base-icmEquities(lose,payouts)[hero];let factor=upside>0?downside/upside:null;return {base,win:base+upside,lose:base-downside,upside,downside,factor,breakeven:factor!=null?factor/(1+factor):null};}
