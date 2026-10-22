# CHANGELOG.md

## 0.33.0 — 2026-10-22 — GĐ 12.1: đăng nhập ID + mật khẩu (D-083) — không đổi cấu trúc dữ liệu

- Nhân viên đăng nhập bằng **ID (= mã nhân viên, vd. STF-0001) + mật khẩu** thay cho liên kết bí mật `?k=…` (liên kết cũ hết hiệu lực). Chủ vẫn vào thẳng bằng Gmail triển khai.
- Chủ: Cài đặt → Nhân viên → **Đặt mật khẩu / Đặt lại mật khẩu** (mật khẩu tạm 12 ký tự, hiện một lần) và **Khóa đăng nhập**. Lần đăng nhập đầu bắt đổi mật khẩu (≥ 8 ký tự, khác ID); trước khi đổi, mọi chức năng khác bị máy chủ chặn.
- Mật khẩu lưu dạng băm **PBKDF2-HMAC-SHA256** (muối riêng, 5.000 vòng, số vòng lưu trong chuỗi băm) ở cột `STAFF.khoa_hash`; mã băm không bao giờ gửi về trình duyệt (kể cả kết quả lưu nhân viên) và được che trong AUDIT_LOG.
- Phiên đăng nhập ở máy chủ (CacheService): hết sau 2 giờ không dùng; đăng xuất, đổi / đặt lại mật khẩu, khóa, "Đã nghỉ", ẩn → phiên cũ hết hiệu lực ngay. Đổi mật khẩu giữ phiên đang dùng, đăng xuất các phiên khác. Sai 5 lần → khóa tạm 15 phút.
- Giao diện: màn hình đăng nhập, đổi mật khẩu, nút Đổi mật khẩu / Đăng xuất trên thanh trên; hết phiên giữa chừng → báo và mời đăng nhập lại. Nhật ký ghi tên nhân viên không còn hậu tố "(liên kết)".
- Thêm: `LoginUi.html`. Sửa: `Code.gs` (0.33.0), `Auth.gs`, `Repo.gs`, `Schema.gs` (chú thích), `Index.html`, `Staff.html`, `I18n.html`, `README.md`, tests (`fakes.js`, `auth.test.js`, `prep.test.js`, `ui.test.js`). (clasp: `git pull` + `clasp push -f`.)

## 0.32.1 — 2026-10-21 — Chống lỗi tạm "ストレージからの読み取り中にサーバーエラー… INTERNAL"

- Google thỉnh thoảng báo lỗi tạm khi app đọc / ghi thuộc tính dự án (Script Properties); trước đây đọc ngay lúc khởi động mỗi lần gọi, không thử lại → cả trang lỗi (nhiều dòng "thất bại 0 giây" trong 実行数). Nay đọc 1 lần / lần gọi và tự thử lại tối đa 4 lần.
- Sửa: `Setup.gs` (hàm `scriptProps_`, `retryStorage_`), `Repo.gs`, `Backup.gs`, `Demo.gs`, `Export.gs`, `Perf.gs`, `Visa.gs`, `Code.gs` (0.32.1), tests. Không đổi cấu trúc dữ liệu.

## 0.32.0 — 2026-10-21 — GĐ 11.3–11.4: 定期面談 theo quý + Vấn đề phát sinh (D-080) — CẦN BẤM "Khởi tạo / nâng cấp dữ liệu" (cấu trúc 18)

- Menu mới **定期面談**: theo quý cố định (4–6, 7–9, 10–12, 1–3); ai cần phỏng vấn trong quý (người đang làm được bên mình hỗ trợ; 支援なし không tính; dữ liệu nhập từ file cũ tính từ quý nhập); lọc quý / CS / công ty / tình trạng (chưa hoàn thành, quá hạn, sắp tới); đặt lịch / ghi ngày thực hiện, người thực hiện, hình thức, nội dung, link biên bản. Mỗi người 1 dòng / quý — quý mới không ghi đè quý cũ. Nhật ký hỗ trợ loại 定期面談 cũ trong quý vẫn tính là đã làm.
- Nhắc 定期面談 đổi sang theo quý: quý trước chưa làm → quá hạn; quý này chưa làm và còn ≤ N ngày (mặc định 30) tới cuối quý → nhắc. Nút mở đúng trang 定期面談.
- Menu mới **Vấn đề phát sinh (相談・対応)**: mỗi vụ việc riêng, gắn nhiều người và/hoặc công ty; loại (lương, giờ làm, bảo hiểm, thuế, nhà ở, sức khỏe, quan hệ, nghỉ việc, chuyển việc, khác), ưu tiên, phụ trách + phối hợp, hạn xử lý, ngày liên hệ lại, kết quả, link; **lịch sử xử lý** chỉ thêm (ghi nhầm thì ẩn). Nút **Tạo vấn đề** từ 定期面談 (liên kết lại lần phỏng vấn). Việc cần làm "vấn đề sắp / quá hạn".
- Hồ sơ người: thêm mục lịch sử 定期面談 + vấn đề của người đó. Dữ liệu mẫu có 2 lần 定期面談 + 2 vấn đề.
- Thêm: `Mendan.gs`, `MendanUi.html`. Sửa: `Code.gs` (0.32.0), `Schema.gs` (18), `Repo.gs`, `Dashboard.gs`, `Auth.gs`, `Demo.gs`, `Index.html`, `I18n.html`, `PersonUi.html`, `DashboardUi.html`, tests. (clasp: `git pull` + `clasp push -f`.)

## 0.31.0 — 2026-10-21 — GĐ 11.1–11.2: thu gom giấy tờ + 受入れ前 (D-080) — CẦN BẤM "Khởi tạo / nâng cấp dữ liệu" (cấu trúc 17)

- Menu mới **受入れ前 (chuẩn bị)**: người đã 内定 chưa vào làm — tự mở khi lần giới thiệu sang 内定; ngày nhập cảnh / vào làm dự kiến, CS + phụ trách giấy tờ, bên đang chờ; công việc chuẩn bị theo mẫu (hợp đồng, 事前説明, visa, chỗ ở, vé máy bay, đón, thủ tục sau nhập cảnh); tiến độ hợp đồng / giấy tờ / visa / công việc; **Xác nhận đã vào làm** → sang Đang làm việc, giữ lịch sử.
- Checklist giấy tờ (hồ sơ visa + 受入れ前): bên cung cấp, ngày yêu cầu, hạn nhận, người kiểm tra, nội dung cần sửa, link Drive; trạng thái chưa yêu cầu → đã yêu cầu → đã nhận → cần sửa → đã kiểm tra.
- **Kho giấy tờ** trong hồ sơ người: lưu 1 lần, checklist sau gợi ý **Dùng giấy tờ đã lưu** (cảnh báo hết hiệu lực).
- Menu mới **Giấy tờ còn thiếu**: tổng hợp, lọc quá hạn / bên cung cấp / người phụ trách.
- Việc cần làm: giấy tờ sắp / quá hạn nhận; công việc 受入れ前 tới hạn. Cài đặt: mẫu công việc 受入れ前, mẫu giấy tờ 受入れ前.
- Thêm: `Prep.gs`, `PrepUi.html`, `DocsUi.html`. Sửa: `Code.gs` (0.31.0), `Schema.gs` (17), `Repo.gs`, `Application.gs`, `Dashboard.gs`, `Visa.gs`, `Auth.gs`, `Index.html`, `I18n.html`, `VisaUi.html`, `PersonUi.html`, `DashboardUi.html`, tests. (clasp: `git pull` + `clasp push -f`.)

## 0.30.1 — 2026-10-21 — Sửa quyền truy cập web app trong appsscript.json

- `appsscript.json`: `webapp.access` đổi `MYSELF` → `ANYONE` (= "Bất kỳ ai có Tài khoản Google", cần cho liên kết nhân viên D-075). Trước đây `clasp push -f` ghi đè quyền về "Chỉ mình tôi" → người khác (hoặc chủ khi trình duyệt dùng tài khoản khác) gặp lỗi Drive "Rất tiếc, không thể mở tệp". App vẫn tự chặn người không có liên kết (trang "không có quyền").

## 0.30.0 — 2026-10-21 — Nhập file quản lý cũ (Excel) (D-079) — CẦN BẤM "Khởi tạo / nâng cấp dữ liệu" (cấu trúc 16)

- Cài đặt → **Nhập file quản lý cũ (Excel)** (chỉ chủ): đọc file .xlsx trong trình duyệt, nhận sheet 会社情報 + danh sách người lao động, Kiểm tra → Sao lưu rồi nhập; nhập lại không trùng.
- **Nhập từng bảng** nhận cả .xlsx (chọn sheet, tự nhận dòng tiêu đề).
- Công ty thêm 法人番号, 施設名, 職種. Người thêm CS phụ trách (nhiều người), phụ trách giấy tờ. Lần vào làm thêm trạng thái khi thiếu ngày + "công ty tự hỗ trợ (支援なし)"; nút **Bổ sung thông tin** cho lần vào làm nhập từ file cũ.
- Đang làm việc / 定期面談 / phí hỗ trợ dùng CS phụ trách của người (chưa có thì của công ty); 支援なし không nhắc, không tính phí.
- Ghi nhiều dòng một lần (nhanh hơn khi nhập lớn).
- Thêm: `Legacy.gs`, `LegacyUi.html`, `XlsxUi.html`. Sửa: `Code.gs` (0.30.0), `Schema.gs` (16), `Repo.gs`, `Application.gs`, `Dashboard.gs`, `Finance.gs`, `Person.gs`, `Auth.gs`, `Index.html`, `I18n.html`, `ImportUi.html`, `ApplicationUi.html`, `EmploymentUi.html`, `PersonUi.html`, `Company.html`, `WorkingUi.html`, tests. (Dùng clasp: `git pull` rồi `clasp push -f` là đủ.)

## 0.29.2 — 2026-10-21 — Báo lỗi "đang bận" dễ hiểu

- Khi có thao tác khác giữ khóa quá 30 giây (vd. lần Khởi tạo đầu tiên của bản thật còn đang chạy), app báo "Đang có thao tác khác chạy… chờ 1–2 phút, tải lại trang" thay vì lỗi tiếng Nhật của Google (ロックのタイムアウト).
- Sửa: `Code.gs` (0.29.2), `Repo.gs`, `Setup.gs`, `Index.html`, `I18n.html`. Không đổi cấu trúc dữ liệu.

## 0.29.1 — 2026-10-21 — Chuẩn bị bản thật

- Bản thật (PROD) không có mục **Đo tốc độ** (máy chủ cũng chặn → không tạo file HR_PERF_TEST trong thư mục thật).
- Nút Khởi tạo đổi tên trung tính: **Khởi tạo / nâng cấp dữ liệu** (bản thật không còn chữ "thử nghiệm").
- `setProdEnv` ghi kết quả vào **Nhật ký thực thi** (chạy trong trình soạn thảo mới thấy được).
- README: hướng dẫn tạo bản thật từng bước (37 file, quyền truy cập "Bất kỳ ai có Tài khoản Google", bật sao lưu, cập nhật bằng "Phiên bản mới").
- Sửa: `Code.gs` (0.29.1), `Perf.gs`, `Setup.gs`, `Index.html`, `I18n.html`. Không đổi cấu trúc dữ liệu.

## 0.29.0 — 2026-10-21 — Dữ liệu mẫu để kiểm thử (D-078)

- Cài đặt → **Dữ liệu mẫu để kiểm thử** (chỉ chủ, chỉ bản thử nghiệm): tạo 1 lần bộ dữ liệu giả — 5 nhân viên, 6 công ty, 8 liên hệ, 6 hợp đồng, 8 đơn tuyển, 24 người, 21 lần giới thiệu (đủ trạng thái, phỏng vấn sắp tới / đã qua), 8 lần vào làm (2 nghỉ, 1 vào làm tuần tới), 5 hồ sơ visa + checklist, 6 nhật ký hỗ trợ, doanh số (cọc / còn lại / hỗ trợ / hoàn tiền / khác), mục tiêu, 4 hóa đơn (đã thu đủ, quá hạn, nháp, đã hủy), 1 khoản người giới thiệu.
- Thêm: `Demo.gs` (file mới). Sửa: `Code.gs` (0.29.0), `Index.html`, `PerfUi.html`, `I18n.html`. Không đổi cấu trúc dữ liệu.

## 0.28.0 — 2026-10-21 — Sửa phân quyền nhân viên / quản lý (D-077)

- **Cài đặt → Phân quyền** (chỉ chủ): bật / tắt 7 quyền cho Nhân viên và Quản lý.
- Mặc định Nhân viên thêm: **xem số giấy tờ đầy đủ**, **doanh số của mình** (trang Doanh số chỉ hiện phần được chia cho mình + mục tiêu của mình). Quản lý giữ nguyên.
- Menu, mục trong trang và máy chủ đều theo bảng quyền; đổi vai trò chỉ chủ.
- Sửa: `Auth.gs`, `Finance.gs` (getMySales), `Dashboard.gs`, `Person.gs`, `Setup.gs`, `Code.gs` (0.28.0), `Index.html`, `I18n.html`, `Company.html`, `PersonUi.html`, `SalesUi.html`, `FinanceUi.html`. Không đổi cấu trúc dữ liệu.

## 0.27.1 — 2026-10-20 — Sửa bảo mật sau kiểm tra độc lập (D-076)

- Chặn quản lý dùng liên kết gọi hàm ngoài danh sách (lỗ hổng `eval` → quyền chủ). Cả 2 vai trò dùng danh sách hàm cho phép rõ ràng.
- Nhân viên: cài đặt tài chính chỉ còn tên công ty; cảnh báo trùng không dùng số hộ chiếu.
- Hàm sao lưu theo lịch: chỉ chủ hoặc đúng trình kích hoạt của project.
- Sửa: `Auth.gs`, `Finance.gs`, `Person.gs`, `Backup.gs`, `Code.gs` (0.27.1).

## 0.27.0 — 2026-10-20 — GĐ 10: nhiều người dùng (D-075)

- Cài đặt → Nhân viên: **Vai trò** (Nhân viên / Quản lý), **Tạo liên kết / Tạo lại / Thu hồi** liên kết truy cập riêng (chỉ chủ thấy; liên kết hiện một lần).
- Mở bằng liên kết: góc trên hiện tên + vai trò; Nhân viên không thấy Doanh số, Hóa đơn, Cài đặt, hợp đồng phí, nút hiện số giấy tờ, link mở tệp. Máy chủ kiểm quyền ở mọi lần gọi; nhật ký ghi tên nhân viên.
- Không có liên kết và không phải chủ → trang "không có quyền".
- Cấu trúc 14 → 15 (STAFF thêm 3 cột). File mới: `Auth.gs`. Sửa: `Code.gs` (0.27.0), `Repo.gs`, `Schema.gs`, `Setup.gs`, `Backup.gs`, `Perf.gs`, `Dashboard.gs`, `Index.html`, `I18n.html`, `Staff.html`, `Company.html`, `PersonUi.html`, `VisaUi.html`.

## 0.26.0 — 2026-10-20 — Các bước cuối: tỷ lệ chuyển đổi, 定期届出, phiếu giới thiệu

- Tổng quan → thẻ **Tỷ lệ chuyển đổi**: Gửi → Phỏng vấn → 内定 → 内定承諾 → Vào làm theo khoảng tháng và recruiter (D-073).
- Việc cần làm → **定期届出 (năm)**: nhắc từng công ty có người làm trong kỳ 1/4–31/3, hạn 31/5; nút **Đã nộp** (D-073).
- Hồ sơ người → **Phiếu giới thiệu (in)**: 人材紹介票 tiếng Nhật, không có liên lạc / số giấy tờ, có nhật ký in (D-074).
- Sửa: băng nhắc nâng cấp (0.25.2) hiện thành **dải vàng trống** khi không cần nâng cấp → nay ẩn hẳn. Nhập CSV: báo đúng dòng trùng ở lô thứ 2 trở đi.
- Sửa: `Schema.gs`, `Dashboard.gs`, `Person.gs`, `Import.gs`, `Code.gs` (0.26.0), `Index.html`, `I18n.html`, `DashboardUi.html`, `PersonUi.html`, `ImportUi.html`.

## 0.25.2 — 2026-10-20 — Nhắc nâng cấp cấu trúc ngay khi mở app

- Chủ dự án báo (ảnh 2026-10-20): sau khi dán 0.25.1, các trang mới báo "Tab SETTING / FILE / PAYMENT có hàng tiêu đề khác thiết kế" vì file Sheets chưa được nâng cấp.
- Mở app mà file dữ liệu còn cấu trúc cũ → băng vàng trên mọi trang + nút **Nâng cấp ngay (Khởi tạo)** (tự sao lưu trước). Nâng cấp xong băng tự biến mất.
- Sửa: `Index.html`, `I18n.html`, `Code.gs` (0.25.2).

## 0.25.1 — 2026-10-20 — Sửa sau kiểm tra độc lập phần tiền (D-072)

- Chặn hủy "Đã vào làm" khi đã lập doanh số / khoản trả người giới thiệu cho lần vào làm đó.
- Phí khi vào làm = phí − cọc đã lập (hoặc đang chờ lập); hợp đồng chia cọc mà không có 内定承諾 → gợi ý cả phí.
- Mỗi lần vào làm chỉ 1 khoản trả người giới thiệu (chặn bấm 2 lần).
- 入金 đã bỏ không hiện lại được sau khi hóa đơn bị hủy.
- Xuất dữ liệu: cột chữ để dạng văn bản thuần. Nhập CSV: báo đúng dòng bị trùng trong cùng file.
- Sửa: `Application.gs`, `Finance.gs`, `Repo.gs`, `Export.gs`, `Import.gs`, `I18n.html`, `Code.gs` (0.25.1).

## 0.25.0 — 2026-10-20 — 9a (bản thật + nhập CSV) + 9b (xuất dữ liệu)

- Môi trường đọc từ thuộc tính dự án `APP_ENV`; hàm `setProdEnv()` (chạy tay trong project bản thật, từ chối project đã có dữ liệu thử). Bản thật không hiện băng "Bản thử nghiệm" (D-070).
- **Cài đặt → Nhập dữ liệu từ Sheets cũ (CSV)**: nhân viên, công ty, người liên hệ, đơn tuyển, con người; ghép cột tự động; Kiểm tra (không ghi) → Nhập theo lô 100 dòng; báo lỗi theo dòng.
- **Cài đặt → Xuất dữ liệu**: 7 loại ra Google Sheets (tải Excel), không xuất số giấy tờ, có nhật ký (D-071).
- README: hướng dẫn **Tạo bản thật**.
- File mới: `Import.gs`, `Export.gs`, `ImportUi.html`. Sửa: `Setup.gs`, `Code.gs` (0.25.0), `Index.html`, `I18n.html`.

## 0.24.0 — 2026-10-20 — GĐ 5 (doanh số & mục tiêu) + GĐ 8 (hóa đơn, 入金, người giới thiệu) — D-069

- **Hợp đồng & phí** trong chi tiết công ty: phí giới thiệu / người, chia cọc 1/2, phí hỗ trợ / người / tháng, bậc hoàn tiền; nhiều bản theo ngày hiệu lực.
- **Cài đặt → Tài chính & hóa đơn**: thuế suất (10%), phần recruiter (%), tiền trả người giới thiệu mặc định, hạn thanh toán, tên / địa chỉ / số T… / tài khoản nhận tiền.
- Trang **Doanh số**: thẻ *Cần lập* (gợi ý tự sinh: phí giới thiệu, cọc 1/2, phần còn lại, phí hỗ trợ tháng, hoàn tiền khi nghỉ sớm — sửa số tiền, lập, bỏ qua, lập tất cả); thẻ *Báo cáo & mục tiêu* (tháng, theo nhân viên theo % chia, mục tiêu người / công ty, theo loại, 12 tháng, các khoản: sửa / bỏ / thêm tay).
- Trang **Hóa đơn & 入金**: tạo nháp từ các khoản chưa vào hóa đơn, phát hành (chốt thuế), hủy cần lý do (giữ số), **in / lưu PDF bản tiếng Nhật đủ mục 適格請求書**, ghi 入金, tình trạng chờ thu / quá hạn / đã thu đủ. Thẻ **Người giới thiệu**: khoản phải trả khi vào làm, đánh dấu đã trả.
- Hồ sơ người thêm ô **Người giới thiệu (紹介者)**.
- Việc cần làm thêm: **Hóa đơn quá hạn**, **Doanh số cần lập**.
- Cấu trúc 13 → 14: 6 tab mới (CONTRACT, REVENUE, TARGET, INVOICE, PAYMENT, REFERRER_PAYOUT) + PERSON thêm cột. Bấm Khởi tạo một lần.
- File mới: `Finance.gs`, `FinanceUi.html`, `SalesUi.html`, `InvoiceUi.html`. Sửa: `Schema.gs`, `Repo.gs`, `Dashboard.gs`, `Code.gs` (0.24.0), `Index.html`, `I18n.html`, `Company.html`, `PersonUi.html`, `DashboardUi.html`.

## 0.22.0 — 2026-10-19 — Bước 7.2 (Nhật ký hỗ trợ) — tự duyệt theo D-059

- Hồ sơ người có mục **Nhật ký hỗ trợ**: 定期面談, tư vấn / khiếu nại, sự cố, hỗ trợ sinh hoạt, khác; ngày, hình thức, người hỗ trợ, nội dung; sửa / ẩn (D-068).
- **Việc cần làm → 定期面談**: lần gần nhất (chưa có thì ngày vào làm) + 90 ngày, nhắc trước 14 ngày. Trang **Đang làm việc** thêm cột 定期面談.
- Cấu trúc 12 → 13: thêm tab **SUPPORT_LOG**. Bấm Khởi tạo một lần.
- File mới: `SupportUi.html`. Sửa: `Schema.gs`, `Repo.gs`, `Dashboard.gs`, `WorkingUi.html`, `PersonUi.html`, `DashboardUi.html`, `Index.html`, `I18n.html`, `Code.gs` (0.22.0).

## 0.21.0 — 2026-10-19 — Bước 6.4 (Tải tệp giấy tờ) — chủ dự án duyệt

- Mỗi dòng checklist có thể **tải tệp lên** (PDF / JPG / PNG ≤ 10MB) vào thư mục Drive riêng không chia sẻ, thư mục con theo mã người (D-067).
- Bấm tên tệp → lấy link mở trong Drive (ghi nhật ký `xem_file`). "Bỏ" chỉ gỡ khỏi app, tệp trong Drive vẫn giữ.
- Cấu trúc 11 → 12: tab FILE thêm 3 cột. Bấm Khởi tạo một lần (có sao lưu trước khi nâng cấp).
- Sửa: `Schema.gs`, `Repo.gs`, `Visa.gs`, `VisaUi.html`, `PersonUi.html`, `Index.html`, `I18n.html`, `Code.gs` (0.21.0).

## 0.20.0 — 2026-10-20 — Bước 7.1 (Đang làm việc) — tự duyệt theo D-059

- Trang **Đang làm việc**: người đang làm / chờ vào làm, số tháng đã làm, tư cách, hạn lưu trú (tô đỏ khi gần / đã hết), support phụ trách của công ty; lọc công ty / support; tìm tại chỗ; bấm tên mở hồ sơ (D-066).
- Không đổi cấu trúc dữ liệu (không cần Khởi tạo).
- File mới: `WorkingUi.html`. Sửa: `Dashboard.gs` (getWorking), `Index.html`, `I18n.html`, `Code.gs` (0.20.0).

## 0.19.0 — 2026-10-20 — Bước 6.3 (Checklist giấy tờ) — tự duyệt theo D-059

- Mỗi hồ sơ visa có **checklist giấy tờ**: trạng thái Chưa có / Đã nhận / Đã kiểm tra / Không cần, ngày nhận, ghi chú; lưu từng dòng; thêm / bỏ giấy tờ. Danh sách hồ sơ hiện "x/y xong" (D-065).
- **Cài đặt → Mẫu checklist giấy tờ**: chọn giấy tờ cho từng thủ tục; hồ sơ mới tự có checklist theo mẫu.
- Danh mục mới **Giấy tờ** (nạp sẵn 12 mục mẫu — tự sửa theo thực tế).
- Cấu trúc 10 → 11: thêm tab **CASE_DOCUMENT**. Bấm Khởi tạo một lần (cũng nạp danh mục Giấy tờ).
- File mới: `Visa.gs`. Sửa: `Schema.gs`, `Repo.gs`, `Code.gs` (0.19.0), `VisaUi.html`, `PersonUi.html`, `Lookup.html`, `Index.html`, `I18n.html`.

## 0.18.0 — 2026-10-20 — Bước 6.2 (Hồ sơ visa) — tự duyệt theo D-059

- Trang **Hồ sơ visa**: danh sách, tìm, lọc thủ tục / trạng thái / người phụ trách; hồ sơ đã kết thúc ẩn mặc định; thêm, sửa, ẩn. Mục **Hồ sơ visa** trong hồ sơ người (D-064).
- Được cấp 変更 / 更新 có hạn mới → tự cập nhật hạn lưu trú (và tư cách) của người, có nhật ký.
- Việc cần làm: quy tắc mới **Hồ sơ visa chờ kết quả** (mặc định 30 ngày); đã nộp 変更 / 更新 thì thôi nhắc hạn lưu trú.
- Cấu trúc 9 → 10: thêm tab **IMMIGRATION_CASE**. Bấm Khởi tạo một lần.
- File mới: `VisaUi.html`. Sửa: `Schema.gs`, `Repo.gs`, `Dashboard.gs`, `Code.gs` (0.18.0), `Index.html`, `I18n.html`, `PersonUi.html`, `DashboardUi.html`.

## 0.17.0 — 2026-10-20 — Bước 6.1 (cảnh báo hạn lưu trú / hộ chiếu) — tự duyệt theo D-059

- Việc cần làm thêm 2 quy tắc: **Hạn lưu trú (在留期限)** trong 90 ngày, **Hạn hộ chiếu** trong 180 ngày; đã hết hạn hiện "ĐÃ HẾT n ngày" tô đỏ (D-063). Bật/tắt + số ngày trong Cài đặt → Việc cần làm.
- Không đổi cấu trúc dữ liệu (không cần bấm Khởi tạo).
- Sửa: `Schema.gs` (TASK_RULES), `Dashboard.gs`, `DashboardUi.html`, `I18n.html`, `Code.gs` (0.17.0).

## 0.16.0 — 2026-10-20 — Bước 4.3 (Việc cần làm) — tự duyệt theo D-059

- Thẻ **Việc cần làm** trong Tổng quan: việc tự sinh từ dữ liệu theo 9 quy tắc (phỏng vấn sắp tới / chưa có kết quả, gửi khách lâu, trạng thái đứng lâu, 内定承諾 chưa có ngày vào làm, sắp vào làm, đơn sắp tới hạn còn thiếu, đơn đủ người chưa đổi, hồ sơ mới chưa kiểm tra); sắp theo ngày, quá hạn tô đỏ; lọc người phụ trách; nút mở hồ sơ / mở đơn (D-062).
- **Cài đặt → Việc cần làm**: bật/tắt + số ngày N cho từng quy tắc (0–365), lưu từng dòng, giữ các dòng đang sửa dở.
- Cấu trúc 8 → 9: thêm tab **SETTING** (cấu hình, được sao lưu, có nhật ký). Bấm Khởi tạo một lần để tạo tab.
- Sửa: `Schema.gs`, `Repo.gs`, `Dashboard.gs` (getTasks, getTaskSettings, saveTaskSetting), `DashboardUi.html`, `Index.html`, `I18n.html`, `Code.gs` (0.16.0).

## 0.15.0 — 2026-10-20 — Bước 4.2 (Pipeline) — tự duyệt theo D-059

- Thẻ **Pipeline** trong Tổng quan: 6 cột (đã gửi, chờ PV, đã PV, 内定, 内定承諾, tạm dừng); mỗi thẻ hiện người, đơn, công ty, số ngày ở trạng thái (từ 14 ngày tô cảnh báo), phỏng vấn sắp tới, recruiter; nằm lâu nhất lên đầu (D-061).
- Lọc recruiter / công ty / đơn (đổi công ty thì bỏ chọn đơn); bấm thẻ → hồ sơ để đổi trạng thái.
- Sửa: `Dashboard.gs` (getPipeline), `DashboardUi.html`, `Index.html`, `I18n.html`, `Code.gs` (0.15.0). Dữ liệu: không đổi.

## 0.14.0 — 2026-10-20 — Bước 4.1 (Tổng quan) — tự duyệt theo D-059

- Trang **Tổng quan** (mở app là thấy): 1 lần gọi máy chủ tính sẵn 6 khối — đơn đang mở (số đơn / tổng cần / còn thiếu + 5 đơn thiếu nhiều nhất), lần giới thiệu đang chạy theo trạng thái, phỏng vấn 7 ngày tới, chờ vào làm, trong tháng (vào làm / nghỉ / gửi khách), con người theo vòng đời (D-060).
- Lọc theo người phụ trách + chọn tháng (JST); bấm "Đơn đang mở" / "Còn thiếu" → trang Đơn tuyển lọc sẵn; bấm mã đơn → tìm đúng đơn; bấm tên người → hồ sơ.
- Thẻ (tab) "Số liệu" — Pipeline và Việc cần làm sẽ thêm ở 4.2, 4.3 (không đổi menu).
- File mới: `src/Dashboard.gs`, `src/DashboardUi.html`, `tests/dashboard.test.js`. Sửa: `Code.gs` (0.14.0), `Index.html`, `I18n.html`. Dữ liệu: không đổi cấu trúc.

## 0.13.0 — 2026-10-19 — Bước 3.4 (Vào làm cơ bản)

- Mở **"Đã vào làm"** ở lần giới thiệu: ô ngày = ngày vào làm (được ở tương lai) → ghi lịch sử + tạo bản ghi vào làm `EMP-0001` (công ty, đơn, người). Không cho đang làm 2 nơi cùng lúc (D-057).
- Đơn đang mở đủ người → gợi ý 1 chạm "Đổi sang Đã đủ người" (trong hồ sơ ngay sau khi lưu, và nút "→ Đã đủ người" ở bảng đơn); chỉ đổi khi bấm.
- Hồ sơ người: mục **Quá trình làm việc** (công ty, đơn, ngày vào làm / nghỉ, lý do, trạng thái) + **Ghi / sửa nghỉ việc** (ngày nghỉ ≥ ngày vào làm; lý do chọn từ danh mục, bắt buộc).
- **Tình trạng vòng đời đủ 4 loại** (D-020): Đang làm › Chờ vào làm (内定承諾 hoặc ngày vào làm tương lai) › Đang ứng tuyển › Đã nghỉ.
- Bảng đơn: cột **Tiến độ** = Đã vào làm · Chờ vào làm · Còn thiếu (= số cần − đang làm; đơn đã đóng hiện "—", D-021) + Đang giới thiệu.
- Hủy dòng "Đã vào làm" nhập nhầm → ẩn bản ghi vào làm (đã ghi nghỉ thì không cho hủy); lần giới thiệu "Đã vào làm" không đổi trạng thái kiểu thường.
- Danh mục mới **Lý do nghỉ việc** (nạp sẵn 5 mục khi bấm Khởi tạo). Cấu trúc 7 → 8: nối 1 cột vào tab EMPLOYMENT.
- File mới: `src/EmploymentUi.html`. Sửa: `Code.gs` (0.13.0), `Schema.gs`, `Repo.gs`, `Application.gs`, `ApplicationUi.html`, `PersonUi.html`, `Company.html`, `Jobs.html`, `Lookup.html`, `Index.html`, `I18n.html`.

## 0.12.0 — 2026-10-19 — Bước 3.3 (Phỏng vấn)

- Mỗi lần giới thiệu có nút **Phỏng vấn**: danh sách buổi (sắp theo thời gian), thêm/sửa/ẩn; vòng 1次/2次/最終/khác, ngày + giờ bắt đầu/kết thúc (JST), hình thức, địa điểm/link, người phỏng vấn (người liên hệ của công ty), kết quả, lý do, ghi chú; mã `PV-0001` (D-055).
- **Gợi ý 1 chạm** sau khi lưu: thêm buổi đầu khi "Đã gửi khách" → gợi ý "Chờ phỏng vấn"; kết quả Đạt → "Đã phỏng vấn"; Trượt → "Trượt" (kèm lý do). Chỉ đổi khi bấm "Cập nhật"; ngày gợi ý không lùi.
- Lần giới thiệu đã kết thúc: không thêm buổi mới, vẫn sửa / ẩn được buổi cũ.
- Trang chi tiết công ty: **Lịch phỏng vấn sắp tới** (từ hôm nay, kết quả "Chờ"); bấm tên người → mở hồ sơ.
- Cấu trúc 6 → 7: nối 6 cột vào tab INTERVIEW.
- File mới: `src/InterviewUi.html`. Sửa: `Code.gs` (0.12.0), `Schema.gs`, `Repo.gs`, `Application.gs`, `ApplicationUi.html`, `PersonUi.html`, `Company.html`, `Index.html`, `I18n.html`.

## 0.11.0 — 2026-10-19 — Bước 3.2 (Lần giới thiệu)

- Hồ sơ người có mục **Lần giới thiệu**: "+ Giới thiệu vào đơn" (chỉ người "Sẵn sàng giới thiệu", chỉ đơn "Đang mở"; recruiter mặc định của người đó), danh sách lần giới thiệu (mới nhất lên đầu), Đổi trạng thái, Lịch sử, Ẩn (D-052, D-053).
- Trạng thái tầng 2 ghi thêm vào lịch sử: chọn tự do, ngày không lùi; lý do bắt buộc khi trượt/từ chối/hủy; "Đã vào làm" khóa tới 3.4. Hủy dòng nhập nhầm (bấm 2 lần để xác nhận) → dòng gạch đi, trạng thái hiện tại tự tính lại.
- Chặn trùng D-023: cùng người × đơn chỉ 1 lần chưa kết thúc ("tạm dừng" tính là chưa kết thúc); áp dụng cả khi mở lại lần cũ, hủy dòng kết thúc, hiện lại lần đã ẩn.
- **Tình trạng vòng đời** trong hồ sơ và danh sách: "Chờ vào làm" / "Đang ứng tuyển" (D-020; "Đang làm" / "Đã nghỉ" ở 3.4).
- Bảng đơn tuyển (trang Đơn tuyển + trang công ty) có cột **"Đang giới thiệu"**.
- Bấm "Hiện số" giấy tờ giờ ghi 1 dòng nhật ký `xem_so` (không ghi số).
- Cấu trúc 5 → 6: nối 2 cột vào tab APPLICATION.
- File mới: `src/Application.gs`, `src/ApplicationUi.html`. Sửa: `Code.gs` (0.11.0), `Schema.gs`, `Repo.gs`, `Person.gs`, `PersonUi.html`, `Company.html`, `Jobs.html`, `Index.html`, `I18n.html`.

## 0.10.0 — 2026-10-19 — Bước 3.1 (Con người)

- Trang **Con người**: danh sách (tìm không dấu theo tên/mã/điện thoại/email; lọc trạng thái sàng lọc, recruiter, quốc tịch; hiện cả mục đã ẩn), hồ sơ chi tiết, thêm/sửa/ẩn/hiện lại; mã `PER-0001` (D-051).
- **Số hộ chiếu / 在留カード** lưu ở `HR_SENSITIVE_TEST`; danh sách không bao giờ có số; hồ sơ hiện dạng che (`****4567`), bấm "Hiện số" mới lấy số đủ; sửa để trống = giữ nguyên; nhật ký luôn `***`.
- **Cảnh báo nghi trùng** (D-022): trùng tên (bỏ dấu, hoa/thường, khoảng trắng) + ngày sinh + quốc tịch, hoặc trùng số hộ chiếu (kể cả người đã ẩn) → hiện danh sách người nghi trùng, chưa lưu gì; "Vẫn lưu" để lưu.
- **Cài đặt → Danh mục**: chọn loại (lĩnh vực, quốc tịch, tư cách lưu trú, tiếng Nhật, nguồn ứng viên); nạp sẵn 38 mục mới khi bấm Khởi tạo.
- Bảng nhiều cột (đơn tuyển, con người) chuyển dạng thẻ khi khung < 1100px; ngày không bị xuống dòng.
- Cấu trúc 4 → 5: nối 10 cột vào tab PERSON (sao lưu "Trước nâng cấp" trước).
- File mới: `src/Person.gs`, `src/PersonUi.html` (tên khác `Person` vì Apps Script không cho trùng tên). Sửa: `Code.gs` (0.10.0), `Schema.gs`, `Setup.gs`, `Repo.gs`, `Company.html`, `Jobs.html`, `Lookup.html`, `Index.html`, `I18n.html`.

## 0.9.1 — 2026-10-19 — Bước 2.3 (sửa giao diện)

- Bảng (công ty, đơn tuyển, người liên hệ, lĩnh vực) tự chuyển sang **dạng thẻ khi khung bảng hẹp hơn 900px** — kể cả cửa sổ máy tính thu nhỏ — thay vì phải kéo ngang và bị khuất cột Thao tác (ảnh chụp của chủ dự án, cửa sổ ~875px).
- File cần dán: `Code.gs` (0.9.1), `Index.html`. Dữ liệu: không đổi.

## 0.9.0 — 2026-10-19 — Bước 2.3 (Đơn tuyển, gộp 2.4)

- Trang **Đơn tuyển**: danh sách (bảng / thẻ trên điện thoại), tìm theo vị trí, tên công ty hoặc mã; lọc theo công ty, người phụ trách, trạng thái đơn, lĩnh vực; hiện cả mục đã ẩn; thêm/sửa/ẩn/hiện lại; bấm tên công ty → sang trang chi tiết công ty (D-049).
- Form đơn: chọn công ty (chỉ công ty đang hiện) → ô Lĩnh vực chỉ gồm lĩnh vực của công ty đó; người phụ trách 1 người; số lượng cần 1–9999; ngày dự kiến vào làm không được trước ngày nhận đơn. Máy chủ kiểm tra lại tất cả.
- **Trang chi tiết công ty** có thêm mục Đơn tuyển + nút "+ Thêm đơn" (công ty cố định).
- Cấu trúc 3 → 4: nối 8 cột mới vào tab JOB_ORDER (sao lưu "Trước nâng cấp" trước).
- File mới: `src/Jobs.html`. Sửa: `Code.gs` (0.9.0), `Schema.gs`, `Repo.gs`, `Company.html`, `Index.html`, `I18n.html`.

## 0.8.0 — 2026-10-19 — Bước 2.2 (Người liên hệ)

- **Trang chi tiết công ty**: bấm tên công ty trong danh sách → xem đủ thông tin, nút Sửa, nút "← Danh sách công ty" (giữ nguyên ô tìm/bộ lọc).
- **Người liên hệ** trong trang chi tiết: thêm/sửa/ẩn/hiện lại, lỗi hiện tại ô, mã `CT-0001`, liên hệ chính lên đầu kèm nhãn; bấm số điện thoại/email để gọi/gửi mail trên điện thoại (D-047).
- Liên hệ chính tối đa 1 người/công ty: đánh dấu người mới → máy chủ tự bỏ dấu người cũ và ghi nhật ký. Không đổi được công ty của người liên hệ.
- Cấu trúc 2 → 3: nối 7 cột mới vào tab CONTACT (sao lưu "Trước nâng cấp" trước).
- File mới: `src/Contact.html`. Sửa: `Code.gs` (0.8.0), `Schema.gs`, `Repo.gs`, `Company.html`, `Index.html`, `I18n.html`.

## 0.7.0 — 2026-10-19 — Bước 2.1 (Công ty)

- Trang **Công ty**: danh sách (bảng trên máy tính, dạng thẻ trên điện thoại), tìm theo tên/mã (không phân biệt hoa/thường, toàn/bán độ rộng), lọc theo người phụ trách (sales hoặc support) và trạng thái, hiện cả mục đã ẩn; form thêm/sửa với lỗi hiện ngay tại ô; ẩn/hiện lại; nhật ký AUDIT_LOG (D-045).
- Sales/support **nhiều người**; lĩnh vực **chọn nhiều**. Người đã nghỉ / lĩnh vực hết hiệu lực không chọn mới được nhưng vẫn giữ ở công ty cũ. Máy chủ kiểm tra lại mọi lựa chọn.
- **Cài đặt → Lĩnh vực**: danh mục sửa được, có từ ngày / đến ngày; nạp sẵn 19 lĩnh vực một lần khi bấm Khởi tạo.
- **Nâng cấp cấu trúc an toàn** (phiên bản 2): bấm Khởi tạo → sao lưu cả cặp (loại mới "Trước nâng cấp") → nối cột mới vào cuối tab COMPANY → thêm tab LOOKUP. Tiêu đề khác kiểu thì chỉ cảnh báo, không đổi phiên bản.
- File mới: `src/Company.html`, `src/Lookup.html`. Sửa: `Code.gs` (0.7.0), `Schema.gs`, `Setup.gs`, `Repo.gs`, `Backup.gs`, `Perf.gs`, `Index.html`, `I18n.html`.
- Dữ liệu / migration: cấu trúc 1 → 2 (thêm 9 cột COMPANY, thêm tab LOOKUP). Dữ liệu cũ giữ nguyên.

## 0.6.2 — 2026-10-19 — Bước 1.6c (đo kỹ hơn)

- F: mỗi thao tác đo **5 lần**; bảng hiện thời gian máy chủ (giữa), thời gian chờ (giữa) và lần chậm nhất, kèm Đạt/Không đạt cho **cả hai** (giữa và chậm nhất) vì Q2 chưa được chọn.
- G: dưới tên mỗi thao tác hiện thời gian máy chủ chia theo việc: khóa, kiểm tra file, mở file, đọc, ghi, nhật ký, khác. Chỉ ghi khi đo; dùng app bình thường không ghi gì thêm. Khi đo, app ép Google ghi ngay sau mỗi lần ghi để số liệu đúng chỗ.
- H: Khởi tạo / Tạo dữ liệu giả luôn để sẵn ≥ 500 dòng trống đã định dạng, để việc thêm dòng không rơi vào lúc người dùng bấm lưu.
- File cần dán: `Code.gs` (0.6.2), `Repo.gs`, `Setup.gs`, `Perf.gs`, `PerfUi.html`, `I18n.html`. Sau đó bấm **Khởi tạo** một lần rồi **Đo tốc độ** (mất khoảng 1,5–2 phút).
- Dữ liệu / migration: không đổi cấu trúc.

## 0.6.1 — 2026-10-19 — Bước 1.6b (tối ưu tốc độ)

- A: mỗi thao tác chỉ mở file dữ liệu và kiểm tra tiêu đề mỗi tab **một lần** (trước đây mở lại cho cả bảng chính và nhật ký). Bộ nhớ tạm xóa ở đầu mỗi thao tác nên không dùng lại dữ liệu cũ (kể cả ngay sau khôi phục).
- B: tạo/sửa/ẩn chỉ đọc cột cần (cột `ma` để sinh mã, cột `id` để tìm dòng, rồi đúng 1 dòng) thay vì đọc cả bảng.
- C: định dạng chữ thuần `@` cho cả tab **một lần** khi bấm Khởi tạo / Tạo dữ liệu giả; app ghi nhớ file nào đã định dạng. File chưa ghi nhớ (vd. vừa khôi phục) vẫn định dạng từng dòng như cũ → an toàn. Hết dòng trống thì nối thêm 500 dòng đã định dạng.
- E: danh sách chỉ gửi về trình duyệt các cột hiển thị (STAFF: id, mã, họ tên, trạng thái, sửa lúc, đã ẩn).
- Không làm D (bộ nhớ tạm 10 phút) theo quyết định D-042.
- File cần dán: `Code.gs` (0.6.1), `Repo.gs`, `Setup.gs`, `Perf.gs`. Sau đó bấm **Khởi tạo** một lần và **Tạo/bổ sung dữ liệu giả** một lần.
- Dữ liệu / migration: không đổi cấu trúc. Thêm thuộc tính `TEST_TEXTFMT_DATA`, `TEST_TEXTFMT_PERF` (mã file đã định dạng).

## 0.6.0 — 2026-10-19 — Bước 1.6

- Khu **Đo tốc độ** trong trang Cài đặt (D-041): tạo/bổ sung dữ liệu giả trong file riêng `HR_PERF_TEST` (STAFF/COMPANY/JOB_ORDER/PERSON 1.000, APPLICATION 3.000, AUDIT_LOG 10.000), rồi đo từng thao tác: mở app, danh sách 1.000 dòng, đọc 3.000 dòng, tạo/sửa/ẩn 1 bản ghi; hiển thị thời gian máy chủ và thời gian người dùng chờ, so với ngưỡng (danh sách ≤3s, lưu ≤3s, mở app ≤5s).
- `Repo.gs`: thêm `dataFileKey_` để riêng lần đo chạy trên `HR_PERF_TEST`, luôn trả về `HR_DATA_TEST` sau đó (kể cả khi lỗi).
- File mới `src/Perf.gs`, `src/PerfUi.html`, `tests/perf.test.js`; sửa `Code.gs` (0.6.0), `Index.html`, `I18n.html`, `Setup.gs`, `Repo.gs`, `tests/ui.test.js`.
- Dữ liệu / migration: không đổi cấu trúc. `HR_PERF_TEST` không nằm trong bản sao lưu.

## 0.5.0 — 2026-10-19 — Bước 1.5

- Sao lưu theo cặp (`HR_DATA_TEST` + `HR_SENSITIVE_TEST`) vào `HR Tokutei (TEST)/HR_BACKUP_TEST`, tên `<file>__<ngày>_<giờ JST>__<auto|manual|pre-restore>` (D-017, D-040).
- Lịch tự động mỗi tối ~21:30 JST; chỉ sao lưu vào ngày 15 và ngày cuối tháng; đã có bản tự động trong ngày thì bỏ qua.
- Dọn bản quá 12 tháng vào thùng rác Drive sau mỗi lần sao lưu.
- Khôi phục bằng nút trong app: sao lưu hiện trạng trước, tạo đủ cặp file mới rồi mới chuyển sang dùng, file cũ chuyển vào `Đã thay thế`.
- Trang Cài đặt: khu vực Sao lưu (bật tự động, sao lưu ngay, danh sách, cảnh báo lỗi/quá 16 ngày, xác nhận trước khi khôi phục).
- File mới `src/Backup.gs`, `src/BackupUi.html` (đổi từ `Backup.html` vì Apps Script không cho trùng tên với `Backup.gs`), `tests/backup.test.js`; sửa `Code.gs` (0.5.0), `Index.html`, `I18n.html`, `Setup.gs` (tên thư mục), `tests/fakes.js`, `tests/ui.test.js`.
- Quyền mới: tạo lịch tự động (ScriptApp) — cần cấp quyền lại.
- Dữ liệu / migration: không đổi cấu trúc (vẫn phiên bản 1).

## 0.4.0 — 2026-10-19 — Bước 1.4

- Lõi ghi dữ liệu dùng chung `src/Repo.gs`: ID tự sinh + mã tăng dần (STF-0001…), kiểm tra dữ liệu, khóa khi ghi, chống ghi đè bản cũ (CONFLICT), ẩn thay xóa (`da_an = Y`), nhật ký AUDIT_LOG (giá trị cũ → mới, che số giấy tờ), ghi dạng chữ thuần để Sheets không tự đổi kiểu, dừng ghi nếu tiêu đề cột khác thiết kế.
- Danh sách **Nhân viên phụ trách** trong trang Cài đặt: thêm, sửa, ẩn, hiện lại, "Hiện cả mục đã ẩn" (D-038, D-039). File mới `src/Staff.html`.
- Bấm "Khởi tạo" gắn bảo vệ "chỉ cảnh báo" cho mọi tab (D-016).
- Thông báo lỗi dễ hiểu VI/JA cho các mã lỗi server.
- Test: `tests/fakes.js` (giả lập dùng chung), `tests/repo.test.js` mới; mở rộng `setup.test.js`, `ui.test.js`.
- File cần dán: `Code.gs`, `Index.html`, `I18n.html`, `Setup.gs` (thay nội dung); `Repo.gs`, `Staff.html` (mới). `Schema.gs`, `appsscript.json` không đổi.
- Dữ liệu / migration: không đổi cấu trúc (vẫn phiên bản 1). Quy ước mới: giá trị `trang_thai` của STAFF lưu mã `dang_lam` / `da_nghi`; `da_an` = `Y` khi ẩn.

## 0.3.0 — 2026-10-19 — Bước 1.3

- Trang **Cài đặt**: nút "Khởi tạo dữ liệu thử nghiệm", hiển thị trạng thái, phiên bản cấu trúc và link tới từng file (D-036).
- Tạo trong Drive: thư mục `HR Tokutei (TEST)` gồm `HR_DATA_TEST` (13 tab theo ERD + `_META`), `HR_SENSITIVE_TEST` (tab `PERSON_SENSITIVE`), thư mục `HR_FILES_TEST` (D-037).
- Bấm nhiều lần an toàn: chỉ tạo phần thiếu; tiêu đề khác thiết kế chỉ cảnh báo; file đã vào thùng rác thì báo lỗi, không tự tạo file mới.
- Thêm `src/Schema.gs`, `src/Setup.gs`, `tests/setup.test.js`. Sửa `Code.gs` (0.3.0), `Index.html`, `I18n.html`.
- Quyền mới: Google Drive + Google Sheets đầy đủ (D-035) — cần cấp quyền một lần.
- Dữ liệu / migration: tạo cấu trúc phiên bản 1 (`_META.schema_version = 1`). Chưa có dữ liệu.

## 0.2.0 — 2026-10-19 — Bước 1.2

- Khung app: menu 9 mục (D-032), nút VI / 日本語 lưu theo trình duyệt (D-033), menu ☰ trên điện thoại, đồng hồ JST chạy liên tục.
- Các trang chưa làm hiện "Sẽ làm ở giai đoạn X".
- Thêm `src/I18n.html` (bảng chữ Việt – Nhật) và `tests/ui.test.js` (kiểm tra giao diện bằng jsdom).
- File cần dán vào Apps Script: `Code.gs`, `Index.html` (thay nội dung), `I18n.html` (file mới). `appsscript.json` không đổi.
- Dữ liệu / migration: không có.

## 0.1.0 — 2026-10-19 — Bước 1.1

- Thêm `src/appsscript.json`: múi giờ Asia/Tokyo, web app chạy dưới quyền chủ project, chỉ chủ project truy cập.
- Thêm `src/Code.gs`, `src/Index.html`: trang "xin chào" hiển thị tên app, phiên bản, giờ JST.
- Thêm `README.md` (hướng dẫn cài bản thử nghiệm) và bộ tài liệu `docs/`.
- File cần dán vào Apps Script: `appsscript.json`, `Code.gs`, `Index.html`.
- Dữ liệu / migration: không có (chưa tạo file Sheets nào).
