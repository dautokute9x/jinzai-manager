// GĐ 10 (D-075): nhiều người dùng trên Gmail cá nhân.
// Web app chạy dưới tài khoản chủ ("Thực thi: Tôi") → Google KHÔNG cho biết email người dùng Gmail khác (chỉ thấy email của chủ).
// Nên mỗi nhân viên dùng LIÊN KẾT TRUY CẬP RIÊNG (?k=…): chủ tạo / thu hồi trong Cài đặt → Nhân viên. Chỉ lưu mã băm SHA-256.
// Mọi lần gọi máy chủ của nhân viên đi qua api(); mở dữ liệu (openTable_) mà không phải chủ / không qua api → FORBIDDEN.

const ROLES = ['nhan_vien', 'quan_ly'];
// Chỉ chủ (tài khoản triển khai) được gọi — kể cả quản lý dùng liên kết cũng không.
const OWNER_ONLY_FNS = ['initTestData', 'setProdEnv', 'restoreBackup', 'enableAutoBackup', 'preparePerfData', 'perfOp',
  'issueAccessLink', 'revokeAccess', 'savePermissions', 'getFileLink', 'importLegacy']; // D-079: nhập file quản lý cũ (dữ liệu thật) chỉ chủ

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
  'getPreEntries', 'startFromPreEntry', 'getMissingDocs', 'getPreTemplates', 'getMendanPlan'].forEach((f) => { FN_PERMS[f] = 'base'; });
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

let ACTOR_ = null;   // { id, ma, ho_ten, vai_tro } khi gọi qua api()
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

// Nhân viên còn làm, chưa ẩn, có liên kết khớp → bản ghi; khác → null.
function staffByToken_(token) {
  if (!/^[a-z0-9]{32,200}$/.test(String(token || ''))) return null;
  const h = hashToken_(token);
  return asSystem_(() => {
    freshCall_();
    return readAll_(openTable_('STAFF')).find((s) => s.khoa_hash === h && s.trang_thai === 'dang_lam' && !s.da_an) || null;
  });
}

// Cổng duy nhất cho người dùng liên kết: kiểm liên kết → hàm có trong danh sách + đủ quyền → kiểm tham số → chạy với ACTOR_.
function api(token, fn, args) {
  const s = staffByToken_(token);
  if (!s) throw new Error('FORBIDDEN|link');
  const role = ROLES.indexOf(s.vai_tro) >= 0 ? s.vai_tro : 'nhan_vien';
  const name = String(fn || '');
  const need = Object.prototype.hasOwnProperty.call(FN_PERMS, name) && OWNER_ONLY_FNS.indexOf(name) < 0 ? FN_PERMS[name] : null;
  const perms = asSystem_(() => permissions_()[role]);
  if (!need || (need !== 'base' && !perms[need])) throw new Error('FORBIDDEN|' + name);
  const target = globalThis[name]; // chỉ tra tên đã có trong danh sách cho phép
  if (typeof target !== 'function') throw new Error('FORBIDDEN|' + name);
  const a = Array.isArray(args) ? args : [];
  checkArgs_(name, a, perms);
  ACTOR_ = { id: s.id, ma: s.ma, ho_ten: s.ho_ten, vai_tro: role, perms: perms };
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

// ---- Quản lý liên kết (chỉ chủ) ----
function issueAccessLink(staffId) {
  requireOwner_();
  return withLock_(() => {
    freshCall_();
    const t = openTable_('STAFF');
    const s = readAll_(t).find((r) => r.id === staffId);
    if (!s) throw new Error('NOT_FOUND');
    if (s.trang_thai !== 'dang_lam' || s.da_an) throw vError_('trang_thai', 'staffInactive');
    const token = (Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase();
    writeChange_('STAFF', t, s, { khoa_hash: hashToken_(token), khoa_luc: nowJst_() }, 'cap_lien_ket');
    let base = '';
    try { base = ScriptApp.getService().getUrl() || ''; } catch (e) { base = ''; }
    return { token: token, url: base ? base + '?k=' + token : '' }; // chỉ trả MỘT lần; sau đó chỉ còn mã băm
  });
}

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
