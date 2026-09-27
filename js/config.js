/* ================================================================
 * ★ 斗內設定：把下面的佔位內容換成你自己的帳號即可 ★
 * - 不想顯示的項目，把值改成空字串 "" 就會自動隱藏。
 * - 含有「你的」兩個字的值會被視為尚未設定，卡片會顯示橘色虛線提醒。
 * - LINE Pay／街口的 QR 圖片請放在 assets/img/，再把檔名填進 qr 欄位。
 * ================================================================ */
window.PB_CONFIG = {
  /* YouTube 影片要不要直接嵌入播放。false 則只顯示「到 YouTube 觀看」連結卡。 */
  embedVideos: true,

  donate: {
    paypal: {
      url: "https://paypal.me/你的帳號",          // 例如 https://paypal.me/pickleballtw
      note: "支援信用卡與 PayPal 餘額，海外球友也能斗內。"
    },
    linePay: {
      url: "https://line.me/R/ti/p/你的LINE_ID",   // LINE Pay 付款連結或 LINE 好友連結
      qr: "assets/img/linepay-qr-placeholder.svg", // 換成你的 LINE Pay 收款 QR 圖片
      note: "打開 LINE → 錢包 → 掃描條碼，掃描 QR 即可轉帳。"
    },
    jkoPay: {
      url: "",                                    // 街口支付收款連結（不需要就留空）
      qr: "",
      note: "街口支付掃碼轉帳。"
    },
    bank: {
      bankName: "你的銀行（代碼 000）",
      account: "你的帳號 0000-0000-0000",
      holder: "你的戶名",
      note: "ATM 或網銀轉帳，轉帳後歡迎留言告訴我。"
    },
    buyMeACoffee: {
      url: "",                                    // 例如 https://buymeacoffee.com/你的帳號（不需要就留空）
      note: "國際斗內平台，可月付支持。"
    }
  }
};
