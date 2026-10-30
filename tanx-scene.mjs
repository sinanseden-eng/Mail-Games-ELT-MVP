// Same-origin, isolated renderer for the shared self-contained game file.
export class TanxScene {
  constructor(canvas, caption, {battle,canAim=false,onAim=()=>{}}={}) {
    this.canvas=canvas;this.caption=caption;this.battle=battle;this.canAim=canAim;this.onAim=onAim;
    this.token=crypto.randomUUID();this.ready=false;this.frame=document.createElement('iframe');
    this.frame.src='tanx.html?classroom=1';this.frame.title='Tanx artillery battlefield';
    this.frame.className='tanx-match-frame';this.frame.style.cssText='width:100%;height:730px;border:0;border-radius:8px;background:#0b1b29';
    this.frame.addEventListener('load',()=>{this.ready=true;this.send('init',{match:this.battle,canAim:this.canAim});if(this.pending)this.send('replay',{replay:this.pending.replay});});
    this.listener=event=>{
      if(event.source!==this.frame.contentWindow||event.origin!==location.origin||event.data?.source!=='tanx-child'||event.data.token!==this.token)return;
      if(event.data.type==='aim'||event.data.type==='ready')this.onAim({angle:event.data.angle,power:event.data.power});
      if(event.data.type==='resize')this.frame.style.height=`${Math.max(300,Math.min(1600,Number(event.data.height)||730))}px`;
      if(event.data.type==='replay-ended'){this.pending?.resolve({cancelled:false});this.pending=null;}
    };
    window.addEventListener('message',this.listener);canvas.hidden=true;canvas.after(this.frame);
  }
  send(type,data={}){if(this.ready)this.frame.contentWindow.postMessage({source:'tanx-host',token:this.token,type,...data},location.origin);}
  setIdle({caption='Ready for the next shot.'}={}){if(this.caption)this.caption.textContent=caption;this.send('state',{match:this.battle,canAim:this.canAim});}
  playReplay(replay){this.cancelReplay();return new Promise(resolve=>{this.pending={replay,resolve};if(this.caption)this.caption.textContent=replay.caption;this.send('replay',{replay});});}
  skipReplay(){this.send('skip');this.pending?.resolve({cancelled:false});this.pending=null;}
  cancelReplay(){if(this.pending){this.pending.resolve({cancelled:true});this.pending=null;this.send('state',{match:this.battle,canAim:this.canAim});}}
  destroy(){this.cancelReplay();this.ready=false;window.removeEventListener('message',this.listener);this.frame.remove();this.canvas.hidden=false;}
}
