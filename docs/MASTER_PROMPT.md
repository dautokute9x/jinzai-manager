# MASTER PROMPT — WEBSITE QUẢN LÝ JINZAI, DOANH SỐ VÀ NGHIỆP VỤ HỖ TRỢ

> Cách dùng: Gửi toàn bộ nội dung tệp này cho AI làm web. Nếu có, đính kèm mã nguồn, cấu trúc Google Sheets/Database và ảnh giao diện hiện tại. AI phải đọc hết yêu cầu trước khi đề xuất hoặc viết mã.

## 1. Vai trò và nhiệm vụ của bạn

Bạn là chuyên viên phân tích nghiệp vụ, kiến trúc sư phần mềm, lập trình viên full-stack và người kiểm thử. Hãy giúp tôi khảo sát, thiết kế, nâng cấp hoặc xây dựng lại website quản lý nhân sự nước ngoài tại Nhật mang tên tạm thời **HR Tokutei**.

Tôi là người quản lý nghiệp vụ, không phải lập trình viên chuyên nghiệp. Giải thích bằng tiếng Việt dễ hiểu. Giữ thuật ngữ tiếng Nhật cần thiết để đối chiếu công việc.

Mục tiêu là một hệ thống có thể lưu dữ liệu thật, liên kết nghiệp vụ, đăng nhập và phân quyền thực sự. Giao diện mẫu phải được ghi rõ là mẫu; không được mô tả nút bấm, dữ liệu tĩnh hoặc chức năng chưa kết nối là tính năng đã hoàn thành.

Hãy làm từng giai đoạn nhỏ có thể kiểm tra. Không viết toàn bộ hệ thống trong một lần rồi mới kiểm thử. Không tự quyết định những quy tắc nghiệp vụ còn chưa rõ.

## 2. Bối cảnh công việc và kết quả mong muốn

Tôi làm trong lĩnh vực **人材紹介・登録支援機関** tại Nhật, quản lý khách hàng, tuyển dụng và hỗ trợ người lao động nước ngoài. Nhóm chính là **特定技能**, đồng thời cần quản lý thêm **一般就労** và các loại hồ sơ liên quan khi có.

Ngành nghề gồm xây dựng, nhà hàng, thực phẩm, điều dưỡng, khách sạn và các ngành khác. Danh mục ngành, quốc tịch, tư cách lưu trú và bộ phận cần thêm/sửa được.

Quy trình cần liên kết:

Khách hàng có nhu cầu tuyển → tạo đơn tuyển → tìm và kiểm tra ứng viên → giới thiệu/matching → phỏng vấn → đỗ → hợp đồng, giấy tờ và visa → chuẩn bị tiếp nhận → vào làm → hỗ trợ định kỳ và xử lý phát sinh → gia hạn, chuyển việc, nghỉ việc hoặc kết thúc hỗ trợ.

Hiện thông tin nằm ở nhiều Google Sheets, Drive và tin nhắn. Tôi muốn giảm nhập trùng, bỏ sót, chậm cập nhật và tình trạng không rõ ai chịu trách nhiệm.

Khi mở web, tôi cần biết doanh số, phần thiếu so với mục tiêu, đơn tuyển thiếu người, ứng viên đang ở bước nào, hồ sơ thiếu gì, đang chờ ai, hạn nào sắp đến, khoản nào chưa thu và việc nào nhân viên chưa hoàn thành.

## 3. Hệ thống hiện tại và phạm vi khảo sát

Hệ thống hiện tại chạy bằng Google Apps Script, có URL tham khảo:

https://script.google.com/macros/s/AKfycbw8NyFixCFoDCTuc5ur_kTcHYEqA6V2z9i5L7OzrQNM_Lod1S-xV8GUKVwxJVCpC0o/exec

Các mục đang xuất hiện trên giao diện:

- Tổng quan.
- Công ty.
- Đơn tuyển.
- Con người.
- Hồ sơ visa.
- Đang làm việc.
- Doanh số.
- Hóa đơn & 入金.
- Cài đặt.

Qua ảnh giao diện đã có một số trường: mã người PER-..., mã công ty CO-..., recruiter, CS, người phụ trách giấy tờ, tư cách lưu trú, hạn visa, hạn hộ chiếu; hồ sơ công ty có người liên hệ, hợp đồng và phí.

**Nhìn thấy một menu hoặc trường dữ liệu không có nghĩa chức năng bên trong đã đầy đủ.** Kiểm tra mã nguồn, mô hình dữ liệu và hành vi thực tế trước khi kết luận.

Nếu không mở được link, thiếu đăng nhập hoặc không có mã nguồn, nói rõ giới hạn. Link triển khai không thay thế mã nguồn Apps Script. Đề nghị tôi cung cấp các tệp .gs/.html, cấu trúc Sheets/Database hoặc ảnh cần thiết; vẫn có thể làm phân tích nghiệp vụ và thiết kế với các thông tin đã có.

Chỉ đánh giá phương án giữ Apps Script hoặc chuyển nền tảng sau khi khảo sát. Nêu lý do, khả năng đáp ứng, cách triển khai, công bảo trì và chi phí dự kiến có căn cứ. Tôi chưa chốt ngân sách hoặc nền tảng mới; không tự coi ngân sách bằng 0, không tự đăng ký dịch vụ trả phí.

## 4. Quy mô, ngôn ngữ và thiết bị

### 4.1. Quy mô dữ liệu

- Thiết kế cho **1.000–2.000 người**, gồm ứng viên, người đang làm và người đã nghỉ cần lưu lịch sử.
- Đây là số người được quản lý, không phải số nhân viên sử dụng hệ thống.
- Mỗi người có thể có nhiều lần phỏng vấn, hợp đồng, công ty, hồ sơ visa, biên bản 定期面談 và vụ việc.
- Phải tính đến lượng lịch sử tăng theo năm và nhiều nhân viên thao tác đồng thời. Số tài khoản, số truy cập đồng thời và dung lượng tài liệu là thông tin cần xác nhận khi chọn kiến trúc.
- Danh sách cần phân trang, lọc, sắp xếp, tìm kiếm; không tải toàn bộ tài liệu và toàn bộ dữ liệu nhạy cảm về trình duyệt rồi mới lọc.

### 4.2. Bốn ngôn ngữ

Giao diện phải có **tiếng Việt, tiếng Nhật, tiếng Indonesia và tiếng Myanmar/Miến Điện**. Có nút chuyển ngôn ngữ và ghi nhớ theo tài khoản.

Dịch đồng bộ menu, nhãn trường, trạng thái, thông báo lỗi, nút bấm, hướng dẫn và cảnh báo. Hiển thị đúng Unicode, font Myanmar và các ngôn ngữ còn lại trên máy tính/điện thoại.

Lưu trạng thái bằng mã thống nhất và hiển thị bản dịch tương ứng. Đổi ngôn ngữ không được làm thay đổi tên người, tên công ty, giấy tờ hoặc ghi chú gốc. Tách dịch giao diện với dịch nội dung hồ sơ; không mặc định gửi dữ liệu cá nhân đến dịch vụ dịch/AI bên ngoài.

### 4.3. Giao diện

Ưu tiên bảng thông tin rõ, bộ lọc dễ dùng và trang chi tiết có tab. Dùng được trên máy tính và điện thoại. Ngày tháng, tiền yên và thuật ngữ nghiệp vụ phải nhất quán; mặc định lịch hạn nghiệp vụ dùng múi giờ Nhật, cho phép cấu hình khi cần.

## 5. Nguyên tắc dữ liệu và liên kết

- Mỗi công ty và người có một định danh duy nhất. Giữ mã cũ hoặc có bảng đối chiếu khi chuyển dữ liệu.
- Một người có một hồ sơ gốc xuyên suốt vòng đời. Không tạo lại người mới khi đỗ, vào làm hoặc chuyển công ty.
- Một công ty có nhiều cơ sở, người liên hệ, đơn tuyển, hợp đồng và người lao động.
- Một ứng viên có nhiều lần ứng tuyển/phỏng vấn. Lưu riêng theo đơn tuyển, công ty và lần phỏng vấn.
- Lịch sử làm việc có ngày bắt đầu/kết thúc. Xác định được nơi làm hiện tại và nơi làm trong kỳ báo cáo quá khứ.
- Hợp đồng, phí và phân công cần có thời gian áp dụng; thay đổi mới không tự sửa dữ liệu đã chốt của kỳ cũ.
- Phân biệt người đã nghỉ công ty, tạm dừng tìm việc, đang được hỗ trợ và đã kết thúc quản lý. Không dùng một trường trạng thái cho tất cả.
- Ẩn dữ liệu khỏi danh sách thường dùng không được làm mất lịch sử hoặc sai báo cáo.
- Mỗi công việc có người phụ trách chính, hạn, trạng thái, bên đang chờ, lịch sử, ghi chú và tài liệu.
- Thông tin thiếu, dữ liệu chưa kiểm tra và thông tin đã xác nhận phải phân biệt được. Không điền ngày, số tiền hoặc kết quả giả cho đủ trường.

## 6. Tài khoản ID/mật khẩu và phân quyền

### 6.1. Tài khoản nhân viên

Mỗi nhân viên có **ID và mật khẩu riêng**. Quản trị viên tạo tài khoản, gán bộ phận, vai trò, phạm vi phụ trách; đặt lại mật khẩu và khóa tài khoản khi cần. Nhân viên đổi được mật khẩu của mình.

Mật khẩu không lưu dạng văn bản, không được hiển thị cho nhân viên khác hoặc xuất trong báo cáo/log. Đề xuất cơ chế xác thực phù hợp nền tảng; nếu chọn dịch vụ xác thực có sẵn, giải thích cách đáp ứng yêu cầu ID/mật khẩu.

Đăng xuất, hết phiên và khóa tài khoản phải có hiệu lực ở phía máy chủ. Tài khoản bị khóa không tiếp tục đọc/ghi qua phiên cũ.

### 6.2. Các lớp quyền

Phân quyền theo:

1. **Chức năng:** được vào mục nào.
2. **Thao tác:** xem, thêm, sửa, ẩn/khôi phục, xóa, duyệt, xuất Excel, tải tài liệu.
3. **Phạm vi:** chỉ hồ sơ mình phụ trách, nhóm/bộ phận được giao hoặc toàn hệ thống.
4. **Trường/tài liệu:** có thể xem tiến độ nhưng không nhất thiết thấy số tiền, tài liệu cá nhân hoặc nội dung vụ việc hạn chế.

Một nhân viên có thể kiêm nhiều bộ phận. Quản trị viên điều chỉnh quyền từng người; mặc định không có quyền nếu chưa được cấp. Quyền xem không đồng nghĩa được sửa hoặc xuất dữ liệu.

Ma trận khởi tạo để tôi duyệt:

| Vai trò | Phạm vi nghiệp vụ dự kiến |
| --- | --- |
| Quản trị viên | Toàn hệ thống, cấu hình, tài khoản, phân quyền |
| Quản lý | Tiến độ, báo cáo và dữ liệu các bộ phận được giao |
| Sales | Khách hàng, đơn tuyển, giới thiệu/phỏng vấn, doanh số được cấp quyền |
| Tuyển dụng | Ứng viên, matching, lịch và kết quả phỏng vấn |
| Hồ sơ/visa | Thu gom, hợp đồng, 受入れ前, thủ tục và hồ sơ visa |
| CS/hỗ trợ | Người đang làm, 定期面談, 定期届出, vấn đề phát sinh |
| Kế toán | Phí, hóa đơn, 入金, công nợ, chi trả được phân quyền |

Ví dụ: recruiter có thể được xem trạng thái visa để phối hợp nhưng không được xem hóa đơn hoặc sửa kết quả hồ sơ. Không tự mở rộng quyền tài chính cho toàn bộ sales/CS.

Quyền phải được kiểm tra ở **backend/API**, gồm danh sách, tìm kiếm, báo cáo, số tổng hợp, file và chức năng xuất. Ẩn menu không đủ. Đổi ID hồ sơ, dán link trực tiếp hoặc gọi API phải không vượt được quyền.

Không bắt buộc chia sẻ trực tiếp toàn bộ Google Sheets/Drive gốc cho nhân viên chỉ để họ dùng web. Liên kết và quyền tải file phải tương thích với quyền của hồ sơ.

Ghi lịch sử ai tạo/sửa/duyệt/đổi trạng thái, khi nào và thay đổi gì; không ghi mật khẩu/token. Nhân viên bị khóa không làm mất tên người thực hiện trong lịch sử.

## 7. Công ty, cơ sở và 担当者

Thông tin công ty: mã, tên pháp nhân, tên gọi tắt, furigana, mã số pháp nhân, ngành nghề, trạng thái giao dịch, mã bưu điện, tỉnh/thành, địa chỉ, **email công ty, số điện thoại công ty** và ghi chú.

Quản lý nhiều cơ sở/nơi làm việc khi có.

**Người liên hệ phía khách — 担当者** là dữ liệu riêng với:

- Họ tên, chức vụ/bộ phận.
- Email và số điện thoại riêng.
- Vai trò liên hệ: tuyển dụng, giấy tờ, hỗ trợ, kế toán/thanh toán hoặc khác.
- Đánh dấu liên hệ chính; một công ty có thể có nhiều người.

Phân biệt 担当者 phía khách với sales, CS và nhân viên giấy tờ nội bộ. Có thể phân công nhiều người nội bộ nhưng cần xác định người chính.

Trang chi tiết công ty tổng hợp đơn tuyển, ứng viên đã giới thiệu, người đang làm/đã nghỉ, hợp đồng, phí, giấy tờ, báo cáo, phỏng vấn định kỳ, vấn đề, doanh số, hóa đơn, công nợ và lịch sử liên lạc theo quyền.

## 8. Đơn tuyển dụng — 求人管理

Mỗi đơn thuộc công ty/cơ sở, có ngành, vị trí, số lượng, địa điểm, nội dung công việc, lương, giờ làm, ngày nghỉ, nhà ở, yêu cầu kinh nghiệm/tiếng Nhật/bằng cấp và ngày muốn vào làm.

Lưu sales, recruiter phụ trách, 求人票, điều kiện tuyển và ghi chú xác nhận với khách.

Theo dõi số người đã gửi, đã phỏng vấn, đỗ, đã vào làm, còn thiếu; định nghĩa cách tính để tránh một người phỏng vấn nhiều lần bị cộng nhiều người.

Trạng thái: mới nhận, đang tuyển, tạm dừng, đủ người, hủy. Lưu lý do chưa tuyển được, thay đổi điều kiện, ngày cập nhật và lịch sử. Không tự loại ứng viên bằng yêu cầu khách chưa đưa ra.

## 9. Con người, ứng viên và matching

### 9.1. Hồ sơ gốc

- Mã, tên Latin theo hộ chiếu, katakana, ngày sinh, giới tính, quốc tịch.
- Số điện thoại, email, địa chỉ; đang ở Nhật/nước ngoài.
- Tư cách lưu trú, hạn visa, hạn hộ chiếu và tài liệu liên quan.
- Tiếng Nhật, kinh nghiệm, quá trình làm việc/học tập, kỹ năng, chứng chỉ, kỳ thi đã đỗ.
- Nguyện vọng ngành, nơi làm, mức lương và ngày có thể vào làm.
- Nguồn ứng viên, đối tác/送り出し機関, người giới thiệu.
- Recruiter, CS, người phụ trách giấy tờ.
- Ảnh, 履歴書, bằng cấp, tài liệu và ghi chú.

### 9.2. Giới thiệu và phỏng vấn

Trạng thái sàng lọc có mới nhận, đang kiểm tra, sẵn sàng giới thiệu, tạm dừng. Kết quả giới thiệu/phỏng vấn lưu ở từng hồ sơ ứng tuyển: đã gửi, chờ lịch, đã xác nhận lịch, đã phỏng vấn, đỗ, trượt, từ chối, hủy.

Lưu ngày gửi, công ty, đơn tuyển, người phụ trách, ngày/giờ, địa điểm/link phỏng vấn, xác nhận lịch, kết quả và lý do. Lưu bằng chứng xác nhận lịch hoặc nội dung trao đổi khi có.

Cho phép nhiều vòng và nhiều công ty; không ghi đè lần cũ. Có tìm kiếm/lọc theo điều kiện và chức năng tạo/in phiếu giới thiệu, hồ sơ gửi khách.

### 9.3. Ứng viên tự nhập — giai đoạn mở rộng

Có thể làm biểu mẫu riêng để ứng viên nhập hồ sơ, ảnh, bằng cấp bằng ngôn ngữ phù hợp. Biểu mẫu chỉ truy cập hồ sơ của chính họ, không mở dữ liệu nội bộ.

Recruiter kiểm tra và duyệt trước khi dùng. Chức năng hỗ trợ chuyển nội dung sang tiếng Nhật phải có bước kiểm tra thủ công; nếu cần dịch vụ AI trả phí hoặc truyền dữ liệu ra ngoài, trình bày phương án và xin quyết định trước.

## 10. Chuẩn bị tiếp nhận — 受入れ前管理

Quản lý từng đợt tiếp nhận người đã đỗ nhưng chưa bắt đầu làm. Phân biệt chuyển công ty trong Nhật và từ nước ngoài sang; không tạo người trùng.

Lưu công ty/cơ sở tiếp nhận, ngày dự kiến và thực tế nhập cảnh, ngày dự kiến và thực tế vào làm, người phụ trách và các trở ngại.

Checklist điều chỉnh theo trường hợp: xác nhận điều kiện, hợp đồng, 事前説明, giấy tờ cá nhân/công ty, visa, thủ tục tiếp nhận, chỗ ở, vé/di chuyển, đón người và thủ tục khi vào làm.

Mỗi việc có người chính, hạn, trạng thái, bên đang chờ, ghi chú/tài liệu. Hiển thị việc còn thiếu và ảnh hưởng đến ngày vào làm.

Đánh dấu đã có kết quả visa không tự đồng nghĩa đã nhập cảnh hoặc đã vào làm. Khi xác nhận ngày bắt đầu thực tế, tạo/liên kết giai đoạn làm việc, giữ lịch sử chuẩn bị và chuyển thông tin cho CS.

## 11. Checklist thu gom giấy tờ — 必要書類・回収管理

Tạo mẫu theo loại thủ tục/ngành/quốc tịch/trường hợp, được thêm bớt cho từng hồ sơ. Tách giấy tờ của công ty, người lao động và bên khác.

Mỗi mục có tên giấy, bên cung cấp, người yêu cầu/kiểm tra, ngày yêu cầu, hạn nhận, ngày nhận, nội dung bổ sung, file/link Drive; ngày cấp/thời hạn sử dụng khi cần.

Trạng thái: chưa yêu cầu → đã yêu cầu → đã nhận → cần sửa hoặc đã kiểm tra; có không áp dụng với lý do.

Hiển thị số mục hoàn thành, còn thiếu, quá hạn và đang chờ bên nào. Chỉ được coi là đủ khi các mục bắt buộc đã kiểm tra hoặc được đánh dấu không áp dụng hợp lệ, không chỉ vì đã tải file.

Tài liệu công ty có thể dùng chung ở nhiều hồ sơ khi còn phù hợp; tham chiếu phiên bản đã dùng để thay tài liệu mới không làm mất bằng chứng hồ sơ cũ.

## 12. Hồ sơ visa và thủ tục liên quan

Quản lý xin mới, thay đổi/gia hạn tư cách lưu trú, 特定技能1号・2号 và loại khác có cấu hình. Một người có nhiều hồ sơ theo thời gian, liên kết đúng công ty/đợt tiếp nhận/giai đoạn làm việc.

Thông tin: loại, người chính, người kiểm tra, 行政書士/bên xử lý, hạn chuẩn bị, ngày dự kiến nộp, ngày đã nộp, số tiếp nhận, ngày yêu cầu bổ sung, hạn bổ sung, ngày có kết quả, kết quả và giấy tờ chứng minh.

Luồng mặc định: thu gom → kiểm tra nội bộ → quản lý xác nhận khi cần → công ty/người lao động xác nhận → chuyển 行政書士 → đã nộp → bổ sung nếu có → có kết quả → cập nhật giấy tờ mới. Luồng được điều chỉnh theo thủ tục.

Quản lý tiến độ phụ như 建設受入計画, CCUS, 協議会, thủ tục tiếp nhận từ nước ngoài, MWO hoặc giấy tờ dịch/công chứng khi áp dụng. Có thể thấy bước nào làm chậm hồ sơ chung.

Không hard-code yêu cầu pháp lý hoặc suy đoán quyền được làm việc từ ngày hết hạn. Khi cần tư vấn về nghĩa vụ, hạn luật định hay quy định mới, kiểm tra nguồn chính thức và nêu căn cứ; các quy tắc nghiệp vụ trong prompt không thay cho quy định pháp luật.

## 13. Hợp đồng mới, gia hạn và thay đổi

Tách hai nhóm:

- Hợp đồng dịch vụ/giới thiệu/ủy thác hỗ trợ với khách.
- Hợp đồng lao động và điều kiện lao động giữa công ty với người lao động.

Lưu loại, các bên, người liên quan, ngày bắt đầu/hết hạn, ngày cần chuẩn bị gia hạn, người chính, phiên bản, ngày hiệu lực, bản dự thảo và bản đã ký/đóng dấu.

Trạng thái: chưa soạn → đang soạn → chờ kiểm tra → chờ xác nhận → đã gửi ký → đã nhận bản ký → hoàn thành. Lưu thay đổi và lý do làm lại/gia hạn.

Cảnh báo sắp hết hạn, chưa gửi, chưa nhận bản ký. Không ghi đè điều kiện/hợp đồng cũ; xác định được bản có hiệu lực theo thời điểm. Hợp đồng dịch vụ liên kết với biểu phí và kỳ áp dụng.

## 14. Người đang làm việc và vòng đời hỗ trợ

Lưu công ty/cơ sở, ngày bắt đầu/kết thúc, trạng thái việc làm, trạng thái hỗ trợ, CS, người giấy tờ, hợp đồng lao động, mức phí hỗ trợ liên quan.

Theo dõi chuyển việc, nghỉ việc, về nước tạm thời, về nước/kết thúc, chuyển địa chỉ, thay đổi điều kiện và việc cần xử lý đi kèm. Về nước tạm thời không tự bị coi là nghỉ việc.

Khi chuyển công ty, đóng giai đoạn cũ và mở giai đoạn mới; giữ hồ sơ cá nhân, lịch sử, hợp đồng và các nghĩa vụ chưa xử lý. Kết thúc hỗ trợ không tự xóa công nợ hoặc vụ việc còn mở.

## 15. Báo cáo định kỳ — 定期届出管理

Yêu cầu vận hành của tôi là theo dõi báo cáo **hằng năm theo từng công ty**, có kỳ và hạn nộp cấu hình được. Phạm vi áp dụng phải theo loại nghiệp vụ đã xác nhận, không gán cứng cho mọi người/mọi tư cách lưu trú.

Mỗi hồ sơ báo cáo có công ty, kỳ, hạn, người chính, danh sách người trong kỳ, checklist số liệu/giấy tờ, kiểm tra, xác nhận khách, ngày nộp và kết quả tiếp nhận.

Trạng thái: chưa làm, đang thu thập, đang lập, chờ kiểm tra, chờ công ty xác nhận, sẵn sàng nộp, đã nộp, cần bổ sung, hoàn thành.

Giữ danh sách và dữ liệu đã dùng cho kỳ đó kể cả người đã nghỉ/chuyển sau này. Lưu bản đã nộp và bằng chứng; thay đổi sau nộp phải thành phiên bản/lịch sử riêng.

Màn hình tổng hợp lọc theo năm/kỳ, công ty, người phụ trách, trạng thái, thiếu giấy tờ, sắp hạn/quá hạn. Phân biệt bản thân doanh nghiệp nộp và bên mình hỗ trợ chuẩn bị/nộp khi có sự khác nhau.

## 16. Phỏng vấn định kỳ — 定期面談管理

Yêu cầu theo dõi kế hoạch **4 lần/năm cho từng người thuộc phạm vi hỗ trợ**, có chu kỳ và phạm vi cấu hình được. Xác nhận cách xếp lịch theo quý hoặc theo ngày vào làm trước khi lập trình.

Mỗi lần có kỳ, ngày dự kiến, ngày thực hiện, người thực hiện, hình thức, người tham gia, nội dung trao đổi với người lao động/công ty, biên bản, vấn đề phát hiện và việc tiếp theo.

Trạng thái: chưa đặt lịch, đã đặt lịch, hoàn thành, cần hẹn lại. Đổi lịch giữ lịch sử. Không chỉ đánh dấu hoàn thành mà thiếu thông tin tối thiểu đã thống nhất.

Hiển thị chưa làm, sắp đến, quá hạn; lần trước và lần tiếp theo. Một người không bị tạo trùng cùng kỳ do nhiều người thao tác hoặc tác vụ định kỳ chạy lại.

Có nút tạo vấn đề phát sinh từ nội dung面談, liên kết hai chiều; hoàn thành面談 không tự đóng vấn đề.

## 17. Vấn đề phát sinh — 相談・トラブル対応

Mỗi vấn đề là một vụ việc riêng, có mã, công ty, một/nhiều người liên quan; có thể là vấn đề chung công ty.

Phân loại: lương, giờ làm, bảo hiểm, thuế, nhà ở, sức khỏe, quan hệ nơi làm, nghỉ/chuyển việc và khác. Nội dung cần hạn chế quyền truy cập có thể cấu hình người được xem.

Lưu ngày tiếp nhận, nguồn, mô tả, mức ưu tiên, người chính/phối hợp, hạn, bên đang chờ và ngày cần liên hệ lại.

Trạng thái: mới tiếp nhận, đang xử lý, chờ phản hồi, đã giải quyết, kết thúc; cho mở lại với lý do.

Lưu diễn biến theo ngày, người thực hiện, tài liệu, kết quả và công việc tiếp theo. Có dashboard vụ việc lâu không cập nhật hoặc trễ hạn, tránh chỉ ghi một đoạn ghi chú rồi mất theo dõi.

## 18. Hạn visa, hộ chiếu và nhắc việc

Sử dụng dữ liệu gốc trong hồ sơ người. Nhắc trước **3 tháng, 2 tháng, 1 tháng và 10 ngày**; cấu hình được. Khi thực hiện phải định nghĩa rõ tháng theo lịch, ngày theo múi giờ và không gửi nhắc trùng.

Tách các trạng thái: chưa có ngày hết hạn, sắp hết hạn, đã quá hạn. Song song hiển thị tiến độ: chưa chuẩn bị, thu gom, đã nộp, chờ kết quả, cập nhật mới.

Liên kết đến hồ sơ đang xử lý. Không hiển thị người đã nộp như chưa ai xử lý; cũng không tự thay hạn visa cũ bằng ngày suy đoán khi chưa có giấy tờ mới.

Giữ lịch sử trước/sau gia hạn. Danh sách nhắc chính tập trung người còn thuộc phạm vi quản lý; người đã nghỉ tra cứu được khi cần.

Áp dụng nhắc việc cho hợp đồng, giấy tờ, 定期届出, 定期面談, vụ việc và công nợ. Trước mắt cần thông báo trên dashboard/in-app; gửi email, LINE hoặc kênh bên ngoài là phần cần xác nhận riêng về người nhận và dữ liệu gửi.

## 19. Doanh số, mục tiêu và KPI

### 19.1. Doanh số và trạng thái tài chính

Đặt mục tiêu theo tháng, đội, nhân viên. Hiển thị đạt, tỷ lệ hoàn thành và số còn thiếu.

Tách rõ doanh số dự kiến, doanh số xác nhận, giá trị đã lập hóa đơn, tiền đã thu và công nợ. Chúng liên kết nhưng không phải cùng một chỉ số.

Khi ứng viên đỗ, tạo/cập nhật dự kiến theo hợp đồng; không tự coi đã thu tiền. Thời điểm ghi nhận doanh số chính thức và cách phân bổ sales/recruiter phải hỏi để chốt, không tự chọn giữa ngày đỗ, visa, vào làm, xuất hóa đơn hay thanh toán.

Theo dõi phí giới thiệu, phí thủ tục, phí hỗ trợ tháng, khoản khác; đơn giá, thuế, chiết khấu, miễn phí, ngày hiệu lực sửa được theo khách/hợp đồng. Không hard-code các giá cũ.

**Nếu phí visa đã nằm trong gói giới thiệu thì không tính thêm thành doanh thu riêng.** Phải biết khoản nào đã bao gồm, khoản nào thu độc lập. Cách hiển thị thuế và cơ sở tính KPI cần thống nhất.

Theo dõi thu trước, thu còn lại, hủy, giảm và hoàn tiền. Với hợp đồng thu trước 1/2 rồi mới tuyển, hiển thị đủ/chưa đủ điều kiện và cơ chế ngoại lệ được duyệt.

Một giao dịch có nhiều người tham gia được phân bổ theo quy tắc nhưng tổng doanh số không bị nhân đôi. Hủy/sửa có lịch sử; không âm thầm sửa kỳ đã chốt.

### 19.2. Báo cáo tuyển dụng/KPI

Số hồ sơ nhận, đủ điều kiện, đã giới thiệu, phỏng vấn, đỗ/trượt/từ chối, vào làm; số chờ và lý do. Tỷ lệ đỗ, tốc độ xử lý, chất lượng ứng viên và lý do chưa đạt doanh số.

Lọc theo tháng/tuần, nhân viên, đội, ngành, quốc tịch, nguồn và khách. Phân biệt đếm số người duy nhất, số lần giới thiệu và số lượt phỏng vấn để báo cáo không gây hiểu nhầm.

## 20. Hóa đơn, 入金 và công nợ

Hóa đơn có mã, khách, hợp đồng/dịch vụ/người liên quan, kỳ tính phí, dòng khoản thu, số lượng, đơn giá, giảm, thuế, tổng, ngày lập/gửi, hạn trả và tài liệu.

Trạng thái lập/gửi tách với trạng thái tiền: chưa gửi/đã gửi; chưa thu/thu một phần/đủ/quá hạn. Hiển thị người phụ trách thu hồi.

Một hóa đơn có nhiều lần thu. Một lần chuyển khoản có thể phân bổ cho nhiều hóa đơn nếu cần; không phân bổ vượt số tiền hoặc ghi trùng một khoản thu. Lưu ngày, số tiền, tham chiếu và số còn thiếu.

Phí hỗ trợ tháng dựa trên người và mức phí có hiệu lực trong kỳ. Quy tắc vào/nghỉ giữa tháng, tạm dừng, miễn/giảm và hoàn tiền cần hỏi trước. Có màn hình xem trước, kiểm tra và chốt; chạy lại không lập trùng cùng kỳ.

Hỗ trợ đính kèm hóa đơn hiện có; xác nhận nhu cầu tạo/xuất hóa đơn PDF theo mẫu trước khi triển khai mẫu. Theo dõi hủy/điều chỉnh/hoàn tiền có lịch sử và không đếm trùng doanh số.

## 21. Khoản trả người giới thiệu

Quản lý riêng khoản bên mình phải trả cho người giới thiệu, tránh nhầm với phí thu từ khách.

Quy tắc từng sử dụng: **giới thiệu công ty 20.000 yên; giới thiệu nhân sự 10.000 yên/người; chỉ trả sau khi khách đã thanh toán**. Mức và thời điểm áp dụng phải cấu hình được.

Lưu người nhận, loại giới thiệu, công ty/người liên quan, số tiền, khoản khách cần thanh toán, điều kiện chi, ngày đủ điều kiện, ngày đã trả và bằng chứng.

Trạng thái chưa đủ điều kiện, có thể trả, đã trả. Chốt cách xử lý khách trả một phần/hủy/hoàn trước khi lập trình. Không tự động chuyển tiền; đây là quản lý theo dõi chi trả.

## 22. Dashboard, báo cáo và trang chi tiết

Dashboard theo quyền tài khoản cần có:

- Doanh số mục tiêu, dự kiến, xác nhận, phần thiếu; đã thu, chưa thu.
- Đơn tuyển thiếu người, ứng viên chờ giới thiệu/lịch/kết quả.
- Người sắp vào làm nhưng còn việc chưa xong.
- Hồ sơ thiếu giấy tờ, trễ, chờ kiểm tra/chờ bên khác.
- Hợp đồng sắp hết hạn/chưa nhận bản ký.
- 定期届出 chưa xong, 定期面談 chưa làm/quá hạn.
- Vấn đề đang mở, trễ hoặc lâu chưa cập nhật.
- Visa/hộ chiếu sắp hết hạn, thông tin còn thiếu.
- Hóa đơn chưa gửi, công nợ sắp hạn/quá hạn.
- Việc hôm nay, sắp hạn, quá hạn và người chính.

Bấm số liệu phải đến danh sách đúng bộ lọc. Báo cáo theo tuần/tháng/năm hoặc khoảng chọn; xuất Excel theo quyền, bao gồm bộ lọc/kỳ và ngày xuất để dễ đối chiếu.

Trang chi tiết người và công ty có tab liên kết các nghiệp vụ. Cùng công việc mở từ các trang phải là cùng bản ghi, không hai bản độc lập.

Dashboard của nhân viên chỉ tổng hợp dữ liệu được phép; không để lộ doanh thu hoặc số lượng ngoài phạm vi qua biểu đồ/tổng số.

## 23. Tài liệu, nhập/xuất và chuyển dữ liệu cũ

Nhập Excel/Google Sheets với mapping cột, kiểm tra dữ liệu, xem trước và báo lỗi theo dòng. Giữ tiếng Nhật/Myanmar, tên Latin, số điện thoại bắt đầu bằng 0 và các mã.

Phát hiện trùng có cơ chế xác nhận; không tự gộp chỉ vì trùng tên. Bản ghi chưa rõ đánh dấu chờ kiểm tra.

Tài liệu có thể tải lên hoặc liên kết Drive, có người sở hữu/phạm vi truy cập, phiên bản và ngày. Không đưa toàn bộ thư mục riêng ra công khai.

Trước chuyển dữ liệu: sao lưu, kiểm kê bảng và quan hệ, mapping ID, chạy thử, đối chiếu số lượng người/công ty/hồ sơ/hợp đồng và tổng số tiền. Có báo cáo lỗi, cách hoàn tác và thời điểm chuyển chính thức.

Không xóa hoặc viết đè dữ liệu thật để thử chức năng. Dùng môi trường/bộ dữ liệu giả riêng. Không đưa tài liệu cá nhân thật vào dữ liệu mẫu công khai.

## 24. Yêu cầu kỹ thuật và độ tin cậy

Bạn phải đề xuất kiến trúc phù hợp sau khảo sát. Nếu giữ Apps Script/Sheets, đánh giá hạn mức, tốc độ, xác thực/phân quyền phía server, thao tác đồng thời, tự động hóa và khả năng bảo trì. Nếu chuyển, giải thích cách chuyển và chi phí; không tự đổi stack không có lý do.

Các yêu cầu bắt buộc:

- Phân trang và lọc ở phía dữ liệu phù hợp; tải tài liệu khi cần.
- Không cho lưu trùng do bấm hai lần/chạy lại tác vụ, đặc biệt hóa đơn, lịch hẹn, khoản thu và chi.
- Khi hai nhân viên sửa cùng lúc, không âm thầm mất thay đổi; có cơ chế phát hiện phiên bản/xung đột phù hợp.
- Validation trên server; lỗi rõ và không báo lưu thành công khi thất bại.
- Lịch sử thay đổi, lưu trữ/khôi phục, sao lưu và thử khôi phục.
- Tách cấu hình, tài khoản thử và dữ liệu thật. Không hard-code mật khẩu, khóa API hoặc token vào frontend.
- Các tác vụ định kỳ có thể chạy lại an toàn, ghi nhận kết quả/lỗi và không tạo nhắc trùng.
- Ghi nhận hiệu năng trên dữ liệu tương đương 2.000 người và lịch sử; thống nhất mục tiêu thời gian phản hồi và môi trường đo, không hứa tốc độ chưa đo.

## 25. Kiểm thử và tiêu chí nghiệm thu

Không chỉ kiểm tra giao diện. Cần kiểm thử các luồng và quyền với dữ liệu giả có tình huống thực tế.

Tối thiểu phải chứng minh:

1. Tạo công ty có email/điện thoại và nhiều 担当者; phân công đúng nhân viên nội bộ.
2. Một ứng viên có nhiều công ty/vòng phỏng vấn; kết quả không ghi đè, KPI không cộng sai.
3. Từ đỗ sang 受入れ前, hồ sơ, rồi vào làm; không tạo trùng người hoặc nhầm ngày nhập cảnh với ngày vào làm.
4. Giấy đã nhận nhưng chưa kiểm tra chưa bị coi hoàn thành; hồ sơ dùng lại đúng phiên bản tài liệu.
5. Gia hạn hợp đồng/visa giữ bản cũ và cập nhật bản hiện hành đúng.
6. Chuyển việc/nghỉ vẫn tra được lịch sử và nằm đúng kỳ 定期届出 quá khứ.
7. Lập kế hoạch 定期面談 4 lần/năm, đổi lịch, quá hạn, tạo vấn đề và không tạo lịch trùng.
8. Cảnh báo hạn đúng, gồm thiếu ngày, quá hạn, tháng nhuận, ranh giới ngày theo múi giờ và đã nộp nhưng chờ kết quả.
9. Gói phí bao gồm visa không bị cộng lại; dự kiến, xác nhận và tiền thu hiển thị khác nhau.
10. Thu một phần/nhiều lần, quá hạn, hủy/hoàn; số tiền và công nợ đối chiếu được.
11. Khoản trả người giới thiệu chưa đủ điều kiện khi khách chưa thanh toán theo quy tắc chốt.
12. Từng vai trò chỉ thấy đúng phần; link/API/đổi mã hồ sơ/xuất file/Drive không vượt quyền; khóa tài khoản có hiệu lực.
13. Bốn ngôn ngữ hiển thị đúng, đổi ngôn ngữ không đổi dữ liệu gốc.
14. Hai người cùng sửa không mất dữ liệu; thao tác lại không ghi trùng.
15. Nhập dữ liệu lỗi/trùng có báo cáo; thử chuyển và khôi phục được.
16. Tìm kiếm, phân trang, báo cáo và dashboard hoạt động với 2.000 người kèm nhiều hợp đồng, hồ sơ,面談 và vụ việc; không chỉ 2.000 dòng trống.

Với mỗi giai đoạn, báo rõ đã chạy gì, kết quả, lỗi còn lại. Nếu môi trường không chạy được kiểm thử hoặc triển khai, nói rõ phần chưa xác minh; không ghi “đã kiểm thử” khi mới đọc mã.

## 26. Quy trình làm việc theo giai đoạn

### Giai đoạn 0 — Khảo sát và chốt những điểm còn thiếu

Đọc hết prompt và nguồn được cung cấp. Tóm tắt mục tiêu, liệt kê chức năng đã kiểm chứng, chưa kiểm chứng, thiếu và cần sửa. Nêu các câu hỏi nghiệp vụ quan trọng theo nhóm, tối đa 5 câu ưu tiên mỗi lần; không hỏi lại điều đã được ghi rõ.

Các điểm có thể cần chốt: mã nguồn/hosting hiện tại, ngân sách vận hành, số tài khoản đồng thời, phạm vi quyền, thời điểm ghi nhận/phân bổ doanh số, quy tắc phí giữa tháng, lịch kỳ báo cáo/面談, mẫu biểu và phạm vi dữ liệu cũ.

Nếu chưa có câu trả lời, ghi rõ giả định tạm và tiếp tục phần phân tích độc lập; không âm thầm chốt logic tài chính, phân quyền hoặc sửa dữ liệu thật.

### Giai đoạn 1 — Thiết kế có thể duyệt

Đề xuất sitemap, màn hình, ERD, thực thể/quan hệ, từ điển dữ liệu, trạng thái, ma trận quyền và kiến trúc phù hợp. Đề xuất thứ tự triển khai phụ thuộc; chỉ ra rủi ro và chi phí cần quyết định.

Mô hình cần bao phủ tối thiểu: tài khoản/nhóm/quyền, công ty/cơ sở/liên hệ, người, đơn tuyển, ứng tuyển/phỏng vấn, tiếp nhận, công việc/checklist/tài liệu, hồ sơ visa/thủ tục, hợp đồng/phiên bản/phí, giai đoạn làm/hỗ trợ, 定期届出, 定期面談, vụ việc/diễn biến, mục tiêu/doanh số/phân bổ, hóa đơn/dòng phí, khoản thu/phân bổ, khoản trả giới thiệu, nhắc việc và audit. Đây là phạm vi nghiệp vụ; được tách/gộp bảng có giải thích.

### Giai đoạn 2 — Nền tảng và dữ liệu cơ bản

Làm đăng nhập, phân quyền, cấu trúc dữ liệu, 4 ngôn ngữ, audit và dữ liệu thử; tiếp đến công ty/liên hệ, người, tìm kiếm, nhập dữ liệu. Kiểm thử quyền từ sớm, không để cuối dự án.

### Giai đoạn 3 — Tuyển dụng và chuẩn bị vào làm

Đơn tuyển, matching/phỏng vấn, 受入れ前, checklist, hợp đồng, visa, hạn và chuyển sang đang làm việc.

### Giai đoạn 4 — Nghiệp vụ hỗ trợ

Lịch sử làm việc, 定期届出, 定期面談, vấn đề, công việc và nhắc hạn.

### Giai đoạn 5 — Doanh số và tài chính

Mục tiêu/KPI, dự kiến/xác nhận, biểu phí, hóa đơn, 入金, công nợ, hoàn tiền và khoản trả giới thiệu; kiểm thử đối chiếu trước khi dùng tiền thật.

### Giai đoạn 6 — Tổng hợp và vận hành

Dashboard/báo cáo, xuất file, hiệu năng, kiểm thử tổng thể, chuyển dữ liệu, sao lưu/khôi phục, triển khai và hướng dẫn.

### Giai đoạn mở rộng

Biểu mẫu ứng viên tự nhập, hỗ trợ soạn/dịch hồ sơ tiếng Nhật và tích hợp thông báo ngoài hệ thống sau khi tôi thống nhất phạm vi, chi phí và quyền dữ liệu.

Có thể đề xuất thay đổi thứ tự nếu phụ thuộc kỹ thuật yêu cầu; giải thích trước. Kết thúc mỗi giai đoạn: cung cấp sản phẩm chạy được, kiểm thử, hướng dẫn tôi kiểm tra, câu hỏi cần quyết định và kế hoạch phần tiếp theo. Cho tôi kiểm tra/đồng ý chuyển giai đoạn; các việc kỹ thuật nhỏ nằm trong phạm vi đã thống nhất không phải hỏi lại từng thao tác.

## 27. Đầu ra và bàn giao

Trong quá trình làm, duy trì tài liệu yêu cầu và quyết định đã chốt, thiết kế dữ liệu, quyền, hướng dẫn chạy, cấu hình, migration, kiểm thử và nhật ký thay đổi.

Khi đưa mã, chỉ rõ tệp nào mới/sửa, đường dẫn tương đối trong dự án, lệnh/cách áp dụng và cách kiểm tra. Nếu môi trường cho phép, tạo tệp thực tế và cập nhật mã; nếu chỉ chat, cung cấp mã đủ chạy và hướng dẫn từng bước. Không lặp lại toàn bộ mã dự án ở mỗi sửa nhỏ, không dùng dấu “...” thay cho phần mã cần thiết để chạy.

Bàn giao gồm mã nguồn, phụ thuộc/cấu hình mẫu không có bí mật, dữ liệu mẫu, quy trình cài/triển khai/cập nhật/hoàn tác, tài khoản quản trị theo cách an toàn, hướng dẫn tạo/khóa tài khoản và cấp quyền, hướng dẫn nghiệp vụ, sao lưu/khôi phục và báo cáo kiểm thử/giới hạn còn lại.

Mọi tài khoản dịch vụ, dữ liệu và hạ tầng cần được bàn giao để tôi có thể quản lý, không phụ thuộc tài khoản cá nhân của người phát triển.

## 28. Yêu cầu cho phản hồi đầu tiên của bạn

**Chỉ bắt đầu Giai đoạn 0 trong phản hồi đầu tiên.**

1. Tóm tắt đúng mô hình và những kết quả hệ thống phải đạt.
2. Nêu những nguồn bạn thực sự đã đọc/xem, giới hạn truy cập và phần chưa được kiểm chứng.
3. Đưa bảng phạm vi chức năng, điểm cần giữ/nâng cấp và phần mới ở mức khảo sát; không đoán chức năng cũ đã hoạt động.
4. Hỏi tối đa 5 câu quan trọng nhất còn thiếu để chọn kiến trúc và chốt nghiệp vụ. Có thể đưa lựa chọn cùng ưu/nhược để tôi dễ trả lời.
5. Đề xuất sản phẩm cụ thể của giai đoạn kế tiếp.

Chưa viết hàng loạt mã, thay dữ liệu thật hoặc triển khai hệ thống khi chưa khảo sát và thống nhất thiết kế cần thiết. Mục tiêu cuối là một hệ thống liên kết đầy đủ, quản lý ổn định 1.000–2.000 người, giao diện 4 ngôn ngữ và mỗi nhân viên chỉ được truy cập đúng công việc/dữ liệu được cấp quyền.
