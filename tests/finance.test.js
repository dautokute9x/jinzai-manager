// Kiểm tra GĐ 5 (hợp đồng phí, doanh số, mục tiêu) và GĐ 8 (hóa đơn, 入金, người giới thiệu) — Finance.gs, dữ liệu giả.
// Chạy: node tests/finance.test.js
const assert = require('assert');
const { makeGoogle, load, eq } = require('./fakes');

const g = makeGoogle();
const app = load(g, ['Schema.gs', 'Setup.gs', 'Repo.gs', 'Backup.gs', 'Person.gs', 'Application.gs', 'Visa.gs', 'Dashboard.gs', 'Finance.gs']);
app.initTestData();
g.clock.now = '2026-10-01 09:00:00';
const vErr = (fn, field, code) => assert.throws(fn, (e) => { const m = /VALIDATION\|(\{.*\})/.exec(e.message); const v = m && JSON.parse(m[1]); return v && v.field === field && v.code === code; });
const vn = app.listRecords('LOOKUP').find((x) => x.loai === 'quoc_tich' && x.ten_ja === 'ベトナム');
const R = app.createRecord('STAFF', { ho_ten: 'Recruiter Gia' });
const S = app.createRecord('STAFF', { ho_ten: 'Sales Gia' });
const H = app.createRecord('STAFF', { ho_ten: 'Ho Tro Gia' });
const H2 = app.createRecord('STAFF', { ho_ten: 'Ho Tro Gia 2' });
const co = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả Phí', sales_staff_id: S.id, support_staff_id: H.id + ',' + H2.id });
const co2 = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả Cọc', sales_staff_id: S.id });
const job = app.createRecord('JOB_ORDER', { company_id: co.id, vi_tri: 'Đơn phí', so_luong_can: '5' });
const job2 = app.createRecord('JOB_ORDER', { company_id: co2.id, vi_tri: 'Đơn cọc', so_luong_can: '5' });
const person = (name, extra) => app.savePerson('', Object.assign({ ho_ten_latin: name, ngay_sinh: '2000-01-01', quoc_tich: vn.id, trang_thai_sang_loc: 'san_sang', recruiter_staff_id: R.id }, extra)).person;

// ---- 5.1 Cài đặt tài chính ----
const f0 = app.getFinanceSettings();
eq([f0.tax, f0.split_recruiter, f0.referrer_amount, f0.due_days, f0.sua_luc], [10, 50, 0, 30, '']);
vErr(() => app.saveFinanceSettings({ tax: 50 }, ''), 'tax', 'range');
vErr(() => app.saveFinanceSettings({ issuer_tno: 'T123' }, ''), 'issuer_tno', 'invalidFormat');
const f1 = app.saveFinanceSettings({ tax: 10, split_recruiter: 60, referrer_amount: 30000, due_days: 30, issuer_name: '株式会社ギア（テスト）', issuer_tno: 'T1234567890123', bank: 'Ngân hàng giả' }, '');
eq([f1.split_recruiter, f1.referrer_amount, f1.issuer_tno], [60, 30000, 'T1234567890123']);
assert.throws(() => app.saveFinanceSettings({}, ''), /CONFLICT/);

// ---- 5.1 Hợp đồng ----
eq(app.parseTiers_('30:100, 90:50'), [{ days: 30, pct: 100 }, { days: 90, pct: 50 }]);
eq([app.parseTiers_(''), app.parseTiers_('90:50,30:100'), app.parseTiers_('30:120'), app.parseTiers_('abc')], [[], null, null, null]);
eq([app.parseSplit_('a:60,b:40'), app.parseSplit_('a:60,b:30'), app.parseSplit_('a:50,a:50'), app.parseSplit_('')], [[{ id: 'a', pct: 60 }, { id: 'b', pct: 40 }], null, null, []]);
vErr(() => app.createRecord('CONTRACT', { company_id: co.id, tu_ngay: '2026-01-01' }), 'phi_gioi_thieu', 'required');
vErr(() => app.createRecord('CONTRACT', { company_id: co.id, tu_ngay: '2026-01-01', phi_gioi_thieu: '30万' }), 'phi_gioi_thieu', 'yen');
vErr(() => app.createRecord('CONTRACT', { company_id: co.id, tu_ngay: '2026-01-01', phi_gioi_thieu: '300000', bac_hoan: '90:50,30:100' }), 'bac_hoan', 'refundTiers');
vErr(() => app.createRecord('CONTRACT', { company_id: co.id, tu_ngay: '2026-05-01', den_ngay: '2026-04-01', phi_gioi_thieu: '1' }), 'den_ngay', 'afterStart');
app.createRecord('CONTRACT', { company_id: co.id, tu_ngay: '2025-01-01', den_ngay: '2025-12-31', phi_gioi_thieu: '100000', phi_ho_tro: '15000' });
const hd = app.createRecord('CONTRACT', { company_id: co.id, tu_ngay: '2026-01-01', phi_gioi_thieu: '300000', phi_ho_tro: '20000', bac_hoan: '30:100,90:50' });
eq([hd.ma, hd.chia_coc], ['HD-0002', '']);
app.createRecord('CONTRACT', { company_id: co2.id, tu_ngay: '2026-01-01', phi_gioi_thieu: '200001', chia_coc: 'Y' });

// ---- 5.2 Doanh số cần lập ----
const p1 = person('Phi Mot');
const a1 = app.createApplication({ person_id: p1.id, job_id: job.id, ngay_gui: '2026-09-01', recruiter_staff_id: R.id });
app.startEmployment(a1.id, '2026-10-15', a1.sua_luc);
eq(app.getRevenueTodo(), [], 'chưa tới ngày vào làm → chưa phát sinh');
g.clock.now = '2026-11-20 09:00:00';
const todo1 = app.getRevenueTodo();
eq(todo1.map((r) => [r.loai, r.ngay, r.thang, r.so_tien, r.chia, r.contract, r.person, r.company]), [
  ['ho_tro', '2026-10-01', '2026-10', '20000', H.id + ':50,' + H2.id + ':50', 'HD-0002', 'Phi Mot', 'Công ty Giả Phí'],
  ['gioi_thieu', '2026-10-15', '', '300000', R.id + ':60,' + S.id + ':40', 'HD-0002', 'Phi Mot', 'Công ty Giả Phí'],
  ['ho_tro', '2026-11-01', '2026-11', '20000', H.id + ':50,' + H2.id + ':50', 'HD-0002', 'Phi Mot', 'Công ty Giả Phí']]);
// Lập 1 khoản (sửa số tiền trước khi lập), bỏ qua 1 khoản, gợi ý đổi giữa chừng → CONFLICT.
const kGt = todo1[1].key; const kHt10 = todo1[0].key; const kHt11 = todo1[2].key;
const made = app.applyRevenueTodo([kGt], false, { [kGt]: { so_tien: '310000', ghi_chu: 'Phí giả có phụ thu' } });
eq([made[0].ma, made[0].loai, made[0].so_tien, made[0].invoice_id, made[0].bo_qua], ['DS-0001', 'gioi_thieu', '310000', '', '']);
assert.throws(() => app.applyRevenueTodo([kGt], false), /CONFLICT/, 'đã lập rồi');
vErr(() => app.applyRevenueTodo([kHt10], false, { [kHt10]: { chia: 'khong-co:100' } }), 'chia', 'split');
app.applyRevenueTodo([kHt10], true);
eq(app.getRevenueTodo().map((r) => r.key), [kHt11], 'đã lập / đã bỏ qua thì không gợi ý lại');
// Ẩn khoản đã bỏ qua → gợi ý quay lại.
const skipped = app.listRecords('REVENUE').find((r) => r.bo_qua === 'Y');
eq([skipped.so_tien, skipped.chia], ['0', '']);
app.setRevenueHidden(skipped.id, true, skipped.sua_luc);
eq(app.getRevenueTodo().map((r) => r.key), [kHt10, kHt11]);
app.applyRevenueTodo([], false); // lập tất cả
eq(app.getRevenueTodo(), []);
assert.throws(() => app.createRecord('REVENUE', { loai: 'khac', company_id: co.id, ngay: '2026-11-01', so_tien: '1' }), /UNKNOWN_TABLE/);
assert.throws(() => app.setHidden('REVENUE', skipped.id, false, ''), /UNKNOWN_TABLE/);

// Nghỉ sớm (26 ngày) → hoàn 100% phí đã lập; tháng nghỉ vẫn tính phí hỗ trợ (đã lập).
const emp1 = app.listRecords('EMPLOYMENT').find((e) => e.person_id === p1.id);
app.endEmployment(emp1.id, { ngay_nghi: '2026-11-10', ly_do_nghi: app.listRecords('LOOKUP').find((x) => x.loai === 'ly_do_nghi').id }, emp1.sua_luc);
const todo2 = app.getRevenueTodo();
eq(todo2.map((r) => [r.loai, r.ngay, r.so_tien, r.days, r.pct]), [['hoan', '2026-11-10', '-310000', 26, 100]]);
app.applyRevenueTodo([todo2[0].key], false);

// Hợp đồng chia cọc: 1/2 khi 内定承諾 (làm tròn xuống), phần còn lại khi vào làm.
const p2 = person('Coc Hai');
const a2 = app.createApplication({ person_id: p2.id, job_id: job2.id, ngay_gui: '2026-11-01', recruiter_staff_id: R.id });
const a2b = app.addApplicationStatus(a2.id, 'naitei_shodaku', '2026-11-05', '', a2.sua_luc);
eq(app.getRevenueTodo().map((r) => [r.loai, r.ngay, r.so_tien, r.chia]), [['coc', '2026-11-05', '100000', R.id + ':60,' + S.id + ':40']]);
app.applyRevenueTodo([], false);
app.startEmployment(a2.id, '2026-11-18', a2b.sua_luc);
eq(app.getRevenueTodo().map((r) => [r.loai, r.ngay, r.so_tien]), [['con_lai', '2026-11-18', '100001']]);
app.applyRevenueTodo([], false);

// Khoản tay + sửa; khoản sai.
vErr(() => app.saveRevenue('', { loai: 'khac', company_id: co.id, ngay: '2026-11-03', so_tien: 'abc' }), 'so_tien', 'yen');
vErr(() => app.saveRevenue('', { loai: 'hoan', company_id: co.id, ngay: '2026-11-03', so_tien: '500' }), 'so_tien', 'refundNegative');
vErr(() => app.saveRevenue('', { loai: 'khac', company_id: 'x', ngay: '2026-11-03', so_tien: '500' }), 'company_id', 'invalidChoice');
vErr(() => app.saveRevenue('', { loai: 'khac', company_id: co.id, ngay: '2026-11-03', so_tien: '500', chia: S.id + ':50' }), 'chia', 'split');
const kh = app.saveRevenue('', { loai: 'khac', company_id: co.id, ngay: '2026-11-03', so_tien: '50000', chia: S.id + ':100', ghi_chu: 'Phí dịch vụ giả' });
g.clock.now = '2026-11-20 09:00:05';
const kh2 = app.saveRevenue(kh.id, { so_tien: '55000', loai: 'gioi_thieu', company_id: co2.id }, kh.sua_luc);
eq([kh2.so_tien, kh2.loai, kh2.company_id], ['55000', 'khac', co.id], 'không đổi loại / công ty');
assert.throws(() => app.saveRevenue(kh.id, { so_tien: '1' }, kh.sua_luc), /CONFLICT/);

// ---- 5.3 Mục tiêu + báo cáo ----
vErr(() => app.saveTarget(S.id, '2026-13', '1'), 'thang', 'invalidFormat');
vErr(() => app.saveTarget('khong-co', '2026-11', '1'), 'staff_id', 'invalidChoice');
app.saveTarget('', '2026-11', '500000');
app.saveTarget(R.id, '2026-11', '200000');
const t2 = app.saveTarget(R.id, '2026-11', '250000');
assert.strictEqual(app.listRecords('TARGET').length, 2, 'lưu lại cùng tháng = sửa, không thêm dòng');
assert.strictEqual(t2.so_tien, '250000');
const sales = app.getSales({ month: '2026-11' });
// Tháng 11: hỗ trợ 20000 (H/H2), hoàn -310000 (R60/S40), cọc 100000 (R60/S40), còn lại 100001 (R60/S40), khác 55000 (S).
eq([sales.total, sales.target, sales.byType.ho_tro, sales.byType.hoan, sales.byType.coc, sales.byType.con_lai, sales.byType.khac],
  [20000 - 310000 + 100000 + 100001 + 55000, 500000, 20000, -310000, 100000, 100001, 55000]);
const st = (id) => sales.staff.find((x) => x.id === id);
eq([st(R.id).actual, st(R.id).target, st(S.id).actual, st(H.id).actual, st(H2.id).actual],
  [Math.round((-310000 + 100000 + 100001) * 0.6), 250000, Math.round((-310000 + 100000 + 100001) * 0.4 + 55000), 10000, 10000]);
eq(sales.series.map((x) => x.month).slice(-2), ['2026-10', '2026-11']);
eq(sales.series.slice(-2).map((x) => x.total), [20000 + 310000, sales.total]);
assert.strictEqual(sales.items.length, 5);
assert.strictEqual(sales.items[0].person, 'Phi Mot');

// ---- GĐ 8: hóa đơn ----
g.clock.now = '2026-11-25 10:00:00';
const un = app.getUninvoiced(co.id);
// co: giới thiệu 310000 (10-15), hỗ trợ 10 (20000, lập lại sau khi bỏ qua bị ẩn), hỗ trợ 11 (20000), hoàn -310000, khác 55000.
eq(un.map((r) => [r.loai, r.so_tien]), [['ho_tro', '20000'], ['gioi_thieu', '310000'], ['ho_tro', '20000'], ['khac', '55000'], ['hoan', '-310000']]);
vErr(() => app.createInvoice(co.id, [], '2026-11-25'), 'lines', 'required');
assert.throws(() => app.createInvoice(co2.id, [un[0].id], '2026-11-25'), /CONFLICT/, 'khoản của công ty khác');
vErr(() => app.createInvoice(co.id, [un[0].id], '2026-11-25', '2026-11-01'), 'han_tt', 'afterIssue');
const inv = app.createInvoice(co.id, [un[1].id, un[0].id], '2026-11-25');
eq([inv.ma, inv.trang_thai, inv.han_tt, inv.thue_suat], ['INV-0001', 'nhap', '2026-12-25', '10']);
assert.throws(() => app.createInvoice(co.id, [un[0].id], '2026-11-25'), /CONFLICT/, 'đã vào hóa đơn khác');
vErr(() => app.saveRevenue(un[0].id, { so_tien: '1' }, app.listRecords('REVENUE').find((r) => r.id === un[0].id).sua_luc), 'so_tien', 'invoiced');
vErr(() => app.setRevenueHidden(un[0].id, true, app.listRecords('REVENUE').find((r) => r.id === un[0].id).sua_luc), 'so_tien', 'invoiced');
const v0 = app.listInvoices()[0];
eq([v0.state, v0.preview_base, v0.total, v0.lines, v0.company], ['nhap', 330000, 363000, 2, 'Công ty Giả Phí']);
// Không ghi 入金 cho hóa đơn nháp.
vErr(() => app.createRecord('PAYMENT', { invoice_id: inv.id, ngay: '2026-11-30', so_tien: '100' }), 'invoice_id', 'invalidChoice');
const iss = app.issueInvoice(inv.id, inv.sua_luc);
eq([iss.trang_thai, iss.tien_chua_thue, iss.tien_thue, iss.tong], ['da_phat_hanh', '330000', '33000', '363000']);
vErr(() => app.issueInvoice(inv.id, iss.sua_luc), 'trang_thai', 'notDraft');
// Đổi thuế suất sau khi phát hành → hóa đơn cũ giữ nguyên.
app.saveFinanceSettings(Object.assign({}, app.getFinanceSettings(), { tax: 8 }), app.getFinanceSettings().sua_luc);
eq(app.getInvoice(inv.id).invoice.total, 363000);
// 入金 một phần → chờ thu; quá hạn → Việc cần làm; thu đủ.
const pay1 = app.createRecord('PAYMENT', { invoice_id: inv.id, ngay: '2026-12-01', so_tien: '300000' });
vErr(() => app.createRecord('PAYMENT', { invoice_id: inv.id, ngay: '2026-12-01', so_tien: '0' }), 'so_tien', 'yen');
eq([app.getInvoice(inv.id).invoice.state, app.getInvoice(inv.id).invoice.remain], ['cho_thu', 63000]);
g.clock.now = '2026-12-27 10:00:00';
eq(app.listInvoices()[0].state, 'qua_han');
const od = app.getTasks({}).tasks.filter((x) => x.rule === 'invoice_overdue');
eq(od.map((x) => [x.date, x.invoice_ma, x.remain, x.days]), [['2026-12-25', 'INV-0001', 63000, 2]]);
eq(app.getTasks({ staffId: R.id }).tasks.filter((x) => x.rule === 'invoice_overdue').length, 0, 'theo sales của công ty');
assert(!app.getTasks({}).tasks.some((x) => x.rule === 'revenue_todo'), 'không còn khoản cần lập');
vErr(() => app.cancelInvoice(inv.id, iss.sua_luc, 'Sai'), 'trang_thai', 'hasPayment');
app.createRecord('PAYMENT', { invoice_id: inv.id, ngay: '2026-12-27', so_tien: '63000' });
eq(app.listInvoices()[0].state, 'da_thu_du');
eq(app.getTasks({}).tasks.filter((x) => x.rule === 'invoice_overdue').length, 0);
// Hóa đơn hoàn tiền (âm) + hủy hóa đơn nháp: các khoản trở lại chưa vào hóa đơn; số hóa đơn giữ.
const inv2 = app.createInvoice(co.id, [un[4].id], '2026-12-27');
vErr(() => app.cancelInvoice(inv2.id, inv2.sua_luc, ''), 'ly_do', 'required');
const c2 = app.cancelInvoice(inv2.id, inv2.sua_luc, 'Lập nhầm');
eq([c2.trang_thai, c2.ma], ['huy', 'INV-0002']);
assert(app.getUninvoiced(co.id).some((r) => r.id === un[4].id));
const inv3 = app.createInvoice(co.id, [un[4].id], '2026-12-27');
const iss3 = app.issueInvoice(inv3.id, inv3.sua_luc);
eq([iss3.tien_chua_thue, iss3.thue_suat, iss3.tien_thue, iss3.tong], ['-310000', '8', '-24800', '-334800']);
app.createRecord('PAYMENT', { invoice_id: inv3.id, ngay: '2026-12-28', so_tien: '-334800', ghi_chu: 'Chuyển trả giả' });
eq(app.getInvoice(inv3.id).invoice.state, 'da_thu_du');
const det = app.getInvoice(inv.id);
eq([det.lines.length, det.payments.length, det.issuer.issuer_tno, det.company.ten_phap_nhan], [2, 2, 'T1234567890123', 'Công ty Giả Phí']);
assert(!('drive_file_id' in det.lines[0]) && !('chia' in det.lines[0]));
assert.throws(() => app.createRecord('INVOICE', { company_id: co.id }), /UNKNOWN_TABLE/);
assert.throws(() => app.setHidden('INVOICE', inv.id, true, ''), /UNKNOWN_TABLE/);

// ---- GĐ 8: người giới thiệu ----
const p3 = person('Co Nguoi GT', { nguoi_gioi_thieu: 'Người GT Giả' });
const a3 = app.createApplication({ person_id: p3.id, job_id: job.id, ngay_gui: '2026-12-01', recruiter_staff_id: R.id });
app.startEmployment(a3.id, '2027-01-05', a3.sua_luc);
eq(app.getPayoutTodo(), [], 'chưa tới ngày vào làm');
g.clock.now = '2027-01-06 10:00:00';
const po = app.getPayoutTodo();
eq(po.map((x) => [x.person, x.nguoi_nhan, x.so_tien, x.ngay_vao_lam]), [['Co Nguoi GT', 'Người GT Giả', '30000', '2027-01-05']]);
eq(app.getTasks({}).tasks.filter((x) => x.rule === 'revenue_todo').map((x) => [x.date, x.count]), [['2027-01-06', 2]], 'giới thiệu + hỗ trợ tháng 1');
eq(app.getTasks({ staffId: R.id }).tasks.filter((x) => x.rule === 'revenue_todo').length, 0, 'việc tổng chỉ hiện khi xem tất cả');
const emp3 = app.listRecords('EMPLOYMENT').find((e) => e.person_id === p3.id);
vErr(() => app.createRecord('REFERRER_PAYOUT', { person_id: p3.id, employment_id: emp1.id, nguoi_nhan: 'x', so_tien: '1' }), 'employment_id', 'invalidChoice');
const pay = app.createRecord('REFERRER_PAYOUT', { person_id: p3.id, employment_id: emp3.id, nguoi_nhan: 'Người GT Giả', so_tien: '30000' });
eq(app.getPayoutTodo(), []);
g.clock.now = '2027-01-06 10:00:05';
const paid = app.updateRecord('REFERRER_PAYOUT', pay.id, { ngay_tra: '2027-01-10' }, pay.sua_luc);
eq([paid.ma, paid.ngay_tra], ['TGT-0001', '2027-01-10']);

// ---- Sửa theo review độc lập ----
// (3) Không tạo 2 khoản trả người giới thiệu cho cùng lần vào làm; ẩn rồi hiện lại cũng bị chặn nếu đã có khoản khác.
vErr(() => app.createRecord('REFERRER_PAYOUT', { person_id: p3.id, employment_id: emp3.id, nguoi_nhan: 'x', so_tien: '1' }), 'employment_id', 'payoutExists');
// (1) Hủy "Đã vào làm" khi đã có doanh số / khoản trả → bị chặn (tránh lập lại 2 lần).
const app3 = app.listRecords('APPLICATION').find((x) => x.id === a3.id);
const vaoLam = app.getApplicationLogs(a3.id).filter((l) => !l.da_an && l.trang_thai === 'da_vao_lam')[0];
vErr(() => app.cancelApplicationStatus(a3.id, vaoLam.id, app3.sua_luc), 'trang_thai', 'hasMoney');
// (4) 入金 đã bỏ → hủy hóa đơn → không hiện lại được.
g.clock.now = '2027-01-07 10:00:00';
const coX = app.createRecord('COMPANY', { ten_phap_nhan: 'Công ty Giả Review' });
const rx = app.saveRevenue('', { loai: 'khac', company_id: coX.id, ngay: '2027-01-07', so_tien: '1000' });
const ix = app.createInvoice(coX.id, [rx.id], '2027-01-07');
const ixi = app.issueInvoice(ix.id, ix.sua_luc);
const px = app.createRecord('PAYMENT', { invoice_id: ix.id, ngay: '2027-01-07', so_tien: '1100' });
g.clock.now = '2027-01-07 10:00:05';
const pxh = app.setHidden('PAYMENT', px.id, true, px.sua_luc);
app.cancelInvoice(ix.id, ixi.sua_luc, 'Thử');
vErr(() => app.setHidden('PAYMENT', px.id, false, pxh.sua_luc), 'invoice_id', 'invalidChoice');
// (2) Hợp đồng chia cọc nhưng vào làm thẳng (không có 内定承諾) → gợi ý cả phí, không chỉ 1/2.
const p4 = person('Thang Vao Lam');
const a4 = app.createApplication({ person_id: p4.id, job_id: job2.id, ngay_gui: '2027-01-01', recruiter_staff_id: R.id });
app.startEmployment(a4.id, '2027-01-05', a4.sua_luc);
eq(app.getRevenueTodo().filter((r) => r.person_id === p4.id).map((r) => [r.loai, r.so_tien]), [['gioi_thieu', '200001']]);
// Có 内定承諾 (cọc đang chờ lập) và vào làm cùng lúc → cọc 1/2 + phần còn lại, tổng đúng 1 lần phí.
const p5 = person('Coc Va Vao');
const a5 = app.createApplication({ person_id: p5.id, job_id: job2.id, ngay_gui: '2027-01-01', recruiter_staff_id: R.id });
const a5b = app.addApplicationStatus(a5.id, 'naitei_shodaku', '2027-01-02', '', a5.sua_luc);
app.startEmployment(a5.id, '2027-01-06', a5b.sua_luc);
const t5 = app.getRevenueTodo().filter((r) => r.person_id === p5.id);
eq(t5.map((r) => [r.loai, r.so_tien]), [['coc', '100000'], ['con_lai', '100001']]);
// Bỏ qua cọc → phần vào làm đã gợi ý theo cọc thì sau khi bỏ qua cọc sẽ thành cả phí (chưa lập gì).
app.applyRevenueTodo([t5[0].key], true);
eq(app.getRevenueTodo().filter((r) => r.person_id === p5.id).map((r) => [r.loai, r.so_tien]), [['gioi_thieu', '200001']]);

module.exports = { app, g, co, co2, R, S, H, person, vErr };
if (require.main === module) console.log('OK — kiểm tra Finance.gs (GĐ 5 + 8) đạt');
