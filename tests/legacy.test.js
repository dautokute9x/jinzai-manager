// D-079: đọc file Excel trong trình duyệt (XlsxUi) + nhập file quản lý cũ (Legacy.gs) — dùng file GIẢ tests/fixtures/legacy_fake.xlsx.
// Chạy: node tests/legacy.test.js   (tạo lại file giả: python3 tests/fixtures/make_legacy_fake.py)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { makeGoogle, load, eq } = require('./fakes');

const ui = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8').replace(/<\/?script>/g, '');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
const w = dom.window;
w.DecompressionStream = globalThis.DecompressionStream;
w.TextDecoder = globalThis.TextDecoder;
w.eval(ui('XlsxUi.html'));
w.eval(ui('LegacyUi.html'));

(async () => {
  // ---- 1. Bộ đọc xlsx ----
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy_fake.xlsx'));
  const sheets = await w.readXlsx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  eq(sheets.map((s) => s.name), ['2025年1月24日のデータ', '会社情報（NEW)']);
  const ws = sheets[0].rows;
  eq([ws[0][0], ws[3][1], ws[3][6], ws[4][4], ws[4][8], ws[6][8], ws[4][13]], ['名義', 'スタッフ名', '\n性別', '1998-04-01', '2024-04-01', '2023/05/01（予定）', '300']);
  eq(ws[4][17], '〒100-0001\n 東京都千代田区サンプル1-1', 'giữ xuống dòng trong ô');
  const cs = sheets[1].rows;
  eq([cs[4][0], cs[5][0], cs[4][1], cs[5][1], cs[5][2]], ['1234567890123', '1234567890123', '社会福祉法人サンプル会', '社会福祉法人サンプル会', '特別養護老人ホームあおば'], 'ô gộp → điền cả vùng');
  eq(cs[6][1], '株式会社サンプル建設', 'chuỗi dùng chung, bỏ phiên âm rPh');
  // Nhận sheet theo tên cột; ô tiêu đề trống lấy chữ phía trên (名義), bỏ ô dạng "合計: 6".
  const wk = w.legacyFind(sheets[0], ['スタッフ名', '勤務状況']);
  const co = w.legacyFind(sheets[1], ['法人名']);
  eq([wk.rows.length, wk.lines[0], Object.keys(wk.rows[0])[0], co.rows.length, co.lines], [7, 5, '名義', 3, [5, 6, 7]]);
  assert('性別' in wk.rows[0] && '受入日(入寮)予定日' in wk.rows[4] && '紹介料(税抜き)' in co.rows[0], 'tiêu đề chuẩn hóa NFKC, bỏ khoảng trắng');

  // ---- 2. Nhập trên máy giả lập ----
  const g = makeGoogle();
  const app = load(g, ['Code.gs', 'Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs', 'Import.gs', 'Export.gs', 'Auth.gs', 'Legacy.gs']);
  g.clock.now = '2026-10-21 10:00:00';
  app.initTestData();
  const plain = (x) => JSON.parse(JSON.stringify(x));
  const companyRows = plain(co.rows); const workerRows = plain(wk.rows);
  g.session.active = '';
  assert.throws(() => app.importLegacy('company', companyRows, true), /FORBIDDEN/, 'chỉ chủ');
  g.session.active = 'owner@example.test';
  assert.throws(() => app.importLegacy('khac', [], true), /UNKNOWN_TABLE/);
  assert.throws(() => app.importLegacy('worker', new Array(201).fill({}), true), /"code":"tooMany"/);
  const n = (t) => app.listRecords(t).length;

  // Kiểm tra trước: không ghi gì.
  const dc = app.importLegacy('company', companyRows, true);
  const dw0 = app.importLegacy('worker', workerRows, true);
  const dw = app.importLegacy('worker', workerRows, true, 0, dc.results.filter((r) => r.action === 'created').map((r) => [r.name, r.facility]));
  eq([dc.created, dw.created, n('COMPANY'), n('PERSON'), n('STAFF')], [3, 6, 0, 0, 0]);
  eq([dw0.newCompanies.length, dw.newCompanies], [3, ['サンプル外食（未登録）']], 'kiểm tra tính cả công ty sheet 会社情報 sẽ tạo');
  eq(dw.newStaff.sort(), ['ギア', 'ギアスリー', 'ギアツー', 'ギアフォー', 'テスト']);

  // Nhập công ty.
  const rc = app.importLegacy('company', companyRows, false);
  eq(rc.results.map((r) => r.action), ['created', 'created', 'created']);
  eq(rc.results[2].warnings, ['feeText']);
  const cos = app.listRecords('COMPANY');
  const midori = cos.find((c) => c.ten_co_so === '特別養護老人ホームみどり');
  const kensetsu = cos.find((c) => c.ten_phap_nhan === '株式会社サンプル建設');
  eq([midori.phap_nhan_so, midori.ma_buu_dien, midori.tinh_thanh, midori.trang_thai, kensetsu.trang_thai, kensetsu.nganh_nghe],
    ['1234567890123', '100-0001', '東京都', 'dang_giao_dich', 'ngung', '建設（とび）']);
  assert(/支援状況: 支援修了/.test(kensetsu.ghi_chu) && /注意点: 注意（偽）/.test(kensetsu.ghi_chu));
  const ct = app.listRecords('CONTACT').find((c) => c.company_id === midori.id);
  eq([ct.ho_ten, ct.so_dien_thoai, ct.email, ct.lien_he_chinh], ['山田 花子（偽）', '03-0000-0001', 'gia1@example.com', 'Y']);
  const ctr = app.listRecords('CONTRACT');
  eq(ctr.map((c) => [c.tu_ngay, c.phi_gioi_thieu, c.phi_ho_tro]).sort(), [['2026-10-01', '0', '15000'], ['2026-10-01', '0', '15000'], ['2026-10-01', '300000', '18000']]);
  assert(/カテゴリA/.test(ctr.find((c) => c.company_id === kensetsu.id).ghi_chu), 'phí dạng chữ giữ trong ghi chú hợp đồng');

  // Nhập người lao động.
  const rw = app.importLegacy('worker', workerRows, false);
  eq(rw.results.map((r) => r.action), ['created', 'created', 'created', 'created', 'created', 'created', 'addedEmployment']);
  eq(rw.results.map((r) => r.emp), ['dang_lam', 'dang_lam', 'da_nghi', 'da_nghi', 'cho_vao_lam', '', 'dang_lam']);
  eq([rw.results[2].warnings, rw.results[4].warnings], [['noEnd'], ['newCompany', 'noStart']]);
  eq([n('STAFF'), n('COMPANY'), n('PERSON'), n('EMPLOYMENT')], [5, 4, 6, 6]);
  const ppl = app.listRecords('PERSON');
  const P = (name) => ppl.find((p) => p.ho_ten_latin === name);
  const L = (loai, ja) => app.listRecords('LOOKUP').find((x) => x.loai === loai && x.ten_ja === ja).id;
  const S = (name) => app.listRecords('STAFF').find((s) => s.ho_ten === name).id;
  const mot = P('GIA VAN MOT');
  eq([mot.ngay_sinh, mot.quoc_tich, mot.gioi_tinh, mot.tu_cach_luu_tru, mot.han_luu_tru, mot.ky_nang, mot.recruiter_staff_id, mot.cs_staff_id, mot.giay_to_staff_id, mot.trang_thai_sang_loc],
    ['1998-04-01', L('quoc_tich', 'ベトナム'), 'nam', L('tu_cach_luu_tru', '特定技能1号'), '2026-12-01', L('linh_vuc', '介護'), S('ギアスリー'), S('ギア'), S('テスト'), 'san_sang']);
  eq(mot.dia_chi, '〒100-0001 東京都千代田区サンプル1-1');
  assert(/在留資格 \(gốc\): 特定技能1号（2年目）/.test(mot.ghi_chu) && /ALTIMA依頼: 有/.test(mot.ghi_chu) && /メモ: メモ（偽）/.test(mot.ghi_chu));
  eq(app.getPersonDocs(mot.id, true).so_zairyu_card, 'ZZ00000001AA');
  const hai = P('GIA THI HAI');
  eq([hai.tu_cach_luu_tru, hai.cs_staff_id.split(',').length], [L('tu_cach_luu_tru', '特定技能2号'), 2]);
  const bon = P('GIA VAN BON');
  eq([bon.ngay_sinh, app.getPersonDocs(bon.id, true).so_zairyu_card], ['', 'ZZ00000004AA']);
  assert(/生年月日 \(gốc\): 無/.test(bon.ghi_chu));
  const sau = P('GIA VAN SAU');
  eq(sau.trang_thai_sang_loc, 'tam_dung');
  assert(/名義: 株式会社サンプル建設/.test(sau.ghi_chu), '辞退: không có lần vào làm, giữ 名義 trong ghi chú');
  const emps = app.listRecords('EMPLOYMENT');
  const E = (p, coId) => emps.find((e) => e.person_id === p.id && (!coId || e.company_id === coId));
  eq([E(mot, midori.id).ngay_vao_lam, E(mot, midori.id).tinh_trang, E(mot, kensetsu.id).ngay_vao_lam], ['2024-04-01', 'dang_lam', '2026-10-05']);
  eq([E(hai).ho_tro, E(hai).company_id], ['N', kensetsu.id]);
  const ba = E(P('GIA VAN BA'));
  eq([ba.ngay_vao_lam, ba.ngay_nghi, ba.tinh_trang], ['2023-05-01', '', 'da_nghi']);
  assert(/入社日 \(gốc\): 2023\/05\/01（予定）/.test(ba.ghi_chu));
  const bonE = E(bon);
  eq([bonE.ngay_nghi, bonE.ly_do_nghi], ['2024-03-01', L('ly_do_nghi', '失踪')]);
  const nam = P('GIA THI NAM');
  const namE = E(nam);
  eq([namE.ngay_vao_lam, namE.tinh_trang, app.listRecords('COMPANY').find((c) => c.id === namE.company_id).ten_phap_nhan, nam.tu_cach_luu_tru],
    ['', 'cho_vao_lam', 'サンプル外食（未登録）', '']);
  assert(/受入日\(入寮\)予定: 2026\/11月予定/.test(nam.ghi_chu));
  // Số 在留カード chỉ ở file nhạy cảm, không vào nhật ký.
  const data = Object.values(g.items).find((x) => x.name === 'HR_DATA_TEST');
  assert(!JSON.stringify(data.getSheetByName('AUDIT_LOG').rows).includes('ZZ00000001AA'));
  assert(!JSON.stringify(data.getSheetByName('PERSON').rows).includes('ZZ00000001AA'));

  // Nhập lại: không tạo trùng.
  eq(app.importLegacy('company', companyRows, false).results.map((r) => r.action), ['exists', 'exists', 'exists']);
  eq(app.importLegacy('worker', workerRows, false).results.map((r) => r.action), new Array(7).fill('exists'));
  eq([n('STAFF'), n('COMPANY'), n('PERSON'), n('EMPLOYMENT'), n('CONTRACT')], [5, 4, 6, 6, 3]);

  // ---- 3. Ảnh hưởng tới các màn hình ----
  const wkg = app.getWorking({});
  eq(wkg.rows.map((r) => [r.person, r.state, r.ho_tro]).sort(), [['GIA THI HAI', 'dang_lam', 'N'], ['GIA THI NAM', 'cho_vao_lam', ''], ['GIA VAN MOT', 'dang_lam', ''], ['GIA VAN MOT', 'dang_lam', '']]);
  const motRow = wkg.rows.find((r) => r.person === 'GIA VAN MOT' && r.company_id === midori.id);
  eq([motRow.support, motRow.next_support, motRow.job, motRow.support_warn], ['ギア', '2026-12-31', '', false], 'CS của người; 定期面談 theo quý, tính từ quý nhập — không báo quá hạn hàng loạt');
  eq(wkg.rows.find((r) => r.person === 'GIA THI HAI').next_support, '');
  const rules = app.getTasks({}).tasks.map((t) => t.rule);
  eq([rules.filter((r) => r === 'visa_expiry').length, rules.filter((r) => r === 'support_due').length, rules.filter((r) => r === 'todokede').length], [1, 0, 0]);
  const todo = app.getRevenueTodo();
  eq(todo.map((r) => [r.loai, r.thang, r.so_tien, r.company]).sort(), [['ho_tro', '2026-10', '15000', '株式会社サンプル建設'], ['ho_tro', '2026-10', '18000', '社会福祉法人サンプル会']]);
  eq(todo.find((r) => r.so_tien === '18000').chia, S('ギア') + ':100', 'phí hỗ trợ chia cho CS của người');
  eq(app.getDashboard({}).lifecycle, { dang_lam: 2, cho_vao_lam: 1, dang_ung_tuyen: 0, da_nghi: 2, khac: 1 });

  // ---- 4. Sửa dữ liệu đã nhập ----
  const ne = app.updateEmployment(namE.id, { ngay_vao_lam: '2026-11-10' }, namE.sua_luc);
  eq(ne.ngay_vao_lam, '2026-11-10');
  g.clock.now = '2026-10-21 10:05:00';
  eq(app.updateEmployment(ne.id, { ngay_vao_lam: '2027-01-01', ho_tro: 'N' }, ne.sua_luc).ngay_vao_lam, '2026-11-10', 'ngày đã có thì không đổi ở đây');
  assert.throws(() => app.updateEmployment(ne.id, { ho_tro: 'X' }, app.listRecords('EMPLOYMENT').find((e) => e.id === ne.id).sua_luc), /"code":"invalidChoice"/);
  const baE = app.endEmployment(ba.id, { ngay_nghi: '2024-01-31', ly_do_nghi: L('ly_do_nghi', 'その他') }, ba.sua_luc);
  eq(baE.ngay_nghi, '2024-01-31', 'bổ sung ngày nghỉ cho người "đã nghỉ, không rõ ngày"');
  // Hồ sơ cũ thiếu ngày sinh vẫn sửa được; thêm mới vẫn bắt buộc ngày sinh.
  assert(app.savePerson(bon.id, { ghi_chu: 'Đã bổ sung (giả)' }, bon.sua_luc, false).person);
  assert.throws(() => app.savePerson('', { ho_ten_latin: 'MOI GIA', quoc_tich: L('quoc_tich', 'ベトナム') }), /"field":"ngay_sinh","code":"required"/);
  // startEmployment: lần vào làm "đã nghỉ, không rõ ngày" không chặn vào làm mới.
  eq(app.empState_({ tinh_trang: 'da_nghi', ngay_vao_lam: '2023-01-01', ngay_nghi: '' }, '2026-10-21'), 'da_nghi');
  eq(app.empState_({ tinh_trang: 'dang_lam', ngay_vao_lam: '', ngay_nghi: '' }, '2026-10-21'), 'dang_lam');
  eq(app.empState_({ tinh_trang: 'cho_vao_lam', ngay_vao_lam: '2026-10-01', ngay_nghi: '' }, '2026-10-21'), 'dang_lam', 'có ngày thì theo ngày');

  // Hàm phụ
  eq([app.legacyYen_('月¥15,000'), app.legacyYen_(300000), app.legacyYen_('カテゴリA 300,000円 カテゴリB 200,000円'), app.legacyYen_('支援委託月額なし')], [15000, 300000, null, 0]);
  eq([app.legacyVisa_('特定技能１号（２年目）'), app.legacyVisa_('依頼中（1号変更）'), app.legacyVisa_('技術・人文知識・国際業務'), app.legacyVisa_('介護ビザ')], ['特定技能1号', '', '技術・人文知識・国際業務', 'その他']);
  eq([app.legacyField_('建設\n（鉄筋継ぎ手・圧接）'), app.legacyField_('外食 - 給食'), app.legacyField_('（製造業）溶接'), app.legacyField_('協同組合')], ['建設', '外食業', '工業製品製造業', '']);
  eq(app.legacyDate_('2026年5月28日（予定）'), { date: '2026-05-28', extra: '2026年5月28日（予定）' });
  console.log('OK — kiểm tra đọc Excel + nhập file quản lý cũ (D-079) đạt');
})().catch((e) => { console.error(e); process.exit(1); });
