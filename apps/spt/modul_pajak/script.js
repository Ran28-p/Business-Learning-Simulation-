let questionsData = null;
const topicListEl = document.getElementById('topic-list');
const summaryBody = document.getElementById('summary-body');
const startArea = document.getElementById('start-area');
const quizSection = document.getElementById('quiz');
const quizForm = document.getElementById('quiz-form');
const quizTitle = document.getElementById('quiz-title');
const quizResult = document.getElementById('quiz-result');

// Try to load questions from embedded JSON first (works on file://), then fallback to fetch
function loadQuestions(){
  // 1) embedded
  const embedded = document.getElementById('questions-data');
  if(embedded && embedded.textContent.trim().length>0){
    try{
      const parsed = JSON.parse(embedded.textContent);
      questionsData = parsed.topics;
      renderTopics();
      return Promise.resolve();
    } catch(e){
      console.warn('Embedded questions parse error', e);
    }
  }

  // 2) fetch from same folder
  return fetch('./questions.json').then(r=>{
    if(!r.ok) throw new Error('fetch failed');
    return r.json();
  }).then(data=>{
    questionsData = data.topics;
    renderTopics();
  }).catch(err=>{
    console.error('Gagal memuat soal:', err);
    if(summaryBody) summaryBody.innerText='Gagal memuat soal.';
  });
}

function initializeApp(){
  loadQuestions();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function renderTopics(){
  if(!topicListEl || !Array.isArray(questionsData)) return;

  topicListEl.innerHTML='';
  questionsData.forEach(t=>{
    const li=document.createElement('li');
    li.textContent=t.title;
    li.onclick=()=>selectTopic(t.key);
    li.id='topic-'+t.key;
    topicListEl.appendChild(li);
  });
}

function selectTopic(key){
  document.querySelectorAll('.topics li').forEach(el=>el.classList.remove('active'));
  const topicItem = document.getElementById('topic-'+key);
  if(topicItem) topicItem.classList.add('active');
  const topic = questionsData.find(x=>x.key===key);
  if(!topic) return;
  summaryBody.innerHTML = `<h3>${escapeHTML(topic.title)}</h3><p>${escapeHTML(topic.summary)}</p>`;
  startArea.innerHTML = `<p><strong>Soal tersedia:</strong> ${topic.questions.length} soal terpilih</p>
    <div class="actions"><button class="btn" onclick="startQuiz('${escapeHTML(key)}')">Mulai Kuis</button></div>`;
}

function startQuiz(key){
  const topic = questionsData.find(x=>x.key===key);
  quizSection.style.display='block';
  document.getElementById('summary').style.display='none';
  quizTitle.innerText = 'Kuis: '+topic.title;
  quizForm.innerHTML='';
  quizResult.innerHTML='';
  topic.questions.forEach((q,i)=>{
    const div=document.createElement('div');div.className='question';
    div.innerHTML=`<label>${i+1}. ${escapeHTML(q.q)}</label>`;
    if(q.type==='mcq'){
      q.options.forEach(opt=>{
        const safeOpt = String(opt).replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'');
        const id='q_'+key+'_'+i+'_'+safeOpt;
        div.innerHTML += `<div><input type="radio" name="q${i}" value="${escapeHTML(opt)}" id="${id}"> <label for="${id}">${escapeHTML(opt)}</label></div>`;
      });
    } else {
      div.innerHTML += `<input type="text" name="q${i}" placeholder="Masukkan jawaban">`;
    }
    quizForm.appendChild(div);
  });
  document.getElementById('submit-quiz').onclick = function(e){ e.preventDefault(); gradeQuiz(topic); };
  document.getElementById('back-to-summary').onclick = function(e){ e.preventDefault(); quizSection.style.display='none'; document.getElementById('summary').style.display='block'; };
}

function cleanNumber(val){
  // Parser angka gaya Indonesia: "4.000.000", "Rp 4.000.000", "0,5", "4000000", "1,5%".
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  let raw = String(val).trim().replace(/rp\.?/ig, '').replace(/%/g, '').replace(/\s+/g, '');
  if (!raw) return 0;
  const neg = raw.startsWith('-');
  raw = raw.replace(/[^0-9.,]/g, '');
  if (raw.includes('.') && raw.includes(',')) {
    // pemisah terakhir dianggap desimal
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) raw = raw.replace(/\./g, '').replace(',', '.');
    else raw = raw.replace(/,/g, '');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, '');            // 4.000.000 → ribuan
  } else if (/^\d{1,3}(,\d{3})+$/.test(raw)) {
    raw = raw.replace(/,/g, '');             // 4,000,000 → ribuan (gaya Inggris)
  } else {
    raw = raw.replace(',', '.');             // 0,5 → desimal
  }
  const result = parseFloat(raw);
  return Number.isFinite(result) ? (neg ? -result : result) : 0;
}

// Normalisasi teks: huruf kecil, buang tanda baca & spasi ("Pasal 4 ayat (2)" == "pasal4ayat2")
function normText(str){
  return String(str === null || str === undefined ? '' : str).toLowerCase().replace(/[^a-z0-9]/g, '');
}
// Benar bila sama dengan kunci, atau sama dengan salah satu jawaban alternatif (accept),
// atau memuat salah satu frasa alternatif (minimal 4 karakter, agar tidak terlalu longgar).
function isTextCorrect(val, q){
  const u = normText(val);
  if (!u) return false;
  const keys = [q.answer].concat(Array.isArray(q.accept) ? q.accept : []).map(normText).filter(Boolean);
  return keys.some(k => u === k || (k.length >= 4 && u.includes(k)));
}

// Blok "Pembahasan" berlapis; semua teks di-escape.
function pembahasanHtml(q, ok){
  const pb = q.pembahasan;
  if (!pb) {
    return (q.explanation ? `<div class="pbh"><div class="pbh-row"><span class="pbh-label">Pembahasan</span><p>${escapeHTML(q.explanation)}</p></div></div>` : '') +
      (q.ref ? `<div class="pbh-ref">Rujukan: ${escapeHTML(q.ref)}</div>` : '');
  }
  const row = (label, body, cls) => body ? `<div class="pbh-row ${cls||''}"><span class="pbh-label">${label}</span>${body}</div>` : '';
  let h = '<div class="pbh">';
  h += row('Mengapa jawabannya begitu', `<p>${escapeHTML(pb.konsep)}</p>`);
  if (pb.dasar) h += row('Dasar hukum', `<p>${escapeHTML(pb.dasar)}</p>`);
  if (Array.isArray(pb.langkah) && pb.langkah.length) h += row('Langkah hitung', '<ol>' + pb.langkah.map(x => `<li>${escapeHTML(x)}</li>`).join('') + '</ol>');
  if (pb.salah && Object.keys(pb.salah).length) h += row('Mengapa opsi lain salah', '<ul>' + Object.keys(pb.salah).map(k => `<li><strong>${escapeHTML(k)}</strong> — ${escapeHTML(pb.salah[k])}</li>`).join('') + '</ul>');
  if (pb.jebakan) h += row('Jebakan umum', `<p>${escapeHTML(pb.jebakan)}</p>`, 'pbh-warn');
  if (pb.ingat) h += row('Cara mengingat', `<p>${escapeHTML(pb.ingat)}</p>`, 'pbh-tip');
  if (q.ref) h += `<div class="pbh-ref">Rujukan: ${escapeHTML(q.ref)}</div>`;
  return h + '</div>';
}

function gradeQuiz(topic){
  const inputs = quizForm.querySelectorAll('.question');
  let correct=0;
  const details = [];
  topic.questions.forEach((q,i)=>{
    const node = inputs[i];
    let userAns = '';
    let isCorrect = false;
    if(q.type==='mcq'){
      const sel = node.querySelector('input[type=radio]:checked');
      userAns = sel ? sel.value : '';
      isCorrect = sel && sel.value===q.answer;
    } else {
      const val = node.querySelector('input').value || '';
      userAns = val;
      // PERBAIKAN LOGIKA: Pisahkan evaluasi angka dan teks
      if (typeof q.answer === 'number') {
        // Jika jawaban sebenarnya adalah angka, gunakan cleanNumber
        isCorrect = (cleanNumber(val) === cleanNumber(q.answer));
      } else {
        // Jika jawaban sebenarnya adalah teks: toleran terhadap tanda baca/spasi dan jawaban alternatif (q.accept)
        isCorrect = isTextCorrect(val, q);
      }
    }
    if(isCorrect) correct++;
    details.push({q: q.q, user: userAns, correct: q.answer, ok: isCorrect, item: q});
  });

  const score = Math.round((correct / topic.questions.length) * 100);

  let html = `<div class="result"><strong>Skor: ${score}</strong> — ${correct}/${topic.questions.length} benar.</div>`;
  html += '<div style="margin-top:12px">';
  details.forEach((d,idx)=>{
    html += `<div style="padding:8px;border-bottom:1px solid #eef;">`;
    html += `<div><strong>${idx+1}. ${escapeHTML(d.q)}</strong></div>`;
    html += `<div>Jawaban Anda: <em>${escapeHTML(d.user) || '&#8212;'}</em> — Kunci: <strong>${escapeHTML(d.correct)}</strong> ${d.ok?'<span style="color:green">(Benar)</span>':'<span style="color:#c0392b">(Salah)</span>'}</div>`;
    html += pembahasanHtml(d.item, d.ok);
    html += `</div>`;
  });
  html += '</div>';
{
  quizResult.innerHTML = html;
}
}
