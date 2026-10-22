// GĐ 11.2 (D-080): 受入れ前 — người đã 内定, chuẩn bị vào công ty. Công việc chuẩn bị (PRE_TASK) + giấy tờ (CASE_DOCUMENT.pre_entry_id).
// Tự mở khi lần giới thiệu sang 内定 (hoặc 内定承諾 nếu bỏ qua 内定); tạo tay được (vd. chuyển công ty không qua lần giới thiệu).
// Xác nhận vào làm → tạo lần vào làm (EMPLOYMENT), hồ sơ chuyển "đã vào làm", giữ nguyên công việc / giấy tờ làm lịch sử.

function preTemplates_() {
  const saved = readAll_(openTable_('SETTING'));
  const out = {};
  PRE_TYPES.forEach((loai) => {
    const row = saved.find((r) => r.khoa === 'pre_tpl.' + loai);
    let tasks = null;
    try { tasks = row ? JSON.parse(row.gia_tri).tasks : null; } catch (e) { tasks = null; }
    out[loai] = { tasks: Array.isArray(tasks) ? tasks : PRE_TEMPLATE_DEFAULTS[loai], custom: !!row, sua_luc: row ? row.sua_luc : '' };
  });
  return out;
}

function getPreTemplates() {
  freshCall_();
  return preTemplates_();
}

// tasks: [[nhóm, tên], ...] (tối đa 40). expectedSuaLuc: '' khi chưa lưu lần nào.
function savePreTemplate(loai, tasks, expectedSuaLuc) {
  if (PRE_TYPES.indexOf(loai) < 0) throw vError_('loai', 'invalidChoice');
  const list = (Array.isArray(tasks) ? tasks : []).map((x) => [String((x || [])[0] || 'khac'), String((x || [])[1] || '').trim()]).filter((x) => x[1]);
  if (list.length > 40) throw vError_('ten', 'tooMany', { max: 40 });
  list.forEach((x) => {
    if (PRE_GROUPS.indexOf(x[0]) < 0) throw vError_('nhom', 'invalidChoice');
    if (x[1].length > 200) throw vError_('ten', 'tooLong', { max: 200 });
  });
  return withLock_(() => {
    freshCall_();
    const t = openTable_('SETTING');
    const row = readAll_(t).find((r) => r.khoa === 'pre_tpl.' + loai);
    const v = JSON.stringify({ tasks: list });
    if (v.length > 2000) throw vError_('ten', 'tooLong', { max: 2000 });
    if (row) {
      if (row.sua_luc !== String(expectedSuaLuc || '')) throw new Error('CONFLICT');
      writeChange_('SETTING', t, row, { gia_tri: v }, 'sua');
    } else {
      if (expectedSuaLuc) throw new Error('CONFLICT');
      insertMany_('SETTING', t, [{ khoa: 'pre_tpl.' + loai, gia_tri: v }]);
    }
    return preTemplates_()[loai];
  });
}

// afterWrite khi tạo hồ sơ 受入れ前: công việc + giấy tờ theo mẫu của loại (đang giữ khóa).
function preEntryCreated_(rec) {
  const tasks = (preTemplates_()[rec.loai] || { tasks: [] }).tasks;
  if (tasks.length) {
    insertMany_('PRE_TASK', openTable_('PRE_TASK'), tasks.map((x) => ({ pre_entry_id: rec.id, ten: x[1], nhom: x[0], phu_trach_staff_id: '',
      han: '', trang_thai: 'chua_lam', cho_ben: '', link: '', ghi_chu: '' })));
  }
  const docs = checklistTemplate_('pre_' + rec.loai);
  if (docs.length) {
    insertMany_('CASE_DOCUMENT', openTable_('CASE_DOCUMENT'), docs.map((id) => ({ case_id: '', pre_entry_id: rec.id, giay_to: id, trang_thai: 'chua_co',
      ngay_nhan: '', ghi_chu: '', ben_cung_cap: '', ngay_yeu_cau: '', han_nhan: '', nguoi_kiem_tra: '', noi_dung_sua: '', link: '', person_doc_id: '' })));
  }
}

// Gọi trong addApplicationStatus (đang giữ khóa).
function preEntryOnStatus_(app, status) {
  const t = openTable_('PRE_ENTRY');
  const mine = readAll_(t).filter((r) => !r.da_an && r.application_id === app.id);
  if (status === 'naitei' || status === 'naitei_shodaku') {
    if (mine.length) return;
    const job = findById_(openTable_('JOB_ORDER'), app.job_id) || {};
    const p = findById_(openTable_('PERSON'), app.person_id) || {};
    const co = findById_(openTable_('COMPANY'), job.company_id) || {};
    insertMany_('PRE_ENTRY', t, [{ person_id: app.person_id, company_id: job.company_id || '', application_id: app.id,
      loai: p.noi_o === 'nuoc_ngoai' ? 'nuoc_ngoai' : 'trong_nuoc', ngay_nhap_canh: '', ngay_vao_lam: job.ngay_du_kien_vao_lam || '',
      cs_staff_id: p.cs_staff_id || co.support_staff_id || '', giay_to_staff_id: p.giay_to_staff_id || '', trang_thai: 'dang_chuan_bi',
      cho_ben: '', employment_id: '', link: '', ghi_chu: '' }]);
    return;
  }
  if (APP_ENDED.indexOf(status) >= 0 && status !== 'da_vao_lam') {
    mine.filter((r) => r.trang_thai === 'dang_chuan_bi').forEach((r) => writeChange_('PRE_ENTRY', t, r,
      { trang_thai: 'huy', ghi_chu: ((r.ghi_chu ? r.ghi_chu + '\n' : '') + 'Tự hủy: lần giới thiệu ' + app.ma + ' kết thúc (' + status + ')').slice(0, 2000) }, 'huy'));
  }
}

// Gọi trong startEmploymentNow_ (đang giữ khóa).
function preEntryStarted_(appId, emp) {
  const t = openTable_('PRE_ENTRY');
  readAll_(t).filter((r) => !r.da_an && r.application_id === appId && r.trang_thai !== 'da_vao_lam').forEach((r) =>
    writeChange_('PRE_ENTRY', t, r, { trang_thai: 'da_vao_lam', employment_id: emp.id }, 'vao_lam'));
}

// Nút "Xác nhận vào làm" trong 受入れ前. Có lần giới thiệu còn mở → đi đúng luồng startEmployment; không có → tạo lần vào làm trực tiếp.
function startFromPreEntry(preId, ngayVaoLam, expectedSuaLuc) {
  return withLock_(() => {
    freshCall_();
    const t = openTable_('PRE_ENTRY');
    const pre = findById_(t, preId);
    if (!pre || pre.da_an) throw new Error('NOT_FOUND');
    if (pre.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    if (pre.trang_thai !== 'dang_chuan_bi') throw vError_('trang_thai', 'notPreparing');
    const day = String(ngayVaoLam || '').trim();
    if (!isDate_(day)) throw vError_('ngay_vao_lam', day ? 'invalidFormat' : 'required');
    const app = pre.application_id ? findById_(openTable_('APPLICATION'), pre.application_id) : null;
    if (app && !app.da_an && APP_ENDED.indexOf(app.trang_thai_hien_tai) < 0) {
      const r = startEmploymentNow_(app.id, day, app.sua_luc);
      return { employment: r.employment, pre: public_(findById_(t, preId)) };
    }
    const empT = openTable_('EMPLOYMENT');
    const clash = readAll_(empT).find((e) => !e.da_an && e.person_id === pre.person_id && empState_(e, day) !== 'da_nghi');
    if (clash) throw vError_('ngay_vao_lam', 'stillEmployed', { ma: clash.ma });
    const emp = { person_id: pre.person_id, company_id: pre.company_id, job_id: '', application_id: '', ngay_vao_lam: day, ngay_nghi: '', ly_do_nghi: '',
      ghi_chu: 'Từ 受入れ前 ' + pre.ma, tinh_trang: '', ho_tro: '' };
    check_(TABLE_RULES.EMPLOYMENT, emp);
    const saved = insertMany_('EMPLOYMENT', empT, [emp])[0];
    const preSaved = writeChange_('PRE_ENTRY', t, pre, { trang_thai: 'da_vao_lam', employment_id: saved.id }, 'vao_lam');
    return { employment: public_(saved), pre: public_(preSaved) };
  });
}

// Danh sách 受入れ前 kèm tiến độ (tính trên máy chủ, 1 lần gọi). filter: { trang_thai ('' = tất cả), staffId }.
function getPreEntries(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const live = (r) => !r.da_an;
  const people = readAll_(openTable_('PERSON'));
  const companies = readAll_(openTable_('COMPANY'));
  const tasks = readAll_(openTable_('PRE_TASK')).filter(live);
  const docs = readAll_(openTable_('CASE_DOCUMENT')).filter(live);
  const cases = readAll_(openTable_('IMMIGRATION_CASE')).filter(live);
  const st = f.trang_thai === undefined ? 'dang_chuan_bi' : String(f.trang_thai);
  const rows = readAll_(openTable_('PRE_ENTRY')).filter(live).filter((r) => !st || r.trang_thai === st).map((r) => {
    const p = people.find((x) => x.id === r.person_id) || {};
    const c = companies.find((x) => x.id === r.company_id) || {};
    const myTasks = tasks.filter((x) => x.pre_entry_id === r.id);
    const myDocs = docs.filter((x) => x.pre_entry_id === r.id);
    const open = myTasks.filter((x) => PRE_TASK_DONE.indexOf(x.trang_thai) < 0);
    const group = (g) => { const l = myTasks.filter((x) => x.nhom === g); return { done: l.filter((x) => PRE_TASK_DONE.indexOf(x.trang_thai) >= 0).length, total: l.length }; };
    // Hồ sơ visa liên quan: hồ sơ mới nhất của người này còn đang làm (chưa kết thúc) hoặc kết thúc gần nhất.
    const vc = cases.filter((x) => x.person_id === r.person_id).sort((a, b) => (a.ma < b.ma ? 1 : -1));
    const visaCase = vc.find((x) => VISA_ENDED.indexOf(x.trang_thai) < 0) || vc[0] || null;
    const next = open.filter((x) => x.han).sort((a, b) => (a.han < b.han ? -1 : 1))[0] || null;
    const waiting = {};
    open.concat([r]).forEach((x) => { if (x.cho_ben) waiting[x.cho_ben] = (waiting[x.cho_ben] || 0) + 1; });
    myDocs.filter((d) => d.trang_thai === 'da_yeu_cau' && d.ben_cung_cap).forEach((d) => { waiting[d.ben_cung_cap === 'khac' ? 'khac' : d.ben_cung_cap] = (waiting[d.ben_cung_cap === 'khac' ? 'khac' : d.ben_cung_cap] || 0) + 1; });
    return Object.assign(public_(r), {
      person: p.ho_ten_latin || '', person_ma: p.ma || '', company: (c.ten_phap_nhan || '') + (c.ten_co_so ? ' / ' + c.ten_co_so : ''),
      tasks_done: myTasks.length - open.length, tasks_total: myTasks.length,
      docs_done: myDocs.filter((d) => DOC_DONE.indexOf(d.trang_thai) >= 0).length, docs_total: myDocs.length,
      contract: group('hop_dong'), visa_task: group('visa'), visa_case: visaCase ? { id: visaCase.id, ma: visaCase.ma, trang_thai: visaCase.trang_thai, loai: visaCase.loai_thu_tuc } : null,
      next_task: next ? { ten: next.ten, han: next.han, overdue: next.han < today } : null,
      overdue: open.filter((x) => x.han && x.han < today).length, waiting: waiting,
      staff_ids: splitIds_(r.cs_staff_id).concat(splitIds_(r.giay_to_staff_id)).concat(open.map((x) => x.phu_trach_staff_id).filter(String)),
    });
  }).filter((r) => !f.staffId || r.staff_ids.indexOf(f.staffId) >= 0)
    .sort((a, b) => ((a.ngay_vao_lam || '9999') < (b.ngay_vao_lam || '9999') ? -1 : (a.ngay_vao_lam || '9999') > (b.ngay_vao_lam || '9999') ? 1 : (a.ma < b.ma ? -1 : 1)));
  rows.forEach((r) => { delete r.staff_ids; });
  return { today: today, rows: rows };
}

// ---- GĐ 11.1: tổng hợp giấy tờ còn thiếu (hồ sơ visa chưa kết thúc + 受入れ前 đang chuẩn bị) ----
// "Còn thiếu" = chưa yêu cầu / đã yêu cầu / cần sửa. state 'da_nhan' = đã nhận, chờ kiểm tra (xem riêng).
// filter: { staffId (người kiểm tra / phụ trách hồ sơ), ben (bên cung cấp), state ('' | 'qua_han' | 'chua_yeu_cau' | 'da_yeu_cau' | 'can_sua' | 'da_nhan') }
function getMissingDocs(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const live = (r) => !r.da_an;
  const people = readAll_(openTable_('PERSON'));
  const companies = readAll_(openTable_('COMPANY'));
  const cases = readAll_(openTable_('IMMIGRATION_CASE')).filter(live).filter((c) => VISA_ENDED.indexOf(c.trang_thai) < 0);
  const pres = readAll_(openTable_('PRE_ENTRY')).filter(live).filter((r) => r.trang_thai === 'dang_chuan_bi');
  const lib = readAll_(openTable_('PERSON_DOC')).filter(live);
  const rows = readAll_(openTable_('CASE_DOCUMENT')).filter(live).filter((d) => DOC_DONE.indexOf(d.trang_thai) < 0).map((d) => {
    const owner = d.case_id ? cases.find((c) => c.id === d.case_id) : pres.find((r) => r.id === d.pre_entry_id);
    if (!owner) return null;
    const p = people.find((x) => x.id === owner.person_id) || {};
    const c = companies.find((x) => x.id === owner.company_id) || {};
    const staff = [d.nguoi_kiem_tra].concat(d.case_id ? [owner.phu_trach_staff_id] : splitIds_(owner.cs_staff_id).concat([owner.giay_to_staff_id])).filter(String);
    const stored = lib.filter((x) => x.person_id === owner.person_id && x.giay_to === d.giay_to);
    return { id: d.id, ma: d.ma, giay_to: d.giay_to, trang_thai: d.trang_thai, ben_cung_cap: d.ben_cung_cap, ngay_yeu_cau: d.ngay_yeu_cau, han_nhan: d.han_nhan,
      nguoi_kiem_tra: d.nguoi_kiem_tra, noi_dung_sua: d.noi_dung_sua, link: d.link, overdue: !!d.han_nhan && d.han_nhan < today,
      owner_kind: d.case_id ? 'case' : 'pre', owner_id: owner.id, owner_ma: owner.ma, loai: d.case_id ? owner.loai_thu_tuc : owner.loai,
      person_id: p.id || '', person: p.ho_ten_latin || '', company: c.ten_phap_nhan || '', in_library: stored.length > 0, staff: staff };
  }).filter((x) => x)
    .filter((x) => !f.staffId || x.staff.indexOf(f.staffId) >= 0)
    .filter((x) => !f.ben || x.ben_cung_cap === f.ben)
    .filter((x) => (f.state === 'da_nhan' ? x.trang_thai === 'da_nhan' : x.trang_thai !== 'da_nhan'))
    .filter((x) => !f.state || f.state === 'da_nhan' || (f.state === 'qua_han' ? x.overdue : f.state === 'chua_yeu_cau' ? x.trang_thai === 'chua_co' : x.trang_thai === f.state))
    .sort((a, b) => ((a.han_nhan || '9999') < (b.han_nhan || '9999') ? -1 : (a.han_nhan || '9999') > (b.han_nhan || '9999') ? 1 : (a.ma < b.ma ? -1 : 1)));
  rows.forEach((r) => { delete r.staff; });
  return { today: today, rows: rows };
}
