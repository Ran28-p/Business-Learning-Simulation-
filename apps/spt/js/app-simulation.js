// app-simulation.js — bagian dari app-main.js yang dipecah per tanggung jawab (perilaku identik).
// Alur simulasi (mulai, render, cek, submit, riwayat), window.onload, ekspor/impor backup.
// Classic script: dimuat BERURUTAN setelah app-main.js (lihat index.html); semua nama tetap global yang sama.

                function startSimulation(mode) {
            appState.currentMode = mode;

            // Kalau toggle generator aktif dan modul ini didukung, pakai kasus acak;
            // kalau tidak (atau modulnya belum didukung generator), pakai bank soal tetap seperti biasa.
            const generated = appState.useGenerator ? CaseGenerator.generate(appState.currentModule) : null;
            if (generated) {
                appState.currentCase = generated;
            } else {
                const cases = databaseKasus[appState.currentModule];
                appState.currentCase = cases[Math.floor(Math.random() * cases.length)];
            }

            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.getElementById('view-simulation').classList.add('active');
            
            document.getElementById('page-title').innerText = `Simulasi ${appState.currentModule}`;
            document.getElementById('page-subtitle').innerText = "Isi formulir berdasarkan data kasus di bawah.";
            
            const badge = document.getElementById('sim-badge-mode');
            if(mode === 'latihan') {
                badge.innerText = "MODE LATIHAN";
                badge.style.background = "var(--info)";
                document.getElementById('btn-cek-jawaban').style.display = 'inline-block';
            } else {
                badge.innerText = "MODE UJIAN";
                badge.style.background = "var(--danger)";
                document.getElementById('btn-cek-jawaban').style.display = 'none';
            }

            document.getElementById('case-title').innerText = appState.currentCase.title;
            document.getElementById('case-scenario').innerText = appState.currentCase.scenario;

            renderForm();
        }

        function renderForm() {
            const container = document.getElementById('dynamic-form-container');
            container.innerHTML = '';

            appState.currentCase.questions.forEach((q, index) => {
                const group = document.createElement('div');
                group.className = 'form-group';
                
                let labelHtml = `<label for="${q.id}">${q.label}`;
                if(appState.currentMode === 'latihan') {
                    labelHtml += ` <span class="tooltip-icon">?
                        <span class="tooltip-text">Petunjuk AI: ${q.hint}</span>
                    </span>`;
                }
                labelHtml += `</label>`;

                let inputHtml = '';
                if(q.type === 'select') {
                    inputHtml = `<select id="${q.id}" required>
                        <option value="">-- Pilih --</option>
                        ${q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>`;
                } else {
                    inputHtml = `<input type="text" id="${q.id}" required placeholder="Contoh: 10.000.000">`;
                }

                group.innerHTML = labelHtml + inputHtml + `<div id="feed-${q.id}" class="feedback"></div>`;
                container.appendChild(group);
            });
        }

        // ==========================================
        // 5. VALIDATION & SUBMISSION
        // ==========================================
        
        function cleanNumber(val) {
            if (!val) return 0;
            // FIX: buang dulu semua karakter selain digit/titik/koma/minus, supaya input
            // seperti "Infinity", "NaN", atau teks acak tidak ikut lolos ke parseFloat.
            // Catatan: fungsi ini mengasumsikan format angka Indonesia (titik=ribuan,
            // koma=desimal) sesuai placeholder "Contoh: 10.000.000" di form — format lain
            // (mis. "1,234,567.89" gaya US) tidak akan terbaca benar.
            let raw = val.toString().replace(/Rp|\s/gi, '').trim();
            raw = raw.replace(/[^0-9.,-]/g, '');
            if (!raw) return 0;
            let cleaned = raw.replace(/\./g, '').replace(',', '.');
            const result = parseFloat(cleaned);
            return Number.isFinite(result) ? result : 0;
        }

        function checkAnswers() {
            appState.currentCase.questions.forEach(q => {
                const val = document.getElementById(q.id).value;
                const feedbackEl = document.getElementById(`feed-${q.id}`);
                
                if(!val) {
                    feedbackEl.className = 'feedback';
                    feedbackEl.innerHTML = '';
                    return;
                }

                let isCorrect = false;
                if(q.type === 'number') {
                    isCorrect = (cleanNumber(val) === cleanNumber(q.correct));
                } else {
                    isCorrect = (val.toString().trim().toLowerCase() === q.correct.toString().trim().toLowerCase());
                }

                if(isCorrect) {
                    feedbackEl.className = 'feedback success';
                    feedbackEl.innerHTML = '✅ Benar!';
                } else {
                    feedbackEl.className = 'feedback error';
                    feedbackEl.innerHTML = `❌ Salah. (Clue: ${q.hint})`;
                }
            });
        }

        function submitSimulation() {
            let correctCount = 0;
            let totalQuestions = appState.currentCase.questions.length;

            appState.currentCase.questions.forEach(q => {
                const val = document.getElementById(q.id).value;
                if(q.type === 'number') {
                    if(cleanNumber(val) === cleanNumber(q.correct)) correctCount++;
                } else {
                    if(val.toString().trim().toLowerCase() === q.correct.toString().trim().toLowerCase()) correctCount++;
                }
            });

            const score = Math.round((correctCount / totalQuestions) * 100);
            
            let category = "";
            let color = "";
            if (score >= 90) { category = "Sangat Baik"; color = "var(--success)"; }
            else if (score >= 70) { category = "Baik"; color = "var(--info)"; }
            else if (score >= 50) { category = "Cukup"; color = "var(--warning)"; }
            else { category = "Kurang"; color = "var(--danger)"; }

            const circle = document.getElementById('result-score');
            circle.innerText = score;
            circle.style.borderColor = color;
            circle.style.color = color;
            
            document.getElementById('result-category').innerText = category;
            
            let xpGain = score; 
            if(appState.currentMode === 'ujian') xpGain = Math.round(xpGain * 1.5);
            document.getElementById('result-xp-gain').innerText = `+${xpGain} XP Diperoleh!`;

            let explHtml = `<strong>Dasar Hukum & Analisis Kasus:</strong><br><br>${appState.currentCase.explanation}<br><br>`;
            explHtml += `<strong>Kunci Jawaban:</strong><ul>`;
            appState.currentCase.questions.forEach(q => {
                explHtml += `<li>${q.label} : <strong>${q.correct}</strong></li>`;
            });
            explHtml += `</ul>`;
            document.getElementById('result-explanation').innerHTML = explHtml;

            appState.user.xp += xpGain;
            appState.user.history.push({
                date: new Date().toLocaleDateString('id-ID'),
                module: appState.currentModule,
                mode: appState.currentMode,
                score: score
            });
            
            saveData();
            updateProfileUI();

            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.getElementById('view-result').classList.add('active');
            document.getElementById('page-title').innerText = "Laporan Simulasi";
            document.getElementById('page-subtitle').innerText = "Evaluasi hasil pengisian SPT Anda.";
        }

        function renderHistory() {
            const tbody = document.getElementById('history-table-body');
            tbody.innerHTML = '';
            
            if(appState.user.history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Belum ada riwayat latihan.</td></tr>';
                return;
            }

            const reversed = [...appState.user.history].reverse();

            reversed.forEach(h => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px; border-bottom: 1px solid var(--border);">${h.date}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border);">${h.module}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border); text-transform: capitalize;">${h.mode}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>${h.score}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // INIT
        window.onload = function() {
            loadData(); // isi appState.user dari localStorage dulu -- app langsung bisa dipakai walau offline
            initFirebaseServices(); // baru setelah itu coba nyambung ke Firebase (login & sinkron cloud)
            renderTabloidLinks();
            
            // Perbaikan pemanggilan function agar valid
            fetchRegulationUpdates();
            
            updateProfileUI();
            animateCounters();
        };

        // ==========================================
        // FITUR EXPORT / IMPORT DATA (BACKUP) — sekarang mencadangkan SEMUA modul
        // (dashboard XP, Tax Career, Faktur & Bukti Potong, draft+nilai formulir
        // 1771) lewat js/shared/backup-utils.js, bukan cuma XP dashboard seperti
        // sebelumnya. File backup lama (XP-only) tetap bisa dipulihkan (legacy).
        // ==========================================
        function exportData() {
            if (window.BackupUtils) {
                BackupUtils.downloadBackup('backup-sim-spt-lengkap.json');
            } else {
                // fallback kalau backup-utils.js gagal dimuat: minimal tetap backup XP
                const dataStr = JSON.stringify(appState.user);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', 'backup-simulator-spt.json');
                linkElement.click();
            }
        }

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!window.BackupUtils) {
                alert('❌ Modul backup tidak termuat — coba muat ulang halaman.');
                event.target.value = '';
                return;
            }

            BackupUtils.readAndRestoreFile(file, function (result) {
                if (result.ok) {
                    // Kalau backup yang dipulihkan menyertakan data XP dashboard, sinkronkan
                    // appState di memori juga supaya UI langsung ter-update tanpa reload.
                    if (result.restored.includes('spt_simulator_data')) {
                        try {
                            appState.user = JSON.parse(localStorage.getItem('spt_simulator_data'));
                            saveData();
                            updateProfileUI();
                            if (document.getElementById('view-history').classList.contains('active')) {
                                renderHistory();
                            }
                        } catch (e) { /* biarkan, data lain tetap tersimpan */ }
                    }
                    const jumlah = result.restored.length;
                    alert(result.legacy
                        ? '✅ Data progress (format lama) berhasil dimuat!'
                        : `✅ ${jumlah} bagian data berhasil dipulihkan! Muat ulang halaman/modul terkait untuk melihat hasilnya sepenuhnya.`);
                } else {
                    alert('❌ ' + (result.error || 'File tidak valid!'));
                }
            });
            event.target.value = '';
        }

        document.getElementById('btn-hapus-riwayat').addEventListener('click', function() {
            let konfirmasi = confirm("Apakah Anda yakin ingin menghapus seluruh riwayat pembelajaran?");
            
            if (konfirmasi) {
                // BUG FIX: localStorage.removeItem hanya menerima 1 argumen, yaitu nama key
                localStorage.removeItem('spt_simulator_data'); 
                
                alert("Riwayat berhasil dihapus!");
                window.location.reload(); 
            }
        });
