import {mkdir, copyFile} from 'node:fs/promises';
await mkdir('vendor',{recursive:true});
for(const [source,target] of [
 ['pdfjs-dist/build/pdf.mjs','pdf.mjs'],['pdfjs-dist/build/pdf.worker.mjs','pdf.worker.mjs'],
 ['pdfjs-dist/LICENSE','PDFJS-LICENSE'],['mammoth/mammoth.browser.js','mammoth.browser.js'],['mammoth/LICENSE','MAMMOTH-LICENSE']
]) await copyFile(`node_modules/${source}`,`vendor/${target}`);
console.log('Document readers packaged locally.');
