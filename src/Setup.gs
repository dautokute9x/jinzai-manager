// Bước 1.3: tạo thư mục + file Sheets thử nghiệm trong Drive của chủ project (D-019, D-037).
// Bấm nhiều lần vẫn an toàn: chỉ tạo phần còn thiếu, không xóa/ghi đè dữ liệu.
// D-028 / 9a (D-070): môi trường đọc từ thuộc tính dự án APP_ENV. Mặc định TEST. Bản thật = MỘT DỰ ÁN APPS SCRIPT RIÊNG,
// chạy setProdEnv() một lần trong trình soạn thảo trước khi Khởi tạo → file tên không có đuôi _TEST, không hiện băng "thử nghiệm".
// Google đôi khi báo lỗi tạm "ストレージからの読み取り中にサーバーエラー… INTERNAL" khi đọc / ghi Script Properties (nhất là nhiều lần gọi
// cùng lúc) → đọc hết 1 lần / lần gọi, gặp lỗi tạm thì thử lại tối đa 4 lần (0,3 → 0,6 → 1,2 giây).
let PROPS_CACHE_ = null;
function retryStorage_(fn) {
  for (let i = 0; ; i++) {
    try { return fn(); } catch (e) {
      if (i >= 3 || !/INTERNAL|storage|ストレージ|server error|サーバー/i.test(String((e && e.message) || e))) throw e;
      Utilities.sleep(300 * Math.pow(2, i));
    }
  }
}
function scriptProps_() {
  const svc = PropertiesService.getScriptProperties();
  const c = () => { if (!PROPS_CACHE_) PROPS_CACHE_ = retryStorage_(() => svc.getProperties()); return PROPS_CACHE_; }; // luôn bản đệm hiện tại
  c();
  return {
    getProperty: (k) => (Object.prototype.hasOwnProperty.call(c(), k) ? c()[k] : null),
    getProperties: () => Object.assign({}, c()),
    setProperty: (k, v) => { retryStorage_(() => svc.setProperty(k, v)); if (PROPS_CACHE_) PROPS_CACHE_[k] = String(v); },
    deleteProperty: (k) => { retryStorage_(() => svc.deleteProperty(k)); if (PROPS_CACHE_) delete PROPS_CACHE_[k]; },
  };
}
const ENV = scriptProps_().getProperty('APP_ENV') === 'PROD' ? 'PROD' : 'TEST';
const ENV_SUFFIX_ = ENV === 'PROD' ? '' : '_TEST';
const NAMES = {
  ROOT_FOLDER: ENV === 'PROD' ? 'HR Tokutei' : 'HR Tokutei (TEST)',
  FILES_FOLDER: 'HR_FILES' + ENV_SUFFIX_,
  DATA: 'HR_DATA' + ENV_SUFFIX_,
  SENSITIVE: 'HR_SENSITIVE' + ENV_SUFFIX_,
  BACKUP_FOLDER: 'HR_BACKUP' + ENV_SUFFIX_, // D-040
  REPLACED_FOLDER: 'Đã thay thế',
  PERF: 'HR_PERF_TEST', // bước 1.6: dữ liệu giả để đo tốc độ, không sao lưu; chỉ dùng ở TEST
};

// Chạy tay MỘT LẦN trong trình soạn thảo của dự án bản thật (không gọi được từ giao diện web).
// Từ chối nếu dự án này đã có dữ liệu thử nghiệm, để không lẫn dữ liệu giả với dữ liệu thật.
function setProdEnv() {
  requireOwner_();
  const props = scriptProps_();
  if (props.getProperty('APP_ENV') === 'PROD') { console.log('Đã là môi trường thật (PROD).'); return 'Đã là môi trường thật (PROD).'; }
  if (Object.keys(props.getProperties()).some((k) => k.indexOf('TEST_') === 0)) {
    throw new Error('Dự án này đã có dữ liệu thử nghiệm. Hãy tạo một dự án Apps Script MỚI cho bản thật, dán code, rồi chạy setProdEnv() ở đó.');
  }
  props.setProperty('APP_ENV', 'PROD');
  const msg = 'Đã đặt môi trường thật (PROD). Mở web app → Cài đặt → Khởi tạo.';
  console.log(msg); // chạy trong trình soạn thảo: chỉ nhật ký thực thi hiện được kết quả
  return msg;
}
const META_TAB = '_META';

function propKey_(key) { return ENV + '_' + key + '_ID'; }

// 1.6b-C: định dạng "chữ thuần" cho toàn bộ dòng dữ liệu một lần, để lần ghi sau khỏi định dạng từng dòng.
// 1.6c-H: luôn để sẵn ≥ ROW_BLOCK dòng trống, để việc thêm dòng không rơi vào lúc người dùng bấm lưu.
function formatAsText_(sheet, columns) {
  const spare = sheet.getMaxRows() - sheet.getLastRow();
  if (spare < ROW_BLOCK) sheet.insertRowsAfter(sheet.getMaxRows(), ROW_BLOCK - spare);
  const rows = sheet.getMaxRows() - 1;
  if (rows > 0) sheet.getRange(2, 1, rows, columns).setNumberFormat('@');
}

// D-016: gắn bảo vệ "chỉ cảnh báo" — chủ file sửa tay sẽ bị Google hỏi lại; app vẫn ghi bình thường.
function protect_(sheet, protectedTabs) {
  if (sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) return;
  sheet.protect().setWarningOnly(true).setDescription('HR Tokutei: chỉ sửa qua app / アプリからのみ編集');
  protectedTabs.push(sheet.getName());
}

// Tìm lại mục đã tạo theo ID đã lưu. Mất/đã vào thùng rác thì dừng, KHÔNG tự tạo mới,
// để không che giấu việc mất dữ liệu.
function findSaved_(props, key, getById) {
  const id = props.getProperty(propKey_(key));
  if (!id) return null;
  let item = null;
  try { item = getById(id); } catch (e) { item = null; }
  if (!item || item.isTrashed()) throw new Error('MISSING_FILE|' + NAMES[key]);
  return item;
}

function getOrCreateFolder_(props, key, parent, created) {
  const found = findSaved_(props, key, (id) => DriveApp.getFolderById(id));
  if (found) return found;
  const folder = parent ? parent.createFolder(NAMES[key]) : DriveApp.createFolder(NAMES[key]);
  props.setProperty(propKey_(key), folder.getId());
  created.push(NAMES[key]);
  return folder;
}

function getOrCreateSpreadsheet_(props, key, folder, created) {
  const found = findSaved_(props, key, (id) => DriveApp.getFileById(id));
  if (found) return { ss: SpreadsheetApp.openById(found.getId()), isNew: false };
  const ss = SpreadsheetApp.create(NAMES[key]);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  props.setProperty(propKey_(key), ss.getId());
  created.push(NAMES[key]);
  return { ss: ss, isNew: true };
}

// Tiêu đề hiện có (bỏ ô trống cuối) là phần đầu của thiết kế mới → chỉ cần nối thêm cột.
function needsAppend_(actual, headers) {
  const have = actual.slice();
  while (have.length && have[have.length - 1] === '') have.pop();
  return have.length < headers.length && have.join('|') === headers.slice(0, have.length).join('|');
}

// Thêm tab còn thiếu. Tab đã có: chỉ nối cột mới vào cuối (bước 2.1) — gọi beforeUpgrade() đúng một lần
// trước lần nối đầu tiên (để sao lưu); tiêu đề khác kiểu khác thì chỉ báo, không sửa.
function ensureTabs_(ss, tables, isNew, created, warnings, protectedTabs, upgraded, beforeUpgrade) {
  const defaultSheet = isNew ? ss.getSheets()[0] : null;
  Object.keys(tables).forEach((name) => {
    const headers = headersOf_(tables[name]);
    const sheet = ss.getSheetByName(name);
    if (!sheet) {
      const s = ss.insertSheet(name);
      s.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      s.setFrozenRows(1);
      created.push(ss.getName() + ' › ' + name);
      protect_(s, protectedTabs);
      formatAsText_(s, headers.length);
      return;
    }
    protect_(sheet, protectedTabs);
    if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
    if (upgraded && needsAppend_(actual, headers)) {
      if (!upgraded.length && beforeUpgrade) beforeUpgrade();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      upgraded.push(ss.getName() + ' › ' + name);
    } else if (actual.join('|') !== headers.join('|')) warnings.push(ss.getName() + ' › ' + name);
    formatAsText_(sheet, headers.length);
  });
  // File mới tạo luôn kèm 1 tab trống mặc định: bỏ nó đi khi chắc chắn trống.
  if (defaultSheet && !tables[defaultSheet.getName()] && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }
}

function ensureMeta_(ss, created, protectedTabs) {
  const existing = ss.getSheetByName(META_TAB);
  if (existing) { protect_(existing, protectedTabs); return; }
  const s = ss.insertSheet(META_TAB);
  s.getRange(1, 1, 4, 2).setValues([
    ['key', 'value'],
    ['schema_version', SCHEMA_VERSION],
    ['env', ENV],
    ['created_at', Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')],
  ]);
  s.getRange(1, 1, 1, 2).setFontWeight('bold');
  s.setFrozenRows(1);
  created.push(ss.getName() + ' › ' + META_TAB);
  protect_(s, protectedTabs);
}

// Gọi từ nút "Khởi tạo / nâng cấp dữ liệu" ở trang Cài đặt (tên hàm giữ nguyên để không phải đổi chỗ gọi).
function initTestData() {
  requireOwner_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('BUSY'); // lần Khởi tạo trước (lần đầu có thể mất 1–3 phút) vẫn đang chạy
  try {
    const props = scriptProps_();
    const created = [];
    const warnings = [];
    const protectedTabs = [];
    const root = getOrCreateFolder_(props, 'ROOT_FOLDER', null, created);
    getOrCreateFolder_(props, 'FILES_FOLDER', root, created);
    const data = getOrCreateSpreadsheet_(props, 'DATA', root, created);
    const sens = getOrCreateSpreadsheet_(props, 'SENSITIVE', root, created);
    const upgraded = [];
    let safety = null;
    const beforeUpgrade = () => { safety = backupNow_('pre-upgrade'); }; // sao lưu cả cặp trước khi nối cột
    ensureTabs_(data.ss, DATA_TABLES, data.isNew, created, warnings, protectedTabs, upgraded, beforeUpgrade);
    ensureMeta_(data.ss, created, protectedTabs);
    ensureTabs_(sens.ss, SENSITIVE_TABLES, sens.isNew, created, warnings, protectedTabs, upgraded, beforeUpgrade);
    // Chỉ ghi phiên bản mới khi mọi tab đúng thiết kế.
    if (!warnings.length) data.ss.getSheetByName(META_TAB).getRange(2, 2).setValue(SCHEMA_VERSION);
    props.setProperty(textFormatKey_('DATA'), data.ss.getId()); // đánh dấu đúng file này đã định dạng
    props.setProperty(textFormatKey_('SENSITIVE'), sens.ss.getId());
    const seeded = warnings.length ? 0 : seedLookup_();
    const status = getSetupStatus();
    status.created = created;
    status.warnings = warnings;
    status.protectedCount = protectedTabs.length;
    status.upgraded = upgraded;
    status.safetyBackup = safety;
    status.seeded = seeded;
    return status;
  } finally {
    lock.releaseLock();
  }
}

// Trạng thái hiện tại để trang Cài đặt hiển thị. Không tạo gì.
function getSetupStatus() {
  requireAccess_();
  if (!can_('cai_dat')) throw new Error('FORBIDDEN');
  const props = scriptProps_();
  const items = [];
  let schemaVersion = null;
  ['ROOT_FOLDER', 'DATA', 'SENSITIVE', 'FILES_FOLDER'].forEach((key) => {
    const isFolder = key.indexOf('FOLDER') >= 0;
    const item = findSaved_(props, key, (id) => (isFolder ? DriveApp.getFolderById(id) : DriveApp.getFileById(id)));
    if (item) items.push({ name: NAMES[key], url: item.getUrl() });
  });
  const dataId = props.getProperty(propKey_('DATA'));
  if (dataId) {
    const meta = SpreadsheetApp.openById(dataId).getSheetByName(META_TAB);
    if (meta) schemaVersion = meta.getRange(2, 2).getValue();
  }
  return { initialized: items.length === 4, items: items, schemaVersion: schemaVersion };
}
