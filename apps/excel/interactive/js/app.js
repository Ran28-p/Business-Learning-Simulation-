(function () {
  'use strict';

  const salesRows = [
    ['Jawa Barat', 'Mouse nirkabel', 3, 125000],
    ['Jabodetabek', 'Papan ketik', 2, 250000],
    ['Bali', 'Hub USB-C', 4, 180000],
    ['Jawa Tengah', 'Mouse nirkabel', 1, 125000],
    ['Bali', 'Papan ketik', 3, 250000],
  ];
  const lessons = [
    {
      title: 'Mengenal struktur makro',
      topic: 'Dasar VBA',
      description: 'Makro VBA dimulai dengan Sub diikuti nama prosedur, lalu berisi perintah, dan ditutup dengan End Sub. Buat makro yang menampilkan pesan singkat.',
      note: 'Makro adalah kumpulan instruksi yang dapat dijalankan di Excel. MsgBox menampilkan kotak pesan kepada pengguna.',
      task: 'Buat prosedur bernama SapaPengguna yang menampilkan pesan “Selamat belajar VBA!”.',
      hint: 'Gunakan tiga baris: Sub SapaPengguna(), MsgBox "Selamat belajar VBA!", lalu End Sub.',
      starter: 'Sub SapaPengguna()\n\nEnd Sub',
      check: (body) => body.length === 1 && /^msgbox\s+"selamat belajar vba!"$/i.test(body[0]),
      output: () => ['Kotak pesan: Selamat belajar VBA!'],
    },
    {
      title: 'Membaca dan menulis sel',
      topic: 'Referensi sel',
      description: 'Nilai pada lembar kerja dapat dibaca dan ditulis melalui Range("alamat").Value. Gunakan perkalian untuk menghitung total pada satu baris data.',
      note: 'Kolom C menyimpan jumlah barang, kolom D menyimpan harga satuan, dan kolom E adalah tempat hasil. Gunakan alamat sel yang tepat.',
      task: 'Buat HitungTotalBarisPertama untuk mengalikan C2 dengan D2 dan menulis hasilnya ke E2.',
      hint: 'Pola yang diperlukan: Range("E2").Value = Range("C2").Value * Range("D2").Value. Cells(2, 5), Cells(2, 3), dan Cells(2, 4) juga merujuk sel yang sama.',
      starter: 'Sub HitungTotalBarisPertama()\n    \' Hitung jumlah barang dikali harga satuan pada baris 2\nEnd Sub',
      check: (body) => body.length === 1 && [
        /^range\("e2"\)\.value\s*=\s*range\("c2"\)\.value\s*\*\s*range\("d2"\)\.value$/i,
        /^cells\(2,\s*5\)\.value\s*=\s*cells\(2,\s*3\)\.value\s*\*\s*cells\(2,\s*4\)\.value$/i,
      ].some((pattern) => pattern.test(body[0])),
      output: () => ['Sel E2 = Rp375.000 (3 × Rp125.000).'],
    },
    {
      title: 'Mengulang proses dengan For',
      topic: 'Perulangan',
      description: 'Perulangan For menjalankan instruksi berulang kali untuk rentang nilai tertentu. Dengan Cells(baris, kolom), satu prosedur dapat menghitung total untuk beberapa baris.',
      note: 'Untuk setiap baris 2 sampai 6, hitung jumlah × harga satuan lalu tulis hasilnya ke kolom E.',
      task: 'Buat HitungSemuaTotal dengan perulangan For baris 2 sampai 6 untuk mengisi total pada kolom E.',
      hint: 'Deklarasikan baris sebagai Long, mulai For baris = 2 To 6, tulis hasil ke Cells(baris, 5), lalu tutup dengan Next baris.',
      starter: 'Sub HitungSemuaTotal()\n    \' Deklarasikan baris dan hitung total pada baris 2 sampai 6\nEnd Sub',
      check: (body) => body.length === 4
        && /^dimbarisas(long|integer)$/i.test(body[0].replace(/\s/g, ''))
        && /^forbaris=2to6$/i.test(body[1].replace(/\s/g, ''))
        && /^cells\(baris,\s*5\)\.value\s*=\s*cells\(baris,\s*3\)\.value\s*\*\s*cells\(baris,\s*4\)\.value$/i.test(body[2])
        && /^next(\s+baris)?$/i.test(body[3]),
      output: () => salesRows.map(([wilayah, produk, jumlah, harga], index) => (
        `E${index + 2} (${wilayah}, ${produk}) = ${formatCurrency(jumlah * harga)}`
      )),
    },
    {
      title: 'Mengambil keputusan dengan If',
      topic: 'Kondisi',
      description: 'If...Then...Else memilih tindakan berdasarkan kondisi. Gabungkan dengan For untuk memberi status pada beberapa baris sekaligus.',
      note: 'Target per baris adalah Rp500.000. Kolom F akan berisi “Target tercapai” jika total memenuhi target, atau “Perlu ditingkatkan” jika belum.',
      task: 'Buat TandaiTargetPenjualan. Periksa total di kolom E pada baris 2–6 dan tulis statusnya di kolom F.',
      hint: 'Di dalam For baris = 2 To 6, gunakan If Cells(baris, 5).Value >= 500000 Then, tulis status ke Cells(baris, 6), Else untuk status lainnya, lalu End If dan Next baris.',
      starter: 'Sub TandaiTargetPenjualan()\n    \' Periksa total penjualan di kolom E dan tulis status ke kolom F\nEnd Sub',
      check: (body) => body.length === 8
        && /^dim baris as long$/i.test(body[0])
        && /^for baris = 2 to 6$/i.test(body[1])
        && /^if cells\(baris,\s*5\)\.value >= 500000 then$/i.test(body[2])
        && /^cells\(baris,\s*6\)\.value = "target tercapai"$/i.test(body[3])
        && /^else$/i.test(body[4])
        && /^cells\(baris,\s*6\)\.value = "perlu ditingkatkan"$/i.test(body[5])
        && /^end if$/i.test(body[6])
        && /^next(\s+baris)?$/i.test(body[7]),
      output: () => salesRows.map(([wilayah, produk, jumlah, harga], index) => {
        const total = jumlah * harga;
        return `F${index + 2} (${wilayah}, ${produk}) = ${total >= 500000 ? 'Target tercapai' : 'Perlu ditingkatkan'} (${formatCurrency(total)})`;
      }),
    },
  ];

  const completedLessons = new Set();
  const savedCode = new Map();
  let currentLesson = 0;

  function formatCurrency(amount) {
    return `Rp${amount.toLocaleString('id-ID')}`;
  }

  function normalizeCodeLine(line) {
    return line.replace(/'.*$/, '').trim().replace(/\s+/g, ' ');
  }

  function setFeedback(correct, message) {
    const feedback = document.getElementById('xlFeedback');
    feedback.textContent = message;
    feedback.classList.toggle('xl-feedback--success', correct);
    feedback.classList.toggle('xl-feedback--error', !correct);
  }

  function renderWorkbook() {
    const grid = document.getElementById('xlDataGrid');
    const table = document.createElement('table');
    const columns = ['Wilayah', 'Produk', 'Jumlah', 'Harga Satuan', 'Total', 'Status'];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const thead = document.createElement('thead');
    const letterRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.setAttribute('aria-hidden', 'true');
    letterRow.appendChild(corner);
    letters.forEach((letter) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = letter;
      letterRow.appendChild(cell);
    });
    thead.appendChild(letterRow);
    const headerRow = document.createElement('tr');
    const headerIndex = document.createElement('th');
    headerIndex.scope = 'row';
    headerIndex.textContent = '1';
    headerRow.appendChild(headerIndex);
    columns.forEach((column, index) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = column;
      cell.dataset.column = letters[index];
      headerRow.appendChild(cell);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    salesRows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      const rowHeader = document.createElement('th');
      rowHeader.scope = 'row';
      rowHeader.textContent = String(rowIndex + 2);
      tr.appendChild(rowHeader);
      [...row, '', ''].forEach((value, columnIndex) => {
        const cell = document.createElement('td');
        cell.textContent = typeof value === 'number' ? value.toLocaleString('id-ID') : value;
        cell.dataset.column = letters[columnIndex];
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    table.className = 'xl-grid';
    table.setAttribute('aria-label', 'Data penjualan dengan kolom wilayah, produk, jumlah, harga satuan, total, dan status');
    grid.replaceWith(table);
    table.id = 'xlDataGrid';
  }

  function renderLesson() {
    const lesson = lessons[currentLesson];
    const textarea = document.getElementById('xlVbaAnswer');
    const lessonList = document.getElementById('xlLessonList');

    document.getElementById('xlLessonNumber').textContent = `Pelajaran ${currentLesson + 1} dari ${lessons.length}`;
    document.getElementById('xlLessonTopic').textContent = lesson.topic;
    document.getElementById('xlLessonTitle').textContent = lesson.title;
    document.getElementById('xlLessonDescription').textContent = lesson.description;
    document.getElementById('xlLessonNote').textContent = lesson.note;
    document.getElementById('xlTask').textContent = lesson.task;
    textarea.value = savedCode.has(currentLesson) ? savedCode.get(currentLesson) : lesson.starter;
    document.getElementById('xlCodeHint').textContent = lesson.hint;
    document.getElementById('xlCodeHint').hidden = true;
    document.getElementById('xlShowHint').textContent = 'Tampilkan petunjuk';
    document.getElementById('xlFeedback').textContent = '';
    document.getElementById('xlFeedback').classList.remove('xl-feedback--success', 'xl-feedback--error');
    document.getElementById('xlOutput').replaceChildren();
    document.getElementById('xlOutput').hidden = true;
    document.getElementById('xlPrevious').disabled = currentLesson === 0;
    document.getElementById('xlNext').disabled = currentLesson === lessons.length - 1;
    document.getElementById('xlScore').textContent = `${completedLessons.size} dari ${lessons.length} latihan selesai`;
    lessonList.replaceChildren();

    lessons.forEach((item, index) => {
      const entry = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-current', index === currentLesson ? 'step' : 'false');
      button.textContent = `${index + 1}. ${item.title}`;
      if (completedLessons.has(index)) {
        const done = document.createElement('span');
        done.className = 'xl-lesson-done';
        done.setAttribute('aria-label', 'Selesai');
        done.textContent = '✓';
        button.appendChild(done);
      }
      button.addEventListener('click', () => selectLesson(index));
      entry.appendChild(button);
      lessonList.appendChild(entry);
    });
  }

  function selectLesson(index) {
    savedCode.set(currentLesson, document.getElementById('xlVbaAnswer').value);
    currentLesson = index;
    renderLesson();
  }

  function displayOutput(lines) {
    const output = document.getElementById('xlOutput');
    const title = document.createElement('strong');
    title.textContent = 'Pratinjau hasil yang diharapkan (simulasi aman)';
    const list = document.createElement('ul');
    lines.forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      list.appendChild(item);
    });
    const note = document.createElement('span');
    note.textContent = 'Kode VBA tidak dijalankan oleh halaman ini.';
    output.replaceChildren(title, list, note);
    output.hidden = false;
  }

  function checkAnswer() {
    const lesson = lessons[currentLesson];
    const lines = document.getElementById('xlVbaAnswer').value
      .split(/\r?\n/)
      .map(normalizeCodeLine)
      .filter(Boolean);
    const hasProcedure = lines.length >= 2
      && new RegExp(`^Sub\\s+${lessonProcedureName(currentLesson)}\\(\\)$`, 'i').test(lines[0])
      && /^End Sub$/i.test(lines[lines.length - 1]);
    const body = hasProcedure ? lines.slice(1, -1) : [];
    const correct = hasProcedure && lesson.check(body);

    savedCode.set(currentLesson, document.getElementById('xlVbaAnswer').value);
    if (!correct) {
      const missingProcedure = !hasProcedure;
      setFeedback(false, missingProcedure
        ? `Periksa struktur prosedur. Gunakan Sub ${lessonProcedureName(currentLesson)}() di awal dan End Sub di akhir.`
        : 'Belum benar. Periksa nama variabel, rentang baris, kolom tujuan, dan urutan instruksinya; gunakan petunjuk bila diperlukan.');
      document.getElementById('xlOutput').hidden = true;
      return;
    }

    completedLessons.add(currentLesson);
    renderLesson();
    setFeedback(true, 'Benar. Struktur dan instruksi VBA cocok dengan tujuan latihan.');
    displayOutput(lesson.output());
  }

  function lessonProcedureName(index) {
    return ['SapaPengguna', 'HitungTotalBarisPertama', 'HitungSemuaTotal', 'TandaiTargetPenjualan'][index];
  }

  function init() {
    renderWorkbook();
    renderLesson();

    document.getElementById('xlCheckVba').addEventListener('click', checkAnswer);
    document.getElementById('xlShowHint').addEventListener('click', (event) => {
      const hint = document.getElementById('xlCodeHint');
      hint.hidden = !hint.hidden;
      event.currentTarget.textContent = hint.hidden ? 'Tampilkan petunjuk' : 'Sembunyikan petunjuk';
    });
    document.getElementById('xlResetCode').addEventListener('click', () => {
      const textarea = document.getElementById('xlVbaAnswer');
      textarea.value = lessons[currentLesson].starter;
      savedCode.delete(currentLesson);
      document.getElementById('xlOutput').hidden = true;
      const feedback = document.getElementById('xlFeedback');
      feedback.textContent = 'Kode dikembalikan ke kerangka awal.';
      feedback.classList.remove('xl-feedback--success', 'xl-feedback--error');
    });
    document.getElementById('xlPrevious').addEventListener('click', () => {
      if (currentLesson > 0) selectLesson(currentLesson - 1);
    });
    document.getElementById('xlNext').addEventListener('click', () => {
      if (currentLesson < lessons.length - 1) selectLesson(currentLesson + 1);
    });
    document.querySelectorAll('.xl-sheet-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const dataSelected = tab.id === 'xlSheetDataTab';
        document.getElementById('xlSheetDataTab').classList.toggle('xl-sheet-tab--active', dataSelected);
        document.getElementById('xlSheetMacroTab').classList.toggle('xl-sheet-tab--active', !dataSelected);
        document.getElementById('xlSheetDataTab').setAttribute('aria-selected', String(dataSelected));
        document.getElementById('xlSheetMacroTab').setAttribute('aria-selected', String(!dataSelected));
        document.getElementById('xlSheetData').hidden = !dataSelected;
        document.getElementById('xlSheetMacro').hidden = dataSelected;
      });
    });
    document.getElementById('xlVbaAnswer').addEventListener('input', () => {
      savedCode.set(currentLesson, document.getElementById('xlVbaAnswer').value);
      document.getElementById('xlOutput').hidden = true;
      document.getElementById('xlFeedback').textContent = '';
      document.getElementById('xlFeedback').classList.remove('xl-feedback--success', 'xl-feedback--error');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
