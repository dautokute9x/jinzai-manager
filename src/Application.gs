// Bước 3.2: Lần giới thiệu (APPLICATION) + lịch sử trạng thái chỉ ghi thêm (APPLICATION_STATUS_LOG) — D-006, D-020, D-023, D-053.
// Trạng thái hiện tại luôn = dòng lịch sử còn hiệu lực mới nhất (theo ngày hiệu lực, rồi thời điểm ghi).

function vError_(field, code, extra) {
  return new Error('VALIDATION|' + JSON.stringify(Object.assign({ field: field, code: code }, extra || {})));
}

function findById_(t, id) {
  const idx = readColumn_(t, 'id').indexOf(id);
  return idx < 0 ? null : readRow_(t, idx + 2);
}

const byLogOrder_ = (a, b) => (a.ngay_hieu_luc !== b.ngay_hieu_luc ? (a.ngay_hieu_luc < b.ngay_hieu_luc ? -1 : 1)
  : a.tao_luc !== b.tao_luc ? (a.tao_luc < b.tao_luc ? -1 : 1) : (a.ma < b.ma ? -1 : 1));

function activeLogs_(logT, appId) {
  return readAll_(logT).filter((l) => l.application_id === appId && !l.da_an).sort(byLogOrder_);
}

// D-023: cùng người × cùng đơn chỉ được có 1 lần giới thiệu chưa kết thúc (lần đã ẩn không tính).
function openSibling_(appT, personId, jobId, exceptId) {
  return readAll_(appT).find((a) => a.id !== exceptId && !a.da_an && a.person_id === personId && a.job_id === jobId &&
    APP_ENDED.indexOf(a.trang_thai_hien_tai) < 0) || null;
}

function insertLog_(logT, appId, status, date, reason) {
  const log = { application_id: appId, trang_thai: status, ngay_hieu_luc: date, ly_do: String(reason || '').trim() };
  check_(TABLE_RULES.APPLICATION_STATUS_LOG, log);
  return insertMany_('APPLICATION_STATUS_LOG', logT, [log])[0];
}

// Giới thiệu 1 người vào 1 đơn. Trạng thái đầu = "đã gửi khách" vào ngày gửi.
function createApplication(data) {
  const rules = TABLE_RULES.APPLICATION;
  return withLock_(() => {
    freshCall_();
    const rec = clean_(rules, data);
    check_(rules, rec);
    const person = findById_(openTable_('PERSON'), rec.person_id);
    if (!person || person.da_an) throw vError_('person_id', 'invalidChoice');
    if (person.trang_thai_sang_loc !== 'san_sang') throw vError_('person_id', 'notReady'); // 3.2 Q3
    const job = findById_(openTable_('JOB_ORDER'), rec.job_id);
    if (!job || job.da_an || job.trang_thai_don !== 'dang_mo') throw vError_('job_id', 'jobNotOpen');
    checkRefs_(rules, rec, null);
    const appT = openTable_('APPLICATION');
    const open = openSibling_(appT, rec.person_id, rec.job_id, null);
    if (open) throw vError_('job_id', 'stillOpen', { ma: open.ma });
    Object.assign(rec, { trang_thai_hien_tai: 'da_gui', ngay_trang_thai: rec.ngay_gui });
    const app = insertMany_('APPLICATION', appT, [rec])[0];
    insertLog_(openTable_('APPLICATION_STATUS_LOG'), app.id, 'da_gui', rec.ngay_gui, '');
    return public_(app);
  });
}

// Đổi trạng thái = ghi thêm 1 dòng lịch sử (3.2 Q2 a: chọn tự do, ngày không lùi so với dòng mới nhất).
function addApplicationStatus(appId, status, date, reason, expectedSuaLuc) {
  return withLock_(() => {
    freshCall_();
    const appT = openTable_('APPLICATION');
    const app = findById_(appT, appId);
    if (!app) throw new Error('NOT_FOUND');
    if (app.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    if (status === 'da_vao_lam') throw vError_('trang_thai', 'useEmployment'); // phải kèm ngày vào làm → startEmployment
    if (app.trang_thai_hien_tai === 'da_vao_lam') throw vError_('trang_thai', 'useCancel'); // sửa nhầm: hủy dòng lịch sử
    const logT = openTable_('APPLICATION_STATUS_LOG');
    const logs = activeLogs_(logT, appId);
    const last = logs[logs.length - 1];
    if (last && isDate_(date) && date < last.ngay_hieu_luc) throw vError_('ngay_hieu_luc', 'notBeforeLast', { ma: last.ngay_hieu_luc });
    // Mở lại một lần đã kết thúc: không được nếu đã có lần khác chưa kết thúc cho cùng người × đơn.
    if (APP_ENDED.indexOf(status) < 0 && APP_ENDED.indexOf(app.trang_thai_hien_tai) >= 0) {
      const open = openSibling_(appT, app.person_id, app.job_id, app.id);
      if (open) throw vError_('trang_thai', 'stillOpen', { ma: open.ma });
    }
    insertLog_(logT, appId, status, date, reason);
    const saved = writeChange_('APPLICATION', appT, app, { trang_thai_hien_tai: status, ngay_trang_thai: date }, 'doi_trang_thai');
    preEntryOnStatus_(saved, status); // GĐ 11.2: 内定 → tự mở 受入れ前; kết thúc không vào làm → hủy 受入れ前 đang chuẩn bị
    return public_(saved);
  });
}

// Hủy 1 dòng lịch sử nhập nhầm (3.2 Q5): dòng vẫn còn, đánh dấu đã hủy; trạng thái hiện tại tính lại.
function cancelApplicationStatus(appId, logId, expectedSuaLuc) {
  return withLock_(() => {
    freshCall_();
    const appT = openTable_('APPLICATION');
    const app = findById_(appT, appId);
    if (!app) throw new Error('NOT_FOUND');
    if (app.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    const logT = openTable_('APPLICATION_STATUS_LOG');
    const logs = activeLogs_(logT, appId);
    const log = logs.find((l) => l.id === logId);
    if (!log) throw new Error('NOT_FOUND');
    if (logs.length === 1) throw vError_('trang_thai', 'lastStatus');
    const rest = logs.filter((l) => l.id !== logId);
    const now = rest[rest.length - 1];
    if (APP_ENDED.indexOf(now.trang_thai) < 0 && APP_ENDED.indexOf(app.trang_thai_hien_tai) >= 0) {
      const open = openSibling_(appT, app.person_id, app.job_id, app.id);
      if (open) throw vError_('trang_thai', 'stillOpen', { ma: open.ma });
    }
    // 3.4 Q5: hủy "Đã vào làm" nhập nhầm → ẩn bản ghi vào làm tương ứng; đã ghi nghỉ thì không cho hủy.
    let emp = null;
    let empT = null;
    if (log.trang_thai === 'da_vao_lam') {
      empT = openTable_('EMPLOYMENT');
      emp = readAll_(empT).find((e) => e.application_id === app.id && !e.da_an) || null;
      if (emp && (emp.ngay_nghi || emp.tinh_trang === 'da_nghi')) throw vError_('trang_thai', 'hasLeft');
      // GĐ 5/8 (review): đã lập doanh số / khoản trả người giới thiệu cho lần vào làm này → bỏ các khoản đó trước, tránh lập lại 2 lần.
      if (emp && ['REVENUE', 'REFERRER_PAYOUT'].some((tb) => readAll_(openTable_(tb)).some((r) => !r.da_an && r.employment_id === emp.id))) {
        throw vError_('trang_thai', 'hasMoney');
      }
    }
    writeChange_('APPLICATION_STATUS_LOG', logT, log, { da_an: HIDDEN }, 'huy');
    if (emp) {
      writeChange_('EMPLOYMENT', empT, emp, { da_an: HIDDEN }, 'huy');
      // GĐ 11.2: hồ sơ 受入れ前 đã chuyển "đã vào làm" theo lần vào làm này → quay lại "đang chuẩn bị".
      const preT = openTable_('PRE_ENTRY');
      readAll_(preT).filter((r) => r.employment_id === emp.id).forEach((r) => writeChange_('PRE_ENTRY', preT, r, { trang_thai: 'dang_chuan_bi', employment_id: '' }, 'huy_vao_lam'));
    }
    return public_(writeChange_('APPLICATION', appT, app, { trang_thai_hien_tai: now.trang_thai, ngay_trang_thai: now.ngay_hieu_luc }, 'doi_trang_thai'));
  });
}

// Lịch sử của 1 lần giới thiệu (kể cả dòng đã hủy), cũ → mới.
function getApplicationLogs(appId) {
  freshCall_();
  const cols = TABLE_RULES.APPLICATION_STATUS_LOG.listColumns;
  return readAll_(openTable_('APPLICATION_STATUS_LOG')).filter((l) => l.application_id === appId).sort(byLogOrder_)
    .map((l) => { const o = {}; cols.forEach((c) => { o[c] = l[c]; }); return o; });
}

// ---- Bước 3.3: Phỏng vấn (D-055) ----

// Người liên hệ của công ty có đơn tuyển của lần giới thiệu này (để chọn người phỏng vấn phía công ty).
function interviewContacts_(appId) {
  const app = findById_(openTable_('APPLICATION'), appId);
  const job = app && findById_(openTable_('JOB_ORDER'), app.job_id);
  if (!job) return [];
  return readAll_(openTable_('CONTACT')).filter((c) => c.company_id === job.company_id);
}

// 3.3 Q2 (c): sau khi lưu, gợi ý cập nhật trạng thái lần giới thiệu — chỉ gợi ý, không tự đổi.
function interviewSuggestion_(app, iv, before) {
  const st = app.trang_thai_hien_tai;
  if (APP_ENDED.indexOf(st) >= 0 || (before && before.ket_qua === iv.ket_qua)) return null;
  const ivDay = iv.thoi_gian.slice(0, 10);
  let status = null;
  let day = ivDay;
  if (iv.ket_qua === 'cho' && !before && st === 'da_gui') { status = 'cho_pv'; day = nowJst_().slice(0, 10); }
  if (iv.ket_qua === 'dat' && (st === 'da_gui' || st === 'cho_pv')) status = 'da_pv';
  if (iv.ket_qua === 'truot') status = 'truot';
  if (!status || status === st) return null;
  if (app.ngay_trang_thai && day < app.ngay_trang_thai) day = app.ngay_trang_thai; // ngày không lùi (3.2 Q2)
  return { status: status, date: day, reason: status === 'truot' ? iv.ly_do : '' };
}

// Thêm (id trống) hoặc sửa 1 buổi phỏng vấn. Chỉ thêm khi lần giới thiệu chưa kết thúc (3.3 Q3).
function saveInterview(id, data, expectedSuaLuc) {
  const rules = TABLE_RULES.INTERVIEW;
  return withLock_(() => {
    freshCall_();
    const t = openTable_('INTERVIEW');
    let current = null;
    let saved;
    if (id) {
      current = findById_(t, id);
      if (!current) throw new Error('NOT_FOUND');
      if (current.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    }
    const patch = clean_(rules, data);
    if (current) delete patch.application_id;
    const rec = Object.assign({}, current || rules.defaults, patch);
    check_(rules, rec);
    const app = findById_(openTable_('APPLICATION'), rec.application_id);
    if (!app || app.da_an) throw vError_('application_id', 'invalidChoice');
    if (!current && APP_ENDED.indexOf(app.trang_thai_hien_tai) >= 0) throw vError_('application_id', 'appEnded');
    checkRefs_(rules, rec, current);
    saved = current ? writeChange_('INTERVIEW', t, current, patch, 'sua') : insertMany_('INTERVIEW', t, [rec])[0];
    return { interview: public_(saved), app: public_(app), suggest: interviewSuggestion_(app, saved, current) };
  });
}

// Các buổi phỏng vấn của 1 lần giới thiệu (kể cả đã ẩn) + người liên hệ của công ty để chọn người phỏng vấn.
function listInterviews(appId) {
  freshCall_();
  const cols = TABLE_RULES.INTERVIEW.listColumns;
  const pick = (r) => { const o = {}; cols.forEach((c) => { o[c] = r[c]; }); return o; };
  return {
    interviews: readAll_(openTable_('INTERVIEW')).filter((r) => r.application_id === appId).sort((a, b) => (a.thoi_gian < b.thoi_gian ? -1 : 1)).map(pick),
    contacts: interviewContacts_(appId).map((c) => ({ id: c.id, ma: c.ma, ho_ten: c.ho_ten, chuc_vu: c.chuc_vu, da_an: c.da_an })),
  };
}

// Lịch phỏng vấn sắp tới của 1 công ty (3.3 Q5): từ hôm nay (JST), kết quả "chờ", chưa ẩn; sắp theo thời gian.
function getUpcomingInterviews(companyId) {
  freshCall_();
  const today = nowJst_().slice(0, 10);
  const jobs = readAll_(openTable_('JOB_ORDER')).filter((j) => j.company_id === companyId);
  const apps = readAll_(openTable_('APPLICATION')).filter((a) => !a.da_an && jobs.some((j) => j.id === a.job_id));
  const people = readAll_(openTable_('PERSON'));
  return readAll_(openTable_('INTERVIEW'))
    .filter((iv) => !iv.da_an && iv.ket_qua === 'cho' && iv.thoi_gian.slice(0, 10) >= today && apps.some((a) => a.id === iv.application_id))
    .sort((a, b) => (a.thoi_gian < b.thoi_gian ? -1 : 1))
    .map((iv) => {
      const a = apps.find((x) => x.id === iv.application_id);
      const j = jobs.find((x) => x.id === a.job_id);
      const p = people.find((x) => x.id === a.person_id) || {};
      return { id: iv.id, ma: iv.ma, thoi_gian: iv.thoi_gian, gio_ket_thuc: iv.gio_ket_thuc, vong: iv.vong, hinh_thuc: iv.hinh_thuc,
        dia_diem: iv.dia_diem, app_ma: a.ma, person_id: a.person_id, person_ma: p.ma, person_name: p.ho_ten_latin, job_ma: j.ma, vi_tri: j.vi_tri };
    });
}

// ---- Bước 3.4: Vào làm cơ bản (D-006, D-020, D-021, D-057) ----

// Trạng thái 1 lần vào làm vào ngày `day`: dang_lam / cho_vao_lam / da_nghi. Có ngày thì theo ngày;
// dữ liệu nhập từ file cũ thiếu ngày → theo cột tinh_trang (D-079).
function empState_(e, day) {
  if (e.ngay_nghi && e.ngay_nghi <= day) return 'da_nghi';
  if (!e.ngay_nghi && e.tinh_trang === 'da_nghi') return 'da_nghi'; // đã nghỉ, không rõ ngày
  if (e.ngay_vao_lam) return e.ngay_vao_lam <= day ? 'dang_lam' : 'cho_vao_lam';
  return e.tinh_trang === 'dang_lam' ? 'dang_lam' : 'cho_vao_lam';
}
// Đang làm vào ngày `day`: đã vào làm (≤ day) và chưa nghỉ hoặc ngày nghỉ sau `day`.
const workingOn_ = (e, day) => !e.da_an && empState_(e, day) === 'dang_lam';
const waitingOn_ = (e, day) => !e.da_an && empState_(e, day) === 'cho_vao_lam';

// Chọn "Đã vào làm" cho 1 lần giới thiệu: ghi lịch sử + tạo bản ghi vào làm. Ngày vào làm được ở tương lai (3.4 Q1 b).
function startEmployment(appId, ngayVaoLam, expectedSuaLuc) {
  return withLock_(() => { freshCall_(); return startEmploymentNow_(appId, ngayVaoLam, expectedSuaLuc); });
}

// Phần chính (người gọi giữ khóa) — dùng chung cho startFromPreEntry (GĐ 11.2).
function startEmploymentNow_(appId, ngayVaoLam, expectedSuaLuc) {
  const appT = openTable_('APPLICATION');
  const app = findById_(appT, appId);
  if (!app || app.da_an) throw new Error('NOT_FOUND');
  if (app.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
  if (APP_ENDED.indexOf(app.trang_thai_hien_tai) >= 0) throw vError_('trang_thai', 'appEnded');
  const rules = TABLE_RULES.EMPLOYMENT;
  const job = findById_(openTable_('JOB_ORDER'), app.job_id);
  const emp = { person_id: app.person_id, company_id: job.company_id, job_id: job.id, application_id: app.id, ngay_vao_lam: String(ngayVaoLam || '').trim() };
  check_(rules, emp);
  const logT = openTable_('APPLICATION_STATUS_LOG');
  const logs = activeLogs_(logT, appId);
  const last = logs[logs.length - 1];
  if (last && emp.ngay_vao_lam < last.ngay_hieu_luc) throw vError_('ngay_vao_lam', 'notBeforeLast', { ma: last.ngay_hieu_luc });
  // 3.4 Q4: không đang làm 2 nơi cùng lúc — nơi cũ phải có ngày nghỉ ≤ ngày vào làm mới.
  const empT = openTable_('EMPLOYMENT');
  const all = readAll_(empT);
  const clash = all.find((e) => !e.da_an && e.person_id === app.person_id && empState_(e, emp.ngay_vao_lam) !== 'da_nghi');
  if (clash) throw vError_('ngay_vao_lam', 'stillEmployed', { ma: clash.ma });
  insertLog_(logT, appId, 'da_vao_lam', emp.ngay_vao_lam, '');
  const saved = insertMany_('EMPLOYMENT', empT, [emp])[0];
  const appSaved = writeChange_('APPLICATION', appT, app, { trang_thai_hien_tai: 'da_vao_lam', ngay_trang_thai: emp.ngay_vao_lam }, 'doi_trang_thai');
  // 3.4 Q2 (b): đơn đang mở mà đã đủ người (tính theo hôm nay) → gợi ý đổi sang "Đã đủ người", không tự đổi.
  const today = nowJst_().slice(0, 10);
  const working = all.concat([saved]).filter((e) => e.job_id === job.id && workingOn_(e, today)).length;
  const jobFull = job.trang_thai_don === 'dang_mo' && working >= Number(job.so_luong_can)
    ? { id: job.id, ma: job.ma, sua_luc: job.sua_luc, working: working, need: job.so_luong_can } : null;
  preEntryStarted_(app.id, saved); // GĐ 11.2: hồ sơ 受入れ前 của lần giới thiệu này → "đã vào làm", giữ lịch sử
  return { employment: public_(saved), app: public_(appSaved), jobFull: jobFull };
}

// Ghi (hoặc sửa) ngày nghỉ việc. Lý do bắt buộc, chọn từ danh mục (3.4 Q3). Đơn đã đóng không tự mở lại (D-021).
function endEmployment(empId, data, expectedSuaLuc) {
  const rules = TABLE_RULES.EMPLOYMENT;
  return withLock_(() => {
    freshCall_();
    const t = openTable_('EMPLOYMENT');
    const emp = findById_(t, empId);
    if (!emp || emp.da_an) throw new Error('NOT_FOUND');
    if (emp.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    const patch = clean_(rules, { ngay_nghi: data && data.ngay_nghi, ly_do_nghi: data && data.ly_do_nghi, ghi_chu: data && data.ghi_chu });
    if (!patch.ngay_nghi) throw vError_('ngay_nghi', 'required');
    const next = Object.assign({}, emp, patch);
    check_(rules, next);
    checkRefs_(rules, next, emp);
    // Đã có lần vào làm sau đó thì ngày nghỉ không được muộn hơn ngày vào làm mới (giữ quy tắc 3.4 Q4).
    const later = readAll_(t).find((e) => !e.da_an && e.id !== emp.id && e.person_id === emp.person_id && e.ngay_vao_lam >= emp.ngay_vao_lam && patch.ngay_nghi > e.ngay_vao_lam);
    if (later) throw vError_('ngay_nghi', 'overlapNext', { ma: later.ma });
    return public_(writeChange_('EMPLOYMENT', t, emp, patch, 'nghi_viec'));
  });
}

// D-079: lần vào làm nhập từ file cũ — bổ sung ngày vào làm còn trống, bật / tắt hỗ trợ (支援なし), sửa ghi chú.
// Ngày vào làm đã có thì không đổi ở đây (lần vào làm tạo trong app đi theo lịch sử lần giới thiệu).
function updateEmployment(empId, data, expectedSuaLuc) {
  const rules = TABLE_RULES.EMPLOYMENT;
  return withLock_(() => {
    freshCall_();
    const t = openTable_('EMPLOYMENT');
    const emp = findById_(t, empId);
    if (!emp || emp.da_an) throw new Error('NOT_FOUND');
    if (emp.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    const patch = clean_(rules, pick_(data || {}, ['ngay_vao_lam', 'ho_tro', 'ghi_chu']));
    if (patch.ngay_vao_lam !== undefined && (emp.ngay_vao_lam || !patch.ngay_vao_lam)) delete patch.ngay_vao_lam;
    const next = Object.assign({}, emp, patch);
    check_(rules, next);
    if (!Object.keys(patch).length) return public_(emp);
    return public_(writeChange_('EMPLOYMENT', t, emp, patch, 'sua'));
  });
}
