// GĐ 11.1–11.2 (D-080): thu gom giấy tờ (checklist mở rộng, kho giấy tờ, còn thiếu) + 受入れ前.
// Chạy: node tests/prep.test.js
const assert = require('assert');
const { makeGoogle, load, eq } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Code.gs', 'Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs', 'Prep.gs', 'Auth.gs']);
g.clock.now = '2026-11-01 09:00:00';
app.initTestData();
const vErr = (fn, field, code) => assert.throws(fn, new RegExp('"field":"' + field + '","code":"' + code + '"'));
const L = (loai, ja) => app.listRecords('LOOKUP').find((x) => x.loai === loai && x.ten_ja === ja).id;
const st = app.createRecord('STAFF', { ho_ten: 'CS Giả' });
const st2 = app.createRecord('STAFF', { ho_ten: 'Giấy Tờ Giả' });
const lv = L('linh_vuc', '介護');
const co = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả TN', linh_vuc: lv, support_staff_id: st.id });
const job = app.createRecord('JOB_ORDER', { company_id: co.id, vi_tri: 'Giả', so_luong_can: '2', linh_vuc: lv, ngay_du_kien_vao_lam: '2026-12-01' });
const mk = (name, noiO) => app.savePerson('', { ho_ten_latin: name, ngay_sinh: '2000-01-01', quoc_tich: L('quoc_tich', 'ベトナム'), trang_thai_sang_loc: 'san_sang',
  noi_o: noiO, giay_to_staff_id: st2.id }, '', true).person;
const pA = mk('GIA TN MOT', 'nuoc_ngoai');
const pB = mk('GIA TN HAI', 'nhat');

// ---- 11.2: 内定 → tự mở 受入れ前 (loại theo nơi ở; CS theo công ty; giấy tờ theo người; ngày vào làm dự kiến theo đơn) ----
let a = app.createApplication({ person_id: pA.id, job_id: job.id, ngay_gui: '2026-10-20' });
a = app.addApplicationStatus(a.id, 'cho_pv', '2026-10-22', '', a.sua_luc);
eq(app.listRecords('PRE_ENTRY').length, 0, 'chưa 内定 thì chưa mở');
a = app.addApplicationStatus(a.id, 'naitei', '2026-10-25', '', a.sua_luc);
let pres = app.listRecords('PRE_ENTRY');
eq(pres.map((r) => [r.person_id, r.company_id, r.application_id, r.loai, r.ngay_vao_lam, r.cs_staff_id, r.giay_to_staff_id, r.trang_thai]),
  [[pA.id, co.id, a.id, 'nuoc_ngoai', '2026-12-01', st.id, st2.id, 'dang_chuan_bi']]);
const pre = pres[0];
const tasks = () => app.listRecords('PRE_TASK').filter((x) => x.pre_entry_id === pre.id);
eq(tasks().length, 9, 'mẫu nước ngoài 9 việc');
eq([tasks()[0].nhom, tasks()[0].ten], ['hop_dong', 'Hợp đồng lao động / 雇用契約書']);
a = app.addApplicationStatus(a.id, 'naitei_shodaku', '2026-10-27', '', a.sua_luc);
eq(app.listRecords('PRE_ENTRY').length, 1, '内定承諾 không mở thêm');
// Mẫu riêng (Cài đặt): trong nước 2 việc + 1 giấy tờ.
const tpl = app.getPreTemplates();
eq([tpl.nuoc_ngoai.custom, tpl.trong_nuoc.tasks.length], [false, 7]);
vErr(() => app.savePreTemplate('trong_nuoc', [['sai', 'x']], ''), 'nhom', 'invalidChoice');
const t2 = app.savePreTemplate('trong_nuoc', [['hop_dong', 'Hợp đồng (giả)'], ['khac', 'Việc khác (giả)'], ['khac', '  ']], '');
eq([t2.custom, t2.tasks], [true, [['hop_dong', 'Hợp đồng (giả)'], ['khac', 'Việc khác (giả)']]]);
assert.throws(() => app.savePreTemplate('trong_nuoc', [], ''), /CONFLICT/);
const gHealth = L('giay_to', '健康診断個人票');
const ck = app.getChecklistTemplates();
eq([ck.pre_trong_nuoc.ids, ck.nintei.ids.length > 5], [[], true], 'mẫu giấy tờ 受入れ前 mặc định trống');
app.saveChecklistTemplate('pre_trong_nuoc', [gHealth], '');
// Tạo tay (chuyển công ty, không qua lần giới thiệu).
const preB = app.createRecord('PRE_ENTRY', { person_id: pB.id, company_id: co.id, loai: 'trong_nuoc', ngay_vao_lam: '2026-11-15', cho_ben: 'cong_ty' });
eq(app.listRecords('PRE_TASK').filter((x) => x.pre_entry_id === preB.id).map((x) => x.ten), ['Hợp đồng (giả)', 'Việc khác (giả)']);
const docsB = () => app.listRecords('CASE_DOCUMENT').filter((d) => d.pre_entry_id === preB.id);
eq(docsB().map((d) => [d.giay_to, d.trang_thai, d.case_id]), [[gHealth, 'chua_co', '']]);
vErr(() => app.updateRecord('PRE_ENTRY', preB.id, { trang_thai: 'da_vao_lam' }, preB.sua_luc), 'trang_thai', 'useEmployment');
vErr(() => app.createRecord('PRE_ENTRY', { person_id: pB.id, company_id: co.id, loai: 'x' }), 'loai', 'invalidChoice');
vErr(() => app.createRecord('PRE_ENTRY', { person_id: pB.id, company_id: co.id, link: 'javascript:alert(1)' }), 'link', 'link');
vErr(() => app.createRecord('PRE_ENTRY', { person_id: pB.id, company_id: co.id, link: 'http://drive.google.com/x' }), 'link', 'link');

// ---- 11.1: giấy tờ — trạng thái 5 bước, bên cung cấp, hạn, người kiểm tra, link; kho giấy tờ dùng lại ----
const d0 = docsB()[0];
vErr(() => app.updateRecord('CASE_DOCUMENT', d0.id, { ben_cung_cap: 'ai_do' }, d0.sua_luc), 'ben_cung_cap', 'invalidChoice');
vErr(() => app.updateRecord('CASE_DOCUMENT', d0.id, { han_nhan: '2026-13-01' }, d0.sua_luc), 'han_nhan', 'invalidFormat');
const d1 = app.updateRecord('CASE_DOCUMENT', d0.id, { trang_thai: 'da_yeu_cau', ben_cung_cap: 'nguoi_lao_dong', ngay_yeu_cau: '2026-11-01', han_nhan: '2026-11-03',
  nguoi_kiem_tra: st2.id }, d0.sua_luc);
eq([d1.trang_thai, d1.ben_cung_cap, d1.han_nhan, d1.nguoi_kiem_tra], ['da_yeu_cau', 'nguoi_lao_dong', '2026-11-03', st2.id]);
vErr(() => app.createRecord('CASE_DOCUMENT', { giay_to: gHealth }), 'case_id', 'required');
const vcase = app.createRecord('IMMIGRATION_CASE', { person_id: pA.id, loai_thu_tuc: 'nintei', company_id: co.id, phu_trach_staff_id: st.id });
vErr(() => app.createRecord('CASE_DOCUMENT', { case_id: vcase.id, pre_entry_id: pre.id, giay_to: gHealth }), 'pre_entry_id', 'invalidChoice');
// Kho giấy tờ của người A: hộ chiếu còn hạn.
const gPass = L('giay_to', '旅券の写し');
const lib = app.createRecord('PERSON_DOC', { person_id: pA.id, giay_to: gPass, link: 'https://drive.google.com/file/d/gia', han_hieu_luc: '2030-01-01', nguoi_kiem_tra: st2.id });
vErr(() => app.createRecord('PERSON_DOC', { person_id: pA.id, giay_to: gPass, link: 'ftp://x' }), 'link', 'link');
const passDoc = app.listRecords('CASE_DOCUMENT').find((d) => d.case_id === vcase.id && d.giay_to === gPass);
const reused = app.updateRecord('CASE_DOCUMENT', passDoc.id, { person_doc_id: lib.id, link: lib.link, trang_thai: 'da_nhan', ngay_nhan: '2026-11-01' }, passDoc.sua_luc);
eq([reused.person_doc_id, reused.trang_thai], [lib.id, 'da_nhan']);
// Còn thiếu: hồ sơ visa đang làm + 受入れ前 đang chuẩn bị; lọc quá hạn / bên cung cấp / người phụ trách; có cờ "đã có trong kho".
let miss = app.getMissingDocs({});
assert(miss.rows.length > 10);
eq(miss.rows[0].id, d1.id, 'có hạn → lên đầu');
assert(!miss.rows.some((r) => r.id === passDoc.id), 'đã nhận (dùng lại từ kho) → không còn thiếu');
eq(app.getMissingDocs({ state: 'da_nhan' }).rows.map((r) => [r.id, r.in_library]), [[passDoc.id, true]], 'đã nhận, chờ kiểm tra');
eq(app.getMissingDocs({ ben: 'nguoi_lao_dong' }).rows.map((r) => r.id), [d1.id]);
g.clock.now = '2026-11-05 09:00:00';
eq(app.getMissingDocs({ state: 'qua_han' }).rows.map((r) => [r.id, r.overdue, r.owner_kind, r.person]), [[d1.id, true, 'pre', 'GIA TN HAI']]);
eq(app.getMissingDocs({ staffId: st2.id }).rows.map((r) => r.id), [d1.id], 'theo người kiểm tra / phụ trách');
// Việc cần làm: giấy tờ quá hạn + công việc 受入れ前 sắp tới hạn.
const tA = tasks()[0];
app.updateRecord('PRE_TASK', tA.id, { han: '2026-11-07', phu_trach_staff_id: st.id, cho_ben: 'cong_ty', trang_thai: 'cho_phan_hoi' }, tA.sua_luc);
let tk = app.getTasks({}).tasks;
eq(tk.filter((x) => x.rule === 'doc_due').map((x) => [x.person, x.giay_to, x.doc_state]), [['GIA TN HAI', gHealth, 'da_yeu_cau']]);
eq(tk.filter((x) => x.rule === 'pre_task_due').map((x) => [x.person, x.name, x.company]), [['GIA TN MOT', 'Hợp đồng lao động / 雇用契約書', 'Công ty Giả TN']]);
eq(app.getTasks({ staffId: st2.id }).tasks.filter((x) => x.rule === 'pre_task_due').length, 1, 'phụ trách giấy tờ của 受入れ前 cũng thấy');

// Danh sách 受入れ前 + tiến độ
const list = app.getPreEntries({});
eq(list.rows.map((r) => r.person), ['GIA TN HAI', 'GIA TN MOT'], 'sắp theo ngày vào làm dự kiến');
const rA = list.rows[1];
eq([rA.tasks_done, rA.tasks_total, rA.contract, rA.visa_case.ma, rA.next_task.ten, rA.waiting], [0, 9, { done: 0, total: 1 }, vcase.ma, 'Hợp đồng lao động / 雇用契約書', { cong_ty: 1 }]);
eq([list.rows[0].docs_total, list.rows[0].waiting], [1, { cong_ty: 1, nguoi_lao_dong: 1 }]);
eq(app.getPreEntries({ staffId: st.id }).rows.map((r) => r.person), ['GIA TN MOT']);

// ---- Xác nhận vào làm ----
// Có lần giới thiệu: đi đúng luồng startEmployment; 受入れ前 → đã vào làm, công việc giữ nguyên.
const preA = app.listRecords('PRE_ENTRY').find((r) => r.id === pre.id);
vErr(() => app.startFromPreEntry(preA.id, '', preA.sua_luc), 'ngay_vao_lam', 'required');
const r1 = app.startFromPreEntry(preA.id, '2026-12-01', preA.sua_luc);
eq([r1.pre.trang_thai, r1.pre.employment_id, r1.employment.application_id], ['da_vao_lam', r1.employment.id, a.id]);
eq(app.listRecords('APPLICATION').find((x) => x.id === a.id).trang_thai_hien_tai, 'da_vao_lam');
eq(tasks().length, 9, 'giữ lịch sử chuẩn bị');
vErr(() => app.startFromPreEntry(preA.id, '2026-12-01', r1.pre.sua_luc), 'trang_thai', 'notPreparing');
// Hủy dòng "Đã vào làm" nhập nhầm → 受入れ前 quay lại đang chuẩn bị.
const logs = app.getApplicationLogs(a.id);
const aNow = app.listRecords('APPLICATION').find((x) => x.id === a.id);
app.cancelApplicationStatus(a.id, logs[logs.length - 1].id, aNow.sua_luc);
eq(app.listRecords('PRE_ENTRY').find((r) => r.id === pre.id).trang_thai, 'dang_chuan_bi');
// Không có lần giới thiệu (tạo tay): tạo lần vào làm trực tiếp.
const preB2 = app.listRecords('PRE_ENTRY').find((r) => r.id === preB.id);
const r2 = app.startFromPreEntry(preB2.id, '2026-11-15', preB2.sua_luc);
eq([r2.employment.person_id, r2.employment.company_id, r2.employment.application_id, r2.pre.trang_thai], [pB.id, co.id, '', 'da_vao_lam']);
assert(app.getWorking({}).rows.some((x) => x.person === 'GIA TN HAI'), 'sang Đang làm việc');
const preB3 = app.createRecord('PRE_ENTRY', { person_id: pB.id, company_id: co.id, loai: 'trong_nuoc' });
vErr(() => app.startFromPreEntry(preB3.id, '2026-11-20', preB3.sua_luc), 'ngay_vao_lam', 'stillEmployed');
eq(app.getPreEntries({}).rows.map((r) => r.person), ['GIA TN MOT', 'GIA TN HAI'], 'đang chuẩn bị: A (đã hủy vào làm) + hồ sơ mới của B');
eq(app.getPreEntries({ trang_thai: 'da_vao_lam' }).rows.map((r) => r.person), ['GIA TN HAI']);

// Lần giới thiệu kết thúc không vào làm → 受入れ前 đang chuẩn bị tự hủy.
const pC = mk('GIA TN BA', 'nhat');
let c = app.createApplication({ person_id: pC.id, job_id: job.id, ngay_gui: '2026-11-01' });
c = app.addApplicationStatus(c.id, 'naitei', '2026-11-02', '', c.sua_luc);
c = app.addApplicationStatus(c.id, 'uv_tu_choi', '2026-11-04', 'Ứng viên đổi ý (giả)', c.sua_luc);
const preC = app.listRecords('PRE_ENTRY').find((r) => r.application_id === c.id);
eq(preC.trang_thai, 'huy');
assert(/Tự hủy/.test(preC.ghi_chu));

// Phân quyền: nhân viên dùng được 受入れ前 / giấy tờ; lưu mẫu cần "cài đặt chung".
const tmp = app.setStaffPassword(st.id);
g.session.active = '';
const link = app.login(tmp.id, tmp.password);
app.api(link.token, 'changeMyPassword', [tmp.password, 'MatKhau-Gia-1']);
const apiA = (fn, ...args) => app.api(link.token, fn, args);
assert(apiA('getPreEntries', {}).rows.length >= 1);
assert(Array.isArray(apiA('getMissingDocs', {}).rows));
assert.throws(() => apiA('savePreTemplate', 'trong_nuoc', [], t2.sua_luc), /FORBIDDEN/);
console.log('OK — kiểm tra giấy tờ + 受入れ前 (GĐ 11.1–11.2) đạt');
