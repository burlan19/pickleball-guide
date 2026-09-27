# 出處與授權

## 3D 真人模型
- **Microsoft Rocketbox**（MIT License，Copyright (c) 2020 Microsoft）：https://github.com/microsoft/Microsoft-Rocketbox
  - 球員：Sports_Male_04（藍 1）、Sports_Female_02（藍 2）、Male_Adult_01（橘 1）、Female_Adult_12（橘 2）
  - 動作：m_idle_breathe_01、m_walk_neutral_01、m_run_neutral_01
  - 處理方式：原始 FBX 用 three.js 轉成 GLB（`assets/models/*.glb`），貼圖從 2048 px 縮成 1024 px；揮拍、準備姿勢、跳躍為程式即時計算
  - 2.5D 圖解裡的球員，也是由這四個模型即時渲染成圖片（準備、揮拍、移動三種姿勢）
  - 授權全文：`assets/models/LICENSE-Microsoft-Rocketbox.md`
  - 為了雙擊 index.html 就能載入，另外轉成 base64 放在 `js/models-data.js`

## 函式庫
- **three.js r170**（MIT License）：https://github.com/mrdoob/three.js，從 cdn.jsdelivr.net 載入（GLTFLoader、OrbitControls、SkeletonUtils）
- 字型：Big Shoulders Display、Noto Sans TC（SIL Open Font License），來自 Google Fonts

## 規則參考
- USA Pickleball 官方規則摘要：https://usapickleball.org/rules/summary/
- USA Pickleball 2026 規則修訂文件：https://usapickleball.org/docs/rules/USAP-Rulebook-Change-Document.pdf
- MLP 2026 賽制說明：https://majorleaguepickleball.co/abcs-of-mlp/

## 影片（版權屬於各原頻道，只用 YouTube 官方播放器嵌入或連結）
| 影片 | 頻道 | 網址 |
|---|---|---|
| Finals Highlights \| PPA Tour: Newport Beach Open | Pickleballtv | https://www.youtube.com/watch?v=gUaMe7F-ipE |
| Amazing Pickleball Point \| APP Tour | APPTV | https://www.youtube.com/watch?v=c1uPiS6i6pI |
| POINT OF THE DAY - 68 Shot Rally - Las Vegas Pickleball Open | Pickleball Channel | https://www.youtube.com/watch?v=ek3DCa_sZX8 |
| Coaching Breakdown of the Most Exciting Pickleball Rally of All Time | Tony Roig Pickleball | https://www.youtube.com/watch?v=x9IM53en4BA |
| ARMA Play Testing \| Mic'd Up 4.5 Pickleball Games | Ed Ju | https://www.youtube.com/watch?v=jRn8M68ikFs |
| I Mic'd Up a 5.0 Pickleball Game | Shea Underwood - Pickleball | https://www.youtube.com/watch?v=tCdo_51P_sQ |

影片只用 YouTube 官方播放器嵌入，並用起訖秒數只播精華段落；沒有下載或重製影片。起訖時間依上傳者說明欄的章節時間，沒有章節的從頭播放。
