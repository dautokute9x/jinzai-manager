const APP_NAME = 'HR Tokutei';
const APP_VERSION = '0.32.1';

function doGet(e) {
  // GĐ 10 (D-075): chủ mở trực tiếp; nhân viên mở bằng liên kết riêng ?k=…; người khác → trang từ chối.
  const token = String((e && e.parameter && e.parameter.k) || '');
  const staff = token ? staffByToken_(token) : null;
  if (!staff && !isOwner_()) {
    return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">' + (token
      ? 'Liên kết không hợp lệ hoặc đã bị thu hồi. / リンクが無効か、取り消されています。'
      : 'Bạn không có quyền mở ứng dụng này. / このアプリを開く権限がありません。') + '</p>').setTitle(APP_NAME);
  }
  const page = HtmlService.createTemplateFromFile('Index');
  page.token = staff ? token : '';
  page.role = staff ? (ROLES.indexOf(staff.vai_tro) >= 0 ? staff.vai_tro : 'nhan_vien') : 'owner';
  page.who = staff ? staff.ho_ten : '';
  const own = {};
  PERMS.forEach((p) => { own[p] = true; });
  page.perms = JSON.stringify(staff ? asSystem_(() => permissions_()[page.role]) : own); // D-077: giao diện ẩn mục không có quyền
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
