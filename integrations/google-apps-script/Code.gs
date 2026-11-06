// Свойства скрипта, которые нужно задать в Apps Script:
// SITE_URL = https://89.191.225.135.sslip.io
// SITE_COLLECTOR_TOKEN = значение COLLECTOR_TOKEN из .env.production на VPS

const SHEET_NAME = 'База';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Сбор точек PR')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function processForm(formData) {
  try {
    if (!formData || !formData.type) throw new Error('Не выбран тип места');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Не найден лист: ' + SHEET_NAME);

    const layouts = {
      afishi: { num: 1, corpus: 2, floor: 3, desc: 4, kafedra: 5, photo: 6 },
      stacionar: { num: 7, corpus: 8, floor: 9, desc: 10, photo: 11 },
      led: { num: 12, corpus: 13, floor: 14, desc: 15, photo: 16 }
    };
    const layout = layouts[formData.type];
    if (!layout) throw new Error('Неизвестный тип места: ' + formData.type);

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let placeNumber = '';
    for (let i = 4; i < data.length; i++) {
      const hasNumber = data[i][layout.num] !== '' && data[i][layout.num] != null;
      const description = data[i][layout.desc];
      if (hasNumber && (description === '' || description == null)) {
        rowIndex = i + 1;
        placeNumber = String(data[i][layout.num]);
        break;
      }
    }
    if (rowIndex === -1) return { success: false, message: 'Нет свободных мест этого типа в таблице' };

    if (!formData.photoBase64) throw new Error('Не удалось получить фотографию');
    const siteResult = uploadPointToSite_(formData, placeNumber);

    // Оставляем запись в таблице как резерв/журнал, но источником для сайта становится VPS.
    sheet.getRange(rowIndex, layout.corpus + 1).setValue(formData.corpus || '');
    sheet.getRange(rowIndex, layout.floor + 1).setValue(formData.floor || '—');
    sheet.getRange(rowIndex, layout.desc + 1).setValue(formData.description || '');
    sheet.getRange(rowIndex, layout.photo + 1).setValue(siteResult.photoUrl || '');
    if (layout.kafedra !== undefined) sheet.getRange(rowIndex, layout.kafedra + 1).setValue(formData.kafedra || '—');
    SpreadsheetApp.flush();

    return { success: true, message: 'Сохранено на сайте! № места: ' + placeNumber, row: rowIndex, photoUrl: siteResult.photoUrl };
  } catch (e) {
    return { success: false, message: e && e.message ? e.message : String(e) };
  }
}

function uploadPointToSite_(formData, placeNumber) {
  const props = PropertiesService.getScriptProperties();
  const siteUrl = (props.getProperty('SITE_URL') || '').replace(/\/$/, '');
  const token = props.getProperty('SITE_COLLECTOR_TOKEN');
  if (!siteUrl || !token) throw new Error('Задайте SITE_URL и SITE_COLLECTOR_TOKEN в свойствах скрипта');

  const typeMap = { afishi: 'POSTER', stacionar: 'BANNER', led: 'LED_DISPLAY' };
  const match = String(formData.photoBase64).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Некорректный формат фотографии');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Фото больше допустимых 10 МБ');

  const blob = Utilities.newBlob(bytes, match[1], 'point-' + placeNumber + '.jpg');
  const payload = {
    externalId: 'google-sheet:' + formData.type + ':' + placeNumber,
    campus: 'МГТУ им. Н. Э. Баумана',
    building: String(formData.corpus || ''),
    floor: String(formData.floor || 0),
    name: 'Место № ' + placeNumber,
    type: typeMap[formData.type],
    description: String(formData.description || ''),
    kafedra: String(formData.kafedra || ''),
    photo: blob
  };

  const response = UrlFetchApp.fetch(siteUrl + '/api/collector/locations', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + token },
    payload: payload,
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  let result;
  try { result = JSON.parse(response.getContentText()); } catch (_) { result = {}; }
  if (status < 200 || status >= 300 || !result.success) {
    throw new Error(result.error || ('Сайт вернул HTTP ' + status));
  }
  const urls = result.location && result.location.photoUrls || [];
  return { photoUrl: urls.length ? siteUrl + urls[urls.length - 1] : '' };
}
