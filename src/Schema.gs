// Cấu trúc bảng theo DATA_MODEL.md (ERD lõi, D-030). Thêm cột sau này = tăng SCHEMA_VERSION.
// Chỉ được THÊM cột vào cuối bảng; bấm Khởi tạo sẽ tự nối cột mới (có sao lưu trước).
const SCHEMA_VERSION = 18; // 2: COMPANY + LOOKUP (2.1). 3: CONTACT (2.2). 4: JOB_ORDER (2.3). 5: PERSON (3.1). 6: APPLICATION (3.2). 7: INTERVIEW (3.3). 8: EMPLOYMENT (3.4). 9: SETTING (4.3). 10: IMMIGRATION_CASE (6.2). 11: CASE_DOCUMENT (6.3). 12: FILE thêm cột (6.4). 13: SUPPORT_LOG (7.2). 14: CONTRACT, REVENUE, TARGET, INVOICE, PAYMENT, REFERRER_PAYOUT, PERSON.nguoi_gioi_thieu (GĐ 5, 8). 15: STAFF thêm vai_tro, khoa_hash, khoa_luc (GĐ 10). 16: COMPANY + phap_nhan_so, ten_co_so, nganh_nghe; PERSON + cs_staff_id, giay_to_staff_id; EMPLOYMENT + tinh_trang, ho_tro (nhập file cũ, D-079). 17: CASE_DOCUMENT + 8 cột (thu gom giấy tờ), PERSON_DOC, PRE_ENTRY, PRE_TASK (GĐ 11.1–11.2, D-080). 18: MENDAN, INCIDENT, INCIDENT_LOG (GĐ 11.3–11.4)

const COMMON_COLUMNS = ['id', 'ma', 'tao_luc', 'tao_boi', 'sua_luc', 'sua_boi', 'da_an'];

const DATA_TABLES = {
  STAFF: ['ho_ten', 'trang_thai', 'vai_tro', 'khoa_hash', 'khoa_luc'], // GĐ 10: vai trò + mã băm liên kết truy cập
  TEAM: ['ten'],
  TEAM_MEMBERSHIP: ['staff_id', 'team_id', 'tu_ngay', 'den_ngay'],
  // sales_staff_id / support_staff_id / linh_vuc: nhiều ID cách nhau bằng dấu phẩy (bước 2.1, Q5).
  COMPANY: ['ten_phap_nhan', 'sales_staff_id', 'support_staff_id',
    'ten_viet_tat', 'ten_phien_am', 'ma_buu_dien', 'tinh_thanh', 'dia_chi', 'dien_thoai', 'linh_vuc', 'trang_thai', 'ghi_chu',
    'phap_nhan_so', 'ten_co_so', 'nganh_nghe'], // D-079: 法人番号, 施設名, 職種 (chữ tự do, như file cũ)
  // lien_he_chinh: 'Y' = liên hệ chính; mỗi công ty tối đa 1 người (bước 2.2, Q2).
  CONTACT: ['company_id', 'ho_ten', 'ho_ten_phien_am', 'bo_phan', 'chuc_vu', 'so_dien_thoai', 'email', 'lien_he_chinh', 'ghi_chu'],
  // linh_vuc: 1 lĩnh vực, phải thuộc lĩnh vực của công ty (bước 2.3, Q4 b). phu_trach_staff_id: 1 người (Q3).
  JOB_ORDER: ['company_id', 'vi_tri', 'so_luong_can', 'phu_trach_staff_id', 'trang_thai_don',
    'linh_vuc', 'tinh_thanh_lam_viec', 'dia_chi_lam_viec', 'dieu_kien', 'yeu_cau', 'ngay_nhan_don', 'ngay_du_kien_vao_lam', 'ghi_chu'],
  // quoc_tich, tu_cach_luu_tru, tieng_nhat, nguon: ID danh mục LOOKUP; ky_nang: nhiều ID lĩnh vực (bước 3.1).
  // Liên lạc (điện thoại, email, địa chỉ) để ở file chính (3.1 Q2 a); số giấy tờ ở PERSON_SENSITIVE.
  PERSON: ['ho_ten_latin', 'ho_ten_katakana', 'ngay_sinh', 'quoc_tich', 'trang_thai_sang_loc', 'recruiter_staff_id', 'han_ho_chieu', 'han_luu_tru',
    'gioi_tinh', 'so_dien_thoai', 'email', 'dia_chi', 'noi_o', 'tu_cach_luu_tru', 'tieng_nhat', 'ky_nang', 'nguon', 'ghi_chu',
    'nguoi_gioi_thieu', // GĐ 8
    'cs_staff_id', 'giay_to_staff_id'], // D-079: CS部担当 (nhiều người), 書類部担当 — theo từng người lao động: tên người giới thiệu (紹介者), nhận tiền khi người này vào làm
  // trang_thai_hien_tai / ngay_trang_thai: máy chủ tự tính = dòng lịch sử còn hiệu lực mới nhất (bước 3.2).
  APPLICATION: ['person_id', 'job_id', 'ngay_gui', 'trang_thai_hien_tai', 'recruiter_staff_id', 'ngay_trang_thai', 'ghi_chu'],
  // Chỉ ghi thêm; da_an = 'Y' nghĩa là dòng nhập nhầm đã bị hủy (vẫn giữ, có nhật ký) — bước 3.2 Q5.
  APPLICATION_STATUS_LOG: ['application_id', 'trang_thai', 'ngay_hieu_luc', 'ly_do'],
  // thoi_gian: 'yyyy-MM-dd HH:mm' (JST, D-014); gio_ket_thuc: 'HH:mm'; nguoi_pv_contact_id: người liên hệ của công ty (bước 3.3).
  INTERVIEW: ['application_id', 'thoi_gian', 'hinh_thuc', 'ket_qua', 'vong', 'gio_ket_thuc', 'dia_diem', 'nguoi_pv_contact_id', 'ly_do', 'ghi_chu'],
  // ly_do_nghi: ID danh mục LOOKUP 'ly_do_nghi' (3.4 Q3, bắt buộc khi ghi nghỉ); ghi_chu: ghi chú khi nghỉ.
  // D-079: tinh_trang = trạng thái ghi khi nhập từ file cũ (dang_lam / cho_vao_lam / da_nghi) — chỉ dùng khi thiếu ngày; trống = lần vào làm tạo trong app.
  // ho_tro = 'N': công ty tự hỗ trợ (支援なし) → không nhắc 定期面談, không tính phí hỗ trợ tháng.
  EMPLOYMENT: ['person_id', 'company_id', 'job_id', 'application_id', 'ngay_vao_lam', 'ngay_nghi', 'ly_do_nghi', 'ghi_chu', 'tinh_trang', 'ho_tro'],
  // Hồ sơ xin visa (bước 6.2, D-064). tu_cach_luu_tru: ID danh mục; company_id: nơi làm việc (không bắt buộc).
  IMMIGRATION_CASE: ['person_id', 'loai_thu_tuc', 'tu_cach_luu_tru', 'company_id', 'trang_thai', 'ngay_nop', 'noi_nop',
    'ngay_ket_qua', 'han_moi', 'phu_trach_staff_id', 'ghi_chu'],
  // Checklist giấy tờ của hồ sơ visa (bước 6.3, D-065). giay_to: ID danh mục 'giay_to'. Chưa có file đính kèm (6.4).
  // GĐ 11.1 (D-080): thu gom giấy tờ — bên cung cấp, ngày yêu cầu, hạn nhận, người kiểm tra, nội dung cần sửa, link Drive,
  // giấy tờ đã lưu trong kho được dùng lại (person_doc_id). pre_entry_id: dòng thuộc hồ sơ 受入れ前 thay vì hồ sơ visa (đúng 1 trong 2).
  CASE_DOCUMENT: ['case_id', 'giay_to', 'trang_thai', 'ngay_nhan', 'ghi_chu',
    'ben_cung_cap', 'ngay_yeu_cau', 'han_nhan', 'nguoi_kiem_tra', 'noi_dung_sua', 'link', 'person_doc_id', 'pre_entry_id'],
  // GĐ 11.1: kho giấy tờ của từng người — lưu 1 lần, dùng lại cho các hồ sơ sau (kiểm tra còn hạn / còn phù hợp).
  PERSON_DOC: ['person_id', 'giay_to', 'link', 'han_hieu_luc', 'ngay_kiem_tra', 'nguoi_kiem_tra', 'ghi_chu'],
  // GĐ 11.2: 受入れ前 — người đã 内定, chuẩn bị vào công ty (từ nước ngoài / chuyển việc trong Nhật). Vào làm → employment_id, giữ lịch sử.
  PRE_ENTRY: ['person_id', 'company_id', 'application_id', 'loai', 'ngay_nhap_canh', 'ngay_vao_lam', 'cs_staff_id', 'giay_to_staff_id',
    'trang_thai', 'cho_ben', 'employment_id', 'link', 'ghi_chu'],
  // Công việc chuẩn bị của 1 hồ sơ 受入れ前 (hợp đồng, 事前説明, visa, chỗ ở, vé máy bay, đón, thủ tục sau nhập cảnh…).
  PRE_TASK: ['pre_entry_id', 'ten', 'nhom', 'phu_trach_staff_id', 'han', 'trang_thai', 'cho_ben', 'link', 'ghi_chu'],
  // GĐ 11.3: 定期面談 — 1 dòng / người / quý cố định (ky = tháng đầu quý: yyyy-01, -04, -07, -10). Không ghi đè lần trước.
  MENDAN: ['person_id', 'employment_id', 'ky', 'ngay_du_kien', 'ngay_thuc_hien', 'staff_id', 'hinh_thuc', 'trang_thai', 'noi_dung', 'bien_ban', 'ghi_chu'],
  // GĐ 11.4: vấn đề phát sinh (相談・対応) — 1 vụ việc; nhiều người lao động và / hoặc 1 công ty; lịch sử xử lý ở INCIDENT_LOG.
  INCIDENT: ['person_ids', 'company_id', 'ngay_tiep_nhan', 'loai', 'tieu_de', 'noi_dung', 'uu_tien', 'phu_trach_staff_id', 'phoi_hop_staff_id',
    'han_xu_ly', 'trang_thai', 'ngay_lien_he_lai', 'ket_qua', 'mendan_id', 'link', 'ghi_chu'],
  INCIDENT_LOG: ['incident_id', 'ngay', 'staff_id', 'noi_dung', 'link'],
  // Bước 6.4 (D-067): tệp giấy tờ trong thư mục Drive riêng, không chia sẻ. Hiện chỉ gắn vào dòng checklist (loai_doi_tuong = 'CASE_DOCUMENT').
  // Nhật ký hỗ trợ người đang làm (bước 7.2, D-068). employment_id: lần vào làm của chính người đó (không bắt buộc).
  SUPPORT_LOG: ['person_id', 'employment_id', 'loai_ho_tro', 'ngay', 'hinh_thuc', 'staff_id', 'noi_dung', 'ghi_chu'],
  // GĐ 5 (D-069): hợp đồng phí theo công ty, có hiệu lực. Tiền: Yên, CHƯA thuế, số nguyên. bac_hoan: "30:100,90:50" = nghỉ trong ≤30 ngày hoàn 100%…
  CONTRACT: ['company_id', 'tu_ngay', 'den_ngay', 'phi_gioi_thieu', 'chia_coc', 'phi_ho_tro', 'bac_hoan', 'ghi_chu'],
  // Mỗi dòng = 1 khoản doanh số (chưa thuế; hoàn tiền là số âm). chia: "staffId:%,staffId:%" (tổng 100). bo_qua = 'Y': gợi ý đã bỏ qua.
  REVENUE: ['loai', 'company_id', 'person_id', 'application_id', 'employment_id', 'thang', 'ngay', 'so_tien', 'chia', 'invoice_id', 'bo_qua', 'ghi_chu'],
  // Mục tiêu tháng: staff_id trống = cả công ty.
  TARGET: ['staff_id', 'thang', 'so_tien'],
  // GĐ 8 (D-069): hóa đơn theo công ty; dòng = các khoản REVENUE có invoice_id. Tổng tính lúc phát hành rồi giữ cố định.
  INVOICE: ['company_id', 'ngay_lap', 'han_tt', 'trang_thai', 'tien_chua_thue', 'thue_suat', 'tien_thue', 'tong', 'ghi_chu'],
  // 入金 (số âm = trả lại cho công ty, vd. hóa đơn hoàn tiền).
  PAYMENT: ['invoice_id', 'ngay', 'so_tien', 'ghi_chu'],
  // Trả người giới thiệu (紹介者): 1 khoản / lần vào làm; ngay_tra trống = chưa trả.
  REFERRER_PAYOUT: ['person_id', 'employment_id', 'nguoi_nhan', 'so_tien', 'ngay_tra', 'ghi_chu'],
  FILE: ['loai_doi_tuong', 'doi_tuong_id', 'drive_file_id', 'loai_giay_to', 'ten_file', 'mime', 'kich_thuoc'],
  AUDIT_LOG: ['thoi_gian', 'nguoi', 'bang', 'ban_ghi_id', 'hanh_dong', 'gia_tri_cu', 'gia_tri_moi'],
  // Danh mục sửa được trong Cài đặt, có ngày hiệu lực (trống = không giới hạn). loai: xem LOOKUP_TYPES.
  LOOKUP: ['loai', 'ten_vi', 'ten_ja', 'tu_ngay', 'den_ngay'],
  // Cấu hình sửa được trong Cài đặt (bước 4.3): khoa duy nhất, gia_tri dạng JSON. Lưu trong file dữ liệu để được sao lưu + có nhật ký.
  SETTING: ['khoa', 'gia_tri'],
};

const SENSITIVE_TABLES = {
  PERSON_SENSITIVE: ['person_id', 'so_ho_chieu', 'so_zairyu_card'],
};

function headersOf_(columns) {
  return COMMON_COLUMNS.concat(columns);
}

const LOOKUP_TYPES = ['linh_vuc', 'quoc_tich', 'tu_cach_luu_tru', 'tieng_nhat', 'nguon', 'ly_do_nghi', 'giay_to'];
const COMPANY_STATUSES = ['dang_giao_dich', 'tiem_nang', 'tam_dung', 'ngung']; // bước 2.1, Q3
const JOB_STATUSES = ['dang_mo', 'tam_dung', 'da_du', 'da_huy']; // bước 2.3, Q2: đổi bằng tay
const SCREENING_STATUSES = ['moi_nhan', 'dang_kiem_tra', 'san_sang', 'tam_dung', 'khong_phu_hop']; // D-006, D-020
// Trạng thái tầng 2 (D-006, D-020). Kết thúc (được giới thiệu lại, D-023): không gồm 'tam_dung' (3.2 Q1).
const APP_STATUSES = ['da_gui', 'cho_pv', 'da_pv', 'naitei', 'naitei_shodaku', 'da_vao_lam',
  'truot', 'uv_tu_choi', 'cty_tu_choi', 'huy_sau_naitei', 'tam_dung'];
const APP_ENDED = ['da_vao_lam', 'truot', 'uv_tu_choi', 'cty_tu_choi', 'huy_sau_naitei'];
const APP_REASON_REQUIRED = ['truot', 'uv_tu_choi', 'cty_tu_choi', 'huy_sau_naitei']; // 3.2 Q4
const APP_LOCKED = []; // 3.2 Q6 → 3.4: 'da_vao_lam' đã mở, nhưng chỉ đặt qua startEmployment (kèm ngày vào làm)
const IV_ROUNDS = ['v1', 'v2', 'final', 'khac']; // 1次 / 2次 / 最終 / khác
const IV_FORMS = ['truc_tiep', 'online', 'dien_thoai'];
const IV_RESULTS = ['cho', 'dat', 'truot', 'hoan', 'huy'];
const GENDERS = ['nam', 'nu', 'khac'];
// Bước 6.2 (D-064): 認定 (từ nước ngoài) / 変更 / 更新 / khác.
const VISA_TYPES = ['nintei', 'henko', 'koshin', 'khac'];
const VISA_STATUSES = ['chuan_bi', 'da_nop', 'bo_sung', 'duoc_cap', 'tu_choi', 'rut'];
const VISA_ENDED = ['duoc_cap', 'tu_choi', 'rut'];
const VISA_FILED = ['da_nop', 'bo_sung']; // đã nộp, đang chờ kết quả
// GĐ 11.1: chưa yêu cầu (mã cũ chua_co) → đã yêu cầu → đã nhận → cần sửa → đã kiểm tra; không cần.
const DOC_STATUSES = ['chua_co', 'da_yeu_cau', 'da_nhan', 'can_sua', 'da_kiem_tra', 'khong_can']; // bước 6.3
const DOC_PROVIDERS = ['cong_ty', 'nguoi_lao_dong', 'khac'];
// GĐ 11.2: 受入れ前
const PRE_TYPES = ['nuoc_ngoai', 'trong_nuoc']; // từ nước ngoài sang / chuyển việc trong Nhật
const PRE_STATUSES = ['dang_chuan_bi', 'da_vao_lam', 'huy'];
const PRE_TASK_STATUSES = ['chua_lam', 'dang_lam', 'cho_phan_hoi', 'xong', 'khong_can'];
const PRE_TASK_DONE = ['xong', 'khong_can'];
const PRE_GROUPS = ['hop_dong', 'giai_thich', 'visa', 'cho_o', 'di_chuyen', 'sau_nhap_canh', 'khac'];
const WAIT_PARTIES = ['cong_ty', 'nguoi_lao_dong', 'co_quan', 'noi_bo', 'khac']; // bên đang chờ phản hồi
// GĐ 11.3–11.4
const MENDAN_STATUSES = ['chua_dat_lich', 'da_dat_lich', 'hoan_thanh', 'can_hen_lai'];
const INCIDENT_TYPES = ['luong', 'gio_lam', 'bao_hiem', 'thue', 'nha_o', 'suc_khoe', 'quan_he', 'nghi_viec', 'chuyen_viec', 'khac'];
const INCIDENT_PRIORITIES = ['cao', 'trung_binh', 'thap'];
const INCIDENT_STATUSES = ['moi', 'dang_xu_ly', 'cho_phan_hoi', 'da_giai_quyet', 'ket_thuc'];
const INCIDENT_DONE = ['da_giai_quyet', 'ket_thuc'];
// Mẫu công việc mặc định (chủ dự án sửa trong Cài đặt → 受入れ前). [nhóm, tên]
const PRE_TEMPLATE_DEFAULTS = {
  nuoc_ngoai: [['hop_dong', 'Hợp đồng lao động / 雇用契約書'], ['giai_thich', '事前ガイダンス (giải thích trước khi nhập cảnh)'],
    ['visa', 'Hồ sơ 在留資格認定 (COE)'], ['visa', 'Xin visa tại Đại sứ quán / 査証申請'], ['cho_o', 'Chuẩn bị chỗ ở / 住居確保'],
    ['di_chuyen', 'Vé máy bay / 航空券'], ['di_chuyen', 'Đón tại sân bay / 空港出迎え'],
    ['sau_nhap_canh', 'Đăng ký cư trú, tài khoản, điện thoại / 住居地届出・口座・携帯'], ['sau_nhap_canh', '生活オリエンテーション']],
  trong_nuoc: [['hop_dong', 'Hợp đồng lao động / 雇用契約書'], ['giai_thich', '事前ガイダンス (giải thích trước)'],
    ['visa', 'Hồ sơ 在留資格変更'], ['cho_o', 'Chuẩn bị chỗ ở / 住居確保'], ['di_chuyen', 'Chuyển nhà / đưa đến công ty'],
    ['sau_nhap_canh', 'Thủ tục sau chuyển (住所変更・届出)'], ['sau_nhap_canh', '生活オリエンテーション']],
};
const DOC_DONE = ['da_kiem_tra', 'khong_can'];
// Bước 6.4: chỉ nhận PDF / JPG / PNG ≤ 10MB; kiểm tra cả byte đầu tệp, không tin loại tệp trình duyệt gửi.
const FILE_TYPES = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/jpeg': [0xFF, 0xD8, 0xFF], 'image/png': [0x89, 0x50, 0x4E, 0x47] };
const FILE_MAX_BYTES = 10 * 1024 * 1024;
// Bước 7.2: dinh_ky = 定期面談; tu_van = 相談・苦情; su_co = トラブル; sinh_hoat = 生活支援.
const SUPPORT_TYPES = ['dinh_ky', 'tu_van', 'su_co', 'sinh_hoat', 'khac'];
// GĐ 5 (D-069): gioi_thieu = phí giới thiệu 1 lần; coc / con_lai = chia 1/2 (内定承諾 / vào làm); ho_tro = phí hỗ trợ tháng; hoan = hoàn tiền (âm).
const REVENUE_TYPES = ['gioi_thieu', 'coc', 'con_lai', 'ho_tro', 'hoan', 'khac'];
const FEE_TYPES = ['gioi_thieu', 'coc', 'con_lai']; // phần bị hoàn khi nghỉ sớm
const INVOICE_STATUSES = ['nhap', 'da_phat_hanh', 'huy'];
const FINANCE_DEFAULTS = { tax: 10, split_recruiter: 50, referrer_amount: 0, due_days: 30,
  issuer_name: '', issuer_address: '', issuer_tno: '', bank: '' };
const RESIDENCES = ['nhat', 'nuoc_ngoai']; // đang ở Nhật / ở nước ngoài
const EMP_IMPORT_STATES = ['', 'dang_lam', 'cho_vao_lam', 'da_nghi']; // D-079

const PREFECTURES = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県',
  '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県',
  '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県',
  '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];

// Nạp sẵn một lần khi Khởi tạo (bước 2.1, Q2). Theo trang 出入国在留管理庁 (moj.go.jp/isa/03_00169.html, xem 2026-10-19):
// 19 lĩnh vực theo quyết định 2026-01-23. Chủ dự án tự kiểm tra lại và đặt ngày hiệu lực trong Cài đặt.
const DEFAULT_LINH_VUC = [
  ['Điều dưỡng', '介護'], ['Vệ sinh tòa nhà', 'ビルクリーニング'], ['Cung cấp đồ vải', 'リネンサプライ'],
  ['Chế tạo sản phẩm công nghiệp', '工業製品製造業'], ['Xây dựng', '建設'], ['Đóng tàu & công nghiệp hàng hải', '造船・舶用工業'],
  ['Bảo dưỡng ô tô', '自動車整備'], ['Hàng không', '航空'], ['Lưu trú', '宿泊'], ['Vận tải ô tô', '自動車運送業'],
  ['Đường sắt', '鉄道'], ['Kho vận', '物流倉庫'], ['Nông nghiệp', '農業'], ['Ngư nghiệp', '漁業'],
  ['Chế biến thực phẩm & đồ uống', '飲食料品製造業'], ['Dịch vụ ăn uống', '外食業'], ['Lâm nghiệp', '林業'],
  ['Công nghiệp gỗ', '木材産業'], ['Tuần hoàn tài nguyên', '資源循環'],
];

// Bước 3.1 (Q4): nạp sẵn để chủ dự án tự kiểm tra, sửa trong Cài đặt → Danh mục. Mỗi loại nạp đúng một lần.
const DEFAULT_LOOKUPS = {
  linh_vuc: DEFAULT_LINH_VUC,
  quoc_tich: [['Việt Nam', 'ベトナム'], ['Indonesia', 'インドネシア'], ['Philippines', 'フィリピン'], ['Myanmar', 'ミャンマー'],
    ['Campuchia', 'カンボジア'], ['Nepal', 'ネパール'], ['Trung Quốc', '中国'], ['Thái Lan', 'タイ'], ['Sri Lanka', 'スリランカ'],
    ['Mông Cổ', 'モンゴル'], ['Bangladesh', 'バングラデシュ'], ['Uzbekistan', 'ウズベキスタン'], ['Khác', 'その他']],
  tu_cach_luu_tru: [['Thực tập kỹ năng', '技能実習'], ['Kỹ năng đặc định số 1', '特定技能1号'], ['Kỹ năng đặc định số 2', '特定技能2号'],
    ['Du học', '留学'], ['Kỹ sư / nhân văn / quốc tế', '技術・人文知識・国際業務'], ['Hoạt động đặc định', '特定活動'],
    ['Gia đình đi cùng', '家族滞在'], ['Vợ/chồng người Nhật', '日本人の配偶者等'], ['Vĩnh trú', '永住者'], ['Định cư', '定住者'],
    ['Lưu trú ngắn hạn', '短期滞在'], ['Khác', 'その他']],
  tieng_nhat: [['N1', 'N1'], ['N2', 'N2'], ['N3', 'N3'], ['N4', 'N4'], ['N5', 'N5'], ['JFT-Basic', 'JFT-Basic'], ['Chưa có', 'なし']],
  ly_do_nghi: [['Hết hợp đồng', '契約満了'], ['Tự nghỉ', '自己都合退職'], ['Chuyển việc', '転職'], ['Về nước', '帰国'], ['Mất liên lạc', '失踪'], ['Khác', 'その他']], // 3.4 Q3
  // Bước 6.3: danh sách mẫu để chủ dự án tự sửa theo thực tế từng thủ tục (không phải hướng dẫn pháp lý).
  giay_to: [['Đơn xin (申請書)', '申請書'], ['Ảnh thẻ', '写真'], ['Hộ chiếu (bản sao)', '旅券の写し'], ['Thẻ lưu trú (bản sao)', '在留カードの写し'],
    ['Hợp đồng lao động', '雇用契約書'], ['Giấy báo kết quả thi kỹ năng', '技能試験合格証明書'], ['Chứng chỉ tiếng Nhật', '日本語試験合格証明書'],
    ['Phiếu khám sức khỏe', '健康診断個人票'], ['Kế hoạch hỗ trợ', '支援計画書'], ['Giấy tờ của công ty tiếp nhận', '所属機関関係書類'],
    ['Giấy tờ thuế / bảo hiểm', '納税・社会保険関係書類'], ['Khác', 'その他']],
  nguon: [['Tự ứng tuyển', '直接応募'], ['Đối tác phái cử', '送出機関'], ['Người giới thiệu', '紹介者'], ['Trường học', '学校'],
    ['Mạng xã hội', 'SNS'], ['Khác', 'その他']],
};

// Bước 4.3 (D-062): quy tắc "Việc cần làm" tự sinh — mặc định; chủ dự án sửa số ngày / bật tắt trong Cài đặt.
const TASK_RULES = {
  iv_soon: { on: true, days: 1 },          // phỏng vấn trong N ngày tới (0 = hôm nay)
  iv_no_result: { on: true, days: 0 },     // phỏng vấn đã qua ≥ N ngày mà kết quả vẫn "chờ"
  sent_stale: { on: true, days: 7 },       // "Đã gửi khách" quá N ngày
  status_stale: { on: true, days: 14 },    // chờ PV / đã PV / 内定 / tạm dừng quá N ngày
  shodaku_no_date: { on: true, days: 7 },  // 内定承諾 quá N ngày chưa có ngày vào làm
  start_soon: { on: true, days: 7 },       // vào làm trong N ngày tới
  job_due: { on: true, days: 30 },         // đơn đang mở, ngày dự kiến vào làm trong N ngày, còn thiếu > 0
  job_full: { on: true, days: 0 },         // đơn đang mở đã đủ người (chưa đổi trạng thái)
  new_profile: { on: true, days: 3 },      // hồ sơ "Mới nhận" quá N ngày
  visa_expiry: { on: true, days: 90 },     // hạn lưu trú trong N ngày tới hoặc đã hết (bước 6.1, D-027)
  passport_expiry: { on: true, days: 180 }, // hạn hộ chiếu trong N ngày tới hoặc đã hết
  case_stale: { on: true, days: 30 },      // hồ sơ visa đã nộp quá N ngày chưa có kết quả (bước 6.2)
  invoice_overdue: { on: true, days: 0 },  // hóa đơn đã phát hành, quá hạn N ngày mà chưa thu đủ (GĐ 8)
  revenue_todo: { on: true, days: 0 },     // còn khoản doanh số cần lập (1 việc tổng; N không dùng) (GĐ 5)
  todokede: { on: true, days: 61 },        // 定期届出 năm (kỳ 1/4–31/3, hạn 31/5): nhắc từ N ngày trước hạn tới khi đánh dấu đã nộp (D-073)
  support_due: { on: true, days: 30 },     // 定期面談 theo quý cố định (D-080): nhắc từ N ngày trước cuối quý chưa làm; quý trước chưa làm = quá hạn
  incident_due: { on: true, days: 2 },     // GĐ 11.4: vấn đề chưa giải quyết — hạn xử lý / ngày liên hệ lại trong N ngày tới hoặc đã qua
  doc_due: { on: true, days: 3 },          // GĐ 11.1: giấy tờ chưa nhận / cần sửa, hạn nhận trong N ngày tới hoặc đã quá
  pre_task_due: { on: true, days: 3 },     // GĐ 11.2: công việc 受入れ前 chưa xong, hạn trong N ngày tới hoặc đã quá
};

// Lựa chọn cố định gửi cho giao diện (Code.gs → trang; test dùng chung) — một chỗ duy nhất.
function choices_() {
  return { prefectures: PREFECTURES, companyStatuses: COMPANY_STATUSES, jobStatuses: JOB_STATUSES,
    screening: SCREENING_STATUSES, genders: GENDERS, residences: RESIDENCES,
    appStatuses: APP_STATUSES, appEnded: APP_ENDED, appReasonRequired: APP_REASON_REQUIRED, appLocked: APP_LOCKED,
    ivRounds: IV_ROUNDS, ivForms: IV_FORMS, ivResults: IV_RESULTS,
    visaTypes: VISA_TYPES, visaStatuses: VISA_STATUSES, visaEnded: VISA_ENDED,
    docStatuses: DOC_STATUSES, docDone: DOC_DONE, supportTypes: SUPPORT_TYPES,
    docProviders: DOC_PROVIDERS, preTypes: PRE_TYPES, preStatuses: PRE_STATUSES, preTaskStatuses: PRE_TASK_STATUSES,
    preTaskDone: PRE_TASK_DONE, preGroups: PRE_GROUPS, waitParties: WAIT_PARTIES,
    mendanStatuses: MENDAN_STATUSES, incidentTypes: INCIDENT_TYPES, incidentPriorities: INCIDENT_PRIORITIES, incidentStatuses: INCIDENT_STATUSES,
    incidentDone: INCIDENT_DONE };
}
