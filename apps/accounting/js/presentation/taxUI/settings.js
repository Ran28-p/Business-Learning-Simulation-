/**
 * taxUI/settings.js — pengaturan pajak: profil perusahaan, tarif PPN, backup/impor/reset, mode pajak, kasus latihan
 * (dipecah dari ../taxUI.js; perilaku identik)
 */
import { updateCompany, addVatRate, getVatRates, deleteVatRate, setMode, setLatihanCase } from '../../tax/taxState.js';
import { parseAmount } from '../../utils/formatters.js';
import { renderCompanyStatusNote, applyInvoiceVatOptions, renderDashboardKPIs, renderVatRateTable, renderLatihanNarrative } from '../taxPages.js';
import { showToast, showModal } from '../modals.js';
import { TAX_MODE } from '../../tax/taxConstants.js';
import { TAX_CASE_STUDIES, getCaseStudyById } from '../../../data/taxCaseStudies.js';

/* ══════════════════════════════════════════════════════════════════
   PENGATURAN PERUSAHAAN & PAJAK
   ══════════════════════════════════════════════════════════════════ */

export function handleSaveCompanyProfile() {
  updateCompany({
    name: document.getElementById('cpName').value.trim(),
    npwp: document.getElementById('cpNpwp').value.trim(),
    address: document.getElementById('cpAddress').value.trim(),
    nik: document.getElementById('cpNik').value.trim(),
    taxStatus: document.getElementById('cpTaxStatus').value,
    pkpDate: document.getElementById('cpPkpDate').value,
    taxId: document.getElementById('cpTaxId').value.trim(),
    defaultVatRatePercent: parseAmount(document.getElementById('cpDefaultVat').value),
    vatBasis: document.getElementById('cpVatBasis').value
  });
  renderCompanyStatusNote();
  applyInvoiceVatOptions();
  renderDashboardKPIs();
  showToast('✅ Profil perusahaan tersimpan.');
}

export function handleAddVatRate() {
  const rate = {
    id: `rate-${Date.now()}`,
    label: document.getElementById('vrLabel').value.trim() || 'Tanpa Label',
    ratePercent: parseAmount(document.getElementById('vrRate').value),
    basis: document.getElementById('vrBasis').value,
    effectiveDate: document.getElementById('vrEffectiveDate').value || new Date().toISOString().slice(0, 10),
    status: document.getElementById('vrStatus').value
  };
  addVatRate(rate);
  renderVatRateTable();
  showToast('✅ Tarif PPN baru ditambahkan.');
}

export function handleDeleteVatRate(id) {
  if (getVatRates().length <= 1) {
    showModal('Tidak Dapat Dihapus', 'Minimal harus ada satu tarif PPN yang tersimpan.');
    return;
  }
  if (!confirm('Hapus tarif PPN ini?')) return;
  deleteVatRate(id);
  renderVatRateTable();
}

/* ══════════════════════════════════════════════════════════════════
   BACKUP / IMPORT / EXPORT / RESET (whole app)
   ══════════════════════════════════════════════════════════════════ */

export async function handleBackupExport() {
  const { exportAllData } = await import('../../storage/localStorage.js');
  const bundle = exportAllData();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ActMasterPro_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('💾 Backup data berhasil diunduh.');
}

export function handleTriggerImport() {
  const input = document.getElementById('importDataInput');
  if (input) input.click();
}

export async function handleImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const bundle = JSON.parse(text);
    const { importAllData } = await import('../../storage/localStorage.js');
    importAllData(bundle);
    showModal('Import Berhasil', 'Data berhasil dipulihkan. Halaman akan dimuat ulang untuk menerapkan perubahan.');
    setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    showModal('Import Gagal', 'Berkas backup tidak valid atau rusak. Pastikan Anda memilih berkas JSON hasil export dari aplikasi ini.');
  } finally {
    e.target.value = '';
  }
}

export async function handleResetAllData() {
  const confirmed = confirm(
    'Reset akan menghapus SELURUH data aplikasi (progres latihan, master data, invoice, pembelian, jurnal, dan pengaturan). Tindakan ini tidak dapat dibatalkan. Lanjutkan?'
  );
  if (!confirmed) return;
  const { resetAllData } = await import('../../storage/localStorage.js');
  resetAllData();
  window.location.reload();
}

/* ══════════════════════════════════════════════════════════════════
   MODE OPERASIONAL / LATIHAN
   ══════════════════════════════════════════════════════════════════ */

export function handleSetTaxMode(mode) {
  setMode(mode);
  document.getElementById('btnModeOperasional').classList.toggle('active', mode === TAX_MODE.OPERASIONAL);
  document.getElementById('btnModeOperasional').classList.toggle('btn-secondary', mode !== TAX_MODE.OPERASIONAL);
  document.getElementById('btnModeLatihan').classList.toggle('active', mode === TAX_MODE.LATIHAN);
  document.getElementById('btnModeLatihan').classList.toggle('btn-secondary', mode !== TAX_MODE.LATIHAN);
  const panel = document.getElementById('latihanPanel');
  if (panel) panel.style.display = mode === TAX_MODE.LATIHAN ? 'block' : 'none';

  if (mode === TAX_MODE.LATIHAN) {
    const sel = document.getElementById('latihanCaseSelect');
    const caseId = sel?.value || TAX_CASE_STUDIES[0]?.id;
    if (caseId) {
      setLatihanCase(caseId);
      renderLatihanNarrative(getCaseStudyById(caseId));
    }
  }
}

export function handleLatihanCaseChange() {
  const sel = document.getElementById('latihanCaseSelect');
  const caseId = sel.value;
  setLatihanCase(caseId);
  renderLatihanNarrative(getCaseStudyById(caseId));
  const resultArea = document.getElementById('latihanResultArea');
  if (resultArea) resultArea.innerHTML = '';
}
