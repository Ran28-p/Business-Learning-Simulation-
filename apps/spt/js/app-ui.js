// app-ui.js — bagian dari app-main.js yang dipecah per tanggung jawab (perilaku identik).
// Navigasi/routing view, unduh PDF, tema & sidebar, animasi counter, pemilih mode & kasus.
// Classic script: dimuat BERURUTAN setelah app-main.js (lihat index.html); semua nama tetap global yang sama.

        // ==========================================
        // 4. CORE UI ROUTING & RENDERING
        // ==========================================
        function navigate(viewId) {
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.querySelector(`.nav-item[data-view="${viewId}"]`)?.classList.add('active');
            
            if(viewId === 'dashboard') {
                document.getElementById('view-dashboard').classList.add('active');
                document.getElementById('page-title').innerText = "Dashboard Pembelajaran";
                document.getElementById('page-subtitle').innerText = "Pilih jenis SPT untuk memulai simulasi pengisian.";
                animateCounters();
            } else if (viewId === 'history') {
                renderHistory();
                document.getElementById('view-history').classList.add('active');
                document.getElementById('page-title').innerText = "Riwayat Anda";
                document.getElementById('page-subtitle').innerText = "Catatan simulasi yang telah dikerjakan.";
            } else if (viewId === 'coretax') {
                document.getElementById('view-coretax').classList.add('active');
                document.getElementById('page-title').innerText = "Panduan Coretax";
                document.getElementById('page-subtitle').innerText = "Persiapan dan langkah memahami sistem Coretax secara lebih mudah.";
            } else if (viewId === 'tabloid') {
                document.getElementById('view-tabloid').classList.add('active');
                document.getElementById('page-title').innerText = "Tabloid Pajak";
                document.getElementById('page-subtitle').innerText = "Kumpulan link resmi DJP untuk peraturan pajak terbaru.";
            } else if (viewId === 'calculator') {
                document.getElementById('view-calculator').classList.add('active');
                document.getElementById('page-title').innerText = "Simulasi TER & THR";
                document.getElementById('page-subtitle').innerText = "Dampak lapisan TER dan pengaruh THR terhadap tarif PPh 21.";
                if (typeof initCalcTabs === 'function') initCalcTabs();
            }
        }

        // Download hasil simulasi sebagai PDF sungguhan (bukan sekadar
        // window.print()). Pakai mesin PDF terpusat (js/shared/pdf-export.js);
        // window.print() tetap tersedia sebagai fallback manual di tombol
        // "Cetak (Print)" sebelahnya, dan sekarang didukung stylesheet
        // @media print yang sudah diperbaiki (lihat css/styles.css).
        function downloadResultPDF() {
            const statusEl = document.getElementById('resultPdfStatus');
            const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

            const source = document.querySelector('#view-result .result-card');
            if (!source) {
                setStatus('❌ Area hasil simulasi tidak ditemukan.');
                return;
            }
            if (!window.PDFExport) {
                setStatus('❌ Mesin PDF tidak tersedia. Gunakan tombol "Cetak (Print)" sebagai gantinya.');
                return;
            }

            const category = document.getElementById('result-category')?.innerText || 'Hasil';
            const score = document.getElementById('result-score')?.innerText || '';
            const filename = `Hasil_Simulasi_SPT_${category.replace(/[^a-zA-Z0-9]+/g, '_')}_${score}.pdf`;

            setStatus('⏳ Membuat PDF…');
            window.PDFExport.exportElementToPDF(source, {
                filename,
                widthPx: 720,
                scale: 2.2,
                onClone: (clone) => {
                    clone.style.boxShadow = 'none';
                    clone.style.padding = '18px';
                }
            }).then(() => {
                setStatus('✅ PDF hasil simulasi berhasil diunduh.');
            }).catch((err) => {
                console.error('[downloadResultPDF]', err);
                setStatus(`❌ ${err.message || 'Gagal membuat PDF hasil simulasi.'}`);
            });
        }

        /**
         * downloadFormPDF — generator PDF generik untuk formulir 1770 & 1771
         * (bagian 17: "Cetak Formulir" / "Download PDF" — sebelumnya kedua
         * formulir ini TIDAK punya cara export sama sekali, hanya hasil akhir
         * simulasi yang bisa diunduh).
         *
         * Dua masalah teknis yang wajib ditangani supaya PDF tidak kosong/rusak:
         *  1. Formulir memakai tab (hanya 1 lampiran tampil lewat inline
         *     style.display) — clone standar cuma akan berisi tab yang aktif
         *     saat tombol diklik. Semua lampiran dipaksa tampil di clone.
         *  2. cloneNode() TIDAK menangkap nilai <input>/<select> yang sedang
         *     diisi user (hanya atribut HTML awal) — tanpa langkah tambahan,
         *     PDF akan menampilkan formulir kosong walau siswa sudah mengisi
         *     penuh. Setiap input/select diganti teks statis berisi nilai
         *     LIVE-nya, dicocokkan berdasarkan urutan posisi (bukan id) supaya
         *     baris dinamis (harta, bukti potong, dll., yang idnya tidak
         *     selalu unik) tetap ikut tertangani dengan benar.
         */
        function downloadFormPDF(viewId, fieldPrefix, tabCount, formLabel) {
            const source = document.getElementById(viewId);
            if (!source) {
                alert('❌ Area formulir tidak ditemukan.');
                return;
            }
            if (!window.PDFExport) {
                alert('❌ Mesin PDF tidak tersedia. Coba muat ulang halaman.');
                return;
            }

            const titleEl = document.getElementById(fieldPrefix + '-title');
            const caseName = titleEl ? titleEl.innerText.trim() : 'Kasus';
            const filename = `Formulir_${formLabel}_${caseName.replace(/[^a-zA-Z0-9]+/g, '_') || 'Kasus'}.pdf`;

            window.PDFExport.exportElementToPDF(source, {
                filename,
                widthPx: 780,
                scale: 2,
                onClone: (clone) => {
                    // 1. Tampilkan SEMUA lampiran, bukan cuma tab yang aktif.
                    for (let n = 1; n <= tabCount; n++) {
                        const sheet = clone.querySelector('#' + fieldPrefix + '-tab-' + n);
                        if (sheet) sheet.style.display = 'block';
                    }
                    // 2. Buang navigasi tab — tidak relevan begitu semua lampiran tampil.
                    clone.querySelectorAll('.form1770-tabs').forEach((el) => el.remove());

                    // 3. Ganti tiap input/select dengan teks statis berisi nilai SEKARANG.
                    const liveFields = source.querySelectorAll('input, select, textarea');
                    const cloneFields = clone.querySelectorAll('input, select, textarea');
                    liveFields.forEach((liveEl, i) => {
                        const cloneEl = cloneFields[i];
                        if (!cloneEl) return;
                        let text;
                        if (liveEl.tagName === 'SELECT') {
                            const opt = liveEl.options[liveEl.selectedIndex];
                            text = opt ? opt.textContent.trim() : '';
                        } else {
                            text = (liveEl.value || '').trim();
                        }
                        const span = document.createElement('span');
                        span.textContent = text || '—';
                        span.style.cssText = 'display:inline-block;padding:4px 6px;border-bottom:1px solid #94a3b8;min-width:60px;font-size:9.5pt;';
                        cloneEl.replaceWith(span);
                    });

                    // 4. Rapikan tampilan cetak.
                    clone.style.boxShadow = 'none';
                    clone.style.padding = '14px';
                    clone.querySelectorAll('.form1770-sheet').forEach((el) => {
                        el.style.boxShadow = 'none';
                        el.style.border = '1px solid #cbd5e1';
                        el.style.marginBottom = '14px';
                    });
                }
            }).catch((err) => {
                console.error('[downloadFormPDF:' + fieldPrefix + ']', err);
                alert('❌ ' + (err.message || 'Gagal membuat PDF formulir.'));
            });
        }

        function downloadForm1770PDF() { downloadFormPDF('view-form1770', 'f1770', 5, '1770'); }
        function downloadForm1771PDF() { downloadFormPDF('view-form1771', 'f1771', 6, '1771'); }

        // FIX tema gelap: alias warna (--bg-body, --bg-card, --text-main, dst.) didefinisikan di :root
        // sebagai var(--sp-*). Nilainya sudah "terkunci" terang di <html>, jadi kalau data-theme="dark"
        // hanya dipasang di <body>, hanya elemen yang punya aturan [data-theme="dark"] sendiri (topbar)
        // yang ikut berubah. Dengan memasang atribut di <html> DAN <body>, alias di :root ikut dihitung ulang.
        function applySptTheme(dark) {
            [document.documentElement, document.body].forEach(function (el) {
                if (!el) return;
                if (dark) el.setAttribute('data-theme', 'dark');
                else el.removeAttribute('data-theme');
            });
        }

        function toggleTheme() {
            const dark = document.body.getAttribute('data-theme') !== 'dark';
            applySptTheme(dark);
            localStorage.setItem('theme', dark ? 'dark' : 'light');
            const themeToggle = document.getElementById('theme-toggle');
            if(themeToggle) themeToggle.checked = dark;
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if(!sidebar) return;
            const backdrop = document.getElementById('sidebar-backdrop');
            const isMobile = window.matchMedia('(max-width: 768px)').matches;

            // FIX: di mobile, tombol ini buka/tutup drawer (mobile-open + backdrop gelap).
            // Di desktop, tombol ini tetap perilaku lama: mengecilkan sidebar jadi ikon saja (collapsed).
            let isOpenNow;
            if (isMobile) {
                sidebar.classList.toggle('mobile-open');
                isOpenNow = sidebar.classList.contains('mobile-open');
                if (backdrop) backdrop.classList.toggle('active', isOpenNow);
            } else {
                sidebar.classList.toggle('collapsed');
                isOpenNow = !sidebar.classList.contains('collapsed');
            }

            const toggleBtn = document.getElementById('sidebar-toggle');
            if(toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', String(isOpenNow));
                toggleBtn.setAttribute('title', isOpenNow ? 'Sembunyikan menu' : 'Buka menu');
            }
        }

        // FIX: tutup drawer mobile otomatis begitu backdrop di-tap, atau salah satu menu navigasi dipilih —
        // supaya user tidak perlu tap ☰ dua kali (buka menu -> pilih menu -> harus tutup manual lagi).
        function closeMobileSidebar() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (backdrop) backdrop.classList.remove('active');
        }
        document.addEventListener('DOMContentLoaded', function() {
            const backdrop = document.getElementById('sidebar-backdrop');
            if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);

            document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (window.matchMedia('(max-width: 768px)').matches) closeMobileSidebar();
                });
            });

            // Reset state kalau layar di-rotate/resize dari mobile ke desktop supaya tidak nyangkut terbuka
            window.addEventListener('resize', function() {
                if (!window.matchMedia('(max-width: 768px)').matches) closeMobileSidebar();
            });
        });

        function toggleCardInfo(e, moduleKey) {
            e.stopPropagation();
            const btn = e.currentTarget;
            const card = btn.closest('.card');
            if(!card) return;
            const extra = card.querySelector('.card-extra');
            if(card.classList.contains('expanded')) {
                card.classList.remove('expanded');
                if(extra) extra.remove();
                return;
            }
            let content = 'Deskripsi modul belum tersedia.';
            const formCaseMap = { '1770': Form1770Cases, '1770SS': Form1770SSCases, '1770S': Form1770SCases };
            if (formCaseMap[moduleKey] && formCaseMap[moduleKey][0]) {
                content = formCaseMap[moduleKey][0].narrative.substring(0, 220) + '...';
            } else if(databaseKasus[moduleKey] && databaseKasus[moduleKey][0]) {
                content = databaseKasus[moduleKey][0].scenario.substring(0, 220) + '...';
            }
            const el = document.createElement('div');
            el.className = 'card-extra';
            el.innerHTML = `<strong>Contoh Kasus:</strong><div style="margin-top:6px">${content}</div>`;
            card.appendChild(el);
            card.classList.add('expanded');
        }

        function animateCounters() {
            const modulesEl = document.getElementById('stat-modules');
            const xpEl = document.getElementById('stat-xp');
            const levelEl = document.getElementById('stat-level');
            if(!modulesEl || !xpEl || !levelEl) return;

            const modulesTarget = Object.keys(databaseKasus).length;
            const xpTarget = appState.user.xp || 0;
            const levelTarget = appState.user.level || Math.floor((appState.user.xp||0)/200) + 1;

            function run(el, target, duration=600) {
                const start = +el.innerText.replace(/[^0-9]/g,'') || 0;
                const range = target - start;
                const startTime = performance.now();
                function frame(now) {
                    const progress = Math.min((now - startTime) / duration, 1);
                    el.innerText = Math.round(start + range * progress).toLocaleString('id-ID');
                    if(progress < 1) requestAnimationFrame(frame);
                }
                requestAnimationFrame(frame);
            }

            run(modulesEl, modulesTarget);
            run(xpEl, xpTarget);
            run(levelEl, levelTarget);
        }

        function openModeSelect(moduleType) {
            appState.currentModule = moduleType;
            appState.useGenerator = false; // reset tiap masuk modul baru, defaultnya bank soal tetap

            if(!databaseKasus[moduleType]) {
                alert("Modul ini sedang dalam tahap pengembangan (Coming Soon)!");
                return;
            }

            // Toggle "Kasus Acak (Generator)" cuma muncul untuk modul yang sudah didukung CaseGenerator
            const genBox = document.getElementById('generator-toggle-box');
            const genChk = document.getElementById('chk-use-generator');
            const generatorTersedia = (moduleType === 'PPh21');
            genBox.style.display = generatorTersedia ? 'flex' : 'none';
            genChk.checked = false;

            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.getElementById('view-modeselect').classList.add('active');
            document.getElementById('page-title').innerText = `Persiapan Modul: ${moduleType}`;
            document.getElementById('page-subtitle').innerText = "Pilih mode pengerjaan.";
        }

        // ==========================================
        // PEMILIH KASUS (dipakai bersama SPT 1770 / 1770 SS / 1770 S)
        // ==========================================
        function renderCaseCard(c, openerFnName) {
            const div = document.createElement('div');
            div.className = 'card';
            div.style.cursor = 'pointer';
            div.onclick = function() { window[openerFnName](c.id); };
            const teks = (c.narrative || c.scenario || '').substring(0, 170);
            div.innerHTML = '<h3>' + escapeHTML(c.title) + '</h3>' +
                (c.difficulty ? '<span class="tag">' + escapeHTML(c.difficulty) + '</span>' : '') +
                '<p style="margin-top:8px; color: var(--text-muted); font-size: 0.88rem;">' + escapeHTML(teks) + '…</p>';
            return div;
        }

        function showCasePicker(moduleLabel, cases, openerFnName, randomFnName) {
            const listEl = document.getElementById('formcaselist-items');
            listEl.innerHTML = '';
            cases.forEach(function(c) { listEl.appendChild(renderCaseCard(c, openerFnName)); });

            const randomBox = document.getElementById('formcaselist-random-box');
            const randomBtn = document.getElementById('formcaselist-random-btn');
            if (randomFnName) {
                randomBox.style.display = 'flex';
                randomBtn.onclick = function() { window[randomFnName](); };
            } else {
                randomBox.style.display = 'none';
            }

            document.getElementById('formcaselist-title').innerText = 'Pilih Kasus — ' + moduleLabel;
            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-formcaselist').classList.add('active');
            document.getElementById('page-title').innerText = 'Pilih Kasus — ' + moduleLabel;
            document.getElementById('page-subtitle').innerText = 'Pilih salah satu kasus di bawah untuk mulai mengisi formulir, atau buat kasus acak.';
        }

        function openForm1770Picker() { showCasePicker('SPT 1770', Form1770Cases, 'openForm1770', null); }
        function openForm1770SSPicker() { showCasePicker('SPT 1770 SS', Form1770SSCases, 'openForm1770SS', 'openForm1770SSRandom'); }
        function openForm1770SPicker() { showCasePicker('SPT 1770 S', Form1770SCases, 'openForm1770S', 'openForm1770SRandom'); }
