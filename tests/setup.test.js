// Kiểm tra logic khởi tạo (Setup.gs) bằng Drive/Sheets giả lập — không chạm Google thật.
// Chạy: node tests/setup.test.js
const assert = require('assert');
const { makeGoogle, load: loadFiles, eq } = require('./fakes');
const load = (g) => loadFiles(g, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs']);

const g = makeGoogle();
const app = load(g);
const byName = (n) => Object.values(g.items).find((x) => x.name === n);

// 1. Lần đầu: tạo đủ 2 thư mục, 2 file, 15 + _META tab, file nhạy cảm 1 tab; tab mặc định bị bỏ.
let r = app.initTestData();
assert.strictEqual(r.initialized, true);
assert.strictEqual(r.schemaVersion, 18);
eq(r.upgraded, []);
assert.strictEqual(r.safetyBackup, null, 'file mới thì không cần sao lưu trước');
assert.strictEqual(r.seeded, 75, 'nạp sẵn 19 lĩnh vực + 13 quốc tịch + 12 tư cách lưu trú + 7 tiếng Nhật + 6 nguồn + 6 lý do nghỉ + 12 giấy tờ');
const data = byName('HR_DATA_TEST');
const sens = byName('HR_SENSITIVE_TEST');
assert.strictEqual(data.sheets.length, 31);
assert.strictEqual(data.getSheetByName('LOOKUP').rows[1][9], '介護');
eq(sens.sheets.map((s) => s.name), ['PERSON_SENSITIVE']);
assert(!data.getSheetByName('Sheet1'));
assert.strictEqual(data.parent, byName('HR Tokutei (TEST)'));
assert.strictEqual(byName('HR_FILES_TEST').parent, byName('HR Tokutei (TEST)'));
eq(data.getSheetByName('PERSON').rows[0].slice(0, 8), ['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'ho_ten_latin']);
assert.strictEqual(data.getSheetByName('PERSON').frozen, 1);
assert(!data.getSheetByName('PERSON_SENSITIVE'), 'số giấy tờ không được nằm ở file chính');
assert.strictEqual(r.warnings.length, 0);

// 2. Bấm lần hai: không tạo gì thêm.
const count = Object.keys(g.items).length;
r = app.initTestData();
eq(r.created, []);
assert.strictEqual(r.seeded, 0, 'không nạp lại danh mục');
assert.strictEqual(data.getSheetByName('LOOKUP').rows.length, 76);
assert.strictEqual(Object.keys(g.items).length, count);

// 3. Có dữ liệu + xóa 1 tab: chỉ tab đó được tạo lại, dữ liệu tab khác giữ nguyên.
data.getSheetByName('STAFF').rows.push(['x1', 'STF-0001']);
data.sheets = data.sheets.filter((s) => s.name !== 'TEAM');
r = app.initTestData();
eq(r.created, ['HR_DATA_TEST › TEAM']);
eq(data.getSheetByName('STAFF').rows[1], ['x1', 'STF-0001']);

// 4. Tiêu đề bị sửa tay: chỉ cảnh báo, không ghi đè.
data.getSheetByName('COMPANY').rows[0][7] = 'ten_cong_ty';
r = app.initTestData();
eq(r.warnings, ['HR_DATA_TEST › COMPANY']);
assert.strictEqual(data.getSheetByName('COMPANY').rows[0][7], 'ten_cong_ty');

// 5. File chính bị đưa vào thùng rác: dừng với lỗi rõ ràng, không tự tạo file mới.
data.trashed = true;
assert.throws(() => app.initTestData(), /MISSING_FILE\|HR_DATA_TEST/);
assert.strictEqual(Object.values(g.items).filter((x) => x.name === 'HR_DATA_TEST').length, 1);

// 6. Chưa khởi tạo: trạng thái báo chưa có, không tạo gì.
const g2 = makeGoogle();
const s2 = load(g2).getSetupStatus();
assert.strictEqual(s2.initialized, false);
assert.strictEqual(Object.keys(g2.items).length, 0);

// 7. Bảo vệ "chỉ cảnh báo" (D-016): mọi tab đều có, chạy lại không gắn trùng.
assert(data.sheets.every((s) => s.protections.length === 1 && s.protections[0].warningOnly));
assert(sens.sheets.every((s) => s.protections.length === 1));
data.trashed = false;
assert.strictEqual(app.initTestData().protectedCount, 0);

// 8. Nâng cấp từ cấu trúc cũ (bước 2.1 → 3.4): sao lưu trước, nối cột mới vào cuối, dữ liệu cũ giữ nguyên, phiên bản 2.
const g3 = makeGoogle();
const app3 = load(g3);
app3.initTestData();
const d3 = Object.values(g3.items).find((x) => x.name === 'HR_DATA_TEST');
const co = d3.getSheetByName('COMPANY');
const oldHeader = ['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'ten_phap_nhan', 'sales_staff_id', 'support_staff_id'];
co.rows = [oldHeader.slice(), ['c1', 'CO-0001', '', '', '', '', '', 'Công ty Giả A', '', '']];
const ct = d3.getSheetByName('CONTACT');
ct.rows = [['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'company_id', 'ho_ten'], ['k1', 'CT-0001', '', '', '', '', '', 'c1', 'Người Giả']];
const pe = d3.getSheetByName('PERSON');
pe.rows = [['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'ho_ten_latin', 'ho_ten_katakana', 'ngay_sinh', 'quoc_tich', 'trang_thai_sang_loc', 'recruiter_staff_id', 'han_ho_chieu', 'han_luu_tru']];
const ap = d3.getSheetByName('APPLICATION');
ap.rows = [['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'person_id', 'job_id', 'ngay_gui', 'trang_thai_hien_tai', 'recruiter_staff_id']];
const iv = d3.getSheetByName('INTERVIEW');
iv.rows = [['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'application_id', 'thoi_gian', 'hinh_thuc', 'ket_qua']];
const em = d3.getSheetByName('EMPLOYMENT');
em.rows = [['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'person_id', 'company_id', 'job_id', 'application_id', 'ngay_vao_lam', 'ngay_nghi', 'ly_do_nghi']];
const jo = d3.getSheetByName('JOB_ORDER');
jo.rows = [['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'company_id', 'vi_tri', 'so_luong_can', 'phu_trach_staff_id', 'trang_thai_don']];
const fl = d3.getSheetByName('FILE');
fl.rows = [['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an', 'loai_doi_tuong', 'doi_tuong_id', 'drive_file_id', 'loai_giay_to']];
d3.getSheetByName('_META').rows[1][1] = 1;
const r3 = app3.initTestData();
eq(r3.upgraded, ['HR_DATA_TEST › COMPANY', 'HR_DATA_TEST › CONTACT', 'HR_DATA_TEST › JOB_ORDER', 'HR_DATA_TEST › PERSON', 'HR_DATA_TEST › APPLICATION', 'HR_DATA_TEST › INTERVIEW', 'HR_DATA_TEST › EMPLOYMENT', 'HR_DATA_TEST › FILE']);
eq(fl.rows[0].slice(-3), ['ten_file', 'mime', 'kich_thuoc']);
eq(em.rows[0].slice(-4), ['ly_do_nghi', 'ghi_chu', 'tinh_trang', 'ho_tro']);
eq(iv.rows[0].slice(-2), ['ly_do', 'ghi_chu']);
eq(ap.rows[0].slice(-2), ['ngay_trang_thai', 'ghi_chu']);
eq(pe.rows[0].slice(-4), ['ghi_chu', 'nguoi_gioi_thieu', 'cs_staff_id', 'giay_to_staff_id']);
eq(jo.rows[0].slice(-2), ['ngay_du_kien_vao_lam', 'ghi_chu']);
eq(ct.rows[0].slice(-2), ['lien_he_chinh', 'ghi_chu']);
eq(ct.rows[1], ['k1', 'CT-0001', '', '', '', '', '', 'c1', 'Người Giả']);
assert.match(r3.safetyBackup, /__pre-upgrade$/);
assert(Object.values(g3.items).some((x) => x.name === 'HR_DATA_TEST__' + r3.safetyBackup && x.getSheetByName('COMPANY').rows[0].length === 10), 'bản sao lưu giữ cấu trúc cũ');
assert(Object.values(g3.items).some((x) => x.name === 'HR_SENSITIVE_TEST__' + r3.safetyBackup), 'sao lưu cả cặp');
eq(co.rows[0].slice(-6), ['linh_vuc', 'trang_thai', 'ghi_chu', 'phap_nhan_so', 'ten_co_so', 'nganh_nghe']);
eq(co.rows[1], ['c1', 'CO-0001', '', '', '', '', '', 'Công ty Giả A', '', '']);
assert.strictEqual(r3.schemaVersion, 18);
eq(r3.warnings, []);
// Bấm lại: không nâng cấp, không sao lưu thêm.
const r3b = app3.initTestData();
eq(r3b.upgraded, []);
assert.strictEqual(r3b.safetyBackup, null);
// Tiêu đề khác kiểu (không phải phần đầu): chỉ cảnh báo, không đổi phiên bản.
co.rows[0] = ['id', 'ma', 'khac'];
d3.getSheetByName('_META').rows[1][1] = 1;
const r3c = app3.initTestData();
eq(r3c.warnings, ['HR_DATA_TEST › COMPANY']);
eq(r3c.upgraded, []);
assert.strictEqual(r3c.schemaVersion, 1, 'còn cảnh báo thì không ghi phiên bản mới');

// Lần Khởi tạo trước còn giữ khóa → báo BUSY (thông báo dễ hiểu), không phải lỗi tiếng Nhật của Google.
{
  const gb = makeGoogle(); const ab = load(gb, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs']);
  ab.initTestData(); gb.lock.busy = true;
  assert.throws(() => ab.initTestData(), /BUSY/);
  assert.throws(() => ab.createRecord('STAFF', { ho_ten: 'x' }), /BUSY/);
  gb.lock.busy = false;
}
console.log('OK — 8 nhóm kiểm tra Setup.gs đạt');
