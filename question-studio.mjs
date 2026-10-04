import { cleanQuestion, validateQuestion, parseCsv, parsePoolJson, parseQuestionText, DOCUMENT_EXAMPLE, normal } from './question-import.mjs';
import { readQuestionDocument } from './document-reader.mjs';
import { poolStore } from './question-pools.mjs';
let studioEvents;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export function initQuestionStudio({getQuestions,saveQuestions,refreshQuestionList,showToast}) {
  studioEvents?.abort();studioEvents=new AbortController();
  getQuestions();
  const controls=document.getElementById('pool-controls'), review=document.getElementById('import-review'),status=document.getElementById('import-status'),fileInput=document.getElementById('question-file');
  function resetEditor(){const form=document.getElementById('question-form');form.reset();delete form.dataset.editId;form.elements.type.dispatchEvent(new Event('change'));form.querySelector('[type="submit"]').textContent='Add question';}
  function pools(){
    controls.replaceChildren();const data=poolStore.list();
    const label=el('label','Active question pool');const select=el('select');select.id='active-pool';
    data.pools.forEach(p=>{const option=el('option',`${p.name} (${p.questions.length})`);option.value=p.id;select.append(option);});select.value=data.activeId;label.append(select);controls.append(label);
    const note=el('p','Used for new classroom turns and new email matches. Matches already sent keep their original questions.','import-hint');controls.append(note);
    select.onchange=()=>{try{poolStore.select(select.value);resetEditor();refreshQuestionList();showToast('Active pool changed.');}catch{showToast('Could not change pools. Export a backup and check browser storage.');}pools();};
    const actions=el('div',null,'pool-actions');
    for(const [text,fn] of [['New pool',()=>{const name=prompt('Name the new question pool:');if(name?.trim())poolStore.create(name,[]);} ],['Rename pool',()=>{const current=poolStore.list();const name=prompt('Pool name:',current.pools.find(p=>p.id===current.activeId).name);if(name?.trim())poolStore.rename(name);} ]]) {
      const b=el('button',text,'secondary');b.type='button';b.onclick=()=>{try{fn();resetEditor();pools();refreshQuestionList();}catch{showToast('Could not save the pool. Export a backup before adding more.');}};actions.append(b);
    }controls.append(actions);
  }
  pools();document.addEventListener('pools-changed',pools,{signal:studioEvents.signal});
  document.getElementById('download-text-template').onclick=()=>{const a=el('a');a.href=URL.createObjectURL(new Blob([DOCUMENT_EXAMPLE],{type:'text/plain'}));a.download='question-document-example.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  let drafts=[],index=0,source='',filename='',ticket=0;
  function renderReview(){
    review.hidden=false;review.replaceChildren();
    review.append(el('h3',`Review ${drafts.length} question${drafts.length===1?'':'s'}`));
    review.append(el('p','Check wording, options and answers. Nothing enters your pool until you save. Uncheck any question you do not want.','import-hint'));
    const raw=el('details');raw.append(el('summary','Inspect or fix extracted text'));const text=el('textarea');text.rows=10;text.value=source;text.setAttribute('aria-label','Extracted document text');raw.append(text);
    const reparse=el('button','Re-read edited text','secondary');reparse.type='button';reparse.onclick=()=>{source=text.value;try{drafts=loadDrafts(source,filename.split('.').pop().toLowerCase());index=0;renderReview();}catch(e){status.textContent=e.message;}};raw.append(reparse);review.append(raw);
    if(!drafts.length){review.append(el('p','No questions found. Add numbered questions to the extracted text above.'));return;}
    const navigation=el('div',null,'review-navigation');const previous=el('button','← Previous','secondary'),next=el('button','Next →','secondary'),counter=el('strong',`${index+1} / ${drafts.length}`);previous.type=next.type='button';previous.disabled=index===0;next.disabled=index===drafts.length-1;previous.onclick=()=>{index--;renderReview();};next.onclick=()=>{index++;renderReview();};navigation.append(previous,counter,next);review.append(navigation);
    const draft=drafts[index],q=draft.question;const include=el('label',null,'include-question');const cb=el('input');cb.type='checkbox';cb.checked=draft.include;include.append(cb,document.createTextNode(' Include this question'));review.append(include);
    const editor=el('div',null,'import-editor');review.append(editor);
    function field(name,label,{multiline=false,choices=null}={}) {
      const wrap=el('label',label);let input=el(choices?'select':multiline?'textarea':'input');input.dataset.field=name;
      if(choices)choices.forEach(value=>{const o=el('option',value);o.value=value;input.append(o);});
      if(multiline)input.rows=name==='options'?5:3;
      input.value=name==='options'?q.options.join('\n'):q[name];input.oninput=()=>{q[name]=name==='options'?input.value.split('\n').map(x=>x.trim()).filter(Boolean):input.value;update();};wrap.append(input);editor.append(wrap);return input;
    }
    field('prompt','Question',{multiline:true});const type=field('type','Question type',{choices:['multiple-choice','true-false','gap-fill']});
    const options=field('options','Options — one per line (up to 5)',{multiline:true});
    field('answer','Correct answer — use the full option text');field('explanation','Explanation (optional)',{multiline:true});field('level','Level',{choices:['A1','A2','B1','B2','C1','C2']});field('tag','Topic / tag');
    const issues=el('p',null,'import-issues');issues.setAttribute('role','status');review.append(issues);
    const destination=el('label','Save to');const dest=el('select');dest.id='import-destination';for(const [value,label] of [['new','A new question pool'],['current','The active pool (add questions)']]){const o=el('option',label);o.value=value;dest.append(o);}destination.append(dest);review.append(destination);
    const nameWrap=el('label','New pool name'),name=el('input');name.id='import-pool-name';name.value=filename.replace(/\.[^.]+$/,'')||'Imported questions';name.maxLength=100;nameWrap.append(name);review.append(nameWrap);dest.onchange=()=>nameWrap.hidden=dest.value!=='new';
    const summary=el('p');review.append(summary);const save=el('button','Save reviewed questions','primary full');save.id='save-import';save.type='button';review.append(save);
    function update(){options.closest('label').hidden=q.type==='gap-fill';issues.textContent=validateQuestion(q).join(' ');const selected=drafts.filter(d=>d.include),invalid=selected.filter(d=>validateQuestion(d.question).length).length;summary.textContent=`${selected.length} selected · ${invalid} need correction`;save.disabled=!selected.length||invalid>0;}
    cb.onchange=()=>{draft.include=cb.checked;update();};type.onchange=()=>{if(q.type==='true-false'){q.options=['True','False'];options.value='True\nFalse';}update();};
    save.onclick=()=>{
      const selected=drafts.filter(d=>d.include).map(d=>({...cleanQuestion(d.question),id:crypto.randomUUID()}));
      if(!selected.length||selected.some(q=>validateQuestion(q).length))return;
      try {
        const existing=dest.value==='current'?getQuestions():[];const seen=new Set(existing.map(q=>normal(q.prompt)+'|'+normal(q.answer)));
        const unique=selected.filter(q=>{const key=normal(q.prompt)+'|'+normal(q.answer);if(seen.has(key))return false;seen.add(key);return true;});
        if(!unique.length){status.textContent='All selected questions already exist in this pool.';return;}
        if(dest.value==='new')poolStore.create(name.value,unique);else saveQuestions([...existing,...unique]);
        review.hidden=true;review.replaceChildren();pools();refreshQuestionList();resetEditor();status.textContent=`Saved ${unique.length} questions. ${selected.length-unique.length} duplicate(s) skipped.`;
      } catch {status.textContent='Could not save: browser storage may be full. Export your current pool first. Your reviewed questions are still here.';}
    };update();
  }
  function loadDrafts(text,ext){const qs=ext==='json'?parsePoolJson(text):ext==='csv'?parseCsv(text):parseQuestionText(text);if(qs.length>500)throw new Error('Import up to 500 questions at a time.');return qs.map(question=>({question,include:true}));}
  fileInput.onchange=async()=>{
    const file=fileInput.files?.[0];if(!file)return;const current=++ticket;fileInput.disabled=true;review.hidden=true;status.textContent='Reading your file…';
    try {const result=await readQuestionDocument(file,message=>{if(status.isConnected)status.textContent=message;});if(current!==ticket||!review.isConnected)return;source=result.text;filename=file.name;drafts=loadDrafts(source,result.ext);index=0;status.textContent='File read. Review the questions below.';renderReview();}
    catch(error){if(status.isConnected)status.textContent=`Import could not finish: ${error.message}`;}
    finally{fileInput.disabled=false;fileInput.value='';}
  };
}
