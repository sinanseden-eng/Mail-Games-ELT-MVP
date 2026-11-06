import { cleanQuestion, validateQuestion, parseCsv, parsePoolJson, parseQuestionText, DOCUMENT_EXAMPLE, normal } from './question-import.mjs';
import { readQuestionDocument } from './document-reader.mjs';
import { poolStore } from './question-pools.mjs';
let studioEvents;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};

export function setStudioPanel(id, {focus = true} = {}) {
  const target = document.getElementById(id);
  if (!target?.hasAttribute('data-studio-panel')) return;
  document.querySelectorAll('[data-studio-panel]').forEach(panel => { panel.hidden = panel !== target; });
  document.querySelectorAll('.studio-nav-button').forEach(button => {
    const selected = button.dataset.studioTarget === id;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.getElementById('studio-current-section').textContent = target.dataset.studioTitle;
  if (focus) {
    target.querySelector('h2')?.focus({preventScroll:true});
    target.scrollIntoView({block:'start', behavior:'auto'});
  }
}

export function initQuestionStudio({getQuestions,saveQuestions,refreshQuestionList,showToast}) {
  studioEvents?.abort();studioEvents=new AbortController();
  getQuestions();
  const controls=document.getElementById('pool-controls'), review=document.getElementById('import-review'),status=document.getElementById('import-status'),fileInput=document.getElementById('question-file');
  function resetEditor(){const form=document.getElementById('question-form');delete form.dataset.editId;form.reset();form.elements.type.dispatchEvent(new Event('change'));form.querySelector('[type="submit"]').textContent='Save question';}
  document.querySelectorAll('[data-studio-target]').forEach(button=>button.addEventListener('click',()=>setStudioPanel(button.dataset.studioTarget),{signal:studioEvents.signal}));
  const tabs=[...document.querySelectorAll('.studio-nav-button')];
  tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=>{
    let next;
    if(['ArrowRight','ArrowDown'].includes(event.key)) next=(index+1)%tabs.length;
    else if(['ArrowLeft','ArrowUp'].includes(event.key)) next=(index+tabs.length-1)%tabs.length;
    else if(event.key==='Home') next=0;
    else if(event.key==='End') next=tabs.length-1;
    if(next===undefined)return;
    event.preventDefault();setStudioPanel(tabs[next].dataset.studioTarget,{focus:false});tabs[next].focus();
  },{signal:studioEvents.signal}));
  setStudioPanel('question-bank-panel',{focus:false});
  const editor=document.getElementById('question-form');
  function updatePreview(){
    const preview=document.getElementById('studio-question-preview');if(!preview)return;
    preview.replaceChildren();const type=editor.elements.type.value;
    document.getElementById('studio-preview-level').textContent=editor.elements.level.value;
    document.getElementById('studio-editor-title').textContent=editor.dataset.editId?'Edit question':'Create a question';
    preview.append(el('h3',editor.elements.prompt.value.trim()||'Your question appears here…'));
    if(type==='gap-fill') preview.append(el('div','Students type their answer here.','studio-preview-gap'));
    else {
      let options=type==='true-false'?['True','False']:['optionA','optionB','optionC','optionD','optionE'].map(key=>editor.elements[key].value.trim()).filter(Boolean);
      if(!options.length)options=['Option A','Option B','Option C','Option D'];
      const list=el('ol',null,'studio-preview-options');options.forEach((option,i)=>{const item=el('li');item.append(el('b',String.fromCharCode(65+i)),document.createTextNode(option));list.append(item);});preview.append(list);
    }
    const answer=editor.elements.answer.value.trim();preview.append(el('div',answer?`Teacher answer key: ${answer}`:'Add a correct answer to complete the question.','studio-preview-answer'));
  }
  editor.addEventListener('input',updatePreview,{signal:studioEvents.signal});
  editor.addEventListener('change',updatePreview,{signal:studioEvents.signal});
  editor.addEventListener('reset',()=>queueMicrotask(updatePreview),{signal:studioEvents.signal});
  document.getElementById('clear-question-form').onclick=()=>{resetEditor();updatePreview();};updatePreview();
  function pools(){
    controls.replaceChildren();const data=poolStore.list();
    const current=data.pools.find(pool=>pool.id===data.activeId);
    document.getElementById('studio-stat-pools').textContent=data.pools.length;
    document.getElementById('studio-stat-questions').textContent=current.questions.length;
    document.getElementById('studio-stat-topics').textContent=new Set(current.questions.map(q=>q.tag?.trim()||'General English')).size;
    document.getElementById('studio-editor-pool-name').textContent=current.name;
    const bar=el('div',null,'studio-pool-bar');controls.append(bar);
    const label=el('label','Active question pool');const select=el('select');select.id='active-pool';
    data.pools.forEach(p=>{const option=el('option',`${p.name} · ${p.questions.length} question${p.questions.length===1?'':'s'}`);option.value=p.id;select.append(option);});select.value=data.activeId;label.append(select);bar.append(label);
    select.onchange=()=>{try{poolStore.select(select.value);resetEditor();refreshQuestionList();showToast('Active pool changed.');}catch{showToast('Could not change pools. Export a backup and check browser storage.');}pools();};
    const actions=el('div',null,'pool-actions');
    function namePool(rename){
      controls.querySelector('.studio-pool-name-form')?.remove();
      const form=el('form',null,'studio-pool-name-form'),wrap=el('label',rename?'Rename this pool':'Name your new pool'),input=el('input');input.required=true;input.maxLength=100;input.value=rename?current.name:'';input.placeholder='e.g. Unit 2 · Money & trade';wrap.append(input);
      const save=el('button',rename?'Save name':'Create pool','primary');save.type='submit';const cancel=el('button','Cancel','secondary');cancel.type='button';cancel.onclick=()=>form.remove();form.append(wrap,save,cancel);controls.append(form);input.focus();
      form.onsubmit=event=>{event.preventDefault();const name=input.value.trim();if(!name)return;try{if(rename)poolStore.rename(name);else poolStore.create(name,[]);resetEditor();pools();refreshQuestionList();showToast(rename?'Pool renamed.':'New pool ready. Add or import your questions.');}catch{showToast('Could not save the pool. Export a backup and check browser storage.');}};
    }
    for(const [text,rename] of [['＋ New pool',false],['Rename',true]]){const b=el('button',text,'secondary');b.type='button';b.onclick=()=>namePool(rename);actions.append(b);}bar.append(actions);
    controls.append(el('p','Already assigned matches keep their original questions. To use this pool across devices, copy it into your classroom account.','pool-note'));
  }
  pools();document.addEventListener('pools-changed',pools,{signal:studioEvents.signal});
  document.getElementById('download-text-template').onclick=()=>{const a=el('a');a.href=URL.createObjectURL(new Blob([DOCUMENT_EXAMPLE],{type:'text/plain'}));a.download='question-document-example.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  let drafts=[],index=0,source='',filename='',ticket=0,destinationValue='new',importPoolName='';
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
      if(choices)choices.forEach(value=>{const label=name==='type'?({'multiple-choice':'Multiple choice','true-false':'True / False','gap-fill':'Gap fill'}[value]||value):value;const o=el('option',label);o.value=value;input.append(o);});
      if(multiline)input.rows=name==='options'?5:3;
      input.value=name==='options'?q.options.join('\n'):q[name];input.oninput=()=>{q[name]=name==='options'?input.value.split('\n').map(x=>x.trim()).filter(Boolean):input.value;update();};wrap.append(input);editor.append(wrap);return input;
    }
    field('prompt','Question',{multiline:true});const type=field('type','Question type',{choices:['multiple-choice','true-false','gap-fill']});
    const options=field('options','Options — one per line (up to 5)',{multiline:true});
    field('answer','Correct answer — use the full option text');field('explanation','Explanation (optional)',{multiline:true});field('level','Level',{choices:['A1','A2','B1','B2','C1','C2']});field('tag','Topic / tag');
    const issues=el('p',null,'import-issues');issues.setAttribute('role','status');review.append(issues);
    const destination=el('label','Save to');const dest=el('select');dest.id='import-destination';for(const [value,label] of [['new','A new question pool'],['current','The active pool (add questions)']]){const o=el('option',label);o.value=value;dest.append(o);}dest.value=destinationValue;destination.append(dest);review.append(destination);
    const nameWrap=el('label','New pool name'),name=el('input');name.id='import-pool-name';name.value=importPoolName;name.maxLength=100;name.oninput=()=>importPoolName=name.value;nameWrap.append(name);nameWrap.hidden=destinationValue!=='new';review.append(nameWrap);dest.onchange=()=>{destinationValue=dest.value;nameWrap.hidden=dest.value!=='new';};
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
        review.hidden=true;review.replaceChildren();pools();refreshQuestionList();resetEditor();status.textContent=`Saved ${unique.length} questions. ${selected.length-unique.length} duplicate(s) skipped.`;showToast(`Saved ${unique.length} reviewed questions.`);setStudioPanel('question-bank-panel');
      } catch {status.textContent='Could not save: browser storage may be full. Export your current pool first. Your reviewed questions are still here.';}
    };update();
  }
  function loadDrafts(text,ext){const qs=ext==='json'?parsePoolJson(text):ext==='csv'?parseCsv(text):parseQuestionText(text);if(qs.length>500)throw new Error('Import up to 500 questions at a time.');return qs.map(question=>({question,include:true}));}
  async function importFile(file){
    if(!file||fileInput.disabled)return;const current=++ticket;fileInput.disabled=true;review.hidden=true;status.textContent='Reading your file…';
    try {const result=await readQuestionDocument(file,message=>{if(status.isConnected)status.textContent=message;});if(current!==ticket||!review.isConnected)return;source=result.text;filename=file.name;importPoolName=filename.replace(/\.[^.]+$/,'')||'Imported questions';destinationValue='new';drafts=loadDrafts(source,result.ext);index=0;status.textContent=`${filename} · file read. Review the questions below.`;renderReview();}
    catch(error){if(status.isConnected)status.textContent=`Import could not finish: ${error.message}`;}
    finally{fileInput.disabled=false;fileInput.value='';}
  }
  fileInput.onchange=()=>importFile(fileInput.files?.[0]);
  const zone=document.getElementById('studio-upload-zone');
  zone.addEventListener('dragover',event=>{event.preventDefault();zone.classList.add('drag-over');},{signal:studioEvents.signal});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'),{signal:studioEvents.signal});
  zone.addEventListener('drop',event=>{event.preventDefault();zone.classList.remove('drag-over');void importFile(event.dataTransfer?.files?.[0]);},{signal:studioEvents.signal});
}
