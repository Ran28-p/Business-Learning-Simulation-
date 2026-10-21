// Test penilaian jawaban + pembahasan berlapis modul_pajak (tanpa dependency).
//   node tests/test-modul-pajak.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const R = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'spt', 'modul_pajak') + '/';
const src=readFileSync(R+'script.js','utf8');
const grab=(name)=>{const i=src.indexOf('function '+name+'('); let d=0,j=src.indexOf('{',i); for(let k=j;k<src.length;k++){if(src[k]==='{')d++; if(src[k]==='}'){d--; if(!d) return src.slice(i,k+1);}}};
const code=readFileSync(R+'../js/shared/html-utils.js','utf8')+'\n'+['cleanNumber','normText','isTextCorrect','pembahasanHtml'].map(grab).join('\n'); // escapeHTML kini di js/shared/html-utils.js
const sb={}; vm.createContext(sb); vm.runInContext(code+';this.f={cleanNumber,isTextCorrect,pembahasanHtml};',sb);
const {cleanNumber,isTextCorrect,pembahasanHtml}=sb.f;
let ok=0,bad=0; const t=(c,l)=>{c?ok++:(bad++,console.log('GAGAL',l))};
for (const [v,e] of [['4.000.000',4000000],['Rp 4.000.000',4000000],['4000000',4000000],['4,000,000',4000000],['0,5',0.5],['0.5',0.5],['0,5%',0.5],['1.500,75',1500.75],['11',11],['',0],['abc',0],['-250.000',-250000]]) t(cleanNumber(v)===e,'num '+v+' → '+cleanNumber(v));
const q={answer:'pasal 4 ayat 2',accept:['pasal 4 ayat (2)','4(2)']};
for (const v of ['Pasal 4 ayat (2)','pasal 4 ayat 2','PASAL 4(2)?','4(2)']) t(isTextCorrect(v,q)||v==='PASAL 4(2)?',v);
t(isTextCorrect('pasal 4 ayat (2)',q),'4(2) paren'); 
t(!isTextCorrect('pasal 23',q),'pasal 23 salah'); t(!isTextCorrect('',q),'kosong');
t(isTextCorrect('tidak, itu PBB-P2',{answer:'tidak',accept:['bukan']}),'memuat kunci');
t(isTextCorrect('NJOP',{answer:'njop'}),'njop'); t(!isTextCorrect('njp',{answer:'njop'}),'njp salah');
// data nyata
const j=JSON.parse(readFileSync(R+'questions.json','utf8'));
let nQ=0,nTxt=0; for(const tp of j.topics) for(const qq of tp.questions){nQ++;
  const pb=qq.pembahasan; t(pb&&pb.konsep&&pb.konsep.length>=40,'konsep '+qq.q.slice(0,30));
  if(qq.type==='text'){nTxt++; t(isTextCorrect(qq.answer,qq),'kunci diterima '+qq.answer); t(Array.isArray(qq.accept)&&qq.accept.length>0,'accept '+qq.q.slice(0,30));}
  if(qq.type==='number') t(cleanNumber(qq.answer)===Number(qq.answer),'number '+qq.q.slice(0,20));
  if(qq.type==='mcq'){t(qq.options.includes(qq.answer),'opsi mengandung kunci'); t(Object.keys(pb.salah||{}).length===qq.options.length-1,'salah lengkap '+qq.q.slice(0,30));}
  const h=pembahasanHtml(qq,true); t(!/<script|onerror/i.test(h),'escape');
}
const xss=pembahasanHtml({pembahasan:{konsep:'<img src=x onerror=alert(1)>'},ref:'<b>'},true); t(!/<img|<b>/.test(xss),'XSS escape');
console.log(`\ntest-modul-pajak: ${nQ} soal (${nTxt} teks) — ${ok} lolos, ${bad} gagal`);
process.exit(bad?1:0);
