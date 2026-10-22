// Bước 1.6: đo tốc độ trên file riêng HR_PERF_TEST với dữ liệu giả (D-041).
// Không đụng HR_DATA_TEST; file đo không nằm trong bản sao lưu.
const PERF_TARGETS = { STAFF: 1000, COMPANY: 1000, JOB_ORDER: 1000, PERSON: 1000, APPLICATION: 3000, AUDIT_LOG: 10000 };
const PERF_THRESHOLDS_MS = { list: 3000, save: 3000, appLoad: 5000 }; // D-041

function fakeRow_(table, headers, n) {
  const no = String(n).padStart(5, '0');
  return headers.map((h) => {
    if (h === 'id') return 'perf-' + table + '-' + no;
    if (h === 'ma') return TABLE_RULES[table] ? TABLE_RULES[table].prefix + '-' + String(n).padStart(4, '0') : table.slice(0, 3) + '-' + no;
    if (h === 'da_an') return '';
    if (h === 'trang_thai' && table === 'STAFF') return 'dang_lam';
    if (/_luc$|thoi_gian/.test(h)) return '2026-01-01 09:00:00';
    if (/_id$/.test(h)) return 'perf-ref-' + String(n % 1000).padStart(5, '0');
    if (/^gia_tri_/.test(h)) return '{"ho_ten":"Dữ liệu giả ' + no + '"}';
    return 'Dữ liệu giả ' + h + ' ' + no;
  });
}

// Tạo (hoặc bổ sung cho đủ) dữ liệu giả. Chạy nhiều lần chỉ thêm phần còn thiếu.
function preparePerfData() {
  requireOwner_();
  if (ENV === 'PROD') throw new Error('PERF_TEST_ONLY'); // bản thật: không tạo file đo tốc độ
  return withLock_(() => {
    const props = scriptProps_();
    const root = findSaved_(props, 'ROOT_FOLDER', (id) => DriveApp.getFolderById(id));
    if (!root) throw new Error('NOT_INITIALIZED');
    const started = Date.now();
    const perf = getOrCreateSpreadsheet_(props, 'PERF', root, []);
    ensureTabs_(perf.ss, DATA_TABLES, perf.isNew, [], [], [], []);
    const counts = {};
    Object.keys(PERF_TARGETS).forEach((table) => {
      const sheet = perf.ss.getSheetByName(table);
      const headers = headersOf_(DATA_TABLES[table]);
      const have = Math.max(sheet.getLastRow() - 1, 0);
      const need = PERF_TARGETS[table] - have;
      if (need > 0) {
        const rows = [];
        for (let i = 1; i <= need; i++) rows.push(fakeRow_(table, headers, have + i));
        const range = sheet.getRange(have + 2, 1, need, headers.length);
        range.setNumberFormat('@');
        range.setValues(rows);
      }
      counts[table] = Math.max(have, PERF_TARGETS[table]);
      formatAsText_(sheet, headers.length);
    });
    props.setProperty(textFormatKey_('PERF'), perf.ss.getId());
    return { counts: counts, ms: Date.now() - started, url: perf.ss.getUrl() };
  });
}

// Một thao tác đo, gọi riêng từ trình duyệt để đo được cả độ trễ người dùng thấy.
// op: list | listApplication | create | update | hide. Trả về thời gian xử lý trên máy chủ.
function perfOp(op, arg) {
  requireOwner_();
  if (ENV === 'PROD') throw new Error('PERF_TEST_ONLY');
  dataFileKey_ = 'PERF';
  freshCall_();
  perfTimes_ = {};
  try {
    const started = Date.now();
    let result = null;
    // Trả cả danh sách về trình duyệt như màn hình thật, để đo đúng thời gian truyền dữ liệu.
    if (op === 'list') result = listRecords('STAFF');
    else if (op === 'listApplication') result = readAll_(openTable_('APPLICATION')).map(public_);
    else if (op === 'create') result = createRecord('STAFF', { ho_ten: 'Đo tốc độ ' + Date.now() });
    else if (op === 'update') result = updateRecord('STAFF', arg.id, { ho_ten: 'Đo tốc độ (đã sửa) ' + Date.now() }, arg.sua_luc);
    else if (op === 'hide') result = setHidden('STAFF', arg.id, true, arg.sua_luc);
    else throw new Error('UNKNOWN_OP|' + op);
    const serverMs = Date.now() - started;
    const parts = Object.assign({}, perfTimes_);
    parts.khac = Math.max(serverMs - Object.keys(parts).reduce((s, k) => s + parts[k], 0), 0);
    return { op: op, serverMs: serverMs, parts: parts, result: result, thresholds: PERF_THRESHOLDS_MS };
  } finally {
    dataFileKey_ = 'DATA';
    perfTimes_ = null;
    freshCall_();
  }
}
