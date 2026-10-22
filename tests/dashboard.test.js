// Kiểm tra số liệu trang Tổng quan (Dashboard.gs) trên dữ liệu giả lập.
// Chạy: node tests/dashboard.test.js
const assert = require('assert');
const { makeGoogle, load, eq } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs']);
app.initTestData();
g.clock.now = '2026-11-10 09:00:00';
const look = (loai, ja) => app.listRecords('LOOKUP').find((x) => x.loai === loai && x.ten_ja === ja);
const vn = look('quoc_tich', 'ベトナム');
const rA = app.createRecord('STAFF', { ho_ten: 'Recruiter A' });
const rB = app.createRecord('STAFF', { ho_ten: 'Recruiter B' });
const co = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả TQ' });
const j1 = app.createRecord('JOB_ORDER', { company_id: co.id, vi_tri: 'Đơn 1', so_luong_can: '3', phu_trach_staff_id: rA.id });
const j2 = app.createRecord('JOB_ORDER', { company_id: co.id, vi_tri: 'Đơn 2', so_luong_can: '1', phu_trach_staff_id: rB.id });
app.createRecord('JOB_ORDER', { company_id: co.id, vi_tri: 'Đơn đóng', so_luong_can: '5', trang_thai_don: 'da_du' });
const mk = (name, rec) => app.savePerson('', { ho_ten_latin: name, ngay_sinh: '2000-01-01', quoc_tich: vn.id, trang_thai_sang_loc: 'san_sang', recruiter_staff_id: rec.id }).person;
const p1 = mk('Gia Mot', rA); const p2 = mk('Gia Hai', rA); const p3 = mk('Gia Ba', rB); const p4 = mk('Gia Bon', rB); mk('Gia Nam', rA);
const intro = (p, j, rec, day) => app.createApplication({ person_id: p.id, job_id: j.id, ngay_gui: day, recruiter_staff_id: rec.id });
// p1: vào làm 2026-11-05 (đang làm); p2: chờ phỏng vấn, có buổi PV 11-12; p3: 内定承諾; p4: vào làm tương lai 12-01.
const a1 = intro(p1, j1, rA, '2026-11-01');
app.startEmployment(a1.id, '2026-11-05', a1.sua_luc);
const a2 = intro(p2, j1, rA, '2026-11-02');
const a2b = app.addApplicationStatus(a2.id, 'cho_pv', '2026-11-03', '', a2.sua_luc);
app.saveInterview('', { application_id: a2.id, vong: 'v1', thoi_gian: '2026-11-12 10:00' });
app.saveInterview('', { application_id: a2.id, vong: 'v2', thoi_gian: '2026-11-20 10:00' }); // ngoài 7 ngày
const a3 = intro(p3, j2, rB, '2026-10-20');
app.addApplicationStatus(a3.id, 'naitei_shodaku', '2026-11-04', '', a3.sua_luc);
const a4 = intro(p4, j1, rB, '2026-11-06');
app.startEmployment(a4.id, '2026-12-01', a4.sua_luc);
assert(a2b);

// Tất cả.
const d = app.getDashboard({});
eq([d.today, d.month], ['2026-11-10', '2026-11']);
eq([d.openJobs.count, d.openJobs.need, d.openJobs.missing], [2, 4, 3], 'đơn đóng không tính; thiếu = (3−1) + (1−0)');
eq(d.openJobs.top.map((j) => [j.ma, j.need, j.working, j.waiting, j.missing]), [['JO-0001', 3, 1, 1, 2], ['JO-0002', 1, 0, 1, 1]]);
eq([d.pipeline.da_gui, d.pipeline.cho_pv, d.pipeline.naitei_shodaku], [0, 1, 1]);
assert(!('da_vao_lam' in d.pipeline) && !('truot' in d.pipeline), 'chỉ trạng thái chưa kết thúc');
eq(d.interviews.map((i) => [i.ma, i.person, i.thoi_gian]), [['PV-0001', 'Gia Hai', '2026-11-12 10:00']]);
eq(d.waiting.map((w) => [w.person, w.ngay_vao_lam]), [['Gia Bon', '2026-12-01'], ['Gia Ba', '']]);
eq(d.monthStats, { started: 1, left: 0, sent: 3 }, 'vào làm 11-05 tính, 12-01 thuộc tháng 12; gửi khách 3 lần trong tháng 11');
eq(d.lifecycle, { dang_lam: 1, cho_vao_lam: 2, dang_ung_tuyen: 1, da_nghi: 0, khac: 1 });
assert(d.staff.length >= 2);

// Lọc theo Recruiter B: đơn của B, giới thiệu của B, người của B.
const dB = app.getDashboard({ staffId: rB.id });
eq([dB.openJobs.count, dB.openJobs.missing], [1, 1]);
eq([dB.pipeline.cho_pv, dB.pipeline.naitei_shodaku], [0, 1]);
eq(dB.interviews, []);
eq(dB.waiting.map((w) => w.person), ['Gia Bon', 'Gia Ba']);
eq(dB.monthStats, { started: 0, left: 0, sent: 1 });
eq(dB.lifecycle, { dang_lam: 0, cho_vao_lam: 2, dang_ung_tuyen: 0, da_nghi: 0, khac: 0 });

// Chọn tháng khác; tháng sai dạng → dùng tháng này.
eq(app.getDashboard({ month: '2026-10' }).monthStats, { started: 0, left: 0, sent: 1 });
assert.strictEqual(app.getDashboard({ month: '2026-1' }).month, '2026-11');

// Nghỉ việc trong tháng → "đã nghỉ"; còn thiếu của đơn đang mở tăng lại (D-021).
const emp1 = app.listRecords('EMPLOYMENT').find((e) => e.person_id === p1.id);
const lyDo = app.listRecords('LOOKUP').find((x) => x.loai === 'ly_do_nghi');
app.endEmployment(emp1.id, { ngay_nghi: '2026-11-09', ly_do_nghi: lyDo.id }, emp1.sua_luc);
const d2 = app.getDashboard({});
eq([d2.openJobs.missing, d2.monthStats.left, d2.lifecycle.da_nghi, d2.lifecycle.dang_lam], [4, 1, 1, 0]);

// ---- Bước 4.2: Pipeline ----
g.clock.now = '2026-11-15 09:00:00';
const pl = app.getPipeline({});
eq(pl.statuses, ['da_gui', 'cho_pv', 'da_pv', 'naitei', 'naitei_shodaku', 'tam_dung']);
eq(pl.columns.cho_pv.map((c) => [c.ma, c.person, c.days, c.next_interview, c.recruiter]), [['APL-0002', 'Gia Hai', 12, '2026-11-20 10:00', 'Recruiter A']]);
eq(pl.columns.naitei_shodaku.map((c) => [c.ma, c.since, c.days]), [['APL-0003', '2026-11-04', 11]]);
assert.strictEqual(Object.values(pl.columns).reduce((s, c) => s + c.length, 0), 2, 'lần đã vào làm không có trong pipeline');
// Thêm 2 lần "đã gửi khách" → lâu nhất lên đầu; lọc theo recruiter / đơn / công ty.
const pX = mk('Gia Sau', rA); const pY = mk('Gia Bay', rB);
intro(pX, j2, rA, '2026-11-14');
intro(pY, j1, rB, '2026-11-01');
eq(app.getPipeline({}).columns.da_gui.map((c) => [c.person, c.days]), [['Gia Bay', 14], ['Gia Sau', 1]]);
eq(app.getPipeline({ staffId: rA.id }).columns.da_gui.map((c) => c.person), ['Gia Sau']);
eq(app.getPipeline({ jobId: j1.id }).columns.da_gui.map((c) => c.person), ['Gia Bay']);
const co2 = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty khác' });
eq(Object.values(app.getPipeline({ companyId: co2.id }).columns).reduce((s, c) => s + c.length, 0), 0);
eq(app.getPipeline({ companyId: co.id }).jobs.map((j) => j.label), ['JO-0001 · Đơn 1', 'JO-0002 · Đơn 2', 'JO-0003 · Đơn đóng']);

// ---- Bước 4.3: Việc cần làm ----
const h = makeGoogle();
const t2 = load(h, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs']);
t2.initTestData();
h.clock.now = '2026-12-01 09:00:00';
const vn2 = t2.listRecords('LOOKUP').find((x) => x.loai === 'quoc_tich' && x.ten_ja === 'ベトナム');
const sA = t2.createRecord('STAFF', { ho_ten: 'R A' });
const sB = t2.createRecord('STAFF', { ho_ten: 'R B' });
const cT = t2.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả Việc' });
const jF = t2.createRecord('JOB_ORDER', { company_id: cT.id, vi_tri: 'Đơn đủ', so_luong_can: '1', phu_trach_staff_id: sA.id, ngay_du_kien_vao_lam: '2026-12-20' });
const jD = t2.createRecord('JOB_ORDER', { company_id: cT.id, vi_tri: 'Đơn tới hạn', so_luong_can: '2', phu_trach_staff_id: sB.id, ngay_du_kien_vao_lam: '2026-12-10' });
const P = (name, rec, status) => t2.savePerson('', { ho_ten_latin: name, ngay_sinh: '2000-01-01', quoc_tich: vn2.id, trang_thai_sang_loc: status || 'san_sang', recruiter_staff_id: rec.id }).person;
P('Moi Nhan', sB, 'moi_nhan');
const GT = (name, rec, job, day) => t2.createApplication({ person_id: P(name, rec).id, job_id: job.id, ngay_gui: day, recruiter_staff_id: rec.id });
GT('Gui Lau', sB, jD, '2026-11-20');
const aPV = GT('Cho PV Lau', sA, jD, '2026-11-01');
t2.addApplicationStatus(aPV.id, 'cho_pv', '2026-11-10', '', aPV.sua_luc);
const aIV = GT('Co PV', sA, jD, '2026-11-30');
t2.saveInterview('', { application_id: aIV.id, vong: 'v1', thoi_gian: '2026-12-06 10:00' });
t2.saveInterview('', { application_id: aIV.id, vong: 'v2', thoi_gian: '2026-12-04 10:00' });
const aSho = GT('Thua Nhan', sB, jD, '2026-11-20');
t2.addApplicationStatus(aSho.id, 'naitei_shodaku', '2026-11-25', '', aSho.sua_luc);
const aSt = GT('Sap Vao', sB, jD, '2026-11-20');
t2.startEmployment(aSt.id, '2026-12-08', aSt.sua_luc);
const aW = GT('Dang Lam', sA, jF, '2026-11-20');
t2.startEmployment(aW.id, '2026-12-01', aW.sua_luc);
h.clock.now = '2026-12-05 09:00:00';
const tk = t2.getTasks({});
eq(tk.tasks.map((x) => [x.rule, x.date, x.person || x.job_ma]), [
  ['status_stale', '2026-11-24', 'Cho PV Lau'],
  ['sent_stale', '2026-11-27', 'Gui Lau'],
  ['shodaku_no_date', '2026-12-02', 'Thua Nhan'],
  ['iv_no_result', '2026-12-04', 'Co PV'],
  ['new_profile', '2026-12-04', 'Moi Nhan'],
  ['job_full', '2026-12-05', 'JO-0001'],
  ['iv_soon', '2026-12-06', 'Co PV'],
  ['start_soon', '2026-12-08', 'Sap Vao'],
  ['job_due', '2026-12-10', 'JO-0002'],
  ['support_due', '2026-12-31', 'Dang Lam'], // GĐ 11.3: quý 10–12 chưa 定期面談, còn ≤ 30 ngày
]);
assert.strictEqual(tk.tasks[0].overdue, true);
assert.strictEqual(tk.tasks.find((x) => x.rule === 'job_due').missing, 2);
// Lọc theo R B: giới thiệu / vào làm của B, đơn của B, hồ sơ của B.
eq(t2.getTasks({ staffId: sB.id }).tasks.map((x) => x.rule), ['sent_stale', 'shodaku_no_date', 'new_profile', 'start_soon', 'job_due']);
// Cài đặt: mặc định; đổi số ngày / tắt; số sai; xung đột; có nhật ký.
const st0 = t2.getTaskSettings();
eq([st0.sent_stale.on, st0.sent_stale.days, st0.sent_stale.sua_luc], [true, 7, '']);
assert.throws(() => t2.saveTaskSetting('sent_stale', true, 'x', ''), /"code":"dayRange"/);
assert.throws(() => t2.saveTaskSetting('sent_stale', true, 400, ''), /"code":"dayRange"/);
assert.throws(() => t2.saveTaskSetting('khong_co', true, 1, ''), /"code":"invalidChoice"/);
const st1 = t2.saveTaskSetting('sent_stale', true, 30, '');
eq([st1.on, st1.days], [true, 30]);
assert.throws(() => t2.saveTaskSetting('sent_stale', true, 5, ''), /CONFLICT/);
t2.saveTaskSetting('new_profile', false, 3, '');
const rules2 = t2.getTasks({}).tasks.map((x) => x.rule);
assert(!rules2.includes('sent_stale') && !rules2.includes('new_profile'));
assert.throws(() => t2.listRecords('SETTING'), /UNKNOWN_TABLE/);
const aud = h.items[h.props.TEST_DATA_ID].getSheetByName('AUDIT_LOG').rows.slice(1).filter((r) => r[9] === 'SETTING');
assert.strictEqual(aud.length, 2, 'mỗi lần lưu cài đặt có nhật ký');

// ---- Bước 6.1: hạn lưu trú / hộ chiếu (D-063) ----
const PH = (name, status, extra) => t2.savePerson('', Object.assign({ ho_ten_latin: name, ngay_sinh: '2000-01-01', quoc_tich: vn2.id, trang_thai_sang_loc: status, recruiter_staff_id: sA.id }, extra)).person;
PH('Visa Sap Het', 'san_sang', { han_luu_tru: '2027-02-01', han_ho_chieu: '2028-01-01' });
PH('Visa Da Het', 'dang_kiem_tra', { han_luu_tru: '2026-12-01' });
PH('Ho Chieu', 'san_sang', { han_ho_chieu: '2027-05-01' });
PH('Bi Loai', 'khong_phu_hop', { han_luu_tru: '2026-12-10' });
const ex = () => t2.getTasks({}).tasks.filter((x) => /_expiry$/.test(x.rule)).map((x) => [x.rule, x.date, x.person, x.days, x.overdue]);
eq(ex(), [
  ['visa_expiry', '2026-12-01', 'Visa Da Het', -4, true],
  ['visa_expiry', '2027-02-01', 'Visa Sap Het', 58, false],
  ['passport_expiry', '2027-05-01', 'Ho Chieu', 147, false],
]);
eq(t2.getTasks({ staffId: sB.id }).tasks.filter((x) => /_expiry$/.test(x.rule)).length, 0);
t2.saveTaskSetting('visa_expiry', true, 30, '');
t2.saveTaskSetting('passport_expiry', false, 180, '');
eq(ex().map((x) => x[2]), ['Visa Da Het']);
// Bước 6.2: hồ sơ visa đã nộp quá N ngày → việc "chờ kết quả"; đã nộp 更新 thì không nhắc hạn lưu trú nữa.
const vDaHet = t2.listRecords('PERSON').find((x) => /visa da het/i.test(x.ho_ten_latin));
t2.createRecord('IMMIGRATION_CASE', { person_id: vDaHet.id, loai_thu_tuc: 'koshin', trang_thai: 'da_nop', ngay_nop: '2026-11-01', phu_trach_staff_id: sB.id });
const cs = t2.getTasks({}).tasks.filter((x) => /_expiry$|case_stale/.test(x.rule)).map((x) => [x.rule, x.date, x.person, x.days, x.loai]);
eq(cs, [['case_stale', '2026-12-01', vDaHet.ho_ten_latin, 34, 'koshin']]);
eq(t2.getTasks({ staffId: sB.id }).tasks.filter((x) => x.rule === 'case_stale').length, 1, 'lọc theo người phụ trách hồ sơ');
eq(t2.getTasks({ staffId: sA.id }).tasks.filter((x) => x.rule === 'case_stale').length, 0);

// ---- Bước 7.1: người đang làm (D-066) ----
eq([t2.monthsBetween_('2026-01-31', '2026-02-28'), t2.monthsBetween_('2026-01-15', '2026-03-15'), t2.monthsBetween_('2026-05-01', '2026-04-01')], [0, 2, 0]);
const sup = t2.createRecord('STAFF', { ho_ten: 'Ho Tro' });
t2.updateRecord('COMPANY', cT.id, { support_staff_id: sup.id + ',' + sA.id }, t2.listRecords('COMPANY').find((c) => c.id === cT.id).sua_luc);
const wk = t2.getWorking({});
eq(wk.rows.map((r) => [r.person, r.state, r.ngay_vao_lam, r.months, r.support]), [
  ['Dang Lam', 'dang_lam', '2026-12-01', 0, 'Ho Tro, R A'],
  ['Sap Vao', 'cho_vao_lam', '2026-12-08', 0, 'Ho Tro, R A']]);
eq(t2.getWorking({ staffId: sB.id }).rows.length, 0, 'lọc theo người hỗ trợ của công ty');
eq(t2.getWorking({ staffId: sup.id }).rows.length, 2);
// Hạn lưu trú: cảnh báo theo số ngày của quy tắc "Hạn lưu trú" (đang 30).
const dl = t2.listRecords('PERSON').find((x) => /dang lam/i.test(x.ho_ten_latin));
t2.savePerson(dl.id, Object.assign({}, dl, { han_luu_tru: '2026-12-20' }), dl.sua_luc);
const wk2 = t2.getWorking({}).rows[0];
eq([wk2.han_luu_tru, wk2.days_left, wk2.visa_warn, t2.getWorking({}).warnDays], ['2026-12-20', 15, true, 30]);
// Nghỉ việc → biến khỏi danh sách.
const empDl = t2.listRecords('EMPLOYMENT').find((e) => e.person_id === dl.id);
t2.endEmployment(empDl.id, { ngay_nghi: '2026-12-05', ly_do_nghi: t2.listRecords('LOOKUP').find((x) => x.loai === 'ly_do_nghi').id }, empDl.sua_luc);
eq(t2.getWorking({}).rows.map((r) => r.person), ['Sap Vao']);

// ---- Bước 7.2 → GĐ 11.3: nhắc 定期面談 theo QUÝ CỐ ĐỊNH (D-080) ----
h.clock.now = '2027-02-25 09:00:00';
const sapVao = t2.listRecords('PERSON').find((x) => /sap vao/i.test(x.ho_ten_latin));
const empSv = t2.listRecords('EMPLOYMENT').find((e) => e.person_id === sapVao.id);
const sd0 = () => t2.getTasks({}).tasks.filter((x) => x.rule === 'support_due').map((x) => [x.date, x.person, x.last]);
eq(sd0(), [['2026-12-31', 'Sap Vao', '']], 'vào làm 2026-12-08 → quý 10–12 chưa phỏng vấn → quá hạn');
eq(t2.getTasks({ staffId: sB.id }).tasks.filter((x) => x.rule === 'support_due').length, 0, 'lọc theo support của công ty');
eq(t2.getTasks({ staffId: sup.id }).tasks.filter((x) => x.rule === 'support_due').length, 1);
const wv = t2.getWorking({}).rows.find((r) => r.person === 'Sap Vao');
eq([wv.last_support, wv.next_support, wv.support_warn], ['', '2027-03-31', true]);
// Lần tư vấn không tính; lần định kỳ ở quý khác không tính.
t2.createRecord('SUPPORT_LOG', { person_id: sapVao.id, loai_ho_tro: 'tu_van', ngay: '2026-12-20', noi_dung: 'Tư vấn giả' });
t2.createRecord('SUPPORT_LOG', { person_id: sapVao.id, loai_ho_tro: 'dinh_ky', ngay: '2026-09-01', noi_dung: 'Quý khác' });
eq(sd0().length, 1);
// Ghi 定期面談 hoàn thành cho quý 10–12 → hết quá hạn; quý 1–3 còn > 30 ngày → chưa nhắc.
t2.createRecord('MENDAN', { person_id: sapVao.id, employment_id: empSv.id, ky: '2026-10', ngay_thuc_hien: '2026-12-20', trang_thai: 'hoan_thanh', noi_dung: 'Phỏng vấn giả' });
eq(sd0(), []);
h.clock.now = '2027-03-05 09:00:00';
eq(sd0(), [['2027-03-31', 'Sap Vao', '2026-12-20']], 'còn ≤ 30 ngày tới cuối quý');
t2.saveTaskSetting('support_due', true, 20, '');
eq(sd0(), [], 'đổi số ngày nhắc trong Cài đặt');
t2.saveTaskSetting('support_due', true, 30, t2.getTaskSettings().support_due.sua_luc);
// Nhật ký hỗ trợ loại 定期面談 trong quý vẫn tính là đã làm.
t2.createRecord('SUPPORT_LOG', { person_id: sapVao.id, employment_id: empSv.id, loai_ho_tro: 'dinh_ky', ngay: '2027-03-02', noi_dung: 'Định kỳ giả' });
eq(sd0(), []);
const wv2 = t2.getWorking({}).rows.find((r) => r.person === 'Sap Vao');
eq([wv2.last_support, wv2.next_support, wv2.support_warn], ['2027-03-02', '2027-06-30', false]);
h.clock.now = '2027-02-25 09:00:00';

// ---- D-073: tỷ lệ chuyển đổi ----
const cv = t2.getConversion({ from: '2026-11', to: '2026-11' });
eq([cv.stages, cv.total], [['gui', 'pv', 'naitei', 'shodaku', 'vao_lam'], [6, 5, 3, 3, 2]]);
eq(cv.byStaff.map((x) => [x.ho_ten, x.counts]), [['R B', [3, 2, 2, 2, 1]], ['R A', [3, 3, 1, 1, 1]]]);
eq(t2.getConversion({ from: '2026-11', to: '2026-11', staffId: sA.id }).total, [3, 3, 1, 1, 1]);
eq(t2.getConversion({ from: '2026-12', to: '2026-12' }).total, [0, 0, 0, 0, 0]);
eq([t2.getConversion({}).from, t2.getConversion({}).to], ['2026-09', '2027-02'], 'mặc định 6 tháng gần nhất');
// ---- D-073: 定期届出 năm ----
const tdk = () => t2.getTasks({}).tasks.filter((x) => x.rule === 'todokede').map((x) => [x.date, x.company, x.year, x.from, x.to]);
eq(tdk(), [], 'kỳ 2025/4–2026/3 không có ai làm');
h.clock.now = '2027-03-30 09:00:00';
eq(tdk(), [], 'chưa tới N ngày trước hạn');
h.clock.now = '2027-04-05 09:00:00';
eq(tdk(), [['2027-05-31', 'Công ty Giả Việc', 2027, '2026-04-01', '2027-03-31']]);
eq(t2.getTasks({ staffId: sB.id }).tasks.filter((x) => x.rule === 'todokede').length, 0, 'lọc theo support của công ty');
assert.throws(() => t2.markTodokede('khong-co', 2027), /"code":"invalidChoice"/);
t2.markTodokede(cT.id, 2027);
eq(tdk(), [], 'đã đánh dấu nộp');
h.clock.now = '2027-06-10 09:00:00';
eq(tdk(), [], 'vẫn là kỳ 2027, đã nộp');

console.log('OK — kiểm tra Dashboard.gs đạt');
