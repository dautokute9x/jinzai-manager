// Kiểm tra 9a (môi trường thật, nhập CSV) và 9b (xuất dữ liệu) trên Drive/Sheets giả lập.
// Chạy: node tests/import.test.js
const assert = require('assert');
const vm = require('vm');
const { makeGoogle, load, eq } = require('./fakes');
const FILES = ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs', 'Import.gs', 'Export.gs'];
const vCode = (r) => r.error && r.error.field + ':' + r.error.code;

// ---- Môi trường: mặc định TEST; setProdEnv từ chối dự án đã có dữ liệu thử; dự án mới → PROD, tên file không có _TEST ----
const g = makeGoogle();
let app = load(g, FILES);
assert.strictEqual(vm.runInContext('ENV', app), 'TEST');
app.initTestData();
assert.throws(() => app.setProdEnv(), /dự án Apps Script MỚI/);
const gp = makeGoogle();
const prod0 = load(gp, FILES);
assert.match(prod0.setProdEnv(), /PROD/);
const prod = load(gp, FILES); // lần chạy sau đọc lại APP_ENV
assert.strictEqual(vm.runInContext('ENV', prod), 'PROD');
prod.initTestData();
const names = Object.values(gp.items).map((x) => x.name);
assert(names.includes('HR_DATA') && names.includes('HR_SENSITIVE') && names.includes('HR Tokutei') && names.includes('HR_FILES'));
assert(!names.some((n) => /_TEST$/.test(n)), 'bản thật không có file _TEST');
assert.strictEqual(gp.props.PROD_DATA_ID !== undefined, true);
assert.match(prod.setProdEnv(), /Đã là/);

// ---- Nhập CSV (bản thử nghiệm) ----
g.clock.now = '2026-10-20 10:00:00';
const fields = app.getImportFields();
assert(fields.PERSON.includes('so_ho_chieu') && fields.COMPANY.includes('sales_staff_id'));
assert.throws(() => app.importRows('INVOICE', [], true), /UNKNOWN_TABLE/);
assert.throws(() => app.importRows('STAFF', new Array(101).fill({ ho_ten: 'x' }), true), /"code":"tooMany"/);
// Nhân viên
const st = app.importRows('STAFF', [{ ho_ten: 'Nguyễn Giả A' }, { ho_ten: 'Lê Giả C', trang_thai: 'da_nghi' }, { ho_ten: '' }], false);
eq([st.created, st.results.map((r) => r.ok), vCode(st.results[2])], [2, [true, true, false], 'ho_ten:required']);
eq(st.results.map((r) => r.ma || ''), ['STF-0001', 'STF-0002', '']);
// Công ty: nhân viên theo tên (nhiều người), lĩnh vực theo tên VI hoặc JA; tên không có → báo dòng nào, giá trị nào.
const dry = app.importRows('COMPANY', [
  { ten_phap_nhan: '株式会社テスト', sales_staff_id: 'nguyen gia a', support_staff_id: 'Nguyễn Giả A, Lê Giả C', linh_vuc: '介護、Xây dựng', trang_thai: 'dang_giao_dich' },
  { ten_phap_nhan: 'Công ty Lỗi', sales_staff_id: 'Không Có Ai' },
  { ten_phap_nhan: 'Công ty Lỗi 2', linh_vuc: 'Không có lĩnh vực' }], true);
eq(dry.results.map((r) => [r.ok, vCode(r), r.error && r.error.ma]), [[true, undefined, undefined], [false, 'sales_staff_id:notFound', 'Không Có Ai'], [false, 'linh_vuc:notFound', 'Không có lĩnh vực']]);
assert.strictEqual(dry.created, 0);
assert.strictEqual(app.listRecords('COMPANY').length, 0, 'kiểm tra thử không ghi gì');
// Dữ liệu cũ: nhân viên đã nghỉ (Lê Giả C) vẫn nhận; tỉnh sai → lỗi.
const co = app.importRows('COMPANY', [{ ten_phap_nhan: '株式会社テスト', ten_viet_tat: 'Test', sales_staff_id: 'nguyen gia a', support_staff_id: 'Lê Giả C', linh_vuc: '介護、Xây dựng' },
  { ten_phap_nhan: 'Công ty Giả B', ma_buu_dien: '4600000', tinh_thanh: '愛知県', sales_staff_id: 'STF-0001' },
  { ten_phap_nhan: 'Công ty Giả C', tinh_thanh: 'Aichi' }], false);
eq([co.created, co.results.map((r) => r.ma || vCode(r))], [2, ['CO-0001', 'CO-0002', 'tinh_thanh:invalidChoice']]);
eq(app.listRecords('COMPANY')[0].support_staff_id, app.listRecords('STAFF')[1].id);
// Liên hệ + đơn tuyển: công ty theo mã / tên / viết tắt; ngày nhiều dạng; số lượng "3名".
const ct = app.importRows('CONTACT', [{ company_id: 'test', ho_ten: 'Liên hệ Giả', lien_he_chinh: 'Y' }, { company_id: 'CO-9999', ho_ten: 'x' }], false);
eq([ct.created, vCode(ct.results[1])], [1, 'company_id:notFound']);
const jo = app.importRows('JOB_ORDER', [
  { company_id: 'CO-0001', vi_tri: 'Điều dưỡng', so_luong_can: '3名', linh_vuc: '介護', ngay_nhan_don: '2026/9/1', ngay_du_kien_vao_lam: '2026年12月1日' },
  { company_id: 'CO-0002', vi_tri: 'Sai lĩnh vực', so_luong_can: '1', linh_vuc: 'Xây dựng' }], false);
eq([jo.created, vCode(jo.results[1])], [1, 'linh_vuc:invalidChoice']);
const j1 = app.listRecords('JOB_ORDER')[0];
eq([j1.so_luong_can, j1.ngay_nhan_don, j1.ngay_du_kien_vao_lam], ['3', '2026-09-01', '2026-12-01']);
// Con người: danh mục theo tên, số giấy tờ vào file nhạy cảm, trùng (với dữ liệu cũ và trong cùng lô) bị từ chối.
const pe = app.importRows('PERSON', [
  { ho_ten_latin: 'Gia Mot', ngay_sinh: '2000/1/2', quoc_tich: 'Việt Nam', tieng_nhat: 'N3', recruiter_staff_id: 'Nguyễn Giả A', so_ho_chieu: 'c 1234567', nguoi_gioi_thieu: 'GT Giả' },
  { ho_ten_latin: 'GIA MOT', ngay_sinh: '2000-01-02', quoc_tich: 'ベトナム' },
  { ho_ten_latin: 'Gia Hai', ngay_sinh: '1999-05-05', quoc_tich: 'Việt Nam', so_ho_chieu: 'C1234567' },
  { ho_ten_latin: 'Gia Ba', ngay_sinh: '1999-13-05', quoc_tich: 'Việt Nam' }], false);
eq([pe.created, pe.results.map(vCode)], [1, [undefined, 'ho_ten_latin:duplicate', 'ho_ten_latin:duplicate', 'ngay_sinh:invalidFormat']]);
eq([pe.results[1].error.ma, pe.results[2].error.ma], ['(dòng 2)', '(dòng 2)'], 'báo đúng dòng CSV bị trùng (dòng 1 = tiêu đề)');
const p1 = app.listRecords('PERSON')[0];
eq([p1.ngay_sinh, p1.nguoi_gioi_thieu, p1.trang_thai_sang_loc], ['2000-01-02', 'GT Giả', 'moi_nhan']);
eq(app.getPersonDocs(p1.id, true).so_ho_chieu, 'C1234567');
assert(!JSON.stringify(app.listRecords('PERSON')).includes('C1234567'));
const off = app.importRows('PERSON', [{ ho_ten_latin: 'Lo Hai', ngay_sinh: '2001-02-02', quoc_tich: 'Việt Nam' }, { ho_ten_latin: 'LO HAI', ngay_sinh: '2001-02-02', quoc_tich: 'Việt Nam' }], true, 100);
eq(off.results[1].error.ma, '(dòng 102)', 'lô thứ 2: báo đúng dòng CSV');
const again = app.importRows('PERSON', [{ ho_ten_latin: 'Gia Moi', ngay_sinh: '2001-01-01', quoc_tich: 'Việt Nam', so_ho_chieu: 'C1234567' }], true);
eq(vCode(again.results[0]), 'ho_ten_latin:duplicate', 'trùng số hộ chiếu với người đã có');
const data = Object.values(g.items).find((x) => x.name === 'HR_DATA_TEST');
const aud = data.getSheetByName('AUDIT_LOG').rows.slice(1);
assert(aud.some((r) => r[9] === 'PERSON' && r[11] === 'tao'), 'nhập có nhật ký');
assert(!aud.some((r) => String(r[13]).includes('C1234567')), 'nhật ký không ghi số');

// ---- Xuất dữ liệu ----
assert.throws(() => app.exportData('sensitive', {}), /"code":"invalidChoice"/);
assert.throws(() => app.exportData('sales', { month: '2026-13' }), /"code":"invalidFormat"/);
const ex = app.exportData('people', {});
assert.match(ex.name, /^HR_EXPORT_people_202610201000$/);
assert.strictEqual(ex.rows, 1);
const file = Object.values(g.items).find((x) => x.name === ex.name);
assert.strictEqual(file.parent.name, 'HR Tokutei (TEST)');
const sh = file.getSheets()[0];
assert.strictEqual(sh.rows[0][0], 'Mã / コード');
eq(sh.rows[1].slice(0, 6), [p1.ma, 'Gia Mot', '', '2000-01-02', '', 'Việt Nam / ベトナム']);
assert(!JSON.stringify(sh.rows).includes('C1234567'), 'không xuất số giấy tờ');
['companies', 'jobs', 'applications', 'working', 'invoices'].forEach((k) => assert(app.exportData(k, {}).url));
// Cột chữ để dạng văn bản thuần (công thức không chạy, số 0 đầu giữ nguyên).
assert(sh.textRows.has(2), 'dòng dữ liệu cột chữ định dạng @');
assert.strictEqual(app.exportData('sales', { month: '2026-10' }).rows, 0);
assert(data.getSheetByName('AUDIT_LOG').rows.slice(1).some((r) => r[11] === 'xuat'));

console.log('OK — kiểm tra nhập / xuất / môi trường (9a, 9b) đạt');
