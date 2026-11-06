// Teasers use the production game renderers and a disposable sample result.
// Nothing here submits answers, writes match state, or plays sound.
const GAMES = {
  football:{title:'Football / The Penalty Club',href:'football.html'},
  tanx:{title:'Tanx / Fracture Arenas',href:'tanx.html'},
  sniper:{title:'Sniper / The Prediction Duel',href:'#play'}
};

export function initHomeTeasers(root, openDemo = () => {}) {
  const dialog=root.querySelector('.game-teaser-dialog');
  const canvas=dialog.querySelector('canvas'),caption=dialog.querySelector('#teaser-caption');
  const replay=dialog.querySelector('[data-replay-teaser]');
  const play=dialog.querySelector('[data-teaser-play-link]');
  let scene=null, generation=0, selected=null, disposed=false;
  const stop=()=>{generation++;scene?.destroy();scene=null;};
  async function watch(game) {
    const info=GAMES[game];if(!info||disposed)return;
    stop();const ticket=generation;selected=game;
    dialog.querySelector('#teaser-title').textContent=info.title;
    caption.textContent='Getting the game ready…';replay.disabled=true;
    play.href=info.href;
    if(game==='sniper')play.dataset.game='sniper';else delete play.dataset.game;
    if(!dialog.open)dialog.showModal();
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      let preview,result;
      if(game==='football') {
        const {ShootoutScene}=await import('./football-player.mjs');
        if(ticket!==generation||disposed)return;
        preview=new ShootoutScene(canvas,caption,{reducedMotion});
        result={outcome:'goal',shotZone:'top-left',keeperZone:'bottom-right',caption:'GOAL. The ball stretches the net, then drops.'};
      } else if(game==='sniper') {
        const {SniperScene}=await import('./sniper-scene.mjs');
        if(ticket!==generation||disposed)return;
        preview=new SniperScene(canvas,caption,{reducedMotion});
        result={emergenceA:'rooftop',emergenceB:'broken-wall',targetA:'broken-wall',targetB:'supply-crates',activeA:true,activeB:true,hitByA:true,hitByB:false,round:1,healthA:3,healthB:2,caption:'A correct prediction. Your next move is yours to choose.'};
      } else {
        const [{Renderer},core]=await Promise.all([import('./tanx-industrial.mjs'),import('./tanx-core.mjs')]);
        if(ticket!==generation||disposed)return;
        preview=new TanxTeaser(canvas,caption,Renderer,core);
      }
      scene=preview;
      await preview.playReplay(result);
      if(ticket===generation&&!disposed)replay.disabled=false;
    } catch {
      if(ticket===generation&&!disposed){scene?.destroy();scene=null;caption.textContent='The teaser could not load. You can still open the game below.';replay.disabled=false;}
    }
  }
  const close=()=>{stop();if(dialog.open)dialog.close();};
  const click=event=>{
    const button=event.target.closest('[data-teaser]');
    if(button){void watch(button.dataset.teaser);return;}
    if(event.target.closest('[data-close-teaser]'))close();
    if(event.target.closest('[data-replay-teaser]')&&selected)void watch(selected);
    if(event.target.closest('[data-explore-games]'))root.querySelector('#games').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    if(event.target.closest('[data-teaser-play-link]')) {
      if(selected==='sniper'){event.preventDefault();openDemo('sniper');}
      close();
    }
  };
  const outside=event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}};
  root.addEventListener('click',click);dialog.addEventListener('click',outside);dialog.addEventListener('close',stop);
  return()=>{disposed=true;root.removeEventListener('click',click);dialog.removeEventListener('click',outside);dialog.removeEventListener('close',stop);close();};
}

class TanxTeaser {
  constructor(canvas,caption,Renderer,core) {
    this.core=core;this.caption=caption;this.done=null;this.destroyed=false;
    this.renderer=new Renderer(canvas,['assets/tanx/tank-a.png','assets/tanx/tank-b.png'],{city:'assets/tanx/industrial-city.webp',desert:'assets/tanx/desert-frontier.webp',materials:'assets/tanx/industrial-materials.webp'});
  }
  async playReplay() {
    const {newMatch,planAI,resolveShot}=this.core;
    const match=newMatch({arena:'industrial',terrain:'rolling',windMode:'off'},[{name:'Player 1'},{name:'Player 2'}],42);
    const aim=planAI(match.arena,match.config,()=>.5);
    const shot=resolveShot(match.arena,aim.angle,aim.power,match.config,true,'breach');
    await Promise.allSettled([this.renderer.city,this.renderer.atlas,...this.renderer.sprites].map(image=>image.decode()));
    if(this.destroyed)return;
    this.caption.textContent='Judge the arc. Fire across the hills.';
    return new Promise(resolve=>{
      this.done=resolve;let elapsed=0,last=null;
      const tick=now=>{
        if(this.destroyed)return;
        if(last!==null)elapsed+=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
        const progress=Math.max(0,elapsed-.6);
        const arena=progress<shot.duration?shot.before:shot.after;
        this.renderer.draw(arena,match.config,{time:elapsed,aim,shot:elapsed<.6?null:shot,progress,round:1,wins:[0,0]});
        if(progress>=shot.duration)this.caption.textContent='A crater changes the cover. The next turn begins.';
        if(progress>=shot.duration+1.6){this.done=null;resolve();return;}
        this.frame=requestAnimationFrame(tick);
      };
      this.frame=requestAnimationFrame(tick);
    });
  }
  destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);this.done?.({cancelled:true});this.done=null;this.renderer.dispose();}
}
