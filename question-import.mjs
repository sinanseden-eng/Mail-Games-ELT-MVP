// Plain-text question parsing. Imported documents never become executable HTML.
export const normal = value => String(value ?? '').trim().toLocaleLowerCase('en').replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
export function validateQuestion(q) {
  const errors = [];
  if (!String(q.prompt || '').trim()) errors.push('Add a question.');
  if (!['multiple-choice', 'true-false', 'gap-fill'].includes(q.type)) errors.push('Choose a supported question type.');
  if (!String(q.answer || '').trim()) errors.push('Add the correct answer.');
  if (q.type !== 'gap-fill') {
    const opts = (q.options || []).filter(x => String(x).trim());
    if (opts.length < 2 || opts.length > 5) errors.push('Use between 2 and 5 options.');
    if (new Set(opts.map(normal)).size !== opts.length) errors.push('Each option must be different.');
    if (q.answer && !opts.some(x => normal(x) === normal(q.answer))) errors.push('The correct answer must match one of the options.');
    if (q.type === 'true-false' && (opts.length !== 2 || !opts.some(x => normal(x) === 'true') || !opts.some(x => normal(x) === 'false'))) errors.push('True / False needs the options True and False.');
  }
  if (String(q.prompt || '').length > 1000) errors.push('Keep the question under 1,000 characters.');
  if ((q.options || []).some(x => String(x).length > 300)) errors.push('Keep each option under 300 characters.');
  if (String(q.answer || '').length > 500) errors.push('Keep the answer under 500 characters.');
  if (String(q.explanation || '').length > 1000) errors.push('Keep the explanation under 1,000 characters.');
  if (!['A1','A2','B1','B2','C1','C2'].includes(q.level)) errors.push('Choose a level from A1 to C2.');
  return errors;
}
export function cleanQuestion(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  const options = Array.isArray(input.options) ? input.options.map(x => String(x).trim()).filter(Boolean) : [];
  const q = { prompt: String(input.prompt ?? input.question ?? '').trim(), type: String(input.type || (options.length ? 'multiple-choice' : 'gap-fill')), options,
    answer: String(input.answer ?? '').trim(), explanation: String(input.explanation || '').trim(), level: String(input.level || 'B1').toUpperCase(), tag: String(input.tag || 'Imported').trim() };
  if (q.type === 'true-false' && !options.length) q.options = ['True', 'False'];
  const letter = q.answer.match(/^\(?([A-E])\)?[.)]?$/i);
  if (letter && q.options.length && !q.options.some(x => normal(x) === normal(q.answer))) q.answer = q.options[letter[1].toUpperCase().charCodeAt(0) - 65] || q.answer;
  return q;
}
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && quoted && text[i+1] === '"') { cell += c; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if (/[\r\n]/.test(c) && !quoted) { if (c === '\r' && text[i+1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('CSV has an unclosed quote. Check the last edited row.');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map(x => normal(x.replace(/^\uFEFF/, '')).replace(/\s+/g, '_'));
  if (!headers.includes('question') && !headers.includes('prompt')) throw new Error('CSV needs a question or prompt column. Use the template below.');
  return rows.map(row => { const q = Object.fromEntries(headers.map((h,i) => [h,row[i] || ''])); return cleanQuestion({...q, options: ['a','b','c','d','e'].map(x => q[`option_${x}`]).filter(Boolean)}); });
}
export function parsePoolJson(text) {
  const data = JSON.parse(text);
  const questions = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(questions)) throw new Error('JSON must contain a question array or an object with a questions array.');
  return questions.map(cleanQuestion);
}
export function parseQuestionText(text) {
  // Keep missing answers empty; never invent an answer key.
  const split = text.replace(/\r/g, '').split(/(?:^|\n)\s*(?:answer\s*key|answers|cevap\s*anahtarı)\s*:?\s*\n/i);
  const keys = new Map();
  for (const m of (split.slice(1).join('\n')).matchAll(/(?:^|[\n,;\s])(?:Q\s*)?(\d+)\s*[).:\-]\s*([A-E]|True|False)(?=\s|$|[,;])/gi)) keys.set(m[1],m[2]);
  const source = split[0].replace(/\s+([A-E])[).]\s+/g, '\n$1) ');
  const lines = source.split('\n'); const questions = []; let q = null, field = 'prompt';
  for (const raw of lines) {
    const line = raw.trim(); if (!line) continue;
    const number = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)\s*[).:\-]\s*(.*)$/i);
    if (number) { q = {number:number[1],prompt:number[2],options:[],answer:'',explanation:''}; questions.push(q); field='prompt'; continue; }
    if (!q) continue;
    const option = line.match(/^\(?([A-E])\s*[).]\s*(.*)$/i);
    const answer = line.match(/^(?:correct\s+answer|answer|cevap)\s*:\s*(.*)$/i);
    const explanation = line.match(/^(?:explanation|reason)\s*:\s*(.*)$/i);
    if (option) { q.options[option[1].toUpperCase().charCodeAt(0)-65] = option[2]; field='option'; }
    else if (answer) { q.answer=answer[1]; field='answer'; }
    else if (explanation) { q.explanation=explanation[1]; field='explanation'; }
    else if (field==='option') q.options[q.options.length-1] += ' '+line;
    else q[field] += ' '+line;
  }
  if (!questions.length && source.trim()) return [cleanQuestion({prompt:source.trim()})];
  return questions.map(q => cleanQuestion({...q, answer:q.answer || keys.get(q.number) || '', type:q.options.length ? 'multiple-choice' : /true\s*(?:\/|or)\s*false/i.test(q.prompt) ? 'true-false' : 'gap-fill'}));
}
export const DOCUMENT_EXAMPLE = `1. She ___ here since 2023.\nA) works\nB) worked\nC) has worked\nD) is working\nAnswer: C\nExplanation: Use present perfect with since.\n\n2. Complete: We arrived ___ the airport.\nAnswer: at\n\n3. The past tense of go is went. True / False\nAnswer: True\n`;
