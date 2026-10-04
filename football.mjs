import { ShootoutScene } from './football-scene.mjs';
import { TARGETS, targetFor, replaySnapshot } from './football-motion.mjs';
import { targetAtScreen } from './football-camera.mjs';
import { createShootoutAudio } from './shootout-audio-0.9h5a2.mjs';

const $ = id => document.getElementById(id);
const controls = { kick:$('club-kick'), pause:$('club-pause'), replay:$('club-replay'), targets:$('club-targets'), drill:$('club-drill'), progress:$('club-progress') };
const arrows = ['↖','↑','↗','←','·','→','↙','↓','↘'];
const key = 'mailgames.penaltyclub.v1';
let selected = 'top-right', busy = false, lastRound = null, session = { history:[] }, epoch = 0;
try { const saved = JSON.parse(localStorage.getItem(key)); if (Array.isArray(saved?.history)) session = { history:saved.history.filter(x => ['goal','save','parry','miss'].includes(x.outcome)).slice(-100) }; } catch {}
const audio = createShootoutAudio({ button:$('club-sound') });
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new ShootoutScene($('club-canvas'), $('club-caption'), {
  reducedMotion, onEvent:event => audio.handleEvent(event),
  onProgress:value => controls.progress.style.width = `${value * 100}%`
});

for (const [i, target] of TARGETS.entries()) {
  const button = document.createElement('button'); button.type='button'; button.dataset.zone=target.id;
  button.setAttribute('aria-label', target.label); button.setAttribute('aria-pressed', String(target.id === selected));
  button.textContent=arrows[i]; button.addEventListener('click', () => selectTarget(target.id)); controls.targets.append(button);
}
function selectTarget(id) {
  if (busy) return;
  selected=targetFor(id).id;
  for (const button of controls.targets.children) button.setAttribute('aria-pressed', String(button.dataset.zone===selected));
  $('club-selected').textContent=targetFor(id).label;
  scene.setIdle({ preview:selected, caption:`${targetFor(id).label}. Make it yours.` });
}
$('club-canvas').addEventListener('pointerdown', event => {
  if (busy) return;
  const rect=event.currentTarget.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width*1280, y=(event.clientY-rect.top)/rect.height*720;
  const closest=targetAtScreen(x,y);
  if (closest) selectTarget(closest.id);
});
function setBusy(value) {
  busy=value; controls.kick.disabled=value; controls.drill.disabled=value; controls.pause.disabled=!value;
  $('club-net').disabled=value; controls.replay.disabled=value || !lastRound;
  for (const button of controls.targets.children) button.disabled=value;
  controls.kick.firstElementChild.textContent=value ? 'Watch your shot…' : 'Take the shot';
  controls.pause.innerHTML='Ⅱ <span>Pause</span>'; controls.pause.setAttribute('aria-label','Pause replay');
}
function updateScore() {
  const goals=session.history.filter(x => x.outcome==='goal').length;
  $('club-goals').textContent=goals; $('club-stops').textContent=session.history.length-goals;
  $('club-count').textContent=`PRACTICE / ${String(session.history.length+1).padStart(2,'0')}`;
  $('club-history').replaceChildren();
  const recent=session.history.slice(-5);
  for(let i=0;i<5;i++) {
    const el=document.createElement('li'), result=recent[i];
    el.textContent=result ? result.outcome==='goal'?'✓':'×' : '—';
    if(result) { el.className=result.outcome==='goal'?'goal':'stopped'; el.title=result.outcome; el.setAttribute('aria-label',result.outcome); }
    $('club-history').append(el);
  }
  try { localStorage.setItem(key,JSON.stringify(session)); } catch {}
}
function makeRound() {
  const drill=controls.drill.value;
  let keeper=TARGETS[Math.floor(Math.random()*TARGETS.length)].id;
  let outcome=selected===keeper?'save':'goal';
  if(drill!=='play') {
    outcome=drill;
    if(['save','parry'].includes(drill)) keeper=selected;
    if(drill==='goal') keeper=selected.endsWith('left')?'bottom-right':'bottom-left';
  }
  const captions={goal:'GOAL. A finish worth watching twice.',save:'SAVED. The keeper read it and held on.',parry:'PARRIED. A strong hand turns it away.',miss:'OFF TARGET. Reset. The next one is yours.'};
  return replaySnapshot({shotZone:selected,keeperZone:keeper,outcome,shotActive:outcome!=='miss',keeperActive:true,caption:captions[outcome]});
}
async function play(isReplay=false) {
  if(busy || (isReplay && !lastRound)) return;
  const ticket=++epoch;
  const round=isReplay?lastRound:makeRound();
  lastRound=round; setBusy(true); controls.progress.style.width='0%';
  void audio.unlock();
  const result=await scene.playReplay(round);
  if(ticket!==epoch || result.cancelled) return;
  if(!isReplay) { session.history.push({outcome:round.outcome,shotZone:round.shotZone,keeperZone:round.keeperZone}); updateScore(); }
  setBusy(false);
}
controls.kick.addEventListener('click',()=>play()); controls.replay.addEventListener('click',()=>play(true));
controls.pause.addEventListener('click',()=>{
  const paused=scene.togglePause(); controls.pause.innerHTML=paused?'▶ <span>Resume</span>':'Ⅱ <span>Pause</span>';
  controls.pause.setAttribute('aria-label',paused?'Resume replay':'Pause replay');
});
$('club-slow').addEventListener('click',()=>{
  scene.speed=scene.speed===1?.5:1; $('club-slow').setAttribute('aria-pressed',String(scene.speed===.5));
});
$('club-net').addEventListener('input',event=>{
  const value=Number(event.target.value); scene.sag=1.85-value/100*1.2;
  $('club-net-label').textContent=value<30?'Loose':value>72?'Firm':'Matchday';
});
scene.sag=1.31;
controls.drill.addEventListener('change',()=>{
  const help={play:'The keeper makes an independent choice. Can you beat them?',goal:'Work on your finish. Watch the ball stretch the net and drop.',save:'A catching drill: the keeper follows the shot and holds the ball.',parry:'A parrying drill: the keeper pushes the ball away from goal.',miss:'Watch an attempt fly wide or over the crossbar.'};
  $('club-drill-help').textContent=help[controls.drill.value];
});
function syncMotion() { $('club-motion').setAttribute('aria-pressed',String(reducedMotion)); $('club-motion').textContent=reducedMotion?'Motion reduced':'Reduce motion'; scene.setReducedMotion(reducedMotion); }
$('club-motion').addEventListener('click',()=>{reducedMotion=!reducedMotion;syncMotion();});
$('club-reset').addEventListener('click',()=>{
  ++epoch; scene.cancelReplay(); scene.resultStill=null; lastRound=null; session={history:[]};
  setBusy(false); controls.progress.style.width='0%'; updateScore(); selectTarget(selected);
});
document.addEventListener('keydown',event=>{
  if(event.code!=='Space' || event.repeat || ['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(event.target.tagName)) return;
  event.preventDefault(); if(busy) controls.pause.click(); else play();
});
window.addEventListener('pagehide',()=>scene.destroy(),{once:true});
syncMotion(); updateScore(); selectTarget(selected);
