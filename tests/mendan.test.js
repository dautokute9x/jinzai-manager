// GĐ 11.3–11.4 (D-080): 定期面談 theo quý cố định + vấn đề phát sinh (相談・対応).
// Chạy: node tests/mendan.test.js
const assert = require('assert');
const { makeGoogle, load, eq } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Code.gs', 'Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs', 'Auth.gs']);
g.clock.now = '2026-11-10 09:00:00';
app.initTestData();
const vErr = (fn, field, code) => assert.throws(fn, new RegExp('"field":"' + field + '","code":"' + code + '"'));

// ---- Hàm quý ----
eq([app.quarterOf_('2026-11-15'), app.quarterOf_('2027-01-01'), app.quarterOf_('2026-03-31'), app.quarterOf_('2026-09-30')],
  ['2026-10', '2027-01', '2026-01', '2026-07']);
eq([app.quarterEnd_('2026-10'), app.quarterEnd_('2027-01'), app.quarterEnd_('2026-04'), app.quarterEnd_('2026-07')],
  ['2026-12-31', '2027-03-31', '2026-06-30', '2026-09-30']);
eq([app.quarterShift_('2026-10', 1), app.quarterShift_('2026-10', -1), app.quarterShift_('2027-01', -1)], ['2027-01', '2026-07', '2026-10']);

const L = (loai, ja) => app.listRecords('LOOKUP').find((x) => x.loai === loai && x.ten_ja === ja).id;
const sA = app.createRecord('STAFF', { ho_ten: 'CS Gia A' });
const sB = app.createRecord('STAFF', { ho_ten: 'CS Gia B' });
const co = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả MD', support_staff_id: sA.id });
const job = app.createRecord('JOB_ORDER', { company_id: co.id, vi_tri: 'Giả', so_luong_can: '5' });
const mk = (name) => app.savePerson('', { ho_ten_latin: name, ngay_sinh: '2000-01-01', quoc_tich: L('quoc_tich', 'ベトナム'), trang_thai_sang_loc: 'san_sang' }).person;
const start = (p, day) => { const a = app.createApplication({ person_id: p.id, job_id: job.id, ngay_gui: '2026-10-01' }); app.startEmployment(a.id, day, a.sua_luc); };
const p1 = mk('GIA MD MOT'); start(p1, '2026-11-05');
const p2 = mk('GIA MD HAI'); start(p2, '2027-01-10'); // vào làm quý sau
const p3 = mk('GIA MD BA'); start(p3, '2026-11-06');

// ---- Kế hoạch quý ----
const plan = (f) => app.getMendanPlan(f || {});
let pl = plan();
eq([pl.ky, pl.start, pl.end, pl.quarters], ['2026-10', '2026-10-01', '2026-12-31', ['2026-01', '2026-04', '2026-07', '2026-10', '2027-01']]);
eq(pl.rows.map((r) => [r.person, r.state, r.overdue, r.support]), [['GIA MD BA', 'chua_dat_lich', false, 'CS Gia A'], ['GIA MD MOT', 'chua_dat_lich', false, 'CS Gia A']]);
eq(plan({ ky: '2027-01' }).rows.map((r) => r.person), ['GIA MD BA', 'GIA MD HAI', 'GIA MD MOT']);
eq(plan({ ky: 'xau' }).ky, '2026-10', 'kỳ sai → quý hiện tại');
eq(plan({ staffId: sB.id }).rows.length, 0, 'lọc theo CS của công ty');

// ---- MENDAN: kiểm tra dữ liệu, chặn trùng người + quý ----
vErr(() => app.createRecord('MENDAN', { person_id: p1.id, ky: '2026-11' }), 'ky', 'invalidFormat');
vErr(() => app.createRecord('MENDAN', { person_id: p1.id, ky: '2026-10', trang_thai: 'hoan_thanh' }), 'ngay_thuc_hien', 'required');
vErr(() => app.createRecord('MENDAN', { person_id: p1.id, ky: '2026-10', trang_thai: 'da_dat_lich' }), 'ngay_du_kien', 'required');
vErr(() => app.createRecord('MENDAN', { person_id: p1.id, ky: '2026-10', bien_ban: 'http://drive.google.com/x' }), 'bien_ban', 'link');
vErr(() => app.createRecord('MENDAN', { person_id: p1.id, ky: '2026-10', trang_thai: 'xong' }), 'trang_thai', 'invalidChoice');
let m1 = app.createRecord('MENDAN', { person_id: p1.id, ky: '2026-10', trang_thai: 'da_dat_lich', ngay_du_kien: '2026-11-20', staff_id: sB.id, hinh_thuc: 'online' });
vErr(() => app.createRecord('MENDAN', { person_id: p1.id, ky: '2026-10' }), 'ky', 'mendanExists');
pl = plan();
eq(pl.rows.map((r) => [r.person, r.state, r.soon]), [['GIA MD BA', 'chua_dat_lich', false], ['GIA MD MOT', 'da_dat_lich', true]]);
eq(plan({ state: 'sap_toi' }).rows.map((r) => r.person), ['GIA MD MOT']);
eq(plan({ staffId: sB.id }).rows.map((r) => r.person), ['GIA MD MOT'], 'người thực hiện cũng lọc được');
m1 = app.updateRecord('MENDAN', m1.id, { trang_thai: 'hoan_thanh', ngay_thuc_hien: '2026-11-21', noi_dung: 'Nội dung giả' }, m1.sua_luc);
eq(m1.person_id, p1.id);
pl = plan();
eq([pl.counts, pl.total], [{ chua_dat_lich: 1, hoan_thanh: 1 }, 2]);
eq(plan({ state: 'chua_xong' }).rows.map((r) => r.person), ['GIA MD BA']);
// Quý mới: không ghi đè lần trước — mỗi quý 1 dòng.
app.createRecord('MENDAN', { person_id: p1.id, ky: '2027-01' });
eq(app.listRecords('MENDAN').filter((x) => x.person_id === p1.id).map((x) => [x.ky, x.trang_thai]), [['2026-10', 'hoan_thanh'], ['2027-01', 'chua_dat_lich']]);

// ---- Quá hạn; 支援なし không cần ----
g.clock.now = '2027-01-05 09:00:00';
eq(plan({ ky: '2026-10', state: 'qua_han' }).rows.map((r) => r.person), ['GIA MD BA']);
const tSup = () => app.getTasks({}).tasks.filter((x) => x.rule === 'support_due').map((x) => [x.person, x.date]);
eq(tSup(), [['GIA MD BA', '2026-12-31']]);
const e3 = app.listRecords('EMPLOYMENT').find((e) => e.person_id === p3.id);
app.updateEmployment(e3.id, { ho_tro: 'N' }, e3.sua_luc);
eq(plan({ ky: '2026-10' }).rows.map((r) => r.person), ['GIA MD MOT'], 'công ty tự hỗ trợ → không cần 定期面談');
eq(tSup(), []);

// ---- Vấn đề phát sinh ----
vErr(() => app.createRecord('INCIDENT', { ngay_tiep_nhan: '2027-01-05', tieu_de: 'x' }), 'person_ids', 'required');
vErr(() => app.createRecord('INCIDENT', { company_id: co.id, tieu_de: 'x' }), 'ngay_tiep_nhan', 'required');
vErr(() => app.createRecord('INCIDENT', { company_id: co.id, ngay_tiep_nhan: '2027-01-05' }), 'tieu_de', 'required');
vErr(() => app.createRecord('INCIDENT', { company_id: co.id, ngay_tiep_nhan: '2027-01-05', tieu_de: 'x', loai: 'abc' }), 'loai', 'invalidChoice');
vErr(() => app.createRecord('INCIDENT', { company_id: co.id, ngay_tiep_nhan: '2027-01-05', tieu_de: 'x', link: 'javascript:1' }), 'link', 'link');
vErr(() => app.createRecord('INCIDENT', { company_id: co.id, ngay_tiep_nhan: '2027-01-05', tieu_de: 'x', mendan_id: 'khong-co' }), 'mendan_id', 'invalidChoice');
// Từ 1 lần 定期面談: nhiều người + công ty, người phối hợp.
let inc = app.createRecord('INCIDENT', { person_ids: p1.id + ',' + p3.id, company_id: co.id, ngay_tiep_nhan: '2027-01-05', loai: 'luong', tieu_de: 'Lương giả',
  phu_trach_staff_id: sA.id, phoi_hop_staff_id: sB.id, han_xu_ly: '2027-01-06', mendan_id: m1.id });
eq([inc.ma.slice(0, 2), inc.trang_thai, inc.uu_tien, inc.person_ids], ['VD', 'moi', 'trung_binh', p1.id + ',' + p3.id]);
eq(plan({ ky: '2027-01' }).rows.find((r) => r.person === 'GIA MD MOT').open_incidents, 1);
const tInc = (f) => app.getTasks(f || {}).tasks.filter((x) => x.rule === 'incident_due').map((x) => [x.incident_ma, x.date, x.person, x.owner_kind]);
eq(tInc(), [[inc.ma, '2027-01-06', 'GIA MD MOT', 'incident']]);
eq(tInc({ staffId: sB.id }).length, 1, 'người phối hợp cũng thấy');
eq(tInc({ staffId: app.createRecord('STAFF', { ho_ten: 'Khac' }).id }).length, 0);
// Lịch sử xử lý: chỉ thêm, không sửa nội dung cũ.
vErr(() => app.createRecord('INCIDENT_LOG', { incident_id: inc.id, ngay: '2027-01-05' }), 'noi_dung', 'required');
const lg = app.createRecord('INCIDENT_LOG', { incident_id: inc.id, ngay: '2027-01-05', staff_id: sA.id, noi_dung: 'Gọi công ty (giả)' });
const lg2 = app.updateRecord('INCIDENT_LOG', lg.id, { noi_dung: 'Sửa' }, lg.sua_luc);
eq(lg2.noi_dung, 'Gọi công ty (giả)', 'nội dung lịch sử không sửa được');
inc = app.updateRecord('INCIDENT', inc.id, { trang_thai: 'da_giai_quyet', ket_qua: 'Đã trả đủ (giả)' }, inc.sua_luc);
eq(tInc(), [], 'đã giải quyết → hết nhắc');
eq(plan({ ky: '2027-01' }).rows.find((r) => r.person === 'GIA MD MOT').open_incidents, 0);
// Ngày liên hệ lại cũng nhắc (vấn đề chung của công ty, không có người).
const inc2 = app.createRecord('INCIDENT', { company_id: co.id, ngay_tiep_nhan: '2027-01-05', tieu_de: 'Nhà ở giả', loai: 'nha_o', ngay_lien_he_lai: '2027-01-07', han_xu_ly: '2027-02-01' });
eq(tInc(), [[inc2.ma, '2027-01-07', '', 'incident']]);

console.log('OK — kiểm tra 定期面談 + vấn đề phát sinh đạt');
