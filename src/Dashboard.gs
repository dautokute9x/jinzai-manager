// Bước 4.1: số liệu cho trang Tổng quan — tính trên máy chủ, trả về trong 1 lần gọi (D-060).
// Quy tắc dùng chung với giao diện: "đang làm" (workingOn_), vòng đời D-020, còn thiếu D-006/D-021.

function addDays_(ymd, n) {
  const p = ymd.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
}

const ACTIVE_STATUSES_ = ['da_gui', 'cho_pv', 'da_pv', 'naitei'];

// Vòng đời 1 người (D-020): dang_lam > cho_vao_lam > dang_ung_tuyen > da_nghi > ''.
function lifecycle_(personId, apps, emps, today) {
  const e = emps.filter((x) => x.person_id === personId);
  const st = apps.filter((a) => a.person_id === personId).map((a) => a.trang_thai_hien_tai);
  if (e.some((x) => workingOn_(x, today))) return 'dang_lam';
  if (e.some((x) => waitingOn_(x, today)) || st.indexOf('naitei_shodaku') >= 0) return 'cho_vao_lam';
  if (st.some((s) => ACTIVE_STATUSES_.indexOf(s) >= 0)) return 'dang_ung_tuyen';
  if (e.length) return 'da_nghi';
  return '';
}

// filter: { staffId: '' | id người phụ trách, month: 'yyyy-MM' (trống = tháng này, JST) }.
function getDashboard(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const month = /^\d{4}-\d{2}$/.test(f.month || '') ? f.month : today.slice(0, 7);
  const staffId = String(f.staffId || '');
  const live = (r) => !r.da_an;
  const companies = readAll_(openTable_('COMPANY'));
  const people = readAll_(openTable_('PERSON')).filter(live);
  const jobsAll = readAll_(openTable_('JOB_ORDER')).filter(live);
  const appsAll = readAll_(openTable_('APPLICATION')).filter(live);
  const emps = readAll_(openTable_('EMPLOYMENT')).filter(live);
  const ivs = readAll_(openTable_('INTERVIEW')).filter(live);
  const staff = readAll_(openTable_('STAFF')).map((s) => ({ id: s.id, ho_ten: s.ho_ten, inactive: s.trang_thai !== 'dang_lam' || !!s.da_an }));

  // Lọc theo người phụ trách: đơn → người phụ trách đơn; giới thiệu / phỏng vấn / vào làm → recruiter của lần giới thiệu.
  const apps = staffId ? appsAll.filter((a) => a.recruiter_staff_id === staffId) : appsAll;
  const appIds = apps.map((a) => a.id);
  const jobs = staffId ? jobsAll.filter((j) => j.phu_trach_staff_id === staffId) : jobsAll;
  const myEmps = staffId ? emps.filter((e) => appIds.indexOf(e.application_id) >= 0) : emps;
  const myPeople = staffId ? people.filter((p) => p.recruiter_staff_id === staffId) : people;
  const coName = (id) => { const c = companies.find((x) => x.id === id); return c ? c.ten_phap_nhan : ''; };
  const person = (id) => people.find((p) => p.id === id) || {};
  const jobOf = (id) => jobsAll.find((j) => j.id === id) || {};

  // (a) Đơn đang mở: còn thiếu = số cần − đang làm hôm nay (tính trên mọi lần vào làm của đơn).
  const open = jobs.filter((j) => j.trang_thai_don === 'dang_mo').map((j) => {
    const working = emps.filter((e) => e.job_id === j.id && workingOn_(e, today)).length;
    const waiting = emps.filter((e) => e.job_id === j.id && waitingOn_(e, today)).length +
      appsAll.filter((a) => a.job_id === j.id && a.trang_thai_hien_tai === 'naitei_shodaku').length;
    const need = Number(j.so_luong_can || 0);
    return { id: j.id, ma: j.ma, vi_tri: j.vi_tri, company: coName(j.company_id), need: need, working: working, waiting: waiting, missing: Math.max(need - working, 0) };
  });
  const openJobs = {
    count: open.length,
    need: open.reduce((s, j) => s + j.need, 0),
    missing: open.reduce((s, j) => s + j.missing, 0),
    top: open.filter((j) => j.missing > 0).sort((a, b) => b.missing - a.missing || (a.ma < b.ma ? -1 : 1)).slice(0, 5),
  };

  // (b) Lần giới thiệu đang chạy (chưa kết thúc, gồm tạm dừng) theo trạng thái.
  const pipeline = {};
  APP_STATUSES.filter((s) => APP_ENDED.indexOf(s) < 0).forEach((s) => { pipeline[s] = 0; });
  apps.forEach((a) => { if (pipeline[a.trang_thai_hien_tai] !== undefined) pipeline[a.trang_thai_hien_tai]++; });

  // (c) Phỏng vấn 7 ngày tới (hôm nay → +6), kết quả "chờ".
  const until = addDays_(today, 6);
  const interviews = ivs.filter((iv) => iv.ket_qua === 'cho' && appIds.indexOf(iv.application_id) >= 0 &&
      iv.thoi_gian.slice(0, 10) >= today && iv.thoi_gian.slice(0, 10) <= until)
    .sort((a, b) => (a.thoi_gian < b.thoi_gian ? -1 : 1))
    .map((iv) => {
      const a = apps.find((x) => x.id === iv.application_id);
      const j = jobOf(a.job_id);
      return { ma: iv.ma, thoi_gian: iv.thoi_gian, gio_ket_thuc: iv.gio_ket_thuc, vong: iv.vong, person_id: a.person_id,
        person: person(a.person_id).ho_ten_latin || '', job: j.ma + ' · ' + (j.vi_tri || ''), company: coName(j.company_id) };
    });

  // (d) Chờ vào làm: lần vào làm có ngày ở tương lai + 内定承諾 chưa có bản ghi vào làm.
  const waiting = myEmps.filter((e) => waitingOn_(e, today)).map((e) => ({ person_id: e.person_id, ngay_vao_lam: e.ngay_vao_lam, job_id: e.job_id, company_id: e.company_id }))
    .concat(apps.filter((a) => a.trang_thai_hien_tai === 'naitei_shodaku').map((a) => ({ person_id: a.person_id, ngay_vao_lam: '', job_id: a.job_id })))
    .map((w) => { const j = jobOf(w.job_id); return { person_id: w.person_id, person: person(w.person_id).ho_ten_latin || '', ngay_vao_lam: w.ngay_vao_lam,
      job: jobLabel_(j), company: coName(j.company_id || w.company_id) }; })
    .sort((a, b) => ((a.ngay_vao_lam || '9999') < (b.ngay_vao_lam || '9999') ? -1 : 1));

  // (e) Trong tháng đã chọn.
  const inMonth = (d) => String(d || '').slice(0, 7) === month;
  const monthStats = {
    started: myEmps.filter((e) => inMonth(e.ngay_vao_lam)).length,
    left: myEmps.filter((e) => inMonth(e.ngay_nghi)).length,
    sent: apps.filter((a) => inMonth(a.ngay_gui)).length,
  };

  // (f) Con người theo vòng đời (người chưa ẩn; vòng đời tính trên mọi lần giới thiệu / vào làm của người đó).
  const lifecycle = { dang_lam: 0, cho_vao_lam: 0, dang_ung_tuyen: 0, da_nghi: 0, khac: 0 };
  myPeople.forEach((p) => { lifecycle[lifecycle_(p.id, appsAll, emps, today) || 'khac']++; });

  return { today: today, month: month, staffId: staffId, staff: staff, openJobs: openJobs, pipeline: pipeline,
    interviews: interviews, waiting: waiting, monthStats: monthStats, lifecycle: lifecycle };
}

// ---- Bước 4.2: Pipeline (D-061) ----
// Lần giới thiệu chưa kết thúc (gồm tạm dừng) xếp theo cột trạng thái; trong cột: nằm lâu nhất lên đầu.
// filter: { staffId (recruiter của lần giới thiệu), companyId, jobId } — trống = tất cả.
function daysBetween_(from, to) {
  const d = (s) => { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); };
  return Math.round((d(to) - d(from)) / 86400000);
}

function getPipeline(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const live = (r) => !r.da_an;
  const companies = readAll_(openTable_('COMPANY'));
  const jobs = readAll_(openTable_('JOB_ORDER'));
  const people = readAll_(openTable_('PERSON'));
  const staff = readAll_(openTable_('STAFF'));
  const ivs = readAll_(openTable_('INTERVIEW')).filter((iv) => live(iv) && iv.ket_qua === 'cho' && iv.thoi_gian.slice(0, 10) >= today);
  const statuses = APP_STATUSES.filter((s) => APP_ENDED.indexOf(s) < 0);
  const apps = readAll_(openTable_('APPLICATION')).filter((a) => live(a) && statuses.indexOf(a.trang_thai_hien_tai) >= 0)
    .filter((a) => !f.staffId || a.recruiter_staff_id === f.staffId)
    .filter((a) => !f.jobId || a.job_id === f.jobId)
    .filter((a) => { const j = jobs.find((x) => x.id === a.job_id); return !f.companyId || (j && j.company_id === f.companyId); });
  const columns = {};
  statuses.forEach((s) => { columns[s] = []; });
  apps.forEach((a) => {
    const j = jobs.find((x) => x.id === a.job_id) || {};
    const c = companies.find((x) => x.id === j.company_id) || {};
    const p = people.find((x) => x.id === a.person_id) || {};
    const r = staff.find((x) => x.id === a.recruiter_staff_id);
    const next = ivs.filter((iv) => iv.application_id === a.id).sort((x, y) => (x.thoi_gian < y.thoi_gian ? -1 : 1))[0];
    columns[a.trang_thai_hien_tai].push({ id: a.id, ma: a.ma, person_id: a.person_id, person: p.ho_ten_latin || '', job: (j.ma || '') + ' · ' + (j.vi_tri || ''),
      company: c.ten_phap_nhan || '', since: a.ngay_trang_thai, days: a.ngay_trang_thai ? Math.max(daysBetween_(a.ngay_trang_thai, today), 0) : 0,
      recruiter: r ? r.ho_ten : '', next_interview: next ? next.thoi_gian : '' });
  });
  statuses.forEach((s) => columns[s].sort((x, y) => y.days - x.days || (x.ma < y.ma ? -1 : 1)));
  return {
    today: today, statuses: statuses, columns: columns,
    staff: staff.map((s) => ({ id: s.id, ho_ten: s.ho_ten, inactive: s.trang_thai !== 'dang_lam' || !!s.da_an })),
    companies: companies.filter(live).map((c) => ({ id: c.id, label: c.ma + ' · ' + c.ten_phap_nhan })),
    jobs: jobs.filter(live).filter((j) => !f.companyId || j.company_id === f.companyId).map((j) => ({ id: j.id, label: j.ma + ' · ' + j.vi_tri, company_id: j.company_id })),
  };
}

// ---- Bước 7.1: danh sách người đang làm / chờ vào làm (D-066) ----
// filter: { companyId, staffId } — staffId = người phụ trách HỖ TRỢ của công ty (COMPANY.support_staff_id, nhiều người).
function getWorking(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const live = (r) => !r.da_an;
  const companies = readAll_(openTable_('COMPANY'));
  const jobs = readAll_(openTable_('JOB_ORDER'));
  const people = readAll_(openTable_('PERSON'));
  const staff = readAll_(openTable_('STAFF'));
  const rules = taskSettings_();
  const warnDays = rules.visa_expiry.days;
  const logs = readAll_(openTable_('SUPPORT_LOG'));
  const mendans = readAll_(openTable_('MENDAN')); // GĐ 11.3: 定期面談 theo quý
  const allEmps = readAll_(openTable_('EMPLOYMENT')).filter(live);
  const name = (id) => (staff.find((s) => s.id === id) || {}).ho_ten || '';
  const rows = allEmps
    .filter((e) => workingOn_(e, today) || waitingOn_(e, today))
    .map((e) => {
      const c = companies.find((x) => x.id === e.company_id) || {};
      const j = jobs.find((x) => x.id === e.job_id) || {};
      const p = people.find((x) => x.id === e.person_id) || {};
      const left = p.han_luu_tru ? daysBetween_(today, p.han_luu_tru) : null;
      const ms = workingOn_(e, today) && e.ho_tro !== 'N' ? mendanState_(e.person_id, allEmps, mendans, logs, today) : null;
      const sd = ms ? { last: ms.last, due: ms.due, warn: ms.prevMissing || (ms.curNeed && !ms.curDone && today >= addDays_(quarterEnd_(ms.cur), -rules.support_due.days)) }
        : { last: '', due: '', warn: false };
      const sup = supportStaffOf_(p, c);
      return { emp_ma: e.ma, person_id: e.person_id, person_ma: p.ma || '', person: p.ho_ten_latin || '', company_id: e.company_id,
        company: (c.ten_phap_nhan || '') + (c.ten_co_so ? ' / ' + c.ten_co_so : ''),
        job: jobLabel_(j), ngay_vao_lam: e.ngay_vao_lam, state: workingOn_(e, today) ? 'dang_lam' : 'cho_vao_lam', ho_tro: e.ho_tro || '',
        months: e.ngay_vao_lam ? monthsBetween_(e.ngay_vao_lam, today) : null, tu_cach: p.tu_cach_luu_tru || '', han_luu_tru: p.han_luu_tru || '', days_left: left,
        visa_warn: left !== null && left <= warnDays,
        last_support: sd.last, next_support: sd.due, support_warn: !!sd.warn, support: sup.map(name).filter(String).join(', '), support_ids: sup };
    })
    .filter((r) => !f.companyId || r.company_id === f.companyId)
    .filter((r) => !f.staffId || r.support_ids.indexOf(f.staffId) >= 0)
    .sort((x, y) => (x.company !== y.company ? (x.company < y.company ? -1 : 1) : x.ngay_vao_lam < y.ngay_vao_lam ? -1 : 1));
  rows.forEach((r) => { delete r.support_ids; });
  return { today: today, rows: rows, warnDays: warnDays,
    staff: staff.map((s) => ({ id: s.id, ho_ten: s.ho_ten, inactive: s.trang_thai !== 'dang_lam' || !!s.da_an })),
    companies: companies.filter(live).map((c) => ({ id: c.id, label: c.ma + ' · ' + c.ten_phap_nhan })) };
}

// Người phụ trách hỗ trợ: CS phụ trách của chính người đó (D-079), chưa có thì người hỗ trợ của công ty.
function supportStaffOf_(p, c) {
  const own = splitIds_((p || {}).cs_staff_id);
  return own.length ? own : splitIds_((c || {}).support_staff_id);
}
const jobLabel_ = (j) => (j && j.ma ? j.ma + ' · ' + (j.vi_tri || '') : '');

// Số tháng tròn từ ngày a tới ngày b (yyyy-MM-dd); chưa tới ngày a → 0.
function monthsBetween_(a, b) {
  if (b < a) return 0;
  const p = a.split('-').map(Number); const q = b.split('-').map(Number);
  return (q[0] - p[0]) * 12 + (q[1] - p[1]) - (q[2] < p[2] ? 1 : 0);
}

// ---- 9b (D-073): tỷ lệ chuyển đổi theo lô lần giới thiệu gửi trong khoảng tháng ----
// Một lần giới thiệu "đạt" một bậc khi lịch sử (dòng còn hiệu lực) có trạng thái của bậc đó hoặc bậc sau; phỏng vấn tính cả khi có buổi PV.
const FUNNEL_ = [['gui', []], ['pv', ['cho_pv', 'da_pv']], ['naitei', ['naitei', 'huy_sau_naitei']], ['shodaku', ['naitei_shodaku']], ['vao_lam', ['da_vao_lam']]];
function getConversion(filter) {
  freshCall_();
  const f = filter || {};
  const today = nowJst_().slice(0, 10);
  const to = /^\d{4}-\d{2}$/.test(f.to || '') ? f.to : today.slice(0, 7);
  const from = /^\d{4}-\d{2}$/.test(f.from || '') && f.from <= to ? f.from : shiftMonth_(to, -5);
  const live = (r) => !r.da_an;
  const logs = readAll_(openTable_('APPLICATION_STATUS_LOG')).filter(live);
  const ivApps = readAll_(openTable_('INTERVIEW')).filter(live).map((iv) => iv.application_id);
  const emps = readAll_(openTable_('EMPLOYMENT')).filter(live).map((e) => e.application_id);
  const staff = readAll_(openTable_('STAFF'));
  const apps = readAll_(openTable_('APPLICATION')).filter(live)
    .filter((a) => a.ngay_gui && a.ngay_gui.slice(0, 7) >= from && a.ngay_gui.slice(0, 7) <= to)
    .filter((a) => !f.staffId || a.recruiter_staff_id === f.staffId);
  const stageOf = (a) => {
    const st = logs.filter((l) => l.application_id === a.id).map((l) => l.trang_thai);
    let reached = 0;
    FUNNEL_.forEach((s, i) => { if (i && s[1].some((x) => st.indexOf(x) >= 0)) reached = i; });
    if (emps.indexOf(a.id) >= 0) reached = 4;
    if (reached < 1 && ivApps.indexOf(a.id) >= 0) reached = 1;
    return reached;
  };
  const count = (list) => { const n = [0, 0, 0, 0, 0]; list.forEach((a) => { for (let i = 0; i <= stageOf(a); i++) n[i]++; }); return n; };
  const ids = apps.map((a) => a.recruiter_staff_id || '').filter((x, i, arr) => arr.indexOf(x) === i);
  return { from: from, to: to, stages: FUNNEL_.map((s) => s[0]), total: count(apps),
    byStaff: ids.map((id) => ({ id: id, ho_ten: id ? (staff.find((s) => s.id === id) || {}).ho_ten || id : '', counts: count(apps.filter((a) => (a.recruiter_staff_id || '') === id)) }))
      .sort((x, y) => y.counts[0] - x.counts[0]),
    staff: staff.map((s) => ({ id: s.id, ho_ten: s.ho_ten, inactive: s.trang_thai !== 'dang_lam' || !!s.da_an })) };
}

// ---- 9b (D-073): 定期届出 năm — kỳ 1/4 năm Y-1 → 31/3 năm Y, hạn 31/5 năm Y (công ty tiếp nhận nộp; 登録支援機関 soạn phần hỗ trợ) ----
function todokedeDue_(today) {
  const y = Number(today.slice(0, 4)) - (today.slice(5, 7) < '04' ? 1 : 0); // năm kết thúc kỳ gần nhất đã xong
  return { fyEnd: y + '-03-31', fyStart: (y - 1) + '-04-01', deadline: y + '-05-31', year: y };
}

function markTodokede(companyId, year, done) {
  const y = Number(year);
  if (!/^\d{4}$/.test(String(year))) throw vError_('nam', 'invalidFormat');
  return withLock_(() => {
    freshCall_();
    if (readColumn_(openTable_('COMPANY'), 'id').indexOf(companyId) < 0) throw vError_('company_id', 'invalidChoice');
    const t = openTable_('SETTING');
    const key = 'todokede.' + companyId + '.' + y;
    const row = readAll_(t).find((r) => r.khoa === key);
    const val = JSON.stringify({ done: done !== false, ngay: nowJst_().slice(0, 10) });
    if (row) writeChange_('SETTING', t, row, { gia_tri: val }, 'sua');
    else insertMany_('SETTING', t, [{ khoa: key, gia_tri: val }]);
    return { company_id: companyId, year: y, done: done !== false };
  });
}

// ---- Bước 4.3: Việc cần làm tự sinh (D-062) ----

// Quy tắc đang dùng = mặc định trong Schema.gs + giá trị đã lưu trong tab SETTING (khoa 'task.<quy tắc>').
function taskSettings_() {
  const saved = readAll_(openTable_('SETTING'));
  const out = {};
  Object.keys(TASK_RULES).forEach((k) => {
    const row = saved.find((r) => r.khoa === 'task.' + k);
    let v = {};
    try { v = row ? JSON.parse(row.gia_tri) : {}; } catch (e) { v = {}; }
    out[k] = { on: v.on === undefined ? TASK_RULES[k].on : !!v.on, days: v.days === undefined ? TASK_RULES[k].days : Number(v.days),
      sua_luc: row ? row.sua_luc : '', defaults: TASK_RULES[k] };
  });
  return out;
}

function getTaskSettings() {
  freshCall_();
  return taskSettings_();
}

// Lưu 1 quy tắc (có khóa, chống ghi đè, nhật ký). days: số nguyên 0–365.
function saveTaskSetting(rule, on, days, expectedSuaLuc) {
  if (!TASK_RULES[rule]) throw vError_('khoa', 'invalidChoice');
  const n = Number(days);
  if (String(days).trim() === '' || !Number.isInteger(n) || n < 0 || n > 365) throw vError_('days', 'dayRange');
  return withLock_(() => {
    freshCall_();
    const t = openTable_('SETTING');
    const row = readAll_(t).find((r) => r.khoa === 'task.' + rule);
    const gia_tri = JSON.stringify({ on: !!on, days: n });
    if (row) {
      if (row.sua_luc !== String(expectedSuaLuc || '')) throw new Error('CONFLICT');
      writeChange_('SETTING', t, row, { gia_tri: gia_tri }, 'sua');
    } else {
      if (expectedSuaLuc) throw new Error('CONFLICT');
      insertMany_('SETTING', t, [{ khoa: 'task.' + rule, gia_tri: gia_tri }]);
    }
    return taskSettings_()[rule];
  });
}

// filter: { staffId } — lần giới thiệu / phỏng vấn / vào làm theo recruiter của lần giới thiệu; đơn theo người phụ trách đơn;
// hồ sơ theo recruiter của người. Kết quả sắp theo ngày (quá hạn lên đầu).
function getTasks(filter) {
  freshCall_();
  const f = filter || {};
  const now = nowJst_();
  const today = now.slice(0, 10);
  const rules = taskSettings_();
  // GĐ 10 / D-077: việc về tiền chỉ hiện cho người có quyền tương ứng.
  if (!can_('doanh_so')) rules.revenue_todo = Object.assign({}, rules.revenue_todo, { on: false });
  if (!can_('hoa_don')) rules.invoice_overdue = Object.assign({}, rules.invoice_overdue, { on: false });
  const live = (r) => !r.da_an;
  const companies = readAll_(openTable_('COMPANY'));
  const people = readAll_(openTable_('PERSON')).filter(live);
  const jobs = readAll_(openTable_('JOB_ORDER')).filter(live);
  const appsAll = readAll_(openTable_('APPLICATION')).filter(live);
  const emps = readAll_(openTable_('EMPLOYMENT')).filter(live);
  const ivs = readAll_(openTable_('INTERVIEW')).filter(live);
  const cases = readAll_(openTable_('IMMIGRATION_CASE')).filter(live); // bước 6.2
  const logs = readAll_(openTable_('SUPPORT_LOG')); // bước 7.2
  const apps = f.staffId ? appsAll.filter((a) => a.recruiter_staff_id === f.staffId) : appsAll;
  const pName = (id) => (people.find((p) => p.id === id) || {}).ho_ten_latin || '';
  const jobOf = (id) => jobs.find((j) => j.id === id) || {};
  const coName = (id) => (companies.find((c) => c.id === id) || {}).ten_phap_nhan || '';
  const ctx = (a) => { const j = jobOf(a.job_id); return { person_id: a.person_id, person: pName(a.person_id), app_ma: a.ma, job_ma: j.ma || '', job: (j.ma || '') + ' · ' + (j.vi_tri || ''), company: coName(j.company_id) }; };
  const tasks = [];
  const add = (rule, date, extra) => tasks.push(Object.assign({ rule: rule, date: date, overdue: date < today }, extra));
  const on = (k) => rules[k].on;
  const days = (k) => rules[k].days;

  if (on('iv_soon') || on('iv_no_result')) {
    ivs.filter((iv) => iv.ket_qua === 'cho').forEach((iv) => {
      const a = apps.find((x) => x.id === iv.application_id);
      if (!a) return;
      const day = iv.thoi_gian.slice(0, 10);
      if (on('iv_soon') && iv.thoi_gian >= now.slice(0, 16) && day <= addDays_(today, days('iv_soon'))) add('iv_soon', day, Object.assign({ time: iv.thoi_gian, iv_ma: iv.ma }, ctx(a)));
      if (on('iv_no_result') && iv.thoi_gian < now.slice(0, 16) && daysBetween_(day, today) >= days('iv_no_result')) add('iv_no_result', day, Object.assign({ time: iv.thoi_gian, iv_ma: iv.ma }, ctx(a)));
    });
  }
  apps.forEach((a) => {
    const since = a.ngay_trang_thai || a.ngay_gui;
    const age = since ? daysBetween_(since, today) : 0;
    if (on('sent_stale') && a.trang_thai_hien_tai === 'da_gui' && age > days('sent_stale')) add('sent_stale', addDays_(since, days('sent_stale')), Object.assign({ days: age, status: a.trang_thai_hien_tai }, ctx(a)));
    if (on('status_stale') && ['cho_pv', 'da_pv', 'naitei', 'tam_dung'].indexOf(a.trang_thai_hien_tai) >= 0 && age > days('status_stale'))
      add('status_stale', addDays_(since, days('status_stale')), Object.assign({ days: age, status: a.trang_thai_hien_tai }, ctx(a)));
    if (on('shodaku_no_date') && a.trang_thai_hien_tai === 'naitei_shodaku' && age > days('shodaku_no_date') && !emps.some((e) => e.application_id === a.id))
      add('shodaku_no_date', addDays_(since, days('shodaku_no_date')), Object.assign({ days: age }, ctx(a)));
  });
  if (on('start_soon')) {
    const appIds = apps.map((a) => a.id);
    emps.filter((e) => appIds.indexOf(e.application_id) >= 0 && e.ngay_vao_lam >= today && e.ngay_vao_lam <= addDays_(today, days('start_soon')))
      .forEach((e) => add('start_soon', e.ngay_vao_lam, ctx(apps.find((a) => a.id === e.application_id))));
  }
  const myJobs = f.staffId ? jobs.filter((j) => j.phu_trach_staff_id === f.staffId) : jobs;
  myJobs.filter((j) => j.trang_thai_don === 'dang_mo').forEach((j) => {
    const working = emps.filter((e) => e.job_id === j.id && workingOn_(e, today)).length;
    const missing = Math.max(Number(j.so_luong_can || 0) - working, 0);
    const base = { job_id: j.id, job_ma: j.ma, job: j.ma + ' · ' + j.vi_tri, company: coName(j.company_id), missing: missing, need: Number(j.so_luong_can || 0) };
    if (on('job_due') && missing > 0 && j.ngay_du_kien_vao_lam && j.ngay_du_kien_vao_lam <= addDays_(today, days('job_due'))) add('job_due', j.ngay_du_kien_vao_lam, base);
    if (on('job_full') && missing === 0) add('job_full', today, base);
  });
  if (on('new_profile')) {
    (f.staffId ? people.filter((p) => p.recruiter_staff_id === f.staffId) : people)
      .filter((p) => p.trang_thai_sang_loc === 'moi_nhan' && daysBetween_(p.tao_luc.slice(0, 10), today) > days('new_profile'))
      .forEach((p) => add('new_profile', addDays_(p.tao_luc.slice(0, 10), days('new_profile')), { person_id: p.id, person: p.ho_ten_latin, days: daysBetween_(p.tao_luc.slice(0, 10), today) }));
  }
  // Bước 6.1 (D-063): hạn lưu trú / hộ chiếu — chỉ người còn liên quan (đang làm, chờ vào làm, đang ứng tuyển, hoặc hồ sơ chưa loại/tạm dừng).
  const expiry = [['visa_expiry', 'han_luu_tru'], ['passport_expiry', 'han_ho_chieu']].filter((r) => on(r[0]));
  if (expiry.length) {
    (f.staffId ? people.filter((p) => p.recruiter_staff_id === f.staffId) : people).forEach((p) => {
      const life = lifecycle_(p.id, appsAll, emps, today);
      if (['dang_lam', 'cho_vao_lam', 'dang_ung_tuyen'].indexOf(life) < 0 && ['moi_nhan', 'dang_kiem_tra', 'san_sang'].indexOf(p.trang_thai_sang_loc) < 0) return;
      // Đã nộp 変更/更新 đang chờ kết quả → không nhắc hạn lưu trú nữa (việc "hồ sơ visa chờ kết quả" lo phần đó).
      const filed = cases.some((c) => c.person_id === p.id && VISA_FILED.indexOf(c.trang_thai) >= 0 && ['henko', 'koshin'].indexOf(c.loai_thu_tuc) >= 0);
      expiry.forEach((r) => {
        if (r[0] === 'visa_expiry' && filed) return;
        const day = p[r[1]];
        if (day && day <= addDays_(today, days(r[0]))) add(r[0], day, { person_id: p.id, person: p.ho_ten_latin, days: daysBetween_(today, day), life: life });
      });
    });
  }
  // GĐ 11.3 (D-080): 定期面談 theo quý — quý này chưa làm (nhắc từ N ngày trước cuối quý); quý trước cần mà chưa làm = quá hạn.
  if (on('support_due')) {
    const mendans = readAll_(openTable_('MENDAN'));
    const seen = {};
    emps.filter((e) => workingOn_(e, today) && e.ho_tro !== 'N').forEach((e) => {
      if (seen[e.person_id]) return;
      seen[e.person_id] = true;
      const c = companies.find((x) => x.id === e.company_id) || {};
      if (f.staffId && supportStaffOf_(people.find((p) => p.id === e.person_id), c).indexOf(f.staffId) < 0) return;
      const ms = mendanState_(e.person_id, emps, mendans, logs, today);
      const base = { person_id: e.person_id, person: pName(e.person_id), company: c.ten_phap_nhan || '', job: jobLabel_(jobOf(e.job_id)), last: ms.last };
      if (ms.prevMissing) add('support_due', quarterEnd_(ms.prev), Object.assign({ ky: ms.prev }, base));
      else if (ms.curNeed && !ms.curDone && today >= addDays_(quarterEnd_(ms.cur), -days('support_due'))) add('support_due', quarterEnd_(ms.cur), Object.assign({ ky: ms.cur }, base));
    });
  }
  // GĐ 11.4: vấn đề chưa giải quyết — hạn xử lý / ngày liên hệ lại sắp tới hoặc đã qua.
  if (on('incident_due')) {
    readAll_(openTable_('INCIDENT')).filter((x) => !x.da_an && INCIDENT_DONE.indexOf(x.trang_thai) < 0).forEach((x) => {
      if (f.staffId && x.phu_trach_staff_id !== f.staffId && splitIds_(x.phoi_hop_staff_id).indexOf(f.staffId) < 0) return;
      const day = [x.han_xu_ly, x.ngay_lien_he_lai].filter(String).sort()[0];
      if (!day || day > addDays_(today, days('incident_due'))) return;
      const pid = splitIds_(x.person_ids)[0] || '';
      add('incident_due', day, { incident_id: x.id, incident_ma: x.ma, name: x.tieu_de, person: pid ? pName(pid) : '', company: coName(x.company_id),
        uu_tien: x.uu_tien, owner_kind: 'incident', owner_id: x.id });
    });
  }
  if (on('invoice_overdue')) { // GĐ 8: theo sales của công ty
    listInvoicesNow_().filter((v) => v.state === 'qua_han' && addDays_(v.han_tt, days('invoice_overdue')) < today).forEach((v) => {
      const c = companies.find((x) => x.id === v.company_id) || {};
      if (f.staffId && splitIds_(c.sales_staff_id).indexOf(f.staffId) < 0) return;
      add('invoice_overdue', v.han_tt, { invoice_ma: v.ma, company: v.company, remain: v.remain, days: daysBetween_(v.han_tt, today) });
    });
  }
  if (on('revenue_todo') && !f.staffId) {
    const n = revenueTodo_().length;
    if (n) add('revenue_todo', today, { count: n });
  }
  if (on('todokede')) {
    const td = todokedeDue_(today);
    if (today >= addDays_(td.deadline, -days('todokede'))) {
      const settings = readAll_(openTable_('SETTING'));
      const isDone = (cid) => settings.some((r) => r.khoa === 'todokede.' + cid + '.' + td.year && /"done":true/.test(r.gia_tri));
      // D-079: bỏ 支援なし, người chờ vào làm chưa có ngày, và dữ liệu cũ nhập SAU hạn nộp (kỳ đó đã nộp ngoài app).
      const coIds = emps.filter((e) => e.ho_tro !== 'N' && !(e.tinh_trang && String(e.tao_luc).slice(0, 10) > td.deadline) && (e.ngay_vao_lam || e.tinh_trang !== 'cho_vao_lam') && (e.ngay_vao_lam || '') <= td.fyEnd && (!e.ngay_nghi || e.ngay_nghi >= td.fyStart))
        .map((e) => e.company_id)
        .filter((x, i, arr) => arr.indexOf(x) === i);
      coIds.filter((cid) => !isDone(cid)).forEach((cid) => {
        const c = companies.find((x) => x.id === cid) || {};
        if (f.staffId && splitIds_(c.support_staff_id).indexOf(f.staffId) < 0) return;
        add('todokede', td.deadline, { company_id: cid, company: c.ten_phap_nhan || '', year: td.year, from: td.fyStart, to: td.fyEnd });
      });
    }
  }
  if (on('case_stale')) {
    cases.filter((c) => VISA_FILED.indexOf(c.trang_thai) >= 0 && c.ngay_nop && daysBetween_(c.ngay_nop, today) > days('case_stale')).forEach((c) => {
      const p = people.find((x) => x.id === c.person_id);
      if (!p || (f.staffId && (c.phu_trach_staff_id || p.recruiter_staff_id) !== f.staffId)) return;
      add('case_stale', addDays_(c.ngay_nop, days('case_stale')), { person_id: p.id, person: p.ho_ten_latin, case_ma: c.ma, loai: c.loai_thu_tuc, days: daysBetween_(c.ngay_nop, today) });
    });
  }
  // GĐ 11.1–11.2 (D-080): giấy tờ chưa nhận / cần sửa sắp tới hạn; công việc 受入れ前 sắp tới hạn.
  if (on('doc_due') || on('pre_task_due')) {
    const pres = readAll_(openTable_('PRE_ENTRY')).filter((r) => !r.da_an && r.trang_thai === 'dang_chuan_bi');
    const limit = (k) => addDays_(today, days(k));
    if (on('doc_due')) {
      readAll_(openTable_('CASE_DOCUMENT')).filter((d) => !d.da_an && d.han_nhan && d.han_nhan <= limit('doc_due')
        && ['chua_co', 'da_yeu_cau', 'can_sua'].indexOf(d.trang_thai) >= 0).forEach((d) => {
        const owner = d.case_id ? cases.find((c) => c.id === d.case_id && VISA_ENDED.indexOf(c.trang_thai) < 0) : pres.find((r) => r.id === d.pre_entry_id);
        if (!owner) return;
        const staff = [d.nguoi_kiem_tra].concat(d.case_id ? [owner.phu_trach_staff_id] : splitIds_(owner.cs_staff_id).concat([owner.giay_to_staff_id]));
        if (f.staffId && staff.indexOf(f.staffId) < 0) return;
        add('doc_due', d.han_nhan, { person_id: owner.person_id, person: pName(owner.person_id), giay_to: d.giay_to, doc_state: d.trang_thai, owner_ma: owner.ma,
          owner_kind: d.case_id ? 'case' : 'pre', owner_id: owner.id });
      });
    }
    if (on('pre_task_due')) {
      readAll_(openTable_('PRE_TASK')).filter((x) => !x.da_an && x.han && x.han <= limit('pre_task_due') && PRE_TASK_DONE.indexOf(x.trang_thai) < 0).forEach((x) => {
        const pre = pres.find((r) => r.id === x.pre_entry_id);
        if (!pre) return;
        const staff = [x.phu_trach_staff_id].concat(splitIds_(pre.cs_staff_id), [pre.giay_to_staff_id]);
        if (f.staffId && staff.indexOf(f.staffId) < 0) return;
        add('pre_task_due', x.han, { person_id: pre.person_id, person: pName(pre.person_id), name: x.ten, company: coName(pre.company_id), owner_ma: pre.ma,
          owner_kind: 'pre', owner_id: pre.id });
      });
    }
  }
  tasks.sort((x, y) => (x.date !== y.date ? (x.date < y.date ? -1 : 1) : (x.rule < y.rule ? -1 : 1)));
  return { today: today, tasks: tasks, rules: rules,
    staff: readAll_(openTable_('STAFF')).map((s) => ({ id: s.id, ho_ten: s.ho_ten, inactive: s.trang_thai !== 'dang_lam' || !!s.da_an })) };
}
