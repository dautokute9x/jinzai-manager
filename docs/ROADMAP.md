# ROADMAP.md

Trạng thái: `CHƯA LÀM` / `CHỜ DUYỆT` / `ĐANG LÀM` / `CHỜ TEST` / `ĐÃ DUYỆT`
Cập nhật: 2026-10-22

## Giai đoạn 0 — Khảo sát & khóa quy tắc

| Bước | Nội dung | Phụ thuộc | Trạng thái |
|---|---|---|---|
| 0.1 | Thuật ngữ, trạng thái hai tầng (gộp với 0.3) | — | ĐÃ DUYỆT (D-020, D-030) |
| 0.2 | Phương án kỹ thuật (Apps Script + Sheets + Drive) | — | ĐÃ DUYỆT (D-019) |
| 0.3 | ERD lõi | 0.2 | ĐÃ DUYỆT (D-030) |
| 0.4 | Quy tắc doanh số & phí | D-005 → D-069 | ĐÃ DUYỆT (D-069) |
| 0.5 | Phạm vi MVP & kế hoạch GĐ 1 | 0.3 | ĐÃ DUYỆT (D-025, D-030) |
| 0.6 | Bộ file tài liệu dự án | — | ĐANG LÀM |

## MVP (D-025)

| GĐ | Nội dung | Phụ thuộc chính | Trạng thái |
|---|---|---|---|
| 1 | Khung hệ thống (chỉ môi trường thử nghiệm, D-028) | 0.3, 0.5 | XONG — còn mở: T1.1-2 (điện thoại) |
| 1.1 | Repo GitHub + project Apps Script + trang "xin chào" | repo được tạo | CHUYỂN TIẾP — T1.1-1 PASS; T1.1-2 (điện thoại) chưa báo |
| 1.2 | Khung app: quyền truy cập, menu song ngữ, responsive | 1.1 | ĐÃ DUYỆT (2026-10-19) |
| 1.3 | Khởi tạo file Sheets thử nghiệm, tab theo ERD, file nhạy cảm, thư mục Drive | 1.2 | ĐÃ DUYỆT (2026-10-19) |
| 1.4 | Lớp ghi dữ liệu an toàn, thử trên danh sách nhân viên | 1.3 | ĐÃ DUYỆT (2026-10-19) |
| 1.5 | Sao lưu tự động/thủ công, dọn bản cũ, hướng dẫn khôi phục | 1.4 | ĐÃ DUYỆT (2026-10-19) |
| 1.6 | Đo tốc độ & quota với ~1.000 dòng giả | 1.4 | ĐÓNG — bỏ qua theo yêu cầu (D-044), chưa đạt ngưỡng lưu |
| 1.6b | Tối ưu tốc độ ghi/đọc (A, B, C, E — D-042) | 1.6 | ĐÓNG (D-044) |
| 1.6c | Đo 5 lần + chia nhỏ thời gian máy chủ + để sẵn dòng trống (F, G, H — D-043) | 1.6b | ĐÓNG (D-044) |
| 2 | Công ty & đơn tuyển | 1 | XONG (2026-10-19) — nhiều mục kiểm thử chưa chạy, xem TEST_CASES |
| 2.1 | Nâng cấp cấu trúc an toàn + Công ty (danh sách, thêm/sửa/ẩn, tìm, lọc) + danh mục Lĩnh vực | 1 | ĐÃ DUYỆT (2026-10-19, D-046) — T2.1-2→8 chưa thử |
| 2.2 | Trang chi tiết công ty + người liên hệ | 2.1 | ĐÃ DUYỆT (2026-10-19, D-048) — T2.2-3→6 chưa thử |
| 2.3 | Đơn tuyển (danh sách, thêm/sửa/ẩn, trạng thái đơn) + đơn trong trang chi tiết công ty | 2.1 | ĐÃ DUYỆT (2026-10-19, D-050) — T2.3-2→8 chưa thử |
| 2.4 | Liên kết công ty ↔ đơn tuyển, lọc theo người phụ trách/trạng thái | 2.3 | GỘP VÀO 2.3 (D-049 Q8) |
| 3 | Con người, lần giới thiệu, phỏng vấn | 2 | XONG (2026-10-19) — nhiều mục kiểm thử chưa chạy, xem TEST_CASES |
| 3.1 | Con người: danh sách, hồ sơ, số giấy tờ (file nhạy cảm), trạng thái sàng lọc, cảnh báo nghi trùng (D-022) | 2 | ĐÃ DUYỆT (2026-10-19, D-052) |
| 3.2 | Lần giới thiệu: giới thiệu người vào đơn, trạng thái tầng 2 + lịch sử, chặn trùng (D-023) | 3.1 | ĐÃ DUYỆT (2026-10-19, D-054) — T3.2-1→7 chưa thử |
| 3.3 | Phỏng vấn (nhiều buổi / lần giới thiệu) | 3.2 | ĐÃ DUYỆT (2026-10-19, D-056) — T3.3-1→6 chưa có kết quả |
| 3.4 | Vào làm cơ bản + "còn thiếu" ở đơn + tình trạng vòng đời tự suy ra (D-006, D-020, D-021) | 3.2 | ĐÃ DUYỆT (2026-10-19, D-058) — T3.4-1→7 chưa có kết quả |
| 4 | Pipeline, việc cần làm, dashboard tuyển dụng | 3 | XONG phần lập trình (tự duyệt D-059) — chờ chủ dự án kiểm thử |
| 4.1 | Trang Tổng quan: số liệu tuyển dụng (1 lần gọi máy chủ) | 3 | TỰ DUYỆT (D-059/D-060) — chờ chủ dự án kiểm thử |
| 4.2 | Pipeline: lần giới thiệu theo cột trạng thái, lọc | 4.1 | TỰ DUYỆT (D-061) — chờ chủ dự án kiểm thử |
| 4.3 | Việc cần làm tự sinh (ngưỡng ngày sửa được) | 4.1 | TỰ DUYỆT (D-062) — chờ chủ dự án kiểm thử |
| 5 | Doanh số & mục tiêu | 4, D-069 | XONG phần lập trình — chờ chủ dự án kiểm thử |
| 5.1 | Hợp đồng & phí theo công ty (có hiệu lực) + Cài đặt tài chính | D-069 | XONG (D-069) |
| 5.2 | Doanh số: gợi ý cần lập (giới thiệu / cọc 1/2 / hỗ trợ tháng / hoàn tiền), lập / bỏ qua / sửa / thêm tay | 5.1 | XONG (D-069) |
| 5.3 | Mục tiêu theo người + công ty, báo cáo tháng, 12 tháng | 5.2 | XONG (D-069) — chưa có báo cáo theo đội (app chưa có màn hình đội) |
| 6 | Hồ sơ visa, checklist, cảnh báo hạn visa/hộ chiếu (D-027) | 3 | XONG phần lập trình — chờ chủ dự án kiểm thử |
| 6.1 | Cảnh báo hạn lưu trú / hộ chiếu trong Việc cần làm (dùng cột hạn đã có ở PERSON) | 4.3 | TỰ DUYỆT (D-063) — chờ chủ dự án kiểm thử |
| 6.2 | Hồ sơ visa (IMMIGRATION_CASE): loại thủ tục, trạng thái, ngày nộp / kết quả, hạn mới | 6.1 | TỰ DUYỆT (D-064) — chờ chủ dự án kiểm thử |
| 6.3 | Checklist giấy tờ theo mẫu (mẫu lưu ở SETTING, CASE_DOCUMENT) — chỉ đánh dấu, chưa tải file | 6.2 | TỰ DUYỆT (D-065) — chờ chủ dự án kiểm thử |
| 6.4 | Tải file giấy tờ lên Drive | 6.3 | ĐÃ DUYỆT (D-067) — chờ chủ dự án kiểm thử |
| 7 | Quản lý người đang làm | 3, 6 | XONG phần lập trình — chờ chủ dự án kiểm thử |
| 7.1 | Trang "Đang làm việc": người đang làm / chờ vào làm, hạn lưu trú, support phụ trách (chỉ xem) | 3.4, 6.1 | TỰ DUYỆT (D-066) — chờ chủ dự án kiểm thử |
| 7.2 | Nhật ký hỗ trợ (SUPPORT_LOG): 定期面談, tư vấn, sự cố… + nhắc lịch | 7.1 | TỰ DUYỆT (D-068, chủ dự án cho "làm hết các bước") — chờ kiểm thử. 定期届出 năm: nhắc + đánh dấu đã nộp (D-073) |
| 8 | Hóa đơn, 入金, hoàn tiền, cọc 1/2, trả người giới thiệu | 5, D-069 | XONG phần lập trình — chờ chủ dự án kiểm thử |
| 8.1 | Hóa đơn: nháp từ các khoản chưa vào hóa đơn, phát hành (chốt thuế), hủy có lý do, in 適格請求書 | 5.2 | XONG (D-069) |
| 8.2 | 入金 (thu một phần / đủ / trả lại), tình trạng chờ thu / quá hạn, Việc cần làm "hóa đơn quá hạn" | 8.1 | XONG (D-069) |
| 8.3 | Người giới thiệu: ghi ở hồ sơ người, khoản phải trả khi vào làm, đánh dấu đã trả | 3.4 | XONG (D-069) |
| 9a | Tạo môi trường thật (D-028) + import từ Sheets cũ (D-026) | 1–8 | XONG phần lập trình (D-070) — chủ dự án tự tạo project bản thật + nhập CSV theo README; chưa thử với file Sheets cũ thật |

## Ngoài MVP

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 9b | Báo cáo nâng cao, xuất Excel nâng cao | XONG mức cơ bản (D-071): xuất 7 loại ra Google Sheets (tải Excel); báo cáo tháng ở GĐ 5. tỷ lệ chuyển đổi (D-073) |
| 10 | Đa người dùng & vận hành | XONG phần lập trình (D-075) — liên kết truy cập riêng, 2 vai trò; chờ chủ dự án kiểm thử trên link /exec |
| 11 | Nghiệp vụ hồ sơ & hỗ trợ người lao động (yêu cầu bổ sung 10 mục, D-080) | ĐANG LÀM |
| 11.1 | Thu gom giấy tờ: checklist mở rộng (visa + 受入れ前), kho giấy tờ dùng lại, trang Giấy tờ còn thiếu | XONG phần lập trình (0.31.0) |
| 11.2 | 受入れ前: tự mở khi 内定, công việc theo mẫu, tiến độ, xác nhận vào làm | XONG phần lập trình (0.31.0) |
| 11.3 | 定期面談 theo quý: kế hoạch, trạng thái, biên bản, danh sách chưa làm / quá hạn | XONG phần lập trình (0.32.0) |
| 11.4 | Vấn đề phát sinh (相談・対応): vụ việc, ưu tiên, lịch sử xử lý, liên kết từ 定期面談 | XONG phần lập trình (0.32.0) |
| 11.5 | Hạn visa / hộ chiếu: mốc 3·2·1 tháng + 10 ngày, lọc, trạng thái theo hồ sơ visa, lịch sử, tách "chưa nhập" | CHƯA |
| 11.6 | Hợp đồng dịch vụ + hợp đồng lao động: trạng thái soạn → ký → xong, phiên bản, cảnh báo | CHƯA |
| 11.7 | 定期届出 theo công ty × kỳ: danh sách người chốt theo kỳ, checklist, tiến độ, bằng chứng nộp | CHƯA |
| 11.8 | Tổng quan (số liệu bấm mở danh sách) + tab công việc trong hồ sơ người / công ty | CHƯA |

## GĐ 12 — Nâng cấp miễn phí theo master prompt (repo `jinzai-manager`, D-082)

Vẫn Apps Script + Sheets, chi phí 0. Thứ tự giữa GĐ 12 và 11.5–11.8: D-087 (CẦN HỎI).

| Bước | Nội dung | Phụ thuộc | Trạng thái |
|---|---|---|---|
| 12.0 | Repo mới, lưu master prompt, chạy toàn bộ kiểm thử bằng `npm install && npm test` | — | XONG (D-082) |
| 12.1 | Đăng nhập ID + mật khẩu, hết phiên, khóa tài khoản có hiệu lực phía máy chủ | D-083 | CHỜ DUYỆT |
| 12.2 | Phạm vi dữ liệu theo người phụ trách, ẩn thông tin liên lạc / tiền theo quyền, vai trò mở rộng | D-084, 12.1 | CHỜ DUYỆT |
| 12.3 | Giao diện 4 ngôn ngữ (thêm Indonesia, Myanmar + font), nhớ theo tài khoản | D-085, 12.1 | CHỜ DUYỆT |
| 12.4 | Đo lại với 2.000 người giả; phân trang / lọc phía máy chủ cho danh sách lớn nếu cần | D-086 | CHỜ DUYỆT |

## Hướng website doanh nghiệp (sau — chưa làm)

Chuyển khi gặp một trong các mốc: > 10 người dùng, cần đủ 7 vai trò + phạm vi chặt, tốc độ Apps Script không chấp nhận được, hoặc cần hệ thống thuộc tài khoản công ty / kiểm tra bảo mật bên ngoài. Hướng dự kiến: PostgreSQL (vùng Tokyo) + ứng dụng web riêng + đăng nhập có xác minh 2 bước; chi phí báo giá khi chốt.

Giữ cho việc chuyển dễ ngay từ bây giờ:
- `id` UUID và các mã trạng thái thống nhất trong Sheets → giữ nguyên khi chuyển sang cơ sở dữ liệu.
- Quy tắc nghiệp vụ nằm ở file `.gs` phía máy chủ + `docs/DECISIONS.md` → dùng làm đặc tả cho bản mới; `tests/` mô tả hành vi cần giữ.
- Không thêm phụ thuộc riêng của Google khi có cách làm tương đương không phụ thuộc.

## Ý tưởng đã làm
- "Phiếu giới thiệu ứng viên" → bản in 人材紹介票 trong hồ sơ người (D-074, tự duyệt D-059).

## Phụ thuộc đang mở
- Cọc 1/2: để GĐ 8 (D-045, Q7).
- Import (9a) cần file mẫu dữ liệu giả cùng cấu trúc Sheets cũ.
