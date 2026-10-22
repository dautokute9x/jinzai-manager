// GĐ 11.3 (D-080): 定期面談 theo QUÝ CỐ ĐỊNH (4–6, 7–9, 10–12, 1–3) — chủ dự án chọn. 1 dòng MENDAN / người / quý.
// Người cần phỏng vấn trong quý: có lần vào làm ĐƯỢC HỖ TRỢ (không phải 支援なし) đang làm ít nhất 1 ngày trong quý,
// tính từ quý vào làm (dữ liệu nhập từ file cũ: từ quý nhập). Nhật ký hỗ trợ cũ loại 定期面談 trong quý cũng tính là đã làm.

// 'yyyy-MM-dd' → tháng đầu quý 'yyyy-01' | '-04' | '-07' | '-10'.
function quarterOf_(ymd) {
  const m = Number(String(ymd).slice(5, 7));
  return String(ymd).slice(0, 4) + '-' + String(m - ((m - 1) % 3)).padStart(2, '0');
}
function quarterStart_(ky) { return ky + '-01'; }
function quarterEnd_(ky) {
  const y = Number(ky.slice(0, 4)); const m = Number(ky.slice(5, 7)) + 2;
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); // ngày 0 của tháng sau = ngày cuối tháng m
}
function quarterShift_(ky, n) { return shiftMonth_(ky, 3 * n); }

// Lần vào làm có cần 定期面談 trong quý ky không.
function mendanRequired_(e, ky) {
  if (e.da_an || e.ho_tro === 'N') return false;
  const qs = quarterStart_(ky); const qe = quarterEnd_(ky);
  if (e.ngay_nghi && e.ngay_nghi < qs) return false;
  if (!e.ngay_nghi && e.tinh_trang === 'da_nghi') return false; // đã nghỉ, không rõ ngày
  if (e.ngay_vao_lam ? e.ngay_vao_lam > qe : e.tinh_trang !== 'dang_lam') return false;
  if (e.tinh_trang && quarterOf_(String(e.tao_luc || '').slice(0, 10) || qs) > ky) return false; // dữ liệu cũ: từ quý nhập
  return true;
}

// Tình trạng 定期面談 của 1 người: quý này, quý trước (quá hạn nếu cần mà chưa làm), lần gần nhất, ngày hạn tiếp theo.
function mendanState_(personId, emps, mendans, logs, today) {
  const cur = quarterOf_(today);
  const prev = quarterShift_(cur, -1);
  const mine = emps.filter((e) => e.person_id === personId);
  const recs = mendans.filter((m) => !m.da_an && m.person_id === personId);
  const oldLogs = logs.filter((l) => !l.da_an && l.loai_ho_tro === 'dinh_ky' && l.person_id === personId);
  const doneIn = (ky) => recs.some((m) => m.ky === ky && m.trang_thai === 'hoan_thanh')
    || oldLogs.some((l) => l.ngay >= quarterStart_(ky) && l.ngay <= quarterEnd_(ky));
  const need = (ky) => mine.some((e) => mendanRequired_(e, ky));
  const last = recs.filter((m) => m.trang_thai === 'hoan_thanh').map((m) => m.ngay_thuc_hien).concat(oldLogs.map((l) => l.ngay))
    .reduce((x, d) => (d > x ? d : x), '');
  const curNeed = need(cur);
  const curDone = curNeed && doneIn(cur);
  return { cur: cur, curNeed: curNeed, curDone: curDone, curRec: recs.find((m) => m.ky === cur) || null,
    prev: prev, prevMissing: need(prev) && !doneIn(prev), last: last,
    due: !curNeed ? '' : curDone ? quarterEnd_(quarterShift_(cur, 1)) : quarterEnd_(cur) };
}

// Trang 定期面談: danh sách người cần phỏng vấn trong 1 quý. filter: { ky, staffId (CS), companyId, state }.
// state: '' | 'chua_dat_lich' | 'da_dat_lich' | 'can_hen_lai' | 'hoan_thanh' | 'chua_xong' (mọi trạng thái trừ hoàn thành) | 'qua_han' | 'sap_toi'.
function getMendanPlan(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const ky = /^\d{4}-(01|04|07|10)$/.test(f.ky || '') ? f.ky : quarterOf_(today);
  const live = (r) => !r.da_an;
  const people = readAll_(openTable_('PERSON'));
  const companies = readAll_(openTable_('COMPANY'));
  const staff = readAll_(openTable_('STAFF'));
  const emps = readAll_(openTable_('EMPLOYMENT')).filter(live);
  const mendans = readAll_(openTable_('MENDAN')).filter(live);
  const logs = readAll_(openTable_('SUPPORT_LOG')).filter(live);
  const incidents = readAll_(openTable_('INCIDENT')).filter(live).filter((x) => INCIDENT_DONE.indexOf(x.trang_thai) < 0);
  const qs = quarterStart_(ky); const qe = quarterEnd_(ky);
  const seen = {};
  const rows = [];
  emps.filter((e) => mendanRequired_(e, ky)).sort((a, b) => ((b.ngay_vao_lam || '') < (a.ngay_vao_lam || '') ? -1 : 1)).forEach((e) => {
    if (seen[e.person_id]) return; // 1 dòng / người (lần vào làm mới nhất)
    seen[e.person_id] = true;
    const p = people.find((x) => x.id === e.person_id) || {};
    const c = companies.find((x) => x.id === e.company_id) || {};
    const sup = supportStaffOf_(p, c);
    const rec = mendans.find((m) => m.person_id === e.person_id && m.ky === ky) || null;
    const oldDone = logs.find((l) => l.loai_ho_tro === 'dinh_ky' && l.person_id === e.person_id && l.ngay >= qs && l.ngay <= qe);
    const state = rec ? rec.trang_thai : oldDone ? 'hoan_thanh' : 'chua_dat_lich';
    const overdue = state !== 'hoan_thanh' && qe < today;
    const soon = state === 'da_dat_lich' && rec.ngay_du_kien && rec.ngay_du_kien <= addDays_(today, 14) && rec.ngay_du_kien >= today;
    rows.push({ person_id: e.person_id, person_ma: p.ma || '', person: p.ho_ten_latin || '', employment_id: e.id,
      company_id: e.company_id, company: (c.ten_phap_nhan || '') + (c.ten_co_so ? ' / ' + c.ten_co_so : ''),
      support_ids: sup, support: sup.map((id) => (staff.find((s) => s.id === id) || {}).ho_ten || '').filter(String).join(', '),
      rec: rec ? public_(rec) : null, old_log: oldDone ? { ma: oldDone.ma, ngay: oldDone.ngay } : null, state: state, overdue: overdue, soon: !!soon,
      open_incidents: incidents.filter((x) => splitIds_(x.person_ids).indexOf(e.person_id) >= 0).length });
  });
  const out = rows
    .filter((r) => !f.staffId || r.support_ids.indexOf(f.staffId) >= 0 || (r.rec && r.rec.staff_id === f.staffId))
    .filter((r) => !f.companyId || r.company_id === f.companyId)
    .filter((r) => !f.state || (f.state === 'chua_xong' ? r.state !== 'hoan_thanh' : f.state === 'qua_han' ? r.overdue : f.state === 'sap_toi' ? r.soon : r.state === f.state))
    .sort((a, b) => (a.company !== b.company ? (a.company < b.company ? -1 : 1) : (a.person < b.person ? -1 : 1)));
  const counts = {};
  rows.forEach((r) => { counts[r.state] = (counts[r.state] || 0) + 1; });
  return { ky: ky, start: qs, end: qe, today: today, rows: out, total: rows.length, counts: counts,
    quarters: [-3, -2, -1, 0, 1].map((n) => quarterShift_(quarterOf_(today), n)),
    staff: staff.map((s) => ({ id: s.id, ho_ten: s.ho_ten, inactive: s.trang_thai !== 'dang_lam' || !!s.da_an })),
    companies: companies.filter(live).map((c) => ({ id: c.id, label: c.ma + ' · ' + c.ten_phap_nhan })) };
}
