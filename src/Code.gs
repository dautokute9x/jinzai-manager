const APP_NAME = 'HR Tokutei';
const APP_VERSION = '0.33.0';

function doGet() {
  // GĐ 12.1 (D-083): chủ mở trực tiếp (tài khoản Google triển khai); người khác thấy màn hình đăng nhập ID + mật khẩu.
  // Trang chưa đăng nhập không chứa dữ liệu nào: mọi dữ liệu chỉ qua api() sau khi có phiên.
  CALLER_EMAIL_ = null; // như requireOwner_: không dùng email đã nhớ của lần gọi trước
  const owner = isOwner_();
  const page = HtmlService.createTemplateFromFile('Index');
  page.token = '';
  page.role = owner ? 'owner' : 'login';
  page.who = '';
  const own = {};
  PERMS.forEach((p) => { own[p] = true; });
  page.perms = JSON.stringify(owner ? own : null);
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { url = ''; }
  page.url = url; // nút "Đăng nhập lại" sau khi đăng xuất / hết phiên
  page.appName = APP_NAME;
  page.version = APP_VERSION;
  page.schema = SCHEMA_VERSION; // giao diện tự nhắc nâng cấp khi file Sheets còn cấu trúc cũ
  page.env = ENV; // 9a: băng "thử nghiệm" chỉ hiện ở TEST
  // Danh sách lựa chọn cố định dùng chung với phần kiểm tra trên máy chủ (Schema.gs).
  page.choices = JSON.stringify(choices_());
  return page.evaluate()
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Chèn nội dung một file HTML khác vào trang (dùng trong Index.html).
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
