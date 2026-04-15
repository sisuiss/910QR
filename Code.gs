// ===== GAS版：APIのみ（スプレッドシート連携） =====

const SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logs');
const STAFF_PASSWORD = '910';
const STAFF_URL = 'https://sisuiss.github.io/910QR/staff.html';

// ===== エントリーポイント =====
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action;
  let result;

  switch (action) {
    case 'issue':
      result = issueToken(params.bid);
      break;
    case 'status':
      result = getUserCouponStatus(params.bid);
      break;
    case 'check':
      result = checkTokenStatus(params.token);
      break;
    case 'auth':
      result = handleStaffAuth(params.token, params.password);
      break;
    default:
      result = { status: 'error', message: 'Unknown action' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== トークン発行 =====
function issueToken(bid) {
  if (!bid) return { status: 'error', message: 'bid is required' };
  try {
    const data = SHEET.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === bid && data[i][3] !== '使用済み') {
        return {
          status: 'error',
          message: 'お一人様1回限りです。このクーポンがまだ使用されていません。'
        };
      }
    }

    const token = generateToken();
    const now = new Date();

    SHEET.appendRow([
      now,       // A: 発行日時
      bid,       // B: ブラウザID
      token,     // C: トークン
      '未使用',  // D: ステータス
      '',        // E: 使用日時
      ''         // F: 備考
    ]);

    const qrUrl = STAFF_URL + '?token=' + encodeURIComponent(token);

    return {
      status: 'success',
      token: token,
      url: qrUrl,
      issued_at: now.toISOString()
    };
  } catch (error) {
    Logger.log('Error in issueToken: ' + error);
    return { status: 'error', message: 'エラーが発生しました: ' + error.toString() };
  }
}

// ===== トークン生成 =====
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'tkn_';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ===== スタッフ認証 =====
function handleStaffAuth(token, password) {
  if (password !== STAFF_PASSWORD) {
    return { status: 'error', message: 'パスワードが間違っています' };
  }

  try {
    const data = SHEET.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === token) {
        if (data[i][3] === '使用済み') {
          return { status: 'error', message: 'このクーポンは既に使用されています' };
        }
        SHEET.getRange(i + 1, 4).setValue('使用済み');
        SHEET.getRange(i + 1, 5).setValue(new Date());

        return { status: 'success', message: '承認成功！クーポンを適用してください' };
      }
    }

    return { status: 'error', message: '無効なトークンです' };
  } catch (error) {
    Logger.log('Error in handleStaffAuth: ' + error);
    return { status: 'error', message: 'エラーが発生しました: ' + error.toString() };
  }
}

// ===== トークン状態確認（ポーリング用） =====
function checkTokenStatus(token) {
  try {
    const data = SHEET.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === token) {
        return data[i][3];
      }
    }
    return '無効';
  } catch (error) {
    Logger.log('Error in checkTokenStatus: ' + error);
    return null;
  }
}

// ===== ユーザーのクーポン状態確認 =====
function getUserCouponStatus(bid) {
  try {
    const data = SHEET.getDataRange().getValues();
    let latestRow = null;
    let latestDate = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === bid) {
        const rowDate = new Date(data[i][0]);
        if (!latestDate || rowDate > latestDate) {
          latestDate = rowDate;
          latestRow = {
            token: data[i][2],
            status: data[i][3]
          };
        }
      }
    }

    if (!latestRow) {
      return { status: 'none' };
    }

    const qrUrl = STAFF_URL + '?token=' + encodeURIComponent(latestRow.token);
    return {
      status: latestRow.status,
      token: latestRow.token,
      url: qrUrl
    };
  } catch (error) {
    Logger.log('Error in getUserCouponStatus: ' + error);
    return { status: 'error', message: 'エラーが発生しました' };
  }
}
