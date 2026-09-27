# 匹克球自創攻略

互動式匹克球完整攻略：規則、發球順序、每一拍的任務、丁克（短丁克與長丁克）、第三拍、攻擊、防守、走位補位、疊位、分級練習、禮儀、術語、測驗、國外精彩對打影片和斗內區。

## 怎麼開啟
- 雙擊 `開啟攻略.bat`，或直接雙擊 `index.html`。
- 3D 戰術實驗室和字型需要網路（three.js 從 CDN 載入）。沒網路時，其他章節和 2.5D 圖解照常可以看。

## 設定斗內帳號（重要）
打開 `js/config.js`，把含有「你的」的佔位內容換成自己的：
- `paypal.url`：你的 PayPal.me 連結
- `linePay.url` 和 `linePay.qr`：LINE 連結和收款 QR 圖片。把圖片放進 `assets/img/`，例如 `assets/img/linepay.png`
- `bank`：銀行名稱、帳號、戶名
- `jkoPay`、`buyMeACoffee`：需要就填，不需要就留空字串，卡片會自動隱藏

還沒設定的卡片會顯示橘色虛線和「站長尚未設定」的提醒。

## 修改內容
| 想改什麼 | 檔案 |
|---|---|
| 文章內容 | `index.html` |
| 影片清單與精華段落（start／end 秒數） | `js/videos.js` |
| 3D 戰術劇本（球員站位、球路、字幕） | `js/court3d.js` 最上面的 `SCENARIOS` |
| 2.5D 圖解、測驗、術語表、常見錯誤 | `js/app.js` |
| 顏色與版面 | `css/style.css` |

## 放到網路上
整個資料夾可以直接上傳到 GitHub Pages、Netlify、Cloudflare Pages 等靜態網站空間。

出處與授權請見 `CREDITS.md`。
