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
export class PokerEngine{
 constructor({players=9,mode='MTT',stackBB=40,bb=100,ante='bba',heroPosition='BTN',aiMode='human',adaptive=true,profiles=[],heroMemory=null,forcedHero=null,forcedBoard=null,blindHands=10,level=0}={}){
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
 act(idx,type,amount){if(this.complete||this.turn!==idx)throw Error('今はそのプレイヤーの番ではありません');let p=this.players[idx],leg=this.legal(idx);if(!leg)throw Error('行動できません');let before=this.pot(),paid=0,label='';
  if(type==='fold'){if(!leg.canFold)throw Error('チェックできる場面です');p.folded=true;p.needsAction=false;label='FOLD';}
  else if(type==='check'){if(!leg.canCheck)throw Error('チェック不可');p.needsAction=false;label='CHECK';}
  else if(type==='call'){if(!leg.canCall)throw Error('コール不可');paid=this.post(p,leg.toCall,true);p.needsAction=false;label=`CALL ${(paid/this.bb).toFixed(1)}BB`;}
  else if(type==='raise'||type==='allin'){
   if(!leg.canRaise){if(type==='allin'&&leg.toCall>=p.stack)return this.act(idx,'call');throw Error('レイズ不可');}
   let total=type==='allin'?leg.maxRaiseTo:Math.round(amount);if(!Number.isFinite(total)||total<=this.currentBet||total>leg.maxRaiseTo)throw Error('ベット額が不正です');if(total<leg.minimumFullRaiseTo&&total!==leg.maxRaiseTo)throw Error('最小レイズ額を下回っています');
   let increase=total-this.currentBet,full=increase>=this.lastRaise;paid=this.post(p,total-p.bet,true);this.currentBet=p.bet;if(full){this.lastRaise=increase;this.players.forEach(q=>{if(q!==p&&!q.folded&&!q.allIn)q.actedSinceFullRaise=false;})}this.players.forEach(q=>{if(q!==p&&!q.folded&&!q.allIn&&q.bet<this.currentBet)q.needsAction=true});p.needsAction=false;this.lastAggressor=idx;label=type==='allin'||p.allIn?`ALL-IN ${(p.bet/this.bb).toFixed(1)}BB`:(before===0?`BET ${(p.bet/this.bb).toFixed(1)}BB`:`RAISE ${(p.bet/this.bb).toFixed(1)}BB`);
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
 aiDecision(idx){let p=this.players[idx],leg=this.legal(idx);if(!leg)return null;let profile=p.aiProfile;let traits={TAG:{wide:0,aggr:0.12,station:0},LAG:{wide:.095,aggr:.30,station:.03},Station:{wide:.13,aggr:-.18,station:.2},Nit:{wide:-.13,aggr:-.11,station:-.06},Maniac:{wide:.22,aggr:.46,station:.06},Tricky:{wide:.04,aggr:.16,station:.08}}[profile]||{wide:0,aggr:.05,station:0};let aggressive=traits.aggr;
  if(this.aiMode==='gto'){traits={wide:0,aggr:.1,station:0};aggressive=.1;}
  let observed=this.heroMemory.hands,confidence=this.adaptive?Math.min(.62,observed/(observed+20)):0;if(this.aiMode==='human'&&confidence){let vpip=this.heroMemory.open/Math.max(1,observed);aggressive+=confidence*(vpip-.30)*.6;}
  let strength=this.street===0?handClass(p.hole):estimateEquity(p.hole,this.board,Math.max(1,Math.min(3,this.inHand().length-1)),this.street===3?24:16);
  let pos=this.posOf(idx),early=['UTG','UTG+1','MP','LJ'].includes(pos),late=['CO','BTN','SB','BTN/SB'].includes(pos);
  if(this.street===0){strength+=traits.wide+(late?.03:early?-.06:0);}
  let callOdds=leg.toCall/(this.pot()+leg.toCall||1);let commitment=leg.toCall/this.bb;let pressure=this.street===0?(.05+Math.max(0,commitment-2)*.038):.06;let foldBound=Math.max(.16,callOdds+pressure-traits.station);
  if(leg.toCall===0){if(leg.canRaise&&strength+(Math.random()-.5)*.20 > (this.street===0?(.54-aggressive*.18):(.62-aggressive*.17))){let desired=this.street===0?Math.max(this.bb*2.2,this.currentBet+this.bb):Math.max(this.bb,this.pot()*(.33+Math.random()*.55));let total=Math.max(leg.minimumFullRaiseTo,Math.round((this.street===0?desired:desired+p.bet)/this.bb*10)*this.bb/10);if(total>=leg.maxRaiseTo)return {type:'allin'};return {type:'raise',amount:total};}return {type:'check'};}
  if(strength+(Math.random()-.5)*.24 < foldBound&&leg.canFold)return {type:'fold'};
  let raiseThreshold=Math.min(.93,.74-aggressive*.20+callOdds*.4);
  if(leg.canRaise&&strength+Math.random()*.14>raiseThreshold){let full=leg.minimumFullRaiseTo,large=this.currentBet+Math.max(this.lastRaise,Math.round(this.pot()*.45));let target=Math.max(full,large);if(target>=leg.maxRaiseTo)return {type:'allin'};return {type:'raise',amount:target};}
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
