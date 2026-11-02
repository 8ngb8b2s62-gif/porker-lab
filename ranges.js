/* POKER LAB range explorer. Heuristics are explicitly NOT solver/GTO data. */
export const ROW_RANKS='AKQJT98765432';
export const SPOT_LABELS={RFI:'RFI / 未参加オープン',VS_OPEN:'対オープン',VS_3BET:'対3bet',VS_4BET:'対4bet',BB_DEFEND:'BBディフェンス',PUSH_FOLD:'Push / Fold',SQUEEZE:'スクイーズ',VS_JAM:'対オールイン'};
export const handAt=(row,col)=>row===col?ROW_RANKS[row]+ROW_RANKS[col]:row<col?ROW_RANKS[row]+ROW_RANKS[col]+'s':ROW_RANKS[col]+ROW_RANKS[row]+'o';
export function holeToLabel(hole){if(!hole||hole.length!==2)return '—';const a=hole[0],b=hole[1],i=ROW_RANKS.indexOf(a[0]),j=ROW_RANKS.indexOf(b[0]);if(i<0||j<0)return '—';let hi=ROW_RANKS[Math.min(i,j)],lo=ROW_RANKS[Math.max(i,j)];return i===j?hi+lo:hi+lo+(a[1]===b[1]?'s':'o');}
export const keyForRange=p=>[p.format,p.table,p.stack,p.hero,p.spot,p.opener,p.openSize,p.ante].join('|');
export function roughRangeClass(hand,ctx){
 const i=ROW_RANKS.indexOf(hand[0]),j=ROW_RANKS.indexOf(hand[1]);const pair=hand.length===2,suited=hand.endsWith('s'),gap=Math.abs(i-j),hi=Math.min(i,j),lo=Math.max(i,j);
 let s=pair?96-hi*5.7:Math.max(0,90-hi*6.6-lo*2.1+(suited?9:0)+(gap===1?6:gap===2?3:0)-(gap>4?3:0));
 const positionAdjust={UTG:-22,'UTG+1':-18,MP:-14,LJ:-11,HJ:-5,CO:6,BTN:17,SB:5,BB:4,'BTN/SB':17}[ctx.hero]||0;
 const depth=+ctx.stack||40;
 let threshold=65-positionAdjust*.56;
 if(ctx.spot==='RFI') threshold+=depth<=12?6:depth<=20?2:0;
 if(ctx.spot==='VS_OPEN') threshold+=13;
 if(ctx.spot==='VS_3BET') threshold+=24;
 if(ctx.spot==='VS_4BET') threshold+=31;
 if(ctx.spot==='BB_DEFEND') threshold-=10;
 if(ctx.spot==='PUSH_FOLD') threshold+=depth>25?19:depth<=10?-5:2;
 if(ctx.spot==='SQUEEZE') threshold+=18;
 if(ctx.spot==='VS_JAM') threshold+=25;
 if(ctx.opener==='UTG'||ctx.opener==='UTG+1')threshold+=5;
 if(+ctx.openSize>=3)threshold+=3;
 if(ctx.format==='CASH')threshold+=(ctx.spot==='RFI'?2:0);
 if(ctx.ante==='none'&&ctx.format==='MTT')threshold+=2;
 if(s>=threshold+11) return 'raise';
 if(s>=threshold+2) return ['VS_OPEN','BB_DEFEND','VS_3BET','VS_JAM'].includes(ctx.spot)?'call':'raise';
 if(s>=threshold-10) return 'mix';
 return 'fold';
}
export function explainHand(hand,ctx,category){
 const pair=hand.length===2,suited=hand.endsWith('s'),r1=hand[0],r2=hand[1];let notes=[];
 if(pair)notes.push('ポケットペア。セットを作る可能性とショートスタックでのショーダウンバリューを考える。');
 else if(suited)notes.push('スーテッド。フラッシュ可能性、ブロッカー、インプライドオッズを確認する。');
 else notes.push('オフスート。ドミネートされやすさとキッカーを確認する。');
 if(r1==='A')notes.push('Aをブロックするため相手の強いAxやAAの一部コンボを減らす。');
 if(+ctx.stack<=15)notes.push('浅いスタックではオープン・コール・ジャムの構成が深いスタックと変わる。');
 if(ctx.spot==='BB_DEFEND')notes.push('すでに投入したBBとアンティがあり、相手のサイズ・レンジからポットオッズを計算する。');
 if(ctx.spot==='VS_3BET'||ctx.spot==='VS_4BET')notes.push('リレイズ後はポットが大きい。位置関係・SPR・4bet/5betサイズが重要。');
 if(ctx.spot==='SQUEEZE')notes.push('先にコールしたプレイヤーがいるため、相手双方のレンジとスクイーズへの対応が必要。');
 const title={raise:'レイズ系の候補',call:'コール系の候補',mix:'境界・混合候補',fold:'フォールド寄り'}[category];
 return {title,notes,warning:'この分類は独自の簡易教材モデル。計算済みGTO戦略でも、頻度・EVの推定値でもありません。'};
}
export function exampleSchema(){
 const ctx={format:'MTT',table:'9',stack:'40',hero:'BTN',spot:'RFI',opener:'CO',openSize:'2.2',ante:'bba'};
 return {schema:'poker-lab-range-v1',note:'このファイルは入力例です。0, 60, 100などはサンプルでありGTOデータではありません。自分で計算したか正当に利用権を得た結果だけ入力してください。',spots:[{context:ctx,source:'自分で計算したソルバー名とバージョン',computedAt:'2026-01-01',license:'自分で計算 / 利用許諾済み',verifiedByUser:false,actions:{AA:{raise:100,call:0,fold:0},AKs:{raise:60,call:30,fold:10}}}]};
}
export function validateImportedSpot(entry){
 if(!entry||!entry.context||!entry.actions||typeof entry.actions!=='object')throw Error('context / actionsがありません');
 const ctx=entry.context;for(const x of ['format','table','stack','hero','spot','opener','openSize','ante'])if(typeof ctx[x]!=='string')throw Error('context.'+x+'が文字列ではありません');
 if(!['MTT','CASH'].includes(ctx.format)||!SPOT_LABELS[ctx.spot])throw Error('形式またはアクション状況が不明です');
 const cleaned={};let count=0;for(let [h,v] of Object.entries(entry.actions)){
  if(!Array.from({length:13},(_,i)=>Array.from({length:13},(_,j)=>handAt(i,j))).flat().includes(h))throw Error('不正なハンド: '+h);
  if(!v||['raise','call','fold'].some(k=>!Number.isFinite(v[k])||v[k]<0||v[k]>100))throw Error(h+' の割合が不正');
  if(Math.abs(v.raise+v.call+v.fold-100)>0.5)throw Error(h+' の頻度合計が100ではありません');
  cleaned[h]={raise:v.raise,call:v.call,fold:v.fold};count++;
 }
 if(count===0)throw Error('アクションデータがありません');
 return {context:ctx,source:String(entry.source||'出典未記載').slice(0,150),license:String(entry.license||'権利不明').slice(0,150),computedAt:String(entry.computedAt||'不明').slice(0,50),verifiedByUser:!!entry.verifiedByUser,actions:cleaned};
}
