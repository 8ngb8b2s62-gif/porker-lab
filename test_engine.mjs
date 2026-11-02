import {PokerEngine,eval7,compareRanks,icmEquities} from './engine.js';
let bugs=0,maxHands=0,showdowns=0,folds=0;
for(let k=0;k<120;k++){
let game=new PokerEngine({mode:k%2?'CASH':'MTT',players:[2,6,9][k%3],stackBB:[10,25,60,100][k%4],bb:100,ante:k%2?'none':'bba',heroPosition:['BTN','SB','BB','UTG','CO'][k%5]});
let before=game.players.reduce((a,p)=>a+p.stack,0)+game.pot();let tries=0;
while(!game.complete&&tries++<250){game.autoUntilHero();if(game.complete)break;let L=game.legal(),actions=[];if(L.canCheck)actions.push({type:'check'});if(L.canCall)actions.push({type:'call'});if(L.canFold)actions.push({type:'fold'});if(L.canRaise)actions.push({type:'raise',amount:Math.min(L.maxRaiseTo,Math.max(L.minimumFullRaiseTo,Math.floor(game.pot()*.5+game.players[0].bet)))},{type:'allin'});let pick=actions[Math.floor(Math.random()*actions.length)];try{game.act(0,pick.type,pick.amount)}catch(e){console.error('ERROR k',k,'act',pick,L,e.message);bugs++;break}}
if(!game.complete){bugs++;console.log('INCOMPLETE',k,tries)}
let after=game.players.reduce((a,p)=>a+p.stack,0);if(before!==after){bugs++;console.log('CHIPS LEAK',k,before,after,game.result)}
if(game.result?.type==='showdown')showdowns++;else folds++;
}
console.log({bugs,showdowns,folds});
