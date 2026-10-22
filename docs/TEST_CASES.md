# TEST_CASES.md

Kết quả: `PASS` (đã chạy và quan sát) / `FAIL` / `NOT RUN`. Chỉ dùng dữ liệu giả.

## Bước 1.1 — Trang "xin chào"

| Mã | Tình huống | Thao tác | Kết quả kỳ vọng | Kết quả |
|---|---|---|---|---|
| T1.1-1 | Mở trên máy tính | Mở link `/dev` bằng Gmail của bạn | Thấy "Xin chào — HR Tokutei", phiên bản 0.1.0, giờ JST đúng (= giờ VN + 2 tiếng) | PASS (2026-10-19, chủ dự án xác nhận, mở bằng cửa sổ ẩn danh). Lần 1 FAIL do nhiều tài khoản Google |
| T1.1-2 | Mở trên điện thoại | Mở cùng link, trình duyệt đã đăng nhập cùng Gmail | Hiển thị gọn, không cuộn ngang | NOT RUN |
| T1.1-3 | Kiểm tra repo | Xem repo trên GitHub | Có đủ file; không có khóa bí mật hay dữ liệu thật | NOT RUN |

## Bước 1.2 — Khung app

`tests/ui.test.js` (jsdom, ngoài Apps Script) đã chạy: PASS 8 nhóm kiểm tra — đổi trang, đổi ngôn ngữ, nhớ lựa chọn, giá trị rác, menu ☰, đồng hồ. Kết quả dưới đây là test thật trên link `/dev`. Chủ dự án đã duyệt bước 1.2 ngày 2026-10-19 nhưng chưa báo kết quả từng test, nên các dòng vẫn ghi NOT RUN.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T1.2-1 | Bấm từng mục menu | Chuyển đúng trang, mục đang chọn được tô màu | NOT RUN |

## Bước 1.3 — Khởi tạo dữ liệu thử nghiệm

`tests/setup.test.js` (Drive/Sheets giả lập) đã chạy: PASS 6 nhóm — tạo lần đầu, bấm lần hai, tạo lại tab bị xóa mà giữ dữ liệu, tiêu đề bị sửa chỉ cảnh báo, file trong thùng rác báo lỗi không tạo mới, trạng thái khi chưa khởi tạo. `tests/ui.test.js`: PASS 10 nhóm (thêm trang Cài đặt). Dưới đây là test thật trên Google. Chủ dự án đã duyệt bước 1.3 ngày 2026-10-19 nhưng chưa báo kết quả từng test.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T1-04 | Bấm "Khởi tạo" lần đầu | Có đủ thư mục, 2 file, 14 tab (13 + _META) có tiêu đề, file nhạy cảm 1 tab | NOT RUN |
| T1.3-2 | Bấm lần hai | Báo "đã có đủ", không thêm file | NOT RUN |
| T1.3-3 | Tự xóa 1 tab trong HR_DATA_TEST rồi bấm lại | Chỉ tab đó được tạo lại | NOT RUN |
| T1.3-4 | Xem chia sẻ của thư mục và 2 file | Chỉ mình bạn có quyền | NOT RUN |
| T1.3-5 | Đổi 日本語 ở trang Cài đặt | Nút và thông báo đổi theo | NOT RUN |

## Bước 1.4 — Ghi dữ liệu an toàn (nhân viên)

Test tự động đã chạy (giả lập): `repo.test.js` PASS — tạo/mã tăng dần/nhật ký, dữ liệu sai bị chặn, bỏ qua trường cấm sửa, sửa ghi cũ→mới, không đổi thì không ghi nhật ký, CONFLICT, ẩn/hiện lại, NOT_FOUND, tiêu đề sai dừng ghi, che số giấy tờ. `setup.test.js` PASS 7 nhóm (thêm bảo vệ tab). `ui.test.js` PASS 11 nhóm (thêm màn hình nhân viên). Bảng dưới là test thật trên Google, xem các dòng T1-05 → T1-10 ở mục Giai đoạn 1 và:

Chủ dự án duyệt bước 1.4 ngày 2026-10-19 ("chưa thấy lỗi"), có sửa lỗi giao diện nút Lưu/Hủy; chưa báo kết quả từng test.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T1.4-1 | Mở 2 tab, sửa cùng một nhân viên ở cả hai, lưu tab thứ hai | Tab thứ hai bị từ chối, danh sách tải lại | NOT RUN |
| T1.4-2 | Bấm "Hiện lại" một nhân viên đã ẩn | Quay lại danh sách; AUDIT_LOG có dòng `hien` | NOT RUN |

## Bước 1.5 — Sao lưu & khôi phục

Test tự động đã chạy (giả lập): `backup.test.js` PASS — ngày 15/cuối tháng (cả tháng 2 năm nhuận), sao lưu ngay 2 lần, bật tự động 2 lần chỉ 1 lịch, bỏ qua ngày thường và chạy trùng, dọn bản quá 12 tháng (giữ bản đúng 12 tháng, không đụng file lạ), cặp thiếu file không khôi phục, ghi/xóa lỗi, cảnh báo quá 16 ngày, khôi phục và khôi phục ngược. `ui.test.js` PASS 12 nhóm. Bảng dưới là test thật trên Google, cùng các dòng T1-11 → T1-14 ở mục Giai đoạn 1:

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T1.5-1 | Bấm "Sao lưu ngay" 2 lần | 2 cặp bản sao, tên khác nhau theo giờ | PASS (2026-10-19, ảnh chụp: 2 cặp 16:03:51 và 16:06:09 JST, "Đủ 2 file"). Lần 1 FAIL do quyền mới chưa được cấp cho phiên web; chạy `backupNow` trong trình soạn thảo một lần thì hết |
| T1.5-2 | Bấm "Bật sao lưu tự động" rồi xem Triggers trong trình soạn thảo | Chỉ 1 lịch `runScheduledBackup` | PASS một phần (2026-10-19, ảnh chụp: "đang bật", nút bật đã ẩn); chưa xem số lịch trong Trình kích hoạt |
| T1.5-3 | Thêm 1 nhân viên, khôi phục bản trước đó | Nhân viên mới biến mất; có bản "Trước khôi phục"; file cũ nằm trong "Đã thay thế" | PASS (2026-10-19, ảnh chụp: khôi phục từ 2026-10-19_160609__manual, có bản 161418__pre-restore "Đủ 2 file", STF-0001 về trạng thái đã ẩn như lúc sao lưu). Chưa xem thư mục "Đã thay thế". Có sửa lỗi giao diện hộp xác nhận |

## Bước 1.6 — Đo tốc độ

Test tự động đã chạy (giả lập): `perf.test.js` PASS — dữ liệu giả đúng số lượng trong file riêng, chạy lại chỉ bù phần thiếu, các thao tác đo chạy trên file đo, `HR_DATA_TEST` không đổi, lỗi giữa chừng vẫn quay về `HR_DATA_TEST`, file đo không bị sao lưu. `ui.test.js` PASS 13 nhóm. **Thời gian đo trong giả lập không có ý nghĩa** — số thật chỉ có khi chạy trên Google.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T1-17 | Cài đặt → Đo tốc độ | Bảng kết quả 6 dòng; ghi lại số giây thật; danh sách ≤3s, lưu ≤3s, mở app ≤5s | Lần 1 (2026-10-19, ảnh chụp; máy chủ / người dùng chờ, giây): mở app — / 0,10 ĐẠT; danh sách 1.000 dòng 1,50 / 2,90 ĐẠT; đọc 3.000 dòng 1,34 / 3,01 KHÔNG ĐẠT; tạo 2,82 / 4,26 KHÔNG ĐẠT; sửa 2,75 / 4,08 KHÔNG ĐẠT; ẩn 2,62 / 3,66 KHÔNG ĐẠT. Chuẩn bị dữ liệu giả 57,2 giây |
| T1.6-2 | Mở `HR_DATA_TEST` sau khi đo | Không có dòng "Dữ liệu giả"/"Đo tốc độ" nào | NOT RUN |

## Bước 1.6b — Tối ưu tốc độ

Test tự động (giả lập): `repo.test.js` PASS — thêm kiểm tra: file đã định dạng thì ghi không định dạng lại; hết dòng thì nối khối 500 dòng đã định dạng; mất cờ thì quay về định dạng từng dòng; danh sách chỉ trả 6 cột. `setup.test.js`, `backup.test.js` (khôi phục xong đọc đúng file mới), `perf.test.js`, `ui.test.js` PASS.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T1.6b-1 | Dán 4 file, bấm Khởi tạo 1 lần, Tạo/bổ sung dữ liệu giả 1 lần, rồi Đo tốc độ | Cả 6 dòng ĐẠT (người dùng chờ: danh sách/đọc ≤3s, tạo/sửa/ẩn ≤3s, mở app ≤5s) | FAIL — lần 2 (2026-10-19, ảnh chụp; máy chủ / người dùng chờ, giây): mở app — / 0,11 ĐẠT; danh sách 1,52 / 2,75 ĐẠT; đọc 3.000 dòng 1,95 / 3,53 KHÔNG ĐẠT; tạo 4,27 / 5,56 KHÔNG ĐẠT; sửa 1,89 / 3,07 KHÔNG ĐẠT; ẩn 2,90 / 4,05 KHÔNG ĐẠT. Chuẩn bị dữ liệu giả 12,4 giây. Nhận xét: sửa và ẩn chạy cùng một đoạn code nhưng lệch 1 giây → đo 1 lần chưa đủ tin cậy |
| T1.6b-2 | Nhân viên phụ trách: thêm, sửa, ẩn, hiện lại 1 người | Hoạt động như bản 0.6.0; mã STF tiếp tục tăng; AUDIT_LOG có dòng mới | NOT RUN |
| T1.6b-3 | Mở `HR_DATA_TEST` → tab STAFF, chọn cột bất kỳ ở dòng trống → Định dạng → Số | Đang là "Văn bản thuần túy" | NOT RUN |

## Bước 1.6c — Đo kỹ hơn

Test tự động (giả lập): `perf.test.js` PASS — sau khi chuẩn bị mọi tab còn ≥ 500 dòng trống; tạo bản ghi không thêm dòng; thời gian chia đủ 7 việc; ngoài lúc đo không ghi thời gian. `ui.test.js` PASS — 5 vòng × 5 thao tác, sửa/ẩn đúng bản ghi vừa tạo trong vòng, bảng 7 cột, dòng chia nhỏ, giá trị giữa. `setup`, `repo`, `backup` PASS.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T1.6c-1 | Dán 6 file, bấm Khởi tạo 1 lần, rồi Đo tốc độ | Bảng 6 dòng, 7 cột; dòng nhỏ dưới mỗi thao tác máy chủ; trạng thái hiện "lần n/5". Gửi ảnh chụp | PASS (hiển thị) — lần 3 (2026-10-19, ảnh chụp; máy chủ giữa / chờ giữa / chờ chậm nhất, giây): mở app — / 0,10 / 0,10; danh sách 1.000 dòng 1,48 / 2,75 / 3,59; đọc 3.000 dòng 1,91 / 3,38 / 4,15; tạo 3,59 / 4,89 / 5,36; sửa 3,29 / 4,41 / 4,72; ẩn 2,96 / 3,94 / 6,65. Chia nhỏ khi tạo: khóa 0,17 · kiểm tra file 0,30 · mở file 1,06 · đọc 0,64 · ghi 0,60 · nhật ký 0,57 · khác 0,20. Ngưỡng 3s: chỉ danh sách 1.000 dòng đạt (theo giữa) |
| T1.6c-2 | Mở `HR_PERF_TEST` → tab STAFF và AUDIT_LOG, kéo xuống cuối | Có ≥ 500 dòng trống ở cuối mỗi tab | NOT RUN |
| T1.6c-3 | Thêm/sửa 1 nhân viên trong Cài đặt | Như cũ, không chậm hơn | NOT RUN |

## 0.32.0 — GĐ 11.3–11.4: 定期面談 theo quý + vấn đề phát sinh (D-081)

Test tự động (giả lập), đều PASS: `mendan.test.js` (hàm quý; ai cần phỏng vấn theo quý; lọc CS / người thực hiện / tình trạng; kiểm tra dữ liệu MENDAN, chặn trùng người + quý, quý mới không ghi đè; quá hạn; 支援なし không cần; vấn đề: bắt buộc, nhiều người, từ 定期面談, việc cần làm theo phụ trách / phối hợp, lịch sử không sửa được, đã giải quyết hết nhắc, ngày liên hệ lại); `dashboard.test.js` (nhắc 定期面談 theo quý, nhật ký cũ vẫn tính, đổi số ngày); `ui.test.js` nhóm 38 (trang 定期面談, đặt lịch, tạo vấn đề, danh sách / chi tiết / lịch sử, tiếng Nhật); `demo.test.js`.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T16-1 | Cập nhật code → Khởi tạo / nâng cấp dữ liệu | Thêm tab MENDAN, INCIDENT, INCIDENT_LOG; cấu trúc 18 | NOT RUN |
| T16-2 | Menu 定期面談 → quý này | Thấy người đang làm (trừ 支援なし), lọc Chưa hoàn thành / Quá hạn | NOT RUN |
| T16-3 | Bấm Đặt lịch / ghi → Hoàn thành + ngày + nội dung | Dòng chuyển Hoàn thành; hồ sơ người có lịch sử quý đó | NOT RUN |
| T16-4 | Bấm Tạo vấn đề → lưu → thêm lần xử lý | Vấn đề có "Từ 定期面談", lịch sử theo ngày | NOT RUN |
| T16-5 | Tổng quan → Việc cần làm | Có 定期面談 quá hạn / sắp hết quý, vấn đề sắp hạn; nút mở đúng trang | NOT RUN |

## 0.31.0 — GĐ 11.1–11.2: giấy tờ + 受入れ前 (D-080)

Test tự động (giả lập), đều PASS: `prep.test.js` (内定 tự mở 受入れ前 đúng loại / CS / ngày; 内定承諾 không mở thêm; mẫu công việc + mẫu giấy tờ; tạo tay; link chỉ https; trạng thái giấy tờ mới, bên cung cấp, hạn; kho giấy tờ dùng lại; giấy tờ còn thiếu + lọc; việc cần làm; tiến độ; xác nhận vào làm qua lần giới thiệu / trực tiếp; hủy "đã vào làm" → quay lại; kết thúc không vào làm → tự hủy; quyền), `ui.test.js` nhóm 37, các bộ cũ. Ảnh chụp với máy chủ giả lập + dữ liệu mẫu.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T15-1 | Cập nhật code → Khởi tạo / nâng cấp dữ liệu | Thêm tab PERSON_DOC, PRE_ENTRY, PRE_TASK; nối cột CASE_DOCUMENT; cấu trúc 17 | NOT RUN |
| T15-2 | Đổi 1 lần giới thiệu sang 内定 | Menu 受入れ前 có hồ sơ mới với 9 (nước ngoài) / 7 (trong nước) công việc | NOT RUN |
| T15-3 | Trong 受入れ前: sửa công việc, thêm giấy tờ, dán link Drive, Xác nhận đã vào làm | Lưu được; sau xác nhận người sang Đang làm việc | NOT RUN |
| T15-4 | Hồ sơ người → Kho giấy tờ → thêm; mở checklist có cùng giấy tờ | Hiện "Đã có trong kho … Dùng giấy tờ đã lưu" | NOT RUN |
| T15-5 | Menu Giấy tờ còn thiếu → lọc Quá hạn nhận | Chỉ còn giấy tờ quá hạn; bấm mã hồ sơ mở đúng hồ sơ | NOT RUN |

## 0.30.0 — Nhập file quản lý cũ (D-079)

Test tự động (giả lập, file Excel GIẢ `tests/fixtures/legacy_fake.xlsx`), đều PASS: `legacy.test.js` (đọc xlsx: chuỗi dùng chung, bỏ phiên âm, ô gộp, ô ngày, xuống dòng; nhận sheet / tiêu đề; chỉ chủ; kiểm tra không ghi; nhập công ty + liên hệ + hợp đồng từ tháng này; người + số 在留カード ở file nhạy cảm + lần vào làm theo 勤務状況; khớp 名義 = pháp nhân + cơ sở; trùng → thêm lần vào làm; nhập lại không trùng; Đang làm việc / Việc cần làm / doanh số gợi ý đúng; bổ sung ngày; hồ sơ thiếu ngày sinh vẫn sửa được), `ui.test.js` nhóm 36, `setup.test.js` (cấu trúc 16). Chạy thêm trên FILE THẬT trong máy giả lập + Chromium (chỉ in số đếm, không lưu dữ liệu): đọc file 0,25 giây; 310 công ty, 1.201 người, 1.128 lần vào làm, 0 lỗi; nhập lần 2 không thêm gì. Ảnh chụp chỉ dùng file giả.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T14-1 | Cập nhật code → Cài đặt → Khởi tạo / nâng cấp dữ liệu | Báo nối cột COMPANY / PERSON / EMPLOYMENT, cấu trúc 16 | NOT RUN |
| T14-2 | Nhập file quản lý cũ → chọn file Excel → Kiểm tra | Thấy 2 sheet, số người / công ty mới, danh sách nhân viên sẽ tạo | NOT RUN |
| T14-3 | Sao lưu rồi nhập (chờ tới khi xong) | Không lỗi; Đang làm việc có ~620 người đang làm | NOT RUN |
| T14-4 | Mở 1 người đã nhập | Thấy CS / giấy tờ phụ trách, số 在留カード (che), ghi chú chữ gốc | NOT RUN |

## 0.29.0 — Dữ liệu mẫu (D-078)

Test tự động (giả lập), đều PASS: `demo.test.js` (chưa Khởi tạo → báo; không phải chủ → chặn; chạy hết; lần 2 → "đã tạo"; đếm đúng từng bảng; trạng thái giới thiệu đủ loại; visa được cấp cập nhật hạn lưu trú; Việc cần làm có đủ 12 loại; doanh số đủ 6 loại; 4 hóa đơn đúng tình trạng; chạy chia nhiều lần gọi không thừa bản ghi; bản thật → từ chối), `ui.test.js` nhóm 35, `auth.test.js` (nhân viên / quản lý không gọi được). Đã chụp màn hình với máy chủ giả lập đã tạo dữ liệu mẫu (Tổng quan, Doanh số, Hóa đơn, Visa, Đang làm việc).

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T13-1 | Cài đặt → Tạo dữ liệu mẫu, chờ tới khi báo xong | Hiện "Đã tạo xong"; không lỗi; nút bị khóa | NOT RUN |
| T13-2 | Mở Tổng quan / Việc cần làm | Có phỏng vấn ngày mai, hồ sơ visa quá 30 ngày, hóa đơn quá hạn, sắp hết hạn lưu trú… | NOT RUN |
| T13-3 | Bấm lại Tạo dữ liệu mẫu (tải lại trang) | Báo "đã được tạo trước đó", không thêm gì | NOT RUN |

## 0.28.0 — Bảng phân quyền (D-077)

Test tự động (giả lập), đều PASS: `auth.test.js` (mặc định nhân viên xem được số đầy đủ; doanh số của mình đúng phần %, mục tiêu; chủ không có "của tôi"; chủ lưu bảng quyền, xung đột; nhân viên / quản lý không lưu được bảng; tắt số giấy tờ / doanh số của mình → bị chặn; bật hợp đồng cho nhân viên → đọc được; tắt hóa đơn cho quản lý → bị chặn; không có quyền số → kiểm tra trùng không dùng số hộ chiếu; người có cài đặt chung không đổi được vai trò). `ui.test.js` nhóm 34 (menu theo quyền, trang Doanh số của tôi, nút Hiện số; bảng Phân quyền lưu đúng). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T12-1 | Cài đặt → Phân quyền: xem mặc định | Nhân viên: tick 2 dòng đầu; Quản lý: tick hết | NOT RUN |
| T12-2 | Mở liên kết nhân viên → Doanh số | Chỉ thấy "Doanh số của tôi" | NOT RUN |
| T12-3 | Tắt "Xem số giấy tờ đầy đủ" cho Nhân viên → nhân viên tải lại hồ sơ người | Không còn nút Hiện số | NOT RUN |

## 0.27.1 — Sửa bảo mật (D-076)

Test tự động (giả lập), đều PASS: `auth.test.js` (quản lý / nhân viên gọi `eval`, hàm nội bộ, `constructor` → bị chặn; nhân viên chỉ nhận tên công ty từ cài đặt tài chính; nhân viên nhập trùng số hộ chiếu không bị báo "trùng"; sao lưu theo lịch: người ngoài / mã kích hoạt giả bị chặn, đúng trình kích hoạt thì chạy). Chạy lại script chứng minh lỗ hổng của bản kiểm tra độc lập → bị chặn (FORBIDDEN|eval).

## 0.27.0 — Nhiều người dùng (D-075)

Test tự động (giả lập), đều PASS: `auth.test.js` (mới — cấp liên kết: chỉ lưu mã băm, không gửi mã băm, nhật ký che; người đã nghỉ không cấp; người Gmail khác gọi thẳng → bị chặn mọi hàm dữ liệu, khởi tạo, khôi phục, cấp liên kết; trang từ chối khi không có / sai liên kết; nhân viên qua api: được hồ sơ, bị chặn doanh số / hóa đơn / hợp đồng / xuất / nhập / sửa nhân viên, danh mục / 入金 / hiện số đầy đủ / hàm nội bộ / gọi lồng api; nhật ký ghi tên nhân viên; quyền không "dính" sang lần gọi thẳng; quản lý: xem tiền và số đầy đủ, không khởi tạo / khôi phục / cấp liên kết; trình kích hoạt sao lưu vẫn chạy; thu hồi / cho nghỉ → hết hiệu lực ngay). `ui.test.js` nhóm 32–33 (gọi qua api kèm token, ẩn menu, không tải hợp đồng, không nút hiện số; chủ cấp / thu hồi / đổi vai trò, liên kết hiện một lần).

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T11-1 | Sửa bản triển khai: truy cập = Bất kỳ ai có Tài khoản Google → mở link /exec bằng tài khoản chủ | Dùng bình thường | NOT RUN |
| T11-2 | Cài đặt → Nhân viên → Tạo liên kết cho 1 nhân viên thử → mở liên kết bằng **Gmail khác** (cửa sổ ẩn danh) | Vào được; không có Doanh số / Hóa đơn / Cài đặt; góc trên có tên | NOT RUN |
| T11-3 | Mở link /exec (không có ?k=) bằng Gmail khác | Trang "không có quyền" | NOT RUN |
| T11-4 | Bấm Thu hồi → tải lại trang của nhân viên | "Liên kết không hợp lệ hoặc đã bị thu hồi" | NOT RUN |
| T11-5 | Nhân viên tạo 1 công ty thử → AUDIT_LOG | Người sửa = "STF-xxxx Tên (liên kết)" | NOT RUN |

## 0.26.0 — Tỷ lệ chuyển đổi, 定期届出, phiếu giới thiệu (D-073, D-074)

Test tự động (giả lập), đều PASS: `dashboard.test.js` (tỷ lệ: 5 bậc cộng dồn, theo recruiter, lọc, tháng trống, mặc định 6 tháng; 定期届出: không có ai trong kỳ → không nhắc, chưa tới N ngày → không nhắc, nhắc đúng công ty + kỳ + hạn 31/5, lọc support, công ty sai, đã nộp → hết nhắc). `import.test.js` (dòng trùng ở lô sau). `ui.test.js` nhóm 30–31 (băng nâng cấp ẩn khi đúng phiên bản; thẻ tỷ lệ + đổi tháng; nút Đã nộp; phiếu giới thiệu đủ mục, không có điện thoại / email / địa chỉ / số giấy tờ, lời giới thiệu hiện ngay, in có nhật ký). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T10-1 | Tổng quan → Tỷ lệ chuyển đổi | Số bậc hợp lý với dữ liệu thử | NOT RUN |
| T10-2 | Việc cần làm (dữ liệu thử có người làm trong 4/2025–3/2026) | Có "定期届出" theo công ty, hạn 2026-05-31 (quá hạn) → bấm Đã nộp → hết | NOT RUN |
| T10-3 | Hồ sơ người → Phiếu giới thiệu (in) → gõ lời giới thiệu → In / lưu PDF | Bản in tiếng Nhật, không có điện thoại / email / số giấy tờ; AUDIT_LOG có `in_phieu` | NOT RUN |

## 0.25.1 — Sửa sau kiểm tra độc lập (D-072)

Test tự động (giả lập), đều PASS: `finance.test.js` (khoản trả người giới thiệu thứ 2 bị chặn; hủy "Đã vào làm" khi đã có tiền bị chặn; 入金 không hiện lại sau khi hủy hóa đơn; chia cọc nhưng vào làm thẳng → cả phí; cọc chờ lập + vào làm → 1/2 + phần còn lại; bỏ qua cọc → cả phí). `import.test.js` (cột chữ văn bản thuần; báo đúng dòng trùng).

## 9a + 9b — Bản thật, nhập CSV, xuất dữ liệu (D-070, D-071)

Test tự động (giả lập), đều PASS: `import.test.js` (mới — mặc định TEST; `setProdEnv` từ chối project đã có dữ liệu thử; project mới → PROD, file không có `_TEST`; nhập: bảng không cho phép, quá 100 dòng, nhân viên, công ty với nhân viên nhiều người / danh mục VI-JA / không tìm thấy (báo giá trị), kiểm tra thử không ghi, nhân viên đã nghỉ vẫn nhận, tỉnh sai, liên hệ theo tên viết tắt, đơn tuyển với ngày nhiều dạng + "3名" + lĩnh vực phải thuộc công ty, con người: số hộ chiếu vào file nhạy cảm, trùng trong cùng file / trùng số hộ chiếu với người cũ bị bỏ qua, ngày sai, nhật ký không có số; xuất: loại sai, tháng sai, tên file, thư mục, tiêu đề song ngữ, tên thay ID, không có số giấy tờ, đủ 7 loại, nhật ký). `ui.test.js` nhóm 29 (đọc CSV có BOM / ngoặc kép / xuống dòng trong ô, ghép cột tự động, đổi nhãn trạng thái → mã, phải Kiểm tra trước khi Nhập, báo lỗi theo dòng CSV, xuất theo tháng → link mở tab mới).

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T9-1 | Bản thử: Sheets cũ (dữ liệu GIẢ) → tải CSV tab nhân viên → Cài đặt → Nhập → Kiểm tra → Nhập | Nhân viên xuất hiện; lỗi báo đúng dòng | NOT RUN |
| T9-2 | Làm tương tự cho công ty, đơn tuyển, con người | Tham chiếu theo tên được nhận; người trùng bị bỏ qua | NOT RUN |
| T9-3 | Xuất "Con người" → mở file → Tệp → Tải xuống → Excel | File mở được, không có số hộ chiếu | NOT RUN |
| T9-4 | (Khi sẵn sàng) Tạo bản thật theo README "Tạo bản thật" | Không có băng vàng; file không đuôi `_TEST` | NOT RUN |

## GĐ 5 + 8 — Doanh số, mục tiêu, hóa đơn, 入金, người giới thiệu (D-069)

Test tự động (giả lập), đều PASS: `finance.test.js` (mới — cài đặt tài chính: khoảng giá trị, số T, xung đột; hợp đồng: bắt buộc, số Yên, bậc hoàn tiền, ngày kết thúc; gợi ý: chưa tới ngày thì chưa phát sinh, phí giới thiệu + phí hỗ trợ từng tháng theo hợp đồng ở ngày phát sinh, chia mặc định recruiter 60 / sales 40 và chia đều support, lập có sửa số tiền, lập lại → xung đột, chia sai, bỏ qua (0 ¥) không gợi ý lại, ẩn khoản → gợi ý quay lại, lập tất cả; nghỉ sau 26 ngày → hoàn 100% phí đã lập; cọc 1/2 làm tròn xuống + phần còn lại; khoản tay, không đổi loại / công ty; mục tiêu: sửa thay vì thêm dòng; báo cáo tháng theo %, theo loại, 12 tháng; hóa đơn: khoản công ty khác / đã vào hóa đơn khác → chặn, khoản đã vào hóa đơn không sửa / ẩn, nháp tạm tính, không 入金 cho nháp, phát hành chốt thuế (đổi thuế sau không đổi hóa đơn cũ), 入金 một phần → chờ thu → quá hạn → Việc cần làm (lọc theo sales) → thu đủ, không hủy khi đã có 入金, hủy cần lý do + trả khoản về, hóa đơn hoàn tiền âm (thuế làm tròn về 0) + 入金 âm; người giới thiệu: chưa tới ngày vào làm, gợi ý số tiền mặc định, lần vào làm của người khác bị chặn, đã trả). `dashboard.test.js`, `setup.test.js` (25 tab, phiên bản 14, PERSON thêm cột khi nâng cấp). `ui.test.js` nhóm 27 (hợp đồng trong chi tiết công ty, lỗi theo ô, Cài đặt tài chính, Cần lập: sửa số tiền + lập / lập tất cả, hoàn tiền tô vàng, Báo cáo: KPI, mục tiêu, khoản đã vào hóa đơn bị khóa, bỏ khoản, khoản tay với chia sai tổng) và nhóm 28 (danh sách hóa đơn + lọc, tạo nháp với tạm tính, phát hành, bản in đủ mục 適格請求書, in, 入金 mặc định = còn lại, hủy thiếu lý do, người giới thiệu). Đã chụp màn hình giả lập (cả chế độ in).

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T5-1 | Dán code (4 file mới) → Khởi tạo | Phiên bản 14; có trang Doanh số, Hóa đơn & 入金; Cài đặt có Tài chính & hóa đơn | NOT RUN |
| T5-2 | Công ty thử → Hợp đồng & phí: thêm mức phí (vd. 300000, hỗ trợ 20000, hoàn "30:100,90:50") | Hiện "đang áp dụng" | NOT RUN |
| T5-3 | Người thử vào làm ở công ty đó (ngày đã qua) → Doanh số → Cần lập | Có phí giới thiệu + phí hỗ trợ các tháng; chia recruiter / sales đúng | NOT RUN |
| T5-4 | Lập tất cả → Báo cáo & mục tiêu: đặt mục tiêu 1 người | Số thực tế theo %, % đạt đúng | NOT RUN |
| T5-5 | Ghi nghỉ việc người đó sau < 30 ngày → Cần lập | Có khoản hoàn tiền âm 100% | NOT RUN |
| T8-1 | Hóa đơn & 入金 → Tạo hóa đơn cho công ty → Tạo bản nháp → Phát hành → In / lưu PDF | Bản in tiếng Nhật: 御中, 登録番号, 10% 対象, 消費税, 合計 đúng | NOT RUN |
| T8-2 | Ghi 入金 một phần, rồi phần còn lại | Chờ thu → Đã thu đủ | NOT RUN |
| T8-3 | Người thử có ghi "Người giới thiệu", vào làm → thẻ Người giới thiệu | Có khoản cần lập (số tiền mặc định); Lập → Đã trả hôm nay | NOT RUN |

## Bước 7.2 — Nhật ký hỗ trợ (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `repo.test.js` (thiếu / sai loại, thiếu ngày, thiếu nội dung, hình thức sai, lần vào làm của người khác bị chặn, không đổi người, ẩn). `dashboard.test.js` (chưa có lần định kỳ → ngày vào làm + 90; lần tư vấn và lần trước ngày vào làm không tính; ghi 定期面談 thì hết nhắc; đổi N; lọc support; cột 定期面談 ở trang Đang làm việc). `setup.test.js` (tab SUPPORT_LOG, phiên bản 13). `ui.test.js` nhóm 25 (mục trong hồ sơ người, form mặc định 定期面談 + hôm nay, lỗi theo ô, lưu) và nhóm 26 (cột 定期面談 tô đỏ khi gần hạn). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T7.2-1 | Dán code (có `SupportUi.html`) → Khởi tạo | Phiên bản 13; hồ sơ người có mục Nhật ký hỗ trợ | NOT RUN |
| T7.2-2 | Người thử đang làm, vào làm > 76 ngày trước, chưa có nhật ký → Tổng quan → Việc cần làm | Có việc "定期面談" | NOT RUN |
| T7.2-3 | Ghi 1 nhật ký loại 定期面談 hôm nay → Tải lại | Việc biến mất; trang Đang làm việc: "gần nhất" = hôm nay, hạn = +90 ngày | NOT RUN |

## Bước 6.4 — Tải tệp giấy tờ (D-067)

Test tự động (giả lập), đều PASS: `repo.test.js` (thiếu tên, sai loại, đuôi PDF nhưng nội dung không phải PDF, quá 10MB, không có dòng checklist; lưu đúng thư mục con theo mã người dưới HR_FILES_TEST, không tạo trùng thư mục; không trả `drive_file_id`; không tạo qua `createRecord`; mở có nhật ký; ẩn rồi thì không mở được, tệp Drive vẫn còn; hồ sơ đã ẩn thì không tải lên). `setup.test.js` (FILE cũ 4 cột được nối thêm 3 cột, phiên bản 12). `ui.test.js` nhóm 25 (lấy link → hiện link mở tab mới; chặn sai loại / quá 10MB ngay trên máy; gửi base64; bỏ = ẩn). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T6.4-1 | Dán code → Khởi tạo | Phiên bản 12; tab FILE có thêm cột ten_file, mime, kich_thuoc | NOT RUN |
| T6.4-2 | Checklist → Tải tệp lên 1 PDF giả (< 1MB) | Tệp hiện trong dòng; Drive: HR_FILES_TEST › PER-xxxx › VS-xxxx_tên.pdf; tệp **không** có chia sẻ | NOT RUN |
| T6.4-3 | Tải lên tệp .txt hoặc ảnh > 10MB | Báo lỗi, không tải | NOT RUN |
| T6.4-4 | Bấm tên tệp → bấm link | Mở được trong Drive; AUDIT_LOG có dòng FILE `xem_file` | NOT RUN |
| T6.4-5 | Bấm "Bỏ" | Tệp biến khỏi app; vẫn còn trong Drive | NOT RUN |

## Bước 7.1 — Đang làm việc (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `dashboard.test.js` (đang làm + chờ vào làm, số tháng, support phụ trách nhiều người, lọc support, cảnh báo hạn theo số ngày cài đặt, nghỉ việc thì biến mất). `ui.test.js` nhóm 26 (1 lần gọi máy chủ, đếm, tô đỏ hạn gần, tìm tại chỗ không gọi lại máy chủ, lọc gọi lại máy chủ, mở hồ sơ). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T7.1-1 | Menu **Đang làm việc** | Thấy người đang làm / chờ vào làm từ dữ liệu thử; số đếm đúng | NOT RUN |
| T7.1-2 | Công ty thử: đặt support phụ trách → lọc theo người đó | Chỉ còn người của công ty đó | NOT RUN |
| T7.1-3 | Ghi nghỉ việc 1 người (ngày nghỉ = hôm nay) → Tải lại | Người đó không còn trong danh sách | NOT RUN |

## Bước 6.3 — Checklist giấy tờ (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `repo.test.js` (hồ sơ mới tự có checklist = cả danh mục khi chưa có mẫu / đúng mẫu khi đã lưu; mẫu rỗng; mẫu sai thủ tục / sai giấy tờ / xung đột; bỏ trùng; thêm tay; không đổi loại giấy tờ của dòng; trạng thái sai; ẩn; không thêm vào hồ sơ đã ẩn). `setup.test.js` (tab CASE_DOCUMENT, phiên bản 11, nạp 12 giấy tờ). `ui.test.js` nhóm 25 (tiến độ x/y, mở checklist, tự điền ngày nhận, lưu một dòng không mất dòng đang sửa dở, chỉ thêm giấy tờ chưa có, bỏ khỏi checklist) và nhóm 24 (mẫu checklist trong Cài đặt). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T6.3-1 | Dán code (có `Visa.gs`) → Khởi tạo | Phiên bản 11; Cài đặt → Danh mục có loại "Giấy tờ" 12 mục; có mục "Mẫu checklist giấy tờ" | NOT RUN |
| T6.3-2 | Mẫu cho 更新: bỏ tick vài giấy tờ → Lưu → tạo hồ sơ 更新 mới | Checklist chỉ gồm giấy tờ đã tick | NOT RUN |
| T6.3-3 | Checklist: chọn "Đã nhận" 1 dòng → Lưu | Ngày nhận = hôm nay; cột Giấy tờ đổi số "x/y xong" khi chọn Đã kiểm tra | NOT RUN |
| T6.3-4 | Thêm 1 giấy tờ chưa có; bỏ 1 giấy tờ | Danh sách đổi theo; AUDIT_LOG có dòng CASE_DOCUMENT | NOT RUN |

## Bước 6.2 — Hồ sơ visa (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `repo.test.js` (bắt buộc / sai người / ngày nộp, ngày kết quả, hạn mới theo trạng thái; không đổi người; được cấp 更新 → cập nhật hạn + tư cách của người, có nhật ký; không ghi đè hạn muộn hơn; 認定 không đụng người; ẩn). `dashboard.test.js` (chờ kết quả quá 30 ngày; đã nộp 更新 thì thôi nhắc hạn lưu trú; lọc người phụ trách). `setup.test.js` (tab IMMIGRATION_CASE, phiên bản 10). `ui.test.js` nhóm 25 (ẩn hồ sơ đã kết thúc, mới nhất lên đầu, lỗi theo ô, lưu, mục trong hồ sơ người với người cố định). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T6.2-1 | Dán code (có `VisaUi.html`) → Khởi tạo | Có tab IMMIGRATION_CASE; phiên bản 10; menu Hồ sơ visa mở được | NOT RUN |
| T6.2-2 | Thêm hồ sơ 更新 cho người thử, trạng thái Đã nộp nhưng để trống ngày nộp | Báo lỗi ở ô Ngày nộp | NOT RUN |
| T6.2-3 | Sửa hồ sơ → Được cấp, ngày kết quả, hạn mới (sau ngày kết quả) | Hồ sơ người: hạn lưu trú = hạn mới; AUDIT_LOG có dòng PERSON | NOT RUN |
| T6.2-4 | Hồ sơ Đã nộp, ngày nộp cách hôm nay > 30 ngày → Tổng quan → Việc cần làm | Có việc "Hồ sơ visa chờ kết quả"; việc "Hạn lưu trú" của người đó không còn | NOT RUN |
| T6.2-5 | Danh sách: tick "Hiện cả hồ sơ đã kết thúc" | Hồ sơ Được cấp hiện ra | NOT RUN |

## Bước 6.1 — Cảnh báo hạn lưu trú / hộ chiếu (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `dashboard.test.js` (sắp hết / đã hết / hộ chiếu; bỏ người "Không phù hợp"; lọc người phụ trách; đổi N và tắt quy tắc có tác dụng). `ui.test.js` nhóm 24 (chữ "ĐÃ HẾT n ngày" và "còn n ngày"). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T6.1-1 | Người thử (Sẵn sàng) có hạn lưu trú = hôm nay + 30 ngày → Tổng quan → Việc cần làm → Tải lại | Có việc "Hạn lưu trú", còn 30 ngày | NOT RUN |
| T6.1-2 | Đặt hạn lưu trú = hôm qua | Việc tô đỏ, "ĐÃ HẾT 1 ngày" | NOT RUN |
| T6.1-3 | Đổi người sang "Không phù hợp" (không có lần giới thiệu đang chạy) | Việc biến mất | NOT RUN |
| T6.1-4 | Cài đặt: hạn hộ chiếu N = 30 | Chỉ còn hộ chiếu hết hạn trong 30 ngày | NOT RUN |

## Bước 4.3 — Việc cần làm (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `dashboard.test.js` (đủ 9 quy tắc trên bộ dữ liệu giả, đúng ngày và thứ tự, quá hạn; lọc người phụ trách; cài đặt mặc định, số ngày sai, quy tắc sai, xung đột, đổi số ngày / tắt quy tắc có tác dụng, không lấy cả bảng SETTING, có nhật ký). `setup.test.js` (tab SETTING, phiên bản 9). `ui.test.js` 24 nhóm (thẻ Việc cần làm, quá hạn, mở đơn lọc sẵn; Cài đặt: lỗi số ngày, lưu từng dòng không mất dòng đang sửa dở). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T4.3-1 | Dán code → Khởi tạo | Tạo tab SETTING; phiên bản 9; Cài đặt có mục "Việc cần làm" | NOT RUN |
| T4.3-2 | Tổng quan → Việc cần làm | Danh sách hợp lý với dữ liệu thử; quá hạn tô đỏ | NOT RUN |
| T4.3-3 | Cài đặt: đổi N của "Hỏi khách phản hồi", tắt 1 quy tắc → quay lại Tổng quan, Tải lại | Danh sách đổi theo; AUDIT_LOG có dòng SETTING | NOT RUN |
| T4.3-4 | Làm xong 1 việc thật (vd. nhập kết quả phỏng vấn) → Tải lại | Việc đó biến mất | NOT RUN |

## Bước 4.2 — Pipeline (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `dashboard.test.js` (6 cột chưa kết thúc; số ngày ở trạng thái; phỏng vấn sắp tới; lần đã vào làm không hiện; lâu nhất lên đầu; lọc recruiter / đơn / công ty; danh sách đơn theo công ty). `ui.test.js` 23 nhóm (tải khi mở thẻ, tiêu đề cột kèm số, tô cảnh báo ≥14 ngày, lọc gọi đúng tham số, đổi công ty bỏ chọn đơn, bấm thẻ → hồ sơ). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T4.2-1 | Tổng quan → thẻ Pipeline | 6 cột, số lượng khớp khối "Lần giới thiệu đang chạy" ở thẻ Số liệu | NOT RUN |
| T4.2-2 | Lọc recruiter / công ty / đơn | Chỉ còn thẻ khớp | NOT RUN |
| T4.2-3 | Bấm 1 thẻ → đổi trạng thái trong hồ sơ → quay lại Pipeline, bấm Tải lại | Thẻ chuyển sang cột mới | NOT RUN |

## Bước 4.1 — Tổng quan (tự duyệt theo D-059)

Test tự động (giả lập), đều PASS: `dashboard.test.js` mới (đơn đóng không tính; còn thiếu = cần − đang làm; 5 đơn thiếu nhiều nhất; pipeline chỉ trạng thái chưa kết thúc; phỏng vấn trong 7 ngày, kết quả chờ; chờ vào làm gồm ngày tương lai + 内定承諾; số trong tháng; vòng đời; lọc theo recruiter; tháng khác / tháng sai dạng; nghỉ việc → còn thiếu tăng lại, đã nghỉ +1). `ui.test.js` 22 nhóm (mở app tải số liệu 1 lần, 6 khối, lọc + đổi tháng gọi đúng tham số, bấm Còn thiếu → Đơn tuyển lọc sẵn, bấm tên → hồ sơ). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T4.1-1 | Mở app (menu Tổng quan) | 6 khối hiện trong ~2–4 giây | NOT RUN |
| T4.1-2 | So với trang Đơn tuyển / Con người | Còn thiếu, đang ứng tuyển, chờ vào làm… khớp | NOT RUN |
| T4.1-3 | Lọc 1 người phụ trách; đổi tháng | Số liệu đổi đúng theo ghi chú cuối trang | NOT RUN |
| T4.1-4 | Bấm "Còn thiếu", bấm tên người | Mở Đơn tuyển lọc sẵn / mở hồ sơ | NOT RUN |
| T4.1-5 | Điện thoại | Các khối xếp dọc, không kéo ngang | NOT RUN |

## Bước 3.4 — Vào làm cơ bản

Test tự động (giả lập), đều PASS: `setup.test.js` 8 nhóm (nâng cấp EMPLOYMENT, phiên bản 8, nạp thêm 5 lý do nghỉ). `repo.test.js` (ngày vào làm bắt buộc / không lùi, CONFLICT; tạo EMP đúng công ty/đơn; gợi ý đủ người không tự đổi; "Đã vào làm" không đổi kiểu thường, không tạo / ẩn qua đường chung; đang làm nơi khác bị chặn kể cả ngày tương lai; nghỉ: ngày + lý do bắt buộc, ngày nghỉ ≥ ngày vào làm, lý do phải đúng danh mục; vào nơi mới đúng ngày nghỉ được; sửa ngày nghỉ chồng lần sau bị chặn; hủy "Đã vào làm" ẩn EMP; đã nghỉ thì không hủy). `ui.test.js` 21 nhóm (tiến độ đơn gồm ngày tương lai + đơn đóng "—", nút "→ Đã đủ người", "Đã vào làm" đi đúng đường + lỗi tại ô ngày, vòng đời Chờ vào làm → Đang làm → Đã nghỉ, gợi ý đủ người, form nghỉ việc). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T3.4-1 | Dán code → Khởi tạo | Báo nâng cấp EMPLOYMENT + bản sao lưu; phiên bản 8; Cài đặt → Danh mục có "Lý do nghỉ việc" | NOT RUN |
| T3.4-2 | Lần giới thiệu → Đổi trạng thái → "Đã vào làm", ngày hôm nay | `EMP-0001`; hồ sơ "Đang làm"; đơn: Đã vào làm +1, Còn thiếu −1 | NOT RUN |
| T3.4-3 | Như trên nhưng ngày vào làm ở tương lai | Hồ sơ "Chờ vào làm"; đơn: Chờ vào làm +1, Còn thiếu chưa đổi | NOT RUN |
| T3.4-4 | Đơn cần 1 người, cho 1 người vào làm hôm nay | Gợi ý "Đổi sang Đã đủ người"; bảng đơn có nút "→ Đã đủ người"; chỉ đổi khi bấm | NOT RUN |
| T3.4-5 | Ghi nghỉ việc (thử bỏ trống lý do) | Thiếu lý do bị báo; lưu xong hồ sơ "Đã nghỉ"; đơn còn mở thì Còn thiếu +1; đơn đã đóng vẫn "—" | NOT RUN |
| T3.4-6 | Cho người đang làm vào làm nơi khác | Bị chặn, báo mã EMP đang làm | NOT RUN |
| T3.4-7 | Hủy dòng "Đã vào làm" trong Lịch sử | EMP biến khỏi Quá trình làm việc; tiến độ đơn tính lại | NOT RUN |

## Bước 3.3 — Phỏng vấn

Test tự động (giả lập), đều PASS: `setup.test.js` 8 nhóm (nâng cấp INTERVIEW, phiên bản 7). `repo.test.js` (bắt buộc vòng/thời gian, giờ sai, giờ kết thúc ≤ bắt đầu, hình thức sai, người phỏng vấn của công ty khác, thiếu lý do khi trượt; gợi ý chờ PV / đã PV / trượt + lý do, ngày không lùi, không gợi ý khi kết quả không đổi; chưa tự đổi trạng thái; không đổi lần giới thiệu khi sửa; CONFLICT; danh sách theo lần giới thiệu + người liên hệ đúng công ty; lịch sắp tới; lần đã kết thúc không thêm được, vẫn sửa / ẩn). `ui.test.js` 20 nhóm (form, lỗi tại ô kể cả lỗi ngày+giờ hiện ở ô Ngày, người liên hệ đã ẩn không chọn mới, gợi ý chỉ đổi khi bấm Cập nhật, lần đã kết thúc khóa nút thêm, lịch sắp tới ở trang công ty). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T3.3-1 | Dán code → Khởi tạo | Báo nâng cấp INTERVIEW + bản sao lưu "Trước nâng cấp"; phiên bản 7 | NOT RUN |
| T3.3-2 | Hồ sơ → lần giới thiệu → "Phỏng vấn" → thêm vòng 1 và vòng 2 | `PV-0001`, `PV-0002`, sắp theo thời gian, giờ JST đúng | NOT RUN |
| T3.3-3 | Bỏ trống ngày/giờ; giờ kết thúc trước giờ bắt đầu; kết quả Trượt không lý do | Lỗi dưới ô, không lưu | NOT RUN |
| T3.3-4 | Lưu buổi đầu (lần giới thiệu "Đã gửi khách"); sửa kết quả thành Đạt | Gợi ý "Chờ phỏng vấn" rồi "Đã phỏng vấn"; bấm Cập nhật → lịch sử thêm dòng; bấm Bỏ qua → không đổi | NOT RUN |
| T3.3-5 | Trang chi tiết công ty | "Lịch phỏng vấn sắp tới" đúng thứ tự; bấm tên mở hồ sơ | NOT RUN |
| T3.3-6 | Lần giới thiệu đã "Trượt" | Không thêm được buổi mới; buổi cũ vẫn xem / sửa được | NOT RUN |

## Bước 3.2 — Lần giới thiệu

Test tự động (giả lập), đều PASS: `setup.test.js` 8 nhóm (nâng cấp APPLICATION, phiên bản 6). `repo.test.js` (bấm "Hiện" ghi nhật ký, không ghi số; chỉ người Sẵn sàng + đơn Đang mở; recruiter đã nghỉ bị chặn; D-023 báo mã lần đang mở; ngày lùi / trạng thái sai / "đã vào làm" / thiếu lý do bị chặn; CONFLICT; "tạm dừng" vẫn chặn giới thiệu lại; hủy dòng → tính lại trạng thái, có nhật ký; không hủy qua đường chung; không hủy dòng cuối; trượt → giới thiệu lại được; mở lại / hủy dòng kết thúc / hiện lại khi đã có lần mới chưa kết thúc bị chặn). `ui.test.js` 19 nhóm (chỉ đơn Đang mở trong ô chọn, recruiter mặc định, lỗi tại ô, cột Đang giới thiệu, vòng đời đổi theo trạng thái, khóa "Đã vào làm", lý do bắt buộc, lỗi ngày từ máy chủ tại ô, lịch sử gạch dòng hủy, hủy cần xác nhận, người chưa Sẵn sàng thì khóa nút). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T3.2-1 | Dán code → Khởi tạo → hồ sơ người "Sẵn sàng giới thiệu" → "+ Giới thiệu vào đơn" chọn đơn Đang mở | `APL-0001`, "Đã gửi khách"; lịch sử 1 dòng; đơn đó có "Đang giới thiệu" = 1 | NOT RUN |
| T3.2-2 | Giới thiệu lại cùng người vào cùng đơn | Bị chặn, báo mã lần đang mở | NOT RUN |
| T3.2-3 | Đổi trạng thái 2–3 lần, rồi hủy 1 dòng | Dòng hủy gạch đi; trạng thái hiện tại đúng; AUDIT_LOG có dòng `huy` | NOT RUN |
| T3.2-4 | Đổi sang "Trượt" (thử bỏ trống lý do), rồi giới thiệu lại cùng đơn | Thiếu lý do bị báo lỗi; sau đó tạo được `APL-0002` | NOT RUN |
| T3.2-5 | Trang Đơn tuyển / trang công ty | Cột "Đang giới thiệu" đúng số | NOT RUN |
| T3.2-6 | Đổi 1 lần giới thiệu sang 内定承諾 | Hồ sơ: Tình trạng vòng đời "Chờ vào làm" | NOT RUN |
| T3.2-7 | Hồ sơ → "Hiện số" | AUDIT_LOG có dòng `xem_so`, không có số | NOT RUN |

## Bước 3.1 — Con người

Test tự động (giả lập), đều PASS: `setup.test.js` 8 nhóm (nâng cấp PERSON, phiên bản 5, nạp 57 mục danh mục đúng 1 lần). `repo.test.js` (bắt buộc tên/ngày sinh/quốc tịch, quốc tịch phải đúng loại, kỹ năng hết hiệu lực bị chặn, số giấy tờ sai dạng; số nằm ở file nhạy cảm, file chính không chứa số kể cả nhật ký; che/hiện; nghi trùng theo tên không dấu + ngày sinh + quốc tịch và theo số hộ chiếu, gồm người đã ẩn; khác quốc tịch không trùng; xác nhận thì lưu; sửa trường thường không kiểm tra lại; để trống số = giữ nguyên; chỉ đổi số thì hồ sơ chính không đổi; CONFLICT; không lưu PERSON qua đường chung; không lấy được cả bảng số giấy tờ). `ui.test.js` 18 nhóm (danh sách không có số, tìm không dấu, che/hiện, quốc tịch hết hiệu lực giữ khi sửa nhưng không chọn mới, lỗi tại ô, cảnh báo trùng → khóa nút Lưu → "Vẫn lưu" → mở hồ sơ mới; danh mục đổi loại). Đã chụp màn hình giả lập.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T3.1-1 | Dán code → Cài đặt → Khởi tạo | Báo nâng cấp PERSON + bản sao lưu "Trước nâng cấp"; phiên bản 5; "Đã nạp sẵn 38 mục"; Cài đặt → Danh mục đổi được loại | PASS (2026-10-19, chủ dự án báo "PASS") |
| T3.1-2 | Thêm người, bỏ trống tên / ngày sinh / quốc tịch | Lỗi dưới từng ô, không lưu | PASS (2026-10-19, chủ dự án báo "PASS") |
| T3.1-3 | Thêm người có số hộ chiếu giả | Số ở `HR_SENSITIVE_TEST`, không có trong `HR_DATA_TEST`; AUDIT_LOG ghi `***`; hồ sơ hiện `****…`, bấm "Hiện số" thấy đủ | PASS (2026-10-19, chủ dự án báo "PASS") |
| T3.1-4 | Thêm người thứ 2 trùng tên (khác dấu/hoa thường) + cùng ngày sinh + quốc tịch | Cảnh báo nghi trùng có link người cũ; chưa lưu; "Vẫn lưu" thì lưu | PASS (2026-10-19, chủ dự án báo "PASS") |
| T3.1-5 | Thêm người trùng số hộ chiếu, khác tên | Cảnh báo nghi trùng | PASS (2026-10-19, chủ dự án báo "PASS") |
| T3.1-6 | Tìm, lọc trạng thái / recruiter / quốc tịch; ẩn rồi hiện lại | Đúng; mã `PER-0001` | PASS (2026-10-19, chủ dự án báo "PASS") |
| T3.1-7 | Điện thoại / cửa sổ hẹp | Dạng thẻ, không kéo ngang | PASS (2026-10-19, chủ dự án báo "PASS") |

## Bước 2.3 — Đơn tuyển (gộp 2.4)

Test tự động (giả lập), đều PASS: `setup.test.js` 8 nhóm (nâng cấp JOB_ORDER, phiên bản 4). `repo.test.js` (bắt buộc, số lượng 0/-1/1.5/abc/10000 bị chặn, trạng thái sai, 2 người phụ trách bị chặn, người nghỉ không chọn mới, lĩnh vực ngoài công ty bị chặn, ngày sai, ngày dự kiến < ngày nhận bị chặn, mặc định Đang mở, không đổi công ty, giữ lĩnh vực/người cũ khi công ty bỏ lĩnh vực / người nghỉ). `ui.test.js` 17 nhóm (danh sách, tìm theo tên công ty, lọc trạng thái/lĩnh vực, chưa chọn công ty → lỗi tại ô, công ty ẩn không chọn được, lĩnh vực đổi theo công ty, lỗi số lượng tại ô, sang trang công ty, thêm đơn với công ty cố định, sửa gửi kèm sua_luc). Đã chụp màn hình giả lập máy tính + điện thoại.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T2.3-1 | Dán code → Cài đặt → Khởi tạo | Báo nâng cấp JOB_ORDER + bản sao lưu "Trước nâng cấp"; phiên bản 4 | CÓ VẺ ĐẠT — bản 0.9.0 tạo được `JO-0001` (ảnh chụp 2026-10-19); chưa xác nhận thông báo nâng cấp |
| T2.3-8 | Thu nhỏ cửa sổ máy tính (~800–900px) ở trang Đơn tuyển / Công ty | Bảng chuyển dạng thẻ, không có thanh kéo ngang, thấy nút Sửa/Ẩn | NOT RUN (lần 1 FAIL ở 0.9.0: phải kéo ngang, khuất cột) |
| T2.3-2 | Thêm đơn: bỏ trống vị trí; số lượng 0 | Lỗi dưới từng ô, không lưu | NOT RUN |
| T2.3-3 | Thêm đơn hợp lệ → sửa → ẩn → hiện lại | Mã `JO-0001`; AUDIT_LOG đủ dòng | NOT RUN |
| T2.3-4 | Tìm theo tên công ty; lọc trạng thái / người phụ trách / lĩnh vực | Chỉ hiện đơn khớp; số đếm đúng | NOT RUN |
| T2.3-5 | Trang chi tiết công ty → "+ Thêm đơn" | Đơn mới hiện ở công ty đó và ở trang Đơn tuyển | NOT RUN |
| T2.3-6 | Mở trên điện thoại | Thẻ, form 1 cột, không tràn ngang | NOT RUN |
| T2.3-7 | Thêm đơn, chọn công ty chưa có lĩnh vực | Ô Lĩnh vực chỉ có "—" và dòng nhắc thêm lĩnh vực ở trang công ty | NOT RUN |

## Bước 2.2 — Người liên hệ

Test tự động (giả lập), đều PASS: `setup.test.js` 8 nhóm (nâng cấp CONTACT cùng COMPANY, dữ liệu cũ giữ nguyên, phiên bản 3). `repo.test.js` (bắt buộc họ tên + công ty, công ty phải tồn tại, email/điện thoại sai, liên hệ chính: người cũ tự bỏ dấu + nhật ký, công ty khác không ảnh hưởng, không đổi công ty khi sửa, ẩn công ty không ẩn người liên hệ). `ui.test.js` 16 nhóm (trang chi tiết, chỉ người của công ty đó, liên hệ chính lên đầu, link tel/mailto, lỗi tại ô, gửi kèm company_id, quay lại giữ bộ lọc). `backup`, `perf` PASS. Đã chụp màn hình giả lập máy tính + điện thoại.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T2.2-1 | Dán code → Cài đặt → Khởi tạo | Báo nâng cấp CONTACT + bản sao lưu "Trước nâng cấp"; phiên bản 3; công ty cũ còn nguyên | NOT RUN |
| T2.2-2 | Bấm tên công ty → "← Danh sách công ty" | Mở trang chi tiết; quay lại vẫn giữ ô tìm/bộ lọc | MỘT PHẦN — trang chi tiết mở đúng, bản 0.8.0, danh sách người liên hệ tải không lỗi (ảnh chụp 2026-10-19); chưa thấy kết quả quay lại |
| T2.2-3 | Thêm người liên hệ: để trống họ tên; nhập email sai | Lỗi đỏ dưới ô, không lưu | NOT RUN |
| T2.2-4 | Thêm 2 người, lần lượt đánh dấu "Liên hệ chính" | Chỉ người sau cùng có nhãn; AUDIT_LOG có dòng bỏ dấu người cũ | NOT RUN |
| T2.2-5 | Sửa → ẩn → hiện lại 1 người | Mã `CT-0001`; đã ẩn chỉ hiện khi tích "Hiện cả mục đã ẩn" | NOT RUN |
| T2.2-6 | Mở trên điện thoại | Thông tin + người liên hệ dạng thẻ; bấm số điện thoại mở cuộc gọi | NOT RUN |

## Bước 2.1 — Công ty

Test tự động (giả lập), đều PASS: `setup.test.js` 8 nhóm (thêm: nâng cấp 1 → 2 có sao lưu trước, cột nối cuối, dữ liệu cũ giữ nguyên, bấm lại không nâng cấp/sao lưu thêm, tiêu đề khác kiểu chỉ cảnh báo; nạp 19 lĩnh vực đúng một lần). `repo.test.js` (kiểm tra từng ô, nhiều ID bỏ trùng, người nghỉ / lĩnh vực hết hạn / chưa tới ngày không chọn mới được nhưng được giữ, ngày sai, đến ngày < từ ngày). `ui.test.js` 15 nhóm (danh sách, tìm, lọc, form, lỗi tại ô, lỗi máy chủ tại ô, sửa giữ người đã nghỉ, tiếng Nhật, Cài đặt → Lĩnh vực). `backup`, `perf` PASS. Đã chụp màn hình giả lập máy tính + điện thoại (390px) để kiểm tra bố cục.

| Mã | Thao tác | Kỳ vọng | Kết quả |
|---|---|---|---|
| T2.1-1 | Dán code, Cài đặt → bấm Khởi tạo | Báo "Đã nâng cấp cấu trúc … COMPANY", có bản sao lưu "Trước nâng cấp"; phiên bản cấu trúc 2; "Đã nạp sẵn 19 lĩnh vực"; Nhân viên phụ trách còn nguyên | PASS (2026-10-19, chủ dự án xác nhận thấy cả 2 thông báo; trang Công ty lưu được cột mới) |
| T2.1-2 | Công ty → + Thêm công ty → Lưu khi để trống tên | Báo lỗi đỏ ngay dưới ô Tên pháp nhân, không lưu | NOT RUN |
| T2.1-3 | Thêm công ty hợp lệ → Sửa → Ẩn → Hiện lại | Mã `CO-0001`; AUDIT_LOG thêm 4 dòng; mục đã ẩn chỉ hiện khi tích "Hiện cả mục đã ẩn" | MỘT PHẦN — đã tạo `CO-0001` (ảnh chụp 2026-10-19); sửa/ẩn/hiện lại chưa có kết quả |
| T2.1-4 | Tìm một phần tên; lọc theo 1 nhân viên; lọc trạng thái | Chỉ hiện công ty khớp; số "Đang hiện n / tổng" đúng | NOT RUN |
| T2.1-5 | Mở trên điện thoại | Danh sách dạng thẻ, form 1 cột, không tràn ngang | NOT RUN |
| T2.1-6 | Mở 2 tab, cùng sửa 1 công ty, lưu tab 1 rồi tab 2 | Tab 2 báo "Dữ liệu vừa bị thay đổi ở nơi khác", không ghi đè | NOT RUN |
| T2.1-7 | Cho 1 nhân viên nghỉ ở Cài đặt → mở lại công ty có người đó | Vẫn thấy tên kèm "(đã nghỉ)"; khi thêm công ty mới thì không có tên người đó | NOT RUN |
| T2.1-8 | Cài đặt → Lĩnh vực: đặt "Đến ngày" là hôm qua cho 1 lĩnh vực | Tình trạng "Hết hiệu lực"; không còn trong ô chọn khi thêm công ty | NOT RUN |

## Giai đoạn 1 — Khung hệ thống (đã duyệt cùng 0.5, D-030)

| Mã | Tình huống | Thao tác | Kết quả kỳ vọng | Kết quả |
|---|---|---|---|---|
| T1-01 | Chủ tài khoản mở app | Mở link web app bản thử nghiệm bằng Gmail của bạn (máy tính và điện thoại) | Vào được trang chủ, menu hiển thị tiếng Việt | NOT RUN |
| T1-02 | Người khác mở link | Mở link bằng một tài khoản Google khác hoặc cửa sổ ẩn danh | Bị Google từ chối truy cập, không thấy dữ liệu | NOT RUN |
| T1-03 | Đổi ngôn ngữ | Bấm nút 日本語, tải lại trang | Toàn bộ nhãn chuyển sang tiếng Nhật; lần sau mở vẫn giữ lựa chọn | NOT RUN |
| T1-04 | Tạo bảng tự động | Chạy chức năng khởi tạo trên file Sheets thử nghiệm trống | Đủ các tab theo DATA_MODEL, có hàng tiêu đề; file nhạy cảm và thư mục Drive được tạo riêng | NOT RUN |
| T1-05 | Tạo bản ghi | Tạo nhân viên giả "Nguyễn Văn A" | Có ID tự sinh, mã STF-0001; AUDIT_LOG thêm 1 dòng "tạo" | PASS một phần (2026-10-19, ảnh chụp: tạo được STF-0001; chưa xác nhận AUDIT_LOG) |
| T1-06 | Sửa bản ghi | Đổi tên thành "Nguyễn Văn B" | Dữ liệu đổi; AUDIT_LOG ghi giá trị cũ → mới, người sửa, giờ JST | NOT RUN |
| T1-07 | Ẩn thay vì xóa | Bấm "ẩn" nhân viên | Không còn trong danh sách mặc định; dòng vẫn còn trên Sheets với `da_an` = có; xem lại được qua bộ lọc | PASS (2026-10-19, ảnh chụp: STF-0001 ẩn khỏi danh sách mặc định, hiện lại khi tích "Hiện cả mục đã ẩn") |
| T1-08 | Dữ liệu không hợp lệ | Lưu nhân viên để trống họ tên | Bị chặn, báo lỗi rõ bằng ngôn ngữ đang chọn; không có dòng nào được ghi | NOT RUN |
| T1-09 | Ghi đồng thời | Mở 2 tab trình duyệt, lưu gần như cùng lúc 2 bản ghi khác nhau | Cả 2 được lưu, không mất hoặc ghi đè lẫn nhau, mã không trùng | NOT RUN |
| T1-10 | Sửa tay trên Sheets | Mở file Sheets, sửa trực tiếp một ô | Google hiện cảnh báo bảo vệ trước khi cho sửa | NOT RUN |
| T1-11 | Sao lưu thủ công | Bấm "Sao lưu ngay" | Thư mục backup có bản copy của 2 file Sheets, tên kèm ngày giờ JST | NOT RUN |
| T1-12 | Lịch sao lưu tự động | Kiểm tra lịch đã cài | Có lịch ngày 15 và ngày cuối tháng ~21:30 JST; ghi lại giờ chạy thực tế | NOT RUN |
| T1-13 | Xóa bản sao lưu cũ | Tạo bản sao lưu giả có ngày cũ hơn 12 tháng, chạy dọn dẹp | Chỉ bản cũ hơn 12 tháng bị chuyển vào thùng rác | NOT RUN |
| T1-14 | Khôi phục | Làm theo hướng dẫn khôi phục từ một bản sao lưu vào môi trường thử | App chạy lại với dữ liệu của bản sao lưu | NOT RUN |
| T1-15 | Múi giờ | Tạo bản ghi, xem giờ tạo | Hiển thị giờ JST | NOT RUN |
| T1-16 | Giao diện điện thoại | Mở app trên điện thoại | Không cuộn ngang, menu dùng được bằng tay | NOT RUN |
| T1-17 | Tốc độ & quota | Nạp ~1.000 dòng giả mỗi bảng lõi, mở danh sách | Ghi lại thời gian tải thực tế; không lỗi quota | NOT RUN |
