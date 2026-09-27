/* 精彩對打觀摩影片清單
 * 每支影片都已用 YouTube oEmbed 確認存在，標題與頻道名稱照 oEmbed 原文。
 * start / end 單位是秒，只採用上傳者在說明欄寫的章節時間；找不到章節就從頭播（end: null）。
 * category: pro（職業賽）| openplay（Open Play／業餘）| lesson（教學）
 */
window.PB_VIDEOS = [
  { id: "ek3DCa_sZX8", title: "POINT OF THE DAY - 68 Shot Rally - Las Vegas Pickleball Open", channel: "Pickleball Channel",
    start: 0, end: null, category: "pro", level: "2",
    note: "職業男雙準決賽的 68 拍長回合（Yates/Johns 對 Dawson/Loong），整支影片約 2 分鐘就是這一分。",
    watch: "數數看有幾拍是丁克。這就是「耐心」的最佳教材：球在網下時，沒有人急著攻擊。",
    ts: "整支影片就是這一分" },
  { id: "c1uPiS6i6pI", title: "Amazing Pickleball Point | APP Tour", channel: "APPTV",
    start: 0, end: null, category: "pro", level: "2",
    note: "APP 巡迴賽官方頻道的 38 秒單分精華。",
    watch: "短短一分就有攻有守，適合反覆慢速看：每一拍前球員的準備姿勢和拍子位置。",
    ts: "整支影片就是這一分" },
  { id: "x9IM53en4BA", title: "Coaching Breakdown of the Most Exciting Pickleball Rally of All Time - 5 Lessons You Can Use", channel: "Tony Roig Pickleball (formerly In2Pickle)",
    start: 0, end: 134, category: "pro", level: "2",
    note: "MLP 混雙 10-10 的經典長回合（Waters/Khlif 對 Kawamoto/Johns），先完整播一次，後面有教練逐拍解析。",
    watch: "前 2 分鐘先看整分，想看教練講解就繼續播下去。",
    ts: "說明欄：開頭完整播放回合；章節 2:14 開始解說" },
  { id: "gUaMe7F-ipE", title: "Finals Highlights | PPA Tour: Newport Beach Open", channel: "Pickleballtv",
    start: 645, end: 795, category: "pro", level: "3",
    note: "2026 PPA 巡迴賽決賽精華，這段是男子雙打決賽。",
    watch: "看雙方怎麼從丁克戰中選球突擊，還有被突擊的一方怎麼用反手擋下來。",
    ts: "說明欄章節 10:45 Men's Doubles，取前 2.5 分鐘" },
  { id: "jRn8M68ikFs", title: "ARMA Play Testing | Mic'd Up 4.5 Pickleball Games", channel: "Ed Ju",
    start: 50, end: 230, category: "openplay", level: "2",
    note: "2025 年 4.5 業餘對打，球員邊打邊試新球拍，全程收音。",
    watch: "注意他們打完每一球都把拍子拉回胸前，這是 4.5 和 3.5 最明顯的差別之一。",
    ts: "說明欄章節 0:50 GAME 1，取開頭 3 分鐘" },
  { id: "tCdo_51P_sQ", title: "I Mic'd Up a 5.0 Pickleball Game", channel: "Shea Underwood - Pickleball",
    start: 0, end: 180, category: "openplay", level: "3",
    note: "PPA Austin 的業餘 5.0 男雙 19+ 比賽，搭檔是 Kyle Koszuta，全程收音。",
    watch: "5.0 的快手對攻速度和 4.0 差很多，觀察他們怎麼把球往下打、不給對手攻擊的高度。",
    ts: "無章節，取開頭 3 分鐘" }
];
