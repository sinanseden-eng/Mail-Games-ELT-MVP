export async function readQuestionDocument(file, progress = () => {}) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Use a file smaller than 10 MB.');
  const ext=file.name.split('.').pop().toLowerCase();
  if (['csv','json','txt'].includes(ext)) return {text:await file.text(),ext};
  if(ext==='docx') {
    progress('Reading Word document…');
    if(!globalThis.mammoth) await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./vendor/mammoth.browser.js';script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('The Word reader could not load. Please retry.'));};document.head.append(script);});
    const data=await file.arrayBuffer();
    const result=await globalThis.mammoth.extractRawText({arrayBuffer:data});
    // Word's automatic numbering is not part of raw paragraph text.
    const html=await globalThis.mammoth.convertToHtml({arrayBuffer:data}, {convertImage:globalThis.mammoth.images.imgElement(()=>Promise.resolve({src:''}))});
    if(/<ol[ >]/.test(html.value)) {
      const parsed=new DOMParser().parseFromString(html.value.replace(/<img\b[^>]*>/gi,''),'text/html');
      for(const list of [...parsed.querySelectorAll('ol')].reverse()) {
        const nested=Boolean(list.parentElement.closest('ol'));
        [...list.children].filter(n=>n.tagName==='LI').forEach((item,i)=>{item.prepend(document.createTextNode(nested?String.fromCharCode(65+i)+') ':(i+1)+'. '));});
      }
      for(const node of parsed.querySelectorAll('p,li,tr,h1,h2,h3,br'))node.append(document.createTextNode('\n'));
      result.value=parsed.body.textContent;
    }
    if(!result.value.trim())throw new Error('No text found. Paste OCR text from image-only documents instead.');
    return {text:result.value,ext};
  }
  if(ext==='pdf') {
    const pdfjs=await import('./vendor/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
    const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});
    let doc;
    try {
      doc=await task.promise;
      if(doc.numPages>100)throw new Error('Use a PDF with at most 100 pages.');
      const pages=[];
      for(let i=1;i<=doc.numPages;i++) {
        progress(`Reading PDF page ${i} of ${doc.numPages}…`);
        const page=await doc.getPage(i),content=await page.getTextContent();
        let text='',lastY=null;
        for(const item of content.items) {if(!('str' in item))continue;const y=item.transform[5];if(lastY!==null&&Math.abs(lastY-y)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');lastY=y;}
        pages.push(text);page.cleanup();
      }
      const text=pages.join('\n\n');
      if(text.replace(/\s/g,'').length<10)throw new Error('This PDF appears to be scanned. Run OCR or paste its text, then import again.');
      return {text,ext};
    } finally {await task.destroy();}
  }
  throw new Error('Choose PDF, Word .docx, CSV, JSON or TXT. Save older Word .doc files as .docx first.');
}
