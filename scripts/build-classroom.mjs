import {build} from 'esbuild';
await build({stdin:{contents:'export * from "@netlify/identity";',resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',outfile:'vendor/identity.mjs',minify:true});
console.log('Classroom account client packaged locally.');
