# HR Tokutei

Hệ thống quản lý 人材紹介・登録支援機関 (特定技能), chạy trên Google Apps Script + Google Sheets.

- Tài liệu dự án: thư mục [`docs/`](docs/) (yêu cầu, quyết định, roadmap, mô hình dữ liệu, test case, changelog).
- Code Apps Script: thư mục [`src/`](src/). Repo này **không bao giờ** chứa dữ liệu thật hay khóa bí mật.
- Repo `jinzai-manager` = **bản miễn phí** (Apps Script + Sheets), tiếp nối `hr-tokutei-app` 0.32.1 (D-082). Nâng cấp tiếp theo: `docs/ROADMAP.md` → GĐ 12. Hướng website doanh nghiệp làm sau (cùng file ROADMAP).
- Yêu cầu gốc của chủ dự án: [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md).

## Cài bản thử nghiệm (bước 1.1)

Làm trên máy tính, đăng nhập đúng tài khoản Gmail sẽ dùng cho app. Khoảng 10 phút.

### 1. Tạo project
1. Mở <https://script.google.com> → bấm **Dự án mới** (New project).
2. Bấm vào tên "Dự án không có tiêu đề" ở góc trên → đổi thành **HR Tokutei (TEST)**.

### 2. Hiện file cấu hình
1. Thanh bên trái → biểu tượng **bánh răng** (Cài đặt dự án / Project Settings).
2. Tích ô **Hiển thị tệp kê khai "appsscript.json" trong trình chỉnh sửa** (Show "appsscript.json" manifest file in editor).
3. Quay lại biểu tượng **< >** (Trình chỉnh sửa / Editor).

### 3. Dán 45 file
Với mỗi file dưới đây: mở file trên GitHub → bấm nút **Copy raw file** (biểu tượng 2 ô vuông, góc phải trên khung code) → dán vào Apps Script, **thay toàn bộ** nội dung cũ.

| File trên GitHub | Trong Apps Script |
|---|---|
| `src/appsscript.json` | Mở file `appsscript.json` có sẵn |
| `src/Code.gs` | Mở file `Code.gs` có sẵn |
| `src/Index.html` | Bấm **+** cạnh chữ "Tệp" → **HTML** → đặt tên `Index` (không gõ `.html`) |
| `src/I18n.html` | Bấm **+** → **HTML** → đặt tên `I18n` |
| `src/Schema.gs` | Bấm **+** → **Tập lệnh** (Script) → đặt tên `Schema` (không gõ `.gs`) |
| `src/Setup.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Setup` |
| `src/Repo.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Repo` |
| `src/Staff.html` | Bấm **+** → **HTML** → đặt tên `Staff` |
| `src/Backup.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Backup` |
| `src/Perf.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Perf` |
| `src/PerfUi.html` | Bấm **+** → **HTML** → đặt tên `PerfUi` |
| `src/BackupUi.html` | Bấm **+** → **HTML** → đặt tên `BackupUi` (Apps Script không cho 2 file trùng tên, kể cả khác loại) |
| `src/Company.html` | Bấm **+** → **HTML** → đặt tên `Company` |
| `src/Lookup.html` | Bấm **+** → **HTML** → đặt tên `Lookup` |
| `src/Contact.html` | Bấm **+** → **HTML** → đặt tên `Contact` |
| `src/Jobs.html` | Bấm **+** → **HTML** → đặt tên `Jobs` |
| `src/Person.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Person` |
| `src/PersonUi.html` | Bấm **+** → **HTML** → đặt tên `PersonUi` (không đặt `Person` vì trùng tên với `Person.gs`) |
| `src/Application.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Application` |
| `src/ApplicationUi.html` | Bấm **+** → **HTML** → đặt tên `ApplicationUi` |
| `src/InterviewUi.html` | Bấm **+** → **HTML** → đặt tên `InterviewUi` |
| `src/EmploymentUi.html` | Bấm **+** → **HTML** → đặt tên `EmploymentUi` |
| `src/Dashboard.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Dashboard` |
| `src/DashboardUi.html` | Bấm **+** → **HTML** → đặt tên `DashboardUi` |
| `src/VisaUi.html` | Bấm **+** → **HTML** → đặt tên `VisaUi` |
| `src/Visa.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Visa` |
| `src/WorkingUi.html` | Bấm **+** → **HTML** → đặt tên `WorkingUi` |
| `src/SupportUi.html` | Bấm **+** → **HTML** → đặt tên `SupportUi` |
| `src/Finance.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Finance` |
| `src/FinanceUi.html` | Bấm **+** → **HTML** → đặt tên `FinanceUi` |
| `src/SalesUi.html` | Bấm **+** → **HTML** → đặt tên `SalesUi` |
| `src/InvoiceUi.html` | Bấm **+** → **HTML** → đặt tên `InvoiceUi` |
| `src/Import.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Import` |
| `src/Export.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Export` |
| `src/ImportUi.html` | Bấm **+** → **HTML** → đặt tên `ImportUi` |
| `src/Auth.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Auth` |
| `src/Demo.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Demo` |
| `src/Legacy.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Legacy` |
| `src/LegacyUi.html` | Bấm **+** → **HTML** → đặt tên `LegacyUi` |
| `src/XlsxUi.html` | Bấm **+** → **HTML** → đặt tên `XlsxUi` |
| `src/Prep.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Prep` |
| `src/PrepUi.html` | Bấm **+** → **HTML** → đặt tên `PrepUi` |
| `src/DocsUi.html` | Bấm **+** → **HTML** → đặt tên `DocsUi` |
| `src/Mendan.gs` | Bấm **+** → **Tập lệnh** → đặt tên `Mendan` |
| `src/MendanUi.html` | Bấm **+** → **HTML** → đặt tên `MendanUi` |

Bấm biểu tượng **Lưu** (hoặc Ctrl+S / ⌘+S).

### Cách nhanh thay cho bước 3: đẩy cả 45 file bằng clasp (máy tính có Node.js 22+)
1. Mở <https://script.google.com/home/usersettings> → bật **Google Apps Script API**.
2. Trong project: **Cài đặt dự án** (bánh răng) → sao chép **Mã tập lệnh** (Script ID).
3. Trên máy tính (Terminal / PowerShell):
   ```
   npm install -g @google/clasp
   clasp login
   git clone https://github.com/dautokute9x/jinzai-manager.git
   cd jinzai-manager
   ```
4. Tạo file `.clasp.json` trong thư mục đó, nội dung: `{"scriptId": "MÃ_VỪA_SAO_CHÉP", "rootDir": "src"}`
5. `clasp push -f` → tải lại trình soạn thảo, thấy đủ 45 file. **Lưu ý:** push thay TOÀN BỘ file trong project bằng file trong `src/` (file bạn tự thêm trong project sẽ mất). Lần sau cập nhật: `git pull` rồi `clasp push -f`.

### 4. Cấp quyền (làm lại mỗi khi app cần quyền mới)
1. Ở thanh trên trình soạn thảo, ô chọn hàm → chọn **getSetupStatus** → bấm **Chạy** (Run). Từ bản 0.5.0 app cần thêm quyền tạo lịch tự động (sao lưu), nên phải làm lại bước này.
2. Google hỏi quyền → chọn Gmail của bạn. Nếu thấy *"Google chưa xác minh ứng dụng này"*: kiểm tra đúng tên **HR Tokutei (TEST)** rồi bấm **Nâng cao → Đi tới HR Tokutei (TEST)** → **Cho phép**.
3. Hàm chạy xong là được (không tạo gì).

### 5. Mở bản thử nghiệm
1. Góc phải trên → **Triển khai** (Deploy) → **Kiểm thử các bản triển khai** (Test deployments).
2. Loại: **Ứng dụng web** (Web app) → sao chép **URL** (kết thúc bằng `/dev`).
3. Mở URL trong tab mới. Nếu Google hỏi cấp quyền: kiểm tra tên dự án là **HR Tokutei (TEST)** của bạn rồi mới cho phép.

Kỳ vọng: khung app HR Tokutei có menu, nút VI / 日本語, phiên bản **0.31.0**, giờ JST hiện tại (giờ Việt Nam + 2 tiếng). Vào **Cài đặt → Khởi tạo / nâng cấp dữ liệu** để tạo thư mục `HR Tokutei (TEST)` trong Drive (đã tạo rồi thì bấm lại để gắn cảnh báo sửa tay cho các tab). Danh sách **Nhân viên phụ trách** và khu vực **Sao lưu** nằm ngay dưới trong trang Cài đặt — bấm **Bật sao lưu tự động** một lần.

> Link `/dev` luôn chạy code mới nhất đã lưu và chỉ người có quyền sửa project (là bạn) mở được. Không chia sẻ project hay link cho người khác.

### Gặp lỗi "Rất tiếc, không thể mở tệp tại thời điểm này"
Thường do trình duyệt đang đăng nhập **nhiều tài khoản Google** cùng lúc, nên Google mở link bằng tài khoản khác với chủ project.
1. Mở cửa sổ ẩn danh (Chrome: Ctrl+Shift+N / ⌘+Shift+N).
2. Đăng nhập **chỉ** Gmail sở hữu project, rồi dán link `/dev`.
3. Muốn dùng lâu dài: tạo một hồ sơ (profile) Chrome riêng chỉ đăng nhập Gmail này.
4. Vẫn lỗi: kiểm tra link được sao chép đủ, lấy từ **Triển khai → Kiểm thử các bản triển khai**, kết thúc bằng `/dev`.

### Gặp lỗi "máy chủ đã gặp phải lỗi trong quá trình đọc từ bộ nhớ. Mã lỗi INTERNAL"
Thường do bản code mới cần thêm quyền nhưng chưa được cấp. Trong trình soạn thảo, chọn hàm vừa lỗi (vd. `backupNow`) → **Chạy** → cho phép nếu được hỏi → tải lại link `/dev`.

### Sau khi cập nhật lên 0.27.0
Thêm file `Auth.gs`, bấm **Nâng cấp ngay** / Khởi tạo một lần (STAFF thêm cột vai trò + liên kết). Muốn cho nhân viên dùng: xem mục **Cho nhân viên dùng** bên dưới.

### Sau khi cập nhật lên 0.25.0
Thêm 3 file `Import.gs`, `Export.gs`, `ImportUi.html`. Không đổi cấu trúc dữ liệu. Cài đặt có thêm **Nhập dữ liệu (CSV)** và **Xuất dữ liệu**. Chạy lại bước 4 (Cấp quyền) nếu Google hỏi.

### Sau khi cập nhật lên 0.24.0
Thêm 4 file `Finance.gs`, `FinanceUi.html`, `SalesUi.html`, `InvoiceUi.html`, rồi bấm **Khởi tạo** một lần (6 tab tiền mới + PERSON thêm cột, có sao lưu trước khi nâng cấp). Sau đó vào Cài đặt → **Tài chính & hóa đơn** điền tên, số T…, tài khoản nhận tiền (dữ liệu giả khi thử).

### Sau khi cập nhật lên 0.22.0
Thêm file `SupportUi.html`, rồi bấm **Khởi tạo** một lần để tạo tab SUPPORT_LOG.

### Sau khi cập nhật lên 0.21.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần để tab FILE có thêm cột (tải tệp giấy tờ). **Chỉ dùng tệp giả** khi thử (không tải hộ chiếu / thẻ lưu trú thật lên bản thử nghiệm).

### Sau khi cập nhật lên 0.19.0
Thêm file `Visa.gs`, rồi bấm **Khởi tạo / nâng cấp dữ liệu** một lần: tạo tab CASE_DOCUMENT và nạp danh mục Giấy tờ (12 mục mẫu — tự sửa trong Cài đặt → Danh mục). Thiếu `Visa.gs` thì tạo hồ sơ visa sẽ báo lỗi.

### Sau khi cập nhật lên 0.18.0
Thêm file `VisaUi.html`, rồi bấm **Khởi tạo / nâng cấp dữ liệu** một lần để tạo tab IMMIGRATION_CASE (Hồ sơ visa). Chưa bấm thì trang Hồ sơ visa và thẻ Việc cần làm báo lỗi tiêu đề tab.

### Sau khi cập nhật lên 0.16.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần để tạo tab SETTING (cấu hình Việc cần làm). Chưa bấm thì thẻ Việc cần làm báo lỗi tiêu đề tab.

### Sau khi cập nhật lên 0.13.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần: nối cột mới cho tab EMPLOYMENT (có sao lưu trước) và nạp danh mục "Lý do nghỉ việc".

### Sau khi cập nhật lên 0.12.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần để nối cột mới cho tab INTERVIEW (có sao lưu trước).

### Sau khi cập nhật lên 0.11.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần để nối cột mới cho tab APPLICATION (có sao lưu trước).

### Sau khi cập nhật lên 0.10.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần: nối cột mới cho tab PERSON (có sao lưu trước) và nạp sẵn các danh mục mới.

### Sau khi cập nhật lên 0.9.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần để nối cột mới cho tab JOB_ORDER (có sao lưu trước).

### Sau khi cập nhật lên 0.8.0
Bấm **Khởi tạo / nâng cấp dữ liệu** một lần để nối cột mới cho tab CONTACT (có sao lưu trước).

### Sau khi cập nhật lên 0.7.0
Vào **Cài đặt → Khởi tạo / nâng cấp dữ liệu** bấm **một lần**: app tự sao lưu (loại "Trước nâng cấp"), nối cột mới cho tab COMPANY, tạo tab LOOKUP và nạp sẵn 19 lĩnh vực. Chưa bấm thì trang Công ty sẽ báo lỗi tiêu đề cột.

### Sau khi cập nhật lên 0.6.1 / 0.6.2
Vào **Cài đặt → Khởi tạo / nâng cấp dữ liệu** bấm **một lần** (định dạng sẵn các tab để lưu nhanh hơn), rồi bấm **Tạo/bổ sung dữ liệu giả** trong khu Đo tốc độ một lần nữa trước khi đo lại. Bấm lại không tạo trùng gì.

## Dữ liệu mẫu để kiểm thử (chỉ bản thử nghiệm)
Cài đặt → **Dữ liệu mẫu để kiểm thử** → **Tạo dữ liệu mẫu** (chỉ chủ, chỉ 1 lần, khoảng 3–6 phút, để nguyên trang tới khi báo xong). Thêm dữ liệu GIẢ đủ để bấm thử mọi màn hình: nhân viên / công ty / người có chữ "Mẫu" hoặc tên giả, email `@example.com`, ngày tính theo hôm nay. Không sửa / xóa dữ liệu đang có. Bản thật không có nút này.

## Cho nhân viên dùng (GĐ 10 — liên kết truy cập riêng)
Gmail cá nhân không cho app biết email của người khác, nên mỗi nhân viên dùng **một liên kết riêng**.
1. **Triển khai → Quản lý các bản triển khai → Sửa** (hoặc Triển khai mới) → Ứng dụng web: *Thực thi với tư cách* **Tôi**; *Ai có quyền truy cập* **Bất kỳ ai có Tài khoản Google** → Triển khai. Dùng link kết thúc bằng `/exec` (link `/dev` chỉ chủ mở được). Người không có liên kết sẽ thấy trang "không có quyền".
2. Mở app bằng link `/exec` của bạn → Cài đặt → **Nhân viên**: chọn **Vai trò** (Nhân viên / Quản lý) → **Tạo liên kết** → sao chép ngay (chỉ hiện một lần) → gửi riêng cho đúng người.
3. Nhân viên mở liên kết, đăng nhập Gmail của họ là dùng được. Nghỉ việc: đổi trạng thái "Đã nghỉ" hoặc bấm **Thu hồi** → liên kết hết hiệu lực ngay. Nghi bị lộ: **Tạo lại**.
- Liên kết nằm trong địa chỉ trang → đừng chụp màn hình thanh địa chỉ, nhắc nhân viên không dùng máy chung (lịch sử trình duyệt giữ liên kết).
- Quyền của **Nhân viên** / **Quản lý**: Cài đặt → **Phân quyền** (bật / tắt, có hiệu lực ngay ở lần gọi sau; nhân viên tải lại trang để menu cập nhật). Mặc định: Nhân viên = tuyển dụng, visa, hỗ trợ + **xem số giấy tờ đầy đủ** + **doanh số của mình**; Quản lý = tất cả. Luôn chỉ chủ: Khởi tạo, Khôi phục, sao lưu tự động, cấp liên kết, đổi vai trò, Phân quyền, mở tệp giấy tờ.

## Tạo bản thật (bước 9a — chỉ làm khi bản thử nghiệm đã kiểm thử xong)
Bản thật là **một project Apps Script riêng**, không dùng chung với bản thử nghiệm (dữ liệu giả và dữ liệu thật không bao giờ lẫn nhau). Khoảng 30 phút.
1. Bật **xác minh 2 bước** cho tài khoản Google (D-009).
2. <https://script.google.com> → **Dự án mới** → đổi tên thành **HR Tokutei** → làm bước 2 + 3 ở trên (hiện `appsscript.json`, dán đủ 45 file từ GitHub, bản mới nhất) → **Lưu**.
3. Ô chọn hàm → chọn **setProdEnv** → **Chạy** → cấp quyền (kiểm tra đúng tên **HR Tokutei**). Nhật ký thực thi phải ra: *"Đã đặt môi trường thật (PROD)"*. Nếu báo "đã có dữ liệu thử nghiệm" → bạn đang ở nhầm project thử nghiệm, dừng lại.
4. Ô chọn hàm → **getSetupStatus** → **Chạy** (cấp nốt quyền Drive / Sheets / lịch tự động nếu Google hỏi).
5. **Triển khai → Triển khai mới** → bánh răng → **Ứng dụng web**: Mô tả `0.31.0`; *Thực thi với tư cách* **Tôi**; *Ai có quyền truy cập* **Bất kỳ ai có Tài khoản Google** (để nhân viên dùng liên kết riêng; người không có liên kết chỉ thấy trang "không có quyền") → **Triển khai** → sao chép link kết thúc bằng `/exec`. Lưu link này vào dấu trang.
6. Mở link `/exec` → không còn băng vàng "Bản thử nghiệm"; Cài đặt không có mục Đo tốc độ / Dữ liệu mẫu. Bấm **Khởi tạo / nâng cấp dữ liệu**: tạo thư mục `HR Tokutei` với `HR_DATA` / `HR_SENSITIVE` / `HR_FILES` (không có đuôi `_TEST`).
7. Cài đặt → **Sao lưu** → **Bật sao lưu tự động**.
8. Cài đặt → **Tài chính & hóa đơn**: điền thông tin thật (tên công ty, địa chỉ, số T, tài khoản). **Danh mục**: kiểm tra lĩnh vực, giấy tờ. **Nhân viên**: thêm người thật, chọn vai trò. **Phân quyền**: xem lại.
9. Dữ liệu cũ: Cài đặt → **Nhập file quản lý cũ (Excel)** (xem mục dưới). Bảng khác (đơn tuyển, ứng viên chưa vào làm…): **Nhập từng bảng (CSV / Excel)** theo thứ tự 1 → 5. Mỗi lần đều bấm **Kiểm tra** trước rồi mới nhập.
10. Cấp liên kết cho nhân viên (mục "Cho nhân viên dùng" ở trên).

Cập nhật code bản thật về sau: dán file đã đổi → Lưu → **Triển khai → Quản lý các bản triển khai → Sửa (bút chì) → Phiên bản: Phiên bản mới → Triển khai** (link `/exec` giữ nguyên). Nếu CHANGELOG ghi "đổi cấu trúc dữ liệu" thì sau đó bấm **Khởi tạo** (app tự sao lưu trước khi nâng cấp).

## Nhập file quản lý cũ (Excel) — D-079
Dành cho file Excel đang dùng (sheet **会社情報** + sheet danh sách người lao động). File được đọc **ngay trong trình duyệt**, không tải lên đâu.
1. Cài đặt → **Nhập file quản lý cũ (Excel)** → **Chọn file Excel / CSV** (.xlsx; hoặc mỗi sheet 1 file CSV). App tự nhận sheet theo tên cột (法人名; スタッフ名 + 勤務状況).
2. **Kiểm tra**: không ghi gì; xem số công ty / người mới, danh sách nhân viên & công ty sẽ tạo, các cảnh báo.
3. **Sao lưu rồi nhập**: app sao lưu trước, nhập 会社情報 rồi người lao động, mỗi lần 200 dòng (≈ 1.200 người mất vài phút, để nguyên trang).
4. Nhập lại file cũng an toàn (công ty trùng tên, người trùng số 在留カード / tên + ngày sinh → bỏ qua; dòng là lần vào làm khác của cùng người → thêm lần vào làm).
Quy tắc (chủ dự án chọn): 勤務中 / 支援なし / …予定 = đang làm (支援なし: không nhắc 定期面談, không tính phí hỗ trợ); 入社前 = chờ vào làm; 退職 = đã nghỉ (không có 退職日 → "đã nghỉ, không rõ ngày"); 失踪 = đã nghỉ, lý do 失踪; 辞退 / 海外 / その他 = chỉ lưu hồ sơ người. 紹介料 / 支援委託料 → hợp đồng phí **từ đầu tháng nhập** (không gợi ý doanh số các tháng trước). Tên trong CS部担当 / 書類部担当者 / 人材担当 chưa có → tạo nhân viên (đổi tên đầy đủ sau, liên kết theo ID nên không mất gì).
Sau khi nhập: lần vào làm thiếu ngày có nút **Bổ sung thông tin** (hồ sơ người → Quá trình làm việc).

## Khôi phục dữ liệu
1. **Cài đặt → Sao lưu**: chọn bản cần khôi phục (cột Tình trạng phải là "Đủ 2 file") → **Khôi phục** → **Xác nhận khôi phục**.
2. App tự làm: sao lưu dữ liệu hiện tại (loại "Trước khôi phục") → tạo cặp file làm việc mới từ bản đã chọn → chuyển cặp file cũ vào `HR_BACKUP_TEST/Đã thay thế` (không xóa).
3. Muốn quay lại như trước khi khôi phục: khôi phục bản loại **"Trước khôi phục"** vừa tạo.
4. Đừng tự sửa, đổi tên hay di chuyển file trong `HR_BACKUP_TEST` — app nhận ra bản sao lưu theo tên file.

## Kiểm tra tự động (dành cho người sửa code)
`npm install && npm test` — kiểm tra giao diện, khởi tạo, lõi ghi dữ liệu, sao lưu và đo tốc độ bằng môi trường giả lập, không thay cho việc chạy trên link `/dev`.

## Cập nhật code về sau
Mỗi bước mới: dán lại các file đã thay đổi (danh sách có trong `docs/CHANGELOG.md`) → Lưu → tải lại link `/dev`.
