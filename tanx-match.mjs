import {newMatch, playMatch, nextRound} from './tanx-core.mjs';

export function initialTanx(config, seed) {
  return {battle: newMatch(config, [{name:'Player A',type:'human'},{name:'Player B',type:'human'}], seed),
    round:1,healthA:100,healthB:100,scoreA:0,scoreB:0,history:[],finished:false,winner:null};
}
export function applyTanx(state, {actor,angle,power,answerCorrect}) {
  const expected = state.battle.arena.active === 0 ? 'A' : 'B';
  if (actor !== expected) throw Object.assign(new Error('This player is not expected to move now.'),{statusCode:409});
  let result;
  try {result = playMatch(state.battle, angle, power, Boolean(answerCorrect));}
  catch (error) {throw Object.assign(error,{statusCode:400});}
  let battle = result.match;
  // Bound a classroom match even if every answer is wrong or damage is off.
  const roundCap = battle.config.roundsToWin * 2 + 1;
  if (result.replay.over && battle.round >= roundCap && !battle.finished) {
    battle.finished = true;
    battle.winner = battle.wins[0] === battle.wins[1] ? null : battle.wins[0] > battle.wins[1] ? 0 : 1;
  }
  const replay = {...result.replay,gameType:'tanx',round:battle.round,
    caption:!answerCorrect?'SHOT DISABLED — review the answer, then try again.':result.replay.hit?.kind==='miss'?'MISS — adjust the next firing solution.':'IMPACT — terrain and tank health updated.',
    completed:battle.finished,winner:battle.winner==null?null:battle.winner===0?'A':'B'};
  if (replay.over && !battle.finished) battle=nextRound(battle);
  return {state:{...state,battle,round:battle.round,healthA:battle.arena.tanks[0].hp,healthB:battle.arena.tanks[1].hp,
    scoreA:battle.wins[0],scoreB:battle.wins[1],history:[...state.history,replay],finished:battle.finished,
    winner:battle.winner==null?null:battle.winner===0?'A':'B'}, resolved:true,replay,completed:battle.finished,message:replay.caption};
}
