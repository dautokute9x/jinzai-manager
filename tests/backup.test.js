// Kiểm tra sao lưu & khôi phục (Backup.gs) bằng Drive/Sheets giả lập.
// Chạy: node tests/backup.test.js
const assert = require('assert');
const { makeGoogle, load } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs']);
const all = () => Object.values(g.items);
const byName = (n) => all().find((x) => x.name === n && !x.trashed);
const backupFolder = () => byName('HR_BACKUP_TEST');
const backupNames = () => all().filter((x) => x.kind === 'file' && x.parent === backupFolder() && !x.trashed).map((x) => x.name).sort();

// 0. Chưa khởi tạo → báo NOT_INITIALIZED.
assert.throws(() => app.backupNow(), /NOT_INITIALIZED/);

app.initTestData();
app.createRecord('STAFF', { ho_ten: 'Nhân viên trước sao lưu' });

// Ngày cuối tháng / ngày 15 tính đúng, kể cả tháng 2 năm nhuận.
assert(app.isBackupDay_('2026-10-15') && app.isBackupDay_('2026-10-31') && app.isBackupDay_('2028-02-29') && app.isBackupDay_('2026-02-28'));
assert(!app.isBackupDay_('2026-10-30') && !app.isBackupDay_('2028-02-28') && !app.isBackupDay_('2026-10-16'));
assert.strictEqual(app.monthsAgo_('2026-10-31', 12), '2025-10-31');
assert.strictEqual(app.monthsAgo_('2028-02-29', 12), '2027-02-28');

// T1-11 + T1.5-1: sao lưu ngay 2 lần → 2 cặp, tên theo giờ JST, đủ 2 file mỗi cặp.
g.clock.now = '2026-10-19 13:00:00';
let s = app.backupNow();
g.clock.now = '2026-10-19 13:00:05';
s = app.backupNow();
assert.deepStrictEqual(backupNames(), [
  'HR_DATA_TEST__2026-10-19_130000__manual', 'HR_DATA_TEST__2026-10-19_130005__manual',
  'HR_SENSITIVE_TEST__2026-10-19_130000__manual', 'HR_SENSITIVE_TEST__2026-10-19_130005__manual',
]);
assert.strictEqual(s.backups.length, 2);
assert(s.backups.every((b) => b.complete));
assert.strictEqual(s.backups[0].key, '2026-10-19_130005__manual', 'mới nhất lên đầu');
assert.strictEqual(s.lastOk, '2026-10-19 13:00:05');
assert.strictEqual(s.stale, false);
assert.strictEqual(byName('HR_BACKUP_TEST').parent, byName('HR Tokutei (TEST)'));

// T1.5-2: bật tự động 2 lần → chỉ 1 lịch, mỗi ngày ~21:30 JST.
assert.strictEqual(s.autoEnabled, false);
app.enableAutoBackup();
s = app.enableAutoBackup();
assert.strictEqual(g.triggers.length, 1);
assert.strictEqual(s.autoEnabled, true);
const t = g.triggers[0];
assert.deepStrictEqual([t.handler, t.everyDays, t.hour, t.minute, t.tz], ['runScheduledBackup', 1, 21, 30, 'Asia/Tokyo']);

// T1-12: lịch chạy ngày thường → bỏ qua; ngày 31 → sao lưu; chạy lại cùng ngày → không trùng.
g.clock.now = '2026-10-30 21:31:00';
assert.strictEqual(app.runScheduledBackup(), 'SKIP_NOT_BACKUP_DAY');
assert.strictEqual(g.props.TEST_BACKUP_LAST_RUN, '2026-10-30 21:31:00');
g.clock.now = '2026-10-31 21:29:00';
assert.strictEqual(app.runScheduledBackup(), '2026-10-31_212900__auto');
g.clock.now = '2026-10-31 21:44:00';
assert.strictEqual(app.runScheduledBackup(), 'SKIP_ALREADY_DONE');
assert.strictEqual(backupNames().filter((n) => n.endsWith('__auto')).length, 2);

// T1-13: bản quá 12 tháng → thùng rác; bản đúng 12 tháng vẫn giữ.
const data = byName('HR_DATA_TEST');
data.makeCopy('HR_DATA_TEST__2025-10-30_213000__auto', backupFolder());
data.makeCopy('HR_DATA_TEST__2025-11-15_213000__auto', backupFolder());
data.makeCopy('ghi-chu-khong-phai-ban-sao.txt', backupFolder());
g.clock.now = '2026-11-15 21:30:00';
app.runScheduledBackup();
assert(all().find((x) => x.name === 'HR_DATA_TEST__2025-10-30_213000__auto').trashed, 'quá 12 tháng → thùng rác');
assert(!all().find((x) => x.name === 'HR_DATA_TEST__2025-11-15_213000__auto').trashed, 'đúng 12 tháng → giữ');
assert(!byName('ghi-chu-khong-phai-ban-sao.txt').trashed, 'file lạ không bị đụng');
assert(!all().some((x) => x.name.startsWith('HR_DATA_TEST__2025-10-30') && !x.trashed));

// Cặp thiếu file thì báo chưa đủ và không cho khôi phục.
s = app.getBackupStatus();
assert.strictEqual(s.backups.find((b) => b.key === '2025-11-15_213000__auto').complete, false);
assert.throws(() => app.restoreBackup('2025-11-15_213000__auto'), /BACKUP_INCOMPLETE/);

// Lỗi sao lưu tự động → lưu lại để trang Cài đặt cảnh báo; lần sau thành công thì xóa lỗi.
g.clock.now = '2026-11-30 21:30:00';
const realCopy = data.makeCopy;
data.makeCopy = () => { throw new Error('Drive hết dung lượng'); };
assert.throws(() => app.runScheduledBackup(), /hết dung lượng/);
assert.match(app.getBackupStatus().lastError.msg, /hết dung lượng/);
data.makeCopy = realCopy;
app.backupNow();
assert.strictEqual(app.getBackupStatus().lastError, null);

// Quá 16 ngày không có bản sao lưu mới → stale.
g.clock.now = '2026-12-17 09:00:00';
assert.strictEqual(app.getBackupStatus().stale, true);

// T1-14 + T1.5-3: khôi phục → sao lưu hiện trạng trước, app dùng dữ liệu cũ, file cũ sang "Đã thay thế".
g.clock.now = '2026-12-17 10:00:00';
app.createRecord('STAFF', { ho_ten: 'Nhân viên sau sao lưu' });
assert.strictEqual(app.listRecords('STAFF').length, 2);
const oldDataId = g.props.TEST_DATA_ID;
const r = app.restoreBackup('2026-10-19_130000__manual');
assert.strictEqual(r.safetyBackup, '2026-12-17_100000__pre-restore');
assert.notStrictEqual(g.props.TEST_DATA_ID, oldDataId);
const staff = app.listRecords('STAFF');
assert.strictEqual(staff.length, 1);
assert.strictEqual(staff[0].ho_ten, 'Nhân viên trước sao lưu');
const replaced = byName('Đã thay thế');
assert.strictEqual(replaced.parent, backupFolder());
assert.strictEqual(g.items[oldDataId].parent, replaced);
assert.strictEqual(g.items[oldDataId].trashed, false, 'không xóa dữ liệu cũ');
assert.strictEqual(byName('HR_DATA_TEST').id, g.props.TEST_DATA_ID);
assert.strictEqual(byName('HR_DATA_TEST').parent, byName('HR Tokutei (TEST)'));
// Khôi phục ngược lại từ bản "trước khôi phục" → quay về 2 nhân viên.
app.restoreBackup(r.safetyBackup);
assert.strictEqual(app.listRecords('STAFF').length, 2);

console.log('OK — kiểm tra Backup.gs đạt');
