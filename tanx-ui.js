/* Offline UI, AI turn animation, Web Audio and the same-origin classroom bridge. */
(() => {
'use strict';
const C = TanxCore, $ = id => document.getElementById(id);
const embedded = window.parent !== window && new URLSearchParams(location.search).has('classroom');
if (embedded) document.body.classList.add('embedded');
let renderer, graphicsAvailable=true;
const buttons = ['fire', 'charge', 'angle', 'power', 'angle-number', 'power-number'];
let match = C.newMatch({}, [{name:'Player 1',type:'human'},{name:'CPU 2',type:'cpu'}], 74831);
let shot = null, elapsed = 0, mode = 'setup', paused = false, aim = {angle:45,power:60};
let bot = null, botClock = 0, thinking = false, generation = 0, lastTime = performance.now();
let charge = null, clock = 0, impactSound = false, hostState = null, bridgeToken = null;
let replayResolve = null, aimSentAt = 0, hostCanAim = false;let angleCarry=0,powerCarry=0;
const held = new Set();

// Web Audio Sound FX. No sound, context or autoplay until a deliberate click.
class AudioFX {
  constructor(){this.enabled=false;this.context=null;}
  async toggle(){
    try {this.context ||= new (window.AudioContext || window.webkitAudioContext)();await this.context.resume();this.enabled=!this.enabled;}
    catch {this.enabled=false;}
    $('sound').textContent=this.enabled?'Sound on':'Sound unavailable';$('sound').setAttribute('aria-pressed',String(this.enabled));
  }
  tone(freq,duration=.05,type='square',volume=.025,delay=0){
    if(!this.enabled || !this.context)return;
    const ctx=this.context,t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+duration);
  }
  noise(duration,cutoff,volume){
    if(!this.enabled || !this.context)return;
    const ctx=this.context,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buffer;f.type='lowpass';f.frequency.setValueAtTime(cutoff,ctx.currentTime);f.frequency.exponentialRampToValueAtTime(65,ctx.currentTime+duration);g.gain.value=volume;s.connect(f);f.connect(g);g.connect(ctx.destination);s.start();
  }
  tick(){this.tone(400,.025,'square',.008);}
  fire(){this.noise(.17,750,.17);this.tone(90,.18,'triangle',.18);}
  explode(){this.noise(.65,1700,.24);this.tone(48,.5,'sawtooth',.09);}
  victory(){[262,330,392,523,392,523].forEach((f,i)=>this.tone(f,.16,'square',.045,i*.13));}
}
const audio = new AudioFX();
function chooseView(value=$('display-mode').value){
  renderer?.dispose?.();
  if(value!=='classic'&&graphicsAvailable){
    try{
      renderer=new Tanx3D.Renderer3D($('arena'),{camera:value,onLost:()=>{
        graphicsAvailable=false;chooseView('classic');
      }});
      $('display-mode').value=value;$('render-note').textContent=value==='side'?'3D TERRAIN · SIDE CAMERA':'3D TERRAIN · SCENIC CAMERA';return;
    }catch{
      graphicsAvailable=false;
      // A failed WebGL constructor may have attached a layer before failing.
      document.querySelectorAll('.terrain-3d').forEach(layer=>layer.remove());
      $('arena').parentElement.classList.remove('is-3d');
    }
  }
  renderer=new C.Renderer($('arena'),TanxSprites);$('display-mode').value='classic';
  $('render-note').textContent=graphicsAvailable?'CLASSIC 2D · SIDE CAMERA':'CLASSIC 2D · WEBGL UNAVAILABLE';
  if(!graphicsAvailable)for(const option of $('display-mode').options)if(option.value!=='classic')option.disabled=true;
}
$('display-mode').onchange=()=>{chooseView();$('arena').focus();};
function log(text){const p=document.createElement('p');p.textContent=text;$('log').prepend(p);while($('log').children.length>30)$('log').lastChild.remove();}
function status(text){$('status').textContent=text;}
function canAim(){return !paused && mode==='aim' && match.arena.tanks[match.arena.active]?.type==='human';}
function send(type,payload={}){if(embedded&&bridgeToken)window.parent.postMessage({source:'tanx-child',token:bridgeToken,type,...payload},location.origin);}
function refresh(){
  const a=shot&&mode==='flight'&&elapsed<shot.duration?shot.before:match.arena,tank=a.tanks[a.active];
  $('active-name').textContent=tank?.name||'Round complete';
  $('active-name').style.color=tank?.colour;
  const activePortrait=$('active-portrait');activePortrait.src=TanxSprites[a.active%TanxSprites.length];activePortrait.alt='';
  $('unit-state').textContent=tank?.hp>0?`${tank.hp} HP · ${tank.type==='cpu'?'CPU COMMANDER':'HUMAN COMMANDER'}`:'VEHICLE DISABLED';
  $('round-label').textContent=`ROUND ${String(match.round).padStart(2,'0')} / FIRST TO ${match.config.roundsToWin}`;
  $('wind-readout').textContent=a.wind===0?'CALM':`${a.wind<0?'←':'→'} ${Math.abs(a.wind)} px/s²`;
  $('roster').replaceChildren(...a.tanks.map((t,i)=>{
    const card=document.createElement('div');card.className=`tank-card ${i===a.active?'active':''}`;card.style.setProperty('--tank',t.colour);
    const name=document.createElement('div');name.className='tank-name';name.textContent=`${i+1} / ${t.name}${t.type==='cpu'?' · CPU':''}`;
    const portrait=document.createElement('img');portrait.className='tank-portrait';portrait.src=TanxSprites[i%TanxSprites.length];portrait.alt='';
    const hp=document.createElement('div');hp.className='hp';const fill=document.createElement('span');fill.style.width=`${t.hp}%`;hp.append(fill);
    const stats=document.createElement('div');stats.className='stats';stats.textContent=`${t.hp>0?`${t.hp} HP`:'OUT'}     ${match.wins[i]} WIN${match.wins[i]===1?'':'S'}`;card.append(name,portrait,hp,stats);return card;
  }));
  updateAim(false); setControls();
}
function setControls(){for(const id of buttons)$(id).disabled=!canAim();document.querySelectorAll('[data-adjust]').forEach(b=>b.disabled=!canAim());$('pause').disabled=mode==='setup';$('pause').textContent=paused?'Resume':'Pause';}
function updateAim(sound=true){
  aim.angle=Math.round(C.clamp(Number(aim.angle)||0,0,180));aim.power=Math.round(C.clamp(Number(aim.power)||0,0,100));
  $('angle').value=$('angle-number').value=aim.angle;$('power').value=$('power-number').value=aim.power;
  $('angle-value').textContent=`${aim.angle}°`;$('power-value').textContent=`${aim.power}%`;
  if(sound)audio.tick();
  if(embedded){send('aim',{angle:aim.angle,power:aim.power});aimSentAt=performance.now();}
}
function readyTurn(){
  shot=null;elapsed=0;charge=null;held.clear();bot=null;thinking=false;botClock=0;generation++;
  if(match.finished){mode='match-over';showRound(true);return;}
  const tank=match.arena.tanks[match.arena.active];aim={angle:tank.angle,power:tank.power};
  mode=tank.type==='cpu'?'cpu':'aim';
  status(`${tank.name} ${mode==='cpu'?'is calculating a shot…':'— aim, set power, fire.'}`);refresh();
}
function showRound(final=false){
  const b=$('round-banner');b.hidden=false;b.replaceChildren();status(final?'Match complete. Set up a new challenge.':'Round complete. Ready for a fresh battlefield?');
  const text=document.createElement('div');const winner=final?match.winner:shot?.winner;
  text.textContent=winner==null?'ROUND DRAW · Equal health. Nobody gets a round point.':`${match.players[winner].name} ${final?'WINS THE MATCH!':'wins the round.'}`;b.append(text);
  const next=document.createElement('button');next.className='primary';next.textContent=final?'Set up a new match →':'Next round · new terrain →';
  next.onclick=()=>{b.hidden=true;if(final)openSetup();else {match=C.nextRound(match);readyTurn();}};b.append(next);setControls();
  if(winner!=null)audio.victory();
}
function finishShot(){
  const completed=shot;match.arena=completed.after;
  if(embedded){mode=hostCanAim?'aim':'watch';shot=null;if(hostState)match=structuredClone(hostState);refresh();send('replay-ended');replayResolve?.();replayResolve=null;return;}
  if(completed.over){mode=match.finished?'match-over':'round-over';showRound(match.finished);refresh();}
  else readyTurn();
}
function fire(){
  if(embedded || (!canAim()&&mode!=='cpu') || paused)return;
  const tank=match.arena.tanks[match.arena.active];
  const result=C.playMatch(match,aim.angle,aim.power);match=result.match;shot=result.replay;
  elapsed=0;impactSound=false;mode='flight';held.clear();charge=null;
  status(`${tank.name} fires · ${aim.angle}° / ${aim.power}%`);log(`${tank.name}: ${aim.angle}° / ${aim.power}% · wind ${shot.before.wind}.`);audio.fire();refresh();
}
function openSetup(){if(embedded)return;generation++;bot=null;thinking=false;held.clear();charge=null;paused=true;setControls();$('setup').showModal();}
function populatePlayers(){
  const old=[...$('player-setup').querySelectorAll('.player-setup')].map(row=>({name:row.querySelector('input').value,type:row.querySelector('select').value}));
  $('player-setup').replaceChildren(...Array.from({length:Number($('player-count').value)},(_,i)=>{
    const row=document.createElement('div');row.className='player-setup';
    const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background=C.COLOURS[i];
    const name=document.createElement('input');name.maxLength=24;name.required=true;name.value=old[i]?.name||`Player ${i+1}`;name.setAttribute('aria-label',`Player ${i+1} name`);
    const type=document.createElement('select');type.setAttribute('aria-label',`Player ${i+1} type`);type.innerHTML='<option value="human">Human</option><option value="cpu">CPU</option>';type.value=old[i]?.type||(i?'cpu':'human');
    row.append(swatch,name,type);return row;
  }));
}
$('player-count').onchange=populatePlayers;populatePlayers();
$('setup-form').onsubmit=event=>{
  event.preventDefault();
  try{
    const form=new FormData(event.currentTarget), config=Object.fromEntries(form);
    for(const key of ['destructible','falling','tankCollision','terrainCollision','damage','fallDamage'])config[key]=form.has(key);
    const players=[...$('player-setup').children].map(row=>({name:row.querySelector('input').value.trim(),type:row.querySelector('select').value}));
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];match=C.newMatch(config,players,seed);generation++;paused=false;$('setup').close();$('round-banner').hidden=true;$('setup-error').textContent='';log('New match · fresh terrain, fresh chances.');readyTurn();$('arena').focus();
  }catch(error){$('setup-error').textContent=error.message;}
};
$('setup-button').onclick=openSetup;
function closeSetup(){if(mode==='setup'){status('Start a match to take command.');return;}paused=false;$('setup').close();if(mode==='cpu')bot=null;setControls();}
$('cancel-setup').onclick=()=>{if(mode==='setup'){$('setup-form').requestSubmit();}else closeSetup();};
$('setup').addEventListener('cancel',event=>{if(mode==='setup')event.preventDefault();else {paused=false;setControls();}});
$('sound').onclick=()=>audio.toggle();
function togglePause(){if(mode==='setup')return;paused=!paused;held.clear();charge=null;setControls();status(paused?'Paused. The wind can wait.':mode==='flight'?'Shell in flight…':`${match.arena.tanks[match.arena.active].name} — your turn.`);}
$('pause').onclick=togglePause;$('fire').onclick=fire;
for(const id of ['angle','power','angle-number','power-number'])$(id).oninput=event=>{if(canAim()){aim[id.startsWith('angle')?'angle':'power']=event.target.value;updateAim();}};
document.querySelectorAll('[data-adjust]').forEach(button=>button.onclick=()=>{if(!canAim())return;const [key,delta]=button.dataset.adjust.split(':');aim[key]+=Number(delta);updateAim();});
function startCharge(){if(canAim()&&!charge)charge={started:performance.now(),power:aim.power};}
function endCharge(){if(!charge)return;const heldFor=performance.now()-charge.started;if(heldFor>180){aim.power=C.clamp(charge.power+(heldFor-180)*.045,0,100);updateAim(false);}charge=null;fire();}
$('charge').onpointerdown=event=>{event.preventDefault();$('charge').setPointerCapture(event.pointerId);startCharge();};
$('charge').onpointerup=endCharge;$('charge').onpointercancel=()=>{charge=null;};
window.addEventListener('keydown',event=>{
  if(embedded||$('setup').open||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
  const key=event.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s',' '].includes(key)){event.preventDefault();if(canAim()){held.add(key);if(!event.repeat){if(key===' ')startCharge();else {if(['arrowleft','a'].includes(key))aim.angle++;if(['arrowright','d'].includes(key))aim.angle--;if(['arrowup','w'].includes(key))aim.power++;if(['arrowdown','s'].includes(key))aim.power--;updateAim(false);}}}}
  if(key==='p'&&!event.repeat)togglePause();
});
window.addEventListener('keyup',event=>{held.delete(event.key.toLowerCase());if(event.key===' '&&charge){event.preventDefault();endCharge();}});
window.addEventListener('blur',()=>{held.clear();charge=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){held.clear();charge=null;if(!embedded&&mode!=='setup'&&!paused)togglePause();}});

// Same-origin message bridge. The iframe never grades an answer, saves a score,
// or decides a network result; it only aims and renders server snapshots.
window.addEventListener('message',event=>{
  if(!embedded||event.source!==window.parent||event.origin!==location.origin||event.data?.source!=='tanx-host')return;
  const data=event.data;
  if(data.type==='init'){bridgeToken=data.token;}
  if(!bridgeToken||data.token!==bridgeToken)return;
  if(data.type==='state'||data.type==='init'){
    generation++;shot=null;elapsed=0;paused=false;hostState=data.match;hostCanAim=Boolean(data.canAim);match=structuredClone(data.match);mode=data.canAim?'aim':'watch';
    const tank=match.arena.tanks[match.arena.active];aim={angle:tank.angle,power:tank.power};$('controls').style.setProperty('display',data.canAim?'block':'none','important');
    if(data.canAim){$('fire').hidden=true;$('charge').hidden=true;$('controls').querySelector('.hint').textContent='Choose your angle and power here. Answer the question beside the battlefield, then lock your shot.';}
    $('round-banner').hidden=true;status(data.canAim?'Choose your firing solution. Answer the question to enable it.':'Waiting for the next commander.');refresh();send('ready',{angle:aim.angle,power:aim.power});send('resize',{height:document.documentElement.scrollHeight});
  }
  if(data.type==='replay'){
    shot=data.replay;elapsed=0;impactSound=false;mode='flight';paused=false;match.arena=structuredClone(shot.after);refresh();status(shot.enabled?'Shell in flight…':'Incorrect answer · shot disabled, turn passed.');
  }
  if(data.type==='skip'&&shot)finishShot();
  if(data.type==='aim'&&canAim()){aim={angle:data.angle,power:data.power};updateAim(false);}
});
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;clock+=dt;
  if(!paused){
    if(canAim()){
      const da=(held.has('arrowleft')||held.has('a')?1:0)-(held.has('arrowright')||held.has('d')?1:0);
      const dp=(held.has('arrowup')||held.has('w')?1:0)-(held.has('arrowdown')||held.has('s')?1:0);
      if(da||dp){angleCarry+=da*60*dt;powerCarry+=dp*45*dt;const a=Math.trunc(angleCarry),p=Math.trunc(powerCarry);angleCarry-=a;powerCarry-=p;aim.angle+=a;aim.power+=p;updateAim(false);}
      if(charge){const heldFor=now-charge.started;if(heldFor>180){aim.power=C.clamp(charge.power+(heldFor-180)*.045,0,100);updateAim(false);}}
    }
    if(mode==='cpu'){
      botClock+=dt;
      if(!bot&&!thinking){thinking=true;const token=generation;setTimeout(()=>{if(token!==generation)return;bot=C.planAI(match.arena,match.config);bot.start={...aim};thinking=false;},50);}
      if(bot){const t=C.clamp((botClock-.3)/1.25,0,1);aim.angle=bot.start.angle+(bot.angle-bot.start.angle)*t;aim.power=bot.start.power+(bot.power-bot.start.power)*t;updateAim(false);if(t>=1)fire();}
    }
    if(mode==='flight'&&shot){
      elapsed+=dt;
      if(!impactSound&&elapsed>=shot.duration){impactSound=true;refresh();if(shot.hit&&shot.hit.kind!=='miss')audio.explode();const damage=shot.damage.map((d,i)=>d?`${shot.before.tanks[i].name} −${d} HP`:null).filter(Boolean).join(', ');if(!embedded)log(!shot.enabled?'Question incorrect · turn passed.':damage||'No blast damage. A useful ranging shot.');}
      if(elapsed>=shot.duration+1.25)finishShot();
    }
  }
  let arena=match.arena;
  if(shot&&mode==='flight'){
    arena=structuredClone(shot.before);
    if(elapsed>=shot.duration){arena.craters=shot.after.craters;arena.tanks=shot.after.tanks.map((t,i)=>({...t,y:shot.before.tanks[i].y}));}
    arena.tanks[shot.shooter].angle=shot.angle;
  }
  const visual={time:clock,shot:mode==='flight'?shot:null,progress:elapsed,aim:mode==='aim'||mode==='cpu'?aim:null,round:match.round,wins:match.wins};
  try{renderer.draw(arena,match.config,visual);}catch(error){
    if(!renderer.dispose)throw error;
    graphicsAvailable=false;chooseView('classic');renderer.draw(arena,match.config,visual);
  }
  requestAnimationFrame(frame);
}
if(embedded)new ResizeObserver(()=>send('resize',{height:document.body.scrollHeight})).observe(document.body);
chooseView();refresh();requestAnimationFrame(frame);
if(!embedded)openSetup();else {mode='watch';send('loaded');}
})();
