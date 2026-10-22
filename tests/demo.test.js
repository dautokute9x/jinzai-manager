// Kiểm tra nút "Tạo dữ liệu mẫu" (Demo.gs): chạy hết các phần, dữ liệu đi qua đúng các hàm lưu, các màn hình có dữ liệu để thử.
// Chạy: node tests/demo.test.js
const assert = require('assert');
const vm = require('vm');
const { makeGoogle, load, eq } = require('./fakes');
const FILES = ['Code.gs', 'Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs', 'Import.gs', 'Export.gs', 'Auth.gs', 'Demo.gs'];

const g = makeGoogle();
const app = load(g, FILES);
g.clock.now = '2026-10-21 10:00:00';
assert.throws(() => app.seedDemoData(), /NOT_INITIALIZED/, 'chưa Khởi tạo');
app.initTestData();
g.session.active = '';
assert.throws(() => app.seedDemoData(), /FORBIDDEN/, 'chỉ chủ');
g.session.active = 'owner@example.test';
let r; let calls = 0;
do { r = app.seedDemoData(); calls++; } while (!r.done && calls < 20);
assert(r.done && r.i === r.total, 'chạy hết');
assert.throws(() => app.seedDemoData(), /DEMO_DONE/, 'không tạo lại lần 2');

const n = (t) => app.listRecords(t).length;
eq([n('STAFF'), n('COMPANY'), n('CONTACT'), n('CONTRACT'), n('JOB_ORDER'), n('PERSON'), n('APPLICATION'), n('EMPLOYMENT'), n('IMMIGRATION_CASE'), n('SUPPORT_LOG'), n('REFERRER_PAYOUT')],
  [5, 6, 8, 6, 8, 24, 21, 8, 5, 6, 1]);
eq([n('MENDAN'), n('INCIDENT'), n('INCIDENT_LOG')], [2, 2, 1]); // GĐ 11.3–11.4
eq(app.listRecords('INCIDENT')[0].mendan_id, app.listRecords('MENDAN')[0].id);
const apps = app.listRecords('APPLICATION');
const st = {}; apps.forEach((a) => { st[a.trang_thai_hien_tai] = (st[a.trang_thai_hien_tai] || 0) + 1; });
eq(st, { da_vao_lam: 8, da_gui: 3, cho_pv: 3, da_pv: 1, naitei: 1, naitei_shodaku: 1, truot: 1, uv_tu_choi: 1, tam_dung: 1, cty_tu_choi: 1 });
assert.strictEqual(app.listRecords('EMPLOYMENT').filter((e) => e.ngay_nghi).length, 2);
// Visa được cấp → hạn lưu trú của LE VAN NAM tự cập nhật.
const nam = app.listRecords('PERSON').find((p) => p.ho_ten_latin === 'LE VAN NAM');
eq(nam.han_luu_tru, '2027-06-18');
assert.strictEqual(app.getPersonDocs(nam.id, true).so_ho_chieu, 'C0000103');
assert(app.listRecords('PERSON').find((p) => p.ho_ten_latin === 'TRINH VAN SON').da_an, 'có 1 hồ sơ bị ẩn');
assert(app.listRecords('CASE_DOCUMENT').some((d) => d.trang_thai === 'da_kiem_tra'));
// Việc cần làm có đủ loại để thử.
const rules = new Set(app.getTasks({}).tasks.map((t) => t.rule));
['iv_soon', 'iv_no_result', 'sent_stale', 'status_stale', 'shodaku_no_date', 'start_soon', 'visa_expiry', 'passport_expiry', 'case_stale', 'invoice_overdue', 'revenue_todo', 'support_due']
  .forEach((k) => assert(rules.has(k), 'thiếu việc: ' + k));
// Doanh số: có hoàn tiền (nghỉ sớm), có cọc / còn lại, còn khoản để lập.
const rev = app.listRecords('REVENUE');
['gioi_thieu', 'coc', 'con_lai', 'ho_tro', 'hoan', 'khac'].forEach((k) => assert(rev.some((x) => x.loai === k), 'thiếu doanh số ' + k));
assert(app.getRevenueTodo().length > 0);
const sales = app.getSales({ month: '2026-09' });
assert(sales.month && JSON.stringify(sales).length > 100);
// Hóa đơn: đã thu đủ, quá hạn thu một phần, nháp, đã hủy.
eq(app.listInvoices().map((i) => i.trang_thai).sort(), ['da_phat_hanh', 'da_phat_hanh', 'huy', 'nhap']);
eq(n('PAYMENT'), 2);
// Nhân viên đã nghỉ vẫn còn trong công ty (dữ liệu cũ).
const em = app.listRecords('STAFF').find((s) => s.ho_ten === 'Mẫu Hoàng Đức Em');
assert(em.trang_thai === 'da_nghi' && app.listRecords('COMPANY')[0].support_staff_id.includes(em.id));
// Dữ liệu giả: email example.com, không có email thật nào.
const data = Object.values(g.items).find((x) => x.name === 'HR_DATA_TEST');
assert(!/@(?!example\.(com|test))[a-z0-9.-]+\.[a-z]/i.test(JSON.stringify(data.getSheetByName('PERSON').rows.concat(data.getSheetByName('CONTACT').rows))));

// Chạy theo từng phần (mỗi lần gọi hết giờ giữa chừng) → làm tiếp đúng chỗ, không thừa bản ghi.
const g2 = makeGoogle();
const app2 = load(g2, FILES);
g2.clock.now = '2026-10-21 10:00:00';
app2.initTestData();
vm.runInContext('(() => { let t = 0; Date.now = () => (t += 100000); })()', app2); // mỗi việc "tốn" 100 giây
let r2; let calls2 = 0;
do { r2 = app2.seedDemoData(); calls2++; } while (!r2.done && calls2 < 200);
assert(r2.done && calls2 > 20, 'đã chia nhiều lần gọi: ' + calls2);
eq(['PERSON', 'APPLICATION', 'REVENUE', 'INVOICE'].map((t) => app2.listRecords(t).length), ['PERSON', 'APPLICATION', 'REVENUE', 'INVOICE'].map(n));

// Bản thật: từ chối.
const gp = makeGoogle(); gp.props.APP_ENV = 'PROD';
const prod = load(gp, FILES);
assert.strictEqual(vm.runInContext('ENV', prod), 'PROD');
prod.initTestData();
assert.throws(() => prod.seedDemoData(), /DEMO_TEST_ONLY/);
console.log('OK — kiểm tra tạo dữ liệu mẫu đạt (' + calls + ' lần gọi, ' + r.total + ' phần)');
