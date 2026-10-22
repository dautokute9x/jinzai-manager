// Kiểm tra GĐ 10 + GĐ 12.1 (D-083): đăng nhập ID + mật khẩu, phiên ở máy chủ, 2 vai trò, chặn gọi thẳng khi không phải chủ.
// Chạy: node tests/auth.test.js
const assert = require('assert');
const { makeGoogle, load, eq } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Code.gs', 'Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs', 'Import.gs', 'Export.gs', 'Auth.gs', 'Demo.gs']);
app.initTestData();
g.clock.now = '2026-11-01 09:00:00';
const forbidden = (fn) => assert.throws(fn, /FORBIDDEN/);
const vn = app.listRecords('LOOKUP').find((x) => x.loai === 'quoc_tich');
const A = app.createRecord('STAFF', { ho_ten: 'Nhan Vien Gia' });
const B = app.createRecord('STAFF', { ho_ten: 'Quan Ly Gia', vai_tro: 'quan_ly' });
const C = app.createRecord('STAFF', { ho_ten: 'Da Nghi Gia', trang_thai: 'da_nghi' });
assert.throws(() => app.createRecord('STAFF', { ho_ten: 'x', vai_tro: 'admin' }), /"code":"invalidChoice"/);
const p = app.savePerson('', { ho_ten_latin: 'Nguoi Gia', ngay_sinh: '2000-01-01', quoc_tich: vn.id, so_ho_chieu: 'C7654321' }).person;

// GĐ 12.1 (D-083): PBKDF2 đúng chuẩn (so với Node), mã băm liên kết cũ / ô trống không khớp.
const crypto = require('crypto');
eq(app.pbkdf2_('mật khẩu', 'muoi', 1000), crypto.pbkdf2Sync('mật khẩu', 'muoi', 1000, 32, 'sha256').toString('base64'));
assert(!app.checkPassword_('x', 'a'.repeat(64)) && !app.checkPassword_('', '') && !app.checkPassword_('x', 'tmp$'));

// Chủ đặt mật khẩu tạm: chỉ trả 1 lần; lưu mã băm có tiền tố tmp$; không gửi mã băm về trình duyệt; nhật ký che mã băm.
const pa = app.setStaffPassword(A.id);
eq([pa.id, pa.password.length], ['STF-0001', 12]);
const pb = app.setStaffPassword(B.id);
assert.throws(() => app.setStaffPassword(C.id), /"code":"staffInactive"/);
const data = Object.values(g.items).find((x) => x.name === 'HR_DATA_TEST');
const staffRows = data.getSheetByName('STAFF').rows;
assert(!JSON.stringify(staffRows).includes(pa.password), 'không lưu mật khẩu thô');
assert(staffRows.some((r) => r.some((c) => String(c).indexOf('tmp$pbkdf2$5000$') === 0)), 'lưu mã băm PBKDF2, đánh dấu tạm');
assert(!('khoa_hash' in app.listRecords('STAFF')[0]));
assert(app.listRecords('STAFF').find((s) => s.id === A.id).khoa_luc);
const aud = data.getSheetByName('AUDIT_LOG').rows.slice(1).filter((r) => r[11] === 'dat_mat_khau');
assert(aud.length === 2 && aud.every((r) => !r[13].includes('pbkdf2') && r[13].includes('***')), 'nhật ký che mã băm');
assert(!('khoa_hash' in app.revokeAccess(C.id)), 'kết quả trả về trình duyệt không có mã băm');

// Người dùng Gmail khác (Google không cho biết email) gọi thẳng → bị chặn hết; mở app → màn hình đăng nhập, không có dữ liệu.
g.session.active = '';
forbidden(() => app.listRecords('PERSON'));
forbidden(() => app.getSales({}));
forbidden(() => app.initTestData());
forbidden(() => app.getSetupStatus());
forbidden(() => app.restoreBackup('x'));
forbidden(() => app.setStaffPassword(A.id));
forbidden(() => app.changeMyPassword('a', 'b'));
const page = app.doGet({ parameter: { k: 'lien-ket-cu' } });
eq([page.tpl.role, page.tpl.token, page.tpl.who, page.tpl.perms, page.tpl.url], ['login', '', '', 'null', 'https://script.example.test/exec']);
g.session.active = 'owner@example.test';
eq(app.doGet({ parameter: {} }).tpl.role, 'owner');
g.session.active = '';

// Đăng nhập: sai ID / sai mật khẩu / người đã nghỉ → cùng một lỗi; ID không phân biệt hoa thường.
assert.throws(() => app.login('STF-0001', 'sai'), /LOGIN_FAILED/);
assert.throws(() => app.login('STF-0099', pa.password), /LOGIN_FAILED/);
assert.throws(() => app.login('STF-0003', ''), /LOGIN_FAILED/);
assert.throws(() => app.login('', ''), /LOGIN_FAILED/);
const sa = app.login(' stf-0001 ', pa.password);
eq([sa.role, sa.who, sa.ma, sa.mustChange, sa.perms.so_giay_to], ['nhan_vien', 'Nhan Vien Gia', 'STF-0001', true, true]);
assert.match(sa.token, /^[a-z0-9]{32,}$/);
assert(!JSON.stringify(g.cache).includes(sa.token), 'chỉ lưu mã băm của token phiên');
// Mật khẩu tạm: mọi hàm bị chặn trừ đổi mật khẩu; kiểm tra mật khẩu mới.
forbidden(() => app.api(sa.token, 'listRecords', ['PERSON']));
assert.throws(() => app.api(sa.token, 'changeMyPassword', [pa.password, 'ngan']), /"code":"tooShort"/);
assert.throws(() => app.api(sa.token, 'changeMyPassword', [pa.password, 'stf-0001']), /"code":"weakPassword"/);
assert.throws(() => app.api(sa.token, 'changeMyPassword', ['sai', 'MatKhauMoi-2026']), /"code":"wrongPassword"/);
assert.throws(() => app.api(sa.token, 'changeMyPassword', [pa.password, pa.password]), /"code":"samePassword"/);
eq(app.api(sa.token, 'changeMyPassword', [pa.password, 'MatKhauMoi-2026']), true);
assert.throws(() => app.login('STF-0001', pa.password), /LOGIN_FAILED/, 'mật khẩu tạm hết dùng được');
const sa2 = app.login('STF-0001', 'MatKhauMoi-2026');
eq(sa2.mustChange, false);
// Đổi mật khẩu lần nữa từ phiên sa: sa vẫn dùng được, phiên khác (sa2) bị đăng xuất.
eq(app.api(sa.token, 'changeMyPassword', ['MatKhauMoi-2026', 'MatKhauA-2026']), true);
eq(app.resumeSession(sa.token).who, 'Nhan Vien Gia');
assert.throws(() => app.api(sa2.token, 'whoAmI', []), /SESSION_EXPIRED/);
assert.throws(() => app.resumeSession(sa2.token), /SESSION_EXPIRED/);
const tokA = sa.token;
// Quản lý: đổi mật khẩu tạm rồi dùng.
const sb = app.login('STF-0002', pb.password);
app.api(sb.token, 'changeMyPassword', [pb.password, 'QuanLy-2026!']);
const tokB = sb.token;
const la = { token: tokA }; const lb = { token: tokB }; // giữ tên biến của các kiểm tra GĐ 10 bên dưới

// Nhân viên qua api (quyền mặc định D-077): tuyển dụng + số giấy tờ + doanh số của mình; không tiền toàn công ty, hóa đơn, hợp đồng, cài đặt, nhập / xuất.
const apiA = (fn, ...args) => app.api(la.token, fn, args);
assert(apiA('listRecords', 'PERSON').length === 1);
forbidden(() => apiA('listRecords', 'REVENUE'));
forbidden(() => apiA('listRecords', 'CONTRACT'));
forbidden(() => apiA('getSales', {}));
forbidden(() => apiA('listInvoices'));
forbidden(() => apiA('exportData', 'people', {}));
forbidden(() => apiA('importRows', 'STAFF', [], true));
forbidden(() => apiA('createRecord', 'STAFF', { ho_ten: 'x' }));
forbidden(() => apiA('updateRecord', 'LOOKUP', vn.id, {}, ''));
forbidden(() => apiA('createRecord', 'PAYMENT', {}));
eq(apiA('getPersonDocs', p.id, true).so_ho_chieu, 'C7654321', 'mặc định nhân viên được xem số đầy đủ');
eq(apiA('getPersonDocs', p.id, false).so_ho_chieu, '****4321');
forbidden(() => apiA('getSetupStatus'));
forbidden(() => apiA('readAll_'));
forbidden(() => apiA('api', la.token, 'listRecords', ['PERSON']));
forbidden(() => apiA('setStaffPassword', A.id));
assert.throws(() => app.api('khonghople' + 'a'.repeat(30), 'listRecords', ['PERSON']), /SESSION_EXPIRED/);
const co = apiA('createRecord', 'COMPANY', { ten_phap_nhan: 'Công ty do NV tạo' });
const lastAudit = data.getSheetByName('AUDIT_LOG').rows.slice(-1)[0];
eq([lastAudit[9], lastAudit[3], lastAudit.includes('STF-0001 Nhan Vien Gia')], ['COMPANY', 'STF-0001 Nhan Vien Gia', true]);
eq(apiA('whoAmI'), { role: 'nhan_vien', ho_ten: 'Nhan Vien Gia', ma: 'STF-0001' });
assert(Array.isArray(apiA('getTasks', {}).tasks));
forbidden(() => app.listRecords('PERSON')); // sau api, quyền không "dính" sang lần gọi thẳng

// Quản lý đăng nhập: xem tiền được, nhưng không khởi tạo / khôi phục / đặt mật khẩu cho người khác.
const apiB = (fn, ...args) => app.api(lb.token, fn, args);
assert(apiB('getSales', {}).month);
assert(Array.isArray(apiB('listRecords', 'REVENUE')));
eq(apiB('getPersonDocs', p.id, true).so_ho_chieu, 'C7654321');
forbidden(() => apiB('initTestData'));
forbidden(() => apiB('restoreBackup', 'x'));
forbidden(() => apiB('setStaffPassword', A.id));
forbidden(() => apiB('revokeAccess', A.id));

// Trình kích hoạt sao lưu chạy không có người dùng web → vẫn chạy; người ngoài gọi thẳng → bị chặn.
forbidden(() => app.runScheduledBackup());
forbidden(() => app.runScheduledBackup({ triggerUid: 'gia-mao' }));
g.session.active = 'owner@example.test'; app.enableAutoBackup(); g.session.active = '';
assert.doesNotThrow(() => app.runScheduledBackup({ triggerUid: g.triggers[0].uid }));
// Review bảo mật: quản lý không gọi được hàm ngoài danh sách (vd. eval) → không leo quyền chủ.
forbidden(() => apiB('eval', "SYSTEM_=true; readAll_(openTable_('STAFF'))"));
forbidden(() => apiB('readAll_'));
forbidden(() => apiB('constructor'));
forbidden(() => apiA('eval', '1'));
forbidden(() => apiB('seedDemoData'));
// Nhân viên: cài đặt tài chính chỉ còn tên công ty.
eq(Object.keys(apiA('getFinanceSettings')), ['issuer_name']);
assert(apiB('getFinanceSettings').tax !== undefined);
// D-077: doanh số của mình — chỉ phần được chia cho mình.
g.session.active = 'owner@example.test';
const coM = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả Doanh Số' });
app.saveRevenue('', { loai: 'khac', company_id: coM.id, ngay: '2026-11-03', so_tien: '100000', chia: A.id + ':60,' + B.id + ':40' });
app.saveRevenue('', { loai: 'khac', company_id: coM.id, ngay: '2026-11-04', so_tien: '50000', chia: B.id + ':100' });
app.saveTarget(A.id, '2026-11', '200000');
forbidden(() => app.getMySales({}), 'chủ không có "của tôi"');
g.session.active = '';
const mine = apiA('getMySales', { month: '2026-11' });
eq([mine.actual, mine.target, mine.items.length, mine.items[0].share, mine.items[0].pct], [60000, 200000, 1, 60000, 60]);
eq(apiB('getMySales', { month: '2026-11' }).actual, 90000);
// D-077: chủ đổi bảng phân quyền → có hiệu lực ngay ở lần gọi sau.
g.session.active = 'owner@example.test';
const pm = app.getPermissions();
eq([pm.role, pm.matrix.nhan_vien.so_giay_to, pm.matrix.nhan_vien.doanh_so, pm.matrix.quan_ly.hoa_don, pm.sua_luc], ['owner', true, false, true, '']);
const pm2 = app.savePermissions({ nhan_vien: Object.assign({}, pm.matrix.nhan_vien, { so_giay_to: false, doanh_so_minh: false, hop_dong: true }), quan_ly: Object.assign({}, pm.matrix.quan_ly, { hoa_don: false }) }, '');
assert.throws(() => app.savePermissions(pm2.matrix, ''), /CONFLICT/);
g.session.active = '';
forbidden(() => apiA('savePermissions', pm2.matrix, pm2.sua_luc));
forbidden(() => apiB('savePermissions', pm2.matrix, pm2.sua_luc));
forbidden(() => apiA('getPersonDocs', p.id, true));
forbidden(() => apiA('getMySales', {}));
assert(Array.isArray(apiA('listRecords', 'CONTRACT')), 'bật hợp đồng cho nhân viên');
forbidden(() => apiB('listInvoices'));
forbidden(() => apiB('listRecords', 'PAYMENT'));
eq(apiA('getPermissions'), { role: 'nhan_vien', perms: pm2.matrix.nhan_vien });
// Người có "Cài đặt chung" sửa được nhân viên nhưng KHÔNG đổi vai trò (không tự nâng quyền).
const bRow = () => { g.session.active = 'owner@example.test'; const r = app.listRecords('STAFF').find((x) => x.id === B.id); g.session.active = ''; return r; };
const aRow = () => { g.session.active = 'owner@example.test'; const r = app.listRecords('STAFF').find((x) => x.id === A.id); g.session.active = ''; return r; };
forbidden(() => apiB('updateRecord', 'STAFF', A.id, { vai_tro: 'quan_ly' }, aRow().sua_luc));
forbidden(() => apiB('createRecord', 'STAFF', { ho_ten: 'Moi', vai_tro: 'quan_ly' }));
g.clock.now = '2026-11-01 09:30:00';
eq(apiB('updateRecord', 'STAFF', A.id, { ho_ten: 'Nhan Vien Gia' }, aRow().sua_luc).vai_tro, 'nhan_vien');
forbidden(() => apiA('updateRecord', 'STAFF', A.id, { ho_ten: 'x' }, aRow().sua_luc));
// Không xem được số đầy đủ → kiểm tra trùng không dùng số hộ chiếu (không dò được số).
const dupTry = apiA('savePerson', '', { ho_ten_latin: 'Nguoi Khac Han', ngay_sinh: '1990-05-05', quoc_tich: vn.id, so_ho_chieu: 'C7654321' }, '', false);
assert(dupTry.person && !dupTry.duplicates, 'không lộ "trùng số hộ chiếu"');

// Sai mật khẩu 5 lần → khóa tạm (kể cả nhập đúng); hết thời gian khóa hoặc chủ đặt lại mật khẩu → mở.
for (let i = 0; i < 5; i++) assert.throws(() => app.login('STF-0002', 'sai'), /LOGIN_FAILED/);
assert.throws(() => app.login('STF-0002', 'QuanLy-2026!'), /LOCKED/);
delete g.cache['L_STF-0002']; // giả lập hết 15 phút
const sb2 = app.login('STF-0002', 'QuanLy-2026!');
// Đăng xuất / hết phiên → token không dùng được nữa.
app.logout(sb2.token);
assert.throws(() => app.api(sb2.token, 'whoAmI', []), /SESSION_EXPIRED/);
const sb3 = app.login('STF-0002', 'QuanLy-2026!');
Object.keys(g.cache).filter((k) => k.indexOf('S_' + app.hashToken_(sb3.token)) === 0).forEach((k) => { delete g.cache[k]; }); // giả lập 2 giờ không dùng
assert.throws(() => app.api(sb3.token, 'whoAmI', []), /SESSION_EXPIRED/);

// Chủ khóa đăng nhập / cho nghỉ → phiên đang mở hết hiệu lực ngay, không đăng nhập lại được.
g.session.active = 'owner@example.test';
app.revokeAccess(B.id);
const a1 = app.listRecords('STAFF').find((s) => s.id === A.id);
app.updateRecord('STAFF', A.id, { trang_thai: 'da_nghi' }, a1.sua_luc);
g.session.active = '';
assert.throws(() => apiB('getSales', {}), /SESSION_EXPIRED/);
assert.throws(() => apiA('listRecords', 'PERSON'), /SESSION_EXPIRED/);
assert.throws(() => app.login('STF-0002', 'QuanLy-2026!'), /LOGIN_FAILED/);
assert.throws(() => app.login('STF-0001', 'MatKhauA-2026'), /LOGIN_FAILED/);

console.log('OK — kiểm tra đăng nhập ID + mật khẩu và phân quyền nhiều người dùng (GĐ 10, 12.1) đạt');
