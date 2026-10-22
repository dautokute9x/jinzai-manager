# Tạo file Excel GIẢ cùng mẫu với file quản lý cũ (D-079) để kiểm thử bộ đọc xlsx + nhập file cũ. Mọi tên / số đều bịa.
# Chạy: python3 tests/fixtures/make_legacy_fake.py  → tests/fixtures/legacy_fake.xlsx
import datetime, os, re, zipfile, openpyxl
from openpyxl.styles import numbers
D = datetime.datetime
wb = openpyxl.Workbook()
ws = wb.active
ws.title = '2025年1月24日のデータ'
ws['A1'] = '名義'
ws['A2'] = '合計: 6'; ws['B2'] = '入社前: 1'
hdr = ['', 'スタッフ名', '勤務状況', '業種', '生年月日', '国籍', '\n性別', '受入日（入寮）\n予定日', '入社日（就労開始日）', '退職日', '在留資格',
       '在留番号', '在留期限', '残日数', '特2号審査完了日', 'ALTIMA依頼', '更新回数', '住所（入社後の住所）', 'CS部担当', '書類部担当者', '人材担当', 'メモ']
for i, h in enumerate(hdr): ws.cell(4, i + 1, h or None)
rows = [
  ['サンプル会 特別養護老人ホームみどり', 'GIA VAN MOT', '勤務中', '介護', D(1998, 4, 1), 'ベトナム', '男', None, D(2024, 4, 1), None, '特定技能1号（2年目）', 'ZZ00000001AA', D(2026, 12, 1), 300, None, '有', '1回目', '〒100-0001\n 東京都千代田区サンプル1-1', 'ギア', 'テスト', 'ギアスリー', 'メモ（偽）'],
  ['株式会社サンプル建設', 'GIA THI HAI', '支援なし', '建設', D(1999, 5, 2), 'インドネシア', '女', None, D(2023, 10, 1), None, '特定技能２号', 'ZZ00000002AA', D(2027, 3, 1), 400, D(2025, 1, 10), '無', '無', None, 'ギア, ギアツー', 'テスト', 'ギアスリー', None],
  ['株式会社サンプル建設', 'GIA VAN BA', '退職', '建設', D(1997, 6, 3), 'ミャンマー', '男', None, '2023/05/01（予定）', None, '特定技能1号', 'ZZ00000003AA', D(2025, 5, 1), -100, None, None, None, None, 'ギア', None, 'ギアスリー', None],
  ['株式会社サンプル建設', 'GIA VAN BON', '失踪', '建設', '無', 'ベトナム', '男', None, D(2024, 1, 1), D(2024, 3, 1), '特定活動6ヶ月（1回目）', 'zz 00000004 aa', D(2025, 1, 1), -300, None, None, None, None, 'ギア', None, 'ギアスリー', None],
  ['サンプル外食（未登録）', 'GIA THI NAM', '入社前', '外食', D(2002, 7, 5), 'フィリピン', '女', '2026/11月予定', None, None, 'COE（認定済み）', None, None, None, None, None, None, None, 'ギアツー', None, 'ギアフォー', None],
  ['株式会社サンプル建設', 'GIA VAN SAU', '辞退', '建設', D(2000, 8, 6), 'ネパール', '男', None, None, None, '依頼中（1号変更）', None, None, None, None, None, None, None, None, None, 'ギアフォー', '本人辞退（偽）'],
  ['株式会社サンプル建設', 'GIA VAN MOT', '勤務中', '建設', D(1998, 4, 1), 'ベトナム', '男', None, D(2026, 10, 5), None, '特定技能1号', 'ZZ00000001AA', D(2026, 12, 1), 300, None, None, None, None, 'ギア', 'テスト', 'ギアスリー', '転籍（偽）'],
]
for r, row in enumerate(rows):
    for c, v in enumerate(row):
        if v is not None:
            cell = ws.cell(5 + r, c + 1, v)
            if isinstance(v, D): cell.number_format = 'yyyy/m/d'
cs = wb.create_sheet('会社情報（NEW)')
chdr = ['法人番号', '法人名', '施設名', '職種', '支援状況', '郵便番号', '会社住所', '地域', '担当者名', '電話番号', 'メールアドレス', '紹介料\n（税抜き）', '支援委託料', None, '注意点', 'メモ欄']
for i, h in enumerate(chdr): cs.cell(3, i + 1, h)
crows = [
  [1234567890123, '社会福祉法人サンプル会', '特別養護老人ホームみどり', '介護', '支援中', '〒100-0001', '東京都千代田区サンプル1-1', '関東', '山田 花子（偽）\n施設長', 'TEL: 03-0000-0001\nFAX: 03-0000-0002', '担当：gia1@example.com', 300000, 18000, None, None, None],
  [None, None, '特別養護老人ホームあおば', '介護', '支援中', '〒100-0002', '東京都千代田区サンプル2-2', '関東', '佐藤 一郎（偽）', '03-0000-0003', 'gia2@example.com', None, 15000, None, None, None],
  [9876543210987, '株式会社サンプル建設', None, '建設（とび）', '支援修了', '〒530-0001', '大阪府大阪市サンプル3-3', '関西', '鈴木 次郎（偽）', '06-0000-0004', 'gia3@example.com', 'カテゴリA\n300,000円　カテゴリB 200,000円', '月¥15,000', None, '注意（偽）', None],
]
for r, row in enumerate(crows):
    for c, v in enumerate(row):
        if v is not None: cs.cell(5 + r, c + 1, v)
cs.merge_cells('A5:A6'); cs.merge_cells('B5:B6')  # 法人名 gộp 2 dòng (2 cơ sở)
cs.cell(5, 18, '関東'); cs.cell(5, 19, 3)  # bảng phụ bên cạnh
out = os.path.join(os.path.dirname(__file__), 'legacy_fake.xlsx')
wb.save(out)
# Excel thật lưu chữ trong sharedStrings.xml, kèm phiên âm (rPh) — openpyxl ghi chữ trực tiếp (inlineStr) nên tự thêm 1 chuỗi dùng chung có rPh.
esc = lambda t: ''.join('&#%d;' % ord(c) for c in t)
tmp = out + '.tmp'
with zipfile.ZipFile(out) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'xl/worksheets/sheet2.xml':
            s2 = data.decode('utf-8')
            old = '<c r="B7" t="inlineStr"><is><t>%s</t></is></c>' % esc('株式会社サンプル建設')
            assert old in s2
            data = s2.replace(old, '<c r="B7" t="s"><v>0</v></c>').encode('utf-8')
        if item.filename == '[Content_Types].xml':
            data = data.decode('utf-8').replace('</Types>', '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>').encode('utf-8')
        if item.filename == 'xl/_rels/workbook.xml.rels':
            data = data.decode('utf-8').replace('</Relationships>', '<Relationship Id="rIdSst" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>').encode('utf-8')
        zout.writestr(item, data)
    zout.writestr('xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">'
                  '<si><r><t>株式会社</t></r><r><t>サンプル建設</t></r><rPh sb="0" eb="4"><t>カブシキガイシャ</t></rPh></si></sst>')
os.replace(tmp, out)
print('ok', out)
