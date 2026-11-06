import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,Image} from '@napi-rs/canvas';
import {readFile} from 'node:fs/promises';
import {Renderer,newMatch,planAI,resolveShot,replayTip,WIDTH,HEIGHT} from '../tanx-core.mjs';

test('projectile display interpolates between physics samples without overshooting contact',()=>{
 const path=[[10,40,0],[30,20,1],[50,40,2]],copy=structuredClone(path);
 assert.deepEqual(replayTip(path,.5),{x:20,y:30,index:0});
 assert.deepEqual(replayTip(path,10),{x:50,y:40,index:2});
 assert.equal(replayTip([],1),null);assert.deepEqual(path,copy);
});
test('high-resolution scenery, sprites, craters and falling effects never mutate game or replay state',async()=>{
 globalThis.document={createElement:()=>createCanvas(WIDTH,HEIGHT)};globalThis.Image=Image;
 const sprites=await Promise.all(['tank-a','tank-b'].map(async n=>'data:image/png;base64,'+(await readFile(new URL(`../assets/tanx/${n}.png`,import.meta.url))).toString('base64')));
 const canvas=createCanvas(1,1),renderer=new Renderer(canvas,sprites),match=newMatch({},[{name:'A'},{name:'B'},{name:'C'},{name:'D'}],42);
 await Promise.all(renderer.sprites.map(image=>image.decode()));
 const original=JSON.stringify(match),aim=planAI(match.arena,match.config,()=>.5),shot=resolveShot(match.arena,aim.angle,aim.power,match.config),replay=JSON.stringify(shot);
 assert.equal(canvas.width,WIDTH*2);assert.equal(canvas.height,HEIGHT*2);
 for(const reduced of [false,true]){
   renderer.reduced=reduced;
   renderer.draw(match.arena,match.config,{time:1,aim,wins:[0,0,0,0]});
   for(const progress of [0,.08,shot.duration/2,shot.duration+.12,shot.duration+.6,shot.duration+1.1]){
     const arena=structuredClone(shot.before);if(progress>=shot.duration){arena.craters=shot.after.craters;arena.tanks=shot.after.tanks;}
     renderer.draw(arena,match.config,{time:progress,shot,progress,wins:[0,0,0,0]});
   }
 }
 assert.equal(JSON.stringify(match),original);assert.equal(JSON.stringify(shot),replay);
 const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255);
});
