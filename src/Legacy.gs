// D-079: nhập FILE QUẢN LÝ CŨ (Excel / Sheets) theo đúng mẫu đang dùng:
//  - sheet 会社情報: 法人番号, 法人名, 施設名, 職種, 支援状況, 郵便番号, 会社住所, 地域, 担当者名, 電話番号, メールアドレス, 紹介料（税抜き）, 支援委託料, 注意点, メモ欄
//  - sheet danh sách người lao động: 名義, スタッフ名, 勤務状況, 業種, 生年月日, 国籍, 性別, 受入日（入寮）予定日, 入社日（就労開始日）, 退職日,
//    在留資格, 在留番号, 在留期限, 特2号審査完了日, ALTIMA依頼, 更新回数, 住所, CS部担当, 書類部担当者, 人材担当, メモ, 契, 特定技能2号
// Trình duyệt đọc file (xlsx / csv), gửi từng lô dòng (khóa = tên cột đã chuẩn hóa NFKC, bỏ khoảng trắng). Chỉ chủ (dữ liệu thật).
// Chạy lại an toàn: công ty trùng tên, người trùng 在留番号 / tên + ngày sinh → bỏ qua ("đã có").

const LEGACY_MAX_ROWS_ = 200;
// 勤務状況 → lần vào làm (D-079, chủ dự án chọn theo đề xuất). null = không tạo lần vào làm, chỉ lưu hồ sơ người.
const LEGACY_WORK_STATES_ = {
  '勤務中': { st: 'dang_lam' }, '支援なし': { st: 'dang_lam', ho_tro: 'N' }, '支援なし予定': { st: 'dang_lam' }, '退職予定': { st: 'dang_lam' },
  '退職・再雇用予定': { st: 'dang_lam' }, '入社前': { st: 'cho_vao_lam' }, '退職': { st: 'da_nghi', lyDo: 'その他' }, '失踪': { st: 'da_nghi', lyDo: '失踪' },
  '辞退': null, '海外': null, 'その他': null,
};
// 業種 / 職種 (chữ tự do) → lĩnh vực 特定技能 (tên JA trong danh mục). Thứ tự quan trọng: khớp từ khóa đầu tiên.
const LEGACY_FIELDS_ = [
  [/介護/, '介護'], [/ビル|清掃/, 'ビルクリーニング'], [/食品|飲食料品/, '飲食料品製造業'], [/外食|給食|ラーメン|お好み焼き|飲食店/, '外食業'],
  [/建設|建築|とび|鳶|鉄筋|型枠|解体|土木|土工|コンクリート|左官|防水|配管|塗装|大工|内装|足場|サッシ|タイル|クレーン|舗装|杭|ビケ/, '建設'],
  [/自動車整備/, '自動車整備'], [/運送|ドライバー/, '自動車運送業'], [/宿泊|ホテル/, '宿泊'], [/農業|農園/, '農業'], [/漁業/, '漁業'],
  [/物流|倉庫/, '物流倉庫'], [/製造|溶接|加工/, '工業製品製造業'],
];

const legacyKey_ = (s) => String(s || '').normalize('NFKC').replace(/\s+/g, '');
// Chữ lưu vào app giữ nguyên như file (chỉ bỏ khoảng trắng đầu / cuối); phần cần ĐỌC (ngày, số tiền, trạng thái…) mới chuẩn hóa NFKC (全角 → 半角).
const legacyText_ = (v) => String(v === null || v === undefined ? '' : v).replace(/\r/g, '').trim();
const legacyNfkc_ = (v) => legacyText_(v).normalize('NFKC');
const legacyOneLine_ = (v) => legacyText_(v).replace(/\s*\n\s*/g, ' ');
// Tên công ty để so khớp: bỏ khoảng trắng, loại hình pháp nhân, dấu ngoặc.
const legacyCoKey_ = (s) => legacyKey_(s).replace(/株式会社|有限会社|合同会社|合資会社|社会福祉法人|医療法人(社団)?|一般社団法人|\(株\)|\(有\)|㈱|㈲/g, '')
  .replace(/[()（）「」『』・,、.]/g, '').toUpperCase();

// Ngày trong ô: "2026-05-28" (ô ngày của Excel), "2026/5/28", "2026年5月28日", kèm chữ ("2026/05/28（予定）") → { date, extra }.
function legacyDate_(v) {
  const s = legacyNfkc_(v);
  if (!s) return { date: '', extra: '' };
  const m = /(\d{4})\s*[\/.\-年]\s*(\d{1,2})\s*[\/.\-月]\s*(\d{1,2})\s*日?/.exec(s);
  if (m) {
    const d = m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    if (isDate_(d)) return { date: d, extra: s === m[0] ? '' : legacyText_(v) };
  }
  return { date: '', extra: legacyText_(v) }; // không đọc được → giữ chữ gốc vào ghi chú
}

// Số tiền (Yên): 300000, "300,000", "¥300,000", "月¥15,000" → 300000. Nhiều số / không có số → null.
function legacyYen_(v) {
  if (typeof v === 'number') return Math.round(v);
  const s = legacyNfkc_(v);
  if (!s) return null;
  if (/なし|無/.test(s) && !/\d/.test(s)) return 0;
  const nums = s.replace(/[¥￥円]/g, ' ').match(/\d[\d,]*/g) || [];
  const big = nums.map((x) => Number(x.replace(/,/g, ''))).filter((n) => n >= 1000);
  return big.length === 1 ? big[0] : null;
}

function legacyField_(text) {
  const s = legacyNfkc_(text);
  const hit = LEGACY_FIELDS_.find((x) => x[0].test(s));
  return hit ? hit[1] : '';
}

// 在留資格 (chữ tự do, kèm "（1年目）", "更新中"…) → tư cách lưu trú trong danh mục (tên JA). '' = chưa rõ (vd. đang chờ COE).
function legacyVisa_(text) {
  const s = legacyKey_(text);
  if (!s) return '';
  if (/^(依頼中|先生に依頼中|COE|在留資格認定)/i.test(s)) return '';
  if (/特定技能2|特定技能二|^2号/.test(s)) return '特定技能2号';
  if (/特定技能1|特定技能一|特1|特１/.test(s)) return '特定技能1号';
  if (/特定活動|^特定\d|^特定6/.test(s)) return '特定活動';
  if (/技術・?人文/.test(s)) return '技術・人文知識・国際業務';
  if (/技能実習/.test(s)) return '技能実習';
  if (/留学/.test(s)) return '留学';
  if (/永住/.test(s)) return '永住者';
  if (/定住/.test(s)) return '定住者';
  if (/家族滞在/.test(s)) return '家族滞在';
  if (/配偶者/.test(s)) return '日本人の配偶者等';
  return 'その他';
}

function legacyContext_() {
  freshCall_();
  const lookups = readAll_(openTable_('LOOKUP')).filter((r) => !r.da_an);
  return {
    today: nowJst_().slice(0, 10),
    staff: readAll_(openTable_('STAFF')),
    companies: readAll_(openTable_('COMPANY')),
    lookups: lookups,
    lk: (loai, ja) => (lookups.find((x) => x.loai === loai && x.ten_ja === ja) || {}).id || '',
    newStaff: [], newCompanies: [], newLookups: [],
  };
}

// Tìm hoặc (dry-run: giả) tạo nhân viên theo tên. Tên rút gọn (katakana) giữ nguyên; chủ đổi tên sau trong Cài đặt → Nhân viên.
function legacyStaff_(ctx, name) {
  const n = legacyOneLine_(name);
  if (!n) return '';
  const key = normName_(n);
  const found = ctx.staff.find((s) => normName_(s.ho_ten) === key) || ctx.newStaff.find((s) => normName_(s.ho_ten) === key);
  if (found) return found.id;
  const rec = { id: 'new-staff-' + (ctx.newStaff.length + 1), ho_ten: n.slice(0, 100), trang_thai: 'dang_lam', vai_tro: 'nhan_vien' };
  ctx.newStaff.push(rec);
  return rec.id;
}
const legacyNames_ = (v) => legacyText_(v).split(/[,、;\n]/).map((x) => x.trim()).filter(String);

function legacyFindCompany_(ctx, name, facility, fuzzy) {
  const k = legacyCoKey_(name);
  const f = legacyCoKey_(facility);
  const all = ctx.companies.concat(ctx.newCompanies).filter((c) => !c.da_an);
  if (f) return all.find((c) => legacyCoKey_(c.ten_phap_nhan) === k && legacyCoKey_(c.ten_co_so) === f) || null;
  const exact = all.find((c) => legacyCoKey_(c.ten_co_so) === k) || all.find((c) => legacyCoKey_(c.ten_phap_nhan) === k)
    || all.find((c) => c.ten_viet_tat && legacyCoKey_(c.ten_viet_tat) === k);
  if (exact || !fuzzy || k.length < 3) return exact || null;
  // 名義 thường = tên pháp nhân + tên cơ sở (vd. "〇〇会 特別養護老人ホーム△△") → khớp khi CHỈ MỘT pháp nhân chứa / nằm trong 名義;
  // pháp nhân có nhiều cơ sở → chọn cơ sở có tên nằm trong 名義. Không chắc (nhiều khả năng) → coi như chưa có.
  const cands = all.filter((c) => { const a = legacyCoKey_(c.ten_phap_nhan); return a.length >= 3 && (k.indexOf(a) >= 0 || a.indexOf(k) >= 0); });
  const corp = cands.map((c) => legacyCoKey_(c.ten_phap_nhan)).filter((x, i, arr) => arr.indexOf(x) === i);
  if (corp.length !== 1) return null;
  if (cands.length === 1) return cands[0];
  const byFacility = cands.filter((c) => c.ten_co_so && k.indexOf(legacyCoKey_(c.ten_co_so)) >= 0);
  return byFacility.length === 1 ? byFacility[0] : (cands.find((c) => !c.ten_co_so) || null);
}

// Đảm bảo có mục danh mục (vd. lý do nghỉ 失踪 cho bản đã Khởi tạo trước khi có mục này).
function legacyLookup_(ctx, loai, ja, vi) {
  const id = ctx.lk(loai, ja) || (ctx.newLookups.find((x) => x.loai === loai && x.ten_ja === ja) || {}).id;
  if (id) return id;
  const rec = { id: 'new-lookup-' + (ctx.newLookups.length + 1), loai: loai, ten_vi: vi, ten_ja: ja, tu_ngay: '', den_ngay: '' };
  ctx.newLookups.push(rec);
  return rec.id;
}

// Ghi các mục mới (nhân viên / công ty / danh mục) rồi đổi ID tạm sang ID thật trong các bản ghi đã chuẩn bị.
function legacyCommitRefs_(ctx, recs, fields) {
  const map = {};
  [['STAFF', ctx.newStaff], ['LOOKUP', ctx.newLookups], ['COMPANY', ctx.newCompanies]].forEach((x) => {
    if (!x[1].length) return;
    const tmp = x[1].map((r) => r.id);
    const saved = insertMany_(x[0], openTable_(x[0]), x[1].map((r) => { const o = Object.assign({}, r); delete o.id; return o; }));
    saved.forEach((s, i) => { map[tmp[i]] = s.id; });
  });
  const fix = (v) => splitIds_(v).map((id) => map[id] || id).join(',');
  recs.forEach((r) => fields.forEach((f) => { if (r[f]) r[f] = fix(r[f]); }));
  return map;
}

function legacyNote_(parts) {
  return parts.filter((p) => p && p[1]).map((p) => p[0] + ': ' + legacyOneLine_(p[1])).join('\n').slice(0, 2000);
}

// kind: 'company' | 'worker'. rows: [{ 'tên cột': giá trị }], tối đa 200 dòng / lô. offset: số dòng đã gửi ở lô trước (báo đúng số dòng).
// pending (chỉ khi kiểm tra người lao động): [[法人名, 施設名]] các công ty sheet 会社情報 SẼ tạo — để không báo nhầm "công ty mới".
function importLegacy(kind, rows, dryRun, offset, pending) {
  requireOwner_();
  if (['company', 'worker'].indexOf(kind) < 0) throw new Error('UNKNOWN_TABLE|' + kind);
  const list = Array.isArray(rows) ? rows : [];
  if (list.length > LEGACY_MAX_ROWS_) throw vError_('rows', 'tooMany', { max: LEGACY_MAX_ROWS_ });
  const off = Number(offset) || 0;
  const run = () => {
    const ctx = legacyContext_();
    if (dryRun && Array.isArray(pending)) {
      ctx.companies = ctx.companies.concat(pending.slice(0, 5000).map((c, i) => ({ id: 'pending-' + i, ten_phap_nhan: String(c[0] || ''), ten_co_so: String(c[1] || ''), ten_viet_tat: '' })));
    }
    const out = kind === 'company' ? legacyCompanies_(ctx, list, off, dryRun) : legacyWorkers_(ctx, list, off, dryRun);
    out.newStaff = ctx.newStaff.map((s) => s.ho_ten);
    out.newCompanies = ctx.newCompanies.map((c) => c.ten_phap_nhan + (c.ten_co_so ? ' / ' + c.ten_co_so : ''));
    return out;
  };
  return dryRun ? run() : withLock_(run);
}

const legacyRow_ = (raw) => { const o = {}; Object.keys(raw || {}).forEach((k) => { o[legacyKey_(k)] = raw[k]; }); return o; };
const legacyErr_ = (e) => { const m = /VALIDATION\|(\{.*\})/.exec(e.message); return m ? JSON.parse(m[1]) : { code: 'other', msg: e.message }; };

// ---- 会社情報 → COMPANY (+ 1 người liên hệ, + hợp đồng phí từ đầu tháng này nếu có 紹介料 / 支援委託料) ----
const LEGACY_SUPPORT_STATUS_ = (s) => (/倒産|契約なし|支援なし|・契約なし/.test(s) ? 'ngung'
  : /一時/.test(s) ? 'tam_dung' : /支援(修了|終了)(?!予定)/.test(s) ? 'ngung' : /予定|前/.test(s) && !/修了予定/.test(s) ? 'tiem_nang' : 'dang_giao_dich');

function legacyCompanies_(ctx, list, off, dryRun) {
  const results = [];
  const prepared = [];
  const month1 = ctx.today.slice(0, 7) + '-01';
  list.forEach((raw, i) => {
    const r = legacyRow_(raw);
    const row = i + 1 + off;
    try {
      const name = legacyOneLine_(r['法人名']);
      const facility = legacyOneLine_(r['施設名']);
      if (!name) { results.push({ row: row, ok: true, action: 'skipped' }); return; } // dòng trống / bảng phụ bên cạnh
      if (legacyFindCompany_(ctx, name, facility)) { results.push({ row: row, ok: true, action: 'exists', name: name }); return; }
      const warnings = [];
      const addr = legacyOneLine_(r['会社住所']);
      const postal = (/(\d{3})-?(\d{4})/.exec(legacyNfkc_(r['郵便番号'])) || []);
      const pref = PREFECTURES.find((p) => addr.slice(0, 6).indexOf(p) >= 0) || '';
      const no = legacyKey_(r['法人番号']).replace(/\.0$/, '');
      const job = legacyOneLine_(r['職種']);
      const field = legacyField_(job);
      const status = legacyOneLine_(legacyNfkc_(r['支援状況']));
      const co = { id: 'new-co-' + (ctx.newCompanies.length + 1), ten_phap_nhan: name.slice(0, 200), ten_co_so: facility.slice(0, 200),
        ma_buu_dien: postal[1] ? postal[1] + '-' + postal[2] : '', tinh_thanh: pref, dia_chi: addr.slice(0, 300),
        linh_vuc: field ? ctx.lk('linh_vuc', field) : '', trang_thai: LEGACY_SUPPORT_STATUS_(status), sales_staff_id: '', support_staff_id: '',
        phap_nhan_so: /^\d{13}$/.test(no) ? no : '', nganh_nghe: job.slice(0, 200), ten_viet_tat: '', ten_phien_am: '', dien_thoai: '',
        ghi_chu: legacyNote_([['支援状況', status], ['地域', r['地域']], ['法人番号', /^\d{13}$/.test(no) ? '' : r['法人番号']],
          ['注意点', r['注意点']], ['メモ', r['メモ欄']]]) };
      if (job && !field) warnings.push('field');
      check_(TABLE_RULES.COMPANY, co);
      // Người liên hệ: tên dòng đầu; số điện thoại / email đầu tiên tìm thấy; chữ gốc giữ trong ghi chú.
      const who = legacyText_(r['担当者名']);
      const tel = legacyText_(r['電話番号']);
      const mail = legacyText_(r['メールアドレス']);
      let contact = null;
      if (who || tel || mail) {
        const phone = (/0\d{1,4}-?\d{1,4}-?\d{3,4}/.exec(legacyNfkc_(tel)) || [''])[0];
        const email = (/[^\s@:]+@[^\s@]+\.[^\s@,、]+/.exec(legacyNfkc_(mail)) || [''])[0];
        contact = { company_id: co.id, ho_ten: (who.split('\n')[0] || '(chưa rõ tên)').slice(0, 100), ho_ten_phien_am: '', bo_phan: '', chuc_vu: '',
          so_dien_thoai: PHONE_RE.test(phone) ? phone : '', email: EMAIL_RE.test(email) ? email.slice(0, 254) : '', lien_he_chinh: 'Y',
          ghi_chu: legacyNote_([['担当者名', who.indexOf('\n') >= 0 ? who : ''], ['電話番号', tel !== phone ? tel : ''], ['メール', mail !== email ? mail : '']]) };
        check_(TABLE_RULES.CONTACT, contact);
      }
      // Phí: hợp đồng từ đầu tháng này (D-079: không gợi ý doanh số các tháng trước). Chữ phức tạp → không tạo, báo để nhập tay.
      const fee = legacyYen_(r['紹介料(税抜き)']);
      const sup = legacyYen_(r['支援委託料']);
      if (legacyText_(r['紹介料(税抜き)']) && fee === null) warnings.push('feeText');
      if (legacyText_(r['支援委託料']) && sup === null) warnings.push('supportFeeText');
      let contract = null;
      if ((fee || 0) > 0 || (sup || 0) > 0) {
        contract = { company_id: co.id, tu_ngay: month1, den_ngay: '', phi_gioi_thieu: String(fee || 0), chia_coc: '', phi_ho_tro: String(sup || 0), bac_hoan: '',
          ghi_chu: legacyNote_([['紹介料 (gốc)', typeof r['紹介料(税抜き)'] === 'number' ? '' : r['紹介料(税抜き)']], ['支援委託料 (gốc)', typeof r['支援委託料'] === 'number' ? '' : r['支援委託料']]]) || 'Nhập từ 会社情報' };
        check_(TABLE_RULES.CONTRACT, contract);
      }
      ctx.newCompanies.push(co);
      prepared.push({ row: row, contact: contact, contract: contract });
      results.push({ row: row, ok: true, action: 'created', name: name, facility: facility, warnings: warnings });
    } catch (e) {
      results.push({ row: row, ok: false, error: legacyErr_(e) });
    }
  });
  if (dryRun || !ctx.newCompanies.length) return { results: results, created: dryRun ? ctx.newCompanies.length : 0 };
  const contacts = prepared.map((p) => p.contact).filter((x) => x);
  const contracts = prepared.map((p) => p.contract).filter((x) => x);
  const map = legacyCommitRefs_(ctx, contacts.concat(contracts), ['company_id']);
  if (contacts.length) insertMany_('CONTACT', openTable_('CONTACT'), contacts, true); // công ty mới, chưa có liên hệ chính nào khác
  if (contracts.length) insertMany_('CONTRACT', openTable_('CONTRACT'), contracts);
  return { results: results, created: Object.keys(map).length };
}

// ---- Danh sách người lao động → PERSON (+ số 在留カード ở file nhạy cảm) + lần vào làm theo 勤務状況 ----
function legacyWorkers_(ctx, list, off, dryRun) {
  const people = readAll_(openTable_('PERSON'));
  const docs = readAll_(openTable_('PERSON_SENSITIVE'));
  ctx.emps = readAll_(openTable_('EMPLOYMENT'));
  const results = [];
  const batch = []; // { person, doc, emp }
  const otherId = () => legacyLookup_(ctx, 'ly_do_nghi', 'その他', 'Khác');
  list.forEach((raw, i) => {
    const r = legacyRow_(raw);
    const row = i + 1 + off;
    try {
      const name = legacyOneLine_(legacyNfkc_(r['スタッフ名'])).replace(/\s+/g, ' ');
      if (!name) { results.push({ row: row, ok: true, action: 'skipped' }); return; }
      const warnings = [];
      const status = legacyOneLine_(legacyNfkc_(r['勤務状況']));
      const birth = legacyDate_(r['生年月日']);
      const card = normDoc_(r['在留番号']);
      const cardOk = !!card && DOC_RE.test(card);
      if (card && !cardOk) warnings.push('cardFormat');

      const natText = legacyOneLine_(legacyNfkc_(r['国籍']));
      const nat = natText ? ctx.lk('quoc_tich', natText) : '';
      if (natText && !nat) warnings.push('nationality');
      const visaText = legacyOneLine_(r['在留資格']);
      const visaJa = legacyVisa_(visaText);
      const visa = visaJa ? ctx.lk('tu_cach_luu_tru', visaJa) || ctx.lk('tu_cach_luu_tru', 'その他') : '';
      const fieldJa = legacyField_(r['業種']);
      if (legacyText_(r['業種']) && !fieldJa) warnings.push('field');
      const limit = legacyDate_(r['在留期限']);
      const start = legacyDate_(r['入社日(就労開始日)']);
      const end = legacyDate_(r['退職日']);
      const move = legacyDate_(r['受入日(入寮)予定日']);
      const t2 = legacyDate_(r['特2号審査完了日']);
      const gender = { '男': 'nam', '女': 'nu' }[legacyKey_(r['性別']).replace(/[^男女]/g, '')] || '';
      const cs = legacyNames_(r['CS部担当']).map((n) => legacyStaff_(ctx, n)).join(',');
      const docStaff = legacyNames_(r['書類部担当者']);
      const recruiter = legacyNames_(r['人材担当']);
      const map = Object.prototype.hasOwnProperty.call(LEGACY_WORK_STATES_, status) ? LEGACY_WORK_STATES_[status] : null;
      if (status && !Object.prototype.hasOwnProperty.call(LEGACY_WORK_STATES_, status)) warnings.push('status');
      const holder = legacyOneLine_(r['名義'] !== undefined ? r['名義'] : r['_c0']);
      const addr = legacyOneLine_(r['住所(入社後の住所)'] || r['住所']);
      const person = {
        ho_ten_latin: name.slice(0, 100), ho_ten_katakana: '', ngay_sinh: birth.date, gioi_tinh: gender, quoc_tich: nat,
        noi_o: status === '海外' ? 'nuoc_ngoai' : 'nhat', tu_cach_luu_tru: visa, han_luu_tru: limit.date, han_ho_chieu: '',
        // Đang làm / chờ vào làm: sẵn sàng; đã nghỉ / 辞退 / 海外 / khác: tạm dừng (không nhắc hạn lưu trú cho người đã rời).
        tieng_nhat: '', ky_nang: fieldJa ? ctx.lk('linh_vuc', fieldJa) : '', trang_thai_sang_loc: map && map.st !== 'da_nghi' ? 'san_sang' : 'tam_dung',
        recruiter_staff_id: recruiter.length ? legacyStaff_(ctx, recruiter[0]) : '', nguon: '', so_dien_thoai: '', email: '',
        dia_chi: addr.length > 300 ? addr.slice(0, 299) + '…' : addr, nguoi_gioi_thieu: '', cs_staff_id: cs,
        giay_to_staff_id: docStaff.length ? legacyStaff_(ctx, docStaff[0]) : '',
        ghi_chu: legacyNote_([['メモ', r['メモ']], ['勤務状況 (gốc)', status], ['名義', map ? '' : holder],
          ['在留資格 (gốc)', visaText && visaText !== visaJa ? visaText : ''], ['生年月日 (gốc)', birth.extra], ['国籍 (gốc)', nat ? '' : natText],
          ['在留期限 (gốc)', limit.extra], ['受入日(入寮)予定', move.date || move.extra], ['特2号審査完了日', t2.date || t2.extra],
          ['ALTIMA依頼', r['ALTIMA依頼']], ['更新回数', r['更新回数']], ['書類部担当 (khác)', docStaff.slice(1).join(', ')],
          ['人材担当 (khác)', recruiter.slice(1).join(', ')], ['契', r['契']], ['特定技能2号', r['特定技能2号']]]),
      };
      check_(TABLE_RULES.PERSON, person);
      let emp = null;
      if (map && !holder) warnings.push('noCompany'); // không có 名義 → chỉ lưu hồ sơ người
      if (map && holder) {
        let co = legacyFindCompany_(ctx, holder, '', true);
        if (!co) {
          co = { id: 'new-co-' + (ctx.newCompanies.length + 1), ten_phap_nhan: holder.slice(0, 200), ten_co_so: '', trang_thai: 'dang_giao_dich',
            linh_vuc: person.ky_nang, sales_staff_id: '', support_staff_id: '', ma_buu_dien: '', tinh_thanh: '', dia_chi: '', dien_thoai: '',
            ten_viet_tat: '', ten_phien_am: '', phap_nhan_so: '', nganh_nghe: '', ghi_chu: 'Tạo khi nhập danh sách người lao động (không có trong 会社情報)' };
          ctx.newCompanies.push(co);
          warnings.push('newCompany');
        }
        emp = { person_id: '', company_id: co.id, job_id: '', application_id: '', ngay_vao_lam: start.date, ngay_nghi: '', ly_do_nghi: '',
          tinh_trang: map.st, ho_tro: map.ho_tro || '', ghi_chu: legacyNote_([['勤務状況 (gốc)', status], ['入社日 (gốc)', start.extra], ['退職日 (gốc)', end.extra]]) };
        // Có ngày nghỉ (kể cả 退職予定) → ghi ngày nghỉ + lý do; ngày nghỉ trước ngày vào làm → bỏ ngày nghỉ, giữ chữ gốc.
        if (end.date && !(start.date && end.date < start.date)) {
          emp.ngay_nghi = end.date;
          emp.ly_do_nghi = map.lyDo === '失踪' ? legacyLookup_(ctx, 'ly_do_nghi', '失踪', 'Mất liên lạc') : otherId();
        } else if (end.date) {
          emp.ghi_chu = (emp.ghi_chu + '\n退職日 (gốc): ' + end.date).trim();
          warnings.push('endBeforeStart');
        }
        if (!start.date) warnings.push('noStart');
        if (map.st === 'da_nghi' && !emp.ngay_nghi) warnings.push('noEnd');
        check_(TABLE_RULES.EMPLOYMENT, emp);
      }
      // Đã có người này (trùng số 在留カード; trùng tên + ngày sinh; không có cả hai thì trùng tên + cùng thiếu ngày sinh), kể cả dòng trước trong cùng file:
      // không tạo lại người; nếu dòng này là một lần vào làm khác (công ty / ngày khác) thì thêm lần vào làm cho người đó.
      const key = normName_(name);
      const match = (p, doc) => (cardOk ? !!doc && doc.so_zairyu_card === card : false)
        || (normName_(p.ho_ten_latin) === key && (birth.date ? p.ngay_sinh === birth.date : !cardOk && !p.ngay_sinh && !doc));
      const old = people.find((p) => match(p, docs.find((d) => d.person_id === p.id)));
      const inBatch = old ? -1 : batch.findIndex((b) => b.person && match(b.person, b.doc));
      const empKey = (e) => [e.company_id, e.ngay_vao_lam, e.ngay_nghi].join('|');
      const st = emp ? empState_(emp, ctx.today) : '';
      if (old || inBatch >= 0) {
        const dupEmp = emp && (old ? ctx.emps.some((e) => !e.da_an && e.person_id === old.id && empKey(e) === empKey(emp))
          : batch.some((b) => b.emp && (b.ref === inBatch || b === batch[inBatch]) && empKey(b.emp) === empKey(emp)));
        if (!emp || dupEmp) { results.push({ row: row, ok: true, action: 'exists', ma: old ? old.ma : '' }); return; }
        batch.push({ row: row, person: null, personId: old ? old.id : '', ref: inBatch, doc: null, emp: emp });
        results.push({ row: row, ok: true, action: 'addedEmployment', ma: old ? old.ma : '', warnings: warnings, emp: st });
        return;
      }
      batch.push({ row: row, person: person, doc: cardOk ? { person_id: '', so_ho_chieu: '', so_zairyu_card: card } : null, emp: emp });
      results.push({ row: row, ok: true, action: 'created', warnings: warnings, emp: st });
    } catch (e) {
      results.push({ row: row, ok: false, error: legacyErr_(e) });
    }
  });
  const newPeople = batch.filter((b) => b.person);
  if (dryRun || !batch.length) return { results: results, created: dryRun ? newPeople.length : 0 };
  const persons = newPeople.map((b) => b.person);
  const emps = batch.map((b) => b.emp).filter((x) => x);
  legacyCommitRefs_(ctx, persons.concat(emps), ['recruiter_staff_id', 'cs_staff_id', 'giay_to_staff_id', 'company_id', 'ly_do_nghi']);
  const saved = persons.length ? insertMany_('PERSON', openTable_('PERSON'), persons) : [];
  saved.forEach((p, k) => {
    const b = newPeople[k];
    b.personId = p.id;
    if (b.doc) b.doc.person_id = p.id;
    results.find((x) => x.row === b.row).ma = p.ma;
  });
  batch.forEach((b) => {
    if (!b.emp) return;
    const owner = b.person ? b : b.ref >= 0 ? batch[b.ref] : b;
    b.emp.person_id = owner.personId;
    if (!b.person && b.ref >= 0) results.find((x) => x.row === b.row).ma = (saved[newPeople.indexOf(owner)] || {}).ma || '';
  });
  const docRows = batch.map((b) => b.doc).filter((x) => x);
  if (docRows.length) insertMany_('PERSON_SENSITIVE', openTable_('PERSON_SENSITIVE'), docRows);
  if (emps.length) insertMany_('EMPLOYMENT', openTable_('EMPLOYMENT'), emps);
  return { results: results, created: saved.length, addedEmployment: batch.filter((b) => !b.person).length };
}
