let questionsData = null;
const topicListEl = document.getElementById('topic-list');
const summaryBody = document.getElementById('summary-body');
const startArea = document.getElementById('start-area');
const quizSection = document.getElementById('quiz');
const quizForm = document.getElementById('quiz-form');
const quizTitle = document.getElementById('quiz-title');
const quizResult = document.getElementById('quiz-result');

// Tambahkan fungsi ini untuk mencegah XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, function(match) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    };
    return escapeMap[match];
  });
}
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
  if(!val) return 0;
  const raw = val.toString().replace(/[^0-9\-\.]/g,'');
  if(!raw) return 0;
  const result = parseFloat(raw);
  return Number.isFinite(result) ? result : 0;
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
        // Jika jawaban sebenarnya adalah teks, cukup bandingkan teksnya (case-insensitive)
        isCorrect = (val.trim().toLowerCase() === String(q.answer).toLowerCase());
      }
    }
    if(isCorrect) correct++;
    details.push({q: q.q, user: userAns, correct: q.answer, ok: isCorrect, explanation: q.explanation || ''});
  });

  const score = Math.round((correct / topic.questions.length) * 100);

  let html = `<div class="result"><strong>Skor: ${score}</strong> — ${correct}/${topic.questions.length} benar.</div>`;
  html += '<div style="margin-top:12px">';
  details.forEach((d,idx)=>{
    html += `<div style="padding:8px;border-bottom:1px solid #eef;">`;
    html += `<div><strong>${idx+1}. ${d.q}</strong></div>`;
    html += `<div>Jawaban Anda: <em>${escapeHTML(d.user) || '&#8212;'}</em> — Kunci: <strong>${escapeHTML(d.correct)}</strong> ${d.ok?'<span style="color:green">(Benar)</span>':'<span style="color:red">(Salah)</span>'}</div>`;
    if(d.explanation) html += `<div style="margin-top:6px;color:#333"><small><strong>Pembahasan:</strong> ${d.explanation}</small></div>`;
    if(d.ref) html += `<div style="margin-top:6px;color:#555"><small><strong>Referensi:</strong> ${d.ref}</small></div>`;
    html += `</div>`;
  });
  html += '</div>';
{
  quizResult.innerHTML = html;
}
}
