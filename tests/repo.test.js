// Kiểm tra lõi ghi dữ liệu (Repo.gs) bằng Drive/Sheets giả lập.
// Chạy: node tests/repo.test.js
const assert = require('assert');
const { makeGoogle, load, eq } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs']);
const err = (fn, re) => assert.throws(fn, re);

// 0. Chưa khởi tạo → báo NOT_INITIALIZED, không ghi gì.
err(() => app.createRecord('STAFF', { ho_ten: 'A' }), /NOT_INITIALIZED/);

app.initTestData();
const data = Object.values(g.items).find((x) => x.name === 'HR_DATA_TEST');
const staffSheet = data.getSheetByName('STAFF');
const auditSheet = data.getSheetByName('AUDIT_LOG');
const auditRows = () => auditSheet.rows.slice(1).filter((r) => r[9] !== 'LOOKUP').map((r) => ({ action: r[11], before: JSON.parse(r[12]), after: JSON.parse(r[13]), table: r[9] }));

// T1-05: tạo → có ID, mã STF-0001, trạng thái mặc định, nhật ký "tao".
const a = app.createRecord('STAFF', { ho_ten: '  Nguyễn Văn A  ' });
assert.match(a.id, /^uuid-/);
assert.strictEqual(a.ma, 'STF-0001');
assert.strictEqual(a.ho_ten, 'Nguyễn Văn A');
assert.strictEqual(a.trang_thai, 'dang_lam');
assert.strictEqual(a.tao_boi, 'owner@example.test');
assert.strictEqual(auditRows().length, 1);
eq(auditRows()[0], { action: 'tao', before: {}, after: { ho_ten: 'Nguyễn Văn A', trang_thai: 'dang_lam', vai_tro: 'nhan_vien' }, table: 'STAFF' });
assert(staffSheet.textRows.has(2), 'dòng dữ liệu phải ghi dạng chữ thuần');

// Mã tăng dần, không trùng.
const b = app.createRecord('STAFF', { ho_ten: 'Trần Thị B', trang_thai: 'da_nghi' });
assert.strictEqual(b.ma, 'STF-0002');

// T1-08: dữ liệu sai → bị chặn, không ghi dòng nào, không có nhật ký.
const before = staffSheet.rows.length;
err(() => app.createRecord('STAFF', { ho_ten: '   ' }), /VALIDATION\|\{"field":"ho_ten","code":"required"\}/);
err(() => app.createRecord('STAFF', { ho_ten: 'x'.repeat(101) }), /"code":"tooLong"/);
err(() => app.createRecord('STAFF', { ho_ten: 'C', trang_thai: 'khac' }), /"code":"invalidChoice"/);
assert.strictEqual(staffSheet.rows.length, before);
assert.strictEqual(auditRows().length, 2);

// Trường không cho phép sửa (id, mã, da_an…) bị bỏ qua.
const c = app.createRecord('STAFF', { ho_ten: 'Lê C', id: 'hack', ma: 'STF-9999', da_an: 'Y' });
assert.notStrictEqual(c.id, 'hack');
assert.strictEqual(c.ma, 'STF-0003');
assert.strictEqual(c.da_an, '');

// T1-06: sửa → dữ liệu đổi, nhật ký ghi cũ → mới (chỉ trường thay đổi), sua_luc đổi.
g.clock.now = '2026-10-19 12:05:00';
const a2 = app.updateRecord('STAFF', a.id, { ho_ten: 'Nguyễn Văn B' }, a.sua_luc);
assert.strictEqual(a2.ho_ten, 'Nguyễn Văn B');
assert.strictEqual(a2.sua_luc, '2026-10-19 12:05:00');
assert.strictEqual(a2.tao_luc, a.tao_luc);
eq(auditRows().pop(), { action: 'sua', before: { ho_ten: 'Nguyễn Văn A' }, after: { ho_ten: 'Nguyễn Văn B' }, table: 'STAFF' });

// Sửa nhưng không đổi gì → không ghi nhật ký.
const n = auditRows().length;
app.updateRecord('STAFF', a.id, { ho_ten: 'Nguyễn Văn B' }, a2.sua_luc);
assert.strictEqual(auditRows().length, n);

// Sửa thành dữ liệu sai → bị chặn, dữ liệu cũ giữ nguyên.
err(() => app.updateRecord('STAFF', a.id, { ho_ten: '' }, a2.sua_luc), /VALIDATION/);
assert.strictEqual(app.listRecords('STAFF').find((r) => r.id === a.id).ho_ten, 'Nguyễn Văn B');

// T1.4-1: bản đã cũ (sua_luc khác) → CONFLICT, không ghi đè.
err(() => app.updateRecord('STAFF', a.id, { ho_ten: 'Ghi đè' }, a.sua_luc), /CONFLICT/);
assert.strictEqual(app.listRecords('STAFF').find((r) => r.id === a.id).ho_ten, 'Nguyễn Văn B');

// T1-07 + T1.4-2: ẩn → dòng vẫn còn với da_an = Y; hiện lại → trống; mỗi lần có nhật ký.
g.clock.now = '2026-10-19 12:10:00';
const hidden = app.setHidden('STAFF', b.id, true, b.sua_luc);
assert.strictEqual(hidden.da_an, 'Y');
assert.strictEqual(app.listRecords('STAFF').length, 3);
eq(auditRows().pop(), { action: 'an', before: { da_an: '' }, after: { da_an: 'Y' }, table: 'STAFF' });
g.clock.now = '2026-10-19 12:11:00';
const shown = app.setHidden('STAFF', b.id, false, hidden.sua_luc);
assert.strictEqual(shown.da_an, '');
assert.strictEqual(auditRows().pop().action, 'hien');

// Bản ghi không tồn tại.
err(() => app.updateRecord('STAFF', 'khong-co', { ho_ten: 'X' }, ''), /NOT_FOUND/);

// Bảng không được phép ghi qua lõi này (vd. bảng nhật ký).
err(() => app.createRecord('AUDIT_LOG', {}), /UNKNOWN_TABLE/);

// Tiêu đề bị sửa tay → dừng ghi để tránh lệch cột.
staffSheet.rows[0][7] = 'ten';
err(() => app.createRecord('STAFF', { ho_ten: 'D' }), /SCHEMA_MISMATCH\|STAFF/);
staffSheet.rows[0][7] = 'ho_ten';

// 1.6b-C: file đã định dạng chữ thuần sẵn → ghi không định dạng từng dòng nữa.
const before1 = staffSheet.formatCalls;
const fmtRec = app.createRecord('STAFF', { ho_ten: 'Định dạng sẵn' });
assert.strictEqual(staffSheet.formatCalls, before1, 'không định dạng lại khi file đã có cờ');
// Hết dòng trống → nối thêm một khối dòng đã định dạng (không hỏng dữ liệu).
staffSheet.maxRows = staffSheet.rows.length;
const before2 = staffSheet.formatCalls;
const extra = app.createRecord('STAFF', { ho_ten: 'Dòng mới' });
assert.strictEqual(staffSheet.formatCalls, before2 + 1, 'định dạng 1 lần cho cả khối dòng mới');
assert(staffSheet.maxRows >= staffSheet.rows.length + 400);
assert(staffSheet.textRows.has(staffSheet.rows.length));
// Mất cờ (vd. file sau khôi phục) → quay lại định dạng từng dòng như cũ.
delete g.props.TEST_TEXTFMT_DATA;
const before3 = staffSheet.formatCalls;
app.updateRecord('STAFF', extra.id, { ho_ten: 'Dòng mới 2' }, extra.sua_luc);
assert.strictEqual(staffSheet.formatCalls, before3 + 1);
assert(fmtRec.id && app.listRecords('STAFF').some((r) => r.ho_ten === 'Dòng mới 2'));
// Danh sách chỉ trả các cột cần hiển thị.
eq(Object.keys(app.listRecords('STAFF')[0]).sort(), ['da_an', 'ho_ten', 'id', 'khoa_luc', 'ma', 'sua_luc', 'trang_thai', 'vai_tro'], 'không gửi khoa_hash');

// ---- Bước 2.1: Công ty + danh mục lĩnh vực ----
g.props.TEST_TEXTFMT_DATA = data.getId();
g.clock.now = '2026-10-19 15:00:00';
const vErr = (fn, field, code) => assert.throws(fn, (e) => { const v = JSON.parse(e.message.split('|')[1]); return v.field === field && v.code === code; });
const s1 = app.createRecord('STAFF', { ho_ten: 'Sales Giả 1' });
const s2 = app.createRecord('STAFF', { ho_ten: 'Sales Giả 2', trang_thai: 'da_nghi' });
const lv = app.listRecords('LOOKUP').filter((x) => x.loai === 'linh_vuc');
assert.strictEqual(lv.length, 19, 'đã nạp sẵn khi Khởi tạo');
const kaigo = lv.find((x) => x.ten_ja === '介護');
const kensetsu = lv.find((x) => x.ten_ja === '建設');

vErr(() => app.createRecord('COMPANY', { ten_phap_nhan: '  ' }), 'ten_phap_nhan', 'required');
vErr(() => app.createRecord('COMPANY', { ten_phap_nhan: 'A', ma_buu_dien: '12-345' }), 'ma_buu_dien', 'invalidFormat');
vErr(() => app.createRecord('COMPANY', { ten_phap_nhan: 'A', tinh_thanh: 'Tokyo' }), 'tinh_thanh', 'invalidChoice');
vErr(() => app.createRecord('COMPANY', { ten_phap_nhan: 'A', dien_thoai: 'abc' }), 'dien_thoai', 'invalidFormat');
vErr(() => app.createRecord('COMPANY', { ten_phap_nhan: 'A', trang_thai: 'x' }), 'trang_thai', 'invalidChoice');
vErr(() => app.createRecord('COMPANY', { ten_phap_nhan: 'A', sales_staff_id: [s2.id] }), 'sales_staff_id', 'invalidChoice');
vErr(() => app.createRecord('COMPANY', { ten_phap_nhan: 'A', linh_vuc: ['khong-co'] }), 'linh_vuc', 'invalidChoice');

const co1 = app.createRecord('COMPANY', {
  ten_phap_nhan: ' 株式会社テスト ', ma_buu_dien: '100-0001', tinh_thanh: '東京都', dien_thoai: '03-0000-0000',
  linh_vuc: [kaigo.id], sales_staff_id: [s1.id, s1.id], support_staff_id: s1.id + ', ' + s1.id,
});
assert.strictEqual(co1.ma, 'CO-0001');
assert.strictEqual(co1.ten_phap_nhan, '株式会社テスト');
assert.strictEqual(co1.trang_thai, 'dang_giao_dich', 'mặc định');
assert.strictEqual(co1.sales_staff_id, s1.id, 'bỏ ID trùng');
assert.strictEqual(co1.support_staff_id, s1.id);
const coList = app.listRecords('COMPANY');
assert.strictEqual(coList.length, 1);
assert.strictEqual(coList[0].linh_vuc, kaigo.id);

// Q6: người phụ trách đã nghỉ / lĩnh vực hết hiệu lực vẫn được giữ ở công ty cũ, nhưng không chọn mới được.
const s1b = app.updateRecord('STAFF', s1.id, { trang_thai: 'da_nghi' }, s1.sua_luc);
const lvOld = app.updateRecord('LOOKUP', kaigo.id, { den_ngay: '2026-10-18' }, kaigo.sua_luc);
g.clock.now = '2026-10-19 15:00:01';
const co1b = app.updateRecord('COMPANY', co1.id, { ghi_chu: 'Ghi chú giả', linh_vuc: [kaigo.id] }, co1.sua_luc);
assert.strictEqual(co1b.sales_staff_id, s1.id);
vErr(() => app.updateRecord('COMPANY', co1.id, { support_staff_id: [s1.id, s2.id] }, co1b.sua_luc), 'support_staff_id', 'invalidChoice');
const co2 = app.createRecord('COMPANY', { ten_phap_nhan: 'B', linh_vuc: [kensetsu.id] });
vErr(() => app.updateRecord('COMPANY', co2.id, { linh_vuc: [kensetsu.id, kaigo.id] }, co2.sua_luc), 'linh_vuc', 'invalidChoice');
assert.strictEqual(co2.ma, 'CO-0002');
assert(s1b && lvOld);

// Danh mục: ngày hợp lệ, đến ngày ≥ từ ngày; lĩnh vực chưa tới ngày hiệu lực cũng không chọn được.
vErr(() => app.createRecord('LOOKUP', { loai: 'linh_vuc', ten_vi: 'X', tu_ngay: '2026-02-30' }), 'tu_ngay', 'invalidFormat');
vErr(() => app.createRecord('LOOKUP', { loai: 'linh_vuc', ten_vi: 'X', tu_ngay: '2026-10-02', den_ngay: '2026-10-01' }), 'den_ngay', 'dateOrder');
vErr(() => app.createRecord('LOOKUP', { loai: 'khac', ten_vi: 'X' }), 'loai', 'invalidChoice');
const future = app.createRecord('LOOKUP', { loai: 'linh_vuc', ten_vi: 'Giả tương lai', tu_ngay: '2026-11-01' });
assert.strictEqual(future.ma, 'DM-0076');
vErr(() => app.updateRecord('COMPANY', co2.id, { linh_vuc: [future.id] }, co2.sua_luc), 'linh_vuc', 'invalidChoice');

// ---- Bước 2.2: Người liên hệ ----
g.clock.now = '2026-10-19 16:00:00';
vErr(() => app.createRecord('CONTACT', { company_id: co1.id, ho_ten: '' }), 'ho_ten', 'required');
vErr(() => app.createRecord('CONTACT', { ho_ten: 'A' }), 'company_id', 'required');
vErr(() => app.createRecord('CONTACT', { company_id: 'khong-co', ho_ten: 'A' }), 'company_id', 'invalidChoice');
vErr(() => app.createRecord('CONTACT', { company_id: co1.id, ho_ten: 'A', email: 'a@b' }), 'email', 'invalidFormat');
vErr(() => app.createRecord('CONTACT', { company_id: co1.id, ho_ten: 'A', so_dien_thoai: 'x' }), 'so_dien_thoai', 'invalidFormat');
vErr(() => app.createRecord('CONTACT', { company_id: co1.id, ho_ten: 'A', lien_he_chinh: 'yes' }), 'lien_he_chinh', 'invalidChoice');
const k1 = app.createRecord('CONTACT', { company_id: co1.id, ho_ten: 'Liên hệ Giả 1', email: 'gia1@example.test', lien_he_chinh: 'Y' });
assert.strictEqual(k1.ma, 'CT-0001');
const kOther = app.createRecord('CONTACT', { company_id: co2.id, ho_ten: 'Liên hệ Giả công ty B', lien_he_chinh: 'Y' });
g.clock.now = '2026-10-19 16:00:01';
const k2 = app.createRecord('CONTACT', { company_id: co1.id, ho_ten: 'Liên hệ Giả 2', lien_he_chinh: 'Y' });
const contacts = () => app.listRecords('CONTACT');
const byId = (id) => contacts().find((x) => x.id === id);
assert.strictEqual(byId(k1.id).lien_he_chinh, '', 'người cũ tự bỏ dấu liên hệ chính');
assert.strictEqual(byId(k1.id).sua_luc, '2026-10-19 16:00:01');
assert.strictEqual(byId(k2.id).lien_he_chinh, 'Y');
assert.strictEqual(byId(kOther.id).lien_he_chinh, 'Y', 'công ty khác không bị ảnh hưởng');
const auditAll = () => auditSheet.rows.slice(1).map((r) => ({ id: r[10], action: r[11], before: r[12], after: r[13] }));
assert(auditAll().some((a) => a.id === k1.id && a.action === 'sua' && a.after === '{"lien_he_chinh":""}'), 'nhật ký ghi việc bỏ dấu');
// Sửa đánh dấu lại người 1 → người 2 bỏ dấu; sửa không đổi company_id (thuộc đúng 1 công ty).
g.clock.now = '2026-10-19 16:00:02';
const k1b = app.updateRecord('CONTACT', k1.id, { lien_he_chinh: 'Y', company_id: co2.id, chuc_vu: '課長' }, byId(k1.id).sua_luc);
assert.strictEqual(k1b.company_id, co1.id, 'không chuyển công ty');
assert.strictEqual(k1b.chuc_vu, '課長');
assert.strictEqual(byId(k2.id).lien_he_chinh, '');
// Ẩn người liên hệ chính: giữ dấu, không ảnh hưởng người khác; ẩn công ty không ẩn người liên hệ (Q4).
const k1c = app.setHidden('CONTACT', k1.id, true, k1b.sua_luc);
assert.strictEqual(k1c.lien_he_chinh, 'Y');
app.setHidden('COMPANY', co2.id, true, app.listRecords('COMPANY').find((x) => x.id === co2.id).sua_luc);
assert.strictEqual(byId(kOther.id).da_an, '');
// Thêm người liên hệ cho công ty đã ẩn vẫn được (công ty vẫn tồn tại).
assert.strictEqual(app.createRecord('CONTACT', { company_id: co2.id, ho_ten: 'Liên hệ Giả 3' }).ma, 'CT-0004');

// ---- Bước 2.3: Đơn tuyển ----
g.clock.now = '2026-10-19 17:00:00';
const s3 = app.createRecord('STAFF', { ho_ten: 'Phụ trách Giả 3' });
const coJ = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty có lĩnh vực', linh_vuc: [kensetsu.id] });
const job = (extra) => Object.assign({ company_id: coJ.id, vi_tri: '建設作業員', so_luong_can: '2' }, extra);
vErr(() => app.createRecord('JOB_ORDER', job({ vi_tri: ' ' })), 'vi_tri', 'required');
vErr(() => app.createRecord('JOB_ORDER', job({ so_luong_can: '' })), 'so_luong_can', 'required');
['0', '-1', '1.5', 'abc', '10000'].forEach((n) => vErr(() => app.createRecord('JOB_ORDER', job({ so_luong_can: n })), 'so_luong_can', 'positiveInt'));
vErr(() => app.createRecord('JOB_ORDER', job({ trang_thai_don: 'mo' })), 'trang_thai_don', 'invalidChoice');
vErr(() => app.createRecord('JOB_ORDER', job({ phu_trach_staff_id: s3.id + ',' + s3.id })), 'phu_trach_staff_id', 'invalidChoice');
vErr(() => app.createRecord('JOB_ORDER', job({ phu_trach_staff_id: s2.id })), 'phu_trach_staff_id', 'invalidChoice');
vErr(() => app.createRecord('JOB_ORDER', job({ company_id: 'khong-co' })), 'company_id', 'invalidChoice');
// Q4 b: lĩnh vực phải thuộc lĩnh vực của chính công ty đó (và đang hiệu lực).
const nogyo = lv.find((x) => x.ten_ja === '農業');
vErr(() => app.createRecord('JOB_ORDER', job({ linh_vuc: nogyo.id })), 'linh_vuc', 'invalidChoice');
vErr(() => app.createRecord('JOB_ORDER', job({ tinh_thanh_lam_viec: 'Osaka' })), 'tinh_thanh_lam_viec', 'invalidChoice');
vErr(() => app.createRecord('JOB_ORDER', job({ ngay_nhan_don: '2026-13-01' })), 'ngay_nhan_don', 'invalidFormat');
vErr(() => app.createRecord('JOB_ORDER', job({ ngay_nhan_don: '2026-10-19', ngay_du_kien_vao_lam: '2026-10-18' })), 'ngay_du_kien_vao_lam', 'afterReceive');
const j1 = app.createRecord('JOB_ORDER', job({ linh_vuc: kensetsu.id, phu_trach_staff_id: s3.id, tinh_thanh_lam_viec: '大阪府',
  ngay_nhan_don: '2026-10-19', ngay_du_kien_vao_lam: '2026-10-19', so_luong_can: ' 3 ' }));
assert.strictEqual(j1.ma, 'JO-0001');
assert.strictEqual(j1.trang_thai_don, 'dang_mo', 'mặc định Đang mở');
assert.strictEqual(j1.so_luong_can, '3');
// Công ty bỏ lĩnh vực / người phụ trách nghỉ: đơn cũ vẫn giữ, sửa trường khác vẫn lưu được.
const coJ2 = app.updateRecord('COMPANY', coJ.id, { linh_vuc: [] }, coJ.sua_luc);
app.updateRecord('STAFF', s3.id, { trang_thai: 'da_nghi' }, s3.sua_luc);
g.clock.now = '2026-10-19 17:00:01';
const j1b = app.updateRecord('JOB_ORDER', j1.id, { trang_thai_don: 'da_du', company_id: co1.id }, j1.sua_luc);
assert.strictEqual(j1b.trang_thai_don, 'da_du');
assert.strictEqual(j1b.company_id, coJ.id, 'không đổi công ty (Q5)');
assert.strictEqual(j1b.linh_vuc, kensetsu.id);
assert.strictEqual(j1b.phu_trach_staff_id, s3.id);
assert(coJ2);
assert.strictEqual(app.listRecords('JOB_ORDER').length, 1);

// ---- Bước 3.1: Con người + số giấy tờ + nghi trùng ----
g.clock.now = '2026-10-19 18:00:00';
const look = (loai, ja) => app.listRecords('LOOKUP').find((x) => x.loai === loai && x.ten_ja === ja);
const vn = look('quoc_tich', 'ベトナム');
const idn = look('quoc_tich', 'インドネシア');
const n3 = look('tieng_nhat', 'N3');
const recruiter = app.createRecord('STAFF', { ho_ten: 'Recruiter Giả' });
const sensFile = Object.values(g.items).find((x) => x.name === 'HR_SENSITIVE_TEST');
const docsSheet = sensFile.getSheetByName('PERSON_SENSITIVE');
assert.throws(() => app.createRecord('PERSON', { ho_ten_latin: 'A' }), /UNKNOWN_TABLE/, 'không lưu PERSON qua đường chung');
assert.throws(() => app.listRecords('PERSON_SENSITIVE'), /UNKNOWN_TABLE/, 'không bao giờ gửi cả bảng số giấy tờ');
const base = { ho_ten_latin: 'Nguyễn  Văn Giả', ngay_sinh: '2000-01-02', quoc_tich: vn.id };
vErr(() => app.savePerson('', Object.assign({}, base, { ho_ten_latin: '' })), 'ho_ten_latin', 'required');
vErr(() => app.savePerson('', Object.assign({}, base, { ngay_sinh: '' })), 'ngay_sinh', 'required');
vErr(() => app.savePerson('', Object.assign({}, base, { quoc_tich: '' })), 'quoc_tich', 'required');
vErr(() => app.savePerson('', Object.assign({}, base, { quoc_tich: n3.id })), 'quoc_tich', 'invalidChoice');
vErr(() => app.savePerson('', Object.assign({}, base, { gioi_tinh: 'x' })), 'gioi_tinh', 'invalidChoice');
vErr(() => app.savePerson('', Object.assign({}, base, { ky_nang: [kaigo.id] })), 'ky_nang', 'invalidChoice');
vErr(() => app.savePerson('', Object.assign({}, base, { so_ho_chieu: 'C12-34' })), 'so_ho_chieu', 'invalidFormat');
const p1 = app.savePerson('', Object.assign({}, base, { tieng_nhat: n3.id, recruiter_staff_id: recruiter.id, ky_nang: [kensetsu.id], so_ho_chieu: 'c 1234567' })).person;
assert.strictEqual(p1.ma, 'PER-0001');
assert.strictEqual(p1.trang_thai_sang_loc, 'moi_nhan', 'mặc định Mới nhận hồ sơ');
assert.strictEqual(docsSheet.rows.length, 2, 'số giấy tờ nằm ở file nhạy cảm');
assert.strictEqual(docsSheet.rows[1][8], 'C1234567', 'chuẩn hóa: bỏ khoảng trắng, chữ hoa');
assert(!JSON.stringify(data.sheets.map((x) => x.rows)).includes('C1234567'), 'file chính không chứa số hộ chiếu (kể cả nhật ký)');
assert(auditAll().some((a) => a.after.includes('"so_ho_chieu":"***"')), 'nhật ký che số');
eq(app.getPersonDocs(p1.id), { so_ho_chieu: '****4567', so_zairyu_card: '', revealed: false });
eq(app.getPersonDocs(p1.id, true), { so_ho_chieu: 'C1234567', so_zairyu_card: '', revealed: true });
// D-022 (a): khác dấu / hoa thường / khoảng trắng nhưng cùng ngày sinh + quốc tịch → cảnh báo, chưa lưu gì.
const rowsBefore = data.getSheetByName('PERSON').rows.length;
const d1 = app.savePerson('', { ho_ten_latin: 'NGUYEN VAN GIA', ngay_sinh: '2000-01-02', quoc_tich: vn.id });
eq(d1.duplicates.map((x) => [x.ma, x.reasons]), [['PER-0001', ['ten']]]);
assert(!JSON.stringify(d1).includes('C1234567'), 'cảnh báo không lộ số giấy tờ');
assert.strictEqual(data.getSheetByName('PERSON').rows.length, rowsBefore);
// Khác quốc tịch → không trùng theo (a).
assert(app.savePerson('', { ho_ten_latin: 'Nguyen Van Gia', ngay_sinh: '2000-01-02', quoc_tich: idn.id }).person);
// D-022 (b): khác tên nhưng trùng số hộ chiếu → cảnh báo; xác nhận thì lưu.
const d2 = app.savePerson('', { ho_ten_latin: 'Tran Thi Gia', ngay_sinh: '1999-05-05', quoc_tich: vn.id, so_ho_chieu: 'C1234567' });
eq(d2.duplicates.map((x) => x.reasons), [['ho_chieu']]);
const p3 = app.savePerson('', { ho_ten_latin: 'Tran Thi Gia', ngay_sinh: '1999-05-05', quoc_tich: vn.id, so_ho_chieu: 'C1234567' }, '', true).person;
assert.strictEqual(p3.ma, 'PER-0003');
// Sửa trường thường: không kiểm tra trùng lại; số giấy tờ để trống = giữ nguyên; nhập số mới = thay + nhật ký.
g.clock.now = '2026-10-19 18:00:01';
const p3b = app.savePerson(p3.id, { trang_thai_sang_loc: 'san_sang', so_ho_chieu: '' }, p3.sua_luc).person;
assert.strictEqual(p3b.trang_thai_sang_loc, 'san_sang');
assert.strictEqual(app.getPersonDocs(p3.id, true).so_ho_chieu, 'C1234567');
const p3c = app.savePerson(p3.id, { so_zairyu_card: 'ab12345678cd' }, p3b.sua_luc).person;
eq(app.getPersonDocs(p3.id, true), { so_ho_chieu: 'C1234567', so_zairyu_card: 'AB12345678CD', revealed: true });
assert.strictEqual(p3c.sua_luc, p3b.sua_luc, 'chỉ đổi số giấy tờ thì hồ sơ chính không đổi');
assert.throws(() => app.savePerson(p3.id, { ghi_chu: 'x' }, 'cu'), /CONFLICT/);
// Ẩn người: dùng đường chung, số giấy tờ giữ nguyên.
assert.strictEqual(app.setHidden('PERSON', p1.id, true, p1.sua_luc).da_an, 'Y');
assert.strictEqual(app.getPersonDocs(p1.id, true).so_ho_chieu, 'C1234567');
// Người đã ẩn vẫn được dùng để cảnh báo trùng.
eq(app.savePerson('', { ho_ten_latin: 'nguyễn văn giả', ngay_sinh: '2000-01-02', quoc_tich: vn.id }).duplicates.map((x) => [x.ma, x.da_an]), [['PER-0001', 'Y']]);

// ---- 3.1 bổ sung (D-052): bấm "Hiện" số giấy tờ ghi 1 dòng nhật ký, không ghi số ----
const xem = () => auditAll().filter((a) => a.action === 'xem_so');
const xemBefore = xem().length;
app.getPersonDocs(p3.id);
assert.strictEqual(xem().length, xemBefore, 'xem dạng che không ghi');
app.getPersonDocs(p3.id, true);
assert.strictEqual(xem().length, xemBefore + 1);
assert.strictEqual(xem().slice(-1)[0].id, p3.id);
assert(!JSON.stringify(auditSheet.rows).includes('C1234567'));

// ---- Bước 3.2: Lần giới thiệu ----
g.clock.now = '2026-10-20 09:00:00';
const coA = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả GT', linh_vuc: [kensetsu.id] });
const jobA = app.createRecord('JOB_ORDER', { company_id: coA.id, vi_tri: 'Vị trí giả', so_luong_can: '2' });
const jobClosed = app.createRecord('JOB_ORDER', { company_id: coA.id, vi_tri: 'Đơn đóng', so_luong_can: '1', trang_thai_don: 'da_du' });
const rec2 = app.createRecord('STAFF', { ho_ten: 'Recruiter Giả 2' });
const ready = app.savePerson('', { ho_ten_latin: 'San Sang Gia', ngay_sinh: '1999-09-09', quoc_tich: vn.id, trang_thai_sang_loc: 'san_sang' }).person;
const notReady = app.savePerson('', { ho_ten_latin: 'Chua San Sang', ngay_sinh: '1999-09-10', quoc_tich: vn.id }).person;
const intro = (extra) => Object.assign({ person_id: ready.id, job_id: jobA.id, ngay_gui: '2026-10-20' }, extra);
assert.throws(() => app.createRecord('APPLICATION', intro()), /UNKNOWN_TABLE/);
vErr(() => app.createApplication(intro({ ngay_gui: '' })), 'ngay_gui', 'required');
vErr(() => app.createApplication(intro({ person_id: notReady.id })), 'person_id', 'notReady');
vErr(() => app.createApplication(intro({ job_id: jobClosed.id })), 'job_id', 'jobNotOpen');
vErr(() => app.createApplication(intro({ recruiter_staff_id: s2.id })), 'recruiter_staff_id', 'invalidChoice');
const a1 = app.createApplication(intro({ recruiter_staff_id: rec2.id }));
assert.strictEqual(a1.ma, 'APL-0001');
eq([a1.trang_thai_hien_tai, a1.ngay_trang_thai], ['da_gui', '2026-10-20']);
eq(app.getApplicationLogs(a1.id).map((l) => [l.trang_thai, l.ngay_hieu_luc]), [['da_gui', '2026-10-20']]);
// D-023: chưa kết thúc thì không giới thiệu lại cùng đơn; báo mã lần đang mở.
assert.throws(() => app.createApplication(intro()), (e) => /"code":"stillOpen"/.test(e.message) && /"ma":"APL-0001"/.test(e.message));
// Đổi trạng thái: ngày không lùi; lý do bắt buộc khi trượt/từ chối/hủy; "đã vào làm" khóa tới 3.4; xung đột.
g.clock.now = '2026-10-21 10:00:00';
vErr(() => app.addApplicationStatus(a1.id, 'cho_pv', '2026-10-19', '', a1.sua_luc), 'ngay_hieu_luc', 'notBeforeLast');
vErr(() => app.addApplicationStatus(a1.id, 'xx', '2026-10-21', '', a1.sua_luc), 'trang_thai', 'invalidChoice');
vErr(() => app.addApplicationStatus(a1.id, 'da_vao_lam', '2026-10-21', '', a1.sua_luc), 'trang_thai', 'useEmployment');
vErr(() => app.addApplicationStatus(a1.id, 'truot', '2026-10-21', ' ', a1.sua_luc), 'ly_do', 'required');
assert.throws(() => app.addApplicationStatus(a1.id, 'cho_pv', '2026-10-21', '', 'cu'), /CONFLICT/);
const a1b = app.addApplicationStatus(a1.id, 'cho_pv', '2026-10-21', '', a1.sua_luc);
g.clock.now = '2026-10-21 10:00:01';
const a1c = app.addApplicationStatus(a1.id, 'tam_dung', '2026-10-21', '', a1b.sua_luc);
assert.strictEqual(a1c.trang_thai_hien_tai, 'tam_dung');
// Q1: "tạm dừng" chưa kết thúc → vẫn chặn giới thiệu lại.
vErr(() => app.createApplication(intro()), 'job_id', 'stillOpen');
// Hủy dòng nhập nhầm → trạng thái lấy lại dòng còn hiệu lực mới nhất; dòng hủy vẫn còn, có nhật ký.
const logsA1 = app.getApplicationLogs(a1.id);
g.clock.now = '2026-10-21 10:00:02';
const a1d = app.cancelApplicationStatus(a1.id, logsA1[2].id, a1c.sua_luc);
eq([a1d.trang_thai_hien_tai, a1d.ngay_trang_thai], ['cho_pv', '2026-10-21']);
eq(app.getApplicationLogs(a1.id).map((l) => [l.trang_thai, l.da_an]), [['da_gui', ''], ['cho_pv', ''], ['tam_dung', 'Y']]);
assert(auditAll().some((a) => a.id === logsA1[2].id && a.action === 'huy'));
assert.throws(() => app.setHidden('APPLICATION_STATUS_LOG', logsA1[1].id, true, 'x'), /UNKNOWN_TABLE/, 'không hủy lịch sử qua đường chung');
// Không hủy được dòng còn hiệu lực cuối cùng.
const one = app.createApplication({ person_id: ready.id, job_id: app.createRecord('JOB_ORDER', { company_id: coA.id, vi_tri: 'Đơn 3', so_luong_can: '1' }).id, ngay_gui: '2026-10-21' });
vErr(() => app.cancelApplicationStatus(one.id, app.getApplicationLogs(one.id)[0].id, one.sua_luc), 'trang_thai', 'lastStatus');
// Kết thúc (trượt, có lý do) → được giới thiệu lại cùng đơn thành dòng mới.
g.clock.now = '2026-10-22 10:00:00';
const a1e = app.addApplicationStatus(a1.id, 'truot', '2026-10-22', 'Không đạt phỏng vấn (giả)', a1d.sua_luc);
const ap2 = app.createApplication(intro({ ngay_gui: '2026-10-22' }));
assert.strictEqual(ap2.ma, 'APL-0003');
// Mở lại lần cũ trong khi đã có lần mới chưa kết thúc → bị chặn; hủy dòng "trượt" cũng bị chặn.
vErr(() => app.addApplicationStatus(a1.id, 'da_pv', '2026-10-22', '', a1e.sua_luc), 'trang_thai', 'stillOpen');
const truotLog = app.getApplicationLogs(a1.id).filter((l) => !l.da_an).slice(-1)[0];
vErr(() => app.cancelApplicationStatus(a1.id, truotLog.id, a1e.sua_luc), 'trang_thai', 'stillOpen');
// Ẩn lần mới rồi hiện lại lần cũ chưa kết thúc thì bị chặn khi hiện lại lần mới.
const a2h = app.setHidden('APPLICATION', ap2.id, true, ap2.sua_luc);
const a1f = app.cancelApplicationStatus(a1.id, truotLog.id, a1e.sua_luc);
assert.strictEqual(a1f.trang_thai_hien_tai, 'cho_pv');
vErr(() => app.setHidden('APPLICATION', ap2.id, false, a2h.sua_luc), 'trang_thai', 'stillOpen');
assert.strictEqual(app.listRecords('APPLICATION').length, 3);

// ---- Bước 3.3: Phỏng vấn ----
g.clock.now = '2026-10-23 09:00:00';
const ctA = app.createRecord('CONTACT', { company_id: coA.id, ho_ten: 'Người PV Giả' });
const ctOther = app.createRecord('CONTACT', { company_id: co1.id, ho_ten: 'Liên hệ công ty khác' });
const ivApp = app.createApplication({ person_id: ready.id, job_id: app.createRecord('JOB_ORDER', { company_id: coA.id, vi_tri: 'Đơn PV', so_luong_can: '1' }).id, ngay_gui: '2026-10-23' });
const iv = (extra) => Object.assign({ application_id: ivApp.id, vong: 'v1', thoi_gian: '2026-10-25 10:00' }, extra);
assert.throws(() => app.createRecord('INTERVIEW', iv()), /UNKNOWN_TABLE/);
vErr(() => app.saveInterview('', iv({ vong: '' })), 'vong', 'required');
vErr(() => app.saveInterview('', iv({ thoi_gian: '' })), 'thoi_gian', 'required');
vErr(() => app.saveInterview('', iv({ thoi_gian: '2026-10-25 25:00' })), 'thoi_gian', 'invalidFormat');
vErr(() => app.saveInterview('', iv({ gio_ket_thuc: '09:30' })), 'gio_ket_thuc', 'endAfterStart');
vErr(() => app.saveInterview('', iv({ hinh_thuc: 'bay' })), 'hinh_thuc', 'invalidChoice');
vErr(() => app.saveInterview('', iv({ nguoi_pv_contact_id: ctOther.id })), 'nguoi_pv_contact_id', 'invalidChoice');
vErr(() => app.saveInterview('', iv({ ket_qua: 'truot' })), 'ly_do', 'required');
// Thêm buổi đầu (kết quả "chờ") khi đang "đã gửi khách" → gợi ý "chờ phỏng vấn" từ hôm nay; không tự đổi.
const r1 = app.saveInterview('', iv({ gio_ket_thuc: '11:00', hinh_thuc: 'online', nguoi_pv_contact_id: ctA.id }));
assert.strictEqual(r1.interview.ma, 'PV-0001');
assert.strictEqual(r1.interview.ket_qua, 'cho', 'mặc định chờ');
eq(r1.suggest, { status: 'cho_pv', date: '2026-10-23', reason: '' });
assert.strictEqual(app.listRecords('APPLICATION').find((x) => x.id === ivApp.id).trang_thai_hien_tai, 'da_gui', 'chưa tự đổi');
const ivA = app.addApplicationStatus(ivApp.id, r1.suggest.status, r1.suggest.date, r1.suggest.reason, r1.app.sua_luc);
// Thêm buổi 2; nhập kết quả "đạt" cho buổi 1 → gợi ý "đã phỏng vấn" vào ngày phỏng vấn; không gợi ý lại khi kết quả không đổi.
const r2 = app.saveInterview('', iv({ vong: 'v2', thoi_gian: '2026-10-28 14:00' }));
assert.strictEqual(r2.suggest, null, 'đang chờ PV thì không gợi ý lại');
g.clock.now = '2026-10-25 12:00:00';
const r1b = app.saveInterview(r1.interview.id, { ket_qua: 'dat', application_id: 'doi-khac' }, r1.interview.sua_luc);
assert.strictEqual(r1b.interview.application_id, ivApp.id, 'không đổi lần giới thiệu');
eq(r1b.suggest, { status: 'da_pv', date: '2026-10-25', reason: '' });
assert.strictEqual(app.saveInterview(r1.interview.id, { ghi_chu: 'x' }, r1b.interview.sua_luc).suggest, null);
assert.throws(() => app.saveInterview(r1.interview.id, { ghi_chu: 'y' }, 'cu'), /CONFLICT/);
// Danh sách theo lần giới thiệu kèm người liên hệ của đúng công ty; lịch sắp tới của công ty.
const li = app.listInterviews(ivApp.id);
eq(li.interviews.map((x) => x.ma), ['PV-0001', 'PV-0002']);
eq(li.contacts.map((x) => x.ho_ten), ['Người PV Giả']);
eq(app.getUpcomingInterviews(coA.id).map((x) => [x.ma, x.person_name, x.thoi_gian]), [['PV-0002', 'San Sang Gia', '2026-10-28 14:00']]);
assert.strictEqual(app.getUpcomingInterviews(co1.id).length, 0);
// "Trượt" (có lý do) → gợi ý trượt kèm lý do; ngày không lùi trước ngày trạng thái hiện tại.
const r2b = app.saveInterview(r2.interview.id, { ket_qua: 'truot', ly_do: 'Không đạt (giả)', thoi_gian: '2026-10-20 14:00' }, r2.interview.sua_luc);
eq(r2b.suggest, { status: 'truot', date: '2026-10-23', reason: 'Không đạt (giả)' });
app.addApplicationStatus(ivApp.id, 'truot', r2b.suggest.date, r2b.suggest.reason, ivA.sua_luc);
// Lần giới thiệu đã kết thúc: không thêm buổi mới; vẫn sửa / ẩn buổi cũ được.
vErr(() => app.saveInterview('', iv({ thoi_gian: '2026-11-01 10:00' })), 'application_id', 'appEnded');
assert.strictEqual(app.saveInterview(r2.interview.id, { ghi_chu: 'sửa sau khi trượt' }, r2b.interview.sua_luc).suggest, null);
assert.strictEqual(app.setHidden('INTERVIEW', r1.interview.id, true, app.listInterviews(ivApp.id).interviews[0].sua_luc).da_an, 'Y');

// ---- Bước 3.4: Vào làm cơ bản ----
g.clock.now = '2026-11-01 09:00:00';
const coE = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả VL' });
const coE2 = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả VL 2' });
const jobE = app.createRecord('JOB_ORDER', { company_id: coE.id, vi_tri: 'Đơn VL', so_luong_can: '1' });
const jobE2 = app.createRecord('JOB_ORDER', { company_id: coE2.id, vi_tri: 'Đơn VL 2', so_luong_can: '2' });
const w1 = app.savePerson('', { ho_ten_latin: 'Vao Lam Gia', ngay_sinh: '1998-01-01', quoc_tich: vn.id, trang_thai_sang_loc: 'san_sang' }).person;
const apE = app.createApplication({ person_id: w1.id, job_id: jobE.id, ngay_gui: '2026-11-01' });
vErr(() => app.startEmployment(apE.id, '', apE.sua_luc), 'ngay_vao_lam', 'required');
vErr(() => app.startEmployment(apE.id, '2026-10-01', apE.sua_luc), 'ngay_vao_lam', 'notBeforeLast');
assert.throws(() => app.startEmployment(apE.id, '2026-11-01', 'cu'), /CONFLICT/);
// Hôm nay vào làm → đủ 1/1 → gợi ý đổi đơn "Đã đủ người" (không tự đổi).
const st1 = app.startEmployment(apE.id, '2026-11-01', apE.sua_luc);
assert.strictEqual(st1.employment.ma, 'EMP-0001');
eq([st1.employment.company_id, st1.employment.job_id, st1.app.trang_thai_hien_tai], [coE.id, jobE.id, 'da_vao_lam']);
eq([st1.jobFull.ma, st1.jobFull.working, st1.jobFull.need], [jobE.ma, 1, '1']);
assert.strictEqual(app.listRecords('JOB_ORDER').find((x) => x.id === jobE.id).trang_thai_don, 'dang_mo', 'chưa tự đổi');
assert.strictEqual(app.getApplicationLogs(apE.id).slice(-1)[0].trang_thai, 'da_vao_lam');
// Đã vào làm thì không đổi trạng thái kiểu thường; không tạo bản ghi vào làm qua đường chung / ẩn qua đường chung.
vErr(() => app.addApplicationStatus(apE.id, 'tam_dung', '2026-11-02', '', st1.app.sua_luc), 'trang_thai', 'useCancel');
assert.throws(() => app.createRecord('EMPLOYMENT', { ngay_vao_lam: '2026-11-01' }), /UNKNOWN_TABLE/);
assert.throws(() => app.setHidden('EMPLOYMENT', st1.employment.id, true, st1.employment.sua_luc), /UNKNOWN_TABLE/);
// Q4: đang làm ở nơi cũ thì không vào làm nơi mới (kể cả ngày tương lai).
const apE2 = app.createApplication({ person_id: w1.id, job_id: jobE2.id, ngay_gui: '2026-11-01' });
assert.throws(() => app.startEmployment(apE2.id, '2026-12-01', apE2.sua_luc), (e) => /"code":"stillEmployed"/.test(e.message) && /EMP-0001/.test(e.message));
// Ghi nghỉ: ngày + lý do (danh mục) bắt buộc; ngày nghỉ không trước ngày vào làm.
const lyDo = app.listRecords('LOOKUP').find((x) => x.loai === 'ly_do_nghi' && x.ten_ja === '帰国');
vErr(() => app.endEmployment(st1.employment.id, { ngay_nghi: '' }, st1.employment.sua_luc), 'ngay_nghi', 'required');
vErr(() => app.endEmployment(st1.employment.id, { ngay_nghi: '2026-11-30' }, st1.employment.sua_luc), 'ly_do_nghi', 'required');
vErr(() => app.endEmployment(st1.employment.id, { ngay_nghi: '2026-10-31', ly_do_nghi: lyDo.id }, st1.employment.sua_luc), 'ngay_nghi', 'notBeforeStart');
vErr(() => app.endEmployment(st1.employment.id, { ngay_nghi: '2026-11-30', ly_do_nghi: vn.id }, st1.employment.sua_luc), 'ly_do_nghi', 'invalidChoice');
const en1 = app.endEmployment(st1.employment.id, { ngay_nghi: '2026-11-30', ly_do_nghi: lyDo.id, ghi_chu: 'Ghi chú giả' }, st1.employment.sua_luc);
eq([en1.ngay_nghi, en1.ly_do_nghi], ['2026-11-30', lyDo.id]);
// Nghỉ ngày 30/11 → vào nơi mới từ 30/11 được (ngày tương lai, 3.4 Q1 b); không gợi ý đủ người vì chưa tới ngày.
vErr(() => app.startEmployment(apE2.id, '2026-11-29', apE2.sua_luc), 'ngay_vao_lam', 'stillEmployed');
const st2 = app.startEmployment(apE2.id, '2026-11-30', apE2.sua_luc);
assert.strictEqual(st2.jobFull, null);
// Sửa ngày nghỉ nơi cũ muộn hơn ngày vào làm nơi mới → bị chặn.
vErr(() => app.endEmployment(st1.employment.id, { ngay_nghi: '2026-12-05', ly_do_nghi: lyDo.id }, en1.sua_luc), 'ngay_nghi', 'overlapNext');
// Q5: hủy dòng "Đã vào làm" nhập nhầm → ẩn bản ghi vào làm; đã ghi nghỉ thì không cho hủy.
const logsE2 = app.getApplicationLogs(apE2.id);
const cn2 = app.cancelApplicationStatus(apE2.id, logsE2.slice(-1)[0].id, st2.app.sua_luc);
assert.strictEqual(cn2.trang_thai_hien_tai, 'da_gui');
assert.strictEqual(app.listRecords('EMPLOYMENT').find((x) => x.id === st2.employment.id).da_an, 'Y');
vErr(() => app.cancelApplicationStatus(apE.id, app.getApplicationLogs(apE.id).slice(-1)[0].id, st1.app.sua_luc), 'trang_thai', 'hasLeft');

// ---- Bước 6.2: hồ sơ visa (D-064) ----
const tokutei = app.listRecords('LOOKUP').find((x) => x.loai === 'tu_cach_luu_tru');
const vp = app.savePerson('', { ho_ten_latin: 'Visa Gia', ngay_sinh: '1999-01-01', quoc_tich: vn.id, trang_thai_sang_loc: 'san_sang', han_luu_tru: '2026-12-31' }).person;
vErr(() => app.createRecord('IMMIGRATION_CASE', { loai_thu_tuc: 'koshin' }), 'person_id', 'required');
vErr(() => app.createRecord('IMMIGRATION_CASE', { person_id: 'khong-co', loai_thu_tuc: 'koshin' }), 'person_id', 'invalidChoice');
vErr(() => app.createRecord('IMMIGRATION_CASE', { person_id: vp.id }), 'loai_thu_tuc', 'required');
vErr(() => app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'koshin', trang_thai: 'da_nop' }), 'ngay_nop', 'required');
vErr(() => app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'koshin', trang_thai: 'tu_choi', ngay_nop: '2026-11-01' }), 'ngay_ket_qua', 'required');
vErr(() => app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'koshin', trang_thai: 'tu_choi', ngay_nop: '2026-11-01', ngay_ket_qua: '2026-10-01' }), 'ngay_ket_qua', 'afterSubmit');
vErr(() => app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'koshin', han_moi: '2027-12-31' }), 'han_moi', 'onlyGranted');
const vc = app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'koshin', tu_cach_luu_tru: tokutei.id });
eq([vc.ma, vc.trang_thai], ['VS-0001', 'chuan_bi']);
const vc2 = app.updateRecord('IMMIGRATION_CASE', vc.id, { trang_thai: 'da_nop', ngay_nop: '2026-11-01', person_id: w1.id }, vc.sua_luc);
assert.strictEqual(vc2.person_id, vp.id, 'không đổi người của hồ sơ');
vErr(() => app.updateRecord('IMMIGRATION_CASE', vc.id, { trang_thai: 'duoc_cap', ngay_ket_qua: '2026-11-20', han_moi: '2026-11-20' }, vc2.sua_luc), 'han_moi', 'afterResult');
// Được cấp 更新 + hạn mới → hạn lưu trú + tư cách của người tự cập nhật, có nhật ký.
const vc3 = app.updateRecord('IMMIGRATION_CASE', vc.id, { trang_thai: 'duoc_cap', ngay_ket_qua: '2026-11-20', han_moi: '2027-12-31' }, vc2.sua_luc);
const vpAfter = app.listRecords('PERSON').find((x) => x.id === vp.id);
eq([vpAfter.han_luu_tru, vpAfter.tu_cach_luu_tru], ['2027-12-31', tokutei.id]);
const pAud = auditSheet.rows.slice(1).filter((r) => r[9] === 'PERSON' && r[10] === vp.id).slice(-1)[0];
eq([JSON.parse(pAud[12]).han_luu_tru, JSON.parse(pAud[13]).han_luu_tru], ['2026-12-31', '2027-12-31']);
// Hồ sơ cũ hơn được cấp với hạn ngắn hơn → không ghi đè hạn mới; 認定 không đụng tới người.
app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'henko', trang_thai: 'duoc_cap', ngay_nop: '2026-01-01', ngay_ket_qua: '2026-02-01', han_moi: '2027-01-31' });
app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'nintei', trang_thai: 'duoc_cap', ngay_nop: '2026-01-01', ngay_ket_qua: '2026-02-01', han_moi: '2029-01-31' });
assert.strictEqual(app.listRecords('PERSON').find((x) => x.id === vp.id).han_luu_tru, '2027-12-31');
// ---- Bước 6.3: checklist giấy tờ (D-065) ----
const giayTo = app.listRecords('LOOKUP').filter((x) => x.loai === 'giay_to');
assert.strictEqual(giayTo.length, 12);
const docsOf = (caseId) => app.listRecords('CASE_DOCUMENT').filter((d) => d.case_id === caseId && !d.da_an);
eq(docsOf(vc.id).map((d) => [d.giay_to, d.trang_thai]), giayTo.map((x) => [x.id, 'chua_co']), 'chưa có mẫu → đủ danh mục giấy tờ');
// Mẫu riêng cho 更新: 2 giấy tờ; mẫu của thủ tục khác giữ mặc định.
const tpl0 = app.getChecklistTemplates();
eq([tpl0.koshin.custom, tpl0.koshin.ids.length, tpl0.koshin.sua_luc], [false, 12, '']);
vErr(() => app.saveChecklistTemplate('sai', [], ''), 'loai_thu_tuc', 'invalidChoice');
vErr(() => app.saveChecklistTemplate('koshin', ['khong-co'], ''), 'giay_to', 'invalidChoice');
const tpl1 = app.saveChecklistTemplate('koshin', [giayTo[2].id, giayTo[0].id, giayTo[2].id], '');
eq([tpl1.custom, tpl1.ids], [true, [giayTo[2].id, giayTo[0].id]], 'bỏ trùng, giữ thứ tự');
assert.throws(() => app.saveChecklistTemplate('koshin', [], ''), /CONFLICT/);
assert.strictEqual(app.getChecklistTemplates().henko.ids.length, 12);
const vc4 = app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'koshin' });
eq(docsOf(vc4.id).map((d) => d.giay_to), [giayTo[2].id, giayTo[0].id]);
// Mẫu rỗng → hồ sơ mới không có checklist; thêm tay 1 giấy tờ; đánh dấu đã nhận; bỏ khỏi checklist = ẩn.
app.saveChecklistTemplate('khac', [], '');
const vc5 = app.createRecord('IMMIGRATION_CASE', { person_id: vp.id, loai_thu_tuc: 'khac' });
assert.strictEqual(docsOf(vc5.id).length, 0);
vErr(() => app.createRecord('CASE_DOCUMENT', { case_id: 'khong-co', giay_to: giayTo[1].id }), 'case_id', 'invalidChoice');
vErr(() => app.createRecord('CASE_DOCUMENT', { case_id: vc5.id, giay_to: vn.id }), 'giay_to', 'invalidChoice');
const cd = app.createRecord('CASE_DOCUMENT', { case_id: vc5.id, giay_to: giayTo[1].id });
vErr(() => app.updateRecord('CASE_DOCUMENT', cd.id, { trang_thai: 'xong' }, cd.sua_luc), 'trang_thai', 'invalidChoice');
const cd2 = app.updateRecord('CASE_DOCUMENT', cd.id, { trang_thai: 'da_nhan', ngay_nhan: '2026-10-19', giay_to: giayTo[3].id, ghi_chu: 'Bản giả' }, cd.sua_luc);
eq([cd2.trang_thai, cd2.ngay_nhan, cd2.giay_to], ['da_nhan', '2026-10-19', giayTo[1].id], 'không đổi loại giấy tờ của dòng');
app.setHidden('CASE_DOCUMENT', cd.id, true, cd2.sua_luc);
assert.strictEqual(docsOf(vc5.id).length, 0);
// ---- Bước 6.4: tải tệp giấy tờ (D-067) ----
const pdf = Buffer.concat([Buffer.from('%PDF-1.4 '), Buffer.from('giả')]).toString('base64');
const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 1, 2, 3]).toString('base64');
const doc0 = docsOf(vc.id)[0];
vErr(() => app.uploadCaseFile(doc0.id, { name: '', mime: 'application/pdf', base64: pdf }), 'ten_file', 'required');
vErr(() => app.uploadCaseFile(doc0.id, { name: 'a.exe', mime: 'application/x-msdownload', base64: pdf }), 'ten_file', 'fileType');
vErr(() => app.uploadCaseFile(doc0.id, { name: 'gia.pdf', mime: 'application/pdf', base64: png }), 'ten_file', 'fileType', 'đuôi PDF nhưng nội dung không phải PDF');
vErr(() => app.uploadCaseFile(doc0.id, { name: 'to.pdf', mime: 'application/pdf', base64: Buffer.alloc(10 * 1024 * 1024 + 1, 0x25).toString('base64') }), 'ten_file', 'fileSize');
assert.throws(() => app.uploadCaseFile('khong-co', { name: 'a.pdf', mime: 'application/pdf', base64: pdf }), /NOT_FOUND/);
const fl = app.uploadCaseFile(doc0.id, { name: 'ho_chieu_gia.pdf', mime: 'application/pdf', base64: pdf });
eq([fl.ma, fl.doi_tuong_id, fl.loai_giay_to, fl.ten_file, fl.kich_thuoc, fl.drive_file_id], ['FL-0001', doc0.id, doc0.giay_to, 'ho_chieu_gia.pdf', '14', undefined]);
const fl2 = app.uploadCaseFile(doc0.id, { name: 'anh.png', mime: 'image/png', base64: png });
// Lưu trong thư mục con theo mã người, dưới HR_FILES_TEST; tên tệp kèm mã hồ sơ; không tạo trùng thư mục.
const driveFiles = Object.values(g.items).filter((x) => x.kind === 'file' && x.bytes);
eq(driveFiles.map((x) => [x.name, x.parent.name, x.parent.parent.name]), [['VS-0001_ho_chieu_gia.pdf', vp.ma, 'HR_FILES_TEST'], ['VS-0001_anh.png', vp.ma, 'HR_FILES_TEST']]);
assert(!app.listRecords('FILE').some((x) => 'drive_file_id' in x), 'không gửi drive_file_id về trình duyệt');
assert.throws(() => app.createRecord('FILE', { ten_file: 'x', drive_file_id: 'y' }), /UNKNOWN_TABLE/);
assert.match(app.getFileLink(fl.id).url, /^https:\/\/drive\/file\//);
assert(auditSheet.rows.slice(1).some((r) => r[9] === 'FILE' && r[10] === fl.id && r[11] === 'xem_file'), 'mở tệp có nhật ký');
app.setHidden('FILE', fl2.id, true, fl2.sua_luc);
assert.throws(() => app.getFileLink(fl2.id), /NOT_FOUND/);
assert(driveFiles[1].trashed === false, 'ẩn trong app, tệp Drive vẫn giữ');
assert.strictEqual(app.setHidden('IMMIGRATION_CASE', vc.id, true, vc3.sua_luc).da_an, 'Y');
assert.throws(() => app.uploadCaseFile(doc0.id, { name: 'a.pdf', mime: 'application/pdf', base64: pdf }), /NOT_FOUND/, 'hồ sơ đã ẩn');
vErr(() => app.createRecord('CASE_DOCUMENT', { case_id: vc.id, giay_to: giayTo[1].id }), 'case_id', 'invalidChoice');

// ---- Bước 7.2: nhật ký hỗ trợ (D-068) ----
vErr(() => app.createRecord('SUPPORT_LOG', { person_id: vp.id, ngay: '2026-11-01', noi_dung: 'x' }), 'loai_ho_tro', 'required');
vErr(() => app.createRecord('SUPPORT_LOG', { person_id: vp.id, loai_ho_tro: 'abc', ngay: '2026-11-01', noi_dung: 'x' }), 'loai_ho_tro', 'invalidChoice');
vErr(() => app.createRecord('SUPPORT_LOG', { person_id: vp.id, loai_ho_tro: 'dinh_ky', noi_dung: 'x' }), 'ngay', 'required');
vErr(() => app.createRecord('SUPPORT_LOG', { person_id: vp.id, loai_ho_tro: 'dinh_ky', ngay: '2026-11-01' }), 'noi_dung', 'required');
vErr(() => app.createRecord('SUPPORT_LOG', { person_id: vp.id, loai_ho_tro: 'dinh_ky', ngay: '2026-11-01', noi_dung: 'x', hinh_thuc: 'bay' }), 'hinh_thuc', 'invalidChoice');
// Lần vào làm của người khác → bị chặn.
vErr(() => app.createRecord('SUPPORT_LOG', { person_id: vp.id, employment_id: st1.employment.id, loai_ho_tro: 'dinh_ky', ngay: '2026-11-01', noi_dung: 'x' }), 'employment_id', 'invalidChoice');
const hl = app.createRecord('SUPPORT_LOG', { person_id: w1.id, employment_id: st1.employment.id, loai_ho_tro: 'dinh_ky', ngay: '2026-11-01', hinh_thuc: 'truc_tiep', staff_id: recruiter.id, noi_dung: 'Gặp định kỳ giả' });
eq([hl.ma, hl.loai_ho_tro], ['HT-0001', 'dinh_ky']);
const hl2 = app.updateRecord('SUPPORT_LOG', hl.id, { person_id: vp.id, noi_dung: 'Sửa giả' }, hl.sua_luc);
eq([hl2.person_id, hl2.noi_dung], [w1.id, 'Sửa giả']);
assert.strictEqual(app.setHidden('SUPPORT_LOG', hl.id, true, hl2.sua_luc).da_an, 'Y');

// Che số giấy tờ trong nhật ký.
eq(app.mask_({ so_ho_chieu: 'C1234567', ho_ten: 'A', so_zairyu_card: '' }), { so_ho_chieu: '***', ho_ten: 'A', so_zairyu_card: '' });

// Lỗi tạm của Google khi đọc Script Properties ("…サーバーエラー… INTERNAL") → thử lại; lỗi khác hoặc quá 4 lần → báo luôn.
let tries = 0;
eq(app.retryStorage_(() => { if (++tries < 3) throw new Error('ストレージからの読み取り中にサーバーエラーが発生しました。エラーコード: INTERNAL。'); return 'ok'; }), 'ok');
eq(tries, 3);
tries = 0;
assert.throws(() => app.retryStorage_(() => { tries++; throw new Error('INTERNAL'); }), /INTERNAL/);
eq(tries, 4);
tries = 0;
assert.throws(() => app.retryStorage_(() => { tries++; throw new Error('FORBIDDEN'); }), /FORBIDDEN/);
eq(tries, 1);

console.log('OK — kiểm tra Repo.gs đạt');
