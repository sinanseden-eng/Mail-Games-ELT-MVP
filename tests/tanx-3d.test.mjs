import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {Scene,OrthographicCamera,Vector3} from 'three';
import {Terrain,newMatch,resolveShot,WIDTH,HEIGHT} from '../tanx-core.mjs';
import {terrainVolume,worldPoint,makeTank,Renderer3D} from '../tanx-3d.mjs';

test('3D extrusion preserves the collision-mask perimeter including enclosed crater ceilings',()=>{
  const terrain=new Terrain(42,'mountains',4);
  terrain.carve(200,terrain.heights[200]+40,25); // An enclosed hole, not a surface dip.
  const before=terrain.data.slice(),geometry=terrainVolume(terrain),p=geometry.attributes.position;
  assert.equal(p.count%6,0);
  let exposed=0;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(terrain.solid(x,y))
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(!terrain.solid(x+dx,y+dy))exposed++;
  let covered=0;
  for(let i=0;i<p.count;i+=6){
    const x1=p.getX(i)+WIDTH/2,y1=HEIGHT-p.getY(i),x2=p.getX(i+1)+WIDTH/2,y2=HEIGHT-p.getY(i+1);
    const length=Math.abs(x2-x1)+Math.abs(y2-y1);covered+=length;
    assert.ok(length>0);assert.equal(p.getZ(i),32);assert.equal(p.getZ(i+2),-32);
    for(let step=0;step<length;step++){
      const x=Math.min(x1,x2)+(x1!==x2?step:0),y=Math.min(y1,y2)+(y1!==y2?step:0);
      const sides=y1===y2?[terrain.solid(x,y-1),terrain.solid(x,y)]:[terrain.solid(x-1,y),terrain.solid(x,y)];
      assert.notEqual(sides[0],sides[1]);
    }
  }
  assert.equal(covered,exposed);assert.deepEqual(terrain.data,before);geometry.dispose();
});

test('solid tank barrel and camera projections agree with the physics coordinate plane',()=>{
  const model=makeTank(0,'#ff6479'),tank={x:65,y:250};model.position.copy(worldPoint(tank.x,tank.y));
  const scene=new Scene();scene.add(model);
  for(const angle of [0,45,90,135,180]){
    model.userData.pivot.rotation.z=angle*Math.PI/180;scene.updateMatrixWorld(true);
    const p=model.userData.pivot.localToWorld(new Vector3(15,0,0));
    assert.ok(Math.abs(p.x-(tank.x-WIDTH/2+Math.cos(angle*Math.PI/180)*15))<1e-8);
    assert.ok(Math.abs(p.y-(HEIGHT-tank.y+10+Math.sin(angle*Math.PI/180)*15))<1e-8);
  }
  const camera=new OrthographicCamera(-360,360,225,-225,.1,3500);
  camera.position.set(65,365,950);camera.lookAt(0,190,0);camera.updateMatrixWorld();
  for(const x of [65,575]){
    const p=worldPoint(x,250).project(camera);assert.ok(p.x>-1&&p.x<1&&p.y>-1&&p.y<1);
  }
});

test('3D replay poses and camera changes do not alter shared match or replay results',()=>{
  // Exercise presentation updates without requiring a GPU in the server test runner.
  const match=newMatch({},[{name:'A'},{name:'B'}],42),shot=resolveShot(match.arena,45,80,match.config);
  const snapshot=JSON.stringify({match,shot});
  const r=Object.create(Renderer3D.prototype);r.camera=new OrthographicCamera(-360,360,225,-225,.1,3500);
  for(const mode of ['scenic','side']){
    r.setCamera(mode);for(const tank of shot.after.tanks){const p=r.project(worldPoint(tank.x,tank.y));assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
  }
  assert.equal(JSON.stringify({match,shot}),snapshot);
});

test('offline deliverable embeds 3D engine and accessible view selection without runtime imports',async()=>{
  const html=await readFile(new URL('../tanx.html',import.meta.url),'utf8');
  assert.ok(html.includes('id="tanx-3d"'));assert.ok(html.includes('aria-label="Battlefield view"'));
  assert.ok(html.includes('Classic 2D'));assert.ok(html.includes('WEBGL UNAVAILABLE'));
  assert.ok(!/<script[^>]+src=/.test(html));assert.ok(!/<script[^>]+type="module"/.test(html));
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,4);
  for(const script of scripts)assert.doesNotThrow(()=>new Script(script[1]));
});
