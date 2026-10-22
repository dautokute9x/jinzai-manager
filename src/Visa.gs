// Bước 6.3 (D-065): mẫu checklist giấy tờ theo thủ tục visa. Lưu ở SETTING, khóa 'checklist.<thủ tục>', giá trị JSON {"ids":[...]}.
// Chưa lưu mẫu = mọi giấy tờ đang hiệu lực trong danh mục 'giay_to'.

// GĐ 11.2: thêm mẫu giấy tờ cho 受入れ前 ('pre_nuoc_ngoai' / 'pre_trong_nuoc'); chưa lưu = trống (giấy tờ visa đã nằm ở hồ sơ visa).
const CHECKLIST_KINDS = VISA_TYPES.concat(PRE_TYPES.map((x) => 'pre_' + x));
function checklistTemplates_() {
  const active = allowedRefs_('giay_to');
  const saved = readAll_(openTable_('SETTING'));
  const out = {};
  CHECKLIST_KINDS.forEach((loai) => {
    const row = saved.find((r) => r.khoa === 'checklist.' + loai);
    let ids = null;
    try { ids = row ? JSON.parse(row.gia_tri).ids : null; } catch (e) { ids = null; }
    const fallback = loai.indexOf('pre_') === 0 ? [] : active.slice();
    out[loai] = { ids: Array.isArray(ids) ? ids.filter((id) => active.indexOf(id) >= 0) : fallback, custom: !!row, sua_luc: row ? row.sua_luc : '' };
  });
  return out;
}

function checklistTemplate_(loai) {
  const tpl = checklistTemplates_()[loai];
  return tpl ? tpl.ids : [];
}

function getChecklistTemplates() {
  freshCall_();
  return checklistTemplates_();
}

function saveChecklistTemplate(loai, ids, expectedSuaLuc) {
  if (CHECKLIST_KINDS.indexOf(loai) < 0) throw vError_('loai_thu_tuc', 'invalidChoice');
  const list = Array.isArray(ids) ? ids.map(String) : [];
  return withLock_(() => {
    freshCall_();
    const active = allowedRefs_('giay_to');
    if (list.some((id) => active.indexOf(id) < 0)) throw vError_('giay_to', 'invalidChoice');
    const t = openTable_('SETTING');
    const row = readAll_(t).find((r) => r.khoa === 'checklist.' + loai);
    const gia_tri = JSON.stringify({ ids: list.filter((id, i) => list.indexOf(id) === i) });
    if (row) {
      if (row.sua_luc !== String(expectedSuaLuc || '')) throw new Error('CONFLICT');
      writeChange_('SETTING', t, row, { gia_tri: gia_tri }, 'sua');
    } else {
      if (expectedSuaLuc) throw new Error('CONFLICT');
      insertMany_('SETTING', t, [{ khoa: 'checklist.' + loai, gia_tri: gia_tri }]);
    }
    return checklistTemplates_()[loai];
  });
}

// ---- Bước 6.4 (D-067): tải tệp giấy tờ lên Drive ----
// Thư mục HR_FILES_TEST (tạo khi Khởi tạo, không chia sẻ) → thư mục con theo mã người (vd. PER-0001), tên tệp có mã hồ sơ.
// file: { name, mime, base64 } (trình duyệt đọc tệp thành base64).
function uploadCaseFile(caseDocId, file) {
  const f = file || {};
  const name = String(f.name || '').trim();
  if (!name) throw vError_('ten_file', 'required');
  if (name.length > 200) throw vError_('ten_file', 'tooLong', { max: 200 });
  const magic = FILE_TYPES[f.mime];
  if (!magic) throw vError_('ten_file', 'fileType');
  const b64 = String(f.base64 || '');
  if (b64.length > Math.ceil(FILE_MAX_BYTES / 3) * 4 + 4) throw vError_('ten_file', 'fileSize');
  const bytes = Utilities.base64Decode(b64);
  if (!bytes.length) throw vError_('ten_file', 'required');
  if (bytes.length > FILE_MAX_BYTES) throw vError_('ten_file', 'fileSize');
  if (magic.some((b, i) => (bytes[i] & 0xFF) !== b)) throw vError_('ten_file', 'fileType'); // byte trong Apps Script có dấu
  return withLock_(() => {
    freshCall_();
    const doc = readAll_(openTable_('CASE_DOCUMENT')).find((r) => r.id === caseDocId && !r.da_an);
    // GĐ 11.2: dòng giấy tờ thuộc hồ sơ visa hoặc hồ sơ 受入れ前.
    const c = doc && (doc.case_id ? readAll_(openTable_('IMMIGRATION_CASE')) : readAll_(openTable_('PRE_ENTRY'))).find((r) => r.id === (doc.case_id || doc.pre_entry_id) && !r.da_an);
    const p = c && readAll_(openTable_('PERSON')).find((r) => r.id === c.person_id);
    if (!p) throw new Error('NOT_FOUND');
    const saved = personFolder_(p.ma).createFile(Utilities.newBlob(bytes, f.mime, c.ma + '_' + name));
    const rec = insertMany_('FILE', openTable_('FILE'), [{ loai_doi_tuong: 'CASE_DOCUMENT', doi_tuong_id: doc.id, drive_file_id: saved.getId(),
      loai_giay_to: doc.giay_to, ten_file: name, mime: f.mime, kich_thuoc: String(bytes.length) }])[0];
    const out = {};
    TABLE_RULES.FILE.listColumns.forEach((k) => { out[k] = rec[k]; }); // không trả drive_file_id
    return out;
  });
}

function personFolder_(ma) {
  const root = findSaved_(scriptProps_(), 'FILES_FOLDER', (id) => DriveApp.getFolderById(id));
  if (!root) throw new Error('NOT_INITIALIZED');
  const it = root.getFoldersByName(ma);
  return it.hasNext() ? it.next() : root.createFolder(ma);
}

// Trả link Drive của 1 tệp (chỉ chủ tài khoản mở được) và ghi nhật ký "xem_file".
function getFileLink(fileId) {
  freshCall_();
  const row = readAll_(openTable_('FILE')).find((r) => r.id === fileId && !r.da_an);
  if (!row) throw new Error('NOT_FOUND');
  const url = DriveApp.getFileById(row.drive_file_id).getUrl();
  withLock_(() => audit_('FILE', row.id, 'xem_file', {}, {}, currentUser_(), nowJst_()));
  return { url: url };
}
