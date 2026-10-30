import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const core=await readFile('tanx-core.mjs','utf8');
const names=[...core.matchAll(/export (?:const|function|class) (\w+)/g)].map(m=>m[1]);
// WIDTH/HEIGHT/STEP share a declaration; export the additional names explicitly.
names.push('HEIGHT','STEP');
const engine=`<script id="tanx-engine">\nconst TanxCore=(()=>{\n${core.replaceAll('export ','')}\nreturn {${names.join(',')}};\n})();\n</script>`;
const sprites=await Promise.all(['tank-a','tank-b'].map(async name=>`data:image/png;base64,${(await readFile(`assets/tanx/${name}.png`)).toString('base64')}`));
const spriteScript=`<script>const TanxSprites=${JSON.stringify(sprites)};</script>`;
const three=await build({entryPoints:['tanx-3d.mjs'],bundle:true,format:'iife',globalName:'Tanx3D',platform:'browser',target:'es2022',minify:true,write:false,legalComments:'inline'});
const graphics=`<script id="tanx-3d">${three.outputFiles[0].text.replaceAll('</script','<\\/script')}</script>`;
const ui=`<script id="tanx-ui">\n${await readFile('tanx-ui.js','utf8')}\n</script>`;
// Function replacements keep literal $& and $` tokens inside bundled code intact.
const html=(await readFile('tanx.template.html','utf8')).replace('<!-- TANX_ENGINE -->',()=>engine).replace('<!-- TANX_SPRITES -->',()=>spriteScript).replace('<!-- TANX_3D -->',()=>graphics).replace('<!-- TANX_UI -->',()=>ui);
const output=html.replace(/[\t ]+$/gm,'');
await writeFile('tanx.html',output);console.log(`Tanx offline file: ${Buffer.byteLength(output)} bytes, no external dependencies.`);
