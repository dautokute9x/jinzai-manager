// 9b (D-071): xuất dữ liệu ra 1 file Google Sheets MỚI trong thư mục gốc của app (không chia sẻ; tải về Excel bằng Tệp → Tải xuống).
// Không bao giờ xuất số hộ chiếu / 在留カード. Mỗi lần xuất ghi nhật ký "xuat".

const EXPORT_KINDS = ['people', 'companies', 'jobs', 'applications', 'working', 'sales', 'invoices'];

function exportData(kind, param) {
  if (EXPORT_KINDS.indexOf(kind) < 0) throw vError_('kind', 'invalidChoice');
  const p = param || {};
  if (kind === 'sales' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.month || '')) throw vError_('thang', 'invalidFormat');
  const table = exportTable_(kind, p);
  return withLock_(() => {
    const props = scriptProps_();
    const root = findSaved_(props, 'ROOT_FOLDER', (id) => DriveApp.getFolderById(id));
    if (!root) throw new Error('NOT_INITIALIZED');
    const now = nowJst_();
    const name = 'HR_EXPORT_' + kind + (kind === 'sales' ? '_' + p.month : '') + '_' + now.slice(0, 16).replace(/[-: ]/g, '');
    const ss = SpreadsheetApp.create(name);
    DriveApp.getFileById(ss.getId()).moveTo(root);
    const sh = ss.getSheets()[0];
    const values = [table.header].concat(table.rows).map((r) => r.map((v) => (v === null || v === undefined ? '' : v)));
    // Cột chữ để dạng "văn bản thuần": "=…" không chạy thành công thức, số điện thoại giữ số 0 đầu. Cột toàn số giữ dạng số.
    if (table.rows.length) table.header.forEach((h, c) => {
      if (table.rows.some((r) => typeof r[c] !== 'number')) sh.getRange(2, c + 1, table.rows.length, 1).setNumberFormat('@');
    });
    sh.getRange(1, 1, values.length, table.header.length).setValues(values);
    sh.getRange(1, 1, 1, table.header.length).setFontWeight('bold');
    sh.setFrozenRows(1);
    audit_('EXPORT', ss.getId(), 'xuat', {}, { kind: kind, month: p.month || '', rows: table.rows.length }, currentUser_(), now);
    return { url: ss.getUrl(), name: name, rows: table.rows.length };
  });
}

// Bảng giá trị dễ đọc (tên thay cho ID). Tiêu đề song ngữ để đọc được cả khi mở ở Nhật.
function exportTable_(kind, p) {
  freshCall_();
  const live = (r) => !r.da_an;
  const staff = readAll_(openTable_('STAFF'));
  const lookups = readAll_(openTable_('LOOKUP'));
  const companies = readAll_(openTable_('COMPANY'));
  const jobs = readAll_(openTable_('JOB_ORDER'));
  const people = readAll_(openTable_('PERSON'));
  const sName = (ids) => splitIds_(ids).map((id) => (staff.find((s) => s.id === id) || {}).ho_ten || id).join(', ');
  const lName = (ids) => splitIds_(ids).map((id) => { const l = lookups.find((x) => x.id === id) || {}; return l.ten_vi ? l.ten_vi + (l.ten_ja ? ' / ' + l.ten_ja : '') : id; }).join(', ');
  const cName = (id) => (companies.find((c) => c.id === id) || {}).ten_phap_nhan || '';
  const jName = (id) => { const j = jobs.find((x) => x.id === id) || {}; return j.ma ? j.ma + ' · ' + j.vi_tri : ''; };
  const pName = (id) => { const x = people.find((y) => y.id === id) || {}; return x.ma ? x.ma + ' · ' + x.ho_ten_latin : ''; };
  if (kind === 'people') return { header: ['Mã / コード', 'Họ tên / 氏名', 'Katakana', 'Ngày sinh / 生年月日', 'Giới tính / 性別', 'Quốc tịch / 国籍', 'Điện thoại / 電話', 'Email',
      'Tư cách / 在留資格', 'Hạn lưu trú / 在留期限', 'Hạn hộ chiếu / 旅券期限', 'Tiếng Nhật / 日本語', 'Kỹ năng / 分野', 'Sàng lọc / 状態', 'Recruiter', 'Nguồn / 経路', 'Người GT / 紹介者', 'Ghi chú / 備考'],
    rows: people.filter(live).map((r) => [r.ma, r.ho_ten_latin, r.ho_ten_katakana, r.ngay_sinh, r.gioi_tinh, lName(r.quoc_tich), r.so_dien_thoai, r.email,
      lName(r.tu_cach_luu_tru), r.han_luu_tru, r.han_ho_chieu, lName(r.tieng_nhat), lName(r.ky_nang), r.trang_thai_sang_loc, sName(r.recruiter_staff_id), lName(r.nguon), r.nguoi_gioi_thieu, r.ghi_chu]) };
  if (kind === 'companies') return { header: ['Mã / コード', 'Tên pháp nhân / 法人名', 'Viết tắt / 略称', 'Phiên âm / フリガナ', '〒', 'Tỉnh / 都道府県', 'Địa chỉ / 住所', 'Điện thoại / 電話',
      'Lĩnh vực / 分野', 'Trạng thái / 状態', 'Sales', 'Support', 'Ghi chú / 備考'],
    rows: companies.filter(live).map((r) => [r.ma, r.ten_phap_nhan, r.ten_viet_tat, r.ten_phien_am, r.ma_buu_dien, r.tinh_thanh, r.dia_chi, r.dien_thoai,
      lName(r.linh_vuc), r.trang_thai, sName(r.sales_staff_id), sName(r.support_staff_id), r.ghi_chu]) };
  if (kind === 'jobs') return { header: ['Mã / コード', 'Công ty / 企業', 'Vị trí / 職種', 'Số cần / 人数', 'Phụ trách / 担当', 'Trạng thái / 状態', 'Lĩnh vực / 分野', 'Tỉnh / 都道府県',
      'Ngày nhận / 受注日', 'Dự kiến vào làm / 入社予定', 'Ghi chú / 備考'],
    rows: jobs.filter(live).map((r) => [r.ma, cName(r.company_id), r.vi_tri, r.so_luong_can, sName(r.phu_trach_staff_id), r.trang_thai_don, lName(r.linh_vuc), r.tinh_thanh_lam_viec,
      r.ngay_nhan_don, r.ngay_du_kien_vao_lam, r.ghi_chu]) };
  if (kind === 'applications') return { header: ['Mã / コード', 'Người / 人材', 'Đơn / 求人', 'Công ty / 企業', 'Ngày gửi / 推薦日', 'Trạng thái / 状態', 'Ngày trạng thái / 状態日', 'Recruiter', 'Ghi chú / 備考'],
    rows: readAll_(openTable_('APPLICATION')).filter(live).map((r) => [r.ma, pName(r.person_id), jName(r.job_id), cName((jobs.find((j) => j.id === r.job_id) || {}).company_id),
      r.ngay_gui, r.trang_thai_hien_tai, r.ngay_trang_thai, sName(r.recruiter_staff_id), r.ghi_chu]) };
  if (kind === 'working') return { header: ['Người / 人材', 'Công ty / 企業', 'Đơn / 求人', 'Trạng thái / 状態', 'Ngày vào làm / 入社日', 'Số tháng / 在籍月数', 'Hạn lưu trú / 在留期限',
      'Còn (ngày) / 残日数', '定期面談 gần nhất / 直近', '定期面談 hạn / 期限', 'Support'],
    rows: getWorking({}).rows.map((r) => [r.person_ma + ' · ' + r.person, r.company, r.job, r.state, r.ngay_vao_lam, r.months, r.han_luu_tru, r.days_left,
      r.last_support, r.next_support, r.support]) };
  if (kind === 'sales') {
    const d = getSales({ month: p.month });
    return { header: ['Mã / コード', 'Ngày / 計上日', 'Loại / 区分', 'Tháng hỗ trợ / 支援月', 'Công ty / 企業', 'Người / 人材', 'Số tiền (chưa thuế) / 金額（税抜）', 'Chia / 配分', 'Hóa đơn / 請求書', 'Ghi chú / 備考'],
      rows: d.items.map((r) => [r.ma, r.ngay, r.loai, r.thang, r.company, r.person, Number(r.so_tien),
        (parseSplit_(r.chia) || []).map((x) => sName(x.id) + ' ' + x.pct + '%').join(', '), r.invoice_ma, r.ghi_chu]) };
  }
  return { header: ['Mã / 請求番号', 'Công ty / 企業', 'Ngày lập / 発行日', 'Hạn / 支払期限', 'Trạng thái / 状態', 'Chưa thuế / 税抜', 'Thuế / 消費税', 'Tổng / 合計', 'Đã thu / 入金済', 'Còn lại / 残額', 'Ghi chú / 備考'],
    rows: listInvoicesNow_().map((v) => [v.ma, v.company, v.ngay_lap, v.han_tt, v.state, Number(v.tien_chua_thue || v.preview_base), Number(v.tien_thue || 0), v.total, v.paid, v.remain, v.ghi_chu]) };
}
