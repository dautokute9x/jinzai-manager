// GĐ 10 (D-075) → GĐ 12.1 (D-083): nhiều người dùng trên Gmail cá nhân.
// Web app chạy dưới tài khoản chủ ("Thực thi: Tôi") → Google KHÔNG cho biết email người dùng Gmail khác (chỉ thấy email của chủ).
// Nên nhân viên đăng nhập bằng ID (= mã nhân viên, vd. STF-0001) + mật khẩu; chủ đặt mật khẩu tạm / khóa trong Cài đặt → Nhân viên.
// Mật khẩu chỉ lưu dạng băm PBKDF2 ở STAFF.khoa_hash; phiên đăng nhập lưu ở CacheService (máy chủ).
// Mọi lần gọi máy chủ của nhân viên đi qua api(); mở dữ liệu (openTable_) mà không phải chủ / không qua api → FORBIDDEN.

const ROLES = ['nhan_vien', 'quan_ly'];
// Chỉ chủ (tài khoản triển khai) được gọi — kể cả quản lý dùng liên kết cũng không.
const OWNER_ONLY_FNS = ['initTestData', 'setProdEnv', 'restoreBackup', 'enableAutoBackup', 'preparePerfData', 'perfOp',
  'setStaffPassword', 'revokeAccess', 'savePermissions', 'getFileLink', 'importLegacy']; // D-079: nhập file quản lý cũ (dữ liệu thật) chỉ chủ

// D-077: bảng phân quyền — chủ bật / tắt trong Cài đặt → Phân quyền (lưu SETTING khoa 'permissions'). Chủ luôn có tất cả.
const PERMS = ['so_giay_to', 'doanh_so_minh', 'doanh_so', 'hoa_don', 'hop_dong', 'cai_dat', 'nhap_xuat'];
const PERM_DEFAULTS = {
  nhan_vien: { so_giay_to: true, doanh_so_minh: true, doanh_so: false, hoa_don: false, hop_dong: false, cai_dat: false, nhap_xuat: false },
  quan_ly: { so_giay_to: true, doanh_so_minh: true, doanh_so: true, hoa_don: true, hop_dong: true, cai_dat: true, nhap_xuat: true },
};
// DANH SÁCH CHO PHÉP rõ ràng: hàm → quyền cần ('base' = mọi người dùng liên kết). Hàm không có ở đây → FORBIDDEN (vd. 'eval').
const FN_PERMS = {};
['listRecords', 'createRecord', 'updateRecord', 'setHidden', 'savePerson', 'getPersonDocs', 'logReferralSheet',
  'createApplication', 'addApplicationStatus', 'cancelApplicationStatus', 'getApplicationLogs', 'saveInterview', 'listInterviews',
  'getUpcomingInterviews', 'startEmployment', 'endEmployment', 'getDashboard', 'getPipeline', 'getTasks', 'getWorking', 'getConversion',
  'uploadCaseFile', 'markTodokede', 'getFinanceSettings', 'whoAmI', 'getPermissions', 'updateEmployment',
  'getPreEntries', 'startFromPreEntry', 'getMissingDocs', 'getPreTemplates', 'getMendanPlan', 'changeMyPassword'].forEach((f) => { FN_PERMS[f] = 'base'; });
FN_PERMS.getMySales = 'doanh_so_minh';
['getRevenueTodo', 'applyRevenueTodo', 'saveRevenue', 'setRevenueHidden', 'saveTarget', 'getSales'].forEach((f) => { FN_PERMS[f] = 'doanh_so'; });
['listInvoices', 'getInvoice', 'getUninvoiced', 'createInvoice', 'issueInvoice', 'cancelInvoice', 'getPayoutTodo'].forEach((f) => { FN_PERMS[f] = 'hoa_don'; });
['getSetupStatus', 'backupNow', 'getBackupStatus', 'getTaskSettings', 'saveTaskSetting', 'getChecklistTemplates', 'saveChecklistTemplate',
  'saveFinanceSettings', 'savePreTemplate'].forEach((f) => { FN_PERMS[f] = 'cai_dat'; });
['getImportFields', 'importRows', 'exportData'].forEach((f) => { FN_PERMS[f] = 'nhap_xuat'; });
// Bảng nào cần quyền gì (đọc qua listRecords / ghi qua createRecord, updateRecord, setHidden).
const TABLE_PERMS = { REVENUE: 'doanh_so', TARGET: 'doanh_so', INVOICE: 'hoa_don', PAYMENT: 'hoa_don', REFERRER_PAYOUT: 'hoa_don', CONTRACT: 'hop_dong' };
const TABLE_WRITE_PERMS = { STAFF: 'cai_dat', LOOKUP: 'cai_dat' };
const MONEY_TASK_RULES = ['invoice_overdue', 'revenue_todo'];

let ACTOR_ = null;   // { id, ma, ho_ten, vai_tro, perms, sessionKey } khi gọi qua api()
let SYSTEM_ = false; // tạm mở cho việc nội bộ (kiểm tra liên kết, trình kích hoạt sao lưu)
let CALLER_EMAIL_ = null;

function callerEmail_() {
  if (CALLER_EMAIL_ === null) CALLER_EMAIL_ = Session.getActiveUser().getEmail() || '';
  return CALLER_EMAIL_;
}
function isOwner_() {
  const a = callerEmail_();
  return !!a && a === Session.getEffectiveUser().getEmail();
}
// 'owner' | 'quan_ly' | 'nhan_vien' | null
function actorRole_() {
  if (ACTOR_) return ACTOR_.vai_tro;
  return isOwner_() || SYSTEM_ ? 'owner' : null;
}
function requireAccess_() { if (!actorRole_()) throw new Error('FORBIDDEN'); }
function requireOwner_() { CALLER_EMAIL_ = null; if (ACTOR_ || !(isOwner_() || SYSTEM_)) throw new Error('FORBIDDEN'); }
function asSystem_(fn) { const was = SYSTEM_; SYSTEM_ = true; try { return fn(); } finally { SYSTEM_ = was; } }

function hashToken_(token) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token), Utilities.Charset.UTF_8);
  return bytes.map((b) => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

// ---- GĐ 12.1 (D-083): mật khẩu + phiên đăng nhập ----
const SESSION_IDLE_S = 7200;  // phiên hết hạn sau 2 giờ không dùng
const LOGIN_MAX_FAILS = 5;    // sai 5 lần → khóa tạm LOGIN_LOCK_S giây
const LOGIN_LOCK_S = 900;
// shortcut: 5.000 vòng PBKDF2 (khuyến nghị hiện nay cao hơn nhiều) vì Apps Script chậm; bù bằng khóa tạm khi sai + file Sheets không chia sẻ. Số vòng nằm trong chuỗi băm → tăng được sau khi đo thời gian đăng nhập thật.
const PBKDF2_ITER = 5000;
const TEMP_PREFIX = 'tmp$'; // mật khẩu tạm do chủ đặt → bắt đổi ở lần đăng nhập đầu

function cache_() { return CacheService.getScriptCache(); }
const toBytes_ = (s) => Utilities.newBlob(String(s)).getBytes();
const roleOf_ = (s) => (ROLES.indexOf(s.vai_tro) >= 0 ? s.vai_tro : 'nhan_vien');
const isTemp_ = (s) => String(s.khoa_hash || '').indexOf(TEMP_PREFIX) === 0;
// Dấu của mật khẩu hiện hành, lưu kèm phiên: đổi / đặt lại / khóa mật khẩu → mọi phiên cũ hết hiệu lực.
const passFp_ = (s) => String(s.khoa_hash || '').slice(-16);
const sessionKey_ = (token) => 'S_' + hashToken_(token);

// PBKDF2-HMAC-SHA256, 32 byte (RFC 8018) — Apps Script không có sẵn.
function pbkdf2_(password, salt, iter) {
  const key = toBytes_(password);
  let u = Utilities.computeHmacSha256Signature(toBytes_(salt).concat([0, 0, 0, 1]), key);
  const out = u.slice();
  for (let i = 1; i < iter; i++) {
    u = Utilities.computeHmacSha256Signature(u, key);
    for (let j = 0; j < out.length; j++) out[j] ^= u[j];
  }
  return Utilities.base64Encode(out);
}
function hashPassword_(password) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  return ['pbkdf2', PBKDF2_ITER, salt, pbkdf2_(password, salt, PBKDF2_ITER)].join('$');
}
// Mã băm liên kết cũ (GĐ 10) hay ô trống → không khớp.
function checkPassword_(password, stored) {
  const p = String(stored || '').replace(/^tmp\$/, '').split('$');
  return p.length === 4 && p[0] === 'pbkdf2' && Number(p[1]) > 0 && pbkdf2_(password, p[2], Number(p[1])) === p[3];
}

function activeStaff_(pred) {
  return asSystem_(() => {
    freshCall_();
    return readAll_(openTable_('STAFF')).find((s) => pred(s) && s.trang_thai === 'dang_lam' && !s.da_an) || null;
  });
}

// Phiên còn hạn + nhân viên còn làm, chưa ẩn, mật khẩu chưa đổi / chưa bị khóa → bản ghi (và gia hạn phiên); khác → null.
function staffBySession_(token) {
  if (!/^[a-z0-9]{32,200}$/.test(String(token || ''))) return null;
  const key = sessionKey_(token);
  let v = null;
  try { v = JSON.parse(cache_().get(key) || 'null'); } catch (e) { v = null; }
  if (!v) return null;
  const s = activeStaff_((r) => r.id === v.id);
  if (!s || !s.khoa_hash || passFp_(s) !== v.fp) return null;
  cache_().put(key, JSON.stringify(v), SESSION_IDLE_S);
  return s;
}

function sessionInfo_(s) {
  const role = roleOf_(s);
  return { role: role, who: s.ho_ten, ma: s.ma, perms: asSystem_(() => permissions_()[role]), mustChange: isTemp_(s) };
}

// Gọi thẳng từ màn hình đăng nhập (chưa có phiên). Sai ID hay sai mật khẩu đều báo chung LOGIN_FAILED.
function login(id, password) {
  const ma = String(id || '').trim().toUpperCase().slice(0, 50);
  const lockKey = 'L_' + ma;
  // shortcut: bộ đếm sai nằm trong CacheService, Google có thể xóa sớm → khóa tạm có thể ngắn hơn 15 phút; cần chặt hơn thì lưu vào Sheets.
  const fails = Number(cache_().get(lockKey) || 0);
  if (fails >= LOGIN_MAX_FAILS) throw new Error('LOCKED');
  const s = ma ? activeStaff_((r) => r.ma === ma) : null;
  if (!s || !checkPassword_(String(password || ''), s.khoa_hash)) {
    cache_().put(lockKey, String(fails + 1), LOGIN_LOCK_S);
    throw new Error('LOGIN_FAILED');
  }
  cache_().remove(lockKey);
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase();
  cache_().put(sessionKey_(token), JSON.stringify({ id: s.id, fp: passFp_(s) }), SESSION_IDLE_S);
  return Object.assign({ token: token }, sessionInfo_(s));
}

// Tải lại trang: giao diện giữ token trong sessionStorage của tab → hỏi lại máy chủ.
function resumeSession(token) {
  const s = staffBySession_(token);
  if (!s) throw new Error('SESSION_EXPIRED');
  return sessionInfo_(s);
}

function logout(token) {
  if (/^[a-z0-9]{32,200}$/.test(String(token || ''))) cache_().remove(sessionKey_(token));
  return true;
}

// Cổng duy nhất cho nhân viên đã đăng nhập: kiểm phiên → hàm có trong danh sách + đủ quyền → kiểm tham số → chạy với ACTOR_.
function api(token, fn, args) {
  const s = staffBySession_(token);
  if (!s) throw new Error('SESSION_EXPIRED');
  const role = roleOf_(s);
  const name = String(fn || '');
  if (isTemp_(s) && name !== 'changeMyPassword') throw new Error('FORBIDDEN|mustChange');
  const need = Object.prototype.hasOwnProperty.call(FN_PERMS, name) && OWNER_ONLY_FNS.indexOf(name) < 0 ? FN_PERMS[name] : null;
  const perms = asSystem_(() => permissions_()[role]);
  if (!need || (need !== 'base' && !perms[need])) throw new Error('FORBIDDEN|' + name);
  const target = globalThis[name]; // chỉ tra tên đã có trong danh sách cho phép
  if (typeof target !== 'function') throw new Error('FORBIDDEN|' + name);
  const a = Array.isArray(args) ? args : [];
  checkArgs_(name, a, perms);
  ACTOR_ = { id: s.id, ma: s.ma, ho_ten: s.ho_ten, vai_tro: role, perms: perms, sessionKey: sessionKey_(token) };
  try { return target.apply(null, a); } finally { ACTOR_ = null; }
}

function checkArgs_(fn, a, perms) {
  const table = String(a[0] || '');
  const ok = (p) => !p || perms[p];
  if (fn === 'listRecords' && !ok(TABLE_PERMS[table])) throw new Error('FORBIDDEN|' + table);
  if (['createRecord', 'updateRecord', 'setHidden'].indexOf(fn) >= 0 && !(ok(TABLE_PERMS[table]) && ok(TABLE_WRITE_PERMS[table]))) {
    throw new Error('FORBIDDEN|' + table);
  }
  if (fn === 'getPersonDocs' && a[1] && !perms.so_giay_to) throw new Error('FORBIDDEN|reveal');
  // Đổi vai trò = cấp quyền → chỉ chủ (kể cả người có "Cài đặt chung" cũng không tự nâng mình lên Quản lý).
  const data = fn === 'createRecord' ? a[1] : fn === 'updateRecord' ? a[2] : null;
  if (table === 'STAFF' && data && typeof data === 'object' && data.vai_tro !== undefined) throw new Error('FORBIDDEN|vai_tro');
}

// Quyền hiện hành (chủ / trình hệ thống: tất cả).
function can_(perm) {
  if (ACTOR_) return !!(ACTOR_.perms && ACTOR_.perms[perm]);
  return actorRole_() === 'owner';
}

// Bảng quyền đã lưu, gộp với mặc định.
function permissions_() {
  const row = readAll_(openTable_('SETTING')).find((r) => r.khoa === 'permissions');
  let v = {};
  try { v = row ? JSON.parse(row.gia_tri) : {}; } catch (e) { v = {}; }
  const out = { sua_luc: row ? row.sua_luc : '' };
  ROLES.forEach((r) => { out[r] = {}; PERMS.forEach((p) => { out[r][p] = v[r] && typeof v[r][p] === 'boolean' ? v[r][p] : PERM_DEFAULTS[r][p]; }); });
  return out;
}

// Chủ: cả bảng; người dùng liên kết: quyền của chính mình.
function getPermissions() {
  freshCall_();
  requireAccess_();
  if (ACTOR_) return { role: ACTOR_.vai_tro, perms: ACTOR_.perms };
  const all = permissions_();
  const own = {}; PERMS.forEach((p) => { own[p] = true; });
  return { role: 'owner', perms: own, matrix: { nhan_vien: all.nhan_vien, quan_ly: all.quan_ly }, sua_luc: all.sua_luc, defaults: PERM_DEFAULTS };
}

function savePermissions(matrix, expectedSuaLuc) {
  requireOwner_();
  const m = matrix || {};
  const v = {};
  ROLES.forEach((r) => { v[r] = {}; PERMS.forEach((p) => { v[r][p] = !!(m[r] && m[r][p]); }); });
  return withLock_(() => {
    freshCall_();
    const t = openTable_('SETTING');
    const row = readAll_(t).find((r) => r.khoa === 'permissions');
    if (row) {
      if (row.sua_luc !== String(expectedSuaLuc || '')) throw new Error('CONFLICT');
      writeChange_('SETTING', t, row, { gia_tri: JSON.stringify(v) }, 'sua');
    } else {
      if (expectedSuaLuc) throw new Error('CONFLICT');
      insertMany_('SETTING', t, [{ khoa: 'permissions', gia_tri: JSON.stringify(v) }]);
    }
    return getPermissions();
  });
}

function whoAmI() {
  const role = actorRole_();
  if (!role) throw new Error('FORBIDDEN');
  return ACTOR_ ? { role: role, ho_ten: ACTOR_.ho_ten, ma: ACTOR_.ma } : { role: 'owner', ho_ten: '', ma: '' };
}

// Nhân viên tự đổi mật khẩu (qua api). Phiên đang dùng được giữ; phiên khác của người này hết hiệu lực.
function changeMyPassword(oldPassword, newPassword) {
  if (!ACTOR_) throw new Error('FORBIDDEN'); // chủ đăng nhập bằng Google, không có mật khẩu
  const pw = String(newPassword || '');
  if (pw.length < 8) throw vError_('mat_khau', 'tooShort', { min: 8 });
  if (pw.length > 100) throw vError_('mat_khau', 'tooLong', { max: 100 });
  if (pw.trim().toUpperCase() === ACTOR_.ma) throw vError_('mat_khau', 'weakPassword');
  return withLock_(() => {
    freshCall_();
    const t = openTable_('STAFF');
    const s = readAll_(t).find((r) => r.id === ACTOR_.id);
    if (!checkPassword_(String(oldPassword || ''), s.khoa_hash)) throw vError_('mat_khau_cu', 'wrongPassword');
    if (checkPassword_(pw, s.khoa_hash)) throw vError_('mat_khau', 'samePassword');
    const next = writeChange_('STAFF', t, s, { khoa_hash: hashPassword_(pw), khoa_luc: nowJst_() }, 'doi_mat_khau');
    cache_().put(ACTOR_.sessionKey, JSON.stringify({ id: s.id, fp: passFp_(next) }), SESSION_IDLE_S);
    return true;
  });
}

// ---- Quản lý đăng nhập (chỉ chủ) ----
// Đặt / đặt lại mật khẩu tạm (12 ký tự ngẫu nhiên): chỉ trả MỘT lần; người dùng phải đổi ở lần đăng nhập đầu. Phiên cũ hết hiệu lực.
function setStaffPassword(staffId) {
  requireOwner_();
  return withLock_(() => {
    freshCall_();
    const t = openTable_('STAFF');
    const s = readAll_(t).find((r) => r.id === staffId);
    if (!s) throw new Error('NOT_FOUND');
    if (s.trang_thai !== 'dang_lam' || s.da_an) throw vError_('trang_thai', 'staffInactive');
    const pw = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    writeChange_('STAFF', t, s, { khoa_hash: TEMP_PREFIX + hashPassword_(pw), khoa_luc: nowJst_() }, 'dat_mat_khau');
    cache_().remove('L_' + s.ma); // mở khóa tạm do sai nhiều lần
    return { id: s.ma, password: pw };
  });
}

// Khóa đăng nhập: xóa mật khẩu → không đăng nhập được, mọi phiên hết hiệu lực ngay. Mở lại = đặt mật khẩu mới.

function revokeAccess(staffId) {
  requireOwner_();
  return withLock_(() => {
    freshCall_();
    const t = openTable_('STAFF');
    const s = readAll_(t).find((r) => r.id === staffId);
    if (!s) throw new Error('NOT_FOUND');
    return public_(writeChange_('STAFF', t, s, { khoa_hash: '', khoa_luc: '' }, 'thu_hoi_lien_ket'));
  });
}
