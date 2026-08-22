# Design System — Business Learning Simulation

Dokumen ini menjadi **sumber kebenaran tunggal** untuk token visual, tipografi, spacing, dan pola UI di seluruh portal + modul (`accounting`, `excel`, `sql-pq`, `spt`).

Prinsip utama:
- **Light mode** = putih + biru muda (clean, professional, mudah dibaca lama).
- **Dark mode** tetap didukung penuh lewat switcher (tombol 🌙/☀️ atau toggle switch).
- Semua warna lewat **CSS custom properties** (`:root` + `[data-theme="dark"]`).
- Tidak ada hard-code warna di komponen; selalu pakai token.

---

## 1. Color Tokens

### 1.1 Light Mode (default) — Putih & Biru Muda

```css
:root {
  /* Brand */
  --primary:          #0b5cab;   /* biru utama */
  --primary-dark:     #084480;   /* hover / pressed */
  --primary-soft:     #e8f1fb;   /* background soft / chip */
  --primary-light:    #dbeafe;   /* accent light */

  /* Accent (opsional, untuk highlight / success secondary) */
  --accent:           #0d9488;   /* teal */
  --accent-soft:      #ccfbf1;

  /* Surface & Background */
  --bg:               #f4f7fb;   /* page background */
  --surface:          #ffffff;   /* card, modal, input */
  --surface-elevated: #ffffff;

  /* Text */
  --text:             #0f172a;   /* primary text */
  --muted:            #64748b;   /* secondary text */
  --text-inverse:     #ffffff;

  /* Border & Divider */
  --border:           #d7e3f0;
  --border-strong:    #b6c9de;

  /* Semantic */
  --success:          #10b981;
  --success-soft:     #ecfdf5;
  --warning:          #f59e0b;
  --warning-soft:     #fffbeb;
  --danger:           #dc2626;
  --danger-soft:      #fef2f2;
  --info:             #0b5cab;
  --info-soft:        #e8f1fb;

  /* Shadow */
  --shadow:           0 10px 30px rgba(15, 23, 42, 0.08);
  --shadow-sm:        0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-lg:        0 20px 50px rgba(15, 23, 42, 0.12);

  /* Radius */
  --radius-sm:        6px;
  --radius-md:        10px;
  --radius-lg:        16px;
  --radius-xl:        20px;
  --radius:           var(--radius-lg);

  /* Font */
  --font:             "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-mono:        "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

### 1.2 Dark Mode — tetap ada, tidak dihapus

```css
[data-theme="dark"] {
  --primary:          #3b82f6;
  --primary-dark:     #60a5fa;
  --primary-soft:     #1e3a8a;
  --primary-light:    #1e3a8a;

  --accent:           #2dd4bf;
  --accent-soft:      #134e4a;

  --bg:               #0f172a;
  --surface:          #1e293b;
  --surface-elevated: #1e293b;

  --text:             #f8fafc;
  --muted:            #94a3b8;
  --text-inverse:     #0f172a;

  --border:           #334155;
  --border-strong:    #475569;

  --success:          #34d399;
  --success-soft:     #064e3b;
  --warning:          #fbbf24;
  --warning-soft:     #78350f;
  --danger:           #f87171;
  --danger-soft:      #7f1d1d;
  --info:             #60a5fa;
  --info-soft:        #1e3a8a;

  --shadow:           0 10px 30px rgba(0, 0, 0, 0.45);
  --shadow-sm:        0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-lg:        0 20px 50px rgba(0, 0, 0, 0.55);
}
```

> **Catatan implementasi**: Attribute `data-theme="dark"` diletakkan di `<html>`. Preferensi disimpan di `localStorage` (key: `bls-theme` atau yang sudah dipakai modul).

---

## 2. Theme Switcher (wajib dipertahankan)

### 2.1 Pola yang sudah dipakai di proyek

| Modul        | Elemen UI              | Atribut / Class          | Persistensi          |
|--------------|------------------------|--------------------------|----------------------|
| Accounting   | Tombol 🌙 / ☀️         | `#themeBtn` + `data-theme` | `localStorage`      |
| SPT          | Toggle switch          | `.theme-switch`          | `localStorage`      |
| SQL-PQ       | (sudah support)        | `html[data-theme="dark"]`| `localStorage`      |
| Portal       | (disarankan ditambah)  | sama                     | sama                |

### 2.2 JavaScript minimal (shared)

```js
const THEME_KEY = 'bls-theme';

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.removeAttribute('data-theme');
  }
}

function toggleTheme() {
  const next = loadTheme() === 'dark' ? 'light' : 'dark';
  saveTheme(next);
  applyTheme(next);
  // Update icon jika ada
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(loadTheme());
});
```

### 2.3 Markup tombol (contoh)

```html
<button type="button" class="theme-toggle" id="themeBtn" aria-label="Toggle dark mode">
  🌙
</button>
```

CSS tombol (ringan):

```css
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  transition: background 0.2s, border-color 0.2s;
}
.theme-toggle:hover {
  background: var(--primary-soft);
  border-color: var(--primary);
}
```

---

## 3. Typography

| Token        | Value                                      | Penggunaan              |
|--------------|--------------------------------------------|-------------------------|
| `--font`     | `"Segoe UI", system-ui, -apple-system, sans-serif` | UI umum                |
| `--font-mono`| `"JetBrains Mono", ui-monospace, ...`      | Kode, SQL, formula     |

Skala ukuran yang disarankan:

- Display / judul besar: `1.75–2rem`
- Heading 1: `1.35–1.5rem`
- Heading 2: `1.15–1.25rem`
- Body: `0.95–1rem`
- Caption / label: `0.82–0.875rem`
- Kode: `0.875rem` mono

---

## 4. Spacing & Layout

Gunakan kelipatan **4px** / **8px**:

```
4  · 8  · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64
```

Card padding standar: `20–28px`  
Gap antar card: `16–24px`  
Radius card: `var(--radius-lg)` (16px)

---

## 5. Komponen Inti (ringkas)

### Button

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  transition: filter 0.15s, transform 0.1s;
}
.btn-primary {
  background: var(--primary);
  color: var(--text-inverse);
}
.btn-primary:hover { background: var(--primary-dark); }
.btn-ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
}
.btn-ghost:hover { background: var(--primary-soft); }
```

### Card / Surface

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 24px;
}
```

### Input

```css
.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: 0.98rem;
  outline: none;
}
.field input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}
```

---

## 6. Aturan Penggunaan

1. **Jangan hard-code hex** di file CSS modul. Selalu refer ke token di atas.
2. Jika modul butuh warna ekstra (mis. hijau Excel, indigo SQL), tambahkan sebagai **token lokal** yang diturunkan dari primary/accent, bukan warna baru yang bentrok.
3. Dark mode **wajib** diuji setiap kali menambah komponen baru.
4. Preferensi tema bersifat **global** (satu key `localStorage` untuk seluruh portal + modul).
5. Sidebar gelap (seperti di Accounting & SPT) boleh tetap gelap di light mode (pola “dark sidebar + light content” masih valid).

---

## 7. Checklist implementasi per modul

| Modul          | Token `:root` | `[data-theme="dark"]` | Switcher UI | Persistensi |
|----------------|---------------|-----------------------|-------------|-------------|
| Portal         | ✅ (sesuaikan) | Tambahkan             | Disarankan  | Ya          |
| Accounting     | ✅             | ✅                    | ✅ 🌙/☀️    | Ya          |
| SPT            | ✅             | ✅                    | ✅ toggle   | Ya          |
| SQL-PQ         | ✅             | ✅                    | Cek/rapikan | Ya          |
| Excel          | Sesuaikan      | Tambahkan jika belum  | Opsional    | Ya          |

---

## 8. Referensi cepat warna (swatch)

**Light**
- Primary `#0b5cab` · Soft `#e8f1fb` · BG `#f4f7fb` · Surface `#ffffff` · Text `#0f172a`

**Dark**
- Primary `#3b82f6` · Soft `#1e3a8a` · BG `#0f172a` · Surface `#1e293b` · Text `#f8fafc`

---

*Dokumen ini dibuat untuk menjaga konsistensi visual sambil tetap menghormati fitur dark-mode switcher yang sudah ada di codebase.*
