// Three-dimensional presentation of the authoritative 640 × 400 battle plane.
// This module never changes trajectories, damage, terrain data or match state.
import * as T from 'three';
import {Terrain, WIDTH, HEIGHT, random, clamp, paintTerrain, replayTip} from './tanx-core.mjs';

const DEPTH = 32;
const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
export function worldPoint(x,y,z=0) { return V(x-WIDTH/2,HEIGHT-y,z); }

// Extrude every exposed edge of the SAME pixel mask used by the server.
// Unlike a heightfield, this preserves crater ceilings and isolated ledges.
export function terrainVolume(terrain, depth=DEPTH) {
  const positions=[], colours=[];
  function quad(x1,y1,x2,y2) {
    const a=worldPoint(x1,y1,depth), b=worldPoint(x2,y2,depth);
    const c=worldPoint(x2,y2,-depth), d=worldPoint(x1,y1,-depth);
    const top=y1===y2&&x2>x1;
    const cut=terrain.craters.some(p => Math.abs(Math.hypot(x1-p.x,y1-p.y)-p.r)<2);
    const colour=new T.Color(cut?'#766753':top?'#9baf70':'#756e57');
    for(const p of [a,b,d,b,c,d]) { positions.push(p.x,p.y,p.z);colours.push(colour.r,colour.g,colour.b); }
  }
  // Pixel-edge runs retain exact integer boundaries while reducing triangles.
  for(let y=0;y<HEIGHT;y++)for(const top of [true,false]) {
    let run=-1;
    for(let x=0;x<=WIDTH;x++) {
      const exposed=x<WIDTH&&terrain.solid(x,y)&&!terrain.solid(x,y+(top?-1:1));
      if(exposed&&run<0)run=x;
      if(!exposed&&run>=0) { if(top)quad(run,y,x,y);else quad(x,y+1,run,y+1);run=-1; }
    }
  }
  for(let x=0;x<WIDTH;x++)for(const left of [true,false]) {
    let run=-1;
    for(let y=0;y<=HEIGHT;y++) {
      const exposed=y<HEIGHT&&terrain.solid(x,y)&&!terrain.solid(x+(left?-1:1),y);
      if(exposed&&run<0)run=y;
      if(!exposed&&run>=0) { if(left)quad(x,y,x,run);else quad(x+1,run,x+1,y);run=-1; }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

function release(root) {
  const resources=new Set();
  root.traverse(o=>{
    if(o.geometry)resources.add(o.geometry);
    for(const m of [].concat(o.material||[])) {
      resources.add(m);for(const item of Object.values(m))if(item?.isTexture)resources.add(item);
    }
  });
  for(const resource of resources)resource.dispose();root.clear();
}
function material(colour,extra={}) { return new T.MeshStandardMaterial({color:colour,roughness:.85,...extra}); }
function mesh(geometry,mat,parent,x=0,y=0,z=0) {
  const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function box(parent,mat,w,h,d,x=0,y=0,z=0) { return mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z); }
function cylinder(parent,mat,r1,r2,h,x=0,y=0,z=0,segments=12) {return mesh(new T.CylinderGeometry(r1,r2,h,segments),mat,parent,x,y,z);}

// Lightweight solid models; the large source GLBs are not downloaded at runtime.
export function makeTank(index,colour) {
  const root=new T.Group();
  const hull=material(index%2?'#8e9b79':'#b2ad8a',{metalness:.24});
  const dark=material('#263136',{metalness:.45}),metal=material('#85958b',{metalness:.6,roughness:.45});
  const team=material(colour,{metalness:.2}),rubber=material('#182226');
  const body=new T.Group();root.add(body);
  box(body,hull,16,4.2,10,0,5.6);box(body,hull,13,2.2,8.7,-.8,8.1);
  box(body,dark,18,4.3,2.6,0,2.8,5);box(body,dark,18,4.3,2.6,0,2.8,-5);
  for(const z of [-6.4,6.4])for(let i=0;i<6;i++) {
    const wheel=cylinder(body,metal,1.55,1.55,.55,-7.1+i*2.8,2.7,z);wheel.rotation.x=Math.PI/2;
    const hub=cylinder(body,dark,.65,.65,.62,-7.1+i*2.8,2.7,z+(z>0?.1:-.1));hub.rotation.x=Math.PI/2;
  }
  for(const z of [-5,5])for(let x=-8;x<=8;x+=2) {
    box(body,metal,.65,.45,2.9,x,.7,z);box(body,metal,.65,.4,2.9,x,5,z);
  }
  box(body,hull,3.5,3.2,7,-6,6.7);box(body,team,3,.65,9,4,8.6);
  const turret=cylinder(body,hull,index%2?4.2:4.6,5.1,3.3,0,9,0,10);
  cylinder(body,metal,2.4,2.4,.6,-.7,11.1,0);cylinder(body,dark,1,1,.7,2.4,11.3,0);
  box(body,team,3,1.2,.18,0,9.4,4.45);
  for(const x of [-5,4])for(const z of [-4,4])box(body,metal,.6,.6,.6,x,8.9,z);
  const antenna=cylinder(body,dark,.12,.12,8,-4,13,-3,5);antenna.rotation.z=.07;
  const pivot=new T.Group();pivot.position.set(0,10,0);root.add(pivot);
  const barrel=cylinder(pivot,metal,.75,.95,14,7,0,0,10);barrel.rotation.z=Math.PI/2;
  const muzzle=cylinder(pivot,dark,1.05,1.05,1.5,14.2,0,0,10);muzzle.rotation.z=Math.PI/2;
  const flash=mesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial({color:'#fff2b4'}),pivot,15.3,0,0);flash.visible=false;
  const marker=mesh(new T.RingGeometry(13,13.6,48),new T.MeshBasicMaterial({color:colour,side:T.DoubleSide,transparent:true,opacity:.8}),root,0,.4,0);marker.rotation.x=-Math.PI/2;
  root.userData={body,turret,pivot,flash,marker};return root;
}

function makeLandscape(seed) {
  const group=new T.Group(),rng=random(seed^0x24d119);
  const columns=90,rows=45,positions=[],colours=[],indices=[];
  const phase=rng()*6.28;
  const height=(x,z)=>{
    const distance=clamp((-z-70)/900,0,1);
    return 45+Math.pow(distance,.8)*(110+Math.sin(x/155+phase)*75+Math.sin(x/63+z/133)*27)+Math.sin(x/95+z/100)*17;
  };
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++) {
    const x=-1800+i*3600/columns,z=-72-j*1700/rows,y=height(x,z);
    positions.push(x,y,z);
    const colour=new T.Color(y>211?'#b7c6bc':y>170?'#7d9290':y>110?'#607c77':'#456f62');
    colour.multiplyScalar(.9+rng()*.18);colours.push(colour.r,colour.g,colour.b);
    if(j<rows&&i<columns) {const a=j*(columns+1)+i,b=a+1,c=a+columns+1;indices.push(a,c,b,b,c,c+1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:T.DoubleSide}),group);
  // Instanced trees and rocks keep draw calls low on classroom laptops.
  const trees=180,canopy=new T.InstancedMesh(new T.ConeGeometry(1,1,6),material('#294e45',{flatShading:true}),trees*2);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.65,.9,1,5),material('#5d5745'),trees);
  const dummy=new T.Object3D();
  for(let i=0;i<trees;i++) {
    const x=(rng()-.5)*2400,z=-100-rng()*1100,y=height(x,z),h=12+rng()*21;
    dummy.position.set(x,y+h*.18,z);dummy.scale.set(1,h*.36,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<2;j++){dummy.position.set(x,y+h*(.45+j*.25),z);dummy.scale.set(h*(.28-j*.06),h*.65,h*(.28-j*.06));dummy.updateMatrix();canopy.setMatrixAt(i*2+j,dummy.matrix);}
  }
  canopy.castShadow=true;trunks.castShadow=true;group.add(canopy,trunks);
  const rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),material('#849085',{flatShading:true}),90);
  for(let i=0;i<90;i++) {
    const x=(rng()-.5)*1800,z=-85-rng()*900,s=2+rng()*9;
    dummy.position.set(x,height(x,z)+s*.25,z);dummy.rotation.set(rng(),rng()*6,rng());dummy.scale.set(s,s*.6,s*.8);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.castShadow=true;group.add(rocks);return group;
}

export class Renderer3D {
  constructor(canvas,{onLost=()=>{},camera='scenic'}={}) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=1280;canvas.height=800;
    this.scene=new T.Scene();this.scene.fog=new T.Fog('#b1bfc0',650,2300);
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
    this.renderer.setSize(1280,800,false);this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.layer=this.renderer.domElement;this.layer.className='terrain-3d';this.layer.setAttribute('aria-hidden','true');
    this.lost=event=>{event.preventDefault();onLost();};this.layer.addEventListener('webglcontextlost',this.lost);
    canvas.before(this.layer);canvas.parentElement.classList.add('is-3d');
    this.camera=new T.OrthographicCamera(-360,360,225,-225,.1,7000);this.setCamera(camera);
    this.scene.add(new T.HemisphereLight('#dcecff','#5c6043',2.3));
    const sun=new T.DirectionalLight('#ffe1ad',3.5);sun.position.set(-300,650,250);sun.target.position.set(0,120,0);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-390,right:390,top:330,bottom:-330,near:1,far:1400});sun.shadow.normalBias=.5;sun.shadow.bias=-.00015;
    this.scene.add(sun,sun.target);
    // A shader sky stays self-contained and follows the camera without image requests.
    const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vWorld;void main(){float h=clamp((vWorld.y-80.)/1000.,0.,1.);vec3 horizon=vec3(.77,.73,.62),zenith=vec3(.18,.34,.48);gl_FragColor=vec4(mix(horizon,zenith,pow(h,.6)),1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
    // Preprocessor directives must begin on their own line in GLSL.
    skyMat.fragmentShader=skyMat.fragmentShader.replace(';#include',';\n#include');
    const sky=mesh(new T.SphereGeometry(2800,24,16),skyMat,this.scene,0,0,-200);sky.castShadow=false;sky.receiveShadow=false;
    this.sun=mesh(new T.SphereGeometry(75,24,16),new T.MeshBasicMaterial({color:'#ffe9b9',fog:false}),this.scene,-560,570,-1450);this.sun.castShadow=false;
    this.terrainRoot=new T.Group();this.scene.add(this.terrainRoot);
    this.tankRoot=new T.Group();this.scene.add(this.tankRoot);this.tanks=[];
    this.landscape=null;this.key='';this.seed=null;
    this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.shell=mesh(new T.SphereGeometry(1.7,10,8),new T.MeshBasicMaterial({color:'#fff2bf'}),this.scene);this.shell.visible=false;
    this.pathGeometry=new T.BufferGeometry();this.pathGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(4096*3),3).setUsage(T.DynamicDrawUsage));this.pathGeometry.setDrawRange(0,0);
    this.pathLine=new T.Line(this.pathGeometry,new T.LineBasicMaterial({color:'#ffe3a6',transparent:true,opacity:.8}));this.pathLine.frustumCulled=false;this.scene.add(this.pathLine);
    this.blastRoot=new T.Group();this.scene.add(this.blastRoot);
    this.fire=mesh(new T.SphereGeometry(1,16,12),new T.MeshBasicMaterial({color:'#ffb751',transparent:true,depthWrite:false}),this.blastRoot);
    this.core=mesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({color:'#fff0bf',transparent:true,depthWrite:false}),this.blastRoot);
    this.ring=mesh(new T.TorusGeometry(1,.035,6,48),new T.MeshBasicMaterial({color:'#ffe6ae',transparent:true,depthWrite:false}),this.blastRoot);this.ring.rotation.x=Math.PI/2;
    this.blastLight=new T.PointLight('#ffbd60',0,160,1);this.blastRoot.add(this.blastLight);
    this.debris=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),material('#897153'),28);this.blastRoot.add(this.debris);
    this.smoke=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial({color:'#6d7572',transparent:true,opacity:.35,depthWrite:false}),12);this.blastRoot.add(this.smoke);
    this.blastRoot.visible=false;this.lastTrace=null;
  }
  setCamera(mode) {
    this.view=mode==='side'?'side':'scenic';
    this.camera.position.set(this.view==='side'?0:65,this.view==='side'?190:365,950);
    this.camera.lookAt(0,190,0);this.camera.updateMatrixWorld();
  }
  updateTerrain(arena,config) {
    if(this.seed!==arena.seed) {
      if(this.landscape){this.scene.remove(this.landscape);release(this.landscape);}
      this.landscape=makeLandscape(arena.seed);this.scene.add(this.landscape);this.seed=arena.seed;this.lastTrace=null;
    }
    const key=JSON.stringify([arena.seed,config.terrain,arena.tanks.length,arena.craters]);if(this.key===key)return;
    release(this.terrainRoot);const terrain=new Terrain(arena.seed,config.terrain,arena.tanks.length,arena.craters);
    const surface=document.createElement('canvas');paintTerrain(surface,terrain);
    const texture=new T.CanvasTexture(surface);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.LinearFilter;
    const face=mesh(new T.PlaneGeometry(WIDTH,HEIGHT),new T.MeshStandardMaterial({map:texture,alphaTest:.5,side:T.DoubleSide,roughness:1}),this.terrainRoot,0,HEIGHT/2,DEPTH);
    face.castShadow=false;
    const back=mesh(new T.PlaneGeometry(WIDTH,HEIGHT),new T.MeshStandardMaterial({map:texture,alphaTest:.5,side:T.DoubleSide,roughness:1}),this.terrainRoot,0,HEIGHT/2,-DEPTH);
    back.castShadow=false;
    mesh(terrainVolume(terrain),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1,flatShading:true}),this.terrainRoot);
    // Recessed cross-section border makes the finite playable strip explicit.
    const stone=material('#424f4b');box(this.terrainRoot,stone,WIDTH+5,6,DEPTH*2+5,0,-4,0);
    this.key=key;
  }
  project(point) {const p=point.clone().project(this.camera);return {x:(p.x+1)*WIDTH/2,y:(1-p.y)*HEIGHT/2};}
  trace(points) {
    const attribute=this.pathGeometry.getAttribute('position'),count=Math.min(attribute.count,points.length);
    for(let i=0;i<count;i++)attribute.setXYZ(i,points[i].x,points[i].y,points[i].z);
    attribute.needsUpdate=true;this.pathGeometry.setDrawRange(0,count);
  }
  draw(arena,config,{time=0,shot=null,progress=0,aim=null,round=1,wins=[]}={}) {
    this.updateTerrain(arena,config);
    if(this.tanks.length!==arena.tanks.length) {
      release(this.tankRoot);this.tanks=arena.tanks.map((t,i)=>{const model=makeTank(i,t.colour);this.tankRoot.add(model);return model;});
    }
    const age=shot?progress-shot.duration:-1,falls=new Map(shot?.falls?.map(f=>[f.tank,f])||[]);
    arena.tanks.forEach((t,i)=>{
      const model=this.tanks[i],f=age>=0?falls.get(i):null;
      const y=f?f.from+(f.to-f.from)*Math.pow(clamp((age-.2)/.65,0,1),2):t.y;
      model.position.copy(worldPoint(t.x,y));model.visible=y<HEIGHT+12;
      const a=(aim&&i===arena.active?aim.angle:t.angle)*Math.PI/180,data=model.userData;
      data.pivot.rotation.z=a;data.body.rotation.y=Math.cos(a)<0?Math.PI:0;
      data.body.visible=t.hp>0;data.pivot.visible=t.hp>0;data.marker.visible=i===arena.active&&t.hp>0&&!shot;
      // Wrecks retain their hull instead of leaving an empty collision marker.
      if(t.hp<=0){data.body.visible=true;data.body.rotation.z=.1;data.body.position.y=-3;data.body.scale.y=.55;}
      else {data.body.rotation.z=0;data.body.position.y=0;data.body.scale.y=1;}
      data.flash.visible=shot?.shooter===i&&progress<.18;
      if(data.flash.visible)data.flash.scale.setScalar(4*(1-progress/.18));
    });
    this.shell.visible=false;
    if(shot?.path.length) {
      this.lastTrace=shot.path;const tip=replayTip(shot.path,Math.min(progress,shot.duration));
      this.shell.visible=progress<shot.duration;if(tip)this.shell.position.copy(worldPoint(tip.x,tip.y));
      const points=shot.path.slice(Math.max(0,(tip?.index||0)-90),(tip?.index||0)+1).map(p=>worldPoint(p[0],p[1]));
      if(tip)points.push(worldPoint(tip.x,tip.y));this.trace(points);this.pathLine.material.opacity=.9;
    } else if(this.lastTrace) {this.trace(this.lastTrace.map(p=>worldPoint(p[0],p[1])));this.pathLine.material.opacity=.16;}
    else this.trace([]);
    this.pathLine.visible=Boolean(shot?.path.length||this.lastTrace);
    this.blastRoot.visible=age>=0&&age<1.25&&Boolean(shot?.hit)&&shot.hit.kind!=='miss';
    if(this.blastRoot.visible)this.blast(shot,age,config.blastRadius);
    this.renderer.render(this.scene,this.camera);
    this.drawHUD(arena,{round,wins,shot,progress,time,aim});
  }
  blast(shot,age,radius) {
    this.blastRoot.position.copy(worldPoint(shot.hit.x,shot.hit.y,3));
    const size=radius*Math.sin(clamp(age/.5,0,1)*Math.PI/2),fade=clamp(1-age/.65,0,1);
    this.fire.scale.set(size,size*.9,size*.7);this.fire.material.opacity=fade*.8;
    this.core.scale.setScalar(size*.52);this.core.material.opacity=fade;
    this.ring.scale.setScalar(radius*(.5+age*2));this.ring.material.opacity=clamp(1-age/.65,0,1);
    this.blastLight.intensity=fade*300;
    const rng=random(shot.before.seed^shot.before.turn),dummy=new T.Object3D();
    this.debris.visible=!this.reduced;
    for(let i=0;i<28;i++) {
      const angle=rng()*Math.PI*2,v=25+rng()*radius*2;
      dummy.position.set(Math.cos(angle)*v*age,Math.abs(Math.sin(angle))*v*age-80*age*age,(rng()-.5)*v*age);
      dummy.rotation.set(age*5+i,age*3,age);dummy.scale.setScalar((1.2+rng()*1.8)*clamp(1-age/1.3,0,1));dummy.updateMatrix();this.debris.setMatrixAt(i,dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate=true;
    this.smoke.visible=age>.12;this.smoke.material.opacity=clamp((age-.12)*1.5,0,.4)*(1-age/1.5);
    for(let i=0;i<12;i++) {
      dummy.position.set((rng()-.5)*radius*(.5+age),age*(20+rng()*25),(rng()-.5)*radius);
      dummy.scale.setScalar((5+rng()*9)*(age+.3));dummy.rotation.set(0,i,0);dummy.updateMatrix();this.smoke.setMatrixAt(i,dummy.matrix);
    }
    this.smoke.instanceMatrix.needsUpdate=true;
  }
  drawHUD(arena,{round,wins,shot,progress,time,aim}) {
    const c=this.ctx;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,WIDTH,HEIGHT);
    c.fillStyle='#102c36e8';c.fillRect(0,0,WIDTH,29);c.fillStyle='#dfcf9b';c.font='bold 8px ui-monospace,monospace';c.textBaseline='middle';
    c.textAlign='left';c.fillText(`ROUND ${round} / TURN ${arena.turn+1}`,12,15);
    c.textAlign='center';c.fillText(`WIND ${arena.wind<0?'←':arena.wind>0?'→':'·'} ${Math.abs(arena.wind)}`,WIDTH/2,15);
    c.textAlign='right';c.fillText(wins.map((w,i)=>`P${i+1} ${w}`).join('   '),WIDTH-12,15);
    arena.tanks.forEach((tank,i)=>{
      const model=this.tanks[i];if(!model.visible)return;
      const p=this.project(model.position.clone().add(V(0,20,0)));
      const x=clamp(p.x,24,WIDTH-24),y=clamp(p.y-8,43,HEIGHT-30);
      c.fillStyle='#0b2534dc';c.fillRect(x-21,y-8,42,19);c.fillStyle=tank.colour;c.font='bold 7px ui-monospace,monospace';c.textAlign='center';c.fillText(`P${i+1} · ${tank.hp>0?tank.hp:'OUT'}`,x,y-1);
      c.fillStyle='#ffffff25';c.fillRect(x-16,y+5,32,2);c.fillStyle=tank.colour;c.fillRect(x-16,y+5,32*tank.hp/100,2);
    });
    if(shot?.path.length&&progress<shot.duration) {
      const tip=replayTip(shot.path,progress),p=this.project(worldPoint(tip.x,tip.y));
      if(p.y<38){c.fillStyle='#fff0bd';c.textAlign='center';c.fillText('↑ SHELL',clamp(p.x,30,WIDTH-30),40);}
    }
  }
  dispose() {
    this.layer.removeEventListener('webglcontextlost',this.lost);this.layer.remove();this.canvas.parentElement?.classList.remove('is-3d');
    release(this.scene);this.renderer.dispose();this.renderer.forceContextLoss();
  }
}
