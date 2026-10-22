// Bước 1.4: lõi ghi dữ liệu dùng chung (D-019, D-016).
// Mọi thao tác ghi: khóa → kiểm tra → ghi → nhật ký AUDIT_LOG. Không xóa cứng.
const STAFF_STATUSES = ['dang_lam', 'da_nghi']; // D-038
const MASKED_FIELDS = ['so_ho_chieu', 'so_zairyu_card', 'khoa_hash']; // không bao giờ chép số giấy tờ sang nhật ký
const HIDDEN = 'Y';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const POSTAL_RE = /^\d{3}-?\d{4}$/;
const PHONE_RE = /^[0-9+\-() ]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lỗi đầu tiên tìm thấy theo thứ tự kiểm tra: [trường, điều kiện sai, mã lỗi, max].
function firstError_(checks) {
  for (let i = 0; i < checks.length; i++) {
    if (checks[i][1]) return checks[i][3] ? { field: checks[i][0], code: checks[i][2], max: checks[i][3] } : { field: checks[i][0], code: checks[i][2] };
  }
  return null;
}
const tooLong_ = (r, f, max) => [f, String(r[f] || '').length > max, 'tooLong', max];
// GĐ 11 (D-080): link Drive / tài liệu — chỉ nhận https:// (không javascript:, không http), tối đa 500 ký tự.
const linkBad_ = (r, f) => [f, !!r[f] && (!/^https:\/\/[^\s<>"']+$/.test(r[f]) || r[f].length > 500), 'link'];
const oneOf_ = (r, f, list) => [f, !!r[f] && list.indexOf(r[f]) < 0, 'invalidChoice'];
const dateBad_ = (r, f) => [f, !!r[f] && !isDate_(r[f]), 'invalidFormat'];
const isDate_ = (v) => DATE_RE.test(v) && !isNaN(new Date(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;

const TABLE_RULES = {
  STAFF: {
    prefix: 'STF',
    editable: ['ho_ten', 'trang_thai', 'vai_tro'],
    defaults: { trang_thai: 'dang_lam', vai_tro: 'nhan_vien' },
    // 1.6b-E: chỉ gửi cột màn hình cần. GĐ 10: không bao giờ gửi khoa_hash.
    listColumns: ['id', 'ma', 'ho_ten', 'trang_thai', 'vai_tro', 'khoa_luc', 'sua_luc', 'da_an'],
    validate: (r) => {
      if (!r.ho_ten) return { field: 'ho_ten', code: 'required' };
      if (r.ho_ten.length > 100) return { field: 'ho_ten', code: 'tooLong', max: 100 };
      if (STAFF_STATUSES.indexOf(r.trang_thai) < 0) return { field: 'trang_thai', code: 'invalidChoice' };
      if (r.vai_tro && ROLES.indexOf(r.vai_tro) < 0) return { field: 'vai_tro', code: 'invalidChoice' };
      return null;
    },
  },
  LOOKUP: {
    prefix: 'DM',
    editable: ['loai', 'ten_vi', 'ten_ja', 'tu_ngay', 'den_ngay'],
    defaults: {},
    listColumns: ['id', 'ma', 'loai', 'ten_vi', 'ten_ja', 'tu_ngay', 'den_ngay', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['loai', LOOKUP_TYPES.indexOf(r.loai) < 0, 'invalidChoice'],
      ['ten_vi', !r.ten_vi, 'required'],
      tooLong_(r, 'ten_vi', 100),
      tooLong_(r, 'ten_ja', 100),
      ['tu_ngay', r.tu_ngay && !isDate_(r.tu_ngay), 'invalidFormat'],
      ['den_ngay', r.den_ngay && !isDate_(r.den_ngay), 'invalidFormat'],
      ['den_ngay', r.tu_ngay && r.den_ngay && r.den_ngay < r.tu_ngay, 'dateOrder'],
    ]),
  },
  COMPANY: {
    prefix: 'CO', // Q4
    editable: ['ten_phap_nhan', 'ten_viet_tat', 'ten_phien_am', 'ma_buu_dien', 'tinh_thanh', 'dia_chi', 'dien_thoai',
      'linh_vuc', 'sales_staff_id', 'support_staff_id', 'trang_thai', 'ghi_chu', 'phap_nhan_so', 'ten_co_so', 'nganh_nghe'],
    multi: ['linh_vuc', 'sales_staff_id', 'support_staff_id'],
    // Chỉ kiểm tra ID mới thêm; ID đã có từ trước được giữ dù người đó đã nghỉ / lĩnh vực hết hiệu lực (Q6).
    refs: { linh_vuc: 'linh_vuc', sales_staff_id: 'staff', support_staff_id: 'staff' },
    defaults: { trang_thai: 'dang_giao_dich' },
    listColumns: ['id', 'ma', 'ten_phap_nhan', 'ten_viet_tat', 'ten_phien_am', 'ma_buu_dien', 'tinh_thanh', 'dia_chi', 'dien_thoai',
      'linh_vuc', 'sales_staff_id', 'support_staff_id', 'trang_thai', 'ghi_chu', 'phap_nhan_so', 'ten_co_so', 'nganh_nghe', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['ten_phap_nhan', !r.ten_phap_nhan, 'required'],
      ['phap_nhan_so', r.phap_nhan_so && !/^\d{13}$/.test(r.phap_nhan_so), 'invalidFormat'], // 法人番号 13 số
      tooLong_(r, 'ten_co_so', 200),
      tooLong_(r, 'nganh_nghe', 200),
      tooLong_(r, 'ten_phap_nhan', 200),
      tooLong_(r, 'ten_viet_tat', 100),
      tooLong_(r, 'ten_phien_am', 200),
      ['ma_buu_dien', r.ma_buu_dien && !POSTAL_RE.test(r.ma_buu_dien), 'invalidFormat'],
      ['tinh_thanh', r.tinh_thanh && PREFECTURES.indexOf(r.tinh_thanh) < 0, 'invalidChoice'],
      tooLong_(r, 'dia_chi', 300),
      ['dien_thoai', r.dien_thoai && !PHONE_RE.test(r.dien_thoai), 'invalidFormat'],
      ['trang_thai', COMPANY_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      tooLong_(r, 'ghi_chu', 2000),
    ]),
  },
  JOB_ORDER: {
    prefix: 'JO', // D-045 Q4
    editable: ['company_id', 'vi_tri', 'so_luong_can', 'phu_trach_staff_id', 'trang_thai_don', 'linh_vuc', 'tinh_thanh_lam_viec',
      'dia_chi_lam_viec', 'dieu_kien', 'yeu_cau', 'ngay_nhan_don', 'ngay_du_kien_vao_lam', 'ghi_chu'],
    createOnly: ['company_id'], // Q5: thuộc đúng 1 công ty
    refs: { company_id: 'company', phu_trach_staff_id: 'staff', linh_vuc: 'company_linh_vuc' },
    defaults: { trang_thai_don: 'dang_mo' },
    listColumns: ['id', 'ma', 'company_id', 'vi_tri', 'so_luong_can', 'phu_trach_staff_id', 'trang_thai_don', 'linh_vuc', 'tinh_thanh_lam_viec',
      'dia_chi_lam_viec', 'dieu_kien', 'yeu_cau', 'ngay_nhan_don', 'ngay_du_kien_vao_lam', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['company_id', !r.company_id, 'required'],
      ['vi_tri', !r.vi_tri, 'required'],
      tooLong_(r, 'vi_tri', 200),
      ['so_luong_can', !r.so_luong_can, 'required'],
      ['so_luong_can', !/^[1-9]\d{0,3}$/.test(r.so_luong_can), 'positiveInt'],
      ['phu_trach_staff_id', String(r.phu_trach_staff_id || '').indexOf(',') >= 0, 'invalidChoice'], // Q3: 1 người
      ['trang_thai_don', JOB_STATUSES.indexOf(r.trang_thai_don) < 0, 'invalidChoice'],
      ['linh_vuc', String(r.linh_vuc || '').indexOf(',') >= 0, 'invalidChoice'],
      ['tinh_thanh_lam_viec', r.tinh_thanh_lam_viec && PREFECTURES.indexOf(r.tinh_thanh_lam_viec) < 0, 'invalidChoice'],
      tooLong_(r, 'dia_chi_lam_viec', 300),
      tooLong_(r, 'dieu_kien', 1000),
      tooLong_(r, 'yeu_cau', 1000),
      ['ngay_nhan_don', r.ngay_nhan_don && !isDate_(r.ngay_nhan_don), 'invalidFormat'],
      ['ngay_du_kien_vao_lam', r.ngay_du_kien_vao_lam && !isDate_(r.ngay_du_kien_vao_lam), 'invalidFormat'],
      ['ngay_du_kien_vao_lam', r.ngay_nhan_don && r.ngay_du_kien_vao_lam && r.ngay_du_kien_vao_lam < r.ngay_nhan_don, 'afterReceive'], // Q7
      tooLong_(r, 'ghi_chu', 2000),
    ]),
  },
  CONTACT: {
    prefix: 'CT', // D-045 Q4
    editable: ['company_id', 'ho_ten', 'ho_ten_phien_am', 'bo_phan', 'chuc_vu', 'so_dien_thoai', 'email', 'lien_he_chinh', 'ghi_chu'],
    createOnly: ['company_id'], // bước 2.2 Q3: thuộc đúng 1 công ty, không chuyển công ty
    refs: { company_id: 'company' },
    defaults: { lien_he_chinh: '' },
    listColumns: ['id', 'ma', 'company_id', 'ho_ten', 'ho_ten_phien_am', 'bo_phan', 'chuc_vu', 'so_dien_thoai', 'email', 'lien_he_chinh', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['company_id', !r.company_id, 'required'],
      ['ho_ten', !r.ho_ten, 'required'],
      tooLong_(r, 'ho_ten', 100),
      tooLong_(r, 'ho_ten_phien_am', 100),
      tooLong_(r, 'bo_phan', 100),
      tooLong_(r, 'chuc_vu', 100),
      ['so_dien_thoai', r.so_dien_thoai && !PHONE_RE.test(r.so_dien_thoai), 'invalidFormat'],
      tooLong_(r, 'email', 254),
      ['email', r.email && !EMAIL_RE.test(r.email), 'invalidFormat'],
      ['lien_he_chinh', ['', 'Y'].indexOf(r.lien_he_chinh) < 0, 'invalidChoice'],
      tooLong_(r, 'ghi_chu', 2000),
    ]),
    // Q2: đánh dấu liên hệ chính mới → bỏ dấu ở người cũ cùng công ty (có ghi nhật ký).
    afterWrite: (t, rec, before, user, now) => {
      if (rec.lien_he_chinh !== 'Y' || (before && before.lien_he_chinh === 'Y')) return;
      readAll_(t).filter((r) => r.company_id === rec.company_id && r.id !== rec.id && r.lien_he_chinh === 'Y').forEach((r) => {
        writeRow_(t, r._row, Object.assign({}, r, { lien_he_chinh: '', sua_luc: now, sua_boi: user }));
        audit_('CONTACT', r.id, 'sua', { lien_he_chinh: 'Y' }, { lien_he_chinh: '' }, user, now);
      });
    },
  },
  PERSON: {
    prefix: 'PER', // 3.1 Q6
    customSave: true,
    editable: ['ho_ten_latin', 'ho_ten_katakana', 'ngay_sinh', 'gioi_tinh', 'quoc_tich', 'so_dien_thoai', 'email', 'dia_chi', 'noi_o',
      'tu_cach_luu_tru', 'han_luu_tru', 'han_ho_chieu', 'tieng_nhat', 'ky_nang', 'trang_thai_sang_loc', 'recruiter_staff_id', 'nguon', 'ghi_chu',
      'nguoi_gioi_thieu', 'cs_staff_id', 'giay_to_staff_id'],
    multi: ['ky_nang', 'cs_staff_id'],
    refs: { quoc_tich: 'quoc_tich', tu_cach_luu_tru: 'tu_cach_luu_tru', tieng_nhat: 'tieng_nhat', nguon: 'nguon', ky_nang: 'linh_vuc', recruiter_staff_id: 'staff',
      cs_staff_id: 'staff', giay_to_staff_id: 'staff' },
    defaults: { trang_thai_sang_loc: 'moi_nhan' },
    listColumns: ['id', 'ma', 'ho_ten_latin', 'ho_ten_katakana', 'ngay_sinh', 'gioi_tinh', 'quoc_tich', 'so_dien_thoai', 'email', 'dia_chi', 'noi_o',
      'tu_cach_luu_tru', 'han_luu_tru', 'han_ho_chieu', 'tieng_nhat', 'ky_nang', 'trang_thai_sang_loc', 'recruiter_staff_id', 'nguon', 'ghi_chu', 'nguoi_gioi_thieu', 'cs_staff_id', 'giay_to_staff_id', 'sua_luc', 'da_an'],
    validate: (r) => {
      const single = (f) => [f, String(r[f] || '').indexOf(',') >= 0, 'invalidChoice'];
      const date = (f) => [f, r[f] && !isDate_(r[f]), 'invalidFormat'];
      return firstError_([
        ['ho_ten_latin', !r.ho_ten_latin, 'required'],
        tooLong_(r, 'ho_ten_latin', 100),
        tooLong_(r, 'ho_ten_katakana', 100),
        // D-079: ngày sinh / quốc tịch bắt buộc khi THÊM MỚI trong app (savePerson); dữ liệu cũ nhập từ file có thể thiếu.
        date('ngay_sinh'),
        ['gioi_tinh', r.gioi_tinh && GENDERS.indexOf(r.gioi_tinh) < 0, 'invalidChoice'],
        single('quoc_tich'),
        ['so_dien_thoai', r.so_dien_thoai && !PHONE_RE.test(r.so_dien_thoai), 'invalidFormat'],
        tooLong_(r, 'email', 254),
        ['email', r.email && !EMAIL_RE.test(r.email), 'invalidFormat'],
        tooLong_(r, 'dia_chi', 300),
        ['noi_o', r.noi_o && RESIDENCES.indexOf(r.noi_o) < 0, 'invalidChoice'],
        single('tu_cach_luu_tru'),
        date('han_luu_tru'),
        date('han_ho_chieu'),
        single('tieng_nhat'),
        ['trang_thai_sang_loc', SCREENING_STATUSES.indexOf(r.trang_thai_sang_loc) < 0, 'invalidChoice'],
        single('recruiter_staff_id'),
        single('nguon'),
        tooLong_(r, 'ghi_chu', 2000),
        tooLong_(r, 'nguoi_gioi_thieu', 100),
        single('giay_to_staff_id'),
      ]);
    },
  },
  // Bảng số giấy tờ: không có listColumns → listRecords từ chối; chỉ đọc qua getPersonDocs.
  PERSON_SENSITIVE: {
    prefix: 'PS',
    customSave: true,
    noHide: true,
    editable: ['person_id', 'so_ho_chieu', 'so_zairyu_card'],
    defaults: {},
    validate: () => null,
  },
  APPLICATION: {
    prefix: 'APL', // 3.2 Q7
    customSave: true, // lưu qua createApplication / addApplicationStatus (Application.gs)
    // Hiện lại 1 lần giới thiệu chưa kết thúc: không được nếu đã có lần khác chưa kết thúc cho cùng người × đơn (D-023).
    beforeShow: (cur) => {
      if (APP_ENDED.indexOf(cur.trang_thai_hien_tai) >= 0) return;
      const open = openSibling_(openTable_('APPLICATION'), cur.person_id, cur.job_id, cur.id);
      if (open) throw vError_('trang_thai', 'stillOpen', { ma: open.ma });
    },
    editable: ['person_id', 'job_id', 'ngay_gui', 'recruiter_staff_id', 'ghi_chu'],
    refs: { recruiter_staff_id: 'staff' },
    defaults: {},
    listColumns: ['id', 'ma', 'person_id', 'job_id', 'ngay_gui', 'trang_thai_hien_tai', 'ngay_trang_thai', 'recruiter_staff_id', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['person_id', !r.person_id, 'required'],
      ['job_id', !r.job_id, 'required'],
      ['ngay_gui', !r.ngay_gui, 'required'],
      ['ngay_gui', r.ngay_gui && !isDate_(r.ngay_gui), 'invalidFormat'],
      ['recruiter_staff_id', String(r.recruiter_staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      tooLong_(r, 'ghi_chu', 2000),
    ]),
  },
  APPLICATION_STATUS_LOG: {
    prefix: 'ST',
    customSave: true,
    noHide: true,
    editable: ['application_id', 'trang_thai', 'ngay_hieu_luc', 'ly_do'],
    defaults: {},
    listColumns: ['id', 'ma', 'application_id', 'trang_thai', 'ngay_hieu_luc', 'ly_do', 'tao_luc', 'tao_boi', 'da_an', 'sua_luc'],
    validate: (r) => firstError_([
      ['trang_thai', APP_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      ['ngay_hieu_luc', !r.ngay_hieu_luc, 'required'],
      ['ngay_hieu_luc', r.ngay_hieu_luc && !isDate_(r.ngay_hieu_luc), 'invalidFormat'],
      ['ly_do', APP_REASON_REQUIRED.indexOf(r.trang_thai) >= 0 && !r.ly_do, 'required'],
      tooLong_(r, 'ly_do', 500),
    ]),
  },
  INTERVIEW: {
    prefix: 'PV',
    customSave: true, // lưu qua saveInterview (Application.gs)
    editable: ['application_id', 'vong', 'thoi_gian', 'gio_ket_thuc', 'hinh_thuc', 'dia_diem', 'nguoi_pv_contact_id', 'ket_qua', 'ly_do', 'ghi_chu'],
    createOnly: ['application_id'],
    refs: { nguoi_pv_contact_id: 'interview_contact' },
    defaults: { ket_qua: 'cho' },
    listColumns: ['id', 'ma', 'application_id', 'vong', 'thoi_gian', 'gio_ket_thuc', 'hinh_thuc', 'dia_diem', 'nguoi_pv_contact_id', 'ket_qua', 'ly_do', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => {
      const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/.exec(r.thoi_gian || '');
      const time = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
      return firstError_([
        ['application_id', !r.application_id, 'required'],
        ['vong', IV_ROUNDS.indexOf(r.vong) < 0, r.vong ? 'invalidChoice' : 'required'],
        ['thoi_gian', !r.thoi_gian, 'required'],
        ['thoi_gian', r.thoi_gian && !(m && isDate_(m[1]) && time(m[2])), 'invalidFormat'],
        ['gio_ket_thuc', r.gio_ket_thuc && !time(r.gio_ket_thuc), 'invalidFormat'],
        ['gio_ket_thuc', m && r.gio_ket_thuc && r.gio_ket_thuc <= m[2], 'endAfterStart'],
        ['hinh_thuc', r.hinh_thuc && IV_FORMS.indexOf(r.hinh_thuc) < 0, 'invalidChoice'],
        tooLong_(r, 'dia_diem', 300),
        ['nguoi_pv_contact_id', String(r.nguoi_pv_contact_id || '').indexOf(',') >= 0, 'invalidChoice'],
        ['ket_qua', IV_RESULTS.indexOf(r.ket_qua) < 0, 'invalidChoice'],
        ['ly_do', r.ket_qua === 'truot' && !r.ly_do, 'required'], // 3.3 Q4: thống nhất với lần giới thiệu
        tooLong_(r, 'ly_do', 500),
        tooLong_(r, 'ghi_chu', 2000),
      ]);
    },
  },
  EMPLOYMENT: {
    prefix: 'EMP', // 3.4 Q6
    customSave: true, // tạo qua startEmployment, ghi nghỉ qua endEmployment (Application.gs)
    noHide: true, // chỉ ẩn khi hủy dòng "Đã vào làm" nhập nhầm (3.4 Q5)
    editable: ['person_id', 'company_id', 'job_id', 'application_id', 'ngay_vao_lam', 'ngay_nghi', 'ly_do_nghi', 'ghi_chu', 'tinh_trang', 'ho_tro'],
    refs: { ly_do_nghi: 'ly_do_nghi' },
    defaults: {},
    listColumns: ['id', 'ma', 'person_id', 'company_id', 'job_id', 'application_id', 'ngay_vao_lam', 'ngay_nghi', 'ly_do_nghi', 'ghi_chu', 'tinh_trang', 'ho_tro', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['tinh_trang', EMP_IMPORT_STATES.indexOf(r.tinh_trang || '') < 0, 'invalidChoice'],
      ['ho_tro', ['', 'N'].indexOf(r.ho_tro || '') < 0, 'invalidChoice'],
      ['ngay_vao_lam', !r.ngay_vao_lam && !r.tinh_trang, 'required'], // D-079: dữ liệu cũ có thể thiếu ngày vào làm
      ['ngay_vao_lam', r.ngay_vao_lam && !isDate_(r.ngay_vao_lam), 'invalidFormat'],
      ['ngay_nghi', r.ngay_nghi && !isDate_(r.ngay_nghi), 'invalidFormat'],
      ['ngay_nghi', r.ngay_nghi && r.ngay_nghi < r.ngay_vao_lam, 'notBeforeStart'],
      ['ly_do_nghi', r.ngay_nghi && !r.ly_do_nghi, 'required'],
      ['ly_do_nghi', String(r.ly_do_nghi || '').indexOf(',') >= 0, 'invalidChoice'],
      tooLong_(r, 'ghi_chu', 2000),
    ]),
  },
  // Bước 6.2 (D-064): hồ sơ visa. Được cấp 変更/更新 kèm hạn mới → tự cập nhật hạn lưu trú (và tư cách) của người.
  IMMIGRATION_CASE: {
    prefix: 'VS',
    editable: ['person_id', 'loai_thu_tuc', 'tu_cach_luu_tru', 'company_id', 'trang_thai', 'ngay_nop', 'noi_nop',
      'ngay_ket_qua', 'han_moi', 'phu_trach_staff_id', 'ghi_chu'],
    createOnly: ['person_id'],
    refs: { person_id: 'person', tu_cach_luu_tru: 'tu_cach_luu_tru', company_id: 'company', phu_trach_staff_id: 'staff' },
    defaults: { trang_thai: 'chuan_bi' },
    listColumns: ['id', 'ma', 'person_id', 'loai_thu_tuc', 'tu_cach_luu_tru', 'company_id', 'trang_thai', 'ngay_nop', 'noi_nop',
      'ngay_ket_qua', 'han_moi', 'phu_trach_staff_id', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['person_id', !r.person_id, 'required'],
      ['loai_thu_tuc', !r.loai_thu_tuc, 'required'],
      ['loai_thu_tuc', VISA_TYPES.indexOf(r.loai_thu_tuc) < 0, 'invalidChoice'],
      ['trang_thai', VISA_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      ['tu_cach_luu_tru', String(r.tu_cach_luu_tru || '').indexOf(',') >= 0, 'invalidChoice'],
      ['company_id', String(r.company_id || '').indexOf(',') >= 0, 'invalidChoice'],
      ['phu_trach_staff_id', String(r.phu_trach_staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      ['ngay_nop', !r.ngay_nop && ['da_nop', 'bo_sung', 'duoc_cap', 'tu_choi'].indexOf(r.trang_thai) >= 0, 'required'],
      ['ngay_nop', r.ngay_nop && !isDate_(r.ngay_nop), 'invalidFormat'],
      ['ngay_ket_qua', !r.ngay_ket_qua && ['duoc_cap', 'tu_choi'].indexOf(r.trang_thai) >= 0, 'required'],
      ['ngay_ket_qua', r.ngay_ket_qua && !isDate_(r.ngay_ket_qua), 'invalidFormat'],
      ['ngay_ket_qua', r.ngay_ket_qua && r.ngay_nop && r.ngay_ket_qua < r.ngay_nop, 'afterSubmit'],
      ['han_moi', r.han_moi && !isDate_(r.han_moi), 'invalidFormat'],
      ['han_moi', r.han_moi && r.trang_thai !== 'duoc_cap', 'onlyGranted'],
      ['han_moi', r.han_moi && r.ngay_ket_qua && r.han_moi <= r.ngay_ket_qua, 'afterResult'],
      tooLong_(r, 'noi_nop', 100),
      tooLong_(r, 'ghi_chu', 2000),
    ]),
    afterWrite: (t, rec, before, user, now) => {
      // Bước 6.3: hồ sơ mới → tạo sẵn checklist giấy tờ theo mẫu của thủ tục (Cài đặt → Mẫu checklist).
      if (!before) {
        const ids = checklistTemplate_(rec.loai_thu_tuc);
        if (ids.length) insertMany_('CASE_DOCUMENT', openTable_('CASE_DOCUMENT'), ids.map((id) => ({ case_id: rec.id, giay_to: id, trang_thai: 'chua_co', ngay_nhan: '', ghi_chu: '' })));
      }
      if (rec.trang_thai !== 'duoc_cap' || !rec.han_moi || ['henko', 'koshin'].indexOf(rec.loai_thu_tuc) < 0) return;
      if (before && before.trang_thai === 'duoc_cap' && before.han_moi === rec.han_moi && before.tu_cach_luu_tru === rec.tu_cach_luu_tru) return;
      const pt = openTable_('PERSON');
      const p = readAll_(pt).find((r) => r.id === rec.person_id);
      if (!p || (p.han_luu_tru && p.han_luu_tru > rec.han_moi)) return; // không ghi đè hạn mới hơn (hồ sơ cũ sửa lại)
      const patch = { han_luu_tru: rec.han_moi };
      if (rec.tu_cach_luu_tru) patch.tu_cach_luu_tru = rec.tu_cach_luu_tru;
      const old = {};
      Object.keys(patch).forEach((k) => { if (p[k] === patch[k]) delete patch[k]; else old[k] = p[k]; });
      if (!Object.keys(patch).length) return;
      writeRow_(pt, p._row, Object.assign({}, p, patch, { sua_luc: now, sua_boi: user }));
      audit_('PERSON', p.id, 'sua', old, patch, user, now);
    },
  },
  // Bước 6.3 (D-065): mỗi dòng = 1 giấy tờ trong checklist của 1 hồ sơ visa. Ẩn = bỏ khỏi checklist.
  // shortcut: không chặn trùng giấy tờ trong cùng hồ sơ ở máy chủ (giao diện chỉ cho chọn giấy tờ chưa có); trùng thì ẩn bớt.
  CASE_DOCUMENT: {
    prefix: 'CD',
    editable: ['case_id', 'giay_to', 'trang_thai', 'ngay_nhan', 'ghi_chu', 'ben_cung_cap', 'ngay_yeu_cau', 'han_nhan', 'nguoi_kiem_tra',
      'noi_dung_sua', 'link', 'person_doc_id', 'pre_entry_id'],
    createOnly: ['case_id', 'giay_to', 'pre_entry_id'],
    refs: { case_id: 'visa_case', giay_to: 'giay_to', nguoi_kiem_tra: 'staff', person_doc_id: 'person_doc', pre_entry_id: 'pre_entry' },
    defaults: { trang_thai: 'chua_co' },
    listColumns: ['id', 'ma', 'case_id', 'giay_to', 'trang_thai', 'ngay_nhan', 'ghi_chu', 'ben_cung_cap', 'ngay_yeu_cau', 'han_nhan', 'nguoi_kiem_tra',
      'noi_dung_sua', 'link', 'person_doc_id', 'pre_entry_id', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['case_id', !r.case_id && !r.pre_entry_id, 'required'],
      ['pre_entry_id', !!r.case_id && !!r.pre_entry_id, 'invalidChoice'], // thuộc đúng 1: hồ sơ visa HOẶC 受入れ前
      ['giay_to', !r.giay_to, 'required'],
      ['giay_to', String(r.giay_to).indexOf(',') >= 0, 'invalidChoice'],
      ['trang_thai', DOC_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      oneOf_(r, 'ben_cung_cap', DOC_PROVIDERS),
      dateBad_(r, 'ngay_nhan'), dateBad_(r, 'ngay_yeu_cau'), dateBad_(r, 'han_nhan'),
      ['nguoi_kiem_tra', String(r.nguoi_kiem_tra || '').indexOf(',') >= 0, 'invalidChoice'],
      tooLong_(r, 'noi_dung_sua', 500),
      linkBad_(r, 'link'),
      tooLong_(r, 'ghi_chu', 500),
    ]),
  },
  // GĐ 11.1: kho giấy tờ của người (link Drive + hiệu lực); dòng checklist dùng lại qua person_doc_id.
  PERSON_DOC: {
    prefix: 'GT',
    editable: ['person_id', 'giay_to', 'link', 'han_hieu_luc', 'ngay_kiem_tra', 'nguoi_kiem_tra', 'ghi_chu'],
    createOnly: ['person_id'],
    refs: { person_id: 'person', giay_to: 'giay_to', nguoi_kiem_tra: 'staff' },
    defaults: {},
    listColumns: ['id', 'ma', 'person_id', 'giay_to', 'link', 'han_hieu_luc', 'ngay_kiem_tra', 'nguoi_kiem_tra', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['person_id', !r.person_id, 'required'],
      ['giay_to', !r.giay_to, 'required'],
      ['giay_to', String(r.giay_to).indexOf(',') >= 0, 'invalidChoice'],
      linkBad_(r, 'link'),
      dateBad_(r, 'han_hieu_luc'), dateBad_(r, 'ngay_kiem_tra'),
      ['nguoi_kiem_tra', String(r.nguoi_kiem_tra || '').indexOf(',') >= 0, 'invalidChoice'],
      tooLong_(r, 'ghi_chu', 500),
    ]),
  },
  // GĐ 11.2 (D-080): 受入れ前. Tạo mới → tự thêm công việc + giấy tờ theo mẫu của loại (Cài đặt). "Đã vào làm" chỉ đặt qua startFromPreEntry.
  PRE_ENTRY: {
    prefix: 'TN',
    editable: ['person_id', 'company_id', 'application_id', 'loai', 'ngay_nhap_canh', 'ngay_vao_lam', 'cs_staff_id', 'giay_to_staff_id',
      'trang_thai', 'cho_ben', 'link', 'ghi_chu'],
    createOnly: ['person_id', 'application_id'],
    multi: ['cs_staff_id'],
    refs: { person_id: 'person', company_id: 'company', cs_staff_id: 'staff', giay_to_staff_id: 'staff' },
    defaults: { trang_thai: 'dang_chuan_bi', loai: 'nuoc_ngoai', employment_id: '' },
    listColumns: ['id', 'ma', 'person_id', 'company_id', 'application_id', 'loai', 'ngay_nhap_canh', 'ngay_vao_lam', 'cs_staff_id', 'giay_to_staff_id',
      'trang_thai', 'cho_ben', 'employment_id', 'link', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['person_id', !r.person_id, 'required'],
      ['company_id', !r.company_id, 'required'],
      ['loai', PRE_TYPES.indexOf(r.loai) < 0, 'invalidChoice'],
      ['trang_thai', PRE_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      ['trang_thai', r.trang_thai === 'da_vao_lam' && !r.employment_id, 'useEmployment'],
      dateBad_(r, 'ngay_nhap_canh'), dateBad_(r, 'ngay_vao_lam'),
      oneOf_(r, 'cho_ben', WAIT_PARTIES),
      ['giay_to_staff_id', String(r.giay_to_staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      linkBad_(r, 'link'),
      tooLong_(r, 'ghi_chu', 2000),
    ]),
    afterWrite: (t, rec, before) => { if (!before) preEntryCreated_(rec); },
  },
  PRE_TASK: {
    prefix: 'CV',
    editable: ['pre_entry_id', 'ten', 'nhom', 'phu_trach_staff_id', 'han', 'trang_thai', 'cho_ben', 'link', 'ghi_chu'],
    createOnly: ['pre_entry_id'],
    refs: { pre_entry_id: 'pre_entry', phu_trach_staff_id: 'staff' },
    defaults: { trang_thai: 'chua_lam', nhom: 'khac' },
    listColumns: ['id', 'ma', 'pre_entry_id', 'ten', 'nhom', 'phu_trach_staff_id', 'han', 'trang_thai', 'cho_ben', 'link', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['pre_entry_id', !r.pre_entry_id, 'required'],
      ['ten', !r.ten, 'required'],
      tooLong_(r, 'ten', 200),
      ['nhom', PRE_GROUPS.indexOf(r.nhom) < 0, 'invalidChoice'],
      ['trang_thai', PRE_TASK_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      ['phu_trach_staff_id', String(r.phu_trach_staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      dateBad_(r, 'han'),
      oneOf_(r, 'cho_ben', WAIT_PARTIES),
      linkBad_(r, 'link'),
      tooLong_(r, 'ghi_chu', 1000),
    ]),
  },
  // GĐ 11.3 (D-080): 定期面談 theo quý cố định — mỗi người 1 dòng / quý (chặn trùng); lịch sử từng quý giữ riêng.
  MENDAN: {
    prefix: 'MD',
    editable: ['person_id', 'employment_id', 'ky', 'ngay_du_kien', 'ngay_thuc_hien', 'staff_id', 'hinh_thuc', 'trang_thai', 'noi_dung', 'bien_ban', 'ghi_chu'],
    createOnly: ['person_id', 'ky'],
    refs: { person_id: 'person', employment_id: 'person_employment', staff_id: 'staff' },
    defaults: { trang_thai: 'chua_dat_lich' },
    listColumns: ['id', 'ma', 'person_id', 'employment_id', 'ky', 'ngay_du_kien', 'ngay_thuc_hien', 'staff_id', 'hinh_thuc', 'trang_thai', 'noi_dung', 'bien_ban', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['person_id', !r.person_id, 'required'],
      ['ky', !/^\d{4}-(01|04|07|10)$/.test(r.ky || ''), 'invalidFormat'],
      ['trang_thai', MENDAN_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      dateBad_(r, 'ngay_du_kien'), dateBad_(r, 'ngay_thuc_hien'),
      ['ngay_thuc_hien', r.trang_thai === 'hoan_thanh' && !r.ngay_thuc_hien, 'required'],
      ['ngay_du_kien', r.trang_thai === 'da_dat_lich' && !r.ngay_du_kien, 'required'],
      oneOf_(r, 'hinh_thuc', IV_FORMS),
      ['staff_id', String(r.staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      tooLong_(r, 'noi_dung', 2000),
      linkBad_(r, 'bien_ban'),
      tooLong_(r, 'ghi_chu', 1000),
    ]),
    beforeCreate: (rec, t) => {
      const dup = readAll_(t).find((r) => !r.da_an && r.person_id === rec.person_id && r.ky === rec.ky);
      if (dup) throw vError_('ky', 'mendanExists', { ma: dup.ma });
    },
    beforeShow: (cur) => {
      const dup = readAll_(openTable_('MENDAN')).find((r) => !r.da_an && r.id !== cur.id && r.person_id === cur.person_id && r.ky === cur.ky);
      if (dup) throw vError_('ky', 'mendanExists', { ma: dup.ma });
    },
  },
  // GĐ 11.4: vấn đề phát sinh. Ít nhất 1 người hoặc 1 công ty.
  INCIDENT: {
    prefix: 'VD',
    editable: ['person_ids', 'company_id', 'ngay_tiep_nhan', 'loai', 'tieu_de', 'noi_dung', 'uu_tien', 'phu_trach_staff_id', 'phoi_hop_staff_id',
      'han_xu_ly', 'trang_thai', 'ngay_lien_he_lai', 'ket_qua', 'mendan_id', 'link', 'ghi_chu'],
    multi: ['person_ids', 'phoi_hop_staff_id'],
    refs: { person_ids: 'person', company_id: 'company', phu_trach_staff_id: 'staff', phoi_hop_staff_id: 'staff', mendan_id: 'mendan' },
    defaults: { trang_thai: 'moi', uu_tien: 'trung_binh', loai: 'khac' },
    listColumns: ['id', 'ma', 'person_ids', 'company_id', 'ngay_tiep_nhan', 'loai', 'tieu_de', 'noi_dung', 'uu_tien', 'phu_trach_staff_id', 'phoi_hop_staff_id',
      'han_xu_ly', 'trang_thai', 'ngay_lien_he_lai', 'ket_qua', 'mendan_id', 'link', 'ghi_chu', 'tao_luc', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['person_ids', !r.person_ids && !r.company_id, 'required'],
      ['ngay_tiep_nhan', !r.ngay_tiep_nhan, 'required'],
      dateBad_(r, 'ngay_tiep_nhan'), dateBad_(r, 'han_xu_ly'), dateBad_(r, 'ngay_lien_he_lai'),
      ['loai', INCIDENT_TYPES.indexOf(r.loai) < 0, 'invalidChoice'],
      ['tieu_de', !r.tieu_de, 'required'],
      tooLong_(r, 'tieu_de', 200),
      tooLong_(r, 'noi_dung', 2000),
      ['uu_tien', INCIDENT_PRIORITIES.indexOf(r.uu_tien) < 0, 'invalidChoice'],
      ['trang_thai', INCIDENT_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      ['phu_trach_staff_id', String(r.phu_trach_staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      ['company_id', String(r.company_id || '').indexOf(',') >= 0, 'invalidChoice'],
      tooLong_(r, 'ket_qua', 2000),
      linkBad_(r, 'link'),
      tooLong_(r, 'ghi_chu', 1000),
    ]),
  },
  // Lịch sử xử lý: chỉ thêm (ẩn được nếu ghi nhầm), không sửa nội dung cũ.
  INCIDENT_LOG: {
    prefix: 'XL',
    editable: ['incident_id', 'ngay', 'staff_id', 'noi_dung', 'link'],
    createOnly: ['incident_id', 'ngay', 'staff_id', 'noi_dung', 'link'],
    refs: { incident_id: 'incident', staff_id: 'staff' },
    defaults: {},
    listColumns: ['id', 'ma', 'incident_id', 'ngay', 'staff_id', 'noi_dung', 'link', 'tao_boi', 'tao_luc', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['incident_id', !r.incident_id, 'required'],
      ['ngay', !r.ngay, 'required'], dateBad_(r, 'ngay'),
      ['noi_dung', !r.noi_dung, 'required'], tooLong_(r, 'noi_dung', 2000),
      ['staff_id', String(r.staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      linkBad_(r, 'link'),
    ]),
  },
  // Bước 7.2 (D-068): nhật ký hỗ trợ. Không đổi người; lần vào làm phải của chính người đó.
  SUPPORT_LOG: {
    prefix: 'HT',
    editable: ['person_id', 'employment_id', 'loai_ho_tro', 'ngay', 'hinh_thuc', 'staff_id', 'noi_dung', 'ghi_chu'],
    createOnly: ['person_id'],
    refs: { person_id: 'person', employment_id: 'person_employment', staff_id: 'staff' },
    defaults: {},
    listColumns: ['id', 'ma', 'person_id', 'employment_id', 'loai_ho_tro', 'ngay', 'hinh_thuc', 'staff_id', 'noi_dung', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['person_id', !r.person_id, 'required'],
      ['loai_ho_tro', SUPPORT_TYPES.indexOf(r.loai_ho_tro) < 0, r.loai_ho_tro ? 'invalidChoice' : 'required'],
      ['ngay', !r.ngay, 'required'],
      ['ngay', r.ngay && !isDate_(r.ngay), 'invalidFormat'],
      ['hinh_thuc', r.hinh_thuc && IV_FORMS.indexOf(r.hinh_thuc) < 0, 'invalidChoice'],
      ['employment_id', String(r.employment_id || '').indexOf(',') >= 0, 'invalidChoice'],
      ['staff_id', String(r.staff_id || '').indexOf(',') >= 0, 'invalidChoice'],
      ['noi_dung', !r.noi_dung, 'required'],
      tooLong_(r, 'noi_dung', 2000),
      tooLong_(r, 'ghi_chu', 1000),
    ]),
  },
  // GĐ 5 (D-069): hợp đồng phí của công ty. Nhiều bản theo thời gian; dùng bản có hiệu lực ở ngày phát sinh (tu_ngay muộn nhất).
  CONTRACT: {
    prefix: 'HD',
    editable: ['company_id', 'tu_ngay', 'den_ngay', 'phi_gioi_thieu', 'chia_coc', 'phi_ho_tro', 'bac_hoan', 'ghi_chu'],
    createOnly: ['company_id'],
    refs: { company_id: 'company' },
    defaults: { phi_ho_tro: '0', chia_coc: '' },
    listColumns: ['id', 'ma', 'company_id', 'tu_ngay', 'den_ngay', 'phi_gioi_thieu', 'chia_coc', 'phi_ho_tro', 'bac_hoan', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['company_id', !r.company_id, 'required'],
      ['tu_ngay', !r.tu_ngay, 'required'],
      ['tu_ngay', r.tu_ngay && !isDate_(r.tu_ngay), 'invalidFormat'],
      ['den_ngay', r.den_ngay && !isDate_(r.den_ngay), 'invalidFormat'],
      ['den_ngay', r.den_ngay && r.den_ngay < r.tu_ngay, 'afterStart'],
      ['phi_gioi_thieu', !/^\d{1,9}$/.test(r.phi_gioi_thieu || ''), r.phi_gioi_thieu ? 'yen' : 'required'],
      ['phi_ho_tro', !/^\d{1,9}$/.test(r.phi_ho_tro || ''), 'yen'],
      ['chia_coc', ['', 'Y'].indexOf(r.chia_coc || '') < 0, 'invalidChoice'],
      ['bac_hoan', !parseTiers_(r.bac_hoan), 'refundTiers'],
      tooLong_(r, 'ghi_chu', 1000),
    ]),
  },
  // Chỉ ghi qua Finance.gs (saveRevenue / gợi ý / hóa đơn): khoản đã vào hóa đơn thì không sửa / ẩn.
  REVENUE: {
    prefix: 'DS',
    customSave: true,
    noHide: true,
    editable: ['loai', 'company_id', 'person_id', 'application_id', 'employment_id', 'thang', 'ngay', 'so_tien', 'chia', 'bo_qua', 'ghi_chu'],
    defaults: { bo_qua: '', invoice_id: '' },
    listColumns: ['id', 'ma', 'loai', 'company_id', 'person_id', 'application_id', 'employment_id', 'thang', 'ngay', 'so_tien', 'chia', 'invoice_id', 'bo_qua', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['loai', REVENUE_TYPES.indexOf(r.loai) < 0, r.loai ? 'invalidChoice' : 'required'],
      ['company_id', !r.company_id, 'required'],
      ['ngay', !r.ngay, 'required'],
      ['ngay', r.ngay && !isDate_(r.ngay), 'invalidFormat'],
      ['thang', r.thang && !/^\d{4}-(0[1-9]|1[0-2])$/.test(r.thang), 'invalidFormat'],
      ['thang', r.loai === 'ho_tro' && !r.thang, 'required'],
      ['so_tien', !/^-?\d{1,9}$/.test(r.so_tien || ''), r.so_tien ? 'yen' : 'required'],
      ['so_tien', r.loai === 'hoan' && Number(r.so_tien) > 0, 'refundNegative'],
      ['so_tien', r.loai !== 'hoan' && r.loai !== 'khac' && Number(r.so_tien) < 0, 'yen'],
      ['chia', !parseSplit_(r.chia), 'split'],
      ['bo_qua', ['', 'Y'].indexOf(r.bo_qua || '') < 0, 'invalidChoice'],
      tooLong_(r, 'ghi_chu', 1000),
    ]),
  },
  TARGET: {
    prefix: 'MT',
    customSave: true, // chỉ ghi qua saveTarget
    noHide: true,
    editable: ['staff_id', 'thang', 'so_tien'],
    defaults: {},
    listColumns: ['id', 'ma', 'staff_id', 'thang', 'so_tien', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['thang', !/^\d{4}-(0[1-9]|1[0-2])$/.test(r.thang || ''), 'invalidFormat'],
      ['so_tien', !/^\d{1,10}$/.test(r.so_tien || ''), 'yen'],
    ]),
  },
  // GĐ 8 (D-069): hóa đơn — chỉ ghi qua Finance.gs (tạo nháp / phát hành / hủy). Không xóa; hủy giữ lại số.
  INVOICE: {
    prefix: 'INV',
    customSave: true,
    noHide: true,
    editable: ['company_id', 'ngay_lap', 'han_tt', 'trang_thai', 'tien_chua_thue', 'thue_suat', 'tien_thue', 'tong', 'ghi_chu'],
    defaults: { trang_thai: 'nhap' },
    listColumns: ['id', 'ma', 'company_id', 'ngay_lap', 'han_tt', 'trang_thai', 'tien_chua_thue', 'thue_suat', 'tien_thue', 'tong', 'ghi_chu', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['company_id', !r.company_id, 'required'],
      ['ngay_lap', !isDate_(r.ngay_lap || ''), r.ngay_lap ? 'invalidFormat' : 'required'],
      ['han_tt', !isDate_(r.han_tt || ''), r.han_tt ? 'invalidFormat' : 'required'],
      ['han_tt', r.han_tt < r.ngay_lap, 'afterIssue'],
      ['trang_thai', INVOICE_STATUSES.indexOf(r.trang_thai) < 0, 'invalidChoice'],
      tooLong_(r, 'ghi_chu', 1000),
    ]),
  },
  // 入金: chỉ cho hóa đơn đã phát hành (kiểm ở refs 'issued_invoice').
  PAYMENT: {
    prefix: 'NT',
    editable: ['invoice_id', 'ngay', 'so_tien', 'ghi_chu'],
    createOnly: ['invoice_id'],
    refs: { invoice_id: 'issued_invoice' },
    defaults: {},
    listColumns: ['id', 'ma', 'invoice_id', 'ngay', 'so_tien', 'ghi_chu', 'sua_luc', 'da_an'],
    beforeShow: (cur) => { if (!readAll_(openTable_('INVOICE')).some((r) => r.id === cur.invoice_id && r.trang_thai === 'da_phat_hanh')) throw vError_('invoice_id', 'invalidChoice'); },
    validate: (r) => firstError_([
      ['invoice_id', !r.invoice_id, 'required'],
      ['ngay', !isDate_(r.ngay || ''), r.ngay ? 'invalidFormat' : 'required'],
      ['so_tien', !/^-?\d{1,10}$/.test(r.so_tien || '') || Number(r.so_tien) === 0, r.so_tien ? 'yen' : 'required'],
      tooLong_(r, 'ghi_chu', 500),
    ]),
  },
  REFERRER_PAYOUT: {
    prefix: 'TGT',
    editable: ['person_id', 'employment_id', 'nguoi_nhan', 'so_tien', 'ngay_tra', 'ghi_chu'],
    createOnly: ['person_id', 'employment_id'],
    refs: { person_id: 'person', employment_id: 'person_employment' },
    defaults: {},
    listColumns: ['id', 'ma', 'person_id', 'employment_id', 'nguoi_nhan', 'so_tien', 'ngay_tra', 'ghi_chu', 'sua_luc', 'da_an'],
    // 1 khoản / lần vào làm (chặn bấm 2 lần / 2 tab).
    beforeCreate: (rec, t) => { if (rec.employment_id && readAll_(t).some((r) => !r.da_an && r.employment_id === rec.employment_id)) throw vError_('employment_id', 'payoutExists'); },
    beforeShow: (cur) => { if (cur.employment_id && readAll_(openTable_('REFERRER_PAYOUT')).some((r) => !r.da_an && r.id !== cur.id && r.employment_id === cur.employment_id)) throw vError_('employment_id', 'payoutExists'); },
    validate: (r) => firstError_([
      ['person_id', !r.person_id, 'required'],
      ['nguoi_nhan', !r.nguoi_nhan, 'required'],
      tooLong_(r, 'nguoi_nhan', 100),
      ['so_tien', !/^\d{1,9}$/.test(r.so_tien || ''), r.so_tien ? 'yen' : 'required'],
      ['ngay_tra', r.ngay_tra && !isDate_(r.ngay_tra), 'invalidFormat'],
      tooLong_(r, 'ghi_chu', 500),
    ]),
  },
  // Bước 6.4 (D-067): chỉ tạo qua uploadCaseFile (Visa.gs); ẩn = bỏ khỏi app, tệp trong Drive vẫn giữ (không xóa cứng).
  // Không gửi drive_file_id về trình duyệt; mở tệp qua getFileLink (có nhật ký).
  FILE: {
    prefix: 'FL',
    customSave: true,
    editable: ['loai_doi_tuong', 'doi_tuong_id', 'drive_file_id', 'loai_giay_to', 'ten_file', 'mime', 'kich_thuoc'],
    defaults: {},
    listColumns: ['id', 'ma', 'loai_doi_tuong', 'doi_tuong_id', 'loai_giay_to', 'ten_file', 'mime', 'kich_thuoc', 'tao_luc', 'sua_luc', 'da_an'],
    validate: (r) => firstError_([
      ['ten_file', !r.ten_file, 'required'],
      ['drive_file_id', !r.drive_file_id, 'required'],
    ]),
  },
  SETTING: {
    prefix: 'CFG',
    customSave: true, // chỉ ghi qua saveTaskSetting (Dashboard.gs)
    noHide: true,
    editable: ['khoa', 'gia_tri'],
    defaults: {},
    validate: (r) => firstError_([
      ['khoa', !r.khoa, 'required'],
      tooLong_(r, 'gia_tri', 2000),
    ]),
  },
};

const splitIds_ = (v) => String(v || '').split(',').map((x) => x.trim()).filter((x) => x);

// Danh sách được phép chọn MỚI: nhân viên đang làm, chưa ẩn; lĩnh vực chưa ẩn, đang hiệu lực hôm nay (JST).
// rec: bản ghi đang lưu (cần cho loại phụ thuộc bản ghi, vd. lĩnh vực của chính công ty của đơn).
function allowedRefs_(kind, rec) {
  if (kind !== 'company_linh_vuc' && kind !== 'interview_contact' && kind !== 'person_employment' && kind !== 'issued_invoice') {
    if (!refCache_[kind]) refCache_[kind] = allowedRefsNow_(kind);
    return refCache_[kind];
  }
  return allowedRefsNow_(kind, rec);
}

function allowedRefsNow_(kind, rec) {
  if (kind === 'issued_invoice') return readAll_(openTable_('INVOICE')).filter((r) => r.trang_thai === 'da_phat_hanh').map((r) => r.id);
  if (kind === 'person_employment') return readAll_(openTable_('EMPLOYMENT')).filter((e) => e.person_id === rec.person_id && !e.da_an).map((e) => e.id);
  if (kind === 'interview_contact') return interviewContacts_(rec.application_id).filter((c) => !c.da_an).map((c) => c.id);
  if (kind === 'company_linh_vuc') {
    const co = readAll_(openTable_('COMPANY')).find((r) => r.id === rec.company_id);
    const own = splitIds_(co && co.linh_vuc);
    return allowedRefs_('linh_vuc').filter((id) => own.indexOf(id) >= 0);
  }
  if (kind === 'company') return readColumn_(openTable_('COMPANY'), 'id');
  if (kind === 'visa_case') return readAll_(openTable_('IMMIGRATION_CASE')).filter((r) => !r.da_an).map((r) => r.id);
  if (kind === 'person_doc') return readAll_(openTable_('PERSON_DOC')).filter((r) => !r.da_an).map((r) => r.id);
  if (kind === 'pre_entry') return readAll_(openTable_('PRE_ENTRY')).filter((r) => !r.da_an).map((r) => r.id);
  if (kind === 'mendan') return readAll_(openTable_('MENDAN')).filter((r) => !r.da_an).map((r) => r.id);
  if (kind === 'incident') return readAll_(openTable_('INCIDENT')).filter((r) => !r.da_an).map((r) => r.id);
  if (kind === 'person') return readAll_(openTable_('PERSON')).filter((r) => !r.da_an).map((r) => r.id);
  if (kind === 'staff') return readAll_(openTable_('STAFF')).filter((r) => r.trang_thai === 'dang_lam' && !r.da_an).map((r) => r.id);
  const today = nowJst_().slice(0, 10);
  return readAll_(openTable_('LOOKUP'))
    .filter((r) => r.loai === kind && !r.da_an && (!r.tu_ngay || r.tu_ngay <= today) && (!r.den_ngay || today <= r.den_ngay))
    .map((r) => r.id);
}

function checkRefs_(rules, rec, current) {
  Object.keys(rules.refs || {}).forEach((field) => {
    const before = splitIds_(current && current[field]);
    const added = splitIds_(rec[field]).filter((id) => before.indexOf(id) < 0);
    if (!added.length) return;
    const allowed = allowedRefs_(rules.refs[field], rec);
    if (added.some((id) => allowed.indexOf(id) < 0)) throw new Error('VALIDATION|' + JSON.stringify({ field: field, code: 'invalidChoice' }));
  });
}

function nowJst_() { return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'); }

function currentUser_() {
  if (ACTOR_) return ACTOR_.ma + ' ' + ACTOR_.ho_ten + ' (liên kết)'; // GĐ 10: nhật ký ghi đúng nhân viên
  return callerEmail_() || Session.getEffectiveUser().getEmail();
}

function rulesOf_(table) {
  const rules = TABLE_RULES[table];
  if (!rules) throw new Error('UNKNOWN_TABLE|' + table);
  return rules;
}

// Chỉ bước đo tốc độ (Perf.gs) đổi biến này, trong đúng một lần chạy, rồi trả lại 'DATA'.
let dataFileKey_ = 'DATA';
// 1.6b-A: trong MỘT thao tác, mở file và kiểm tra tiêu đề mỗi tab đúng một lần rồi dùng lại.
// Mỗi thao tác công khai gọi freshCall_() trước, nên không bao giờ dùng lại thông tin của thao tác khác.
let openFiles_ = {};
let checkedTabs_ = {};
let refCache_ = {};
function freshCall_() { openFiles_ = {}; checkedTabs_ = {}; refCache_ = {}; CALLER_EMAIL_ = null; PROPS_CACHE_ = null; }

// 1.6c-G: chỉ khi đo tốc độ (perfOp đặt = {}), cộng dồn thời gian từng việc; bình thường là null → không làm gì thêm.
let perfTimes_ = null;
function timed_(label, fn) {
  if (!perfTimes_) return fn();
  const started = Date.now();
  try { return fn(); } finally { perfTimes_[label] = (perfTimes_[label] || 0) + Date.now() - started; }
}

function textFormatKey_(key) { return ENV + '_TEXTFMT_' + key; }

function openFile_(key) {
  if (openFiles_[key]) return openFiles_[key];
  const props = scriptProps_();
  const file = timed_('kiemTraFile', () => {
    if (!props.getProperty(propKey_(key))) throw new Error('NOT_INITIALIZED');
    return findSaved_(props, key, (id) => DriveApp.getFileById(id));
  });
  // 1.6b-C: file đã được định dạng sẵn "chữ thuần" (ghi ID file khi Khởi tạo) thì khỏi định dạng từng dòng.
  openFiles_[key] = {
    key: key,
    ss: timed_('moFile', () => SpreadsheetApp.openById(file.getId())),
    textFormatted: props.getProperty(textFormatKey_(key)) === file.getId(),
  };
  return openFiles_[key];
}

// Mở tab và kiểm tra hàng tiêu đề đúng thiết kế, để không bao giờ ghi lệch cột.
// Bảng nhạy cảm (số giấy tờ) luôn nằm ở file HR_SENSITIVE riêng (D-009).
function openTable_(table) {
  requireAccess_(); // GĐ 10: chỉ chủ hoặc người dùng liên kết hợp lệ (qua api) mới mở được dữ liệu
  const file = openFile_(SENSITIVE_TABLES[table] ? 'SENSITIVE' : dataFileKey_);
  return timed_('moFile', () => openTab_(file, table));
}

function openTab_(file, table) {
  const sheet = file.ss.getSheetByName(table);
  const headers = headersOf_(DATA_TABLES[table] || SENSITIVE_TABLES[table]);
  if (!sheet) throw new Error('SCHEMA_MISMATCH|' + table);
  const tabKey = file.key + '|' + table;
  if (!checkedTabs_[tabKey]) {
    const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (actual.join('|') !== headers.join('|')) throw new Error('SCHEMA_MISMATCH|' + table);
    checkedTabs_[tabKey] = true;
  }
  return { table: table, sheet: sheet, headers: headers, textFormatted: file.textFormatted };
}

function toRecord_(headers, row, rowNumber) {
  const rec = { _row: rowNumber };
  headers.forEach((h, j) => { rec[h] = row[j] === null || row[j] === undefined ? '' : String(row[j]); });
  return rec;
}

// 1.6b-B: đọc đúng một cột (vd. id, ma) thay vì cả bảng.
function readColumn_(t, name) { return timed_('doc', () => readColumnNow_(t, name)); }
function readColumnNow_(t, name) {
  const last = t.sheet.getLastRow();
  if (last < 2) return [];
  return t.sheet.getRange(2, t.headers.indexOf(name) + 1, last - 1, 1).getValues().map((r) => String(r[0]));
}

function readRow_(t, rowNumber) {
  return timed_('doc', () => toRecord_(t.headers, t.sheet.getRange(rowNumber, 1, 1, t.headers.length).getValues()[0], rowNumber));
}

function readAll_(t) { return timed_('doc', () => readAllNow_(t)); }
function readAllNow_(t) {
  const last = t.sheet.getLastRow();
  if (last < 2) return [];
  return t.sheet.getRange(2, 1, last - 1, t.headers.length).getValues().map((row, i) => toRecord_(t.headers, row, i + 2));
}

const ROW_BLOCK = 500;

// Ghi cả dòng dạng chữ thuần ('@') để Sheets không tự đổi chuỗi thành ngày/số.
// File đã định dạng sẵn: chỉ cần ghi; hết chỗ thì thêm một khối dòng đã định dạng sẵn.
// File chưa định dạng (vd. vừa khôi phục từ bản sao lưu cũ): định dạng từng dòng như trước — chậm hơn nhưng an toàn.
// rowNumber = null: ghi nối vào cuối bảng.
function writeRow_(t, rowNumber, rec) {
  timed_(t.table === 'AUDIT_LOG' ? 'nhatKy' : 'ghi', () => {
    writeRowNow_(t, rowNumber || t.sheet.getLastRow() + 1, rec);
    // Khi đo: ép Google ghi ngay để thời gian ghi tính đúng vào việc này (bình thường Google tự ghi khi kết thúc).
    if (perfTimes_) SpreadsheetApp.flush();
  });
}

// Ghi nối nhiều dòng vào cuối bảng trong 1 lần (cùng cách định dạng chữ thuần như writeRowNow_).
function writeRows_(t, recs) {
  timed_(t.table === 'AUDIT_LOG' ? 'nhatKy' : 'ghi', () => {
    const start = t.sheet.getLastRow() + 1;
    const n = recs.length;
    const range = t.sheet.getRange(start, 1, n, t.headers.length);
    if (t.textFormatted) {
      const max = t.sheet.getMaxRows();
      if (start + n - 1 > max) {
        const add = Math.max(ROW_BLOCK, start + n - 1 - max);
        t.sheet.insertRowsAfter(max, add);
        t.sheet.getRange(max + 1, 1, add, t.headers.length).setNumberFormat('@');
      }
    } else {
      range.setNumberFormat('@');
    }
    range.setValues(recs.map((rec) => t.headers.map((h) => (rec[h] === undefined ? '' : rec[h]))));
    if (perfTimes_) SpreadsheetApp.flush();
  });
}

function writeRowNow_(t, rowNumber, rec) {
  const range = t.sheet.getRange(rowNumber, 1, 1, t.headers.length);
  if (t.textFormatted) {
    const max = t.sheet.getMaxRows();
    if (rowNumber > max) {
      t.sheet.insertRowsAfter(max, ROW_BLOCK);
      t.sheet.getRange(max + 1, 1, ROW_BLOCK, t.headers.length).setNumberFormat('@');
    }
  } else {
    range.setNumberFormat('@');
  }
  range.setValues([t.headers.map((h) => (rec[h] === undefined ? '' : rec[h]))]);
}

function mask_(obj) {
  const out = {};
  Object.keys(obj).forEach((k) => { out[k] = MASKED_FIELDS.indexOf(k) >= 0 && obj[k] ? '***' : obj[k]; });
  return out;
}

function auditRow_(table, recordId, action, before, after, user, now) {
  return {
    id: Utilities.getUuid(), tao_luc: now, tao_boi: user,
    thoi_gian: now, nguoi: user, bang: table, ban_ghi_id: recordId, hanh_dong: action,
    gia_tri_cu: JSON.stringify(mask_(before)), gia_tri_moi: JSON.stringify(mask_(after)),
  };
}

function audit_(table, recordId, action, before, after, user, now) {
  writeRow_(openTable_('AUDIT_LOG'), null, auditRow_(table, recordId, action, before, after, user, now));
}

function clean_(rules, data) {
  const out = {};
  rules.editable.forEach((f) => {
    if (!data || data[f] === undefined) return;
    // Trường nhiều giá trị: nhận mảng hoặc chuỗi, lưu "id1,id2" không trùng.
    if ((rules.multi || []).indexOf(f) >= 0) {
      const ids = splitIds_(Array.isArray(data[f]) ? data[f].join(',') : data[f]);
      out[f] = ids.filter((x, i) => ids.indexOf(x) === i).join(',');
    } else out[f] = String(data[f]).trim();
  });
  return out;
}

function check_(rules, rec) {
  const err = rules.validate(rec);
  if (err) throw new Error('VALIDATION|' + JSON.stringify(err));
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  // Hết 30 giây vẫn có thao tác khác giữ khóa (vd. lần Khởi tạo trước còn chạy) → báo BUSY thay vì lỗi tiếng của Google.
  if (!timed_('khoa', () => lock.tryLock(30000))) throw new Error('BUSY');
  try { return fn(); } finally { lock.releaseLock(); }
}

function public_(rec) {
  const out = Object.assign({}, rec);
  delete out._row;
  return out;
}

// ---- Hàm gọi từ giao diện ----

function listRecords(table) {
  const cols = rulesOf_(table).listColumns;
  if (!cols) throw new Error('UNKNOWN_TABLE|' + table); // vd. PERSON_SENSITIVE: không bao giờ gửi cả bảng về trình duyệt
  freshCall_();
  return readAll_(openTable_(table)).map((r) => {
    const out = {};
    cols.forEach((c) => { out[c] = r[c]; });
    return out;
  });
}

function createRecord(table, data) {
  const rules = rulesOf_(table);
  if (rules.customSave) throw new Error('UNKNOWN_TABLE|' + table); // vd. PERSON: dùng savePerson (kiểm tra trùng + số giấy tờ)
  return withLock_(() => {
    freshCall_();
    const t = openTable_(table);
    const rec = Object.assign({}, rules.defaults, clean_(rules, data));
    check_(rules, rec);
    checkRefs_(rules, rec, null);
    if (rules.beforeCreate) rules.beforeCreate(rec, t);
    return insertMany_(table, t, [rec])[0];
  });
}

// Ghi thêm các bản ghi đã kiểm tra. Người gọi phải đang giữ khóa.
// skipAfterWrite: người gọi chắc chắn afterWrite không cần chạy (vd. liên hệ của công ty vừa tạo khi nhập file cũ) → ghi cả khối cho nhanh.
function insertMany_(table, t, recs, skipAfterWrite) {
  const rules = rulesOf_(table);
  let maxNo = readColumn_(t, 'ma').reduce((m, ma) => {
    const n = parseInt(ma.replace(rules.prefix + '-', ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const now = nowJst_();
  const user = currentUser_();
  recs.forEach((rec) => Object.assign(rec, {
    id: Utilities.getUuid(),
    ma: rules.prefix + '-' + String(++maxNo).padStart(4, '0'),
    tao_luc: now, tao_boi: user, sua_luc: now, sua_boi: user, da_an: '',
  }));
  // Bảng có afterWrite (vd. CONTACT bỏ dấu liên hệ chính cũ) cần ghi lần lượt; còn lại ghi 1 lần cả khối (nhập dữ liệu lớn, D-079).
  if ((rules.afterWrite && !skipAfterWrite) || recs.length < 2) {
    return recs.map((rec) => {
      writeRow_(t, null, rec);
      audit_(table, rec.id, 'tao', {}, clean_(rules, rec), user, now);
      if (rules.afterWrite && !skipAfterWrite) rules.afterWrite(t, rec, null, user, now);
      return rec;
    });
  }
  writeRows_(t, recs);
  writeRows_(openTable_('AUDIT_LOG'), recs.map((rec) => auditRow_(table, rec.id, 'tao', {}, clean_(rules, rec), user, now)));
  return recs;
}

// Nạp danh mục mặc định, mỗi loại đúng một lần (gọi trong Khởi tạo, đang giữ khóa).
function seedLookup_() {
  freshCall_();
  const t = openTable_('LOOKUP');
  const have = readColumn_(t, 'loai');
  const recs = [];
  Object.keys(DEFAULT_LOOKUPS).forEach((loai) => {
    if (have.indexOf(loai) >= 0) return; // loại này đã có (kể cả đã ẩn) → không nạp lại
    DEFAULT_LOOKUPS[loai].forEach((x) => recs.push({ loai: loai, ten_vi: x[0], ten_ja: x[1], tu_ngay: '', den_ngay: '' }));
  });
  return recs.length ? insertMany_('LOOKUP', t, recs).length : 0;
}

// expectedSuaLuc: giá trị sua_luc lúc người dùng mở form; khác thì bản ghi đã bị sửa ở nơi khác.
function changeRecord_(table, id, expectedSuaLuc, action, apply) {
  return withLock_(() => {
    freshCall_();
    const t = openTable_(table);
    const idx = readColumn_(t, 'id').indexOf(id);
    if (idx < 0) throw new Error('NOT_FOUND');
    const current = readRow_(t, idx + 2);
    if (current.sua_luc !== String(expectedSuaLuc)) throw new Error('CONFLICT');
    return public_(writeChange_(table, t, current, apply(current), action));
  });
}

// Ghi phần thay đổi của 1 bản ghi đã đọc + nhật ký (chỉ trường đổi). Người gọi phải đang giữ khóa.
function writeChange_(table, t, current, patch, action) {
  const next = Object.assign({}, current, patch);
  const changed = Object.keys(next).filter((k) => k !== '_row' && next[k] !== current[k]);
  if (!changed.length) return current;
  const before = {};
  const after = {};
  changed.forEach((k) => { before[k] = current[k]; after[k] = next[k]; });
  const now = nowJst_();
  const user = currentUser_();
  next.sua_luc = now;
  next.sua_boi = user;
  writeRow_(t, current._row, next);
  audit_(table, current.id, action, before, after, user, now);
  const rules = TABLE_RULES[table];
  if (rules.afterWrite) rules.afterWrite(t, next, current, user, now);
  return next;
}

function updateRecord(table, id, data, expectedSuaLuc) {
  const rules = rulesOf_(table);
  if (rules.customSave) throw new Error('UNKNOWN_TABLE|' + table);
  return changeRecord_(table, id, expectedSuaLuc, 'sua', (current) => {
    const patch = clean_(rules, data);
    (rules.createOnly || []).forEach((f) => { delete patch[f]; });
    const next = Object.assign({}, current, patch);
    check_(rules, next);
    checkRefs_(rules, next, current);
    return patch;
  });
}

function setHidden(table, id, hidden, expectedSuaLuc) {
  const rules = rulesOf_(table);
  if (rules.noHide) throw new Error('UNKNOWN_TABLE|' + table); // vd. lịch sử trạng thái: hủy qua cancelApplicationStatus
  return changeRecord_(table, id, expectedSuaLuc, hidden ? 'an' : 'hien', (current) => {
    if (!hidden && rules.beforeShow) rules.beforeShow(current);
    return { da_an: hidden ? HIDDEN : '' };
  });
}
