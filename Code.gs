  // ===== GAS版：スプレッドシート連携 + スタッフ認証 =====
  // このコードをGASエディタのCode.gsにコピペしてください

  const SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logs');
  const STAFF_PASSWORD = '910'; // スタッフパスワード
  // ★ parent.html をホスティングしたURLに変更してください ★
  const PARENT_URL = 'https://sisuiss.github.io/QRtest/parent.html';

  // ===== ウェブアプリのエントリーポイント =====
  function doGet(e) {
    const token = e.parameter.token;

    // スタッフがQRをスキャン（?token=xxxx）
    if (token) {
      return showStaffAuthScreen(token);
    }

    // ユーザーがアクセス（クーポン発行ページ）
    return HtmlService.createHtmlOutputFromFile('index')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle('限定クーポン');
  }

  // ===== スタッフ認証画面を表示 =====
  function showStaffAuthScreen(token) {
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>スタッフ認証</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 400px;
            width: 100%;
            text-align: center;
          }
          h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 22px;
          }
          .token-info {
            background: #f0f4ff;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
            word-break: break-all;
            font-family: monospace;
          }
          .password-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
          }
          input {
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 2px;
            text-align: center;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
          }
          .btn {
            padding: 15px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            border: none;
            border-radius: 50px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(76, 175, 80, 0.3);
          }
          .message {
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
          }
          .error {
            background: #ffebee;
            color: #c62828;
            border-left: 4px solid #c62828;
          }
          .success {
            background: #e8f5e9;
            color: #2e7d32;
            border-left: 4px solid #4CAF50;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🔐 スタッフ認証</h2>
          
          <div class="token-info">
            <strong>トークン:</strong><br>
            ${token}
          </div>

          <div id="message" class="message" style="display: none;"></div>

          <div class="password-form" id="form">
            <input 
              type="password" 
              id="password" 
              placeholder="パスワードを入力"
              onkeypress="if(event.key==='Enter') submitAuth()"
              autofocus
            />
            <button class="btn" onclick="submitAuth()">適用</button>
          </div>
        </div>

        <script>
          function submitAuth() {
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            const form = document.getElementById('form');

            if (!password) {
              showMessage('error', '❌ パスワードを入力してください');
              return;
            }

            // GAS側に認証をリクエスト
            google.script.run
              .withSuccessHandler(function(result) {
                if (result.status === 'success') {
                  form.style.display = 'none';
                  showMessage('success', '✅ 承認成功！\\nクーポンを適用してください');
                } else {
                  showMessage('error', result.message);
                  document.getElementById('password').value = '';
                  document.getElementById('password').focus();
                }
              })
              .withFailureHandler(function(error) {
                showMessage('error', '❌ エラーが発生しました: ' + error);
              })
              .handleStaffAuth('${token}', password);
          }

          function showMessage(type, text) {
            const msg = document.getElementById('message');
            msg.className = 'message ' + type;
            msg.innerHTML = text.replace(/\\\\n/g, '<br>');
            msg.style.display = 'block';
          }
        </script>
      </body>
      </html>
    `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // ===== スタッフ認証処理 =====
  function handleStaffAuth(token, password) {
    // パスワード検証
    if (password !== STAFF_PASSWORD) {
      return {
        status: 'error',
        message: '❌ パスワードが間違っています'
      };
    }

    try {
      const data = SHEET.getDataRange().getValues();

      // トークンをスプレッドシートで検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][2] === token) {
          const status = data[i][3];

          // ステータスチェック
          if (status === '使用済み') {
            return {
              status: 'error',
              message: '❌ このクーポンは既に使用されています'
            };
          }

          // ステータスを「使用済み」に更新
          SHEET.getRange(i + 1, 4).setValue('使用済み');
          SHEET.getRange(i + 1, 5).setValue(new Date());

          return {
            status: 'success',
            message: '✅ 承認成功！\nクーポンを適用してください'
          };
        }
      }

      // トークンが見つからない
      return {
        status: 'error',
        message: '❌ 無効なトークンです'
      };
    } catch (error) {
      Logger.log('Error in handleStaffAuth: ' + error);
      return {
        status: 'error',
        message: 'エラーが発生しました: ' + error.toString()
      };
    }
  }

  // ===== API：クーポン発行（ユーザー側） =====
  function issueToken(bid) {
    try {
      const data = SHEET.getDataRange().getValues();

      // ブラウザIDの「未使用」のクーポンが存在するかチェック
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === bid && data[i][3] !== '使用済み') {
          // 未使用のクーポンがまだ存在している
          return {
            status: 'error',
            message: 'お一人様1回限りです。このクーポンがまだ使用されていません。'
          };
        }
      }

      // 新しいトークン生成
      const token = generateToken();
      const now = new Date();

      // スプレッドシートに記録
      SHEET.appendRow([
        now,           // A: 発行日時
        bid,           // B: ブラウザID
        token,         // C: トークン
        '未使用',      // D: ステータス
        '',            // E: 使用日時
        ''             // F: 備考
      ]);

      // QR用のURL生成（スタッフスキャン用）— parent.html経由でバナー非表示
      const qrUrl = PARENT_URL + '?token=' + encodeURIComponent(token);

      return {
        status: 'success',
        token: token,
        url: qrUrl,
        issued_at: now.toISOString()
      };
    } catch (error) {
      Logger.log('Error in issueToken: ' + error);
      return {
        status: 'error',
        message: 'エラーが発生しました: ' + error.toString()
      };
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

  // ===== トークンのステータスを確認 =====
  function checkTokenStatus(token) {
    try {
      const data = SHEET.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][2] === token) {
          return data[i][3]; // ステータスを返す（'未使用' または '使用済み'）
        }
      }

      return '無効'; // トークンが見つからない
    } catch (error) {
      Logger.log('Error in checkTokenStatus: ' + error);
      return null;
    }
  }

  // ===== ユーザーのクーポン状態を確認 =====
  function getUserCouponStatus(bid) {
    try {
      const data = SHEET.getDataRange().getValues();

      // ブラウザIDの最新のクーポンを探す
      let latestRow = null;
      let latestDate = null;

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === bid) {
          const rowDate = new Date(data[i][0]);
          if (!latestDate || rowDate > latestDate) {
            latestDate = rowDate;
            latestRow = {
              index: i,
              token: data[i][2],
              status: data[i][3],
              issuedAt: data[i][0]
            };
          }
        }
      }

      if (!latestRow) {
        // クーポンなし
        return {
          status: 'none',
          message: 'クーポンがあります。発行してください'
        };
      }

      // QR用URLを生成 — parent.html経由でバナー非表示
      const qrUrl = PARENT_URL + '?token=' + encodeURIComponent(latestRow.token);

      // クーポン存在
      return {
        status: latestRow.status,
        token: latestRow.token,
        url: qrUrl,
        message: latestRow.status === '使用済み' ? 'クーポンが適用されました' : 'このクーポンがまだ使用されていません'
      };
    } catch (error) {
      Logger.log('Error in getUserCouponStatus: ' + error);
      return {
        status: 'error',
        message: 'エラーが発生しました'
      };
    }
  }
