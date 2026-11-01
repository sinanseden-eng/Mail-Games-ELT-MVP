// Cinematic 2.5D, rendered with Canvas so the entire arena works without WebGL.
// Every solid foreground surface is drawn from the authoritative material mask.
import {WIDTH,HEIGHT,Terrain,random,clamp,replayTip,AMMO,TERRAINS} from './tanx-core.mjs';
const S=2;
function canvas(w=WIDTH,h=HEIGHT){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function image(url,loaded){const im=new Image();im.onload=loaded;im.src=url;return im;}
function ellipse(c,x,y,rx,ry,colour){c.fillStyle=colour;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function text(c,label,x,y,size=8,colour='#c5e1e3',align='left'){
  c.font=`${size>=10?'bold ':''}${size}px ui-monospace,monospace`;c.textBaseline='middle';c.textAlign=align;c.fillStyle=colour;c.fillText(label,x,y);
}
function glow(c,x,y,r,colour){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,colour);g.addColorStop(1,'#ff9b3000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}

export class Renderer {
  constructor(target,sprites=[],art={},options={}){
    this.canvas=target;target.width=WIDTH*S;target.height=HEIGHT*S;this.ctx=target.getContext('2d');
    this.surface=canvas(WIDTH*S,HEIGHT*S);this.key='';this.revision=0;this.lastTrace=null;this.seed=null;
    this.tactical=Boolean(options.tactical);this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loaded=()=>{this.key='';this.revision++;};
    this.city=image(art.city,loaded);this.desert=image(art.desert,loaded);this.atlas=image(art.materials,loaded);this.sprites=sprites.map(url=>image(url,loaded));
  }
  prepare(arena,config){
    if(this.seed!==arena.seed){this.seed=arena.seed;this.lastTrace=null;}
    const key=JSON.stringify([arena.seed,arena.craters,config.terrain,config.terrainVersion,config.arena,arena.tanks.length,this.revision]);
    if(this.key===key)return;
    this.isDesert=config.arena==='desert';this.terrain=new Terrain(arena.seed,config.terrain,arena.tanks.length,arena.craters,config.arena,config.terrainVersion??1);
    const t=this.terrain,c=this.surface.getContext('2d');c.setTransform(S,0,0,S,0,0);c.clearRect(0,0,WIDTH,HEIGHT);
    // Receding top edges give the collision plane physical depth without
    // shifting the muzzle, shell or exact contact position on that plane.
    let active=[];
    const roof=chain=>{
      if(chain.points.length<2)return;
      c.fillStyle=this.isDesert?(chain.kind===3?'#8a8069':'#b29a72'):(chain.kind===3?'#607479':chain.kind===2?'#747b7b':'#64635b');
      c.beginPath();chain.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      for(let n=chain.points.length-1;n>=0;n--)c.lineTo(chain.points[n][0]-5,chain.points[n][1]-6);c.closePath();c.fill();
    };
    for(let x=0;x<WIDTH;x++){
      const next=[];
      for(let y=40;y<HEIGHT;y++)if(t.solid(x,y)&&!t.solid(x,y-1)){
        const kind=t.materials[y*WIDTH+x]||1;
        const match=active.find(chain=>chain.kind===kind&&!chain.used&&Math.abs(chain.points.at(-1)[1]-y)<=6);
        const chain=match||{kind,points:[]};chain.used=true;chain.points.push([x,y]);next.push(chain);
      }
      for(const chain of active)if(!chain.used)roof(chain);
      for(const chain of next)chain.used=false;active=next;
    }
    active.forEach(roof);
    for(let kind=1;kind<=4;kind++){
      const layer=canvas(WIDTH*S,HEIGHT*S),l=layer.getContext('2d');l.scale(S,S);
      l.fillStyle=['','#454440','#697073','#303b40','#a29571'][kind];l.fillRect(0,0,WIDTH,HEIGHT);
      if(this.atlas.complete&&this.atlas.naturalWidth){
        const tile=canvas(256,86),tc=tile.getContext('2d'),row=this.atlas.naturalHeight/3;
        tc.drawImage(this.atlas,0,row*(Math.min(kind,3)-1),this.atlas.naturalWidth,row,0,0,256,86);
        l.fillStyle=l.createPattern(tile,'repeat');l.fillRect(0,0,WIDTH,HEIGHT);
      }
      if(this.isDesert){l.fillStyle=kind===3?'#aa805744':'#dbb87d99';l.fillRect(0,0,WIDTH,HEIGHT);}
      const shade=l.createLinearGradient(0,150,0,HEIGHT);shade.addColorStop(0,this.isDesert?'#ffe8ac15':'#b9e8f51a');shade.addColorStop(.45,'#1d232c18');shade.addColorStop(1,this.isDesert?'#20170b88':'#050a11c9');l.fillStyle=shade;l.fillRect(0,0,WIDTH,HEIGHT);
      if(kind===2){
        l.lineWidth=.6;l.strokeStyle='#111b24aa';
        for(let x=0;x<WIDTH;x+=33)for(let y=175;y<HEIGHT;y+=28){l.beginPath();l.moveTo(x,y);l.lineTo(x+8,y+5);l.lineTo(x+4,y+13);l.lineTo(x+12,y+18);l.stroke();}
      }
      if(kind===3){
        l.strokeStyle='#9abfc188';l.lineWidth=.6;
        for(let y=0;y<HEIGHT;y+=13){l.beginPath();l.moveTo(0,y);l.lineTo(WIDTH,y);l.stroke();}
        for(let x=0;x<WIDTH;x+=12)for(let y=0;y<HEIGHT;y+=17){ellipse(l,x,y,.7,.7,'#ad9e7c');l.fillStyle='#dbb15e99';l.fillRect(x+3,y+3,4,2);}
      }
      if(kind===4){l.fillStyle='#aa9366';l.fillRect(0,0,WIDTH,HEIGHT);l.strokeStyle='#5e513b';l.lineWidth=.6;for(let y=0;y<HEIGHT;y+=4)for(let x=0;x<WIDTH;x+=9){l.strokeRect(x,y,8,3);}}
      const mask=canvas(),mc=mask.getContext('2d'),pixels=mc.createImageData(WIDTH,HEIGHT);
      for(let i=0;i<t.data.length;i++)if(t.data[i]&&(t.materials[i]||1)===kind)pixels.data[i*4+3]=255;
      mc.putImageData(pixels,0,0);l.globalCompositeOperation='destination-in';l.imageSmoothingEnabled=false;l.drawImage(mask,0,0);c.drawImage(layer,0,0,WIDTH,HEIGHT);
    }
    // Highlights and scorched edges follow the remaining pixels, never the old
    // platform rectangles; moved debris is drawn in its new physical position.
    const rng=random(arena.seed^981),edges=[];
    for(let x=0;x<WIDTH;x++)for(let y=50;y<HEIGHT;y++)if(t.solid(x,y)&&!t.solid(x,y-1)){
      const kind=t.materials[y*WIDTH+x]||1;c.fillStyle=kind===3?'#a9c2bd':kind===2?'#a6a49a':'#8d8b7c';c.fillRect(x,y,1,1);
      if(kind===1&&rng()<.11)edges.push([x,y]);
    }
    for(const[x,y]of edges){c.fillStyle='#82837a';c.beginPath();c.moveTo(x-2,y+1);c.lineTo(x,y-2);c.lineTo(x+3,y);c.fill();}
    const scorch=canvas(),sc=scorch.getContext('2d');
    for(const crater of arena.craters){sc.strokeStyle='#0a0f13';sc.lineWidth=2;sc.beginPath();sc.arc(crater.x,crater.y,crater.r+.4,0,Math.PI*2);sc.stroke();}
    const mask=canvas(),mc=mask.getContext('2d'),pixels=mc.createImageData(WIDTH,HEIGHT);
    for(let i=0;i<t.data.length;i++)if(t.data[i])pixels.data[i*4+3]=255;
    mc.putImageData(pixels,0,0);sc.globalCompositeOperation='destination-in';sc.drawImage(mask,0,0);c.drawImage(scorch,0,0);
    this.key=key;
  }
  atmosphere(c,time,wind){
    if(this.tactical)return;
    const t=this.reduced?0:time;
    if(this.isDesert){
      for(let i=0;i<5;i++){const y=110+i*46;c.globalAlpha=.065;c.fillStyle='#e6c58f';c.beginPath();c.ellipse(WIDTH/2+Math.sin(t*.12+i)*wind*1.5,y,WIDTH*.8,9+i*2,0,0,Math.PI*2);c.fill();}c.globalAlpha=1;return;
    }
    for(let i=0;i<5;i++){
      const x=25+i*147,y=95+(i%3)*24;
      c.globalAlpha=.025;ellipse(c,x+Math.sin(t*.04+i)*18,y,95,15,'#aab9c2');c.globalAlpha=1;
    }
    // Receding searchlights stay behind all collidable geometry.
    c.save();c.globalCompositeOperation='screen';c.fillStyle='#9bd8ea09';
    for(const x of [170,480]){c.beginPath();c.moveTo(x,300);c.lineTo(x-35,70);c.lineTo(x-14,70);c.fill();}c.restore();
  }
  fires(c,time){
    if(this.tactical)return;
    const clock=this.reduced?0:time;
    for(let i=0;i<4;i++){
      const x=140+i*124,y=this.terrain.baseHeights[x]-2;if(!this.terrain.solid(x,y+2))continue;
      glow(c,x,y-3,21,'#fb873e28');
      for(let n=0;n<4;n++){
        const phase=(clock*.8+n*.23+i*.19)%1,px=x+Math.sin(n*2+i)*3,py=y-phase*14;
        c.globalAlpha=(1-phase)*.8;ellipse(c,px,py,1.5*(1-phase)+.4,4*(1-phase)+1,n%2?'#f5a955':'#ed6d35');
      }c.globalAlpha=1;
      if(!this.reduced)for(let n=0;n<3;n++){const u=(time*.22+n*.3+i*.17)%1;c.globalAlpha=(1-u)*.12;ellipse(c,x+u*8,y-14-u*38,4+u*8,4+u*7,'#abb5b7');}c.globalAlpha=1;
    }
  }
  tank(c,tank,index,arena,aim,shot,progress,time){
    if(tank.y>HEIGHT+8)return;
    const active=index===arena.active,a=(active&&aim?aim.angle:tank.angle)*Math.PI/180;
    const recoil=shot?.shooter===index&&progress<.19?Math.sin(progress/.19*Math.PI)*1.1:0;
    const x=tank.x-Math.cos(a)*recoil,y=tank.y,sprite=this.sprites[index%this.sprites.length];
    ellipse(c,x,y+1,15,2.3,'#00000099');
    if(tank.hp<=0){c.fillStyle='#293236';c.fillRect(x-11,y-5,22,5);c.fillStyle='#424745';c.beginPath();c.moveTo(x-8,y-5);c.lineTo(x-3,y-12);c.lineTo(x+8,y-9);c.lineTo(x+11,y-5);c.fill();glow(c,x,y-6,14,'#f17b3b33');return;}
    if(sprite?.complete&&sprite.naturalWidth){
      c.save();c.translate(x,y);if(Math.cos(a)>0)c.scale(-1,1);c.filter=this.isDesert?'sepia(1) saturate(.9) brightness(1.9)':'brightness(1.4)';c.shadowColor='#000';c.shadowBlur=3;c.drawImage(sprite,-14,-17,28,17);c.restore();
    }else{c.fillStyle='#1e3038';c.fillRect(x-11,y-5,22,5);c.fillStyle='#758080';c.fillRect(x-9,y-10,18,6);}
    const ex=x+Math.cos(a)*15,ey=y-10-Math.sin(a)*15;
    c.lineCap='round';c.strokeStyle='#101a22';c.lineWidth=3.3;c.beginPath();c.moveTo(x,y-10);c.lineTo(ex,ey);c.stroke();
    c.strokeStyle='#94a09b';c.lineWidth=1.8;c.stroke();c.strokeStyle='#e0e0b5';c.lineWidth=.5;c.stroke();c.lineCap='butt';
    ellipse(c,x,y-10,2.2,1.7,'#707b78');c.fillStyle=tank.colour;c.fillRect(x+3,y-9,4,1.1);glow(c,x+6,y-8,5,`${tank.colour}55`);
    if(active&&!shot){c.strokeStyle=tank.colour;c.lineWidth=.65;c.beginPath();c.moveTo(x-18,y+2);c.lineTo(x-18,y+5);c.lineTo(x+18,y+5);c.lineTo(x+18,y+2);c.stroke();}
    text(c,`0${index+1}`,x,y+13,6,tank.colour,'center');
    if(shot?.shooter===index&&progress<.17){
      const f=1-progress/.17;glow(c,ex,ey,15*f,'#ffb44b99');c.save();c.translate(ex,ey);c.rotate(-a);c.fillStyle='#fff1c2';c.beginPath();c.moveTo(0,-2*f);c.lineTo(12*f,0);c.lineTo(0,2*f);c.fill();c.restore();
    }
  }
  impact(c,shot,age){
    const x=shot.hit.x,y=shot.hit.y,r=shot.blastRadius||36,rng=random(shot.before.seed+shot.before.turn*89);
    if(age<.55){const u=age/.55,scale=Math.sin(u*Math.PI/2),fade=1-u;
      c.save();c.globalCompositeOperation='screen';glow(c,x,y,r*2*scale,`rgba(255,138,51,${fade*.6})`);c.restore();
      for(let i=0;i<11;i++){const a=rng()*Math.PI*2,d=rng()*r*.65*scale;ellipse(c,x+Math.cos(a)*d,y+Math.sin(a)*d-age*13,(4+rng()*r*.25)*scale,(5+rng()*r*.27)*scale,`rgba(255,${145+Math.round(rng()*75)},67,${fade*.8})`);}
      ellipse(c,x,y-age*15,r*.3*scale,r*.35*scale,`rgba(255,238,176,${fade})`);
      c.strokeStyle=`rgba(243,225,181,${fade*.5})`;c.lineWidth=1;c.beginPath();c.arc(x,y,r*(.4+u*1.6),0,Math.PI*2);c.stroke();
    }
    if(!this.reduced)for(let i=0;i<34;i++){
      const a=-Math.PI+rng()*Math.PI,v=20+rng()*r*2,life=.6+rng()*.7;if(age>life)continue;
      const px=x+Math.cos(a)*v*age,py=y+Math.sin(a)*v*age+65*age*age;
      c.globalAlpha=1-age/life;c.fillStyle=i%4?'#6b6d65':'#ffca72';c.save();c.translate(px,py);c.rotate(age*(i+1));c.fillRect(-1,-1,i%3?2:4,i%2?1:3);c.restore();
    }c.globalAlpha=1;
    if(age>.1)for(let i=0;i<9;i++){
      const d=6+age*12+rng()*7;c.globalAlpha=(1-age/1.5)*.18;ellipse(c,x+(rng()-.5)*r,y-age*(15+rng()*22),d,d*.8,'#a2a6a5');
    }c.globalAlpha=1;
    if(age<.35){const u=1-age/.35;c.save();c.globalCompositeOperation='screen';glow(c,x,y,r*.8,`rgba(255,146,43,${u*.7})`);ellipse(c,x,y,r*.2*u+2,r*.25*u+2,`rgba(255,234,171,${u*.8})`);c.restore();}
    if(shot.structureFalls?.some(f=>f.cells>12))text(c,'SUPPORT COLLAPSE',x,Math.max(78,y-r-16),7,'#ffc073','center');
  }
  hud(c,arena,config,{aim,round,wins,shot}){
    const top=c.createLinearGradient(0,0,0,70);top.addColorStop(0,'#07121ae8');top.addColorStop(1,'#07121a00');c.fillStyle=top;c.fillRect(0,0,WIDTH,70);
    const players=arena.tanks.length;
    arena.tanks.forEach((tank,i)=>{
      const width=players===2?154:104,x=players===2?(i===0?15:WIDTH-15-width):15+i*(WIDTH-30)/players,y=17;
      c.strokeStyle=`${tank.colour}88`;c.lineWidth=.6;c.strokeRect(x,y,width,26);
      c.fillStyle='#08131bd9';c.fillRect(x+1,y+1,width-2,24);c.fillStyle='#e3f5ee22';c.fillRect(x+6,y+7,width-12,5);c.fillStyle=tank.colour;c.fillRect(x+6,y+7,(width-12)*tank.hp/100,5);
      text(c,`${tank.name.slice(0,16).toUpperCase()} ${tank.type==='cpu'?' / AI':''}`,x+6,y+20,6.5,tank.colour);text(c,String(tank.hp),x+width-6,y+20,7,tank.colour,'right');
    });
    if(players===2){
      const x=WIDTH/2;for(let n=-3;n<=3;n++){c.strokeStyle='#a7e0e355';c.lineWidth=.6;c.beginPath();c.moveTo(x+n*7,19+Math.abs(n));c.lineTo(x+n*7,23+Math.abs(n));c.stroke();}
      const dir=clamp(arena.wind/35,-1,1)*23;c.strokeStyle='#9ce3e6';c.beginPath();c.moveTo(x,30);c.lineTo(x+dir,30);c.stroke();
      text(c,`WIND ${arena.wind<0?'←':arena.wind>0?'→':'·'} ${Math.abs(arena.wind)}`,x,42,7,'#a9d8de','center');
    }
    const tank=arena.tanks[arena.active],angle=aim?.angle??shot?.angle??tank.angle,power=aim?.power??shot?.power??tank.power,ammo=aim?.ammo??shot?.ammo??tank.ammo??'standard';
    c.fillStyle='#08151ce8';c.fillRect(0,HEIGHT-31,WIDTH,31);c.fillStyle='#7adce455';c.fillRect(0,HEIGHT-31,WIDTH,.5);
    text(c,`R${String(round).padStart(2,'0')} / T${String(arena.turn+1).padStart(2,'0')}`,14,HEIGHT-21,7,'#8da8b4');
    text(c,TERRAINS[config.terrain]?.name.toUpperCase()||'TERRAIN',14,HEIGHT-10,5.5,'#8da8b4');
    text(c,'SHOT POWER',125,HEIGHT-22,6,'#b2d4d8');c.fillStyle='#42606c';c.fillRect(125,HEIGHT-15,125,4);c.fillStyle='#a3e5e3';c.fillRect(125,HEIGHT-15,power*1.25,4);text(c,`${power}%`,257,HEIGHT-13,8,'#d9f3f0');
    text(c,`ANGLE ${angle}°`,315,HEIGHT-16,8,'#a5dfe1');text(c,AMMO[ammo]?.name.toUpperCase()||'STANDARD',415,HEIGHT-16,7,'#c7b48b');
    text(c,wins.map((w,i)=>`P${i+1} ${w}`).join(' / '),WIDTH-14,HEIGHT-16,7,'#9fb1b9','right');
  }
  draw(arena,config,{time=0,shot=null,progress=0,aim=null,round=1,wins=[]}={}){
    this.prepare(arena,config);const c=this.ctx;c.setTransform(S,0,0,S,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=true;
    c.fillStyle='#13222e';c.fillRect(0,0,WIDTH,HEIGHT);
    const background=this.isDesert?this.desert:this.city;if(background.complete&&background.naturalWidth)c.drawImage(background,0,0,WIDTH,HEIGHT);
    c.fillStyle=this.isDesert?'#6a431208':'#07121b20';c.fillRect(0,0,WIDTH,HEIGHT);this.atmosphere(c,time,arena.wind);
    const age=shot?progress-shot.duration:-1;c.save();
    if(!this.reduced&&!this.tactical&&age>=0&&age<.25&&shot.hit?.kind!=='miss')c.translate(Math.sin(age*70)*(1-age/.25),Math.cos(age*51)*(1-age/.25)*.6);
    c.drawImage(this.surface,0,0,WIDTH,HEIGHT);this.fires(c,time);
    if(shot?.path.length)this.lastTrace=shot.path;
    if(!shot&&this.lastTrace){c.strokeStyle='#c8e5dd38';c.lineWidth=.7;c.setLineDash([1,4]);c.beginPath();this.lastTrace.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.setLineDash([]);}
    arena.tanks.forEach((tank,i)=>{
      let t=tank;const fall=age>=0?shot.falls?.find(f=>f.tank===i):null;
      if(fall){const u=clamp((age-.15)/.65,0,1);t={...tank,y:fall.from+(fall.to-fall.from)*u*u};}
      this.tank(c,t,i,arena,aim,shot,progress,time);
    });
    if(shot?.path.length){
      const tip=replayTip(shot.path,Math.min(progress,shot.duration)),start=Math.max(0,tip.index-65);
      for(let i=start+1;i<=tip.index;i++){const u=(i-start)/Math.max(1,tip.index-start);c.strokeStyle=`rgba(255,223,169,${.12+u*.7})`;c.lineWidth=.6+u*.5;c.beginPath();c.moveTo(shot.path[i-1][0],shot.path[i-1][1]);c.lineTo(shot.path[i][0],shot.path[i][1]);c.stroke();}
      if(progress<shot.duration){if(tip.y<59)text(c,'▲ SHELL',clamp(tip.x,35,WIDTH-35),61,7,'#ffdc9d','center');else {glow(c,tip.x,tip.y,7,'#ffc46a88');ellipse(c,tip.x,tip.y,1.5,1.5,'#fff1c9');}}
      if(age>=0&&age<1.25&&shot.hit?.kind!=='miss')this.impact(c,shot,age);
    }
    c.restore();
    const vignette=c.createRadialGradient(WIDTH/2,HEIGHT*.45,WIDTH*.2,WIDTH/2,HEIGHT*.45,WIDTH*.63);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#020914a0');c.fillStyle=vignette;c.fillRect(0,0,WIDTH,HEIGHT);
    this.hud(c,arena,config,{aim,round,wins,shot});
  }
  dispose(){this.key='';}
}
