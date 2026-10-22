// GĐ 5 (D-069): hợp đồng phí, doanh số, mục tiêu. Tiền: Yên, chưa thuế, số nguyên. Ngày theo JST (D-014).
// Doanh số ghi nhận theo NGÀY PHÁT SINH: giới thiệu / phần còn lại = ngày vào làm; cọc = ngày 内定承諾; hỗ trợ = ngày 1 của tháng; hoàn = ngày nghỉ.

// "30:100, 90:50" → [{days:30,pct:100},{days:90,pct:50}] (ngày tăng dần, % 0–100). Trống → []. Sai → null.
function parseTiers_(s) {
  const text = String(s || '').trim();
  if (!text) return [];
  const out = [];
  const ok = text.split(',').every((part) => {
    const m = /^\s*(\d{1,4})\s*:\s*(\d{1,3})\s*$/.exec(part);
    if (!m) return false;
    const days = Number(m[1]); const pct = Number(m[2]);
    if (pct > 100 || (out.length && days <= out[out.length - 1].days)) return false;
    out.push({ days: days, pct: pct });
    return true;
  });
  return ok ? out : null;
}

// "id:50,id:50" → [{id,pct}] (tổng 100, % nguyên 1–100, không trùng). Trống → []. Sai → null.
function parseSplit_(s) {
  const text = String(s || '').trim();
  if (!text) return [];
  const out = [];
  const ok = text.split(',').every((part) => {
    const m = /^\s*([^:\s]+)\s*:\s*(\d{1,3})\s*$/.exec(part);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 100 || out.some((x) => x.id === m[1])) return false;
    out.push({ id: m[1], pct: Number(m[2]) });
    return true;
  });
  return ok && out.reduce((a, x) => a + x.pct, 0) === 100 ? out : null;
}

// Chia đều theo danh sách người (có thể trùng → gộp); phần dư % cho người đầu. Trống → ''.
function splitEven_(ids) {
  const list = ids.filter((x, i) => x && ids.indexOf(x) === i);
  if (!list.length) return '';
  const base = Math.floor(100 / list.length);
  return list.map((id, i) => id + ':' + (i === 0 ? 100 - base * (list.length - 1) : base)).join(',');
}

// Mặc định phí giới thiệu: recruiter của lần giới thiệu X%, sales đầu tiên của công ty phần còn lại (D-069).
function splitFee_(recruiter, sales, pctRecruiter) {
  if (!recruiter && !sales) return '';
  if (!sales || recruiter === sales) return recruiter + ':100';
  if (!recruiter) return sales + ':100';
  if (pctRecruiter >= 100) return recruiter + ':100';
  if (pctRecruiter <= 0) return sales + ':100';
  return recruiter + ':' + pctRecruiter + ',' + sales + ':' + (100 - pctRecruiter);
}

function contractOn_(contracts, companyId, day) {
  return contracts.filter((c) => !c.da_an && c.company_id === companyId && c.tu_ngay <= day && (!c.den_ngay || day <= c.den_ngay))
    .sort((a, b) => (a.tu_ngay < b.tu_ngay ? 1 : -1))[0] || null;
}

// ---- Cài đặt tài chính (SETTING khoa 'finance') ----
function finance_() {
  const row = readAll_(openTable_('SETTING')).find((r) => r.khoa === 'finance');
  let v = {};
  try { v = row ? JSON.parse(row.gia_tri) : {}; } catch (e) { v = {}; }
  return Object.assign({}, FINANCE_DEFAULTS, v, { sua_luc: row ? row.sua_luc : '' });
}

function getFinanceSettings() {
  freshCall_();
  const f = finance_();
  // GĐ 10 (review bảo mật): nhân viên chỉ cần tên công ty cho phiếu giới thiệu — không thấy %, tiền người giới thiệu, tài khoản.
  return can_('cai_dat') || can_('hoa_don') ? f : { issuer_name: f.issuer_name };
}

function saveFinanceSettings(data, expectedSuaLuc) {
  const d = data || {};
  const v = {};
  const int = (k, min, max) => {
    const s = String(d[k] === undefined ? FINANCE_DEFAULTS[k] : d[k]).trim();
    if (!/^\d{1,9}$/.test(s) || Number(s) < min || Number(s) > max) throw vError_(k, 'range', { min: min, max: max });
    v[k] = Number(s);
  };
  int('tax', 0, 30); int('split_recruiter', 0, 100); int('referrer_amount', 0, 99999999); int('due_days', 0, 365);
  [['issuer_name', 100], ['issuer_address', 300], ['issuer_tno', 14], ['bank', 300]].forEach((p) => {
    v[p[0]] = String(d[p[0]] || '').trim();
    if (v[p[0]].length > p[1]) throw vError_(p[0], 'tooLong', { max: p[1] });
  });
  if (v.issuer_tno && !/^T\d{13}$/.test(v.issuer_tno)) throw vError_('issuer_tno', 'invalidFormat'); // 適格請求書発行事業者登録番号
  return withLock_(() => {
    freshCall_();
    const t = openTable_('SETTING');
    const row = readAll_(t).find((r) => r.khoa === 'finance');
    if (row) {
      if (row.sua_luc !== String(expectedSuaLuc || '')) throw new Error('CONFLICT');
      writeChange_('SETTING', t, row, { gia_tri: JSON.stringify(v) }, 'sua');
    } else {
      if (expectedSuaLuc) throw new Error('CONFLICT');
      insertMany_('SETTING', t, [{ khoa: 'finance', gia_tri: JSON.stringify(v) }]);
    }
    return finance_();
  });
}

// ---- Doanh số cần lập (gợi ý tự sinh, giống Việc cần làm) ----
// Mỗi gợi ý có key duy nhất; đã lập hoặc đã bỏ qua (kể cả số tiền 0) thì không gợi ý lại. Khoản đã ẩn không tính.
function revenueKey_(r) { return [r.loai, r.application_id || '', r.employment_id || '', r.thang || ''].join('|'); }

function revenueTodo_() {
  const today = nowJst_().slice(0, 10);
  const fin = finance_();
  const live = (r) => !r.da_an;
  const contracts = readAll_(openTable_('CONTRACT'));
  const companies = readAll_(openTable_('COMPANY'));
  const apps = readAll_(openTable_('APPLICATION')).filter(live);
  const jobs = readAll_(openTable_('JOB_ORDER'));
  const logs = readAll_(openTable_('APPLICATION_STATUS_LOG')).filter(live);
  const emps = readAll_(openTable_('EMPLOYMENT')).filter(live);
  const revenue = readAll_(openTable_('REVENUE')).filter(live);
  const have = {};
  revenue.forEach((r) => { have[revenueKey_(r)] = true; });
  const coOf = (id) => companies.find((c) => c.id === id) || {};
  const out = [];
  const push = (r) => { const k = revenueKey_(r); if (!have[k]) { have[k] = true; out.push(Object.assign({ key: k }, r)); } };
  const shodakuDay = (appId) => logs.filter((l) => l.application_id === appId && l.trang_thai === 'naitei_shodaku')
    .reduce((m, l) => (l.ngay_hieu_luc > m ? l.ngay_hieu_luc : m), '');
  const feeSplit = (app, co) => splitFee_(app.recruiter_staff_id || '', splitIds_(co.sales_staff_id)[0] || '', fin.split_recruiter);

  // Cọc 1/2 khi 内定承諾 (hợp đồng có chia cọc, tính theo hợp đồng ở ngày 内定承諾).
  apps.forEach((a) => {
    const day = shodakuDay(a.id);
    if (!day || day > today) return;
    const emp = emps.find((e) => e.application_id === a.id);
    const companyId = emp ? emp.company_id : (jobs.find((j) => j.id === a.job_id) || {}).company_id;
    if (!companyId) return;
    const c = contractOn_(contracts, companyId, day);
    if (!c || c.chia_coc !== 'Y' || !Number(c.phi_gioi_thieu)) return;
    push({ loai: 'coc', company_id: companyId, person_id: a.person_id, application_id: a.id, employment_id: '', thang: '', ngay: day,
      so_tien: String(Math.floor(Number(c.phi_gioi_thieu) / 2)), chia: feeSplit(a, coOf(companyId)), contract: c.ma });
  });
  const people = readAll_(openTable_('PERSON'));
  emps.forEach((e) => {
    // D-079: chờ vào làm, hoặc đã nghỉ không rõ ngày (dữ liệu cũ) → không gợi ý gì.
    const st = empState_(e, today);
    if (st === 'cho_vao_lam' || (st === 'da_nghi' && !e.ngay_nghi)) return;
    const a = apps.find((x) => x.id === e.application_id) || {};
    const co = coOf(e.company_id);
    const c = e.ngay_vao_lam ? contractOn_(contracts, e.company_id, e.ngay_vao_lam) : null;
    // Phí giới thiệu: theo hợp đồng ở ngày vào làm. Có cọc (đã lập, hoặc đang chờ lập ở trên) → chỉ phần còn lại = phí − cọc;
    // không có cọc → cả phí. Đã lập 1 trong 2 loại (kể cả bỏ qua) thì thôi gợi ý.
    const feeDone = revenue.some((r) => (r.loai === 'gioi_thieu' || r.loai === 'con_lai') && r.employment_id === e.id);
    if (c && Number(c.phi_gioi_thieu) && !feeDone) {
      const fee = Number(c.phi_gioi_thieu);
      const cocRows = revenue.filter((r) => r.loai === 'coc' && r.application_id === e.application_id && r.bo_qua !== 'Y');
      const cocPending = out.filter((r) => r.loai === 'coc' && r.application_id === e.application_id);
      const deposit = cocRows.concat(cocPending).reduce((s, r) => s + Number(r.so_tien), 0);
      if (deposit > 0) push({ loai: 'con_lai', company_id: e.company_id, person_id: e.person_id, application_id: e.application_id, employment_id: e.id,
        thang: '', ngay: e.ngay_vao_lam, so_tien: String(Math.max(fee - deposit, 0)), chia: feeSplit(a, co), contract: c.ma });
      else push({ loai: 'gioi_thieu', company_id: e.company_id, person_id: e.person_id, application_id: e.application_id, employment_id: e.id,
        thang: '', ngay: e.ngay_vao_lam, so_tien: String(fee), chia: feeSplit(a, co), contract: c.ma });
    }
    // Phí hỗ trợ: mỗi tháng có làm (từ tháng vào làm tới tháng nghỉ / tháng này), theo hợp đồng ở ngày 1 của tháng (tháng đầu: ngày vào làm).
    // D-079: 支援なし → không tính; thiếu ngày vào làm (dữ liệu cũ) → tính từ hợp đồng sớm nhất của công ty.
    const last = (e.ngay_nghi && e.ngay_nghi < today ? e.ngay_nghi : today).slice(0, 7);
    // Bắt đầu từ tháng muộn hơn giữa tháng vào làm và hợp đồng sớm nhất (trước đó không thể có phí) — dữ liệu cũ nhiều năm vẫn nhanh.
    const firstCt = contracts.filter((x) => !x.da_an && x.company_id === e.company_id).map((x) => x.tu_ngay).sort()[0] || '';
    const from = [(e.ngay_vao_lam || firstCt).slice(0, 7), firstCt.slice(0, 7)].sort().pop();
    const supStaff = supportStaffOf_(people.find((p) => p.id === e.person_id), co);
    for (let m = from; firstCt && e.ho_tro !== 'N' && m <= last; m = nextMonth_(m)) {
      if (e.ngay_nghi && e.ngay_nghi.slice(0, 7) === m && e.ngay_nghi.slice(8) === '01') continue; // nghỉ đúng ngày 1 → không làm ngày nào trong tháng
      const cm = contractOn_(contracts, e.company_id, e.ngay_vao_lam && m === e.ngay_vao_lam.slice(0, 7) ? e.ngay_vao_lam : m + '-01');
      if (!cm || !Number(cm.phi_ho_tro)) continue;
      push({ loai: 'ho_tro', company_id: e.company_id, person_id: e.person_id, application_id: e.application_id, employment_id: e.id,
        thang: m, ngay: m + '-01', so_tien: String(Number(cm.phi_ho_tro)), chia: splitEven_(supStaff), contract: cm.ma });
    }
    // Hoàn tiền khi nghỉ sớm: bậc của hợp đồng ở ngày vào làm; % tính trên các khoản phí đã lập (giới thiệu / cọc / còn lại).
    if (e.ngay_nghi && e.ngay_nghi <= today && c) {
      const worked = daysBetween_(e.ngay_vao_lam, e.ngay_nghi);
      const tier = (parseTiers_(c.bac_hoan) || []).find((x) => worked <= x.days);
      const paid = revenue.filter((r) => FEE_TYPES.indexOf(r.loai) >= 0 && r.bo_qua !== 'Y' &&
        (r.employment_id === e.id || (r.loai === 'coc' && r.application_id === e.application_id))).reduce((s, r) => s + Number(r.so_tien), 0);
      if (tier && tier.pct && paid > 0) push({ loai: 'hoan', company_id: e.company_id, person_id: e.person_id, application_id: e.application_id, employment_id: e.id,
        thang: '', ngay: e.ngay_nghi, so_tien: String(-Math.floor(paid * tier.pct / 100)), chia: feeSplit(a, co), contract: c.ma,
        days: worked, pct: tier.pct });
    }
  });
  return out.sort((x, y) => (x.ngay !== y.ngay ? (x.ngay < y.ngay ? -1 : 1) : (x.key < y.key ? -1 : 1)));
}

function nextMonth_(m) {
  const y = Number(m.slice(0, 4)); const mo = Number(m.slice(5, 7));
  return mo === 12 ? (y + 1) + '-01' : y + '-' + String(mo + 1).padStart(2, '0');
}

function getRevenueTodo() {
  freshCall_();
  const people = readAll_(openTable_('PERSON'));
  const companies = readAll_(openTable_('COMPANY'));
  return revenueTodo_().map((r) => Object.assign(r, {
    person: (people.find((p) => p.id === r.person_id) || {}).ho_ten_latin || '',
    company: (companies.find((c) => c.id === r.company_id) || {}).ten_phap_nhan || '' }));
}

// Lập theo gợi ý: keys = danh sách key (trống = tất cả). skip = true → ghi "bỏ qua" (số tiền 0) để không gợi ý lại.
// edits (không bắt buộc): { key: { so_tien, chia, ngay, ghi_chu } } sửa trước khi lập.
function applyRevenueTodo(keys, skip, edits) {
  return withLock_(() => {
    freshCall_();
    const want = keys && keys.length ? keys : null;
    const list = revenueTodo_().filter((r) => !want || want.indexOf(r.key) >= 0);
    if (want && list.length !== want.length) throw new Error('CONFLICT'); // gợi ý đã đổi (người khác vừa lập / dữ liệu đổi)
    const rules = TABLE_RULES.REVENUE;
    const recs = list.map((r) => {
      const e = (edits && edits[r.key]) || {};
      const rec = clean_(rules, Object.assign({}, r, skip ? { so_tien: '0', bo_qua: 'Y', chia: '' } : pick_(e, ['so_tien', 'chia', 'ngay', 'ghi_chu'])));
      rec.invoice_id = ''; rec.bo_qua = rec.bo_qua || '';
      check_(rules, rec);
      checkSplitStaff_(rec.chia);
      return rec;
    });
    return insertMany_('REVENUE', openTable_('REVENUE'), recs).map(public_);
  });
}

const pick_ = (o, keys) => keys.reduce((m, k) => { if (o[k] !== undefined) m[k] = o[k]; return m; }, {});

function checkSplitStaff_(chia) {
  const ids = readColumn_(openTable_('STAFF'), 'id');
  if ((parseSplit_(chia) || []).some((x) => ids.indexOf(x.id) < 0)) throw vError_('chia', 'split');
}

// Thêm khoản tay (loai 'khac' hoặc bất kỳ) / sửa khoản chưa vào hóa đơn. Không đổi loại, công ty, người, lần giới thiệu.
function saveRevenue(id, data, expectedSuaLuc) {
  const rules = TABLE_RULES.REVENUE;
  return withLock_(() => {
    freshCall_();
    const t = openTable_('REVENUE');
    if (!id) {
      const rec = Object.assign({ bo_qua: '', invoice_id: '' }, clean_(rules, pick_(data || {}, ['loai', 'company_id', 'person_id', 'ngay', 'thang', 'so_tien', 'chia', 'ghi_chu'])));
      check_(rules, rec);
      if (readColumn_(openTable_('COMPANY'), 'id').indexOf(rec.company_id) < 0) throw vError_('company_id', 'invalidChoice');
      checkSplitStaff_(rec.chia);
      return public_(insertMany_('REVENUE', t, [rec])[0]);
    }
    const cur = readAll_(t).find((r) => r.id === id);
    if (!cur) throw new Error('NOT_FOUND');
    if (cur.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    if (cur.invoice_id) throw vError_('so_tien', 'invoiced');
    const patch = clean_(rules, pick_(data || {}, ['ngay', 'thang', 'so_tien', 'chia', 'ghi_chu']));
    const next = Object.assign({}, cur, patch);
    check_(rules, next);
    checkSplitStaff_(next.chia);
    return public_(writeChange_('REVENUE', t, cur, patch, 'sua'));
  });
}

// Ẩn = bỏ khoản (lập nhầm) → gợi ý sẽ hiện lại. Khoản đã vào hóa đơn thì không ẩn được.
function setRevenueHidden(id, hidden, expectedSuaLuc) {
  return withLock_(() => {
    freshCall_();
    const t = openTable_('REVENUE');
    const cur = readAll_(t).find((r) => r.id === id);
    if (!cur) throw new Error('NOT_FOUND');
    if (cur.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    if (cur.invoice_id) throw vError_('so_tien', 'invoiced');
    return public_(writeChange_('REVENUE', t, cur, { da_an: hidden ? HIDDEN : '' }, hidden ? 'an' : 'hien'));
  });
}

// ---- Mục tiêu + báo cáo doanh số (bước 5.3) ----
function saveTarget(staffId, thang, soTien) {
  const sid = String(staffId || '');
  const amount = String(soTien === undefined ? '' : soTien).trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(thang || ''))) throw vError_('thang', 'invalidFormat');
  if (!/^\d{1,10}$/.test(amount)) throw vError_('so_tien', 'yen');
  return withLock_(() => {
    freshCall_();
    if (sid && readColumn_(openTable_('STAFF'), 'id').indexOf(sid) < 0) throw vError_('staff_id', 'invalidChoice');
    const t = openTable_('TARGET');
    const row = readAll_(t).find((r) => r.staff_id === sid && r.thang === thang);
    if (row) return public_(writeChange_('TARGET', t, row, { so_tien: amount }, 'sua'));
    return public_(insertMany_('TARGET', t, [{ staff_id: sid, thang: thang, so_tien: amount }])[0]);
  });
}

// filter: { month: 'yyyy-MM' } → báo cáo tháng: theo người (thực tế theo % chia, mục tiêu), cả công ty, theo loại, 12 tháng gần nhất.
function getSales(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const month = /^\d{4}-\d{2}$/.test(f.month || '') ? f.month : today.slice(0, 7);
  const items = readAll_(openTable_('REVENUE')).filter((r) => !r.da_an && r.bo_qua !== 'Y');
  const staff = readAll_(openTable_('STAFF'));
  const targets = readAll_(openTable_('TARGET'));
  const people = readAll_(openTable_('PERSON'));
  const companies = readAll_(openTable_('COMPANY'));
  const invoices = readAll_(openTable_('INVOICE'));
  const inMonth = items.filter((r) => r.ngay.slice(0, 7) === month);
  const byStaff = {};
  inMonth.forEach((r) => (parseSplit_(r.chia) || []).forEach((x) => { byStaff[x.id] = (byStaff[x.id] || 0) + Number(r.so_tien) * x.pct / 100; }));
  const target = (sid) => Number((targets.find((x) => x.staff_id === sid && x.thang === month) || {}).so_tien || 0);
  const ids = staff.filter((s) => (s.trang_thai === 'dang_lam' && !s.da_an) || byStaff[s.id] || target(s.id)).map((s) => s.id);
  const total = inMonth.reduce((s, r) => s + Number(r.so_tien), 0);
  const byType = {};
  REVENUE_TYPES.forEach((k) => { byType[k] = 0; });
  inMonth.forEach((r) => { byType[r.loai] += Number(r.so_tien); });
  const series = [];
  for (let m = shiftMonth_(month, -11); m <= month; m = nextMonth_(m)) {
    series.push({ month: m, total: items.filter((r) => r.ngay.slice(0, 7) === m).reduce((s, r) => s + Number(r.so_tien), 0),
      target: Number((targets.find((x) => !x.staff_id && x.thang === m) || {}).so_tien || 0) });
  }
  const inv = (id) => invoices.find((x) => x.id === id) || {};
  return {
    month: month, total: total, target: target(''), byType: byType, series: series,
    staff: ids.map((id) => { const s = staff.find((x) => x.id === id) || {}; return { id: id, ho_ten: s.ho_ten || id, inactive: s.trang_thai !== 'dang_lam' || !!s.da_an,
      actual: Math.round(byStaff[id] || 0), target: target(id) }; }),
    unassigned: Math.round(inMonth.filter((r) => !r.chia).reduce((s, r) => s + Number(r.so_tien), 0)),
    items: inMonth.sort((a, b) => (a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : a.ma < b.ma ? -1 : 1)).map((r) => {
      const out = {};
      TABLE_RULES.REVENUE.listColumns.forEach((k) => { out[k] = r[k]; });
      out.person = (people.find((p) => p.id === r.person_id) || {}).ho_ten_latin || '';
      out.company = (companies.find((c) => c.id === r.company_id) || {}).ten_phap_nhan || '';
      out.invoice_ma = r.invoice_id ? inv(r.invoice_id).ma || '' : '';
      return out;
    }),
  };
}

// D-077: doanh số của CHÍNH người dùng liên kết (phần được chia cho mình) — không thấy của người khác.
function getMySales(filter) {
  freshCall_();
  if (!ACTOR_) throw new Error('FORBIDDEN'); // chủ xem trang Doanh số đầy đủ
  const me = ACTOR_.id;
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const month = /^\d{4}-\d{2}$/.test(f.month || '') ? f.month : today.slice(0, 7);
  const people = readAll_(openTable_('PERSON'));
  const companies = readAll_(openTable_('COMPANY'));
  const target = (m) => Number((readAll_(openTable_('TARGET')).find((x) => x.staff_id === me && x.thang === m) || {}).so_tien || 0);
  const mine = readAll_(openTable_('REVENUE')).filter((r) => !r.da_an && r.bo_qua !== 'Y').map((r) => {
    const part = (parseSplit_(r.chia) || []).find((x) => x.id === me);
    return part ? { r: r, pct: part.pct, share: Number(r.so_tien) * part.pct / 100 } : null;
  }).filter(Boolean);
  const inMonth = mine.filter((x) => x.r.ngay.slice(0, 7) === month);
  const series = [];
  for (let m = shiftMonth_(month, -11); m <= month; m = nextMonth_(m)) {
    series.push({ month: m, total: Math.round(mine.filter((x) => x.r.ngay.slice(0, 7) === m).reduce((s, x) => s + x.share, 0)), target: target(m) });
  }
  return { month: month, actual: Math.round(inMonth.reduce((s, x) => s + x.share, 0)), target: target(month), series: series,
    items: inMonth.sort((a, b) => (a.r.ngay < b.r.ngay ? -1 : 1)).map((x) => ({ ma: x.r.ma, ngay: x.r.ngay, loai: x.r.loai, thang: x.r.thang, pct: x.pct,
      share: Math.round(x.share), company: (companies.find((c) => c.id === x.r.company_id) || {}).ten_phap_nhan || '',
      person: (people.find((p) => p.id === x.r.person_id) || {}).ho_ten_latin || '' })) };
}

function shiftMonth_(m, n) {
  const y = Number(m.slice(0, 4)); const mo = Number(m.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(mo / 12); const mm = ((mo % 12) + 12) % 12 + 1;
  return yy + '-' + String(mm).padStart(2, '0');
}

// ---- GĐ 8 (D-069): hóa đơn, 入金, người giới thiệu ----
// Thuế làm tròn về 0 (xuống với số dương; hóa đơn hoàn tiền âm cũng làm tròn về 0).
function taxOf_(base, rate) { const v = base * rate / 100; return v < 0 ? -Math.floor(-v) : Math.floor(v); }

function invoiceView_(inv, lines, payments, companies) {
  const paid = payments.filter((p) => !p.da_an && p.invoice_id === inv.id).reduce((s, p) => s + Number(p.so_tien), 0);
  const base = lines.reduce((s, r) => s + Number(r.so_tien), 0);
  const issued = inv.trang_thai === 'da_phat_hanh';
  const total = issued ? Number(inv.tong) : base + taxOf_(base, Number(inv.thue_suat || 0));
  const remain = issued ? total - paid : 0;
  const today = nowJst_().slice(0, 10);
  const state = inv.trang_thai === 'huy' ? 'huy' : inv.trang_thai === 'nhap' ? 'nhap'
    : (total >= 0 ? remain <= 0 : remain >= 0) ? 'da_thu_du' : inv.han_tt < today ? 'qua_han' : 'cho_thu';
  const out = {};
  TABLE_RULES.INVOICE.listColumns.forEach((k) => { out[k] = inv[k]; });
  return Object.assign(out, { company: (companies.find((c) => c.id === inv.company_id) || {}).ten_phap_nhan || '', lines: lines.length,
    preview_base: base, total: total, paid: paid, remain: remain, state: state });
}

function listInvoices() {
  freshCall_();
  return listInvoicesNow_();
}

function listInvoicesNow_() {
  const revenue = readAll_(openTable_('REVENUE')).filter((r) => !r.da_an && r.invoice_id);
  const payments = readAll_(openTable_('PAYMENT'));
  const companies = readAll_(openTable_('COMPANY'));
  return readAll_(openTable_('INVOICE')).map((inv) => invoiceView_(inv, revenue.filter((r) => r.invoice_id === inv.id), payments, companies))
    .sort((a, b) => (a.ma < b.ma ? 1 : -1));
}

function getInvoice(id) {
  freshCall_();
  const inv = readAll_(openTable_('INVOICE')).find((r) => r.id === id);
  if (!inv) throw new Error('NOT_FOUND');
  const lines = readAll_(openTable_('REVENUE')).filter((r) => !r.da_an && r.invoice_id === id).sort((a, b) => (a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : a.ma < b.ma ? -1 : 1));
  const payments = readAll_(openTable_('PAYMENT'));
  const companies = readAll_(openTable_('COMPANY'));
  const people = readAll_(openTable_('PERSON'));
  const co = companies.find((c) => c.id === inv.company_id) || {};
  return {
    invoice: invoiceView_(inv, lines, payments, companies),
    lines: lines.map((r) => ({ id: r.id, ma: r.ma, loai: r.loai, ngay: r.ngay, thang: r.thang, so_tien: r.so_tien, ghi_chu: r.ghi_chu,
      person: (people.find((p) => p.id === r.person_id) || {}).ho_ten_latin || '' })),
    payments: payments.filter((p) => !p.da_an && p.invoice_id === id).map((p) => pick_(p, TABLE_RULES.PAYMENT.listColumns)),
    company: { ten_phap_nhan: co.ten_phap_nhan || '', ma_buu_dien: co.ma_buu_dien || '', tinh_thanh: co.tinh_thanh || '', dia_chi: co.dia_chi || '' },
    issuer: finance_(),
  };
}

// Các khoản chưa vào hóa đơn của 1 công ty (đã lập, không bỏ qua, khác 0).
function getUninvoiced(companyId) {
  freshCall_();
  const people = readAll_(openTable_('PERSON'));
  return readAll_(openTable_('REVENUE')).filter((r) => !r.da_an && r.company_id === companyId && !r.invoice_id && r.bo_qua !== 'Y' && Number(r.so_tien) !== 0)
    .sort((a, b) => (a.ngay < b.ngay ? -1 : 1))
    .map((r) => Object.assign(pick_(r, ['id', 'ma', 'loai', 'ngay', 'thang', 'so_tien', 'ghi_chu']), { person: (people.find((p) => p.id === r.person_id) || {}).ho_ten_latin || '' }));
}

function createInvoice(companyId, revenueIds, ngayLap, hanTt, ghiChu) {
  const ids = Array.isArray(revenueIds) ? revenueIds.map(String) : [];
  if (!ids.length) throw vError_('lines', 'required');
  return withLock_(() => {
    freshCall_();
    const fin = finance_();
    const rt = openTable_('REVENUE');
    const all = readAll_(rt);
    const lines = ids.map((id) => all.find((r) => r.id === id));
    if (lines.some((r) => !r || r.da_an || r.company_id !== companyId || r.invoice_id || r.bo_qua === 'Y')) throw new Error('CONFLICT');
    const lap = String(ngayLap || nowJst_().slice(0, 10));
    const rec = { company_id: companyId, ngay_lap: lap, han_tt: String(hanTt || (isDate_(lap) ? addDays_(lap, fin.due_days) : '')),
      trang_thai: 'nhap', tien_chua_thue: '', thue_suat: String(fin.tax), tien_thue: '', tong: '', ghi_chu: String(ghiChu || '').trim() };
    check_(TABLE_RULES.INVOICE, rec);
    const inv = insertMany_('INVOICE', openTable_('INVOICE'), [rec])[0];
    lines.forEach((r) => writeChange_('REVENUE', rt, r, { invoice_id: inv.id }, 'sua'));
    return public_(inv);
  });
}

function changeInvoice_(id, expectedSuaLuc, fn) {
  return withLock_(() => {
    freshCall_();
    const t = openTable_('INVOICE');
    const inv = readAll_(t).find((r) => r.id === id);
    if (!inv) throw new Error('NOT_FOUND');
    if (inv.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    return public_(fn(t, inv));
  });
}

// Phát hành: chốt tổng theo thuế suất hiện hành; sau đó các dòng bị khóa.
function issueInvoice(id, expectedSuaLuc) {
  return changeInvoice_(id, expectedSuaLuc, (t, inv) => {
    if (inv.trang_thai !== 'nhap') throw vError_('trang_thai', 'notDraft');
    const lines = readAll_(openTable_('REVENUE')).filter((r) => !r.da_an && r.invoice_id === id);
    if (!lines.length) throw vError_('lines', 'required');
    const rate = finance_().tax;
    const base = lines.reduce((s, r) => s + Number(r.so_tien), 0);
    const tax = taxOf_(base, rate);
    return writeChange_('INVOICE', t, inv, { trang_thai: 'da_phat_hanh', tien_chua_thue: String(base), thue_suat: String(rate), tien_thue: String(tax), tong: String(base + tax) }, 'phat_hanh');
  });
}

// Hủy (nháp hoặc đã phát hành, chưa có 入金): giữ số hóa đơn, trả các khoản về "chưa vào hóa đơn".
function cancelInvoice(id, expectedSuaLuc, lyDo) {
  return changeInvoice_(id, expectedSuaLuc, (t, inv) => {
    if (inv.trang_thai === 'huy') throw vError_('trang_thai', 'notDraft');
    if (readAll_(openTable_('PAYMENT')).some((p) => !p.da_an && p.invoice_id === id)) throw vError_('trang_thai', 'hasPayment');
    const reason = String(lyDo || '').trim();
    if (!reason) throw vError_('ly_do', 'required');
    if (reason.length > 300) throw vError_('ly_do', 'tooLong', { max: 300 });
    const rt = openTable_('REVENUE');
    readAll_(rt).filter((r) => r.invoice_id === id).forEach((r) => writeChange_('REVENUE', rt, r, { invoice_id: '' }, 'sua'));
    return writeChange_('INVOICE', t, inv, { trang_thai: 'huy', ghi_chu: (inv.ghi_chu ? inv.ghi_chu + ' / ' : '') + 'Hủy: ' + reason }, 'huy');
  });
}

// Người giới thiệu: mỗi lần vào làm (đã tới ngày) của người có ghi tên người giới thiệu → 1 khoản phải trả (chưa lập thì gợi ý).
function getPayoutTodo() {
  freshCall_();
  const today = nowJst_().slice(0, 10);
  const fin = finance_();
  const people = readAll_(openTable_('PERSON')).filter((p) => !p.da_an && p.nguoi_gioi_thieu);
  const companies = readAll_(openTable_('COMPANY'));
  const done = readAll_(openTable_('REFERRER_PAYOUT')).filter((r) => !r.da_an).map((r) => r.employment_id);
  return readAll_(openTable_('EMPLOYMENT')).filter((e) => !e.da_an && e.ngay_vao_lam <= today && done.indexOf(e.id) < 0)
    .map((e) => ({ e: e, p: people.find((p) => p.id === e.person_id) })).filter((x) => x.p)
    .map((x) => ({ person_id: x.p.id, person: x.p.ho_ten_latin, employment_id: x.e.id, ngay_vao_lam: x.e.ngay_vao_lam,
      company: (companies.find((c) => c.id === x.e.company_id) || {}).ten_phap_nhan || '', nguoi_nhan: x.p.nguoi_gioi_thieu, so_tien: String(fin.referrer_amount) }))
    .sort((a, b) => (a.ngay_vao_lam < b.ngay_vao_lam ? -1 : 1));
}
