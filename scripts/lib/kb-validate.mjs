// Validator skema konten Knowledge Base (dipakai scripts/check-knowledge.mjs & tests/test-knowledge-schema.mjs).
// Murni fungsi — tanpa I/O, tanpa dependency. Skema lengkap: lihat js/knowledge-base.js (blok "SUMBER & KEPERCAYAAN MATERI").

export const SOURCE_TYPES = ['uu', 'pp', 'perpres', 'pmk', 'per', 'se', 'psak', 'isak', 'standar', 'vendor', 'lain'];
const REVIEWED_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const HTTPS_RE = /^https:\/\/[^\s"'<>]+$/i;

/** Hitung jumlah tag buka vs tutup untuk tag blok yang harus seimbang. */
export function unbalancedTags(html) {
  const bad = [];
  for (const tag of ['div', 'table', 'thead', 'tbody', 'tr', 'ul', 'ol', 'li', 'p', 'strong', 'em']) {
    const open = (html.match(new RegExp('<' + tag + '(\\s[^>]*)?>', 'gi')) || []).length;
    const close = (html.match(new RegExp('</' + tag + '>', 'gi')) || []).length;
    if (open !== close) bad.push(`<${tag}> buka=${open} tutup=${close}`);
  }
  return bad;
}

/**
 * @param {object} content  objek KNOWLEDGE_CONTENT_*
 * @param {{now?: Date}} [opts]
 * @returns {{errors: string[], warnings: string[], stats: object}}
 */
export function validateContent(content, opts = {}) {
  const now = opts.now || new Date();
  const nowYm = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const errors = [];
  const warnings = [];
  const stats = { chapters: 0, sections: 0, exempt: 0, withSources: 0, withReviewed: 0, withSourcesAndReviewed: 0, legacyLegalOnly: 0 };

  if (!content || typeof content !== 'object') return { errors: ['konten bukan objek'], warnings, stats };
  if (!content.title || typeof content.title !== 'string') errors.push('title kosong / bukan string');
  if (content.disclaimer !== undefined && (typeof content.disclaimer !== 'string' || !content.disclaimer.trim() || content.disclaimer.length > 400)) {
    errors.push('disclaimer harus string tidak kosong, maksimal 400 karakter');
  }
  if (!Array.isArray(content.chapters) || !content.chapters.length) {
    errors.push('chapters kosong');
    return { errors, warnings, stats };
  }

  const ids = new Set();
  const useId = (id, where) => {
    if (!id) return;
    if (ids.has(id)) errors.push(`${where}: id duplikat "${id}"`);
    ids.add(id);
  };

  content.chapters.forEach((ch, ci) => {
    stats.chapters++;
    const cw = `bab[${ci}] "${ch && ch.title}"`;
    if (!ch || !ch.title) { errors.push(`${cw}: title kosong`); return; }
    useId(ch.id, cw);
    if (!Array.isArray(ch.sections) || !ch.sections.length) { errors.push(`${cw}: sections kosong`); return; }
    ch.sections.forEach((sec, si) => {
      stats.sections++;
      const sw = `${cw} › sub[${si}] "${sec && sec.heading}"`;
      if (!sec || !sec.heading) { errors.push(`${sw}: heading kosong`); return; }
      if (typeof sec.body !== 'string' || !sec.body.trim()) errors.push(`${sw}: body kosong`);
      useId(sec.id, sw);

      const bad = typeof sec.body === 'string' ? unbalancedTags(sec.body) : [];
      if (bad.length) warnings.push(`${sw}: tag HTML tidak seimbang (${bad.join('; ')})`);

      let exempt = false;
      if (sec.noSourceNeeded !== undefined) {
        const r = sec.noSourceNeeded;
        if (typeof r !== 'string' || r.trim().length < 15 || r.length > 200) {
          errors.push(`${sw}: noSourceNeeded harus berisi alasan 15–200 karakter (mis. "Konvensi pencatatan; bukan ketentuan regulasi")`);
        } else if (sec.sources !== undefined || sec.reviewed !== undefined) {
          errors.push(`${sw}: noSourceNeeded tidak boleh digabung dengan sources/reviewed`);
        } else { exempt = true; stats.exempt++; }
      }

      let hasSrc = false;
      if (sec.sources !== undefined) {
        if (!Array.isArray(sec.sources) || !sec.sources.length) {
          errors.push(`${sw}: sources harus array tidak kosong (hapus field bila memang belum ada)`);
        } else {
          sec.sources.forEach((s, k) => {
            const w = `${sw} › sources[${k}]`;
            if (!s || typeof s !== 'object') { errors.push(`${w}: bukan objek`); return; }
            if (!SOURCE_TYPES.includes(s.type)) errors.push(`${w}: type "${s.type}" tidak dikenal (${SOURCE_TYPES.join('/')})`);
            if (!s.ref || typeof s.ref !== 'string' || s.ref.trim().length < 3) errors.push(`${w}: ref wajib (mis. "UU 6/1983 s.t.d.t.d. UU 7/2021 Pasal 12 ayat (1)")`);
            if (s.url !== undefined && !HTTPS_RE.test(s.url)) errors.push(`${w}: url harus https://…`);
            if (s.note !== undefined && typeof s.note !== 'string') errors.push(`${w}: note harus string`);
          });
          hasSrc = true;
        }
      }
      let hasRev = false;
      if (sec.reviewed !== undefined) {
        const m = REVIEWED_RE.exec(String(sec.reviewed));
        if (!m) errors.push(`${sw}: reviewed harus 'YYYY-MM'`);
        else {
          hasRev = true;
          if (+m[1] * 12 + (+m[2] - 1) > nowYm) errors.push(`${sw}: reviewed "${sec.reviewed}" ada di masa depan`);
          if (!hasSrc) errors.push(`${sw}: reviewed tanpa sources — tanggal tinjau hanya bermakna bila rujukannya dicantumkan`);
        }
      }
      if (hasSrc) stats.withSources++;
      if (hasRev) stats.withReviewed++;
      if (hasSrc && hasRev) stats.withSourcesAndReviewed++;
      if (!hasSrc && /kb-legal/.test(sec.body || '')) stats.legacyLegalOnly++;
    });
  });
  return { errors, warnings, stats };
}
