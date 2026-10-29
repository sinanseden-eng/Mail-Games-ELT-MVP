import {readFile,writeFile} from 'node:fs/promises';
const core=await readFile('tanx-core.mjs','utf8');
const names=[...core.matchAll(/export (?:const|function|class) (\w+)/g)].map(m=>m[1]);
// WIDTH/HEIGHT/STEP share a declaration; export the additional names explicitly.
names.push('HEIGHT','STEP');
const engine=`<script id="tanx-engine">\nconst TanxCore=(()=>{\n${core.replaceAll('export ','')}\nreturn {${names.join(',')}};\n})();\n</script>`;
const sprites=await Promise.all(['tank-a','tank-b'].map(async name=>`data:image/png;base64,${(await readFile(`assets/tanx/${name}.png`)).toString('base64')}`));
const spriteScript=`<script>const TanxSprites=${JSON.stringify(sprites)};</script>`;
const html=(await readFile('tanx.template.html','utf8')).replace('<!-- TANX_ENGINE -->',engine).replace('<!-- TANX_SPRITES -->',spriteScript).replace('<!-- TANX_UI -->',`<script id="tanx-ui">\n${await readFile('tanx-ui.js','utf8')}\n</script>`);
await writeFile('tanx.html',html);console.log(`Tanx offline file: ${Buffer.byteLength(html)} bytes, no external dependencies.`);
