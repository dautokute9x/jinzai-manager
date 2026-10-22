# REQUIREMENTS.md — Yêu cầu đã duyệt

Cập nhật: 2026-10-19. Chỉ ghi những gì đã được chủ dự án xác nhận; mọi chi tiết khác xem `DECISIONS.md` và master prompt.

## 1. Bối cảnh
Hệ thống quản lý hoạt động 人材紹介・登録支援機関 (chủ yếu 特定技能). Giai đoạn đầu chỉ chủ dự án sử dụng; kiến trúc phải cho phép mở rộng có kiểm soát.

## 2. Nền tảng (D-002, D-011, D-012, D-013, D-019)
- Web app Google Apps Script trên tài khoản Gmail cá nhân; chi phí 0.
- Dữ liệu: Google Sheets (1 file chính + 1 file nhạy cảm). File giấy tờ: thư mục Google Drive riêng.
- Tên app: HR Tokutei (D-029).
- Code: GitHub repo private `dautokute9x/jinzai-manager` (trước đây `hr-tokutei-app`, D-082), dán thủ công hoặc `clasp push` vào Apps Script (D-015).
- 2 môi trường: thử nghiệm (dữ liệu giả) và thật.
- Cấm sửa tay trên Sheets; mọi ghi qua app có kiểm tra, khóa, nhật ký (D-016).
- Sao lưu ngày 15 và ngày cuối tháng lúc 21:30 JST, giữ 12 tháng; chỉ 2 file Sheets (D-017).

## 3. Quy ước chung
- Múi giờ: JST (D-014). Ngôn ngữ mặc định: tiếng Việt, có tiếng Nhật (D-018).
- Chủ: đăng nhập Google (D-008). Nhân viên: ID + mật khẩu (D-083, thay liên kết D-075).
- Quy mô: < 1.000 bản ghi mỗi loại; nguồn import chung một cấu trúc (D-007).
- Lưu đầy đủ số hộ chiếu/在留カード trong file nhạy cảm riêng, không chia sẻ, bật xác minh 2 bước (D-009).

## 4. Quy tắc nghiệp vụ đã chốt
- Đơn tuyển "đã chốt" tính theo **ngày vào làm**; người 内定 chưa vào làm hiển thị "chờ vào làm" (D-006).
- Trạng thái hai tầng: con người tách khỏi từng lần giới thiệu (D-006).
- Doanh số: kỳ theo tháng, mốc xác nhận = ngày vào làm, hoàn/hủy ghi điều chỉnh âm vào tháng phát sinh (D-003).
- Chia doanh số theo % riêng từng người, nhập theo deal, tổng được khác 100%; doanh số công ty = giá trị deal; cá nhân = deal × %; đội = tổng cá nhân (D-004).
- Mục tiêu đội = tổng mục tiêu cá nhân (D-004).

## 5. MVP / mở rộng
Trong MVP: GĐ 1–8 + import từ Sheets cũ (9a). Ngoài MVP: GĐ 9b, 10, 11 (D-025, D-026). Môi trường thật tạo ngay trước import (D-028).

## 6. Hoãn
- Hợp đồng & đơn giá (D-005) — chặn GĐ 5, 8.
- Người dùng bên ngoài / thời điểm đa người dùng (D-010).
