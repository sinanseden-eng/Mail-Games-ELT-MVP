import {build} from 'esbuild';
await build({stdin:{contents:'export * from "@netlify/identity";',resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',outfile:'vendor/identity.mjs',minify:true});
console.log('Classroom account client packaged locally.');

await build({entryPoints:['football-3d/view.mjs'],bundle:true,format:'esm',platform:'browser',outfile:'vendor/football-three.mjs',minify:true});
console.log('Football player renderer packaged locally.');
