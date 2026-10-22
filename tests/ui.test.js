// Kiểm tra giao diện ngoài Apps Script (không thay cho test trên link /dev).
// Chạy: npm install jsdom --no-save && node tests/ui.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
// Apps Script không cho 2 file trùng tên (kể cả .gs và .html, vd. Backup.gs + Backup.html).
const srcNames = fs.readdirSync(path.join(__dirname, '..', 'src')).filter((f) => /\.(gs|html)$/.test(f)).map((f) => f.replace(/\.(gs|html)$/, ''));
assert.strictEqual(new Set(srcNames).size, srcNames.length, 'trùng tên file trong src/: ' + srcNames.join(', '));
// Danh sách lựa chọn lấy đúng từ Schema.gs như Code.gs truyền vào trang.
const vm = require('vm');
const eq = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
const schemaCtx = vm.createContext({});
vm.runInContext(src('Schema.gs'), schemaCtx);
const choices = JSON.parse(vm.runInContext('JSON.stringify(choices_())', schemaCtx));
// Giả lập phần template của Apps Script.
const html = src('Index.html')
  .replace("<?!= include('I18n'); ?>", src('I18n.html'))
  .replace("<?!= include('Staff'); ?>", src('Staff.html'))
  .replace("<?!= include('BackupUi'); ?>", src('BackupUi.html'))
  .replace("<?!= include('PerfUi'); ?>", src('PerfUi.html'))
  .replace("<?!= include('Company'); ?>", src('Company.html'))
  .replace("<?!= include('Lookup'); ?>", src('Lookup.html'))
  .replace("<?!= include('Contact'); ?>", src('Contact.html'))
  .replace("<?!= include('Jobs'); ?>", src('Jobs.html'))
  .replace("<?!= include('PersonUi'); ?>", src('PersonUi.html'))
  .replace("<?!= include('ApplicationUi'); ?>", src('ApplicationUi.html'))
  .replace("<?!= include('InterviewUi'); ?>", src('InterviewUi.html'))
  .replace("<?!= include('EmploymentUi'); ?>", src('EmploymentUi.html'))
  .replace("<?!= include('DashboardUi'); ?>", src('DashboardUi.html'))
  .replace("<?!= include('VisaUi'); ?>", src('VisaUi.html'))
  .replace("<?!= include('WorkingUi'); ?>", src('WorkingUi.html'))
  .replace("<?!= include('SupportUi'); ?>", src('SupportUi.html'))
  .replace("<?!= include('FinanceUi'); ?>", src('FinanceUi.html'))
  .replace("<?!= include('SalesUi'); ?>", src('SalesUi.html'))
  .replace("<?!= include('InvoiceUi'); ?>", src('InvoiceUi.html'))
  .replace("<?!= include('ImportUi'); ?>", src('ImportUi.html'))
  .replace("<?!= include('XlsxUi'); ?>", src('XlsxUi.html'))
  .replace("<?!= include('LegacyUi'); ?>", src('LegacyUi.html'))
  .replace(/<\?!= include\('(\w+)'\); \?>/g, (m, f) => src(f + '.html')) // file mới (GĐ 11) tự nạp
  .replace('<?!= choices ?>', JSON.stringify(choices))
  .replace("<? if (env !== 'PROD') { ?>", '').replace('<? } ?>', '')
  .replace('<?= schema ?>', '14')
  .replace('<?= appName ?>', 'HR Tokutei')
  .replace('<?= version ?>', '0.2.0');

function open(storage = {}, server = null, page = html, session = {}) {
  const dom = new JSDOM(page, {
    runScripts: 'dangerously',
    url: 'https://example.test/',
    beforeParse(w) {
      Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
      Object.entries(session).forEach(([k, v]) => w.sessionStorage.setItem(k, v));
      if (server) w.google = { script: { get run() { return fakeRun(server); } } };
    },
  });
  return dom.window;
}

// Giả lập google.script.run: gọi hàm server đồng bộ, lỗi thì gọi failure handler.
const NEW_TABLES = ['PERSON_DOC', 'PRE_ENTRY', 'PRE_TASK', 'MENDAN', 'INCIDENT', 'INCIDENT_LOG'];
function fakeRun(server) {
  const h = {};
  const run = {};
  // Hàm máy chủ chưa giả lập trong nhóm test này → coi như máy chủ báo lỗi (giống khi gọi sai tên trên Google).
  const proxy = new Proxy(run, { get: (o, k) => (k in o ? o[k] : () => h.fail(new Error('not mocked: ' + String(k)))) });
  run.withSuccessHandler = (f) => { h.ok = f; return proxy; };
  run.withFailureHandler = (f) => { h.fail = f; return proxy; };
  Object.keys(server).forEach((name) => { run[name] = (...args) => { try { h.ok(server[name](...args)); } catch (e) { h.fail(e); } }; });
  // Bảng mới (GĐ 11) mà nhóm test cũ chưa có dữ liệu giả → trả danh sách rỗng như máy chủ thật khi bảng trống.
  if (server.listRecords) {
    const orig = run.listRecords;
    run.listRecords = (table) => (NEW_TABLES.indexOf(table) >= 0 ? (() => { try { const r = server.listRecords(table); h.ok(r || []); } catch (e) { h.ok([]); } })() : orig(table));
  }
  return proxy;
}

const w = open();
const d = w.document;
const I18N = w.eval('I18N');

// 1. Hai ngôn ngữ có đủ cùng bộ khóa; mọi khóa dùng trong trang đều có chữ.
assert.deepStrictEqual(Object.keys(I18N.ja).sort(), Object.keys(I18N.vi).sort());
d.querySelectorAll('[data-i18n]').forEach((el) => assert(I18N.vi[el.dataset.i18n], el.dataset.i18n));
d.querySelectorAll('[data-page]').forEach((b) => assert(I18N.vi['soon.' + b.dataset.page], b.dataset.page));

// 2. Mặc định tiếng Việt, trang Tổng quan.
assert.strictEqual(d.documentElement.lang, 'vi');
assert.strictEqual(d.getElementById('pageTitle').textContent, 'Tổng quan');

// 3. Bấm menu Đơn tuyển → đổi trang, đánh dấu mục đang chọn.
d.querySelector('[data-page="jobs"]').click();
assert.strictEqual(d.getElementById('pageTitle').textContent, 'Đơn tuyển');
assert.strictEqual(d.querySelector('[aria-current="page"]').dataset.page, 'jobs');

// 4. Bấm 日本語 → toàn bộ nhãn đổi, lựa chọn được lưu.
d.querySelector('[data-lang="ja"]').click();
assert.strictEqual(d.getElementById('pageTitle').textContent, '求人');
assert.strictEqual(d.querySelector('[data-page="home"]').textContent, 'ダッシュボード');
assert.strictEqual(w.localStorage.getItem('hrTokutei.lang'), 'ja');

// 5. Mở lại với lựa chọn đã lưu → vẫn tiếng Nhật.
const w2 = open({ 'hrTokutei.lang': 'ja' });
assert.strictEqual(w2.document.getElementById('pageTitle').textContent, 'ダッシュボード');

// 6. Giá trị rác trong bộ nhớ → quay về tiếng Việt, không lỗi.
const w3 = open({ 'hrTokutei.lang': 'xx' });
assert.strictEqual(w3.document.documentElement.lang, 'vi');

// 7. Nút ☰ mở/đóng menu; chọn trang thì menu tự đóng.
d.getElementById('menuBtn').click();
assert(d.getElementById('nav').classList.contains('open'));
d.querySelector('[data-page="visa"]').click();
assert(!d.getElementById('nav').classList.contains('open'));

// 8. Đồng hồ hiển thị dạng YYYY-MM-DD HH:MM:SS.
assert.match(d.getElementById('clock').textContent, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

// 9. Trang Cài đặt: hiện trạng thái, bấm khởi tạo hiện kết quả, lỗi thùng rác hiện thông báo dễ hiểu.
let initialized = false;
const server = {
  getSetupStatus: () => ({ initialized, items: initialized ? [{ name: 'HR_DATA_TEST', url: 'https://x' }] : [], schemaVersion: initialized ? 1 : null }),
  initTestData: () => { initialized = true; return Object.assign(server.getSetupStatus(), { created: ['HR_DATA_TEST'], warnings: [] }); },
};
const w4 = open({}, server);
const d4 = w4.document;
d4.querySelector('[data-page="settings"]').click();
assert.match(d4.getElementById('pageBody').textContent, /Chưa khởi tạo/);
d4.querySelector('#pageBody button').click();
assert.match(d4.getElementById('pageBody').textContent, /Đã khởi tạo\. Phiên bản cấu trúc dữ liệu: 1/);
assert.match(d4.getElementById('pageBody').textContent, /Vừa tạo: HR_DATA_TEST/);
assert.strictEqual(d4.querySelector('#pageBody a').getAttribute('href'), 'https://x');
server.initTestData = () => { throw new Error('Exception: MISSING_FILE|HR_DATA_TEST'); };
d4.querySelector('[data-lang="ja"]').click();
d4.querySelector('#pageBody button').click();
assert.match(d4.getElementById('pageBody').textContent, /「HR_DATA_TEST」が見つからない/);

// 10. Không có google.script.run (mở ngoài Apps Script): báo lỗi, không treo nút.
d.querySelector('[data-lang="vi"]').click();
d.querySelector('[data-page="settings"]').click();
assert.match(d.getElementById('pageBody').textContent, /Lỗi: google\.script\.run unavailable/);
assert.strictEqual(d.querySelector('#pageBody button').disabled, false);

// 11. Nhân viên: danh sách, thêm, lỗi kiểm tra, ẩn/hiện, xung đột.
let rows = [{ id: 'a', ma: 'STF-0001', ho_ten: 'Nguyễn Văn A', trang_thai: 'dang_lam', sua_luc: 't1', da_an: '' },
            { id: 'b', ma: 'STF-0002', ho_ten: 'Trần Thị B', trang_thai: 'da_nghi', sua_luc: 't1', da_an: 'Y' }];
const calls = [];
const staffServer = {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 1 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  listRecords: () => rows.map((r) => Object.assign({}, r)),
  createRecord: (table, data) => {
    calls.push(['create', table, data]);
    if (!data.ho_ten.trim()) throw new Error('VALIDATION|{"field":"ho_ten","code":"required"}');
    rows.push(Object.assign({ id: 'c', ma: 'STF-0003', sua_luc: 't1', da_an: '' }, data));
  },
  setHidden: (table, id, hidden, suaLuc) => { calls.push(['hide', id, hidden, suaLuc]); rows.find((r) => r.id === id).da_an = hidden ? 'Y' : ''; },
  updateRecord: () => { throw new Error('Exception: CONFLICT'); },
};
const w5 = open({}, staffServer);
const d5 = w5.document;
const body = () => d5.getElementById('pageBody');
const button = (text) => Array.from(body().querySelectorAll('button')).find((b) => b.textContent === text);
d5.querySelector('[data-page="settings"]').click();
assert.match(body().textContent, /Nhân viên phụ trách/);
assert.match(body().textContent, /Nguyễn Văn A/);
assert(!/Trần Thị B/.test(body().textContent), 'mục đã ẩn không hiện mặc định');
const hiddenBox = body().querySelector('input[type="checkbox"]');
hiddenBox.checked = true; hiddenBox.dispatchEvent(new w5.Event('change'));
assert.match(body().textContent, /Trần Thị B \(đã ẩn\)/);
assert.match(body().textContent, /Đã nghỉ/);

button('+ Thêm nhân viên').click();
body().querySelector('form').dispatchEvent(new w5.Event('submit', { cancelable: true }));
assert.match(body().textContent, /Họ tên không được để trống\./);
const nameInput = body().querySelector('form input');
nameInput.value = 'Lê Văn C'; nameInput.dispatchEvent(new w5.Event('input'));
body().querySelector('form').dispatchEvent(new w5.Event('submit', { cancelable: true }));
assert(!body().querySelector('form'), 'lưu xong thì đóng form');
assert.match(body().textContent, /STF-0003/);
assert.strictEqual(JSON.stringify(calls[1]), JSON.stringify(['create', 'STAFF', { ho_ten: 'Lê Văn C', trang_thai: 'dang_lam' }]));

button('Hiện lại').click();
assert.strictEqual(JSON.stringify(calls[2]), JSON.stringify(['hide', 'b', false, 't1']));

button('Sửa').click();
body().querySelector('form').dispatchEvent(new w5.Event('submit', { cancelable: true }));
assert.match(body().textContent, /bị thay đổi ở nơi khác/);
assert(!body().querySelector('form'), 'xung đột thì đóng form và tải lại');

// 12. Sao lưu: trạng thái, cảnh báo, bật tự động, sao lưu ngay, khôi phục có xác nhận.
let bStatus = { autoEnabled: false, lastOk: null, lastRun: null, lastError: { at: '2026-10-31 21:30:00', msg: 'Drive hết dung lượng' }, stale: true, folderUrl: 'https://backup',
  backups: [{ key: '2026-10-19_130000__manual', date: '2026-10-19', time: '13:00:00', kind: 'manual', complete: true },
            { key: '2025-11-15_213000__auto', date: '2025-11-15', time: '21:30:00', kind: 'auto', complete: false }] };
const bCalls = [];
const backupServer = {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 1 }),
  listRecords: () => [],
  getBackupStatus: () => bStatus,
  enableAutoBackup: () => { bCalls.push('enable'); bStatus = Object.assign({}, bStatus, { autoEnabled: true }); return bStatus; },
  backupNow: () => { bCalls.push('now'); bStatus = Object.assign({}, bStatus, { lastOk: '2026-10-19 14:00:00', stale: false, lastError: null }); return bStatus; },
  restoreBackup: (key) => { bCalls.push('restore:' + key); return { restoredFrom: key, safetyBackup: '2026-10-19_140100__pre-restore', status: bStatus }; },
};
const w6 = open({}, backupServer);
const d6 = w6.document;
const body6 = () => d6.getElementById('pageBody');
const btn6 = (text) => Array.from(body6().querySelectorAll('button')).find((b) => b.textContent === text);
d6.querySelector('[data-page="settings"]').click();
assert.match(body6().textContent, /Sao lưu tự động bị lỗi lúc 2026-10-31 21:30:00: Drive hết dung lượng/);
assert.match(body6().textContent, /Chưa có bản sao lưu nào\./);
assert.match(body6().textContent, /Sao lưu tự động: đang tắt\./);
assert.match(body6().textContent, /Thiếu file/);
const restoreButtons = Array.from(body6().querySelectorAll('button')).filter((b) => b.textContent === 'Khôi phục');
assert.strictEqual(restoreButtons[1].disabled, true, 'cặp thiếu file không cho khôi phục');
btn6('Bật sao lưu tự động').click();
assert.match(body6().textContent, /Sao lưu tự động: đang bật\./);
assert(!btn6('Bật sao lưu tự động'), 'đã bật thì ẩn nút bật');
btn6('Sao lưu ngay').click();
assert.match(body6().textContent, /Đã sao lưu xong\./);
assert(!/bị lỗi/.test(body6().textContent));
btn6('Khôi phục').click();
assert.match(body6().textContent, /Khôi phục dữ liệu về bản 2026-10-19 13:00:00\?/);
assert.strictEqual(bCalls.filter((c) => c.startsWith('restore')).length, 0, 'chưa xác nhận thì chưa khôi phục');
btn6('Xác nhận khôi phục').click();
assert.deepStrictEqual(bCalls.slice(), ['enable', 'now', 'restore:2026-10-19_130000__manual']);
assert.match(body6().textContent, /Đã khôi phục từ bản 2026-10-19_130000__manual\. Dữ liệu trước đó được lưu ở bản 2026-10-19_140100__pre-restore\./);
assert.strictEqual(body6().querySelector('a[href="https://backup"]').textContent, 'Mở thư mục sao lưu');

// 13. Đo tốc độ: chuẩn bị dữ liệu, đo lần lượt 5 thao tác + thời gian mở app, đánh giá Đạt/Không đạt.
const perfCalls = [];
const perfServer = {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 1 }),
  listRecords: () => [],
  getBackupStatus: () => ({ autoEnabled: true, lastOk: '2026-10-19 16:00:00', lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  preparePerfData: () => ({ counts: { STAFF: 1000, AUDIT_LOG: 10000 }, ms: 4200, url: 'https://perf' }),
  perfOp: (op, arg) => {
    perfCalls.push([op, arg && arg.id]);
    const th = { list: 3000, save: 3000, appLoad: 5000 };
    if (op === 'create') return { op, serverMs: 800, parts: { khoa: 10, moFile: 300, ghi: 200, khac: 290 }, result: { id: 'new', sua_luc: 'a' }, thresholds: th };
    if (op === 'update') return { op, serverMs: 4000, result: { id: 'new', sua_luc: 'b' }, thresholds: { list: 3000, save: -1, appLoad: 5000 } };
    return { op, serverMs: 500, result: op === 'hide' ? { id: 'new' } : [], thresholds: th };
  },
};
const w7 = open({}, perfServer);
const d7 = w7.document;
const body7 = () => d7.getElementById('pageBody');
d7.querySelector('[data-page="settings"]').click();
Array.from(body7().querySelectorAll('button')).find((b) => b.textContent === 'Đo tốc độ').click();
// 5 vòng; mỗi vòng sửa/ẩn đúng bản ghi vừa tạo trong vòng đó.
const oneRound = [['list', null], ['listApplication', null], ['create', null], ['update', 'new'], ['hide', 'new']];
assert.strictEqual(JSON.stringify(perfCalls), JSON.stringify([].concat(oneRound, oneRound, oneRound, oneRound, oneRound)));
const perfRows = Array.from(body7().querySelectorAll('section[aria-labelledby="perf-h"] tbody tr'));
assert.strictEqual(perfRows.length, 6);
assert.match(perfRows[0].textContent, /Mở app \(phần trong khung Google\)—/);
assert.match(perfRows[1].textContent, /Mở danh sách 1\.000 dòng0\.50.*Đạt.*Đạt/);
assert.match(perfRows[3].textContent, /Tạo 1 bản ghi \(nhật ký 10\.000 dòng\)khóa 0\.01 · mở file 0\.30 · ghi 0\.20 · khác 0\.290\.80/);
assert.match(perfRows[4].textContent, /Sửa 1 bản ghi4\.00.*Không đạt.*Không đạt/);
assert.strictEqual(perfRows[0].querySelectorAll('td').length, 7);
assert.strictEqual(w7.perfMedian([5, 1, 3, 2, 4]), 3);
assert.strictEqual(w7.perfMedian([4, 1, 3, 2]), 2);
assert.match(body7().textContent, /Dữ liệu giả: STAFF 1000, AUDIT_LOG 10000\. Thời gian chuẩn bị: 4\.2 giây\./);
assert.strictEqual(body7().querySelector('a[href="https://perf"]').textContent, 'Mở file HR_PERF_TEST');

// 14. Trang Công ty (bước 2.1): danh sách, tìm, lọc, form, lỗi theo ô, người đã nghỉ, dạng thẻ, tiếng Nhật.
const coData = {
  STAFF: [{ id: 's1', ma: 'STF-0001', ho_ten: 'Sales Giả 1', trang_thai: 'dang_lam', sua_luc: 't', da_an: '' },
          { id: 's2', ma: 'STF-0002', ho_ten: 'Nghỉ Giả 2', trang_thai: 'da_nghi', sua_luc: 't', da_an: '' }],
  LOOKUP: [{ id: 'l1', ma: 'DM-0001', loai: 'linh_vuc', ten_vi: 'Điều dưỡng', ten_ja: '介護', tu_ngay: '', den_ngay: '', sua_luc: 't', da_an: '' },
           { id: 'l2', ma: 'DM-0002', loai: 'linh_vuc', ten_vi: 'Hết hạn giả', ten_ja: '期限切れ', tu_ngay: '', den_ngay: '2000-01-01', sua_luc: 't', da_an: '' }],
  COMPANY: [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: '株式会社テスト', ten_viet_tat: 'Test', ten_phien_am: 'テスト', ma_buu_dien: '', tinh_thanh: '東京都', dia_chi: '',
              dien_thoai: '', linh_vuc: 'l1', sales_staff_id: 's1', support_staff_id: 's2', trang_thai: 'dang_giao_dich', ghi_chu: '', sua_luc: 't1', da_an: '' },
            { id: 'c2', ma: 'CO-0002', ten_phap_nhan: 'Công ty Giả B', ten_viet_tat: '', ten_phien_am: '', ma_buu_dien: '', tinh_thanh: '', dia_chi: '',
              dien_thoai: '', linh_vuc: '', sales_staff_id: '', support_staff_id: '', trang_thai: 'tiem_nang', ghi_chu: '', sua_luc: 't1', da_an: '' },
            { id: 'c3', ma: 'CO-0003', ten_phap_nhan: 'Công ty Ẩn C', ten_viet_tat: '', ten_phien_am: '', ma_buu_dien: '', tinh_thanh: '', dia_chi: '',
              dien_thoai: '', linh_vuc: '', sales_staff_id: '', support_staff_id: '', trang_thai: 'ngung', ghi_chu: '', sua_luc: 't1', da_an: 'Y' }],
  JOB_ORDER: [{ id: 'j1', ma: 'JO-0001', company_id: 'c1', vi_tri: '介護職', so_luong_can: '3', phu_trach_staff_id: 's2', trang_thai_don: 'dang_mo',
                linh_vuc: 'l1', tinh_thanh_lam_viec: '', dia_chi_lam_viec: '', dieu_kien: '', yeu_cau: '', ngay_nhan_don: '', ngay_du_kien_vao_lam: '2026-12-01',
                ghi_chu: '', sua_luc: 'j', da_an: '' },
              { id: 'j2', ma: 'JO-0002', company_id: 'c2', vi_tri: 'Xây dựng giả', so_luong_can: '1', phu_trach_staff_id: '', trang_thai_don: 'da_du',
                linh_vuc: '', tinh_thanh_lam_viec: '', dia_chi_lam_viec: '', dieu_kien: '', yeu_cau: '', ngay_nhan_don: '', ngay_du_kien_vao_lam: '',
                ghi_chu: '', sua_luc: 'j', da_an: '' }],
  APPLICATION: [{ id: 'a1', ma: 'APL-0001', person_id: 'p1', job_id: 'j1', ngay_gui: '2026-10-01', trang_thai_hien_tai: 'cho_pv', ngay_trang_thai: '2026-10-02', recruiter_staff_id: '', ghi_chu: '', sua_luc: 'a', da_an: '' },
                { id: 'a2', ma: 'APL-0002', person_id: 'p2', job_id: 'j1', ngay_gui: '2026-10-01', trang_thai_hien_tai: 'truot', ngay_trang_thai: '2026-10-03', recruiter_staff_id: '', ghi_chu: '', sua_luc: 'a', da_an: '' },
                { id: 'a3', ma: 'APL-0003', person_id: 'p3', job_id: 'j1', ngay_gui: '2026-10-01', trang_thai_hien_tai: 'tam_dung', ngay_trang_thai: '2026-10-03', recruiter_staff_id: '', ghi_chu: '', sua_luc: 'a', da_an: '' }],
  EMPLOYMENT: [{ id: 'e1', ma: 'EMP-0001', person_id: 'p9', company_id: 'c1', job_id: 'j1', application_id: 'a9', ngay_vao_lam: '2026-01-01', ngay_nghi: '', ly_do_nghi: '', ghi_chu: '', sua_luc: 'e', da_an: '' },
               { id: 'e2', ma: 'EMP-0002', person_id: 'p8', company_id: 'c1', job_id: 'j1', application_id: 'a8', ngay_vao_lam: '2099-01-01', ngay_nghi: '', ly_do_nghi: '', ghi_chu: '', sua_luc: 'e', da_an: '' }],
  IMMIGRATION_CASE: [],
  CASE_DOCUMENT: [],
  FILE: [],
  SUPPORT_LOG: [],
  CONTRACT: [],
  CONTACT: [{ id: 'k1', ma: 'CT-0001', company_id: 'c1', ho_ten: 'Liên hệ Giả 1', ho_ten_phien_am: 'レンラク', bo_phan: '総務部', chuc_vu: '課長',
              so_dien_thoai: '03-0000-0000', email: 'gia1@example.test', lien_he_chinh: '', ghi_chu: '', sua_luc: 'k', da_an: '' },
            { id: 'k2', ma: 'CT-0002', company_id: 'c1', ho_ten: 'Liên hệ Giả 2', ho_ten_phien_am: '', bo_phan: '', chuc_vu: '',
              so_dien_thoai: '', email: '', lien_he_chinh: 'Y', ghi_chu: '', sua_luc: 'k', da_an: '' },
            { id: 'k3', ma: 'CT-0003', company_id: 'c2', ho_ten: 'Liên hệ công ty B', ho_ten_phien_am: '', bo_phan: '', chuc_vu: '',
              so_dien_thoai: '', email: '', lien_he_chinh: '', ghi_chu: '', sua_luc: 'k', da_an: '' }],
};
const coCalls = [];
const coServer = {
  listRecords: (table) => coData[table].map((r) => Object.assign({}, r)),
  createRecord: (table, data) => {
    coCalls.push(['create', table, Object.assign({}, data)]);
    if (data.ma_buu_dien === 'x') throw new Error('VALIDATION|{"field":"ma_buu_dien","code":"invalidFormat"}');
    coData.COMPANY.push(Object.assign({ id: 'c4', ma: 'CO-0004', sua_luc: 't1', da_an: '' }, data));
  },
  updateRecord: (table, id, data, suaLuc) => { coCalls.push(['update', id, Object.assign({}, data), suaLuc]); },
  setHidden: (table, id, hidden, suaLuc) => { coCalls.push(['hide', id, hidden, suaLuc]); },
  getUpcomingInterviews: (companyId) => (companyId === 'c1' ? [{ id: 'v1', ma: 'PV-0001', thoi_gian: '2026-10-25 10:00', gio_ket_thuc: '11:00', vong: 'v1',
    hinh_thuc: 'online', dia_diem: '', app_ma: 'APL-0001', person_id: 'p1', person_ma: 'PER-0001', person_name: 'NGUYEN VAN GIA', job_ma: 'JO-0001', vi_tri: '介護職' }] : []),
};
coServer.createRecord = ((orig) => (table, data) => {
  if (table === 'JOB_ORDER') {
    coCalls.push(['create', table, Object.assign({}, data)]);
    if (data.so_luong_can === '0') throw new Error('VALIDATION|{"field":"so_luong_can","code":"positiveInt"}');
    coData.JOB_ORDER.push(Object.assign({ id: 'j9', ma: 'JO-0009', sua_luc: 'j', da_an: '' }, data));
    return;
  }
  if (table !== 'CONTACT') return orig(table, data);
  coCalls.push(['create', table, Object.assign({}, data)]);
  if (data.email === 'sai') throw new Error('VALIDATION|{"field":"email","code":"invalidFormat"}');
  coData.CONTACT.push(Object.assign({ id: 'k4', ma: 'CT-0004', sua_luc: 'k', da_an: '' }, data));
})(coServer.createRecord);
const w8 = open({}, coServer);
const d8 = w8.document;
w8.scrollTo = () => {}; // jsdom không có cuộn trang
const body8 = () => d8.getElementById('pageBody');
const btn8 = (text) => Array.from(body8().querySelectorAll('button')).find((b) => b.textContent === text);
const rows8 = () => Array.from(body8().querySelectorAll('table.cards tbody tr'));
const fire = (node, type) => node.dispatchEvent(new w8.Event(type, { cancelable: true }));
d8.querySelector('[data-page="company"]').click();
assert.strictEqual(d8.getElementById('pageTitle').textContent, 'Công ty');
assert.strictEqual(rows8().length, 2, 'mục đã ẩn không hiện mặc định');
assert(!body8().querySelector('.msg-err'), 'tải đủ 7 danh sách không lỗi');
assert.match(rows8()[0].textContent, /CO-0001株式会社テストTestĐiều dưỡngSales Giả 1Nghỉ Giả 2 \(đã nghỉ\)東京都Đang giao dịch/);
assert.strictEqual(rows8()[0].querySelector('td').dataset.label, 'Mã', 'nhãn cột cho dạng thẻ trên điện thoại');
assert.match(body8().textContent, /Đang hiện 2 \/ 2 công ty\./);
// Tìm: không phân biệt chữ hoa/thường, chữ toàn/bán độ rộng.
const search = body8().querySelector('input[type="search"]');
search.focus();
search.value = 'ｔｅｓｔ'; fire(search, 'input');
assert.strictEqual(rows8().length, 1);
assert.strictEqual(d8.activeElement, search, 'gõ tìm không làm mất con trỏ');
search.value = 'không có'; fire(search, 'input');
assert.match(body8().textContent, /Không có công ty nào khớp/);
search.value = ''; fire(search, 'input');
// Lọc người phụ trách: khớp cả sales lẫn support, có cả người đã nghỉ.
const [staffSel, statusSel] = body8().querySelectorAll('.filters select');
staffSel.value = 's2'; fire(staffSel, 'change');
assert.strictEqual(rows8().length, 1);
staffSel.value = ''; fire(staffSel, 'change');
statusSel.value = 'tiem_nang'; fire(statusSel, 'change');
assert.strictEqual(rows8().length, 1);
assert.match(rows8()[0].textContent, /Công ty Giả B/);
statusSel.value = ''; fire(statusSel, 'change');
const showHidden8 = body8().querySelector('.filters input[type="checkbox"]');
showHidden8.checked = true; fire(showHidden8, 'change');
assert.strictEqual(rows8().length, 3);
assert.match(rows8()[2].textContent, /Công ty Ẩn C \(đã ẩn\)/);

// Thêm: tên trống → lỗi ngay tại ô, không gọi máy chủ.
btn8('+ Thêm công ty').click();
const form8 = () => body8().querySelector('form');
fire(form8(), 'submit');
assert.strictEqual(coCalls.length, 0);
const nameIn = form8().querySelector('input[name="ten_phap_nhan"]');
assert.strictEqual(nameIn.getAttribute('aria-invalid'), 'true');
assert.match(nameIn.parentNode.textContent, /Tên pháp nhân không được để trống\./);
// Người đã nghỉ và lĩnh vực hết hiệu lực không có trong ô chọn khi thêm mới.
const checkTexts = (name) => Array.from(form8().querySelectorAll('fieldset')).find((x) => x.querySelector('legend').textContent === name).textContent;
assert.strictEqual(checkTexts('Sales phụ trách'), 'Sales phụ tráchSales Giả 1');
assert.strictEqual(checkTexts('Lĩnh vực'), 'Lĩnh vựcĐiều dưỡng');
assert.strictEqual(form8().querySelector('select[name="tinh_thanh"]').options.length, 48);
const setIn = (name, v) => { const i = form8().querySelector('[name="' + name + '"]'); i.value = v; fire(i, i.tagName === 'SELECT' ? 'change' : 'input'); };
setIn('ten_phap_nhan', 'Công ty Giả D');
setIn('ma_buu_dien', 'x');
setIn('tinh_thanh', '大阪府');
const salesBox = Array.from(form8().querySelectorAll('fieldset'))[1].querySelector('input');
salesBox.checked = true; fire(salesBox, 'change');
fire(form8(), 'submit');
const postal = form8().querySelector('input[name="ma_buu_dien"]');
assert.strictEqual(postal.getAttribute('aria-invalid'), 'true', 'lỗi máy chủ hiện đúng ô');
assert.match(postal.parentNode.textContent, /Mã bưu điện: sai định dạng\./);
assert.strictEqual(form8().querySelector('input[name="ten_phap_nhan"]').value, 'Công ty Giả D', 'không mất dữ liệu đã nhập');
setIn('ma_buu_dien', '530-0001');
fire(form8(), 'submit');
assert(!form8(), 'lưu xong thì đóng form');
const sent = coCalls[1][2];
assert.strictEqual(sent.ten_phap_nhan, 'Công ty Giả D');
assert.strictEqual(sent.sales_staff_id, 's1');
assert.strictEqual(sent.tinh_thanh, '大阪府');
assert.strictEqual(sent.trang_thai, 'dang_giao_dich');
assert.match(body8().textContent, /CO-0004/);

// Sửa công ty có support đã nghỉ: vẫn giữ, có ghi chú (đã nghỉ); gửi kèm sua_luc.
btn8('Sửa').click();
assert.match(checkTexts('Support phụ trách'), /Nghỉ Giả 2\(đã nghỉ\)/);
const supportBoxes = Array.from(form8().querySelectorAll('fieldset'))[2].querySelectorAll('input');
assert.strictEqual(Array.from(supportBoxes).find((x) => x.value === 's2').checked, true);
fire(form8(), 'submit');
assert.strictEqual(JSON.stringify(coCalls[2].slice(0, 2)), JSON.stringify(['update', 'c1']));
assert.strictEqual(coCalls[2][3], 't1');
assert.strictEqual(coCalls[2][2].support_staff_id, 's2');
btn8('Ẩn').click();
assert.strictEqual(JSON.stringify(coCalls[3]), JSON.stringify(['hide', 'c1', true, 't1']));

// Tiếng Nhật: tên lĩnh vực và trạng thái đổi theo.
d8.querySelector('[data-lang="ja"]').click();
assert.match(rows8()[0].textContent, /介護/);
assert.match(rows8()[0].textContent, /取引中/);
d8.querySelector('[data-lang="vi"]').click();

// 16. Trang chi tiết công ty + người liên hệ (bước 2.2).
search.value = ''; fire(search, 'input');
statusSel.value = 'dang_giao_dich'; fire(statusSel, 'change');
const openDetail = Array.from(body8().querySelectorAll('.link-btn')).find((b) => b.textContent === '株式会社テスト');
openDetail.click();
assert.match(body8().textContent, /CO-0001 · 株式会社テスト/);
assert.match(body8().querySelector('dl.info').textContent, /Lĩnh vựcĐiều dưỡng/);
const upBox = body8().querySelector('section[aria-labelledby="upcoming-h"]');
assert.match(upBox.textContent, /Lịch phỏng vấn sắp tới2026-10-25 10:00–11:001次 \(vòng 1\)PER-0001 · NGUYEN VAN GIAJO-0001 · 介護職 · Online/);
assert.match(body8().querySelector('dl.info').textContent, /Support phụ tráchNghỉ Giả 2 \(đã nghỉ\)/);
const ctBox = () => body8().querySelector('section[aria-labelledby="contact-h"]');
const ctRows = () => Array.from(ctBox().querySelectorAll('tbody tr'));
assert.strictEqual(ctRows().length, 2, 'chỉ người liên hệ của công ty này');
assert.match(ctRows()[0].textContent, /CT-0002Liên hệ Giả 2Liên hệ chính/, 'liên hệ chính lên đầu');
assert.match(ctRows()[1].textContent, /Liên hệ Giả 1レンラク総務部 \/ 課長/);
assert.strictEqual(ctRows()[1].querySelector('a[href^="mailto:"]').getAttribute('href'), 'mailto:gia1@example.test');
assert.strictEqual(ctRows()[1].querySelector('a[href^="tel:"]').getAttribute('href'), 'tel:0300000000');
// Thêm: họ tên trống → lỗi tại ô; email sai → lỗi máy chủ tại ô; đúng → gửi kèm company_id.
Array.from(ctBox().querySelectorAll('button')).find((b) => b.textContent === '+ Thêm người liên hệ').click();
const ctForm = () => ctBox().querySelector('form');
fire(ctForm(), 'submit');
assert.match(ctForm().querySelector('[name="ho_ten"]').parentNode.textContent, /Họ tên không được để trống\./);
const setCt = (name, v) => { const i = ctForm().querySelector('[name="' + name + '"]'); i.value = v; fire(i, 'input'); };
setCt('ho_ten', 'Liên hệ Giả 4');
setCt('email', 'sai');
const prim = ctForm().querySelector('[name="lien_he_chinh"]');
prim.checked = true; fire(prim, 'change');
fire(ctForm(), 'submit');
assert.strictEqual(ctForm().querySelector('[name="email"]').getAttribute('aria-invalid'), 'true');
assert.match(ctForm().querySelector('[name="email"]').parentNode.textContent, /Email: sai định dạng\./);
assert.strictEqual(ctForm().querySelector('[name="lien_he_chinh"]').checked, true, 'không mất lựa chọn');
setCt('email', 'gia4@example.test');
fire(ctForm(), 'submit');
assert(!ctForm(), 'lưu xong đóng form');
const ctSent = coCalls[coCalls.length - 1];
assert.strictEqual(ctSent[1], 'CONTACT');
assert.strictEqual(ctSent[2].company_id, 'c1');
assert.strictEqual(ctSent[2].lien_he_chinh, 'Y');
assert.match(ctBox().textContent, /CT-0004/);
// Quay lại danh sách: bộ lọc vẫn giữ.
Array.from(body8().querySelectorAll('button')).find((b) => b.textContent === '← Danh sách công ty').click();
assert.strictEqual(body8().querySelectorAll('.filters select')[1].value, 'dang_giao_dich');
assert.strictEqual(rows8().length, 2, 'CO-0001 và CO-0004 vừa tạo');
// Đang ở trang chi tiết, bấm menu Công ty → về danh sách.
Array.from(body8().querySelectorAll('.link-btn'))[0].click();
assert(body8().querySelector('dl.info'));
d8.querySelector('[data-page="company"]').click();
assert(!body8().querySelector('dl.info'));

// 17. Đơn tuyển (bước 2.3): danh sách, tìm theo tên công ty, lọc, form chọn công ty → lĩnh vực theo công ty, trang chi tiết công ty.
d8.querySelector('[data-page="jobs"]').click();
assert.strictEqual(d8.getElementById('pageTitle').textContent, 'Đơn tuyển');
const jobRows = () => Array.from(body8().querySelectorAll('table.cards tbody tr'));
assert.strictEqual(jobRows().length, 2);
assert.match(jobRows()[0].textContent, /JO-0001介護職株式会社テストĐiều dưỡng3Đã vào làm 1 · Chờ vào làm 1 · Còn thiếu 2Đang giới thiệu 2Nghỉ Giả 2 \(đã nghỉ\)2026-12-01Đang mở/,
  'vào làm 1 (ngày đã qua), chờ 1 (ngày tương lai), thiếu 3−1; đang giới thiệu = chờ PV + tạm dừng');
assert.match(jobRows()[1].textContent, /Còn thiếu —/, 'đơn đã đủ người (đã đóng): không tính còn thiếu (D-021)');
assert.match(body8().textContent, /Đang hiện 2 \/ 2 đơn tuyển\./);
const jSearch = body8().querySelector('input[type="search"]');
jSearch.value = 'テスト'; fire(jSearch, 'input');
assert.strictEqual(jobRows().length, 1, 'tìm theo tên công ty');
jSearch.value = ''; fire(jSearch, 'input');
const jSel = (label) => Array.from(body8().querySelectorAll('.filters select')).find((s) => s.getAttribute('aria-label') === label);
jSel('Trạng thái đơn').value = 'da_du'; fire(jSel('Trạng thái đơn'), 'change');
assert.strictEqual(jobRows().length, 1);
assert.match(jobRows()[0].textContent, /JO-0002/);
jSel('Trạng thái đơn').value = ''; fire(jSel('Trạng thái đơn'), 'change');
jSel('Lĩnh vực').value = 'l1'; fire(jSel('Lĩnh vực'), 'change');
assert.strictEqual(jobRows().length, 1);
jSel('Lĩnh vực').value = ''; fire(jSel('Lĩnh vực'), 'change');
// Thêm đơn: chưa chọn công ty → lỗi tại ô; chọn công ty → lĩnh vực chỉ gồm lĩnh vực của công ty đó.
Array.from(body8().querySelectorAll('button')).find((b) => b.textContent === '+ Thêm đơn tuyển').click();
const jForm = () => body8().querySelector('form');
fire(jForm(), 'submit');
assert.match(jForm().querySelector('[name="company_id"]').parentNode.textContent, /Công ty không được để trống\./);
const lvOptions = () => Array.from(jForm().querySelectorAll('[name="linh_vuc"] option')).map((o) => o.textContent);
const coSel = jForm().querySelector('[name="company_id"]');
assert(!Array.from(coSel.options).some((o) => /Công ty Ẩn C/.test(o.textContent)), 'không chọn được công ty đã ẩn');
coSel.value = 'c2'; fire(coSel, 'change');
eq(lvOptions(), ['—']);
assert.match(jForm().textContent, /Công ty này chưa có lĩnh vực/);
const coSel2 = jForm().querySelector('[name="company_id"]');
coSel2.value = 'c1'; fire(coSel2, 'change');
eq(lvOptions(), ['—', 'Điều dưỡng']);
const setJ = (name, v) => { const i = jForm().querySelector('[name="' + name + '"]'); i.value = v; fire(i, i.tagName === 'SELECT' ? 'change' : 'input'); };
setJ('vi_tri', 'Vị trí giả');
setJ('linh_vuc', 'l1');
setJ('so_luong_can', '0');
eq(Array.from(jForm().querySelectorAll('[name="phu_trach_staff_id"] option')).map((o) => o.textContent), ['—', 'Sales Giả 1'], 'người đã nghỉ không chọn mới được');
fire(jForm(), 'submit');
assert.match(jForm().querySelector('[name="so_luong_can"]').parentNode.textContent, /Số lượng cần phải là số nguyên từ 1 đến 9999\./);
setJ('so_luong_can', '2');
fire(jForm(), 'submit');
assert(!jForm(), 'lưu xong đóng form');
const jSent = coCalls[coCalls.length - 1];
assert.strictEqual(jSent[1], 'JOB_ORDER');
eq([jSent[2].company_id, jSent[2].vi_tri, jSent[2].linh_vuc, jSent[2].so_luong_can, jSent[2].trang_thai_don], ['c1', 'Vị trí giả', 'l1', '2', 'dang_mo']);
// Bấm tên công ty trong bảng đơn → trang chi tiết công ty có mục Đơn tuyển.
Array.from(body8().querySelectorAll('.link-btn')).find((b) => b.textContent === '株式会社テスト').click();
assert.strictEqual(d8.getElementById('pageTitle').textContent, 'Công ty');
const cjBox = () => body8().querySelector('section[aria-labelledby="company-jobs-h"]');
assert.strictEqual(cjBox().querySelectorAll('tbody tr').length, 2, 'JO-0001 + đơn vừa tạo');
Array.from(cjBox().querySelectorAll('button')).find((b) => b.textContent === '+ Thêm đơn').click();
assert.match(cjBox().querySelector('form').textContent, /Công ty株式会社テスト/, 'công ty cố định, không phải chọn');
assert(!cjBox().querySelector('[name="company_id"]'));
// Sửa đơn: công ty hiện cố định; gửi kèm sua_luc.
Array.from(cjBox().querySelectorAll('button')).find((b) => b.textContent === 'Hủy').click();
Array.from(cjBox().querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Sửa JO-0001').click();
assert(!cjBox().querySelector('[name="company_id"]'));
fire(cjBox().querySelector('form'), 'submit');
const jUpd = coCalls[coCalls.length - 1];
eq([jUpd[0], jUpd[1], jUpd[3]], ['update', 'j1', 'j']);

// 17b. Đơn đang mở đã đủ người (3.4 Q2 b): nút "→ Đã đủ người" ở cột trạng thái, chỉ đổi khi bấm.
coData.JOB_ORDER[0].so_luong_can = '1';
d8.querySelector('[data-page="jobs"]').click();
assert.match(jobRows()[0].textContent, /Còn thiếu 0/);
const markFull = Array.from(jobRows()[0].querySelectorAll('button')).find((b) => b.textContent === '→ Đã đủ người');
assert(markFull, 'có nút gợi ý');
assert(!Array.from(jobRows()[1].querySelectorAll('button')).some((b) => b.textContent === '→ Đã đủ người'), 'đơn đã đóng không có nút');
markFull.click();
eq(coCalls[coCalls.length - 1], ['update', 'j1', { trang_thai_don: 'da_du' }, 'j']);

// 15. Cài đặt → Lĩnh vực: tình trạng hiệu lực, thêm có ngày.
const lkCalls = [];
const lkServer = {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 2 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  listRecords: (table) => (table === 'LOOKUP' ? coData.LOOKUP.concat([{ id: 'l3', ma: 'DM-0003', loai: 'linh_vuc', ten_vi: 'Tương lai', ten_ja: '', tu_ngay: '2999-01-01', den_ngay: '', sua_luc: 't', da_an: '' }]) : []),
  createRecord: (table, data) => { lkCalls.push([table, data]); },
};
const w9 = open({}, lkServer);
const d9 = w9.document;
d9.querySelector('[data-page="settings"]').click();
const lkBox = () => d9.querySelector('section[aria-labelledby="lookup-h"]');
const lkRows = Array.from(lkBox().querySelectorAll('tbody tr')).map((r) => r.textContent);
assert.match(lkRows[0], /DM-0001Điều dưỡng介護——Đang hiệu lực/);
assert.match(lkRows[1], /Hết hiệu lực/);
assert.match(lkRows[2], /Chưa tới ngày/);
Array.from(lkBox().querySelectorAll('button')).find((b) => b.textContent === '+ Thêm mục').click();
const lkInputs = lkBox().querySelectorAll('form input');
assert.strictEqual(lkInputs[2].type, 'date');
lkInputs[0].value = 'Lĩnh vực giả'; lkInputs[0].dispatchEvent(new w9.Event('input'));
lkInputs[2].value = '2026-11-01'; lkInputs[2].dispatchEvent(new w9.Event('input'));
lkBox().querySelector('form').dispatchEvent(new w9.Event('submit', { cancelable: true }));
assert.strictEqual(JSON.stringify(lkCalls[0]), JSON.stringify(['LOOKUP', { loai: 'linh_vuc', ten_vi: 'Lĩnh vực giả', ten_ja: '', tu_ngay: '2026-11-01', den_ngay: '' }]));
// Đổi loại danh mục → chỉ hiện mục của loại đó; thêm mục mới mang đúng loại.
const typeSel = lkBox().querySelector('select');
typeSel.value = 'quoc_tich'; typeSel.dispatchEvent(new w9.Event('change'));
assert.match(lkBox().textContent, /Chưa có mục nào\./);
Array.from(lkBox().querySelectorAll('button')).find((b) => b.textContent === '+ Thêm mục').click();
const qtIn = lkBox().querySelector('form input');
qtIn.value = 'Quốc tịch giả'; qtIn.dispatchEvent(new w9.Event('input'));
lkBox().querySelector('form').dispatchEvent(new w9.Event('submit', { cancelable: true }));
assert.strictEqual(lkCalls[1][1].loai, 'quoc_tich');

// 18. Con người (bước 3.1): danh sách không có số giấy tờ, tìm không dấu, hồ sơ che số + "Hiện", nghi trùng → "Vẫn lưu".
const peData = {
  STAFF: coData.STAFF,
  LOOKUP: [{ id: 'q1', ma: 'DM-0020', loai: 'quoc_tich', ten_vi: 'Việt Nam', ten_ja: 'ベトナム', tu_ngay: '', den_ngay: '', da_an: '' },
           { id: 'q2', ma: 'DM-0021', loai: 'quoc_tich', ten_vi: 'Quốc tịch cũ', ten_ja: '', tu_ngay: '', den_ngay: '2000-01-01', da_an: '' },
           { id: 'n3', ma: 'DM-0030', loai: 'tieng_nhat', ten_vi: 'N3', ten_ja: 'N3', tu_ngay: '', den_ngay: '', da_an: '' }],
  PERSON: [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'Nguyễn Văn Giả', ho_ten_katakana: 'グエン', ngay_sinh: '2000-01-02', gioi_tinh: 'nam', quoc_tich: 'q2',
             so_dien_thoai: '', email: '', dia_chi: '', noi_o: 'nhat', tu_cach_luu_tru: '', han_luu_tru: '2027-03-01', han_ho_chieu: '', tieng_nhat: 'n3',
             ky_nang: '', trang_thai_sang_loc: 'san_sang', recruiter_staff_id: 's1', nguon: '', ghi_chu: '', sua_luc: 'p', da_an: '' }],
  COMPANY: [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: '株式会社テスト', da_an: '' }],
  JOB_ORDER: [{ id: 'j1', ma: 'JO-0001', company_id: 'c1', vi_tri: '介護職', trang_thai_don: 'dang_mo', da_an: '' },
              { id: 'j2', ma: 'JO-0002', company_id: 'c1', vi_tri: 'Đơn đã đủ', trang_thai_don: 'da_du', da_an: '' }],
  APPLICATION: [],
  EMPLOYMENT: [],
  IMMIGRATION_CASE: [],
  CASE_DOCUMENT: [],
  FILE: [],
  SUPPORT_LOG: [],
  CONTRACT: [],
};
const peCalls = [];
const peServer = {
  listRecords: (table) => peData[table].map((r) => Object.assign({}, r)),
  getPersonDocs: (id, reveal) => { peCalls.push(['docs', id, !!reveal]); return reveal ? { so_ho_chieu: 'C1234567', so_zairyu_card: '', revealed: true } : { so_ho_chieu: '****4567', so_zairyu_card: '', revealed: false }; },
  savePerson: (id, data, suaLuc, confirm) => {
    peCalls.push(['save', id, Object.assign({}, data), suaLuc, confirm]);
    if (!confirm && !id) return { duplicates: [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'Nguyễn Văn Giả', ngay_sinh: '2000-01-02', da_an: '', reasons: ['ten', 'ho_chieu'] }] };
    const rec = Object.assign({ id: id || 'p2', ma: id ? 'PER-0001' : 'PER-0002', sua_luc: 'p2', da_an: '' }, data);
    if (!id) peData.PERSON.push(rec);
    return { person: rec };
  },
};
peServer.createApplication = (data) => {
  peCalls.push(['intro', Object.assign({}, data)]);
  peData.APPLICATION.push(Object.assign({ id: 'a1', ma: 'APL-0001', trang_thai_hien_tai: 'da_gui', ngay_trang_thai: data.ngay_gui, sua_luc: 'a1', da_an: '' }, data));
};
peServer.addApplicationStatus = (id, st, day, reason, suaLuc) => {
  peCalls.push(['status', id, st, day, reason, suaLuc]);
  if (day < '2026-01-01') throw new Error('VALIDATION|{"field":"ngay_hieu_luc","code":"notBeforeLast","ma":"2026-10-20"}');
  Object.assign(peData.APPLICATION.find((a) => a.id === id), { trang_thai_hien_tai: st, ngay_trang_thai: day, sua_luc: 'a2' });
};
peServer.getApplicationLogs = (id) => [
  { id: 'l1', ma: 'ST-0001', application_id: id, trang_thai: 'da_gui', ngay_hieu_luc: '2026-10-20', ly_do: '', da_an: '' },
  { id: 'l2', ma: 'ST-0002', application_id: id, trang_thai: 'tam_dung', ngay_hieu_luc: '2026-10-21', ly_do: '', da_an: 'Y' },
  { id: 'l3', ma: 'ST-0003', application_id: id, trang_thai: 'naitei_shodaku', ngay_hieu_luc: '2026-10-22', ly_do: '', da_an: '' }];
peServer.cancelApplicationStatus = (appId, logId, suaLuc) => { peCalls.push(['cancel', appId, logId, suaLuc]); };
const ivList = [];
peServer.listInterviews = () => ({ interviews: ivList.map((x) => Object.assign({}, x)),
  contacts: [{ id: 'k1', ma: 'CT-0001', ho_ten: 'Người PV Giả', chuc_vu: '課長', da_an: '' }, { id: 'k2', ma: 'CT-0002', ho_ten: 'Đã ẩn', chuc_vu: '', da_an: 'Y' }] });
peServer.saveInterview = (id, data, suaLuc) => {
  peCalls.push(['iv', id, Object.assign({}, data), suaLuc]);
  if (data.gio_ket_thuc === '09:00') throw new Error('VALIDATION|{"field":"gio_ket_thuc","code":"endAfterStart"}');
  if (data.thoi_gian === '2026-02-30 10:00') throw new Error('VALIDATION|{"field":"thoi_gian","code":"invalidFormat"}');
  ivList.push(Object.assign({ id: 'v1', ma: 'PV-0001', sua_luc: 'v', da_an: '' }, data));
  return { interview: ivList[0], app: { id: 'a1', ma: 'APL-0001', sua_luc: 'a2' }, suggest: { status: 'cho_pv', date: '2026-10-23', reason: '' } };
};
peServer.startEmployment = (appId, day, suaLuc) => {
  peCalls.push(['start', appId, day, suaLuc]);
  if (day === '2026-01-01') throw new Error('VALIDATION|{"field":"ngay_vao_lam","code":"stillEmployed","ma":"EMP-0009"}');
  peData.EMPLOYMENT.push({ id: 'e1', ma: 'EMP-0001', person_id: 'p1', company_id: 'c1', job_id: 'j1', application_id: appId, ngay_vao_lam: day, ngay_nghi: '', ly_do_nghi: '', ghi_chu: '', sua_luc: 'e1', da_an: '' });
  Object.assign(peData.APPLICATION.find((a) => a.id === appId), { trang_thai_hien_tai: 'da_vao_lam', ngay_trang_thai: day, sua_luc: 'a3' });
  return { employment: peData.EMPLOYMENT[0], app: {}, jobFull: { id: 'j1', ma: 'JO-0001', sua_luc: 'jx', working: 1, need: '1' } };
};
peServer.updateRecord = (table, id, data, suaLuc) => { peCalls.push(['update', table, id, Object.assign({}, data), suaLuc]); };
peServer.endEmployment = (id, data, suaLuc) => {
  peCalls.push(['end', id, Object.assign({}, data), suaLuc]);
  Object.assign(peData.EMPLOYMENT.find((e) => e.id === id), data, { sua_luc: 'e2' });
};
peData.LOOKUP.push({ id: 'r1', ma: 'DM-0040', loai: 'ly_do_nghi', ten_vi: 'Về nước', ten_ja: '帰国', tu_ngay: '', den_ngay: '', da_an: '' });
const w10 = open({}, peServer);
w10.scrollTo = () => {};
const d10 = w10.document;
const b10 = () => d10.getElementById('pageBody');
const fire10 = (node, type) => node.dispatchEvent(new w10.Event(type, { cancelable: true }));
d10.querySelector('[data-page="person"]').click();
assert.strictEqual(d10.getElementById('pageTitle').textContent, 'Con người');
const pRows = () => Array.from(b10().querySelectorAll('table.cards tbody tr'));
assert.match(pRows()[0].textContent, /PER-0001Nguyễn Văn Giảグエン2000-01-02Quốc tịch cũ/);
assert.match(pRows()[0].textContent, /2027-03-01N3Sales Giả 1Sẵn sàng giới thiệu/);
assert(!/4567/.test(b10().textContent), 'danh sách không có số giấy tờ');
const pSearch = b10().querySelector('input[type="search"]');
pSearch.value = 'nguyen van gia'; fire10(pSearch, 'input');
assert.strictEqual(pRows().length, 1, 'tìm không dấu');
pSearch.value = ''; fire10(pSearch, 'input');
// Hồ sơ: số giấy tờ che; bấm "Hiện số" mới lấy số đầy đủ.
Array.from(b10().querySelectorAll('.link-btn')).find((b) => b.textContent === 'Nguyễn Văn Giả').click();
const docsBox = () => b10().querySelector('section[aria-labelledby="person-docs-h"]');
assert.match(docsBox().textContent, /Số hộ chiếu\*\*\*\*4567/);
Array.from(docsBox().querySelectorAll('button')).find((b) => b.textContent === 'Hiện số').click();
assert.match(docsBox().textContent, /Số hộ chiếuC1234567/);
eq(peCalls.slice(0, 2), [['docs', 'p1', false], ['docs', 'p1', true]]);
Array.from(docsBox().querySelectorAll('button')).find((b) => b.textContent === 'Che số').click();
assert.match(docsBox().textContent, /\*\*\*\*4567/);
// Sửa: quốc tịch hết hiệu lực vẫn giữ (có ghi chú); ô số giấy tờ trống, gợi ý "giữ nguyên".
Array.from(b10().querySelectorAll('button')).find((b) => b.textContent === 'Sửa').click();
const pForm = () => b10().querySelector('form');
eq(Array.from(pForm().querySelectorAll('[name="quoc_tich"] option')).map((o) => o.textContent), ['—', 'Việt Nam', 'Quốc tịch cũ (hết hiệu lực)']);
assert.strictEqual(pForm().querySelector('[name="so_ho_chieu"]').value, '');
assert.strictEqual(pForm().querySelector('[name="so_ho_chieu"]').placeholder, 'Để trống = giữ nguyên (****4567)');
fire10(pForm(), 'submit');
const lastSave = () => peCalls.filter((c) => c[0] === 'save').slice(-1)[0];
const upd = lastSave();
eq([upd[0], upd[1], upd[3], upd[4], upd[2].so_ho_chieu, upd[2].quoc_tich], ['save', 'p1', 'p', false, '', 'q2']);
// Thêm người: thiếu ngày sinh → lỗi tại ô; trùng → cảnh báo, chưa lưu; "Vẫn lưu" → gửi lại có xác nhận, mở hồ sơ mới.
Array.from(b10().querySelectorAll('button')).find((b) => b.textContent === '← Danh sách con người').click();
Array.from(b10().querySelectorAll('button')).find((b) => b.textContent === '+ Thêm người').click();
const setP = (name, v) => { const i = pForm().querySelector('[name="' + name + '"]'); i.value = v; fire10(i, i.tagName === 'SELECT' ? 'change' : 'input'); };
setP('ho_ten_latin', 'NGUYEN VAN GIA');
setP('quoc_tich', 'q1');
fire10(pForm(), 'submit');
assert.match(pForm().querySelector('[name="ngay_sinh"]').parentNode.textContent, /Ngày sinh không được để trống\./);
assert(!pForm().querySelector('[name="quoc_tich"] option[value="q2"]'), 'quốc tịch hết hiệu lực không chọn mới được');
setP('ngay_sinh', '2000-01-02');
setP('so_ho_chieu', 'c1234567');
fire10(pForm(), 'submit');
const warn = b10().querySelector('[role="alert"]');
assert.match(warn.textContent, /Có thể trùng với người đã có:PER-0001 · Nguyễn Văn Giả · 2000-01-02 — trùng tên \+ ngày sinh \+ quốc tịch, trùng số hộ chiếu/);
assert.strictEqual(peData.PERSON.length, 1, 'chưa lưu');
assert(pForm().querySelector('button[type="submit"]').disabled, 'đang có cảnh báo thì nút Lưu thường bị khóa');
Array.from(warn.querySelectorAll('button')).find((b) => b.textContent === 'Vẫn lưu').click();
const conf = lastSave();
eq([conf[1], conf[4], conf[2].so_ho_chieu, conf[2].trang_thai_sang_loc], ['', true, 'c1234567', 'moi_nhan']);
assert.match(b10().textContent, /PER-0002 · NGUYEN VAN GIA/, 'lưu xong mở hồ sơ mới');

assert(!b10().querySelector('.msg-err'), 'tải đủ 7 danh sách không lỗi');

// 19. Lần giới thiệu trong hồ sơ (bước 3.2).
Array.from(b10().querySelectorAll('button')).find((b) => b.textContent === '← Danh sách con người').click();
Array.from(b10().querySelectorAll('.link-btn')).find((b) => b.textContent === 'Nguyễn Văn Giả').click();
const appBox = () => b10().querySelector('section[aria-labelledby="person-apps-h"]');
assert.match(appBox().textContent, /Chưa có lần giới thiệu nào\./);
assert.match(b10().querySelector('dl.info').textContent, /Tình trạng vòng đời— \(chưa có lần giới thiệu đang chạy\)/);
const btnIn = (box, text) => Array.from(box.querySelectorAll('button')).find((b) => b.textContent === text);
btnIn(appBox(), '+ Giới thiệu vào đơn').click();
const aForm = () => appBox().querySelector('form');
eq(Array.from(aForm().querySelectorAll('[name="job_id"] option')).map((o) => o.textContent), ['— Chọn đơn đang mở —', 'JO-0001 · 介護職 · 株式会社テスト']);
assert.strictEqual(aForm().querySelector('[name="recruiter_staff_id"]').value, 's1', 'mặc định recruiter của người đó');
fire10(aForm(), 'submit');
assert.match(aForm().querySelector('[name="job_id"]').parentNode.textContent, /Đơn tuyển không được để trống\./);
const setA = (name, v) => { const i = aForm().querySelector('[name="' + name + '"]'); i.value = v; fire10(i, i.tagName === 'SELECT' ? 'change' : 'input'); };
setA('job_id', 'j1');
setA('ngay_gui', '2026-10-20');
fire10(aForm(), 'submit');
eq(peCalls.filter((c) => c[0] === 'intro').slice(-1)[0][1], { person_id: 'p1', job_id: 'j1', ngay_gui: '2026-10-20', recruiter_staff_id: 's1', ghi_chu: '' });
const aRows = () => Array.from(appBox().querySelectorAll('tbody tr'));
assert.match(aRows()[0].textContent, /APL-0001JO-0001 · 介護職 · 株式会社テスト2026-10-20Đã gửi khách2026-10-20Sales Giả 1/);
assert.match(b10().querySelector('dl.info').textContent, /Tình trạng vòng đờiĐang ứng tuyển/);
// Đổi trạng thái: "Đã vào làm" bị khóa; trượt thiếu lý do → lỗi tại ô; ngày lùi → lỗi máy chủ tại ô.
btnIn(aRows()[0], 'Đổi trạng thái').click();
const sForm = () => appBox().querySelector('form');
const opt = Array.from(sForm().querySelectorAll('[name="trang_thai"] option')).find((o) => o.value === 'da_vao_lam');
assert(!opt.disabled, 'bước 3.4: đã mở "Đã vào làm"');
assert.match(sForm().textContent, /Khi chọn "Đã vào làm": đây là ngày vào làm/);
const setS = (name, v) => { const i = sForm().querySelector('[name="' + name + '"]'); i.value = v; fire10(i, i.tagName === 'SELECT' ? 'change' : 'input'); };
setS('trang_thai', 'truot');
fire10(sForm(), 'submit');
assert.match(sForm().querySelector('[name="ly_do"]').parentNode.textContent, /Lý do không được để trống\./);
setS('trang_thai', 'naitei_shodaku');
setS('ngay_hieu_luc', '2025-01-01');
fire10(sForm(), 'submit');
assert.match(sForm().querySelector('[name="ngay_hieu_luc"]').parentNode.textContent, /Ngày hiệu lực không được trước ngày của lần đổi gần nhất \(2026-10-20\)\./);
setS('ngay_hieu_luc', '2026-10-22');
fire10(sForm(), 'submit');
eq(peCalls.filter((c) => c[0] === 'status').slice(-1)[0], ['status', 'a1', 'naitei_shodaku', '2026-10-22', '', 'a1']);
assert(!sForm(), 'lưu xong đóng form');
assert.match(b10().querySelector('dl.info').textContent, /Tình trạng vòng đờiChờ vào làm/);
// Lịch sử: dòng đã hủy gạch đi; hủy dòng cần bấm xác nhận lần 2.
btnIn(aRows()[0], 'Lịch sử').click();
const hist = Array.from(appBox().querySelectorAll('ul.history li'));
assert.strictEqual(hist.length, 3);
assert(hist[1].classList.contains('cancelled') && /đã hủy/.test(hist[1].textContent));
btnIn(hist[2], 'Hủy dòng này').click();
assert.strictEqual(peCalls.filter((c) => c[0] === 'cancel').length, 0, 'bấm lần 1 chưa hủy');
btnIn(Array.from(appBox().querySelectorAll('ul.history li'))[2], 'Xác nhận hủy').click();
eq(peCalls.filter((c) => c[0] === 'cancel')[0], ['cancel', 'a1', 'l3', 'a2']);
// Người không ở "Sẵn sàng giới thiệu" → nút giới thiệu bị khóa, có giải thích.
peData.PERSON[0].trang_thai_sang_loc = 'dang_kiem_tra';
d10.querySelector('[data-page="person"]').click();
Array.from(b10().querySelectorAll('.link-btn')).find((b) => b.textContent === 'Nguyễn Văn Giả').click();
assert(btnIn(appBox(), '+ Giới thiệu vào đơn').disabled);
assert.match(appBox().textContent, /Chỉ giới thiệu được người ở trạng thái "Sẵn sàng giới thiệu"/);

// 20. Phỏng vấn trong lần giới thiệu (bước 3.3).
peData.PERSON[0].trang_thai_sang_loc = 'san_sang';
peData.APPLICATION[0].trang_thai_hien_tai = 'da_gui';
d10.querySelector('[data-page="person"]').click();
Array.from(b10().querySelectorAll('.link-btn')).find((b) => b.textContent === 'Nguyễn Văn Giả').click();
btnIn(aRows()[0], 'Phỏng vấn').click();
const ivBox = () => b10().querySelector('section[aria-labelledby="iv-h"]');
assert.match(ivBox().textContent, /Phỏng vấn — APL-0001/);
assert.match(ivBox().textContent, /Chưa có buổi phỏng vấn nào\./);
btnIn(ivBox(), '+ Thêm buổi phỏng vấn').click();
const vForm = () => ivBox().querySelector('form');
eq(Array.from(vForm().querySelectorAll('[name="nguoi_pv_contact_id"] option')).map((o) => o.textContent), ['—', 'Người PV Giả · 課長'], 'người liên hệ đã ẩn không chọn mới');
assert.strictEqual(vForm().querySelector('[name="ket_qua"]').value, 'cho');
assert.strictEqual(vForm().querySelector('[name="gio_bat_dau"]').type, 'time');
const setV = (name, v) => { const i = vForm().querySelector('[name="' + name + '"]'); i.value = v; fire10(i, i.tagName === 'SELECT' ? 'change' : 'input'); };
fire10(vForm(), 'submit');
assert.match(vForm().querySelector('[name="gio_bat_dau"]').parentNode.textContent, /Giờ bắt đầu \(JST\) không được để trống\./);
setV('gio_bat_dau', '10:00');
setV('ket_qua', 'truot');
fire10(vForm(), 'submit');
assert.match(vForm().querySelector('[name="ly_do"]').parentNode.textContent, /Lý do không được để trống\./);
setV('ket_qua', 'cho');
setV('gio_ket_thuc', '09:00');
fire10(vForm(), 'submit');
assert.match(vForm().querySelector('[name="gio_ket_thuc"]').parentNode.textContent, /Giờ kết thúc \(JST\) phải sau giờ bắt đầu\./);
setV('gio_ket_thuc', '');
setV('ngay', '2026-02-30');
fire10(vForm(), 'submit');
assert.strictEqual(vForm().querySelector('[name="ngay"]').getAttribute('aria-invalid'), 'true', 'lỗi ngày+giờ hiện ở ô Ngày');
setV('ngay', '2026-10-25');
setV('nguoi_pv_contact_id', 'k1');
setV('hinh_thuc', 'online');
fire10(vForm(), 'submit');
const ivSent = peCalls.filter((c) => c[0] === 'iv').slice(-1)[0];
eq([ivSent[1], ivSent[2].application_id, ivSent[2].thoi_gian, ivSent[2].vong, ivSent[2].nguoi_pv_contact_id], ['', 'a1', '2026-10-25 10:00', 'v1', 'k1']);
// Gợi ý 1 chạm: chưa đổi gì cho tới khi bấm "Cập nhật".
const sug = ivBox().querySelector('[role="alert"]');
assert.match(sug.textContent, /Cập nhật trạng thái APL-0001 thành "Chờ phỏng vấn" \(ngày 2026-10-23\)\?/);
const statusBefore = peCalls.filter((c) => c[0] === 'status').length;
btnIn(sug, 'Cập nhật').click();
eq(peCalls.filter((c) => c[0] === 'status').slice(statusBefore), [['status', 'a1', 'cho_pv', '2026-10-23', '', 'a2']]);
assert.match(ivBox().textContent, /PV-00011次 \(vòng 1\)2026-10-25 10:00OnlineNgười PV GiảChờ/);
// Lần giới thiệu đã kết thúc → nút thêm bị khóa, có giải thích.
peData.APPLICATION[0].trang_thai_hien_tai = 'truot';
d10.querySelector('[data-page="person"]').click();
Array.from(b10().querySelectorAll('.link-btn')).find((b) => b.textContent === 'Nguyễn Văn Giả').click();
btnIn(aRows()[0], 'Phỏng vấn').click();
assert(btnIn(ivBox(), '+ Thêm buổi phỏng vấn').disabled);
assert.match(ivBox().textContent, /Lần giới thiệu đã kết thúc/);

// 21. Vào làm + nghỉ việc (bước 3.4).
peData.APPLICATION[0].trang_thai_hien_tai = 'naitei_shodaku';
d10.querySelector('[data-page="person"]').click();
Array.from(b10().querySelectorAll('.link-btn')).find((b) => b.textContent === 'Nguyễn Văn Giả').click();
assert.match(b10().querySelector('dl.info').textContent, /Tình trạng vòng đờiChờ vào làm/);
const empBox = () => b10().querySelector('section[aria-labelledby="emp-h"]');
assert.match(empBox().textContent, /Chưa có lần vào làm nào\./);
btnIn(aRows()[0], 'Đổi trạng thái').click();
setS('trang_thai', 'da_vao_lam');
setS('ngay_hieu_luc', '2026-01-01');
fire10(sForm(), 'submit');
assert.match(sForm().querySelector('[name="ngay_hieu_luc"]').parentNode.textContent, /Người này đang làm ở nơi khác \(EMP-0009\)/, 'lỗi ngày vào làm hiện ở ô ngày');
setS('ngay_hieu_luc', '2026-10-01');
fire10(sForm(), 'submit');
eq(peCalls.filter((c) => c[0] === 'start').slice(-1)[0], ['start', 'a1', '2026-10-01', 'a2']);
assert(!peCalls.some((c) => c[0] === 'status' && c[2] === 'da_vao_lam'), '"Đã vào làm" không đi đường đổi trạng thái thường');
assert.match(b10().querySelector('dl.info').textContent, /Tình trạng vòng đờiĐang làm/);
assert.match(empBox().textContent, /EMP-0001株式会社テストJO-0001 · 介護職 · 株式会社テスト2026-10-01Đang làm/);
// Gợi ý đơn đủ người: chỉ đổi khi bấm.
const full = appBox().querySelector('[role="alert"]');
assert.match(full.textContent, /Đơn JO-0001 đã đủ người \(1\/1\)\. Đổi trạng thái đơn sang "Đã đủ người"\?/);
btnIn(full, 'Đổi sang Đã đủ người').click();
eq(peCalls.filter((c) => c[0] === 'update').slice(-1)[0], ['update', 'JOB_ORDER', 'j1', { trang_thai_don: 'da_du' }, 'jx']);
// Ghi nghỉ việc: lý do bắt buộc (danh mục); xong → "Đã nghỉ".
btnIn(empBox(), 'Ghi nghỉ việc').click();
const lForm = () => empBox().querySelector('form');
assert.strictEqual(lForm().querySelector('[name="ngay_nghi"]').type, 'date');
fire10(lForm(), 'submit');
assert.match(lForm().querySelector('[name="ly_do_nghi"]').parentNode.textContent, /Lý do nghỉ không được để trống\./);
eq(Array.from(lForm().querySelectorAll('[name="ly_do_nghi"] option')).map((o) => o.textContent), ['—', 'Về nước']);
const setL = (name, v) => { const i = lForm().querySelector('[name="' + name + '"]'); i.value = v; fire10(i, i.tagName === 'SELECT' ? 'change' : 'input'); };
setL('ngay_nghi', '2026-10-10');
setL('ly_do_nghi', 'r1');
fire10(lForm(), 'submit');
eq(peCalls.filter((c) => c[0] === 'end').slice(-1)[0], ['end', 'e1', { ngay_nghi: '2026-10-10', ly_do_nghi: 'r1', ghi_chu: '' }, 'e1']);
assert.match(b10().querySelector('dl.info').textContent, /Tình trạng vòng đờiĐã nghỉ/);
assert.match(empBox().textContent, /2026-10-012026-10-10Về nướcĐã nghỉSửa nghỉ việc/);

// 22. Trang Tổng quan (bước 4.1): mở app là tải số liệu; lọc; liên kết sang Đơn tuyển / hồ sơ.
const dashCalls = [];
const dashData = (f) => ({ today: '2026-11-10', month: f.month || '2026-11', staffId: f.staffId || '',
  staff: [{ id: 's1', ho_ten: 'Sales Giả 1', inactive: false }, { id: 's2', ho_ten: 'Nghỉ Giả 2', inactive: true }],
  openJobs: { count: 2, need: 4, missing: 3, top: [{ id: 'j1', ma: 'JO-0001', vi_tri: '介護職', company: '株式会社テスト', need: 3, working: 1, waiting: 1, missing: 2 }] },
  pipeline: { da_gui: 0, cho_pv: 1, da_pv: 0, naitei: 0, naitei_shodaku: 1, tam_dung: 0 },
  interviews: [{ ma: 'PV-0001', thoi_gian: '2026-11-12 10:00', gio_ket_thuc: '', vong: 'v1', person_id: 'p1', person: 'NGUYEN VAN GIA', job: 'JO-0001 · 介護職', company: '株式会社テスト' }],
  waiting: [{ person_id: 'p1', person: 'NGUYEN VAN GIA', ngay_vao_lam: '', job: 'JO-0002 · X', company: 'Y' }],
  monthStats: { started: 1, left: 0, sent: 3 }, lifecycle: { dang_lam: 1, cho_vao_lam: 2, dang_ung_tuyen: 1, da_nghi: 0, khac: 1 } });
const dashServer = Object.assign({}, coServer, { getDashboard: (f) => { dashCalls.push(Object.assign({}, f)); return dashData(f); } });
const w11 = open({}, dashServer);
w11.scrollTo = () => {};
const d11 = w11.document;
const b11 = () => d11.getElementById('pageBody');
const fire11 = (node, type) => node.dispatchEvent(new w11.Event(type, { cancelable: true }));
eq(dashCalls, [{ staffId: '', month: '' }], 'mở app → tải số liệu 1 lần');
assert.strictEqual(d11.getElementById('pageTitle').textContent, 'Tổng quan');
assert.strictEqual(b11().querySelector('[role="tab"][aria-selected="true"]').textContent, 'Số liệu');
const panels = () => Array.from(b11().querySelectorAll('.panel')).map((p) => p.textContent);
assert.match(panels()[0], /^Đơn đang mở2Đơn đang mở4Tổng số cần3Còn thiếuJO-0001 · 介護職株式会社テストthiếu 2Đã vào làm 1 · Chờ vào làm 1 · Còn thiếu 2 \/ cần 3/);
assert.match(panels()[1], /0Đã gửi khách1Chờ phỏng vấn/);
assert.match(panels()[2], /2026-11-12 10:001次 \(vòng 1\)NGUYEN VAN GIAJO-0001 · 介護職 · 株式会社テスト/);
assert.match(panels()[3], /chưa có ngàyNGUYEN VAN GIA/);
assert.match(panels()[4], /Tháng 2026-11 \(JST\)1Vào làm0Nghỉ việc3Gửi khách/);
assert.match(panels()[5], /1Đang làm2Chờ vào làm1Đang ứng tuyển0Đã nghỉ1Chưa có/);
assert.strictEqual(b11().querySelector('input[type="month"]').value, '2026-11');
// Lọc người phụ trách + đổi tháng → tải lại với đúng bộ lọc.
const dStaff = b11().querySelector('.filters select');
assert.match(dStaff.textContent, /Nghỉ Giả 2 \(đã nghỉ\)/);
dStaff.value = 's1'; fire11(dStaff, 'change');
const dMonth = b11().querySelector('input[type="month"]');
dMonth.value = '2026-10'; fire11(dMonth, 'change');
eq(dashCalls.slice(-2), [{ staffId: 's1', month: '2026-11' }, { staffId: 's1', month: '2026-10' }]);
// Bấm "Còn thiếu" → trang Đơn tuyển lọc sẵn Đang mở + người phụ trách.
Array.from(b11().querySelectorAll('button.kpi')).find((b) => /Còn thiếu/.test(b.textContent)).click();
assert.strictEqual(d11.getElementById('pageTitle').textContent, 'Đơn tuyển');
const jf = Array.from(b11().querySelectorAll('.filters select'));
eq([jf.find((x) => x.getAttribute('aria-label') === 'Trạng thái đơn').value, jf.find((x) => x.getAttribute('aria-label') === 'Người phụ trách').value], ['dang_mo', 's1']);
// Quay lại Tổng quan, bấm tên người → hồ sơ.
d11.querySelector('[data-page="home"]').click();
Array.from(b11().querySelectorAll('.panel .link-btn')).find((b) => b.textContent === 'NGUYEN VAN GIA').click();
assert.strictEqual(d11.getElementById('pageTitle').textContent, 'Con người');
// 23. Pipeline (bước 4.2): tải khi mở thẻ; cột theo trạng thái; lọc; bấm thẻ → hồ sơ.
const plCalls = [];
dashServer.getPipeline = (f) => { plCalls.push(Object.assign({}, f)); return {
  today: '2026-11-15', statuses: ['da_gui', 'cho_pv', 'da_pv', 'naitei', 'naitei_shodaku', 'tam_dung'],
  columns: { da_gui: [{ id: 'a9', ma: 'APL-0009', person_id: 'p1', person: 'GIA BAY', job: 'JO-0001 · 介護職', company: '株式会社テスト', since: '2026-11-01', days: 14, recruiter: 'Sales Giả 1', next_interview: '' }],
    cho_pv: [{ id: 'a2', ma: 'APL-0002', person_id: 'p1', person: 'GIA HAI', job: 'JO-0001 · 介護職', company: '株式会社テスト', since: '2026-11-13', days: 2, recruiter: '', next_interview: '2026-11-20 10:00' }],
    da_pv: [], naitei: [], naitei_shodaku: [], tam_dung: [] },
  staff: [{ id: 's1', ho_ten: 'Sales Giả 1', inactive: false }],
  companies: [{ id: 'c1', label: 'CO-0001 · 株式会社テスト' }], jobs: f.companyId ? [{ id: 'j1', label: 'JO-0001 · 介護職', company_id: 'c1' }] : [{ id: 'j1', label: 'JO-0001 · 介護職' }, { id: 'j2', label: 'JO-0002 · X' }] }; };
d11.querySelector('[data-page="home"]').click();
Array.from(b11().querySelectorAll('[role="tab"]')).find((b) => b.textContent === 'Pipeline').click();
eq(plCalls, [{ staffId: '', companyId: '', jobId: '' }]);
const cols = () => Array.from(b11().querySelectorAll('.board .col'));
eq(cols().map((c) => c.querySelector('h3').textContent), ['Đã gửi khách (1)', 'Chờ phỏng vấn (1)', 'Đã phỏng vấn (0)', '内定 (0)', '内定承諾 (chờ vào làm) (0)', 'Tạm dừng (0)']);
assert.match(cols()[0].textContent, /GIA BAYJO-0001 · 介護職株式会社テスト14 ngày ở trạng thái này \(từ 2026-11-01\)Sales Giả 1/);
assert(cols()[0].querySelector('.msg-warn'), 'nằm từ 14 ngày → tô cảnh báo');
assert.match(cols()[1].textContent, /Phỏng vấn tới: 2026-11-20 10:00/);
const plSel = (label) => Array.from(b11().querySelectorAll('.filters select')).find((x) => x.getAttribute('aria-label') === label);
plSel('Đơn tuyển').value = 'j2'; plSel('Đơn tuyển').dispatchEvent(new w11.Event('change'));
plSel('Công ty').value = 'c1'; plSel('Công ty').dispatchEvent(new w11.Event('change'));
eq(plCalls.slice(-2), [{ staffId: '', companyId: '', jobId: 'j2' }, { staffId: '', companyId: 'c1', jobId: '' }], 'đổi công ty thì bỏ chọn đơn');
b11().querySelector('.pl-card').click();
assert.strictEqual(d11.getElementById('pageTitle').textContent, 'Con người');
// 24. Việc cần làm (bước 4.3): thẻ tự sinh, quá hạn tô đỏ, liên kết; Cài đặt sửa số ngày.
const tkCalls = [];
dashServer.getTasks = (f) => { tkCalls.push(Object.assign({}, f)); return { today: '2026-12-05', staff: [{ id: 's1', ho_ten: 'Sales Giả 1', inactive: false }], rules: {}, tasks: [
  { rule: 'sent_stale', date: '2026-11-27', overdue: true, person_id: 'p1', person: 'GUI LAU', job: 'JO-0002 · Đơn', company: 'C', days: 15, status: 'da_gui' },
  { rule: 'job_due', date: '2026-12-10', overdue: false, job_id: 'j1', job_ma: 'JO-0001', job: 'JO-0001 · 介護職', company: '株式会社テスト', missing: 2, need: 3 },
  { rule: 'visa_expiry', date: '2026-12-01', overdue: true, person_id: 'p2', person: 'VISA HET', days: -4 },
  { rule: 'passport_expiry', date: '2027-05-01', overdue: false, person_id: 'p3', person: 'HO CHIEU', days: 147 }] }; };
d11.querySelector('[data-page="home"]').click();
Array.from(b11().querySelectorAll('[role="tab"]')).find((b) => b.textContent === 'Việc cần làm').click();
eq(tkCalls, [{ staffId: '' }]);
const tItems = () => Array.from(b11().querySelectorAll('ul.tasks li'));
assert.match(b11().textContent, /4 việc, trong đó 2 việc đã quá hạn\./);
assert(tItems()[0].classList.contains('overdue'));
assert.match(tItems()[0].textContent, /2026-11-27Hỏi khách phản hồiGUI LAU đã gửi khách 15 ngày · JO-0002 · ĐơnMở hồ sơ/);
assert.match(tItems()[1].textContent, /2026-12-10Đơn sắp tới hạn còn thiếuJO-0001 · 介護職 · 株式会社テスト: còn thiếu 2\/3, dự kiến vào làm 2026-12-10Mở đơn/);
assert.match(tItems()[2].textContent, /Hạn lưu trú \(在留期限\)VISA HET: hạn lưu trú 2026-12-01 — ĐÃ HẾT 4 ngàyMở hồ sơ/);
assert.match(tItems()[3].textContent, /HO CHIEU: hạn hộ chiếu 2027-05-01, còn 147 ngày/);
Array.from(tItems()[1].querySelectorAll('button')).find((b) => b.textContent === 'Mở đơn').click();
assert.strictEqual(d11.getElementById('pageTitle').textContent, 'Đơn tuyển');
assert.strictEqual(b11().querySelector('input[type="search"]').value, 'JO-0001');
w11.close();

const tsCalls = [];
const tplData = { nintei: { ids: ['g1', 'g2'], custom: false, sua_luc: '' }, henko: { ids: ['g1'], custom: true, sua_luc: 'c0' }, koshin: { ids: [], custom: true, sua_luc: 'c0' }, khac: { ids: [], custom: false, sua_luc: '' } };
let tsData = { sent_stale: { on: true, days: 7, sua_luc: '', defaults: { on: true, days: 7 } }, new_profile: { on: true, days: 3, sua_luc: 'x1', defaults: { on: true, days: 3 } } };
const tsServer = {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 9 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  listRecords: (table) => (table === 'LOOKUP' ? [{ id: 'g1', ma: 'DM-0070', loai: 'giay_to', ten_vi: 'Hộ chiếu giả', ten_ja: '', tu_ngay: '', den_ngay: '', da_an: '' }, { id: 'g2', ma: 'DM-0071', loai: 'giay_to', ten_vi: 'Ảnh giả', ten_ja: '', tu_ngay: '', den_ngay: '', da_an: '' }] : []),
  getTaskSettings: () => JSON.parse(JSON.stringify(tsData)),
  getChecklistTemplates: () => JSON.parse(JSON.stringify(tplData)),
  saveChecklistTemplate: (loai, ids, suaLuc) => { tsCalls.push(['tpl', loai, ids, suaLuc]); tplData[loai] = { ids: ids, custom: true, sua_luc: 'c1' }; },
  saveTaskSetting: (rule, on, days, suaLuc) => {
    tsCalls.push([rule, on, days, suaLuc]);
    if (days === '999') throw new Error('VALIDATION|{"field":"days","code":"dayRange"}');
    tsData[rule] = Object.assign({}, tsData[rule], { on: on, days: Number(days), sua_luc: 'x2' });
  },
};
const w12 = open({}, tsServer);
const d12 = w12.document;
d12.querySelector('[data-page="settings"]').click();
const tsBox = () => d12.querySelector('section[aria-labelledby="tset-h"]');
const tsRows = () => Array.from(tsBox().querySelectorAll('tbody tr'));
assert.match(tsRows()[0].textContent, /Hỏi khách phản hồiLần giới thiệu ở "Đã gửi khách" quá N ngày\.mặc định 7/);
const n0 = tsRows()[0].querySelector('input[type="number"]');
n0.value = '999'; n0.dispatchEvent(new w12.Event('input'));
Array.from(tsRows()[0].querySelectorAll('button')).find((b) => b.textContent === 'Lưu').click();
assert.match(tsBox().textContent, /Số ngày phải là số nguyên từ 0 đến 365\./);
const n1 = tsRows()[0].querySelector('input[type="number"]');
n1.value = '10'; n1.dispatchEvent(new w12.Event('input'));
const cb1 = tsRows()[1].querySelector('input[type="checkbox"]');
cb1.checked = false; cb1.dispatchEvent(new w12.Event('change'));
Array.from(tsRows()[0].querySelectorAll('button')).find((b) => b.textContent === 'Lưu').click();
Array.from(tsRows()[1].querySelectorAll('button')).find((b) => b.textContent === 'Lưu').click();
eq(tsCalls, [['sent_stale', true, '999', ''], ['sent_stale', true, '10', ''], ['new_profile', false, '3', 'x1']]);
assert.strictEqual(tsRows()[0].querySelector('input[type="number"]').value, '10');
// Mẫu checklist (bước 6.3): chọn thủ tục, tick giấy tờ, lưu kèm sua_luc.
const tplBox = () => d12.querySelector('section[aria-labelledby="vtpl-h"]');
assert.match(tplBox().textContent, /Chưa lưu mẫu cho thủ tục này/);
const tplSel = tplBox().querySelector('select');
tplSel.value = 'henko'; tplSel.dispatchEvent(new w12.Event('change'));
assert(!/Chưa lưu mẫu/.test(tplBox().textContent));
eq(Array.from(tplBox().querySelectorAll('input[type="checkbox"]')).map((c) => [c.value, c.checked]), [['g1', true], ['g2', false]]);
const cbG2 = tplBox().querySelectorAll('input[type="checkbox"]')[1];
cbG2.checked = true; cbG2.dispatchEvent(new w12.Event('change'));
Array.from(tplBox().querySelectorAll('button')).find((b) => b.textContent === 'Lưu').click();
eq(tsCalls.slice(-1)[0], ['tpl', 'henko', ['g1', 'g2'], 'c0']);
assert.match(tplBox().textContent, /Đã lưu mẫu\./);
w12.close();

// 25. Hồ sơ visa (bước 6.2): trang danh sách (ẩn hồ sơ đã kết thúc), thêm, lỗi theo ô, mục trong hồ sơ người.
const vsData = {
  IMMIGRATION_CASE: [
    { id: 'v1', ma: 'VS-0001', person_id: 'p1', loai_thu_tuc: 'koshin', tu_cach_luu_tru: 't1', company_id: 'c1', trang_thai: 'da_nop', ngay_nop: '2026-10-01',
      noi_nop: '名古屋', ngay_ket_qua: '', han_moi: '', phu_trach_staff_id: 's1', ghi_chu: '', sua_luc: 'v', da_an: '' },
    { id: 'v2', ma: 'VS-0002', person_id: 'p1', loai_thu_tuc: 'nintei', tu_cach_luu_tru: '', company_id: '', trang_thai: 'duoc_cap', ngay_nop: '2025-01-01',
      noi_nop: '', ngay_ket_qua: '2025-03-01', han_moi: '', phu_trach_staff_id: '', ghi_chu: '', sua_luc: 'v', da_an: '' }],
  PERSON: [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'VISA GIA', ngay_sinh: '2000-01-01', quoc_tich: '', trang_thai_sang_loc: 'san_sang', han_luu_tru: '2026-11-30',
    han_ho_chieu: '', recruiter_staff_id: '', ky_nang: '', sua_luc: 'p', da_an: '' }],
  STAFF: [{ id: 's1', ma: 'STF-0001', ho_ten: 'Sales Giả 1', trang_thai: 'dang_lam', da_an: '' }],
  LOOKUP: [{ id: 't1', ma: 'DM-0040', loai: 'tu_cach_luu_tru', ten_vi: 'Kỹ năng đặc định 1', ten_ja: '特定技能1号', tu_ngay: '', den_ngay: '', da_an: '' }],
  COMPANY: [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: '株式会社テスト', da_an: '' }],
  APPLICATION: [], JOB_ORDER: [], EMPLOYMENT: [],
  CASE_DOCUMENT: [
    { id: 'd1', ma: 'CD-0001', case_id: 'v1', giay_to: 'g1', trang_thai: 'chua_co', ngay_nhan: '', ghi_chu: '', sua_luc: 'd', da_an: '' },
    { id: 'd2', ma: 'CD-0002', case_id: 'v1', giay_to: 'g2', trang_thai: 'khong_can', ngay_nhan: '', ghi_chu: '', sua_luc: 'd', da_an: '' }],
  SUPPORT_LOG: [{ id: 'h1', ma: 'HT-0001', person_id: 'p1', employment_id: '', loai_ho_tro: 'tu_van', ngay: '2026-09-01', hinh_thuc: 'dien_thoai', staff_id: 's1',
    noi_dung: 'Hỏi về thuế giả\ndòng 2', ghi_chu: '', sua_luc: 'h', da_an: '' }],
  FILE: [{ id: 'f1', ma: 'FL-0001', loai_doi_tuong: 'CASE_DOCUMENT', doi_tuong_id: 'd1', loai_giay_to: 'g1', ten_file: 'ho_chieu_gia.pdf', mime: 'application/pdf',
    kich_thuoc: '204800', tao_luc: '', sua_luc: 'f', da_an: '' }],
};
vsData.LOOKUP.push({ id: 'g1', ma: 'DM-0070', loai: 'giay_to', ten_vi: 'Hộ chiếu giả', ten_ja: '', tu_ngay: '', den_ngay: '', da_an: '' },
  { id: 'g2', ma: 'DM-0071', loai: 'giay_to', ten_vi: 'Ảnh giả', ten_ja: '', tu_ngay: '', den_ngay: '', da_an: '' },
  { id: 'g3', ma: 'DM-0072', loai: 'giay_to', ten_vi: 'Hợp đồng giả', ten_ja: '', tu_ngay: '', den_ngay: '', da_an: '' });
const vsCalls = [];
const w13 = open({}, {
  listRecords: (table) => vsData[table].map((r) => Object.assign({}, r)),
  getPersonDocs: () => ({ so_ho_chieu: '', so_zairyu_card: '', revealed: false }),
  createRecord: (table, data) => {
    vsCalls.push([table, Object.assign({}, data)]);
    if (table === 'SUPPORT_LOG') { if (!data.noi_dung) throw new Error('VALIDATION|{"field":"noi_dung","code":"required"}'); vsData.SUPPORT_LOG.push(Object.assign({ id: 'h2', ma: 'HT-0002', sua_luc: 'h', da_an: '' }, data)); return; }
    if (data.trang_thai === 'da_nop' && !data.ngay_nop) throw new Error('VALIDATION|{"field":"ngay_nop","code":"required"}');
    if (table === 'CASE_DOCUMENT') return;
    vsData.IMMIGRATION_CASE.push(Object.assign({ id: 'v3', ma: 'VS-0003', sua_luc: 'v', da_an: '' }, data));
  },
  updateRecord: (table, id, data, suaLuc) => { vsCalls.push(['update', table, id, Object.assign({}, data), suaLuc]); },
  setHidden: (table, id, hidden, suaLuc) => { vsCalls.push(['hide', table, id, hidden, suaLuc]); },
  getFileLink: (id) => { vsCalls.push(['link', id]); return { url: 'https://drive.example.test/' + id }; },
  uploadCaseFile: (docId, file) => { vsCalls.push(['upload', docId, file.name, file.mime, file.base64]); },
});
const d13 = w13.document;
w13.scrollTo = () => {};
const b13 = () => d13.getElementById('pageBody');
d13.querySelector('[data-page="visa"]').click();
assert.strictEqual(d13.getElementById('pageTitle').textContent, 'Hồ sơ visa');
const vsRows = () => Array.from(b13().querySelectorAll('table.cards tbody tr'));
eq(vsRows().map((r) => r.firstChild.textContent), ['VS-0001'], 'hồ sơ đã kết thúc ẩn mặc định');
assert(!b13().querySelector('.msg-err'), 'tải đủ 6 danh sách không lỗi');
// Checklist giấy tờ (bước 6.3): tiến độ, đổi trạng thái tự điền ngày nhận, lưu từng dòng giữ dòng đang sửa dở, thêm, bỏ.
assert.match(vsRows()[0].textContent, /1\/2 xong/);
vsRows()[0].querySelector('button[aria-expanded]').click();
const ckBox = () => b13().querySelector('section[aria-labelledby="visa-docs-h"]');
const ckRows = () => Array.from(ckBox().querySelectorAll('tbody tr'));
assert.match(ckBox().querySelector('h3').textContent, /Checklist giấy tờ · VS-0001/);
assert(ckRows()[1].classList.contains('done-row'));
const st1 = ckRows()[0].querySelector('select');
st1.value = 'da_nhan'; st1.dispatchEvent(new w13.Event('change'));
assert.match(ckRows()[0].querySelector('input[type="date"]').value, /^\d{4}-\d{2}-\d{2}$/);
const nt2 = ckRows()[1].querySelector('input:not([type])');
nt2.value = 'đang sửa dở'; nt2.dispatchEvent(new w13.Event('input'));
const today13 = ckRows()[0].querySelector('input[type="date"]').value;
Array.from(ckRows()[0].querySelectorAll('button')).find((b) => b.textContent === 'Lưu').click();
eq(vsCalls.slice(-1)[0], ['update', 'CASE_DOCUMENT', 'd1', { trang_thai: 'da_nhan', ngay_nhan: today13, ghi_chu: '', ben_cung_cap: '', ngay_yeu_cau: '', han_nhan: '', nguoi_kiem_tra: '', noi_dung_sua: '', link: '' }, 'd']);
assert.strictEqual(ckRows()[1].querySelector('input:not([type])').value, 'đang sửa dở', 'dòng khác đang sửa dở được giữ');
// Tệp (bước 6.4): bấm tên → lấy link (máy chủ ghi nhật ký) → hiện link mở tab mới; sai loại bị chặn ngay; tải lên gửi base64; bỏ = ẩn.
assert.match(ckRows()[0].textContent, /ho_chieu_gia\.pdf 200 KB/);
ckRows()[0].querySelector('button[aria-label="Lấy link mở ho_chieu_gia.pdf"]').click();
const fLink = ckRows()[0].querySelector('a[target="_blank"]');
eq([fLink.href, fLink.rel, vsCalls.slice(-1)[0]], ['https://drive.example.test/f1', 'noopener', ['link', 'f1']]);
const upIn = () => ckRows()[0].querySelector('input[type="file"]');
const pick = (file) => { Object.defineProperty(upIn(), 'files', { value: [file], configurable: true }); upIn().dispatchEvent(new w13.Event('change')); };
// FileReader giả chạy đồng bộ (jsdom đọc tệp bất đồng bộ).
w13.FileReader = class { readAsDataURL(f) { this.result = 'data:' + f.type + ';base64,' + Buffer.from(f.text).toString('base64'); this.onload(); } };
const fakeFile = (text, name, type) => ({ text: text, name: name, type: type, size: text.length });
const nCalls = vsCalls.length;
pick(fakeFile('MZ', 'virus.exe', 'application/x-msdownload'));
assert.match(b13().querySelector('div.msg-err').textContent, /chỉ nhận PDF, JPG, PNG/);
assert.strictEqual(vsCalls.length, nCalls, 'sai loại → không gửi máy chủ');
pick(Object.assign(fakeFile('x', 'to.pdf', 'application/pdf'), { size: 10 * 1024 * 1024 + 1 }));
assert.match(b13().querySelector('div.msg-err').textContent, /tối đa 10MB/);
assert.strictEqual(vsCalls.length, nCalls, 'quá 10MB → không gửi máy chủ');
pick(fakeFile('%PDF-1.4', 'hop_dong.pdf', 'application/pdf'));
eq(vsCalls.slice(-1)[0], ['upload', 'd1', 'hop_dong.pdf', 'application/pdf', Buffer.from('%PDF-1.4').toString('base64')]);
ckRows()[0].querySelector('button[aria-label="Bỏ ho_chieu_gia.pdf"]').click();
eq(vsCalls.slice(-1)[0], ['hide', 'FILE', 'f1', true, 'f']);
const addSel = ckBox().querySelector('.filters select');
eq(Array.from(addSel.options).map((o) => o.value), ['', 'g3'], 'chỉ giấy tờ chưa có');
addSel.value = 'g3'; addSel.dispatchEvent(new w13.Event('change'));
Array.from(ckBox().querySelectorAll('button')).find((b) => b.textContent === 'Thêm').click();
eq(vsCalls.slice(-1)[0], ['CASE_DOCUMENT', { case_id: 'v1', giay_to: 'g3' }]);
Array.from(ckRows()[1].querySelectorAll('button')).find((b) => b.textContent === 'Bỏ khỏi checklist').click();
eq(vsCalls.slice(-1)[0], ['hide', 'CASE_DOCUMENT', 'd2', true, 'd']);
vsRows()[0].querySelector('button[aria-expanded]').click();
assert(!ckBox(), 'đóng checklist');
assert.match(vsRows()[0].textContent, /PER-0001 · VISA GIAGia hạn \(更新\)Kỹ năng đặc định 1Đã nộpđã chờ \d+ ngày2026-10-01/);
const vsEnded = Array.from(b13().querySelectorAll('label.check')).find((l) => /kết thúc/.test(l.textContent)).querySelector('input');
vsEnded.checked = true; vsEnded.dispatchEvent(new w13.Event('change'));
eq(vsRows().map((r) => r.firstChild.textContent), ['VS-0002', 'VS-0001'], 'mới nhất lên đầu');
Array.from(b13().querySelectorAll('button')).find((b) => b.textContent === 'Thêm hồ sơ visa').click();
const vsForm = () => b13().querySelector('#visa-form-h + form');
vsForm().dispatchEvent(new w13.Event('submit', { cancelable: true }));
assert.strictEqual(vsForm().querySelector('[aria-invalid="true"]').name, 'person_id');
assert.strictEqual(vsCalls.filter((c) => c[0] === 'IMMIGRATION_CASE').length, 0, 'thiếu người → không gọi máy chủ');
const vsSet = (name, v) => { const x = vsForm().querySelector('[name="' + name + '"]'); x.value = v; x.dispatchEvent(new w13.Event(x.tagName === 'SELECT' ? 'change' : 'input')); };
vsSet('person_id', 'p1'); vsSet('loai_thu_tuc', 'henko'); vsSet('trang_thai', 'da_nop');
vsForm().dispatchEvent(new w13.Event('submit', { cancelable: true }));
assert.match(vsForm().querySelector('[aria-invalid="true"]').name, /ngay_nop/);
vsSet('ngay_nop', '2026-10-10');
vsForm().dispatchEvent(new w13.Event('submit', { cancelable: true }));
eq(vsCalls.filter((c) => c[0] === 'IMMIGRATION_CASE').slice(-1)[0], ['IMMIGRATION_CASE', { person_id: 'p1', loai_thu_tuc: 'henko', tu_cach_luu_tru: '', company_id: '', trang_thai: 'da_nop', ngay_nop: '2026-10-10',
  noi_nop: '', ngay_ket_qua: '', han_moi: '', phu_trach_staff_id: '', ghi_chu: '' }]);
assert(!vsForm(), 'lưu xong đóng form');
// Bấm tên người → hồ sơ người có mục Hồ sơ visa (không có cột người); thêm từ đây thì người cố định.
vsRows().find((r) => r.firstChild.textContent === 'VS-0001').querySelector('.link-btn').click();
assert.strictEqual(d13.getElementById('pageTitle').textContent, 'Con người');
const vsBox = () => b13().querySelector('section[aria-labelledby="person-visa-h"]');
eq(Array.from(vsBox().querySelectorAll('tbody tr')).map((r) => r.firstChild.textContent), ['VS-0003', 'VS-0002', 'VS-0001']);
Array.from(vsBox().querySelectorAll('button')).find((b) => b.textContent === 'Thêm hồ sơ visa').click();
assert.match(vsBox().querySelector('form .readonly').textContent, /PER-0001 · VISA GIA/);
// Nhật ký hỗ trợ (bước 7.2): tải khi mở hồ sơ, mới nhất lên đầu, form mặc định 定期面談 + hôm nay, lưu.
const supBox = () => b13().querySelector('section[aria-labelledby="sup-h"]');
assert.match(supBox().textContent, /2026-09-01Tư vấn \/ khiếu nại \(相談・苦情\)Điện thoạiSales Giả 1Hỏi về thuế giả/);
Array.from(supBox().querySelectorAll('button')).find((b) => b.textContent === 'Ghi nhật ký hỗ trợ').click();
const supForm = () => supBox().querySelector('#sup-form-h + form');
eq([supForm().querySelector('[name="loai_ho_tro"]').value, /^\d{4}-\d{2}-\d{2}$/.test(supForm().querySelector('[name="ngay"]').value)], ['dinh_ky', true]);
supForm().dispatchEvent(new w13.Event('submit', { cancelable: true }));
assert.strictEqual(supForm().querySelector('[aria-invalid="true"]').name, 'noi_dung', 'thiếu nội dung → báo ở ô, không gọi máy chủ');
const nd = supForm().querySelector('[name="noi_dung"]'); nd.value = 'Gặp định kỳ giả'; nd.dispatchEvent(new w13.Event('input'));
supForm().dispatchEvent(new w13.Event('submit', { cancelable: true }));
const supCall = vsCalls.filter((c) => c[0] === 'SUPPORT_LOG');
eq([supCall.length, supCall[0][1].person_id, supCall[0][1].loai_ho_tro, supCall[0][1].noi_dung], [1, 'p1', 'dinh_ky', 'Gặp định kỳ giả']);
assert(!supForm(), 'lưu xong đóng form');
eq(Array.from(supBox().querySelectorAll('tbody tr')).length, 2);
w13.close();

// 26. Đang làm việc (bước 7.1): 1 lần gọi máy chủ, lọc, tìm tại chỗ, cảnh báo hạn lưu trú, mở hồ sơ.
const wkCalls = [];
const w14 = open({}, {
  getWorking: (f) => { wkCalls.push(Object.assign({}, f)); return { today: '2026-10-20', warnDays: 90, staff: [{ id: 's1', ho_ten: 'Hỗ trợ Giả', inactive: false }],
    companies: [{ id: 'c1', label: 'CO-0001 · 株式会社テスト' }], rows: [
      { person_id: 'p1', person_ma: 'PER-0001', person: 'DANG LAM GIA', company_id: 'c1', company: '株式会社テスト', job: 'JO-0001 · 介護職', ngay_vao_lam: '2025-04-01',
        state: 'dang_lam', months: 18, tu_cach: 't1', han_luu_tru: '2026-12-01', days_left: 42, visa_warn: true, support: 'Hỗ trợ Giả',
        last_support: '2026-07-20', next_support: '2026-10-18', support_warn: true },
      { person_id: 'p2', person_ma: 'PER-0002', person: 'CHO VAO GIA', company_id: 'c1', company: '株式会社テスト', job: 'JO-0001 · 介護職', ngay_vao_lam: '2026-11-01',
        state: 'cho_vao_lam', months: 0, tu_cach: '', han_luu_tru: '', days_left: null, visa_warn: false, support: '', last_support: '', next_support: '', support_warn: false }] }; },
  listRecords: (table) => (table === 'LOOKUP' ? [{ id: 't1', ma: 'DM-0040', loai: 'tu_cach_luu_tru', ten_vi: 'Kỹ năng đặc định 1', ten_ja: '特定技能1号', tu_ngay: '', den_ngay: '', da_an: '' }] : []),
  getPersonDocs: () => ({ so_ho_chieu: '', so_zairyu_card: '', revealed: false }),
});
const d14 = w14.document;
w14.scrollTo = () => {};
const b14 = () => d14.getElementById('pageBody');
d14.querySelector('[data-page="working"]').click();
assert.strictEqual(d14.getElementById('pageTitle').textContent, 'Đang làm việc');
eq(wkCalls, [{ companyId: '', staffId: '' }]);
assert(!b14().querySelector('div.msg-err'), 'không lỗi tải');
assert.match(b14().textContent, /1 người đang làm · 1 người chờ vào làm · 1 người sắp \/ đã hết hạn lưu trú · 1 người sắp tới hạn 定期面談/);
const wkRows = () => Array.from(b14().querySelectorAll('tbody tr'));
assert.match(wkRows()[0].textContent, /PER-0001 · DANG LAM GIA株式会社テストJO-0001 · 介護職Đang làm2025-04-0118 thángKỹ năng đặc định 12026-12-01còn 42 ngàyhạn 2026-10-18gần nhất 2026-07-20Hỗ trợ Giả/);
assert(wkRows()[0].querySelector('.msg-err'), 'hạn lưu trú gần → tô đỏ');
assert.match(wkRows()[1].textContent, /Chờ vào làm2026-11-01—/);
assert.strictEqual(wkRows()[0].querySelectorAll('td.msg-err').length, 2, 'hạn lưu trú + 定期面談 gần → tô đỏ');
const wkSearch = b14().querySelector('input[type="search"]');
wkSearch.value = 'cho vao'; wkSearch.dispatchEvent(new w14.Event('input'));
eq(wkRows().map((r) => r.querySelector('.link-btn').textContent), ['PER-0002 · CHO VAO GIA']);
assert.strictEqual(wkCalls.length, 1, 'tìm tại chỗ, không gọi lại máy chủ');
const wkStaff = Array.from(b14().querySelectorAll('.filters select')).find((x) => x.getAttribute('aria-label') === 'Support phụ trách');
wkStaff.value = 's1'; wkStaff.dispatchEvent(new w14.Event('change'));
eq(wkCalls.slice(-1)[0], { companyId: '', staffId: 's1' });
wkRows()[0].querySelector('.link-btn').click();
assert.strictEqual(d14.getElementById('pageTitle').textContent, 'Con người');
w14.close();

// 27. GĐ 5: hợp đồng trong chi tiết công ty, Cài đặt tài chính, trang Doanh số (cần lập, báo cáo, mục tiêu, khoản tay).
const fnCalls = [];
const fnData = {
  COMPANY: [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: '株式会社テスト', sales_staff_id: 's1', support_staff_id: '', linh_vuc: '', trang_thai: 'dang_giao_dich', sua_luc: 't', da_an: '' }],
  STAFF: [{ id: 's1', ma: 'STF-0001', ho_ten: 'Sales Giả', trang_thai: 'dang_lam', da_an: '' }, { id: 's2', ma: 'STF-0002', ho_ten: 'Recruiter Giả', trang_thai: 'dang_lam', da_an: '' }],
  LOOKUP: [], CONTACT: [], JOB_ORDER: [], APPLICATION: [], EMPLOYMENT: [],
  CONTRACT: [{ id: 'k1', ma: 'HD-0001', company_id: 'c1', tu_ngay: '2026-01-01', den_ngay: '', phi_gioi_thieu: '300000', chia_coc: 'Y', phi_ho_tro: '20000', bac_hoan: '30:100,90:50', ghi_chu: '', sua_luc: 'k', da_an: '' },
    { id: 'k0', ma: 'HD-0000', company_id: 'c1', tu_ngay: '2025-01-01', den_ngay: '2025-12-31', phi_gioi_thieu: '200000', chia_coc: '', phi_ho_tro: '0', bac_hoan: '', ghi_chu: '', sua_luc: 'k', da_an: '' }],
};
let todoRows = [
  { key: 'gioi_thieu|a1|e1|', loai: 'gioi_thieu', company_id: 'c1', company: '株式会社テスト', person_id: 'p1', person: 'GIA MOT', ngay: '2026-10-15', thang: '', so_tien: '300000', chia: 's2:50,s1:50', contract: 'HD-0001' },
  { key: 'hoan|a2|e2|', loai: 'hoan', company_id: 'c1', company: '株式会社テスト', person_id: 'p2', person: 'GIA HAI', ngay: '2026-11-10', thang: '', so_tien: '-300000', chia: 's2:50,s1:50', contract: 'HD-0001', days: 20, pct: 100 }];
const report = { month: '2026-11', total: 120000, target: 500000, byType: { gioi_thieu: 0, coc: 100000, con_lai: 0, ho_tro: 20000, hoan: 0, khac: 0 },
  series: [{ month: '2026-10', total: 300000, target: 0 }, { month: '2026-11', total: 120000, target: 500000 }],
  staff: [{ id: 's1', ho_ten: 'Sales Giả', inactive: false, actual: 50000, target: 0 }, { id: 's2', ho_ten: 'Recruiter Giả', inactive: false, actual: 50000, target: 100000 }],
  unassigned: 20000, items: [{ id: 'r1', ma: 'DS-0001', loai: 'coc', company: '株式会社テスト', person: 'GIA BA', ngay: '2026-11-05', thang: '', so_tien: '100000', chia: 's2:50,s1:50', invoice_id: '', invoice_ma: '', ghi_chu: '', sua_luc: 'r' },
    { id: 'r2', ma: 'DS-0002', loai: 'ho_tro', company: '株式会社テスト', person: 'GIA BA', ngay: '2026-11-01', thang: '2026-11', so_tien: '20000', chia: '', invoice_id: 'i1', invoice_ma: 'INV-0001', ghi_chu: '', sua_luc: 'r' }] };
const w15 = open({}, {
  listRecords: (table) => (fnData[table] || []).map((r) => Object.assign({}, r)),
  getUpcomingInterviews: () => [],
  createRecord: (table, data) => { fnCalls.push(['create', table, Object.assign({}, data)]); if (data.bac_hoan === 'x') throw new Error('VALIDATION|{"field":"bac_hoan","code":"refundTiers"}'); },
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 14 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  getTaskSettings: () => ({}), getChecklistTemplates: () => ({ nintei: { ids: [], custom: false, sua_luc: '' } }),
  getFinanceSettings: () => ({ tax: 10, split_recruiter: 50, referrer_amount: 0, due_days: 30, issuer_name: '', issuer_address: '', issuer_tno: '', bank: '', sua_luc: '' }),
  saveFinanceSettings: (data, suaLuc) => { fnCalls.push(['fin', Object.assign({}, data), suaLuc]); if (data.issuer_tno === 'T1') throw new Error('VALIDATION|{"field":"issuer_tno","code":"invalidFormat"}');
    return Object.assign({}, data, { sua_luc: 'f1' }); },
  getRevenueTodo: () => todoRows.map((r) => Object.assign({}, r)),
  applyRevenueTodo: (keys, skip, edits) => { fnCalls.push(['apply', keys, skip, edits]); todoRows = todoRows.filter((r) => keys.indexOf(r.key) < 0); return keys.map(() => ({})); },
  getSales: (f) => { fnCalls.push(['sales', f.month]); return JSON.parse(JSON.stringify(Object.assign({}, report, { month: f.month || '2026-11' }))); },
  saveTarget: (sid, m, v) => { fnCalls.push(['target', sid, m, v]); },
  saveRevenue: (id, data, suaLuc) => { fnCalls.push(['rev', id, Object.assign({}, data), suaLuc]); if (data.chia === 's1:50') throw new Error('VALIDATION|{"field":"chia","code":"split"}'); },
  setRevenueHidden: (id, h, suaLuc) => { fnCalls.push(['drop', id, h, suaLuc]); },
});
const d15 = w15.document;
w15.scrollTo = () => {};
const b15 = () => d15.getElementById('pageBody');
const btn15 = (text, root) => Array.from((root || b15()).querySelectorAll('button')).find((b) => b.textContent === text);
d15.querySelector('[data-page="company"]').click();
b15().querySelector('.link-btn').click();
const g27CtBox = () => b15().querySelector('section[aria-labelledby="ct-h"]');
const g27CtRows = () => Array.from(g27CtBox().querySelectorAll('tbody tr'));
eq(g27CtRows().map((r) => r.firstChild.textContent), ['HD-0001', 'HD-0000'], 'mới nhất lên đầu');
assert.match(g27CtRows()[0].textContent, /2026-01-01 → …đang áp dụng¥300,000Có — 1\/2 khi 内定承諾, 1\/2 khi vào làm¥20,000\/tháng≤30 ngày: 100% · ≤90 ngày: 50%/);
assert.match(g27CtRows()[1].textContent, /2025-01-01 → 2025-12-31¥200,000Không — thu 1 lần khi vào làm—/);
btn15('Thêm mức phí', g27CtBox()).click();
const g27CtForm = () => g27CtBox().querySelector('#ct-form-h ~ form');
const setF = (form, name, v) => { const x = form.querySelector('[name="' + name + '"]'); x.value = v; x.dispatchEvent(new w15.Event(x.tagName === 'SELECT' ? 'change' : 'input')); };
setF(g27CtForm(), 'phi_gioi_thieu', '350000'); setF(g27CtForm(), 'bac_hoan', 'x');
g27CtForm().dispatchEvent(new w15.Event('submit', { cancelable: true }));
assert.strictEqual(g27CtForm().querySelector('[aria-invalid="true"]').name, 'bac_hoan');
setF(g27CtForm(), 'bac_hoan', '60:80');
g27CtForm().dispatchEvent(new w15.Event('submit', { cancelable: true }));
const ctCall = fnCalls.filter((c) => c[1] === 'CONTRACT').slice(-1)[0][2];
eq([ctCall.company_id, ctCall.phi_gioi_thieu, ctCall.phi_ho_tro, ctCall.bac_hoan, ctCall.chia_coc], ['c1', '350000', '0', '60:80', '']);
// Cài đặt tài chính.
d15.querySelector('[data-page="settings"]').click();
const finBox = () => d15.querySelector('section[aria-labelledby="fin-h"]');
const finForm = () => finBox().querySelector('form');
setF(finForm(), 'issuer_tno', 'T1');
finForm().dispatchEvent(new w15.Event('submit', { cancelable: true }));
assert.strictEqual(finForm().querySelector('[aria-invalid="true"]').name, 'issuer_tno');
setF(finForm(), 'issuer_tno', 'T1234567890123');
finForm().dispatchEvent(new w15.Event('submit', { cancelable: true }));
assert.match(finBox().textContent, /Đã lưu\./);
eq(fnCalls.filter((c) => c[0] === 'fin').slice(-1)[0][1].issuer_tno, 'T1234567890123');
// Doanh số → Cần lập: sửa số tiền rồi lập 1 khoản; hoàn tiền tô vàng; lập tất cả.
d15.querySelector('[data-page="sales"]').click();
assert.strictEqual(d15.getElementById('pageTitle').textContent, 'Doanh số');
const tdRows = () => Array.from(b15().querySelectorAll('tbody tr'));
eq(tdRows().length, 2);
assert.match(tdRows()[0].textContent, /2026-10-15Phí giới thiệuHD-0001株式会社テストGIA MOT¥300,000Recruiter Giả 50% · Sales Giả 50%/);
assert(tdRows()[1].classList.contains('warn-row'));
assert.match(tdRows()[1].textContent, /nghỉ sau 20 ngày → hoàn 100%/);
assert.match(tdRows()[1].textContent, /−¥300,000/);
const amt = tdRows()[0].querySelector('input[type="number"]'); amt.value = '320000'; amt.dispatchEvent(new w15.Event('input'));
btn15('Lập', tdRows()[0]).click();
eq(fnCalls.filter((c) => c[0] === 'apply').slice(-1)[0], ['apply', ['gioi_thieu|a1|e1|'], false, { 'gioi_thieu|a1|e1|': { so_tien: '320000' } }]);
assert.match(b15().textContent, /Đã lập 1 khoản\./);
btn15('Lập tất cả (1)').click();
eq(fnCalls.filter((c) => c[0] === 'apply').slice(-1)[0].slice(0, 3), ['apply', ['hoan|a2|e2|'], false]);
assert.match(b15().textContent, /Không còn khoản nào cần lập\./);
// Báo cáo & mục tiêu.
Array.from(b15().querySelectorAll('[role="tab"]')).find((b) => b.textContent === 'Báo cáo & mục tiêu').click();
assert.match(b15().textContent, /¥120,000Doanh số tháng \(chưa thuế\)¥500,000Mục tiêu24%Đạt/);
const tgIn = b15().querySelector('input[aria-label="Mục tiêu Recruiter Giả"]');
tgIn.value = '150000'; tgIn.dispatchEvent(new w15.Event('input'));
b15().querySelector('button[aria-label="Lưu Mục tiêu Recruiter Giả"]').click();
eq(fnCalls.filter((c) => c[0] === 'target').slice(-1)[0], ['target', 's2', '2026-11', '150000']);
assert.match(b15().textContent, /Không chia cho ai: ¥20,000/);
const itRows = () => Array.from(b15().querySelectorAll('table.cards.many tbody tr'));
eq(itRows().map((r) => r.firstChild.textContent), ['DS-0001', 'DS-0002']);
assert(!btn15('Sửa', itRows()[1]), 'khoản đã vào hóa đơn: không sửa / bỏ');
assert.match(itRows()[1].textContent, /INV-0001/);
btn15('Bỏ', itRows()[0]).click();
eq(fnCalls.filter((c) => c[0] === 'drop').slice(-1)[0], ['drop', 'r1', true, 'r']);
btn15('Thêm khoản tay').click();
const rvForm = () => b15().querySelector('#rev-form-h ~ form');
setF(rvForm(), 'company_id', 'c1'); setF(rvForm(), 'so_tien', '50000');
btn15('+ Thêm người', rvForm()).click();
const spSel = rvForm().querySelector('.split-edit select'); spSel.value = 's1'; spSel.dispatchEvent(new w15.Event('change'));
const spPct = rvForm().querySelector('.split-edit input[type="number"]'); spPct.value = '50'; spPct.dispatchEvent(new w15.Event('input'));
rvForm().dispatchEvent(new w15.Event('submit', { cancelable: true }));
assert.match(rvForm().querySelector('.split-edit[aria-invalid="true"]').textContent, /tổng phải đúng 100%/);
const rv = fnCalls.filter((c) => c[0] === 'rev').slice(-1)[0];
eq([rv[1], rv[2].company_id, rv[2].loai, rv[2].so_tien, rv[2].chia], ['', 'c1', 'khac', '50000', 's1:50']);
w15.close();

// 28. GĐ 8: hóa đơn (tạo nháp, phát hành, hủy cần lý do, in), 入金, người giới thiệu, người có ghi người giới thiệu.
const ivCalls = [];
let g28IvList = [{ id: 'i1', ma: 'INV-0001', company_id: 'c1', company: '株式会社テスト', ngay_lap: '2026-11-25', han_tt: '2026-12-25', trang_thai: 'da_phat_hanh', total: 363000, paid: 300000, remain: 63000, state: 'qua_han', sua_luc: 'v' },
  { id: 'i2', ma: 'INV-0002', company_id: 'c1', company: '株式会社テスト', ngay_lap: '2026-12-01', han_tt: '2026-12-31', trang_thai: 'huy', total: 0, paid: 0, remain: 0, state: 'huy', sua_luc: 'v' }];
const ivDetail = (id) => ({
  invoice: id === 'i1' ? Object.assign({}, g28IvList[0], { tien_chua_thue: '330000', thue_suat: '10', tien_thue: '33000', tong: '363000', ghi_chu: '' })
    : { id: 'i3', ma: 'INV-0003', company: '株式会社テスト', ngay_lap: '2026-12-27', han_tt: '2027-01-26', trang_thai: 'nhap', state: 'nhap', preview_base: 20000, total: 22000, paid: 0, remain: 0, sua_luc: 'n', ghi_chu: '' },
  lines: [{ id: 'r1', ma: 'DS-0001', loai: 'gioi_thieu', ngay: '2026-10-15', thang: '', so_tien: '310000', ghi_chu: '', person: 'GIA MOT' },
    { id: 'r2', ma: 'DS-0002', loai: 'ho_tro', ngay: '2026-10-01', thang: '2026-10', so_tien: '20000', ghi_chu: '', person: 'GIA MOT' }],
  payments: id === 'i1' ? [{ id: 'y1', ma: 'NT-0001', invoice_id: 'i1', ngay: '2026-12-01', so_tien: '300000', ghi_chu: '', sua_luc: 'y' }] : [],
  company: { ten_phap_nhan: '株式会社テスト', ma_buu_dien: '460-0000', tinh_thanh: '愛知県', dia_chi: '名古屋市' },
  issuer: { issuer_name: '株式会社ギア（テスト）', issuer_address: '名古屋市中区', issuer_tno: 'T1234567890123', bank: '銀行 普通 0000000', tax: 10 } });
const w16 = open({}, {
  listRecords: (table) => (table === 'COMPANY' ? [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: '株式会社テスト', da_an: '' }]
    : table === 'REFERRER_PAYOUT' ? [{ id: 't1', ma: 'TGT-0001', person_id: 'p1', employment_id: 'e1', nguoi_nhan: 'GT Giả', so_tien: '30000', ngay_tra: '', ghi_chu: '', sua_luc: 't', da_an: '' }]
    : table === 'PERSON' ? [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'GIA MOT', da_an: '' }] : []),
  getFinanceSettings: () => ({ tax: 10, split_recruiter: 50, referrer_amount: 30000, due_days: 30, sua_luc: 'f' }),
  listInvoices: () => g28IvList.map((x) => Object.assign({}, x)),
  getInvoice: (id) => ivDetail(id),
  getUninvoiced: (cid) => [{ id: 'r9', ma: 'DS-0009', loai: 'ho_tro', ngay: '2026-11-01', thang: '2026-11', so_tien: '20000', ghi_chu: '', person: 'GIA MOT' },
    { id: 'r8', ma: 'DS-0008', loai: 'khac', ngay: '2026-11-03', thang: '', so_tien: '55000', ghi_chu: '', person: '' }],
  createInvoice: (cid, ids, lap, han, note) => { ivCalls.push(['create', cid, ids, lap, han, note]); return { id: 'i3' }; },
  issueInvoice: (id, sl) => { ivCalls.push(['issue', id, sl]); },
  cancelInvoice: (id, sl, why) => { ivCalls.push(['cancel', id, sl, why]); if (!why) throw new Error('VALIDATION|{"field":"ly_do","code":"required"}'); },
  createRecord: (table, data) => { ivCalls.push(['create', table, Object.assign({}, data)]); },
  updateRecord: (table, id, data, sl) => { ivCalls.push(['update', table, id, Object.assign({}, data), sl]); },
  setHidden: (table, id, h, sl) => { ivCalls.push(['hide', table, id, h, sl]); },
  getPayoutTodo: () => [{ person_id: 'p2', person: 'GIA HAI', employment_id: 'e2', ngay_vao_lam: '2027-01-05', company: '株式会社テスト', nguoi_nhan: 'GT Hai', so_tien: '30000' }],
});
const d16 = w16.document;
w16.scrollTo = () => {};
let printed = 0; w16.print = () => { printed++; };
const b16 = () => d16.getElementById('pageBody');
const btn16 = (text, root) => Array.from((root || b16()).querySelectorAll('button')).find((b) => b.textContent === text);
d16.querySelector('[data-page="invoice"]').click();
assert.strictEqual(d16.getElementById('pageTitle').textContent, 'Hóa đơn & 入金');
const ivRows = () => Array.from(b16().querySelectorAll('tbody tr'));
assert.match(ivRows()[0].textContent, /INV-0001株式会社テスト2026-11-252026-12-25¥363,000¥300,000¥63,000Quá hạn/);
assert(ivRows()[0].classList.contains('warn-row'));
assert.match(ivRows()[1].textContent, /INV-0002.*——Đã hủy/);
const stSel = b16().querySelector('.filters select'); stSel.value = 'huy'; stSel.dispatchEvent(new w16.Event('change'));
eq(ivRows().map((r) => r.firstChild.textContent), ['INV-0002']);
stSel.value = ''; stSel.dispatchEvent(new w16.Event('change'));
// Tạo nháp: chọn công ty → các khoản chưa vào hóa đơn (mặc định chọn hết), bỏ 1, xem tạm tính.
btn16('Tạo hóa đơn').click();
const nf = () => b16().querySelector('#inv-new-h + form');
const g28CoSel = nf().querySelector('select[name="company_id"]'); g28CoSel.value = 'c1'; g28CoSel.dispatchEvent(new w16.Event('change'));
assert.match(nf().textContent, /Tạm tính: ¥75,000 \+ thuế 10% ¥7,500 = ¥82,500/);
nf().querySelectorAll('input[type="checkbox"]')[1].checked = false; nf().querySelectorAll('input[type="checkbox"]')[1].dispatchEvent(new w16.Event('change'));
assert.match(nf().textContent, /¥20,000 \+ thuế 10% ¥2,000 = ¥22,000/);
nf().dispatchEvent(new w16.Event('submit', { cancelable: true }));
eq(ivCalls.slice(-1)[0].slice(0, 3), ['create', 'c1', ['r9']]);
// Mở nháp → in ghi 下書き; phát hành.
assert.match(b16().querySelector('.print-area').textContent, /請求書（下書き）/);
assert(b16().querySelector('.msg-warn'), 'ghi chú bản nháp');
btn16('Phát hành').click();
eq(ivCalls.slice(-1)[0], ['issue', 'i3', 'n']);
// Hóa đơn đã phát hành: bản in đủ mục 適格請求書; in; 入金; hủy cần lý do.
btn16('← Danh sách hóa đơn').click();
btn16('Xem', ivRows()[0]).click();
const sheet = b16().querySelector('.print-area').textContent;
['株式会社テスト 御中', '登録番号：T1234567890123', '発行日：2026-11-25', 'ご請求金額（税込）　¥363,000', '人材紹介手数料', '登録支援委託費（2026年10月分）', '10% 対象（税抜）¥330,000', '消費税（10%）¥33,000', 'お振込先']
  .forEach((x) => assert(sheet.indexOf(x) >= 0, x));
btn16('In / lưu PDF').click();
assert.strictEqual(printed, 1);
assert.match(b16().textContent, /入金 — đã thu ¥300,000, còn lại ¥63,000/);
btn16('Ghi 入金').click();
const payForm = () => b16().querySelector('section[aria-labelledby="pay-h"] form');
assert.strictEqual(payForm().querySelector('[name="so_tien"]').value, '63000', 'mặc định = còn lại');
payForm().dispatchEvent(new w16.Event('submit', { cancelable: true }));
eq(ivCalls.slice(-1)[0][1], 'PAYMENT');
eq(ivCalls.slice(-1)[0][2].invoice_id, 'i1');
btn16('Hủy hóa đơn').click();
btn16('Xác nhận hủy').click();
assert.match(b16().querySelector('div.msg-err').textContent, /Lý do/);
// Người giới thiệu.
Array.from(b16().querySelectorAll('[role="tab"]')).find((b) => b.textContent === 'Người giới thiệu').click();
assert.match(b16().textContent, /Cần lập \(1\)2027-01-05 · GIA HAI → 株式会社テスト · Người nhận: GT Hai/);
btn16('Lập').click();
eq(ivCalls.slice(-1)[0], ['create', 'REFERRER_PAYOUT', { person_id: 'p2', employment_id: 'e2', nguoi_nhan: 'GT Hai', so_tien: '30000' }]);
assert.match(b16().textContent, /Khoản phải trả — 1 chưa trả/);
btn16('Đã trả hôm nay').click();
eq(ivCalls.slice(-1)[0].slice(0, 3), ['update', 'REFERRER_PAYOUT', 't1']);
assert.match(ivCalls.slice(-1)[0][3].ngay_tra, /^\d{4}-\d{2}-\d{2}$/);
w16.close();

// 29. 9a/9b: nhập CSV (đọc CSV có ngoặc kép / xuống dòng, tự ghép cột theo nhãn VI/JA, đổi nhãn → mã, kiểm tra → nhập theo lô), xuất dữ liệu.
const imCalls = [];
const w17 = open({}, {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 14 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  listRecords: () => [], getTaskSettings: () => ({}), getChecklistTemplates: () => ({ nintei: { ids: [], custom: false, sua_luc: '' } }),
  getFinanceSettings: () => ({ tax: 10, sua_luc: '' }),
  getImportFields: () => ({ STAFF: ['ho_ten', 'trang_thai'], COMPANY: ['ten_phap_nhan', 'trang_thai', 'sales_staff_id', 'ghi_chu'], CONTACT: [], JOB_ORDER: [], PERSON: [] }),
  importRows: (table, rows, dry) => { imCalls.push([table, rows, dry]); return { created: dry ? 0 : 1, results: rows.map((r, i) => (r.ten_phap_nhan === 'Lỗi' ? { row: i + 1, ok: false, error: { field: 'sales_staff_id', code: 'notFound', ma: 'Ai Đó' } } : { row: i + 1, ok: true, ma: dry ? undefined : 'CO-0001' })) }; },
  exportData: (kind, p) => { imCalls.push(['export', kind, p.month]); return { url: 'https://sheets.example.test/x', name: 'HR_EXPORT_' + kind, rows: 3 }; },
});
const d17 = w17.document;
d17.querySelector('[data-page="settings"]').click();
const parsed = w17.eval('parseCsv')('﻿Tên pháp nhân,Trạng thái,"Ghi chú"\r\n"Công ty ""A""",取引中,"dòng 1\ndòng 2"\n\nLỗi,,\n');
eq(parsed, [['Tên pháp nhân', 'Trạng thái', 'Ghi chú'], ['Công ty "A"', '取引中', 'dòng 1\ndòng 2'], ['Lỗi', '', '']]);
const impBox = () => d17.querySelector('section[aria-labelledby="imp-h"]');
const tSel = impBox().querySelector('select'); tSel.value = 'COMPANY'; tSel.dispatchEvent(new w17.Event('change'));
w17.FileReader = class { readAsText(f) { this.result = f.text; this.onload(); } };
const fin17 = impBox().querySelector('input[type="file"]');
Object.defineProperty(fin17, 'files', { value: [{ name: 'cty.csv', text: 'Tên pháp nhân,Trạng thái,Sales,Ghi chú\nCông ty A,取引中,Nguyễn Giả A,x\nLỗi,,Ai Đó,' }] });
fin17.dispatchEvent(new w17.Event('change'));
assert.match(impBox().textContent, /Đã đọc 2 dòng dữ liệu, 4 cột/);
const mapSel = () => Array.from(impBox().querySelectorAll('tbody select'));
eq(mapSel().map((x) => x.value), ['ten_phap_nhan', 'trang_thai', '', 'ghi_chu'], 'tự ghép theo nhãn; "Sales" không khớp nhãn nào');
mapSel()[2].value = 'sales_staff_id'; mapSel()[2].dispatchEvent(new w17.Event('change'));
const btn17 = (text) => Array.from(impBox().querySelectorAll('button')).find((b) => b.textContent === text);
assert(btn17('Nhập các dòng hợp lệ').disabled, 'phải kiểm tra trước');
btn17('Kiểm tra').click();
eq(imCalls[0], ['COMPANY', [{ ten_phap_nhan: 'Công ty A', trang_thai: 'dang_giao_dich', sales_staff_id: 'Nguyễn Giả A', ghi_chu: 'x' }, { ten_phap_nhan: 'Lỗi', trang_thai: '', sales_staff_id: 'Ai Đó', ghi_chu: '' }], true]);
assert.match(impBox().textContent, /Kiểm tra xong: 1 dòng hợp lệ, 1 dòng lỗi\.Dòng 3: Sales phụ trách: không tìm thấy "Ai Đó"\./);
btn17('Nhập các dòng hợp lệ').click();
eq(imCalls.slice(-1)[0][2], false);
assert.match(impBox().textContent, /Đã nhập 1 dòng\. 1 dòng lỗi không nhập\./);
// Xuất
const expBox = d17.querySelector('section[aria-labelledby="exp-h"]');
const mIn = expBox.querySelector('input[type="month"]'); mIn.value = '2026-10'; mIn.dispatchEvent(new w17.Event('change'));
Array.from(expBox.querySelectorAll('button')).find((b) => b.textContent === 'Doanh số tháng').click();
eq(imCalls.slice(-1)[0], ['export', 'sales', '2026-10']);
const expLink = d17.querySelector('section[aria-labelledby="exp-h"] a');
eq([expLink.href, expLink.target], ['https://sheets.example.test/x', '_blank']);
w17.close();

// 30. Mở app khi file dữ liệu còn cấu trúc cũ → băng nhắc nâng cấp trên mọi trang; bấm → Khởi tạo → băng biến mất.
let upVer = 9; let inits = 0;
const w18 = open({}, {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: upVer }),
  initTestData: () => { inits++; upVer = 14; return { initialized: true, items: [], schemaVersion: 14, created: [], warnings: [], upgraded: ['HR_DATA_TEST › FILE'], protectedCount: 0, seeded: 0, safetyBackup: 'x__pre-upgrade' }; },
});
w18.scrollTo = () => {};
const up = () => w18.document.getElementById('upgradeBox');
assert(!up().hidden, 'cấu trúc 9 < 14 → hiện băng');
assert.match(up().textContent, /còn cấu trúc 9/);
w18.document.querySelector('[data-page="working"]').click();
assert(!up().hidden, 'vẫn hiện ở trang khác');
Array.from(up().querySelectorAll('button')).find((b) => b.textContent === 'Nâng cấp ngay (Khởi tạo)').click();
eq([inits, up().hidden, w18.document.getElementById('pageTitle').textContent], [1, true, 'Cài đặt']);
w18.close();
const w19 = open({}, { getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 14 }) });
assert(w19.document.getElementById('upgradeBox').hidden, 'đúng phiên bản → không hiện');
w19.close();

// 31. D-073 / D-074: thẻ Tỷ lệ chuyển đổi, việc 定期届出 + nút Đã nộp, phiếu giới thiệu (không có liên lạc / số giấy tờ, có nhật ký).
const g31 = [];
const w20 = open({}, {
  getDashboard: () => ({ today: '2027-04-05', month: '2027-04', staffId: '', staff: [], openJobs: { count: 0, need: 0, missing: 0, top: [] }, pipeline: {}, interviews: [], waiting: [], monthStats: { started: 0, left: 0, sent: 0 }, lifecycle: {} }),
  getConversion: (f) => { g31.push(['cv', Object.assign({}, f)]); return { from: f.from || '2026-11', to: f.to || '2027-04', stages: ['gui', 'pv', 'naitei', 'shodaku', 'vao_lam'], total: [10, 6, 3, 3, 2],
    byStaff: [{ id: 's1', ho_ten: 'Recruiter Giả', counts: [10, 6, 3, 3, 2] }], staff: [{ id: 's1', ho_ten: 'Recruiter Giả', inactive: false }] }; },
  getTasks: () => ({ today: '2027-04-05', staff: [], rules: {}, tasks: [{ rule: 'todokede', date: '2027-05-31', overdue: false, company_id: 'c1', company: '株式会社テスト', year: 2027, from: '2026-04-01', to: '2027-03-31' }] }),
  markTodokede: (cid, y) => { g31.push(['mark', cid, y]); return {}; },
  listRecords: (table) => ({
    PERSON: [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'NGUYEN VAN GIA', ho_ten_katakana: 'グエン', ngay_sinh: '2000-06-15', gioi_tinh: 'nam', quoc_tich: 'q1', so_dien_thoai: '080-1111-2222',
      email: 'gia@example.test', dia_chi: 'Địa chỉ giả', noi_o: 'nhat', tu_cach_luu_tru: 't1', han_luu_tru: '2027-09-01', tieng_nhat: 'n3', ky_nang: 'l1', trang_thai_sang_loc: 'san_sang', recruiter_staff_id: 's1', sua_luc: 'p', da_an: '' }],
    STAFF: [{ id: 's1', ma: 'STF-0001', ho_ten: 'Recruiter Giả', trang_thai: 'dang_lam', da_an: '' }],
    LOOKUP: [{ id: 'q1', loai: 'quoc_tich', ten_vi: 'Việt Nam', ten_ja: 'ベトナム', da_an: '' }, { id: 't1', loai: 'tu_cach_luu_tru', ten_vi: 'KNĐĐ 1', ten_ja: '特定技能1号', da_an: '' },
      { id: 'n3', loai: 'tieng_nhat', ten_vi: 'N3', ten_ja: 'N3', da_an: '' }, { id: 'l1', loai: 'linh_vuc', ten_vi: 'Điều dưỡng', ten_ja: '介護', da_an: '' }],
  })[table] || [],
  getPersonDocs: () => ({ so_ho_chieu: '****4567', so_zairyu_card: '', revealed: false }),
  getFinanceSettings: () => ({ tax: 10, issuer_name: '株式会社ギア（テスト）', sua_luc: '' }),
  logReferralSheet: (id) => { g31.push(['log', id]); return true; },
});
const d20 = w20.document;
w20.scrollTo = () => {};
let printed20 = 0; w20.print = () => { printed20++; };
const b20 = () => d20.getElementById('pageBody');
const tab20 = (name) => Array.from(b20().querySelectorAll('[role="tab"]')).find((b) => b.textContent === name).click();
tab20('Tỷ lệ chuyển đổi');
eq(g31[0], ['cv', { from: '', to: '', staffId: '' }]);
assert.match(b20().textContent, /Đã gửi khách10Phỏng vấn6 · 60% bậc trước内定3 · 50% bậc trước内定承諾3 · 100% bậc trướcVào làm2 · 67% bậc trước/);
assert.match(b20().textContent, /10 lần giới thiệu gửi trong khoảng tháng chọn; 20% đã vào làm\./);
const fromIn = b20().querySelector('input[aria-label="Gửi từ tháng"]'); fromIn.value = '2027-01'; fromIn.dispatchEvent(new w20.Event('change'));
eq(g31.slice(-1)[0], ['cv', { from: '2027-01', to: '2027-04', staffId: '' }]);
tab20('Việc cần làm');
assert.match(b20().textContent, /株式会社テスト: 定期届出 năm 2027 \(kỳ 2026-04-01 → 2027-03-31\), hạn 2027-05-31/);
b20().querySelector('button[aria-label="Đã nộp 株式会社テスト"]').click();
eq(g31.slice(-1)[0], ['mark', 'c1', 2027]);
// Phiếu giới thiệu
w20.eval('goPersonDetail')('p1');
Array.from(b20().querySelectorAll('button')).find((b) => b.textContent === 'Phiếu giới thiệu (in)').click();
const sheet20 = () => b20().querySelector('section[aria-labelledby="ref-h"] .print-area').textContent;
['人材紹介票', 'NGUYEN VAN GIA', 'グエン', 'ベトナム', '男', '特定技能1号', '2027-09-01', 'N3', '介護', '株式会社ギア（テスト）', '担当：Recruiter Giả']
  .forEach((x) => assert(sheet20().indexOf(x) >= 0, x));
assert.match(sheet20(), /2000-06-15（\d+歳）/);
['080-1111-2222', 'gia@example.test', 'Địa chỉ giả', '4567'].forEach((x) => assert(sheet20().indexOf(x) < 0, 'không có ' + x));
const cmt = b20().querySelector('section[aria-labelledby="ref-h"] textarea'); cmt.value = 'Chăm chỉ (giả)'; cmt.dispatchEvent(new w20.Event('input'));
assert(sheet20().indexOf('Chăm chỉ (giả)') >= 0, 'lời giới thiệu hiện ngay trên bản in');
Array.from(b20().querySelectorAll('section[aria-labelledby="ref-h"] button')).find((b) => b.textContent === 'In / lưu PDF').click();
eq([g31.slice(-1)[0], printed20], [['log', 'p1'], 1]);
w20.close();

// 32. GĐ 10 (D-075): mở bằng liên kết nhân viên → mọi lần gọi qua api(token, …); ẩn Doanh số / Hóa đơn / Cài đặt, hợp đồng phí, nút hiện số giấy tờ.
const apiCalls = [];
const staffInner = {
  getDashboard: () => ({ today: '2026-11-01', month: '2026-11', staffId: '', staff: [], openJobs: { count: 0, need: 0, missing: 0, top: [] }, pipeline: {}, interviews: [], waiting: [], monthStats: { started: 0, left: 0, sent: 0 }, lifecycle: {} }),
  listRecords: (table) => ({ COMPANY: [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: '株式会社テスト', linh_vuc: '', trang_thai: 'dang_giao_dich', sales_staff_id: '', support_staff_id: '', sua_luc: 't', da_an: '' }],
    PERSON: [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'GIA', ngay_sinh: '2000-01-01', quoc_tich: '', trang_thai_sang_loc: 'san_sang', ky_nang: '', sua_luc: 'p', da_an: '' }] })[table] || [],
  getUpcomingInterviews: () => [],
  getPersonDocs: (id, reveal) => ({ so_ho_chieu: '****4321', so_zairyu_card: '', revealed: false }),
};
const staffPage = html.replace('data-token="<?= token ?>" data-role="<?= role ?>" data-who="<?= who ?>"', 'data-token="tok123abc" data-role="nhan_vien" data-who="NV Giả"');
assert(staffPage !== html, 'thay được thuộc tính body');
const w21 = open({}, { api: (token, fn, args) => { apiCalls.push([token, fn]); if (fn === 'listRecords' && args[0] === 'CONTRACT') throw new Error('FORBIDDEN|CONTRACT'); return staffInner[fn](...args); } }, staffPage);
w21.scrollTo = () => {};
const d21 = w21.document;
assert(apiCalls.length && apiCalls.every((c) => c[0] === 'tok123abc'), 'mọi lần gọi kèm token qua api');
eq(['sales', 'invoice', 'settings'].map((p) => d21.querySelector('[data-page="' + p + '"]').hidden), [true, true, true]);
assert(!d21.querySelector('[data-page="company"]').hidden);
assert.match(d21.getElementById('whoBox').textContent, /^NV Giả · Nhân viên Đổi mật khẩuĐăng xuất$/);
d21.querySelector('[data-page="company"]').click();
d21.getElementById('pageBody').querySelector('.link-btn').click();
assert(!d21.querySelector('section[aria-labelledby="ct-h"]'), 'không có mục hợp đồng & phí');
assert(!d21.getElementById('pageBody').querySelector('.msg-err'), 'không gọi CONTRACT nên không lỗi');
w21.eval('goPersonDetail')('p1');
const g32DocsBox = d21.querySelector('section[aria-labelledby="person-docs-h"]');
assert(!Array.from(g32DocsBox.querySelectorAll('button')).some((b) => b.textContent === 'Hiện số đầy đủ' || /Hiện/.test(b.textContent)), 'không có nút hiện số');
assert.match(g32DocsBox.textContent, /\*\*\*\*4321/);
w21.close();

// 33. GĐ 10 + 12.1: chủ đặt mật khẩu tạm / khóa đăng nhập, đổi vai trò trong Cài đặt → Nhân viên; mật khẩu tạm chỉ hiện một lần.
const acCalls = [];
let acRows = [{ id: 's1', ma: 'STF-0001', ho_ten: 'NV Giả', trang_thai: 'dang_lam', vai_tro: 'nhan_vien', khoa_luc: '', sua_luc: 'x', da_an: '' },
  { id: 's2', ma: 'STF-0002', ho_ten: 'Nghỉ Giả', trang_thai: 'da_nghi', vai_tro: 'nhan_vien', khoa_luc: '', sua_luc: 'x', da_an: '' }];
const w22 = open({}, {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 15 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  listRecords: (table) => (table === 'STAFF' ? acRows.map((r) => Object.assign({}, r)) : []),
  getTaskSettings: () => ({}), getChecklistTemplates: () => ({ nintei: { ids: [], custom: false, sua_luc: '' } }), getFinanceSettings: () => ({ tax: 10, sua_luc: '' }),
  getImportFields: () => ({ STAFF: [], COMPANY: [], CONTACT: [], JOB_ORDER: [], PERSON: [] }),
  setStaffPassword: (id) => { acCalls.push(['issue', id]); acRows[0].khoa_luc = '2026-11-01 09:00:00'; return { id: 'STF-0001', password: 'abc123def456' }; },
  revokeAccess: (id) => { acCalls.push(['revoke', id]); acRows[0].khoa_luc = ''; },
  updateRecord: (table, id, data, sl) => { acCalls.push(['update', table, id, Object.assign({}, data)]); },
});
const d22 = w22.document;
d22.querySelector('[data-page="settings"]').click();
const stBox = () => d22.querySelector('section[aria-labelledby="staff-h"]');
const stRows = () => Array.from(stBox().querySelectorAll('tbody tr'));
assert.match(stRows()[0].textContent, /Chưa có mật khẩu/);
assert(!Array.from(stRows()[1].querySelectorAll('button')).some((b) => b.textContent === 'Đặt mật khẩu'), 'người đã nghỉ: không đặt');
stRows()[0].querySelector('button[aria-label="Đặt mật khẩu NV Giả"]').click();
eq(acCalls.slice(-1)[0], ['issue', 's1']);
assert.strictEqual(stBox().querySelector('input[aria-label="Thông tin đăng nhập"]').value, 'ID: STF-0001  /  Mật khẩu: abc123def456');
assert.match(stRows()[0].textContent, /Đặt mật khẩu 2026-11-01 09:00/);
Array.from(stBox().querySelectorAll('button')).find((b) => b.textContent === 'Đã sao chép, ẩn đi').click();
assert(!stBox().querySelector('input[aria-label="Thông tin đăng nhập"]'), 'mật khẩu tạm chỉ hiện một lần');
const roleSel = stRows()[0].querySelector('select'); roleSel.value = 'quan_ly'; roleSel.dispatchEvent(new w22.Event('change'));
eq(acCalls.slice(-1)[0], ['update', 'STAFF', 's1', { vai_tro: 'quan_ly' }]);
stRows()[0].querySelector('button[aria-label="Khóa đăng nhập NV Giả"]').click();
eq(acCalls.slice(-1)[0], ['revoke', 's1']);
w22.close();

// 34. D-077: giao diện theo bảng phân quyền — nhân viên có "số giấy tờ" + "doanh số của mình": thấy menu Doanh số (chế độ của tôi), nút Hiện số;
// không có Hóa đơn / Cài đặt / hợp đồng. Chủ: bảng Phân quyền lưu đúng.
const g34 = [];
const permsNv = { so_giay_to: true, doanh_so_minh: true, doanh_so: false, hoa_don: false, hop_dong: false, cai_dat: false, nhap_xuat: false };
const page34 = html.replace('data-token="<?= token ?>" data-role="<?= role ?>" data-who="<?= who ?>" data-perms="<?= perms ?>"',
  'data-token="tok999" data-role="nhan_vien" data-who="NV Hai" data-perms="' + JSON.stringify(permsNv).replace(/"/g, '&quot;') + '"');
assert(page34 !== html);
const inner34 = {
  getDashboard: () => ({ today: '2026-11-01', month: '2026-11', staffId: '', staff: [], openJobs: { count: 0, need: 0, missing: 0, top: [] }, pipeline: {}, interviews: [], waiting: [], monthStats: { started: 0, left: 0, sent: 0 }, lifecycle: {} }),
  getMySales: (f) => ({ month: f.month || '2026-11', actual: 60000, target: 200000, series: [{ month: '2026-11', total: 60000, target: 200000 }],
    items: [{ ma: 'DS-0001', ngay: '2026-11-03', loai: 'khac', thang: '', pct: 60, share: 60000, company: 'Công ty Giả', person: '' }] }),
  listRecords: (table) => (table === 'PERSON' ? [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'GIA', ngay_sinh: '2000-01-01', quoc_tich: '', trang_thai_sang_loc: 'san_sang', ky_nang: '', sua_luc: 'p', da_an: '' }] : []),
  getPersonDocs: (id, reveal) => ({ so_ho_chieu: reveal ? 'C7654321' : '****4321', so_zairyu_card: '', revealed: !!reveal }),
};
const w23 = open({}, { api: (token, fn, args) => { g34.push(fn); if (!inner34[fn]) throw new Error('FORBIDDEN|' + fn); return inner34[fn](...args); } }, page34);
w23.scrollTo = () => {};
const d23 = w23.document;
eq(['sales', 'invoice', 'settings'].map((p) => d23.querySelector('[data-page="' + p + '"]').hidden), [false, true, true]);
d23.querySelector('[data-page="sales"]').click();
assert(g34.includes('getMySales') && !g34.includes('getRevenueTodo'), 'chỉ gọi doanh số của tôi');
assert.match(d23.getElementById('pageBody').textContent, /Doanh số của tôi.*¥60,000Phần của tôi \(chưa thuế\)¥200,000Mục tiêu30%Đạt/);
assert.match(d23.getElementById('pageBody').textContent, /2026-11-03 · Khác · Công ty Giả — ¥60,000 \(60%\)/);
w23.eval('goPersonDetail')('p1');
const rev = Array.from(d23.querySelectorAll('section[aria-labelledby="person-docs-h"] button')).find((b) => /Hiện/.test(b.textContent));
assert(rev, 'có quyền số giấy tờ → có nút Hiện');
rev.click();
assert.match(d23.querySelector('section[aria-labelledby="person-docs-h"]').textContent, /C7654321/);
w23.close();
// Chủ: bảng Phân quyền
const pmCalls = [];
const w24 = open({}, {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 15 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  listRecords: () => [], getTaskSettings: () => ({}), getChecklistTemplates: () => ({ nintei: { ids: [], custom: false, sua_luc: '' } }), getFinanceSettings: () => ({ tax: 10, sua_luc: '' }),
  getImportFields: () => ({ STAFF: [], COMPANY: [], CONTACT: [], JOB_ORDER: [], PERSON: [] }),
  getPermissions: () => ({ role: 'owner', perms: {}, sua_luc: '', matrix: { nhan_vien: Object.assign({}, permsNv), quan_ly: { so_giay_to: true, doanh_so_minh: true, doanh_so: true, hoa_don: true, hop_dong: true, cai_dat: true, nhap_xuat: true } } }),
  savePermissions: (m, sl) => { pmCalls.push([JSON.parse(JSON.stringify(m)), sl]); return { role: 'owner', perms: {}, sua_luc: 'p1', matrix: m }; },
});
const d24 = w24.document;
d24.querySelector('[data-page="settings"]').click();
const pmBox = d24.querySelector('section[aria-labelledby="perm-h"]');
assert.match(pmBox.textContent, /Xem số giấy tờ đầy đủ.*Xem doanh số của mình.*Doanh số toàn công ty.*Hóa đơn & 入金.*Hợp đồng & phí.*Cài đặt chung.*Nhập \/ xuất dữ liệu/);
const pmCb = (label) => Array.from(pmBox.querySelectorAll('input')).find((i) => i.getAttribute('aria-label') === label);
const cb = pmCb('Nhân viên — Hợp đồng & phí'); cb.checked = true; cb.dispatchEvent(new w24.Event('change'));
const cb2 = pmCb('Quản lý — Hóa đơn & 入金'); cb2.checked = false; cb2.dispatchEvent(new w24.Event('change'));
Array.from(d24.querySelector('section[aria-labelledby="perm-h"]').querySelectorAll('button')).find((b) => b.textContent === 'Lưu').click();
eq([pmCalls[0][0].nhan_vien.hop_dong, pmCalls[0][0].quan_ly.hoa_don, pmCalls[0][1]], [true, false, '']);
assert.match(d24.querySelector('section[aria-labelledby="perm-h"]').textContent, /Đã lưu phân quyền\./);
w24.close();

// 35. Tạo dữ liệu mẫu: chủ, bản thử nghiệm → gọi lặp tới khi xong; bản thật → không có mục này.
const dmCalls = [];
const base35 = {
  getSetupStatus: () => ({ initialized: true, items: [], schemaVersion: 15 }),
  getBackupStatus: () => ({ autoEnabled: true, lastOk: null, lastRun: null, lastError: null, stale: false, folderUrl: '#', backups: [] }),
  listRecords: () => [], getTaskSettings: () => ({}), getChecklistTemplates: () => ({ nintei: { ids: [], custom: false, sua_luc: '' } }), getFinanceSettings: () => ({ tax: 10, sua_luc: '' }),
  getImportFields: () => ({ STAFF: [], COMPANY: [], CONTACT: [], JOB_ORDER: [], PERSON: [] }),
  getPermissions: () => ({ role: 'owner', perms: {}, sua_luc: '', matrix: { nhan_vien: {}, quan_ly: {} } }),
  getDashboard: () => ({ today: '2026-11-01', month: '2026-11', staffId: '', staff: [], openJobs: { count: 0, need: 0, missing: 0, top: [] }, pipeline: {}, interviews: [], waiting: [], monthStats: { started: 0, left: 0, sent: 0 }, lifecycle: {} }),
};
const w25 = open({}, Object.assign({}, base35, { seedDemoData: () => { dmCalls.push(1); return dmCalls.length < 3 ? { done: false, i: dmCalls.length * 40, total: 109 } : { done: true, i: 109, total: 109 }; } }));
const d25 = w25.document;
d25.querySelector('[data-page="settings"]').click();
const dmBox = () => d25.querySelector('section[aria-labelledby="demo-h"]');
assert.match(dmBox().textContent, /Dữ liệu mẫu để kiểm thử.*24 người/);
dmBox().querySelector('button').click();
eq(dmCalls.length, 3);
assert.match(dmBox().textContent, /Đã tạo xong dữ liệu mẫu/);
assert(dmBox().querySelector('button').disabled, 'xong thì khóa nút');
w25.close();
const w26 = open({}, Object.assign({}, base35, { seedDemoData: () => { throw new Error('DEMO_DONE'); } }));
w26.document.querySelector('[data-page="settings"]').click();
w26.document.querySelector('section[aria-labelledby="demo-h"] button').click();
assert.match(w26.document.querySelector('section[aria-labelledby="demo-h"]').textContent, /đã được tạo trước đó/);
w26.close();
const w27 = open({}, base35, html.replace('data-env="<?= env ?>"', 'data-env="PROD"'));
w27.document.querySelector('[data-page="settings"]').click();
assert(!w27.document.querySelector('section[aria-labelledby="demo-h"]'), 'bản thật không có mục dữ liệu mẫu');
assert(!w27.document.querySelector('section[aria-labelledby="perf-h"]'), 'bản thật không có đo tốc độ');
assert(w27.document.querySelector('section[aria-labelledby="perm-h"]'), 'bản thật vẫn có Phân quyền');
w27.close();

// 36. D-079: Nhập file quản lý cũ (CSV 1 sheet) — nhận sheet theo cột, kiểm tra rồi sao lưu → nhập; lần vào làm nhập từ file cũ có nút Bổ sung.
const lgCalls = [];
const w28 = open({}, Object.assign({}, base35, {
  backupNow: () => { lgCalls.push(['backup']); return {}; },
  importLegacy: (kind, rows, dry, off, pending) => { lgCalls.push([kind, rows.length, dry, off, pending]);
    return { results: rows.map((r, i) => (i === 1 ? { row: i + 1, ok: false, error: { field: 'ho_ten_latin', code: 'required' } } : { row: i + 1, ok: true, action: 'created', warnings: ['noStart'], emp: 'dang_lam' })),
      created: rows.length - 1, newStaff: ['ギア'], newCompanies: ['Công ty Giả X'] }; },
}));
const d28 = w28.document;
d28.querySelector('[data-page="settings"]').click();
const lgBox = () => d28.querySelector('section[aria-labelledby="legacy-h"]');
assert(lgBox(), 'chủ thấy mục nhập file cũ');
w28.FileReader = class { readAsText(f) { this.result = f.text; this.onload(); } };
const lgIn = lgBox().querySelector('input[type=file]');
Object.defineProperty(lgIn, 'files', { value: [{ name: 'nguoi.csv', text: '名義,スタッフ名,勤務状況\nCông ty Giả X,GIA A,勤務中\n,GIA B,退職\n\nCông ty Giả X,GIA C,入社前' }] });
lgIn.dispatchEvent(new w28.Event('change'));
assert.match(lgBox().textContent, /Công ty \(会社情報\): không có trong file.*Người lao động: sheet "nguoi.csv", 3 dòng\./);
assert(lgBox().querySelector('button.btn-primary').disabled, 'chưa kiểm tra thì chưa cho nhập');
lgBox().querySelector('button.btn').click();
eq(lgCalls, [['worker', 3, true, 0, null]]);
assert.match(lgBox().textContent, /Người mới: 2 · Đã có: 0 · Thêm lần vào làm cho người đã có: 0 · Dòng trống bỏ qua: 0 · Lỗi: 1/);
assert.match(lgBox().textContent, /Dòng 3: /, 'báo đúng số dòng trong file (dòng trống bị bỏ không làm lệch)');
assert.match(lgBox().textContent, /2 lần vào làm không có ngày vào làm/);
lgBox().querySelector('button.btn-primary').click();
eq(lgCalls.slice(1), [['backup'], ['worker', 3, false, 0, null]]);
assert.match(lgBox().textContent, /Người lao động — đã nhập.*Nhân viên đã tạo mới: 1/);
w28.close();

// 37. GĐ 11.1–11.2: trang 受入れ前 (danh sách + tiến độ, chi tiết, công việc, giấy tờ dùng lại kho, xác nhận vào làm) + trang Giấy tờ còn thiếu.
const pcCalls = [];
const pcData = {
  PRE_ENTRY: [{ id: 'pe1', ma: 'TN-0001', person_id: 'p1', company_id: 'c1', application_id: '', loai: 'nuoc_ngoai', ngay_nhap_canh: '2026-11-20', ngay_vao_lam: '2026-12-01',
    cs_staff_id: 's1', giay_to_staff_id: 's1', trang_thai: 'dang_chuan_bi', cho_ben: 'cong_ty', employment_id: '', link: 'javascript:alert(1)', ghi_chu: '', sua_luc: 'pe', da_an: '' }],
  PRE_TASK: [{ id: 'pt1', ma: 'CV-0001', pre_entry_id: 'pe1', ten: 'Hợp đồng giả', nhom: 'hop_dong', phu_trach_staff_id: 's1', han: '2026-01-01', trang_thai: 'chua_lam', cho_ben: '', link: '', ghi_chu: '', sua_luc: 'pt', da_an: '' }],
  CASE_DOCUMENT: [{ id: 'cd1', ma: 'CD-0001', case_id: '', pre_entry_id: 'pe1', giay_to: 'g1', trang_thai: 'da_yeu_cau', ngay_nhan: '', ghi_chu: '', ben_cung_cap: 'nguoi_lao_dong',
    ngay_yeu_cau: '', han_nhan: '2026-01-02', nguoi_kiem_tra: '', noi_dung_sua: '', link: '', person_doc_id: '', sua_luc: 'cd', da_an: '' }],
  PERSON_DOC: [{ id: 'gt1', ma: 'GT-0001', person_id: 'p1', giay_to: 'g1', link: 'https://drive.google.com/file/d/gia', han_hieu_luc: '2030-01-01', ngay_kiem_tra: '', nguoi_kiem_tra: '', ghi_chu: '', sua_luc: 'gt', da_an: '' }],
  PERSON: [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'GIA TN', ngay_sinh: '2000-01-01', quoc_tich: '', trang_thai_sang_loc: 'san_sang', noi_o: 'nuoc_ngoai', sua_luc: 'p', da_an: '' }],
  COMPANY: [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: 'Công ty Giả', ten_co_so: 'Cơ sở Giả', da_an: '' }],
  STAFF: [{ id: 's1', ma: 'STF-0001', ho_ten: 'CS Giả', trang_thai: 'dang_lam', da_an: '' }],
  LOOKUP: [{ id: 'g1', ma: 'DM-0070', loai: 'giay_to', ten_vi: 'Hộ chiếu giả', ten_ja: '', tu_ngay: '', den_ngay: '', da_an: '' }],
  FILE: [], IMMIGRATION_CASE: [], APPLICATION: [], EMPLOYMENT: [],
};
const w29 = open({}, Object.assign({}, base35, {
  listRecords: (tb) => (pcData[tb] || []).map((r) => Object.assign({}, r)),
  getPreEntries: (f) => { pcCalls.push(['list', f]); return { today: '2026-11-01', rows: [Object.assign({}, pcData.PRE_ENTRY[0], { person: 'GIA TN', person_ma: 'PER-0001', company: 'Công ty Giả / Cơ sở Giả',
    tasks_done: 0, tasks_total: 1, docs_done: 0, docs_total: 1, contract: { done: 0, total: 1 }, visa_task: { done: 0, total: 0 }, visa_case: null,
    next_task: { ten: 'Hợp đồng giả', han: '2026-01-01', overdue: true }, overdue: 1, waiting: { cong_ty: 1, nguoi_lao_dong: 1 } })] }; },
  updateRecord: (tb, id, data, sl) => { pcCalls.push(['update', tb, id, data, sl]); return Object.assign({ id: id }, data); },
  createRecord: (tb, data) => { pcCalls.push(['create', tb, data]); return Object.assign({ id: 'new1' }, data); },
  startFromPreEntry: (id, day, sl) => { pcCalls.push(['start', id, day, sl]); return {}; },
  getMissingDocs: (f) => { pcCalls.push(['miss', f]); return { today: '2026-11-01', rows: [{ id: 'cd1', ma: 'CD-0001', giay_to: 'g1', trang_thai: 'can_sua', ben_cung_cap: 'cong_ty', han_nhan: '2026-01-02',
    nguoi_kiem_tra: 's1', noi_dung_sua: 'Thiếu dấu (giả)', link: 'https://drive.google.com/x', overdue: true, owner_kind: 'pre', owner_id: 'pe1', owner_ma: 'TN-0001', loai: 'nuoc_ngoai',
    person_id: 'p1', person: 'GIA TN', company: 'Công ty Giả', in_library: true }] }; },
}));
const d29 = w29.document; w29.scrollTo = () => {};
const b29 = () => d29.getElementById('pageBody');
d29.querySelector('[data-page="prep"]').click();
eq(pcCalls[0], ['list', { trang_thai: 'dang_chuan_bi', staffId: '' }]);
assert.match(b29().textContent, /PER-0001 · GIA TN.*TN-0001 · Từ nước ngoài.*Công ty Giả \/ Cơ sở Giả.*Nhập cảnh: 2026-11-20Vào làm: 2026-12-01.*Hợp đồng 0\/1Giấy tờ 0\/1Visa: chưa có hồ sơCông việc 0\/1 · 1 quá hạn.*2026-01-01 · Hợp đồng giả.*Công ty 1 · Người lao động 1/);
Array.from(b29().querySelectorAll('button.link-btn')).find((x) => /GIA TN/.test(x.textContent)).click();
assert.match(b29().textContent, /TN-0001 · PER-0001 · GIA TN/);
assert(!b29().querySelector('a[href^="javascript"]'), 'link không phải https không thành thẻ <a>');
assert.match(b29().textContent, /\(link không hợp lệ\)/);
// Công việc: sửa trạng thái + lưu
const taskBox = b29().querySelector('section[aria-labelledby="pre-tasks-h"]');
assert.match(taskBox.textContent, /Hợp đồng giả.*Quá hạn \(2026-01-01\)/);
const tSel29 = taskBox.querySelector('select[aria-label="Trạng thái Hợp đồng giả"]'); tSel29.value = 'xong'; tSel29.dispatchEvent(new w29.Event('change'));
Array.from(taskBox.querySelectorAll('button')).find((x) => x.textContent === 'Lưu').click();
eq(pcCalls.filter((c) => c[0] === 'update').slice(-1)[0], ['update', 'PRE_TASK', 'pt1', { trang_thai: 'xong', han: '2026-01-01', phu_trach_staff_id: 's1', cho_ben: '', link: '', ghi_chu: '' }, 'pt']);
// Giấy tờ: có trong kho → dùng lại
const docBox29 = b29().querySelector('section[aria-labelledby="pre-docs-h"]');
assert.match(docBox29.textContent, /Đã có trong kho: GT-0001 \(hiệu lực đến 2030-01-01\)/);
docBox29.querySelector('button[aria-label="Dùng giấy tờ đã lưu Hộ chiếu giả"]').click();
const used = pcCalls.filter((c) => c[0] === 'update').slice(-1)[0];
eq([used[1], used[2], used[3].person_doc_id, used[3].link, used[3].trang_thai], ['CASE_DOCUMENT', 'cd1', 'gt1', 'https://drive.google.com/file/d/gia', 'da_nhan']);
// Xác nhận vào làm
const dIn = Array.from(b29().querySelectorAll('input[type="date"]')).find((x) => x.getAttribute('aria-label') === 'Ngày vào làm');
eq(dIn.value, '2026-12-01');
Array.from(b29().querySelectorAll('button')).find((x) => x.textContent === 'Xác nhận đã vào làm').click();
eq(pcCalls.filter((c) => c[0] === 'start')[0], ['start', 'pe1', '2026-12-01', 'pe']);
// Trang Giấy tờ còn thiếu: lọc, link mở tab mới, mở đúng hồ sơ
d29.querySelector('[data-page="docs"]').click();
eq(pcCalls.filter((c) => c[0] === 'miss')[0], ['miss', { staffId: '', ben: '', state: '' }]);
assert.match(b29().textContent, /1 giấy tờ, trong đó 1 quá hạn nhận.*GIA TN.*Hộ chiếu giả.*Cần sửa.*Thiếu dấu \(giả\).*Đã có trong kho.*Công ty.*2026-01-02.*TN-0001 · Từ nước ngoài/);
const a29 = b29().querySelector('a[target="_blank"]');
eq([a29.href, a29.rel], ['https://drive.google.com/x', 'noopener noreferrer']);
const stF = b29().querySelector('select[aria-label="Tình trạng"]'); stF.value = 'qua_han'; stF.dispatchEvent(new w29.Event('change'));
eq(pcCalls.filter((c) => c[0] === 'miss').slice(-1)[0], ['miss', { staffId: '', ben: '', state: 'qua_han' }]);
w29.close();

// 38. GĐ 11.3–11.4: trang 定期面談 (theo quý, lọc, đặt lịch / ghi, tạo vấn đề) + trang Vấn đề phát sinh (danh sách, form nhiều người, lịch sử xử lý).
const mdCalls = [];
const mdData = {
  PERSON: [{ id: 'p1', ma: 'PER-0001', ho_ten_latin: 'GIA MD', ngay_sinh: '2000-01-01', trang_thai_sang_loc: 'san_sang', sua_luc: 'p', da_an: '' },
    { id: 'p2', ma: 'PER-0002', ho_ten_latin: 'GIA HAI', ngay_sinh: '2000-01-01', trang_thai_sang_loc: 'san_sang', sua_luc: 'p', da_an: '' }],
  COMPANY: [{ id: 'c1', ma: 'CO-0001', ten_phap_nhan: 'Công ty Giả', ten_co_so: '', da_an: '' }],
  STAFF: [{ id: 's1', ma: 'STF-0001', ho_ten: 'CS Giả', trang_thai: 'dang_lam', da_an: '' }],
  EMPLOYMENT: [{ id: 'e2', person_id: 'p2', company_id: 'c1', ngay_vao_lam: '2026-10-01', da_an: '' }],
  MENDAN: [{ id: 'md1', ma: 'MD-0001', person_id: 'p1', ky: '2026-07', trang_thai: 'hoan_thanh', ngay_thuc_hien: '2026-08-01', sua_luc: 'm', da_an: '' }],
  INCIDENT: [{ id: 'i1', ma: 'VD-0001', person_ids: 'p1', company_id: 'c1', ngay_tiep_nhan: '2026-11-01', loai: 'luong', tieu_de: 'Lương giả', uu_tien: 'cao', phu_trach_staff_id: 's1',
    phoi_hop_staff_id: '', han_xu_ly: '2026-01-05', trang_thai: 'dang_xu_ly', ngay_lien_he_lai: '', ket_qua: '', mendan_id: 'md1', link: '', ghi_chu: '', noi_dung: '', sua_luc: 'i', da_an: '' },
    { id: 'i2', ma: 'VD-0002', person_ids: '', company_id: 'c1', ngay_tiep_nhan: '2026-10-01', loai: 'nha_o', tieu_de: 'Nhà ở xong', uu_tien: 'thap', trang_thai: 'ket_thuc', sua_luc: 'i2', da_an: '' }],
  INCIDENT_LOG: [{ id: 'l1', ma: 'XL-0001', incident_id: 'i1', ngay: '2026-11-02', staff_id: 's1', noi_dung: 'Gọi công ty (giả)', link: '', sua_luc: 'l', da_an: '' }],
};
const mdRow = { person_id: 'p1', person_ma: 'PER-0001', person: 'GIA MD', employment_id: 'e1', company_id: 'c1', company: 'Công ty Giả', support_ids: ['s1'], support: 'CS Giả',
  rec: null, old_log: null, state: 'chua_dat_lich', overdue: true, soon: false, open_incidents: 1 };
const w30 = open({}, Object.assign({}, base35, {
  listRecords: (tb) => (mdData[tb] || []).map((r) => Object.assign({}, r)),
  getMendanPlan: (f) => { mdCalls.push(['plan', f]); return { ky: f.ky || '2026-10', start: '2026-10-01', end: '2026-12-31', today: '2027-01-05', rows: [Object.assign({}, mdRow)], total: 1,
    counts: { chua_dat_lich: 1 }, quarters: ['2026-01', '2026-04', '2026-07', '2026-10', '2027-01'], staff: [{ id: 's1', ho_ten: 'CS Giả', inactive: false }], companies: [{ id: 'c1', label: 'CO-0001 · Công ty Giả' }] }; },
  createRecord: (tb, data) => { mdCalls.push(['create', tb, data]); return Object.assign({ id: 'new1', ma: 'X-1' }, data); },
  updateRecord: (tb, id, data, sl) => { mdCalls.push(['update', tb, id, data, sl]); return Object.assign({ id: id }, data); },
  setHidden: (tb, id, v, sl) => { mdCalls.push(['hide', tb, id, v, sl]); return {}; },
}));
const d30 = w30.document; w30.scrollTo = () => {};
const b30 = () => d30.getElementById('pageBody');
d30.querySelector('[data-page="mendan"]').click();
eq(mdCalls[0], ['plan', { ky: '', staffId: '', companyId: '', state: 'chua_xong' }]);
assert.match(b30().textContent, /Quý 2026-10-01 – 2026-12-31: cần 1 người · hoàn thành 0.*PER-0001 · GIA MD.*Công ty Giả.*CS Giả.*Chưa đặt lịch.*Quá hạn \(hết quý\).*1 vấn đề chưa xong/);
const kySel = b30().querySelector('select[aria-label="Quý"]');
eq(Array.from(kySel.options).map((o) => o.textContent)[3], '2026 · tháng 10–12');
kySel.value = '2026-07'; kySel.dispatchEvent(new w30.Event('change'));
eq(mdCalls.slice(-1)[0], ['plan', { ky: '2026-07', staffId: '', companyId: '', state: 'chua_xong' }]);
// Đặt lịch: tạo MENDAN cho đúng người / lần vào làm / quý; người thực hiện mặc định = CS
b30().querySelector('button[aria-label="Đặt lịch / ghi GIA MD"]').click();
const fm30 = b30().querySelector('form');
eq(fm30.querySelector('[name="staff_id"]').value, 's1');
fm30.querySelector('[name="trang_thai"]').value = 'da_dat_lich'; fm30.querySelector('[name="trang_thai"]').dispatchEvent(new w30.Event('change'));
fm30.querySelector('[name="ngay_du_kien"]').value = '2026-09-10'; fm30.querySelector('[name="ngay_du_kien"]').dispatchEvent(new w30.Event('input'));
fm30.dispatchEvent(new w30.Event('submit'));
const mc = mdCalls.find((c) => c[0] === 'create');
eq([mc[1], mc[2].person_id, mc[2].employment_id, mc[2].ky, mc[2].trang_thai, mc[2].ngay_du_kien, mc[2].staff_id], ['MENDAN', 'p1', 'e1', '2026-07', 'da_dat_lich', '2026-09-10', 's1']);
// Tạo vấn đề từ 定期面談 → sang trang Vấn đề, form điền sẵn người + công ty
b30().querySelector('button[aria-label="Tạo vấn đề GIA MD"]').click();
eq(d30.getElementById('pageTitle').textContent, 'Vấn đề phát sinh');
assert.match(b30().textContent, /Thêm vấn đề.*PER-0001 · GIA MD ×/);
const fi = b30().querySelector('form');
eq(fi.querySelector('[name="company_id"]').value, 'c1');
const addP = fi.querySelector('select[aria-label="+ Thêm người"]');
eq(addP.options[1].value, 'p2', 'người đang làm ở công ty đã chọn lên đầu');
addP.value = 'p2'; addP.dispatchEvent(new w30.Event('change'));
const fi2 = b30().querySelector('form');
fi2.dispatchEvent(new w30.Event('submit'));
assert.match(b30().textContent, /Tiêu đề không được để trống/);
const fi3 = b30().querySelector('form');
fi3.querySelector('[name="tieu_de"]').value = 'Giờ làm giả'; fi3.querySelector('[name="tieu_de"]').dispatchEvent(new w30.Event('input'));
fi3.querySelector('[name="loai"]').value = 'gio_lam'; fi3.querySelector('[name="loai"]').dispatchEvent(new w30.Event('change'));
fi3.dispatchEvent(new w30.Event('submit'));
const ic = mdCalls.filter((c) => c[0] === 'create' && c[1] === 'INCIDENT')[0];
eq([ic[2].person_ids, ic[2].company_id, ic[2].tieu_de, ic[2].loai, ic[2].trang_thai, ic[2].uu_tien], ['p1,p2', 'c1', 'Giờ làm giả', 'gio_lam', 'moi', 'trung_binh']);
// Danh sách: mặc định chỉ chưa giải quyết; quá hạn đánh dấu; chọn "Tất cả" thì thấy vấn đề đã kết thúc
d30.querySelector('[data-page="incident"]').click();
assert.match(b30().textContent, /VD-0001 · Lương giả.*2026-11-01.*Lương.*Cao.*Công ty Giả.*PER-0001 · GIA MD.*CS Giả.*2026-01-05.*Đang xử lý/);
assert(!/VD-0002/.test(b30().textContent));
assert(b30().querySelector('tr.overdue'));
const sf30 = b30().querySelector('select[aria-label="Tình trạng"]') || b30().querySelectorAll('select')[0];
sf30.value = ''; sf30.dispatchEvent(new w30.Event('change'));
assert.match(b30().textContent, /VD-0002 · Nhà ở xong.*Kết thúc/);
// Chi tiết + lịch sử xử lý (chỉ thêm / ẩn)
Array.from(b30().querySelectorAll('button.link-btn')).find((x) => /VD-0001/.test(x.textContent)).click();
assert.match(b30().textContent, /VD-0001 · Lương giả.*Từ 定期面談MD-0001 · 2026 · tháng 7–9.*Lịch sử xử lý.*2026-11-02.*CS Giả: .*Gọi công ty \(giả\)/);
const lf = b30().querySelector('section[aria-labelledby="inc-log-h"] form');
eq(lf.querySelector('[name="staff_id"]').value, 's1');
lf.querySelector('[name="noi_dung"]').value = 'Đã gặp (giả)'; lf.querySelector('[name="noi_dung"]').dispatchEvent(new w30.Event('input'));
lf.dispatchEvent(new w30.Event('submit'));
const lc = mdCalls.filter((c) => c[0] === 'create' && c[1] === 'INCIDENT_LOG')[0];
eq([lc[2].incident_id, lc[2].noi_dung, lc[2].staff_id], ['i1', 'Đã gặp (giả)', 's1']);
b30().querySelector('button[aria-label="Ẩn (ghi nhầm) 2026-11-02"]').click();
eq(mdCalls.filter((c) => c[0] === 'hide')[0], ['hide', 'INCIDENT_LOG', 'l1', true, 'l']);
// Tiếng Nhật
d30.querySelector('[data-lang="ja"]').click();
assert.match(b30().textContent, /定期面談から.*対応履歴/);
d30.querySelector('[data-lang="vi"]').click();
w30.close();


// 39. GĐ 12.1 (D-083): màn hình đăng nhập → bắt đổi mật khẩu tạm → vào app; đăng xuất; tải lại trang giữ phiên; hết phiên giữa chừng.
const loginPage = html.replace('data-token="<?= token ?>" data-role="<?= role ?>" data-who="<?= who ?>" data-perms="<?= perms ?>" data-env="<?= env ?>" data-url="<?= url ?>"',
  'data-token="" data-role="login" data-who="" data-perms="null" data-env="TEST" data-url="https://script.example.test/exec"');
assert(loginPage !== html, 'thay được thuộc tính body');
const g39 = [];
const srv39 = {
  login: (id, pw) => { g39.push(['login', id]); if (pw !== 'TamThoi1234') throw new Error('LOGIN_FAILED'); return { token: 'tokL', role: 'nhan_vien', who: 'NV Đăng Nhập', ma: 'STF-0001', perms: permsNv, mustChange: true }; },
  resumeSession: (tok) => { g39.push(['resume', tok]); if (tok !== 'tokL') throw new Error('SESSION_EXPIRED'); return { role: 'nhan_vien', who: 'NV Đăng Nhập', ma: 'STF-0001', perms: permsNv, mustChange: false }; },
  logout: (tok) => { g39.push(['logout', tok]); return true; },
  api: (tok, fn, args) => { g39.push([tok, fn]); if (fn === 'changeMyPassword') return true; if (srv39.expired) throw new Error('SESSION_EXPIRED'); if (!staffInner[fn]) throw new Error('FORBIDDEN|' + fn); return staffInner[fn](...args); },
};
const w39 = open({}, srv39, loginPage);
w39.scrollTo = () => {};
const d39 = w39.document;
const type39 = (label, v) => { const i = Array.from(d39.querySelectorAll('#pageBody label')).find((l) => l.textContent.indexOf(label) === 0).querySelector('input'); i.value = v; i.dispatchEvent(new w39.Event('input')); };
const submit39 = () => d39.querySelector('#pageBody button[type="submit"]').click();
eq([d39.getElementById('pageTitle').textContent, d39.getElementById('nav').hidden, g39.length], ['Đăng nhập', true, 0]);
type39('ID', 'STF-0001'); type39('Mật khẩu', 'sai'); submit39();
assert.match(d39.getElementById('pageBody').querySelector('.msg-err').textContent, /Sai ID hoặc mật khẩu/);
type39('Mật khẩu', 'TamThoi1234'); submit39();
eq([d39.getElementById('pageTitle').textContent, d39.getElementById('nav').hidden], ['Đổi mật khẩu', true]);
assert.match(d39.getElementById('pageBody').textContent, /mật khẩu tạm/);
assert(!Array.from(d39.querySelectorAll('#pageBody button')).some((b) => b.textContent === 'Hủy'), 'bắt buộc đổi: không có Hủy');
type39('Mật khẩu hiện tại', 'TamThoi1234'); type39('Mật khẩu mới', 'MatKhau-2026'); type39('Nhập lại', 'khac'); submit39();
assert.match(d39.getElementById('pageBody').querySelector('.msg-err').textContent, /không khớp/);
type39('Nhập lại', 'MatKhau-2026'); submit39();
assert(g39.some((c) => c[0] === 'tokL' && c[1] === 'changeMyPassword'), 'đổi mật khẩu qua api với token phiên');
assert(g39.some((c) => c[0] === 'tokL' && c[1] === 'getDashboard'), 'vào app: gọi Tổng quan bằng token phiên');
eq([d39.getElementById('pageTitle').textContent, d39.getElementById('nav').hidden, w39.sessionStorage.getItem('hrTokutei.session')], ['Tổng quan', false, 'tokL']);
assert.match(d39.getElementById('whoBox').textContent, /^NV Đăng Nhập · Nhân viên/);
eq(['sales', 'invoice', 'settings'].map((p) => d39.querySelector('[data-page="' + p + '"]').hidden), [false, true, true]);
// Tự đổi mật khẩu (không bắt buộc): có Hủy; bấm menu là rời màn hình.
Array.from(d39.querySelectorAll('#whoBox button')).find((b) => b.textContent === 'Đổi mật khẩu').click();
eq(d39.getElementById('pageTitle').textContent, 'Đổi mật khẩu');
assert(Array.from(d39.querySelectorAll('#pageBody button')).some((b) => b.textContent === 'Hủy'));
d39.querySelector('[data-page="company"]').click();
eq(d39.getElementById('pageTitle').textContent, 'Công ty');
// Đăng xuất: hủy phiên ở máy chủ, xóa token, không còn menu / dữ liệu, có nút mở lại trang.
Array.from(d39.querySelectorAll('#whoBox button')).find((b) => b.textContent === 'Đăng xuất').click();
eq(g39.slice(-1)[0], ['logout', 'tokL']);
eq([d39.getElementById('nav').hidden, d39.getElementById('whoBox').hidden, w39.sessionStorage.getItem('hrTokutei.session')], [true, true, null]);
assert.match(d39.getElementById('pageBody').textContent, /Đã đăng xuất/);
const again = d39.querySelector('#pageBody a');
eq([again.textContent, again.getAttribute('href'), again.getAttribute('target')], ['Đăng nhập lại', 'https://script.example.test/exec', '_top']);
w39.close();
// Tải lại trang trong cùng tab: còn phiên → vào thẳng; phiên hết giữa chừng → màn hình "hết phiên".
g39.length = 0;
const w40 = open({}, srv39, loginPage, { 'hrTokutei.session': 'tokL' });
w40.scrollTo = () => {};
const d40 = w40.document;
eq([g39[0], d40.getElementById('pageTitle').textContent], [['resume', 'tokL'], 'Tổng quan']);
srv39.expired = true;
d40.querySelector('[data-page="person"]').click();
assert.match(d40.getElementById('pageBody').textContent, /Phiên đăng nhập đã hết/);
eq([d40.getElementById('nav').hidden, w40.sessionStorage.getItem('hrTokutei.session')], [true, null]);
w40.close();
// Token cũ không còn hiệu lực khi mở trang → màn hình đăng nhập.
const w41 = open({}, srv39, loginPage, { 'hrTokutei.session': 'tokCu' });
eq([w41.document.getElementById('pageTitle').textContent, w41.sessionStorage.getItem('hrTokutei.session')], ['Đăng nhập', null]);
w41.close();
console.log('OK — 39 nhóm kiểm tra giao diện đạt');
w10.close();
w8.close(); w9.close();
w7.close();
w.close(); w2.close(); w3.close(); w4.close(); w5.close(); w6.close();
