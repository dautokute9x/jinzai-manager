// Kiểm tra bước đo tốc độ (Perf.gs): dữ liệu giả nằm ở file riêng, không đụng HR_DATA_TEST.
// Chạy: node tests/perf.test.js
const assert = require('assert');
const { makeGoogle, load, eq } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Perf.gs']);
const byName = (n) => Object.values(g.items).find((x) => x.name === n && !x.trashed);

assert.throws(() => app.preparePerfData(), /NOT_INITIALIZED/);
app.initTestData();
app.createRecord('STAFF', { ho_ten: 'Nhân viên thật trong file thử nghiệm' });
const data = byName('HR_DATA_TEST');
const dataRowsBefore = JSON.stringify(data.sheets.map((s) => s.rows.length));

// Tạo dữ liệu giả đủ số lượng, trong file HR_PERF_TEST nằm cùng thư mục.
let r = app.preparePerfData();
const perf = byName('HR_PERF_TEST');
assert.strictEqual(perf.parent, byName('HR Tokutei (TEST)'));
assert.strictEqual(JSON.stringify(r.counts), JSON.stringify({ STAFF: 1000, COMPANY: 1000, JOB_ORDER: 1000, PERSON: 1000, APPLICATION: 3000, AUDIT_LOG: 10000 }));
assert.strictEqual(perf.getSheetByName('APPLICATION').rows.length, 3001);
assert.strictEqual(perf.getSheetByName('PERSON').rows[1][1], 'PER-0001');

// Chạy lại: không nhân đôi; thiếu thì chỉ bù phần thiếu.
app.preparePerfData();
assert.strictEqual(perf.getSheetByName('PERSON').rows.length, 1001);
perf.getSheetByName('COMPANY').rows.length = 501;
app.preparePerfData();
assert.strictEqual(perf.getSheetByName('COMPANY').rows.length, 1001);
assert.strictEqual(perf.getSheetByName('COMPANY').rows[1000][1], 'CO-1000');

// 1.6c-H: sau khi chuẩn bị, mọi tab còn sẵn ≥ 500 dòng trống → tạo bản ghi không phải thêm dòng.
Object.keys(r.counts).forEach((tb) => { const sh = perf.getSheetByName(tb); assert(sh.maxRows - sh.rows.length >= 500, tb); });
const maxBefore = ['STAFF', 'AUDIT_LOG'].map((tb) => perf.getSheetByName(tb).maxRows);

// Các thao tác đo chạy trên file đo.
const list = app.perfOp('list');
assert.strictEqual(list.result.length, 1000);
assert.strictEqual(app.perfOp('listApplication').result.length, 3000);
const created = app.perfOp('create').result;
assert.strictEqual(created.ma, 'STF-1001', 'mã nối tiếp dữ liệu giả');
g.clock.now = '2026-10-19 12:00:01';
const updated = app.perfOp('update', created).result;
g.clock.now = '2026-10-19 12:00:02';
assert.strictEqual(app.perfOp('hide', updated).result.da_an, 'Y');
assert.strictEqual(perf.getSheetByName('AUDIT_LOG').rows.length, 10004, 'nhật ký ghi vào file đo');
eq(['STAFF', 'AUDIT_LOG'].map((tb) => perf.getSheetByName(tb).maxRows), maxBefore);
// 1.6c-G: thời gian chia theo từng việc, cộng lại đúng bằng tổng thời gian máy chủ.
const c2 = app.perfOp('create');
eq(Object.keys(c2.parts).sort(), ['doc', 'ghi', 'khac', 'khoa', 'kiemTraFile', 'moFile', 'nhatKy']);
assert.strictEqual(Object.values(c2.parts).reduce((a, b) => a + b, 0) >= c2.serverMs, true);
assert.strictEqual(require('vm').runInContext('perfTimes_', app), null, 'ngoài lúc đo không ghi thời gian');
eq(Object.keys(app.perfOp('list').parts).sort(), ['doc', 'khac', 'kiemTraFile', 'moFile']);
assert.ok(typeof list.serverMs === 'number');
assert.strictEqual(list.thresholds.list, 3000);

// An toàn: HR_DATA_TEST không đổi, và sau khi đo app quay lại dùng HR_DATA_TEST.
assert.strictEqual(JSON.stringify(data.sheets.map((s) => s.rows.length)), dataRowsBefore);
assert.strictEqual(app.listRecords('STAFF').length, 1);
assert.throws(() => app.perfOp('xoa'), /UNKNOWN_OP/);
assert.strictEqual(app.listRecords('STAFF').length, 1, 'lỗi giữa chừng vẫn trả về HR_DATA_TEST');

// File đo không nằm trong bản sao lưu.
app.backupNow();
assert(!Object.values(g.items).some((x) => x.name.startsWith('HR_PERF_TEST__')));

// Bản thật: không có đo tốc độ (không tạo HR_PERF_TEST trong thư mục thật).
const gp = makeGoogle(); gp.props.APP_ENV = 'PROD';
const prod = load(gp, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Perf.gs']);
prod.initTestData();
assert.throws(() => prod.preparePerfData(), /PERF_TEST_ONLY/);
assert.throws(() => prod.perfOp('list'), /PERF_TEST_ONLY/);
assert(!Object.values(gp.items).some((x) => x.name === 'HR_PERF_TEST'));
console.log('OK — kiểm tra Perf.gs đạt');
