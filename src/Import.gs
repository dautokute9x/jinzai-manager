// 9a (D-070): nhập dữ liệu từ Sheets cũ (tải về dạng CSV → trình duyệt ghép cột → gửi từng lô ≤ 100 dòng).
// Mỗi dòng đi qua đúng kiểm tra của app (validate + danh mục + người phụ trách). dryRun = true: chỉ kiểm tra, không ghi.
// Khác nhập tay: nhận cả nhân viên đã nghỉ và mục danh mục đã hết hiệu lực (dữ liệu lịch sử). Giá trị tham chiếu nhận MÃ hoặc TÊN (vd. công ty "CO-0001" hoặc tên pháp nhân; nhân viên theo họ tên; danh mục theo tên VI/JA).

const IMPORT_TABLES = {
  STAFF: ['ho_ten', 'trang_thai'],
  COMPANY: ['ten_phap_nhan', 'ten_viet_tat', 'ten_phien_am', 'ma_buu_dien', 'tinh_thanh', 'dia_chi', 'dien_thoai', 'linh_vuc', 'trang_thai',
    'sales_staff_id', 'support_staff_id', 'ghi_chu'],
  CONTACT: ['company_id', 'ho_ten', 'ho_ten_phien_am', 'bo_phan', 'chuc_vu', 'so_dien_thoai', 'email', 'lien_he_chinh', 'ghi_chu'],
  JOB_ORDER: ['company_id', 'vi_tri', 'so_luong_can', 'phu_trach_staff_id', 'trang_thai_don', 'linh_vuc', 'tinh_thanh_lam_viec', 'dia_chi_lam_viec',
    'dieu_kien', 'yeu_cau', 'ngay_nhan_don', 'ngay_du_kien_vao_lam', 'ghi_chu'],
  PERSON: ['ho_ten_latin', 'ho_ten_katakana', 'ngay_sinh', 'gioi_tinh', 'quoc_tich', 'so_dien_thoai', 'email', 'dia_chi', 'noi_o', 'tu_cach_luu_tru',
    'han_luu_tru', 'han_ho_chieu', 'tieng_nhat', 'ky_nang', 'trang_thai_sang_loc', 'recruiter_staff_id', 'nguon', 'nguoi_gioi_thieu', 'ghi_chu',
    'so_ho_chieu', 'so_zairyu_card'],
};
const IMPORT_DATE_FIELDS_ = ['ngay_sinh', 'han_luu_tru', 'han_ho_chieu', 'ngay_nhan_don', 'ngay_du_kien_vao_lam'];
const IMPORT_MAX_ROWS_ = 100;

function getImportFields() {
  return IMPORT_TABLES;
}

// "2026/1/5", "2026.01.05", "2026-1-5" → "2026-01-05"; khác → giữ nguyên để báo lỗi định dạng.
function importDate_(v) {
  const m = /^\s*(\d{4})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})日?\s*$/.exec(String(v || ''));
  return m ? m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') : String(v || '').trim();
}

// offset: số dòng dữ liệu đã gửi ở các lô trước (để báo đúng dòng CSV khi trùng trong cùng file).
function importRows(table, rows, dryRun, offset) {
  const off = Number(offset) || 0;
  const fields = IMPORT_TABLES[table];
  if (!fields) throw new Error('UNKNOWN_TABLE|' + table);
  const list = Array.isArray(rows) ? rows : [];
  if (list.length > IMPORT_MAX_ROWS_) throw vError_('rows', 'tooMany', { max: IMPORT_MAX_ROWS_ });
  const run = () => {
    freshCall_();
    const rules = TABLE_RULES[table];
    const staff = readAll_(openTable_('STAFF'));
    const companies = readAll_(openTable_('COMPANY'));
    const lookups = readAll_(openTable_('LOOKUP')).filter((r) => !r.da_an);
    const norm = (s) => normName_(s);
    const one = (kind, text, rec) => {
      const v = String(text || '').trim();
      if (!v) return '';
      if (kind === 'staff') { const s = staff.find((x) => x.id === v || x.ma === v || norm(x.ho_ten) === norm(v)); return s ? s.id : null; }
      if (kind === 'company') { const c = companies.find((x) => x.id === v || x.ma === v || norm(x.ten_phap_nhan) === norm(v) || (x.ten_viet_tat && norm(x.ten_viet_tat) === norm(v))); return c ? c.id : null; }
      const loai = kind === 'company_linh_vuc' ? 'linh_vuc' : kind;
      const l = lookups.find((x) => x.loai === loai && (x.id === v || x.ma === v || norm(x.ten_vi) === norm(v) || (x.ten_ja && norm(x.ten_ja) === norm(v))));
      return l ? l.id : null;
    };
    const people = table === 'PERSON' ? readAll_(openTable_('PERSON')) : [];
    const docs = table === 'PERSON' ? readAll_(openTable_('PERSON_SENSITIVE')) : [];
    const results = [];
    const good = [];
    list.forEach((raw, i) => {
      try {
        const data = {};
        fields.forEach((f) => { if (raw && raw[f] !== undefined && raw[f] !== null) data[f] = String(raw[f]).trim(); });
        IMPORT_DATE_FIELDS_.forEach((f) => { if (data[f]) data[f] = importDate_(data[f]); });
        if (data.so_luong_can) data.so_luong_can = data.so_luong_can.replace(/[,\s名人]/g, '');
        Object.keys(rules.refs || {}).forEach((f) => {
          if (!data[f]) return;
          const parts = (rules.multi || []).indexOf(f) >= 0 || f === 'support_staff_id' || f === 'sales_staff_id'
            ? data[f].split(/[,、;／\/]/).map((x) => x.trim()).filter(String) : [data[f]];
          const ids = parts.map((p) => one(rules.refs[f], p));
          const bad = parts.filter((p, k) => !ids[k]);
          if (bad.length) throw vError_(f, 'notFound', { ma: bad.join(', ') });
          data[f] = ids.join(',');
        });
        const rec = Object.assign({}, rules.defaults, clean_(rules, data));
        check_(rules, rec);
        // Dữ liệu cũ: cho phép nhân viên đã nghỉ / danh mục hết hiệu lực (đã tìm thấy ở trên); chỉ kiểm lĩnh vực phải thuộc công ty.
        Object.keys(rules.refs || {}).filter((f) => rules.refs[f] === 'company_linh_vuc' && rec[f]).forEach((f) => {
          if (allowedRefs_('company_linh_vuc', rec).indexOf(rec[f]) < 0) throw vError_(f, 'invalidChoice');
        });
        let docRec = null;
        if (table === 'PERSON') {
          docRec = {};
          DOC_FIELDS.forEach((f) => {
            const v = normDoc_(data[f]);
            if (!v) return;
            if (!DOC_RE.test(v)) throw vError_(f, 'invalidFormat');
            docRec[f] = v;
          });
          const pool = people.concat(good.map((g) => Object.assign({ id: 'new' + g.row, ma: '(dòng ' + (g.row + 1 + off) + ')' }, g.rec)));
          const dups = findDuplicates_(pool, docs.concat(good.filter((g) => g.docRec && g.docRec.so_ho_chieu).map((g) => ({ person_id: 'new' + g.row, so_ho_chieu: g.docRec.so_ho_chieu }))),
            rec, docRec.so_ho_chieu || '');
          if (dups.length) throw vError_('ho_ten_latin', 'duplicate', { ma: dups.map((d) => d.ma).join(', ') });
        }
        good.push({ row: i + 1, rec: rec, docRec: docRec });
        results.push({ row: i + 1, ok: true });
      } catch (e) {
        const m = /VALIDATION\|(\{.*\})/.exec(e.message);
        results.push({ row: i + 1, ok: false, error: m ? JSON.parse(m[1]) : { code: 'other', msg: e.message } });
      }
    });
    if (dryRun || !good.length) return { results: results, created: 0 };
    const saved = insertMany_(table, openTable_(table), good.map((g) => g.rec));
    if (table === 'PERSON') {
      const docRows = saved.map((p, k) => (good[k].docRec && Object.keys(good[k].docRec).length
        ? Object.assign({ person_id: p.id, so_ho_chieu: '', so_zairyu_card: '' }, good[k].docRec) : null)).filter((x) => x);
      if (docRows.length) insertMany_('PERSON_SENSITIVE', openTable_('PERSON_SENSITIVE'), docRows);
    }
    saved.forEach((s, k) => { const r = results.find((x) => x.row === good[k].row); r.ma = s.ma; });
    return { results: results, created: saved.length };
  };
  return dryRun ? run() : withLock_(run);
}
