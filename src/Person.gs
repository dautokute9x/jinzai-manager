// Bước 3.1: Con người — hồ sơ + số giấy tờ (file nhạy cảm, D-009) + cảnh báo nghi trùng (D-022).
// Lưu qua savePerson (không qua createRecord/updateRecord) để luôn kiểm tra trùng và tách số giấy tờ.
const DOC_FIELDS = ['so_ho_chieu', 'so_zairyu_card'];
const DOC_RE = /^[A-Z0-9]{6,20}$/;

// Quy tắc bảng PERSON / PERSON_SENSITIVE nằm trong TABLE_RULES ở Repo.gs (Apps Script chạy các file .gs theo thứ tự, để chung cho chắc).

// D-022 + 3.1 Q5: bỏ dấu (cả đ/Đ), không phân biệt hoa/thường, gộp khoảng trắng.
function normName_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'D')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

const normDoc_ = (v) => String(v || '').replace(/\s+/g, '').toUpperCase();

// Người khác (kể cả đã ẩn) khớp (a) tên + ngày sinh + quốc tịch, hoặc (b) số hộ chiếu. Không trả số giấy tờ.
function findDuplicates_(people, docs, rec, passport) {
  const name = normName_(rec.ho_ten_latin);
  return people.filter((p) => p.id !== rec.id).map((p) => {
    const reasons = [];
    if (name && rec.ngay_sinh && rec.quoc_tich && normName_(p.ho_ten_latin) === name && p.ngay_sinh === rec.ngay_sinh && p.quoc_tich === rec.quoc_tich) reasons.push('ten');
    const d = docs.find((x) => x.person_id === p.id);
    if (passport && d && d.so_ho_chieu === passport) reasons.push('ho_chieu');
    return reasons.length ? { id: p.id, ma: p.ma, ho_ten_latin: p.ho_ten_latin, ngay_sinh: p.ngay_sinh, da_an: p.da_an, reasons: reasons } : null;
  }).filter((x) => x);
}

// Lưu hồ sơ (id trống = thêm mới). data có thể kèm so_ho_chieu / so_zairyu_card: trống = giữ nguyên số cũ.
// Có người nghi trùng và chưa xác nhận → trả { duplicates } và KHÔNG lưu gì.
function savePerson(id, data, expectedSuaLuc, confirmDuplicate) {
  const rules = TABLE_RULES.PERSON;
  return withLock_(() => {
    freshCall_();
    const t = openTable_('PERSON');
    let current = null;
    if (id) {
      const idx = readColumn_(t, 'id').indexOf(id);
      if (idx < 0) throw new Error('NOT_FOUND');
      current = readRow_(t, idx + 2);
      if (current.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    }
    const patch = clean_(rules, data);
    const rec = Object.assign({}, current || rules.defaults, patch);
    // Thêm mới trong app: vẫn bắt buộc ngày sinh + quốc tịch (D-022). Hồ sơ nhập từ file cũ thiếu thì sửa được, không bị chặn (D-079).
    if (!current && !rec.ngay_sinh) throw vError_('ngay_sinh', 'required');
    if (!current && !rec.quoc_tich) throw vError_('quoc_tich', 'required');
    check_(rules, rec);
    checkRefs_(rules, rec, current);
    const newDocs = {};
    DOC_FIELDS.forEach((f) => {
      const v = normDoc_(data && data[f]);
      if (!v) return;
      if (!DOC_RE.test(v)) throw new Error('VALIDATION|' + JSON.stringify({ field: f, code: 'invalidFormat' }));
      newDocs[f] = v;
    });

    const s = openTable_('PERSON_SENSITIVE');
    const docs = readAll_(s);
    const docCur = current ? docs.find((d) => d.person_id === current.id) : null;
    const passport = newDocs.so_ho_chieu || (docCur && docCur.so_ho_chieu) || '';
    const keyChanged = !current || newDocs.so_ho_chieu ||
      ['ho_ten_latin', 'ngay_sinh', 'quoc_tich'].some((f) => normName_(rec[f]) !== normName_(current[f]));
    if (keyChanged && !confirmDuplicate) {
      // GĐ 10 (review bảo mật): người không có quyền xem số đầy đủ không được dùng kiểm tra trùng để dò số hộ chiếu → chỉ so tên + ngày sinh + quốc tịch.
      const dups = findDuplicates_(readAll_(t), docs, rec, can_('so_giay_to') ? passport : '');
      if (dups.length) return { duplicates: dups };
    }

    const saved = current ? writeChange_('PERSON', t, current, patch, 'sua') : insertMany_('PERSON', t, [rec])[0];
    if (Object.keys(newDocs).length) {
      if (docCur) writeChange_('PERSON_SENSITIVE', s, docCur, newDocs, 'sua');
      else insertMany_('PERSON_SENSITIVE', s, [Object.assign({ person_id: saved.id, so_ho_chieu: '', so_zairyu_card: '' }, newDocs)]);
    }
    return { person: public_(saved) };
  });
}

// D-074: in phiếu giới thiệu (gửi khách) → ghi nhật ký ai in, lúc nào (không ghi nội dung).
function logReferralSheet(personId) {
  freshCall_();
  if (readColumn_(openTable_('PERSON'), 'id').indexOf(personId) < 0) throw new Error('NOT_FOUND');
  withLock_(() => audit_('PERSON', personId, 'in_phieu', {}, {}, currentUser_(), nowJst_()));
  return true;
}

// Số giấy tờ của 1 người: mặc định che (chỉ hiện 4 ký tự cuối); reveal = true khi bấm "Hiện" (3.1 Q3).
function getPersonDocs(personId, reveal) {
  freshCall_();
  const d = readAll_(openTable_('PERSON_SENSITIVE')).find((x) => x.person_id === personId) || {};
  // D-052: mỗi lần xem số đầy đủ ghi 1 dòng nhật ký (ai, lúc nào) — không ghi số.
  if (reveal && (d.so_ho_chieu || d.so_zairyu_card)) withLock_(() => audit_('PERSON_SENSITIVE', personId, 'xem_so', {}, {}, currentUser_(), nowJst_()));
  const show = (v) => (!v ? '' : reveal ? v : '*'.repeat(Math.max(v.length - 4, 0)) + v.slice(-4));
  return { so_ho_chieu: show(d.so_ho_chieu), so_zairyu_card: show(d.so_zairyu_card), revealed: !!reveal };
}
