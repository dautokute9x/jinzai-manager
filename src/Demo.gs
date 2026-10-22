// Tạo dữ liệu MẪU (giả hoàn toàn) để kiểm thử bằng tay trên bản thử nghiệm. Chỉ chủ, chỉ môi trường TEST.
// Mọi bản ghi đi qua đúng các hàm lưu của app (kiểm tra, nhật ký như người dùng nhập), ngày tính theo hôm nay (JST).
// Chạy theo từng phần: mỗi lần gọi làm tới ~4,5 phút rồi trả về; trình duyệt gọi tiếp tới khi xong (giới hạn 6 phút / lần của Apps Script).
// shortcut: nếu 1 phần lỗi giữa chừng, bấm lại sẽ làm lại cả phần đó (có thể thừa 1 bản ghi) — dữ liệu xác định sẵn nên không mong gặp.
const DEMO_BUDGET_MS = 270000;
let demoLk_ = null;

function demoState_() {
  try { return JSON.parse(scriptProps_().getProperty(ENV + '_DEMO_STATE') || 'null'); } catch (e) { return null; }
}

function seedDemoData() {
  requireOwner_();
  if (ENV !== 'TEST') throw new Error('DEMO_TEST_ONLY');
  const props = scriptProps_();
  let S = demoState_();
  if (!S) { freshCall_(); openTable_('STAFF'); S = { t: nowJst_().slice(0, 10), i: 0, ids: {} }; } // chưa Khởi tạo → NOT_INITIALIZED
  const tasks = demoTasks_(S);
  if (S.i >= tasks.length) throw new Error('DEMO_DONE');
  demoLk_ = null;
  const started = Date.now();
  while (S.i < tasks.length && Date.now() - started < DEMO_BUDGET_MS) {
    tasks[S.i]();
    S.i++;
    props.setProperty(ENV + '_DEMO_STATE', JSON.stringify(S));
  }
  return { done: S.i >= tasks.length, i: S.i, total: tasks.length };
}

function demoLookup_(loai, ja) {
  if (!demoLk_) demoLk_ = listRecords('LOOKUP').filter((r) => !r.da_an);
  const list = demoLk_.filter((r) => r.loai === loai);
  const hit = list.find((r) => r.ten_ja === ja) || list[0]; // danh mục đã bị sửa tên → lấy mục đầu tiên cùng loại
  if (!hit) throw new Error('DEMO_LOOKUP|' + loai);
  return hit.id;
}

// Danh sách việc cố định (thứ tự quan trọng: việc sau dùng ID việc trước, lưu trong S.ids).
function demoTasks_(S) {
  const T = S.t;
  const d = (n) => addDays_(T, n);
  const M = T.slice(0, 7);
  const id = (k) => { if (!S.ids[k]) throw new Error('DEMO_MISSING|' + k); return S.ids[k]; };
  const lk = demoLookup_;
  const tasks = [];
  const add = (fn) => tasks.push(fn);

  // ---- Nhân viên (s5 sẽ chuyển "đã nghỉ" ở cuối, để thử công ty còn giữ người đã nghỉ) ----
  [['s1', 'Mẫu Nguyễn Văn An', 'nhan_vien'], ['s2', 'Mẫu Trần Thị Bình', 'nhan_vien'], ['s3', 'Mẫu Lê Minh Châu', 'quan_ly'],
    ['s4', 'Mẫu Phạm Thu Dung', 'nhan_vien'], ['s5', 'Mẫu Hoàng Đức Em', 'nhan_vien']].forEach((x) => add(() => {
    S.ids[x[0]] = createRecord('STAFF', { ho_ten: x[1], vai_tro: x[2] }).id;
  }));
  // Cài đặt tài chính: chỉ điền khi chưa ai lưu (không ghi đè cài đặt đang dùng).
  add(() => {
    if (finance_().sua_luc) return;
    saveFinanceSettings({ tax: 10, split_recruiter: 50, referrer_amount: 30000, due_days: 30, issuer_name: '株式会社サンプル人材（mẫu）',
      issuer_address: '東京都千代田区サンプル1-1-1', issuer_tno: 'T0000000000000', bank: 'サンプル銀行 本店 普通 0000000' }, '');
  });

  // ---- Công ty, người liên hệ, hợp đồng phí ----
  const COS = [
    ['c1', '株式会社サンプル介護', 'Mẫu Kaigo', 'サンプルカイゴ', '460-0001', '愛知県', '名古屋市中区サンプル1-1', '052-000-0001', ['介護'], 's1', 's2,s5', 'dang_giao_dich'],
    ['c2', '株式会社サンプル建設', 'Mẫu Kensetsu', 'サンプルケンセツ', '530-0001', '大阪府', '大阪市北区サンプル2-2', '06-0000-0002', ['建設'], 's3', 's4', 'dang_giao_dich'],
    ['c3', '有限会社サンプル食品', 'Mẫu Shokuhin', 'サンプルショクヒン', '330-0001', '埼玉県', 'さいたま市サンプル3-3', '048-000-0003', ['飲食料品製造業', '外食業'], 's1', 's2', 'dang_giao_dich'],
    ['c4', '株式会社サンプルビルメンテ', 'Mẫu Biru', 'サンプルビルメンテ', '100-0001', '東京都', '千代田区サンプル4-4', '03-0000-0004', ['ビルクリーニング'], 's3', 's4', 'dang_giao_dich'],
    ['c5', 'サンプル農園株式会社', 'Mẫu Nouen', 'サンプルノウエン', '860-0001', '熊本県', '熊本市サンプル5-5', '096-000-0005', ['農業'], 's1', '', 'tiem_nang'],
    ['c6', '株式会社サンプル物流', 'Mẫu Butsuryu', 'サンプルブツリュウ', '260-0001', '千葉県', '千葉市サンプル6-6', '043-000-0006', ['物流倉庫'], 's3', 's3', 'tam_dung'],
  ];
  const ids = (keys) => keys.split(',').filter((k) => k).map(id).join(',');
  COS.forEach((x) => add(() => {
    S.ids[x[0]] = createRecord('COMPANY', { ten_phap_nhan: x[1], ten_viet_tat: x[2], ten_phien_am: x[3], ma_buu_dien: x[4], tinh_thanh: x[5],
      dia_chi: x[6], dien_thoai: x[7], linh_vuc: x[8].map((j) => lk('linh_vuc', j)).join(','), sales_staff_id: ids(x[9]), support_staff_id: ids(x[10]),
      trang_thai: x[11], ghi_chu: 'Dữ liệu mẫu' }).id;
  }));
  [['k1', 'c1', '山田 花子', 'ヤマダ ハナコ', '人事部', '部長', 'Y'], ['k2', 'c1', '鈴木 一郎', 'スズキ イチロウ', '介護部', '主任', ''],
    ['k3', 'c2', '佐藤 健', 'サトウ ケン', '総務部', '課長', 'Y'], ['k4', 'c3', '高橋 美咲', 'タカハシ ミサキ', '総務部', '係長', 'Y'],
    ['k5', 'c3', '伊藤 誠', 'イトウ マコト', '製造部', '工場長', ''], ['k6', 'c4', '渡辺 直子', 'ワタナベ ナオコ', '人事部', '課長', 'Y'],
    ['k7', 'c5', '中村 太郎', 'ナカムラ タロウ', '', '代表', 'Y'], ['k8', 'c6', '小林 陽子', 'コバヤシ ヨウコ', '管理部', '部長', 'Y']].forEach((x, n) => add(() => {
    S.ids[x[0]] = createRecord('CONTACT', { company_id: id(x[1]), ho_ten: x[2], ho_ten_phien_am: x[3], bo_phan: x[4], chuc_vu: x[5],
      so_dien_thoai: '090-0000-' + String(1001 + n), email: 'mau.contact' + (n + 1) + '@example.com', lien_he_chinh: x[6] }).id;
  }));
  const CONTACT_OF = { c1: 'k1', c2: 'k3', c3: 'k4', c4: 'k6', c5: 'k7', c6: 'k8' };
  // c1 có 2 hợp đồng (phí tăng từ 60 ngày trước) để thử "hợp đồng theo ngày hiệu lực"; c2, c4 chia cọc 1/2.
  [['c1', -500, -61, '400000', '', '25000', '30:100,90:50'], ['c1', -60, '', '450000', '', '25000', '30:100,90:50'],
    ['c2', -500, '', '500000', 'Y', '30000', '30:100,90:50,180:20'], ['c3', -500, '', '300000', '', '20000', '90:50'],
    ['c4', -500, '', '350000', 'Y', '22000', '30:100'], ['c6', -500, '', '300000', '', '20000', '']].forEach((x) => add(() => {
    createRecord('CONTRACT', { company_id: id(x[0]), tu_ngay: d(x[1]), den_ngay: x[2] === '' ? '' : d(x[2]), phi_gioi_thieu: x[3],
      chia_coc: x[4], phi_ho_tro: x[5], bac_hoan: x[6], ghi_chu: 'Hợp đồng mẫu' });
  }));

  // ---- Đơn tuyển (j7 chuyển "tạm dừng" ở cuối) ----
  [['j1', 'c1', '介護職員（日勤）', 3, 's1', '介護', '愛知県', -200, 20], ['j2', 'c1', '介護職員（夜勤あり）', 2, 's2', '介護', '愛知県', -90, 45],
    ['j3', 'c2', '建設作業員（型枠）', 4, 's3', '建設', '大阪府', -330, 60], ['j4', 'c3', '食品製造ライン', 5, 's1', '飲食料品製造業', '埼玉県', -360, 30],
    ['j5', 'c3', 'ホールスタッフ', 2, 's2', '外食業', '埼玉県', -60, 25], ['j6', 'c4', '清掃スタッフ', 3, 's4', 'ビルクリーニング', '東京都', -280, 15],
    ['j7', 'c6', '倉庫ピッキング', 2, 's3', '物流倉庫', '千葉県', -100, 40], ['j8', 'c2', '建設作業員（鉄筋）', 1, 's3', '建設', '大阪府', -30, 90]].forEach((x) => add(() => {
    S.ids[x[0]] = createRecord('JOB_ORDER', { company_id: id(x[1]), vi_tri: x[2], so_luong_can: String(x[3]), phu_trach_staff_id: id(x[4]),
      linh_vuc: lk('linh_vuc', x[5]), tinh_thanh_lam_viec: x[6], dia_chi_lam_viec: 'Địa chỉ làm việc mẫu', dieu_kien: '時給1,200円〜（mẫu）',
      yeu_cau: 'N4以上（mẫu）', ngay_nhan_don: d(x[7]), ngay_du_kien_vao_lam: d(x[8]), ghi_chu: 'Đơn mẫu' }).id;
  }));

  // ---- Người (ứng viên). Số giấy tờ, điện thoại, email đều giả (example.com). ----
  // [key, latin, katakana, ngày sinh, giới tính, quốc tịch, nơi ở, tư cách, hạn lưu trú (+ngày), hạn hộ chiếu (+ngày), tiếng Nhật, kỹ năng, nguồn, recruiter, sàng lọc, người giới thiệu]
  const PEOPLE = [
    ['p1', 'NGUYEN VAN THIEN', 'グエン ヴァン ティエン', '1998-04-12', 'nam', 'ベトナム', 'nhat', '特定技能1号', 80, 900, 'N3', ['飲食料品製造業'], '送出機関', 's1'],
    ['p2', 'TRAN THI LAN', 'チャン ティ ラン', '1999-08-03', 'nu', 'ベトナム', 'nhat', '特定技能1号', 75, 700, 'N3', ['建設'], '紹介者', 's2', '', 'Mẫu Người giới thiệu A'],
    ['p3', 'LE VAN NAM', 'レ ヴァン ナム', '1997-01-25', 'nam', 'ベトナム', 'nhat', '技能実習', 30, 400, 'N4', ['介護'], '直接応募', 's1'],
    ['p4', 'PHAM THI HOA', 'ファム ティ ホア', '2000-11-09', 'nu', 'ベトナム', 'nhat', '特定技能1号', 40, 150, 'N3', ['ビルクリーニング'], '紹介者', 's2', '', 'Mẫu Người giới thiệu A'],
    ['p5', 'SITI RAHAYU', 'シティ ラハユ', '2001-02-14', 'nu', 'インドネシア', 'nhat', '特定技能1号', 330, 1200, 'JFT-Basic', ['介護'], '学校', 's4'],
    ['p6', 'BUDI SANTOSO', 'ブディ サントソ', '1996-06-30', 'nam', 'インドネシア', 'nhat', '留学', 60, 800, 'N2', ['介護'], 'SNS', 's4'],
    ['p7', 'HOANG VAN THUC', 'ホアン ヴァン トゥック', '1995-09-17', 'nam', 'ベトナム', 'nhat', '特定技能1号', 500, 600, 'N4', ['建設'], '紹介者', 's1', '', 'Mẫu Người giới thiệu B'],
    ['p8', 'VU THI MAI', 'ヴー ティ マイ', '1998-12-01', 'nu', 'ベトナム', 'nhat', '特定技能1号', 120, 1000, 'N3', ['飲食料品製造業'], '送出機関', 's2'],
    ['p9', 'MARIA SANTOS', 'マリア サントス', '1999-03-21', 'nu', 'フィリピン', 'nhat', '特定技能1号', 250, 900, 'N3', ['外食業'], '直接応募', 's4'],
    ['p10', 'JOSE REYES', 'ホセ レイエス', '1997-07-07', 'nam', 'フィリピン', 'nhat', '技能実習', 85, 500, 'N4', ['外食業'], '送出機関', 's2'],
    ['p11', 'AUNG KO KO', 'アウン コ コ', '2000-05-05', 'nam', 'ミャンマー', 'nuoc_ngoai', '', null, 1500, 'N4', ['建設'], '送出機関', 's3'],
    ['p12', 'DO THI THU', 'ド ティ トゥ', '2002-10-10', 'nu', 'ベトナム', 'nhat', '留学', 150, 1100, 'N2', ['介護'], '学校', 's1'],
    ['p13', 'BUI VAN KHIEM', 'ブイ ヴァン キエム', '1996-02-28', 'nam', 'ベトナム', 'nhat', '特定技能1号', 20, 90, 'N3', ['ビルクリーニング'], '直接応募', 's2'],
    ['p14', 'NGO THI HUONG', 'ゴ ティ フオン', '1999-06-18', 'nu', 'ベトナム', 'nhat', '技能実習', 180, 700, 'N4', ['物流倉庫'], '送出機関', 's3'],
    ['p15', 'DANG VAN LONG', 'ダン ヴァン ロン', '1998-09-09', 'nam', 'ベトナム', 'nuoc_ngoai', '', null, 1300, 'JFT-Basic', ['建設'], '送出機関', 's3'],
    ['p16', 'THIN THIN AYE', 'ティン ティン エー', '2001-12-12', 'nu', 'ミャンマー', 'nuoc_ngoai', '', null, 1600, 'N3', ['建設'], '送出機関', 's3'],
    ['p17', 'DEWI LESTARI', 'デウィ レスタリ', '2000-01-30', 'nu', 'インドネシア', 'nhat', '特定技能1号', 300, 800, 'N4', ['介護', 'ビルクリーニング'], 'SNS', 's1'],
    ['p18', 'TRUONG VAN BAO', 'チュオン ヴァン バオ', '1997-11-11', 'nam', 'ベトナム', 'nhat', '特定技能1号', 220, 600, 'N3', ['飲食料品製造業'], '直接応募', 's1'],
    ['p19', 'RIZAL PRATAMA', 'リザル プラタマ', '1998-08-08', 'nam', 'インドネシア', 'nhat', '留学', 100, 900, 'N3', ['外食業'], '学校', 's2'],
    ['p20', 'LY THI NGOC', 'リー ティ ゴック', '1999-04-04', 'nu', 'ベトナム', 'nhat', '技能実習', 50, 500, 'N4', ['介護'], '紹介者', 's2'],
    ['p21', 'MAI VAN KHOA', 'マイ ヴァン コア', '2003-03-03', 'nam', 'ベトナム', 'nuoc_ngoai', '', null, 1700, 'N5', [], 'SNS', 's4', 'moi_nhan'],
    ['p22', 'ANA CRUZ', 'アナ クルス', '2001-07-15', 'nu', 'フィリピン', 'nhat', '家族滞在', 400, 1000, 'N4', ['外食業'], '直接応募', 's4', 'dang_kiem_tra'],
    ['p23', 'TRINH VAN SON', 'チン ヴァン ソン', '1994-05-20', 'nam', 'ベトナム', 'nhat', '特定活動', 15, 60, 'なし', [], 'その他', 's1', 'khong_phu_hop'],
    ['p24', 'PHAN THI YEN', 'ファン ティ イエン', '2002-08-25', 'nu', 'ベトナム', 'nhat', '留学', 140, 1200, 'N2', ['外食業', '飲食料品製造業'], '学校', 's2'],
  ];
  PEOPLE.forEach((x, n) => add(() => {
    const no = String(n + 1).padStart(2, '0');
    const inJp = x[6] === 'nhat';
    const res = savePerson('', { ho_ten_latin: x[1], ho_ten_katakana: x[2], ngay_sinh: x[3], gioi_tinh: x[4], quoc_tich: lk('quoc_tich', x[5]), noi_o: x[6],
      tu_cach_luu_tru: x[7] ? lk('tu_cach_luu_tru', x[7]) : '', han_luu_tru: x[8] === null ? '' : d(x[8]), han_ho_chieu: d(x[9]),
      tieng_nhat: lk('tieng_nhat', x[10]), ky_nang: x[11].map((j) => lk('linh_vuc', j)).join(','), nguon: lk('nguon', x[12]),
      recruiter_staff_id: id(x[13]), trang_thai_sang_loc: x[14] || 'san_sang', nguoi_gioi_thieu: x[15] || '',
      so_dien_thoai: '080-0000-01' + no, email: 'mau.person' + no + '@example.com', dia_chi: inJp ? 'サンプル市サンプル町' + (n + 1) + '-1' : '',
      so_ho_chieu: 'C00001' + no, so_zairyu_card: inJp ? 'AB000001' + no + 'CD' : '', ghi_chu: 'Hồ sơ mẫu' }, '', true);
    S.ids[x[0]] = res.person.id;
  }));

  // ---- Lần giới thiệu: mỗi kịch bản = 1 việc (tạo + đổi trạng thái + phỏng vấn + vào làm / nghỉ, theo thứ tự ngày) ----
  const job2co = { j1: 'c1', j2: 'c1', j3: 'c2', j4: 'c3', j5: 'c3', j6: 'c4', j7: 'c6', j8: 'c2' };
  const recOf = {};
  PEOPLE.forEach((x) => { recOf[x[0]] = x[13]; });
  const hired = (start) => { // luồng tới vào làm; vào làm ở tương lai thì 内定承諾 cách đây 10 ngày
    const b = start <= 0 ? start : 15;
    return { sent: b - 40, steps: [['s', 'cho_pv', b - 35], ['iv', 'v1', b - 33, '10:00', '11:00', 'online', 'dat'], ['s', 'da_pv', b - 33],
      ['s', 'naitei', b - 28], ['s', 'naitei_shodaku', b - 25], ['start', start]] };
  };
  const APPS = [
    ['E1', 'p1', 'j4', hired(-300)], ['E2', 'p2', 'j3', hired(-200)], ['E3', 'p3', 'j1', hired(-120)], ['E4', 'p4', 'j6', hired(-45)],
    ['E5', 'p5', 'j1', hired(-20)], ['E6', 'p6', 'j2', hired(6)],
    ['E7', 'p7', 'j3', { sent: -190, steps: hired(-150).steps.concat([['end', -130, '自己都合退職']]) }],
    ['E8', 'p8', 'j4', { sent: -290, steps: hired(-250).steps.concat([['end', -100, '契約満了']]) }],
    ['A9', 'p9', 'j5', { sent: -2, steps: [] }],
    ['A10', 'p10', 'j5', { sent: -12, steps: [] }],
    ['A11', 'p11', 'j8', { sent: -6, steps: [['s', 'cho_pv', -5], ['iv', 'v1', 1, '10:00', '10:30', 'online', 'cho']] }],
    ['A12', 'p12', 'j2', { sent: -7, steps: [['s', 'cho_pv', -6], ['iv', 'v1', 4, '14:00', '15:00', 'truc_tiep', 'cho']] }],
    ['A13', 'p13', 'j6', { sent: -10, steps: [['s', 'cho_pv', -9], ['iv', 'v1', -3, '11:00', '11:30', 'truc_tiep', 'cho']] }],
    ['A14', 'p14', 'j7', { sent: -30, steps: [['s', 'cho_pv', -28], ['iv', 'v1', -20, '13:00', '13:30', 'dien_thoai', 'dat'], ['s', 'da_pv', -20]] }],
    ['A15', 'p15', 'j3', { sent: -25, steps: [['s', 'cho_pv', -22], ['iv', 'v1', -18, '09:00', '09:30', 'online', 'dat'],
      ['iv', 'final', -10, '16:00', '17:00', 'online', 'dat'], ['s', 'da_pv', -10], ['s', 'naitei', -5]] }],
    ['A16', 'p16', 'j8', { sent: -28, steps: [['s', 'cho_pv', -26], ['iv', 'v1', -20, '10:00', '11:00', 'online', 'dat'], ['s', 'da_pv', -20],
      ['s', 'naitei', -15], ['s', 'naitei_shodaku', -12]] }],
    ['A17', 'p17', 'j1', { sent: -45, steps: [['s', 'cho_pv', -40], ['iv', 'v1', -32, '10:00', '10:45', 'truc_tiep', 'truot', 'Tiếng Nhật chưa đủ (mẫu)'],
      ['s', 'truot', -30, 'Tiếng Nhật chưa đủ (mẫu)']] }],
    ['A17b', 'p17', 'j6', { sent: -1, steps: [] }], // cùng người, giới thiệu lại đơn khác sau khi trượt
    ['A18', 'p18', 'j4', { sent: -50, steps: [['s', 'cho_pv', -45], ['s', 'uv_tu_choi', -40, 'Ứng viên chọn công ty khác (mẫu)']] }],
    ['A19', 'p19', 'j5', { sent: -35, steps: [['s', 'tam_dung', -25]] }],
    ['A20', 'p20', 'j2', { sent: -20, steps: [['s', 'cty_tu_choi', -15, 'Công ty dừng tuyển vị trí này (mẫu)']] }],
  ];
  APPS.forEach((x) => add(() => {
    let app = createApplication({ person_id: id(x[1]), job_id: id(x[2]), ngay_gui: d(x[3].sent), recruiter_staff_id: id(recOf[x[1]]), ghi_chu: 'Mẫu' });
    S.ids['a' + x[0]] = app.id;
    let emp = null;
    x[3].steps.forEach((st) => {
      if (st[0] === 's') app = addApplicationStatus(app.id, st[1], d(st[2]), st[3] || '', app.sua_luc);
      if (st[0] === 'iv') {
        saveInterview('', { application_id: app.id, vong: st[1], thoi_gian: d(st[2]) + ' ' + st[3], gio_ket_thuc: st[4], hinh_thuc: st[5],
          dia_diem: st[5] === 'truc_tiep' ? 'Văn phòng công ty (mẫu)' : 'Zoom (mẫu)', nguoi_pv_contact_id: id(CONTACT_OF[job2co[x[2]]]),
          ket_qua: st[6], ly_do: st[7] || '' }, '');
      }
      if (st[0] === 'start') { const r = startEmployment(app.id, d(st[1]), app.sua_luc); app = r.app; emp = r.employment; S.ids['e' + x[0]] = emp.id; }
      if (st[0] === 'end') emp = endEmployment(emp.id, { ngay_nghi: d(st[1]), ly_do_nghi: lk('ly_do_nghi', st[2]), ghi_chu: 'Mẫu' }, emp.sua_luc);
    });
  }));

  // ---- Visa: hồ sơ mới tự tạo checklist theo mẫu; v1 được cấp → tự cập nhật hạn lưu trú của p3 ----
  const tokutei = () => lk('tu_cach_luu_tru', '特定技能1号');
  [['v1', 'p3', 'henko', 'c1', 'duoc_cap', -150, -125, 240, 's2', '名古屋出入国在留管理局'], ['v2', 'p1', 'koshin', 'c3', 'da_nop', -45, null, null, 's1', '東京出入国在留管理局'],
    ['v3', 'p6', 'henko', 'c1', 'chuan_bi', null, null, null, 's2', ''], ['v4', 'p16', 'nintei', 'c2', 'bo_sung', -35, null, null, 's3', '大阪出入国在留管理局'],
    ['v5', 'p20', 'henko', 'c1', 'tu_choi', -90, -30, null, 's2', '名古屋出入国在留管理局']].forEach((x) => add(() => {
    S.ids[x[0]] = createRecord('IMMIGRATION_CASE', { person_id: id(x[1]), loai_thu_tuc: x[2], tu_cach_luu_tru: tokutei(), company_id: id(x[3]), trang_thai: x[4],
      ngay_nop: x[5] === null ? '' : d(x[5]), ngay_ket_qua: x[6] === null ? '' : d(x[6]), han_moi: x[7] === null ? '' : d(x[7]),
      phu_trach_staff_id: id(x[8]), noi_nop: x[9], ghi_chu: x[4] === 'tu_choi' ? 'Bị từ chối, chờ nộp lại (mẫu)' : 'Mẫu' }).id;
  }));
  // Checklist: v3 đang gom giấy tờ (nhận / đã kiểm tra / không cần), v4 đã kiểm tra phần lớn.
  [['v3', ['da_nhan', 'da_nhan', 'da_nhan', 'da_nhan', 'da_kiem_tra', 'da_kiem_tra', 'khong_can'], -3],
    ['v4', ['da_kiem_tra', 'da_kiem_tra', 'da_kiem_tra', 'da_kiem_tra', 'da_kiem_tra', 'da_kiem_tra', 'da_kiem_tra', 'da_nhan'], -30]].forEach((x) => add(() => {
    const docs = listRecords('CASE_DOCUMENT').filter((r) => r.case_id === id(x[0]) && !r.da_an).sort((a, b) => (a.ma < b.ma ? -1 : 1));
    x[1].forEach((st, n) => {
      if (docs[n]) updateRecord('CASE_DOCUMENT', docs[n].id, { trang_thai: st, ngay_nhan: st === 'khong_can' ? '' : d(x[2]) }, docs[n].sua_luc);
    });
  }));

  // ---- Hỗ trợ (p1 lần 定期面談 gần nhất đã lâu → hiện việc "tới hạn phỏng vấn định kỳ") ----
  [['p1', 'E1', 'dinh_ky', -95, 'truc_tiep', 's2', 'Phỏng vấn định kỳ: công việc ổn định, không có vấn đề (mẫu).'],
    ['p1', 'E1', 'tu_van', -30, 'dien_thoai', 's2', 'Hỏi về thủ tục gia hạn visa (mẫu).'],
    ['p2', 'E2', 'dinh_ky', -20, 'truc_tiep', 's4', 'Phỏng vấn định kỳ: muốn học thêm tiếng Nhật (mẫu).'],
    ['p3', 'E3', 'dinh_ky', -60, 'online', 's2', 'Phỏng vấn định kỳ (mẫu).'],
    ['p3', 'E3', 'su_co', -10, 'truc_tiep', 's2', 'Va chạm nhỏ với đồng nghiệp, đã trao đổi với quản lý (mẫu).'],
    ['p4', 'E4', 'sinh_hoat', -40, 'truc_tiep', 's4', 'Đi cùng mở tài khoản ngân hàng, đăng ký địa chỉ (mẫu).']].forEach((x) => add(() => {
    createRecord('SUPPORT_LOG', { person_id: id(x[0]), employment_id: id('e' + x[1]), loai_ho_tro: x[2], ngay: d(x[3]), hinh_thuc: x[4], staff_id: id(x[5]), noi_dung: x[6] });
  }));
  // ---- GĐ 11.3–11.4: 定期面談 theo quý (p3 đã làm, phát hiện vấn đề → vụ việc; p4 đã đặt lịch) + vấn đề chung của công ty ----
  add(() => {
    S.ids.md3 = createRecord('MENDAN', { person_id: id('p3'), employment_id: id('eE3'), ky: quarterOf_(d(-10)), trang_thai: 'hoan_thanh', ngay_thuc_hien: d(-10), staff_id: id('s2'),
      hinh_thuc: 'truc_tiep', noi_dung: 'Va chạm nhỏ với đồng nghiệp; còn lại ổn định (mẫu).' }).id;
    createRecord('MENDAN', { person_id: id('p4'), employment_id: id('eE4'), ky: quarterOf_(d(5)), trang_thai: 'da_dat_lich', ngay_du_kien: d(5), staff_id: id('s4'), hinh_thuc: 'online' });
  });
  add(() => {
    const co3 = (listRecords('EMPLOYMENT').find((e) => e.id === id('eE3')) || {}).company_id || '';
    const v = createRecord('INCIDENT', { person_ids: id('p3'), company_id: co3, ngay_tiep_nhan: d(-10), loai: 'quan_he', tieu_de: 'Va chạm với đồng nghiệp (mẫu)', uu_tien: 'trung_binh',
      phu_trach_staff_id: id('s2'), phoi_hop_staff_id: id('s4'), han_xu_ly: d(2), trang_thai: 'dang_xu_ly', mendan_id: id('md3'), noi_dung: 'Phát hiện khi 定期面談 (mẫu).' });
    createRecord('INCIDENT_LOG', { incident_id: v.id, ngay: d(-9), staff_id: id('s2'), noi_dung: 'Trao đổi với quản lý công ty, hẹn theo dõi 2 tuần (mẫu).' });
    createRecord('INCIDENT', { company_id: co3, ngay_tiep_nhan: d(-3), loai: 'nha_o', tieu_de: 'Sửa điều hòa ký túc xá (mẫu)', uu_tien: 'thap', ngay_lien_he_lai: d(7) });
  });
  // Người giới thiệu: p2 đã trả; p4, p7 để lại trong "cần trả".
  add(() => createRecord('REFERRER_PAYOUT', { person_id: id('p2'), employment_id: id('eE2'), nguoi_nhan: 'Mẫu Người giới thiệu A', so_tien: '30000', ngay_tra: d(-190), ghi_chu: 'Mẫu' }));

  // ---- Doanh số: lập theo gợi ý các khoản đã qua 25 ngày (khoản gần đây để lại cho "Doanh số cần lập"). ----
  // Lập 2 lần: hoàn tiền nghỉ sớm chỉ được gợi ý sau khi khoản phí đã lập.
  const applyOld = () => { const keys = revenueTodo_().filter((r) => r.ngay < d(-25)).map((r) => r.key); if (keys.length) applyRevenueTodo(keys, false); };
  add(() => { freshCall_(); applyOld(); });
  add(() => { freshCall_(); applyOld(); });
  add(() => saveRevenue('', { loai: 'khac', company_id: id('c4'), ngay: d(-50), so_tien: '50000', chia: id('s3') + ':100', ghi_chu: 'Phí tư vấn (mẫu)' }));
  [['', 0, '1500000'], ['', -1, '1200000'], ['', -2, '1200000'], ['s1', 0, '600000'], ['s2', 0, '400000'], ['s3', 0, '600000']].forEach((x) => add(() => {
    saveTarget(x[0] ? id(x[0]) : '', shiftMonth_(M, x[1]), x[2]);
  }));

  // ---- Hóa đơn: c3 đã thu đủ; c2 quá hạn, thu một phần; c1 bản nháp; c4 hủy (các khoản quay về "chưa vào hóa đơn"). ----
  const linesBefore = (co, day) => getUninvoiced(id(co)).filter((r) => r.ngay < day).map((r) => r.id);
  add(() => {
    const ls = linesBefore('c3', shiftMonth_(M, -2) + '-01');
    if (!ls.length) return;
    const c = createInvoice(id('c3'), ls, d(-60), d(-30), 'Hóa đơn mẫu');
    const inv = issueInvoice(c.id, c.sua_luc);
    createRecord('PAYMENT', { invoice_id: inv.id, ngay: d(-35), so_tien: inv.tong, ghi_chu: 'Đã thu đủ (mẫu)' });
  });
  add(() => {
    const ls = linesBefore('c2', shiftMonth_(M, -1) + '-01');
    if (!ls.length) return;
    const c = createInvoice(id('c2'), ls, d(-40), d(-10), 'Hóa đơn mẫu');
    const inv = issueInvoice(c.id, c.sua_luc);
    createRecord('PAYMENT', { invoice_id: inv.id, ngay: d(-12), so_tien: String(Math.min(100000, Number(inv.tong))), ghi_chu: 'Thu một phần (mẫu)' });
  });
  add(() => { const ls = linesBefore('c1', M + '-01'); if (ls.length) createInvoice(id('c1'), ls, T, '', 'Bản nháp mẫu'); });
  add(() => {
    const ls = getUninvoiced(id('c4')).map((r) => r.id);
    if (ls.length) { const inv = createInvoice(id('c4'), ls, d(-5), '', 'Mẫu'); cancelInvoice(inv.id, inv.sua_luc, 'Lập nhầm kỳ (mẫu)'); }
  });

  // ---- Cuối: đơn tạm dừng, nhân viên nghỉ, 1 hồ sơ bị ẩn ----
  const change = (table, key, fn) => { const r = listRecords(table).find((x) => x.id === id(key)); fn(r); };
  add(() => change('JOB_ORDER', 'j7', (r) => updateRecord('JOB_ORDER', r.id, { trang_thai_don: 'tam_dung' }, r.sua_luc)));
  add(() => change('STAFF', 's5', (r) => updateRecord('STAFF', r.id, { trang_thai: 'da_nghi' }, r.sua_luc)));
  add(() => change('PERSON', 'p23', (r) => setHidden('PERSON', r.id, true, r.sua_luc)));
  return tasks;
}
