/* 匹克球自創攻略 — 3D 戰術實驗室（three.js）
 * 座標：x = 球場長邊（網在 x=0，藍隊在 x<0，橘隊在 x>0），z = 寬邊，y = 高度，單位公尺。
 * 藍隊面向 +x，右手邊是 +z；橘隊面向 -x，右手邊是 -z。
 */
(function () {
  'use strict';
  var HL = 6.705, HW = 3.05, KL = 2.134;
  var NAMES = { A1: '藍 1', A2: '藍 2', B1: '橘 1', B2: '橘 2' };
  var TEAM_COLOR = { A: 0x2f7fd6, B: 0xf07c2a };

  /* ------------------------------------------------------------
   * 戰術劇本
   * 每一步 = 一拍：hitter 擊球；land = 彈地點（null 表示下一位直接截擊）；
   * h = 球的最高點；dur = 秒；moves = 這一拍期間的移動目的地；anim = 額外動作
   * ------------------------------------------------------------ */
  var K = { A1: [-2.45, 1.5], A2: [-2.45, -1.5], B1: [2.45, -1.5], B2: [2.45, 1.5] };
  var SCENARIOS = [
    { id: 'serve', name: '發球與回發球', level: '入門', desc: '雙跳規則的完整示範：發球要彈地、回發球也要彈地，兩跳之後才能截擊。接發方回完球就衝上網，發球方靠第三拍、第五拍一步一步追上來。',
      setup: { A1: [-7.0, 1.3], A2: [-6.4, -1.5], B1: [6.9, -1.4], B2: [2.45, 1.5] },
      steps: [
        { hitter: 'A1', land: [5.0, -1.5], h: 2.1, dur: 1.8, cap: '發球：低手、對角，越過廚房落進對角發球區。發球方兩人都留在底線。', moves: { B1: [7.1, -1.4] } },
        { hitter: 'B1', land: [-5.6, 0.4], h: 2.6, dur: 2.0, cap: '回發球：接發方必須等球彈地（第一跳）。回深、回高，然後衝上網。', moves: { B1: [2.45, -1.5], A1: [-6.7, 0.9] } },
        { hitter: 'A1', land: [1.3, -0.9], h: 1.9, dur: 2.0, cap: '第 3 拍：發球方也要等球彈地（第二跳）。兩跳之後雙方才可以截擊。', moves: { A1: [-4.0, 1.3], A2: [-4.0, -1.4], B1: [1.9, -1.0] } },
        { hitter: 'B1', land: [-3.2, -1.2], h: 1.25, dur: 1.6, cap: '第 4 拍：接發方已在網前，丁克到對手腳下。', moves: { A2: [-3.4, -1.3], B1: [2.45, -1.5] } },
        { hitter: 'A2', land: [1.4, 1.2], h: 1.2, dur: 1.7, cap: '第 5 拍：重置進廚房，兩人一起走到廚房線。', moves: { A1: K.A1, A2: K.A2, B2: [2.2, 1.3] } },
        { hitter: null, dur: 1.6, cap: '四個人都在網前，接下來進入丁克戰。' }
      ] },
    { id: 'drop', name: '第三拍放短', level: '進階', desc: '發球方最重要的一拍。放短的弧線最高點在自己這側，過網後往下掉進廚房，讓對手只能往上撈，發球方趁這段時間往前推進。',
      setup: { A1: [-6.9, 1.2], A2: [-6.6, -1.5], B1: [6.9, -1.4], B2: [2.45, 1.5] },
      steps: [
        { hitter: 'B1', land: [-5.8, 1.0], h: 2.5, dur: 1.9, cap: '回發球深到底線，接發方衝上網。', moves: { B1: [2.45, -1.5], A1: [-6.9, 1.0] } },
        { hitter: 'A1', land: [1.0, 0.9], h: 1.95, dur: 2.1, cap: '第三拍放短：軟軟地送出拋物線，落進對方廚房。A 隊一起往前。', moves: { A1: [-4.3, 1.2], A2: [-4.3, -1.4], B2: [1.6, 1.0] } },
        { hitter: 'B2', land: [-3.7, 1.3], h: 1.2, dur: 1.7, cap: '對手只能把低球往上撈。A 隊在對手擊球時 split step 停下來。', moves: { B2: K.B2, A1: [-4.0, 1.3] } },
        { hitter: 'A1', land: [1.2, -1.0], h: 1.2, dur: 1.7, cap: '在過渡區再重置一拍進廚房，然後繼續往前。', moves: { A1: K.A1, A2: K.A2 } },
        { hitter: null, dur: 1.6, cap: '成功！發球方也站上廚房線，雙方回到同一起跑點。' }
      ] },
    { id: 'drive', name: '第三拍抽球 + 第五拍放短', level: '進階', desc: '回發球太短或太高時，第三拍可以直接抽球逼對手擋出軟球，第五拍再放短上網。這是高手最常用的「抽加放」組合。',
      setup: { A1: [-6.9, 1.2], A2: [-6.6, -1.5], B1: [6.9, -1.4], B2: [2.45, 1.5] },
      steps: [
        { hitter: 'B1', land: [-5.3, 1.1], h: 2.2, dur: 1.8, cap: '回發球偏短偏高，是抽球的好機會。', moves: { B1: [2.45, -1.5], A1: [-6.8, 1.1] } },
        { hitter: 'A1', land: null, h: 1.1, dur: 0.8, cap: '第三拍抽球：又低又快，打向對手身體。', moves: { B2: [2.5, 1.3] } },
        { hitter: 'B2', land: [-5.0, -1.0], h: 1.5, dur: 1.4, cap: '對手只能擋（block），回球變軟。', moves: { A2: [-5.6, -1.1], A1: [-5.8, 1.2] } },
        { hitter: 'A2', land: [1.1, -0.8], h: 1.8, dur: 1.9, cap: '第五拍放短：趁對手擋球，放進廚房並往前推進。', moves: { A1: [-3.2, 1.3], A2: [-3.2, -1.3], B1: [1.8, -0.9] } },
        { hitter: 'B1', land: [-2.7, 1.3], h: 1.2, dur: 1.5, cap: '對手丁克回來。', moves: { B1: K.B1, A1: [-2.9, 1.3] } },
        { hitter: 'A1', land: [1.3, -1.6], h: 1.2, dur: 1.5, cap: '抽加放完成，A 隊站上網前。', moves: { A1: K.A1, A2: K.A2 } },
        { hitter: null, dur: 1.4, cap: '記住：抽球是為了製造軟球，放短才是上網的鑰匙。' }
      ] },
    { id: 'short-dink', name: '短丁克', level: '入門', desc: '落點離網 30–60 公分。逼對手往前踩進廚房、彎腰撈球。對手撈得太高時，就是攻擊時機。',
      setup: { A1: K.A1, A2: K.A2, B1: K.B1, B2: K.B2 },
      steps: [
        { hitter: 'A1', land: [0.5, 1.3], h: 1.15, dur: 1.5, cap: '短丁克：落在網前，逼對手往前踩進廚房。', moves: { B2: [1.25, 1.35] } },
        { hitter: 'B2', land: [-0.6, 1.4], h: 1.2, dur: 1.5, cap: '球彈地後可以進廚房打。對手也回短丁克。', moves: { A1: [-1.3, 1.4], B2: K.B2 } },
        { hitter: 'A1', land: [0.7, -1.4], h: 1.2, dur: 1.6, cap: '打完馬上退回廚房線外，雙腳站穩才可以截擊。', moves: { A1: K.A1, B1: [1.45, -1.4] } },
        { hitter: 'B1', land: null, h: 1.95, dur: 1.2, cap: '對手在低處撈球，球被打高了！', moves: { B1: [1.7, -1.4] } },
        { hitter: 'A2', land: [3.4, -0.2], h: 1.0, dur: 0.6, cap: '高於網的球 → 往下截擊，打向對手中間的腳下。得分！', moves: { B1: [2.3, -1.4] } },
        { hitter: null, dur: 1.5, cap: '短丁克的價值：讓對手在不舒服的位置擊球。' }
      ] },
    { id: 'long-dink', name: '長丁克（對角深丁）', level: '進階', desc: '落點貼近對手廚房線、在他腳下。對角線距離最長、中間網最低，是容錯率最高的丁克；再拉到外角，就能打出空檔。',
      setup: { A1: K.A1, A2: K.A2, B1: K.B1, B2: K.B2 },
      steps: [
        { hitter: 'A1', land: [1.9, -1.8], h: 1.3, dur: 1.7, cap: '對角長丁克：落在對手腳下，網最低、距離最長。', moves: { B1: [2.5, -1.8] } },
        { hitter: 'B1', land: [-1.9, 1.9], h: 1.3, dur: 1.7, cap: '對手也回對角長丁克，耐心比賽開始。', moves: { A1: [-2.5, 1.9] } },
        { hitter: 'A1', land: [1.8, -2.85], h: 1.3, dur: 1.8, cap: '拉開角度：打到外角，把對手拉向邊線外。', moves: { B1: [2.3, -3.3], B2: [2.45, 0.2] } },
        { hitter: 'B1', land: null, h: 1.6, dur: 1.5, cap: '對手被拉開，回球又高又往中間。', moves: { A2: [-2.45, -0.4], A1: [-2.45, 1.6] } },
        { hitter: 'A2', land: [3.3, -1.6], h: 1.0, dur: 0.6, cap: '趁空檔攻擊兩人之間。得分！', moves: { B1: [2.5, -2.6] } },
        { hitter: null, dur: 1.5, cap: '長丁克逼對手退後、短丁克逼對手往前，兩種混著打最難防。' }
      ] },
    { id: 'speedup', name: '突擊與快手對攻', level: '高手', desc: '丁克戰中出現腰部高度的球，就可以突擊（speed-up），瞄準對手持拍側的肩膀。被突擊的一方用 counter 反擊，進入快手對攻：誰先把球打高誰就輸。',
      setup: { A1: K.A1, A2: K.A2, B1: K.B1, B2: K.B2 },
      steps: [
        { hitter: 'A1', land: [1.8, -1.5], h: 1.25, dur: 1.6, cap: '丁克戰中…' },
        { hitter: 'B1', land: [-1.9, -1.4], h: 1.25, dur: 1.6, cap: '雙方都在等對手先犯錯。' },
        { hitter: 'A2', land: [1.8, 1.3], h: 1.5, dur: 1.5, cap: '藍 2 的丁克彈太高，到了對手腰部高度。' },
        { hitter: 'B2', land: null, h: 1.05, dur: 0.55, cap: '突擊（Speed-up）！瞄準持拍側的肩膀。' },
        { hitter: 'A2', land: null, h: 0.98, dur: 0.5, cap: 'Counter 反擊：拍子在胸前，短促地往下打回去。' },
        { hitter: 'B1', land: null, h: 1.0, dur: 0.5, cap: '快手對攻：往下打，不給對手攻擊的高度。' },
        { hitter: 'A1', land: [3.0, -0.4], h: 0.9, dur: 0.5, cap: '打到對手腳下，對方來不及反應。得分！' },
        { hitter: null, dur: 1.5, cap: '反手在身體前的覆蓋面比較大，高手多用反手處理身體球。' }
      ] },
    { id: 'erne', name: 'Erne', level: '高手', desc: '對手習慣沿邊線打直線丁克時，從廚房旁邊移到場外，在網邊直接截擊。起跳前沒有踩到廚房、落地在場外，就是合法的。',
      setup: { A1: [-2.45, 1.6], A2: K.A2, B1: K.B1, B2: [2.45, 1.8] },
      steps: [
        { hitter: 'A1', land: [1.9, -1.6], h: 1.25, dur: 1.6, cap: '對角丁克中。' },
        { hitter: 'B1', land: [-1.9, 1.6], h: 1.25, dur: 1.6, cap: '觀察到：對手常把球打向邊線。' },
        { hitter: 'A1', land: [1.9, 2.4], h: 1.25, dur: 1.6, cap: '藍 1 故意丁克到 橘 2 的邊線附近。', moves: { B2: [2.5, 2.5] } },
        { hitter: 'B2', land: null, h: 1.15, dur: 1.3, cap: '橘 2 沿邊線打直線，藍 1 已經預判，從廚房旁往場外移動。', moves: { A1: [-0.7, 3.5] }, anim: { A1: 'Jump' } },
        { hitter: 'A1', land: [3.4, 0.3], h: 0.95, dur: 0.55, cap: 'Erne！在場外、網邊直接截擊。得分！' },
        { hitter: null, dur: 1.6, cap: '重點：移動路線不經過廚房，也不能碰到網柱或網子。', moves: { A1: [-2.45, 1.6] } }
      ] },
    { id: 'atp', name: 'ATP 繞網柱', level: '高手', desc: '被外角斜線拉到邊線外很遠時，讓球從網柱外側繞回去，不必經過網子上方，高度甚至可以比網還低。',
      setup: { A1: K.A1, A2: K.A2, B1: K.B1, B2: K.B2 },
      steps: [
        { hitter: 'A1', land: [1.9, -1.6], h: 1.25, dur: 1.6, cap: '對角丁克中。' },
        { hitter: 'B1', land: [-1.9, 1.6], h: 1.25, dur: 1.6, cap: '對手回對角。' },
        { hitter: 'A1', land: [1.2, -2.95], h: 1.2, dur: 1.8, cap: '外角短斜線：把對手拉到邊線外很遠的地方。', moves: { B1: [1.9, -4.4], B2: [2.45, 0.4] } },
        { hitter: 'B1', land: [-3.8, -2.2], h: 0.55, dur: 1.2, cap: 'ATP！球從網柱外側繞回來，高度比網還低，完全合法。' },
        { hitter: null, dur: 1.6, cap: '防 ATP：把外角球打得深一點，不要讓對手有繞柱的角度。', moves: { B1: K.B1, B2: K.B2 } }
      ] },
    { id: 'lob', name: '挑高球與換位補位', level: '進階', desc: '對手挑高球越過隊友頭頂時，由另一位斜向往後追（喊「Switch！」），被挑的人橫移補到另一邊，兩人交換左右。',
      setup: { A1: K.A1, A2: K.A2, B1: K.B1, B2: K.B2 },
      steps: [
        { hitter: 'A1', land: [1.9, -1.5], h: 1.25, dur: 1.6, cap: '對角丁克中。' },
        { hitter: 'B1', land: [-5.9, -1.6], h: 4.6, dur: 2.3, cap: '對手挑高球越過 藍 2 反手側！藍 1 喊「Switch」斜著往後追，藍 2 橫移補位。', moves: { A1: [-6.0, -1.3], A2: [-2.9, 1.3] } },
        { hitter: 'A1', land: [1.2, 0.3], h: 2.0, dur: 2.1, cap: '藍 1 追到球，重置進廚房爭取時間，兩人重新站位。', moves: { A1: [-4.0, -1.4], A2: [-2.6, 1.4], B2: [1.7, 0.6] } },
        { hitter: 'B2', land: [-3.6, -1.5], h: 1.25, dur: 1.6, cap: '對手丁克到腳下。', moves: { B2: K.B2, A1: [-3.7, -1.4] } },
        { hitter: 'A1', land: [1.4, -1.2], h: 1.2, dur: 1.6, cap: '換位完成：藍 1 守左邊、藍 2 守右邊。', moves: { A1: [-2.45, -1.5], A2: [-2.45, 1.5] } },
        { hitter: null, dur: 1.5, cap: '往後追球不要倒退走，側身交叉步最安全。' }
      ] },
    { id: 'stack', name: '疊位 + Shake & Bake', level: '高手', desc: '疊位讓兩人發完球後換到擅長的一邊；Shake & Bake 是第三拍抽球時，隊友同時衝網搶攻第四拍。',
      setup: { A1: [-7.0, 1.3], A2: [-7.2, 3.6], B1: [6.9, -1.4], B2: [2.45, 1.5] },
      steps: [
        { hitter: 'A1', land: [5.0, -1.5], h: 2.1, dur: 1.8, cap: '疊位：藍 2 站在同一側場外，等 藍 1 發完球。', moves: { A1: [-6.4, -1.4], A2: [-6.6, 1.3], B1: [7.1, -1.4] } },
        { hitter: 'B1', land: [-5.4, 1.2], h: 2.5, dur: 1.9, cap: '藍 1 換到左邊、藍 2 留右邊，兩人都在自己擅長的位置。', moves: { B1: K.B1, A2: [-6.7, 1.1] } },
        { hitter: 'A2', land: null, h: 1.15, dur: 0.8, cap: 'Shake：藍 2 第三拍抽球，打向 橘 1 身體…', moves: { A1: [-2.8, -0.5] } },
        { hitter: 'B1', land: null, h: 1.2, dur: 0.9, cap: 'Bake：藍 1 同時衝網，對手只能擋出軟球。', moves: { A1: [-2.7, -0.1] } },
        { hitter: 'A1', land: [3.3, 0.1], h: 1.0, dur: 0.55, cap: '藍 1 搶攻截擊，打到對手兩人中間的腳下。得分！' },
        { hitter: null, dur: 1.6, cap: '疊位要記清楚「原本右邊的人」，才不會發錯人。' }
      ] }
  ];

  function b64ToBuf(b64) {
    var bin = atob(b64), len = bin.length, arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return arr.buffer;
  }

  /* 模型資料約 5 MB，等頁面內容先顯示後再載入 */
  function start(L) {
    if (!document.getElementById('lab-stage')) return;
    if (window.MODEL_DATA) return run(L);
    var s = document.createElement('script');
    s.src = 'js/models-data.js?v=20260927e';
    s.onload = function () { run(L); };
    s.onerror = function () { document.getElementById('lab-status').textContent = '人物模型載入失敗，請重新整理頁面。'; };
    document.body.appendChild(s);
  }
  function run(L) {
    var THREE = L.THREE;
    var stage = document.getElementById('lab-stage');
    var statusEl = document.getElementById('lab-status');
    window.PB3D_READY = true;
    var mobile = matchMedia('(max-width: 700px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    var renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.insertBefore(renderer.domElement, stage.firstChild);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0e1b22, 26, 48);
    var camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 100);
    camera.position.set(-13, 6, 0);
    var controls = new L.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = 1.48; controls.minDistance = 4; controls.maxDistance = 30;
    controls.target.set(0.5, 0.4, 0);

    scene.add(new THREE.HemisphereLight(0xdfefff, 0x2a3a30, 1.4));
    var sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-6, 14, 8); sun.castShadow = !mobile;
    sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40;
    scene.add(sun);

    /* ---------- 球場 ---------- */
    function plane(w, d, color, y) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 }));
      m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; scene.add(m); return m;
    }
    plane(40, 24, 0x2c4639, -0.01);
    plane(HL * 2 + 4, HW * 2 + 3, 0x355a4a, 0);
    plane(HL * 2, HW * 2, 0x1d5d9b, 0.002);
    var kit = plane(KL * 2, HW * 2, 0x2b7a58, 0.004);
    // 廚房地面文字
    (function () {
      var c = document.createElement('canvas'); c.width = 512; c.height = 256;
      var g = c.getContext('2d'); g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '900 64px "Noto Sans TC", sans-serif'; g.textAlign = 'center';
      g.fillText('廚房 NVZ', 256, 150);
      var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      [-1, 1].forEach(function (s) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2;
        m.position.set(s * KL / 2, 0.006, 0); scene.add(m);
      });
    })();
    var lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    function line(x1, z1, x2, z2) {
      var len = Math.hypot(x2 - x1, z2 - z1) + 0.05;
      var m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.01, 0.05), lineMat);
      m.position.set((x1 + x2) / 2, 0.008, (z1 + z2) / 2);
      m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); m.receiveShadow = true; scene.add(m);
    }
    line(-HL, -HW, HL, -HW); line(-HL, HW, HL, HW); line(-HL, -HW, -HL, HW); line(HL, -HW, HL, HW);
    line(-KL, -HW, -KL, HW); line(KL, -HW, KL, HW); line(-HL, 0, -KL, 0); line(KL, 0, HL, 0);
    // 網子
    (function () {
      var c = document.createElement('canvas'); c.width = 64; c.height = 64;
      var g = c.getContext('2d'); g.strokeStyle = 'rgba(20,20,20,.9)'; g.lineWidth = 3;
      g.strokeRect(0, 0, 64, 64);
      var tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(140, 18);
      var geo = new THREE.PlaneGeometry(HW * 2 + 0.6, 0.86, 20, 1);
      var pos = geo.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        var z = pos.getX(i), y = pos.getY(i);
        if (y > 0) pos.setY(i, 0.43 + 0.05 * Math.abs(z) / (HW + 0.3) - 0.0); // 中央 0.864、邊 0.914
      }
      var net = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.2, color: 0x222222 }));
      net.rotation.y = Math.PI / 2; net.position.set(0, 0.43, 0); net.castShadow = true; scene.add(net);
      var tape = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, HW * 2 + 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      tape.position.set(0, 0.885, 0); scene.add(tape);
      [-1, 1].forEach(function (s) {
        var p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 12), new THREE.MeshStandardMaterial({ color: 0x1b2328, metalness: 0.5, roughness: 0.4 }));
        p.position.set(0, 0.475, s * (HW + 0.3)); p.castShadow = true; scene.add(p);
      });
    })();

    /* ---------- 球 ---------- */
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd4ee2f, emissive: 0x4a5a00, roughness: 0.5 }));
    ball.castShadow = true; scene.add(ball);
    var ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    ballShadow.rotation.x = -Math.PI / 2; scene.add(ballShadow);
    var TRAIL = 40, trailPos = new Float32Array(TRAIL * 3), trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    var trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xd4ee2f, transparent: true, opacity: 0.6 }));
    trail.frustumCulled = false; scene.add(trail);
    var trailPts = [];
    var rings = [];
    function spawnRing(x, z) {
      var r = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 32), new THREE.MeshBasicMaterial({ color: 0xd4ee2f, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.012, z); r.userData.age = 0; scene.add(r); rings.push(r);
    }

    /* ---------- 繩子線 ---------- */
    function ropeLine(color) {
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      var l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: color, dashSize: 0.18, gapSize: 0.12 }));
      l.frustumCulled = false; scene.add(l); return l;
    }
    var ropes = { A: ropeLine(0x7fb8ff), B: ropeLine(0xffb27a) };
    var ropeOn = true;

    /* ---------- 球員（真人模型 × 4） ---------- */
    var players = {};
    function labelSprite(text, color) {
      var c = document.createElement('canvas'); c.width = 256; c.height = 96;
      var g = c.getContext('2d');
      g.fillStyle = color; g.beginPath(); g.roundRect ? g.roundRect(28, 14, 200, 68, 34) : g.rect(28, 14, 200, 68); g.fill();
      g.fillStyle = '#fff'; g.font = '900 44px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 128, 50);
      var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      s.scale.set(0.8, 0.3, 1); s.renderOrder = 10; return s;
    }
    function makePaddle(color) {
      var g = new THREE.Group();
      var face = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.016, 24), new THREE.MeshStandardMaterial({ color: 0x1c2328, roughness: 0.4 }));
      face.scale.set(1, 1, 1.3); face.rotation.x = Math.PI / 2; face.position.y = 0.2; face.castShadow = true;
      var edge = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 28), new THREE.MeshStandardMaterial({ color: color }));
      edge.scale.set(1, 1.3, 1); edge.position.y = 0.2;
      var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.13, 10), new THREE.MeshStandardMaterial({ color: 0x0f1418 }));
      handle.position.y = 0.04;
      g.add(face, edge, handle); scene.add(g); return g;
    }

    /* 真人模型：Microsoft Rocketbox（MIT）四位不同的球員，共用 Biped 骨架與 Idle/Walk/Run 動作 */
    var loader = new L.GLTFLoader();
    function parse(b64) { return new Promise(function (res, rej) { loader.parse(b64ToBuf(b64), '', res, rej); }); }
    var CAST = { A1: { key: 'p0', h: 1.80 }, A2: { key: 'p1', h: 1.67 }, B1: { key: 'p2', h: 1.78 }, B2: { key: 'p3', h: 1.65 } };
    var ALIAS = { RightArm: 'R_UpperArm', RightForeArm: 'R_Forearm', RightHand: 'R_Hand', LeftArm: 'L_UpperArm', LeftForeArm: 'L_Forearm', LeftHand: 'L_Hand',
      RightUpLeg: 'R_Thigh', RightLeg: 'R_Calf', RightFoot: 'R_Foot', LeftUpLeg: 'L_Thigh', LeftLeg: 'L_Calf', LeftFoot: 'L_Foot', Head: 'Head', Nose: 'MNose' };
    Promise.all(['p0', 'p1', 'p2', 'p3'].map(function (k) { return parse(window.MODEL_DATA[k]); })).then(function (list) {
      var byKey = { p0: list[0], p1: list[1], p2: list[2], p3: list[3] };
      // 去掉骨架根節點的位移軌跡：動作原地播放，位置完全由戰術劇本控制，避免每次循環被拉回原點
      var clips = list[0].animations.map(function (c) {
        c = c.clone(); c.tracks = c.tracks.filter(function (t) { return !/^Bip01\.position$/.test(t.name); }); return c;
      });
      ['A1', 'A2', 'B1', 'B2'].forEach(function (id, idx) {
        var team = id[0], cast = CAST[id];
        var obj = byKey[cast.key].scene;
        var raw = {};
        obj.traverse(function (o) {
          if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
          if (o.name) raw[o.name] = o;
        });
        var bones = {};
        for (var a in ALIAS) bones[a] = raw['Bip01_' + ALIAS[a]] || null;
        var holder = new THREE.Group(); holder.add(obj);
        var root = new THREE.Group(); root.add(holder); scene.add(root);
        // 統一身高、讓模型面向 +z（鼻子在頭的前方）
        obj.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(obj);
        holder.scale.setScalar(cast.h / (box.max.y - box.min.y));
        holder.position.y = -box.min.y * holder.scale.x;
        if (bones.Nose && bones.Head) {
          var nz = new THREE.Vector3(), hz = new THREE.Vector3();
          bones.Nose.getWorldPosition(nz); bones.Head.getWorldPosition(hz);
          var fwd = Math.atan2(nz.x - hz.x, nz.z - hz.z);
          holder.rotation.y = -fwd;
        }
        root.rotation.y = team === 'A' ? Math.PI / 2 : -Math.PI / 2;
        var disc = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 36), new THREE.MeshBasicMaterial({ color: TEAM_COLOR[team], transparent: true, opacity: 0.85, depthWrite: false }));
        disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012; scene.add(disc);
        var mixer = new THREE.AnimationMixer(obj);
        var actions = {};
        clips.forEach(function (clip) { actions[clip.name] = mixer.clipAction(clip); });
        actions.Idle.play();
        actions.Idle.time = idx * 0.6;
        var sprite = labelSprite(NAMES[id], team === 'A' ? '#1d5d9b' : '#c85f15');
        scene.add(sprite);
        var netYaw = team === 'A' ? Math.PI / 2 : -Math.PI / 2;
        players[id] = { id: id, team: team, root: root, obj: obj, bones: bones, mixer: mixer, actions: actions, cur: 'Idle', disc: disc,
          paddle: makePaddle(team === 'A' ? 0x7fb8ff : 0xffb27a), label: sprite, swing: 0, jump: 0, readyW: 1, netYaw: netYaw, yaw: netYaw };
      });
      statusEl.hidden = true;
      try { renderSprites(); } catch (e) { console.warn('2.5D sprites', e); }
      buildList();
      select(SCENARIOS[0].id);
    }).catch(function (err) {
      statusEl.textContent = '人物模型載入失敗：' + (err && err.message || err);
    });

    /* ---------- 程序化手臂：準備姿勢、揮拍、跳躍 ---------- */
    // 方向用角色本地座標：+z 前方、+y 上方、-x 是角色的右手邊
    function V(x, y, z) { return new THREE.Vector3(x, y, z).normalize(); }
    var POSE = {
      ready: { RightArm: V(-0.35, -0.7, 0.62), RightForeArm: V(-0.1, 0.45, 0.89), LeftArm: V(0.35, -0.8, 0.45), LeftForeArm: V(0.1, -0.1, 0.99) },
      back: { RightArm: V(-0.75, -0.55, -0.35), RightForeArm: V(-0.55, 0.1, -0.83), LeftArm: V(0.5, -0.5, 0.7), LeftForeArm: V(0.2, 0.1, 0.97) },
      through: { RightArm: V(0.05, -0.2, 0.98), RightForeArm: V(0.55, 0.45, 0.7), LeftArm: V(0.45, -0.85, 0.2), LeftForeArm: V(0.2, -0.4, 0.9) }
    };
    var CHILD = { RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot' };
    var LEGS = { RightUpLeg: V(-0.1, -0.93, 0.35), RightLeg: V(-0.05, -0.96, -0.27), LeftUpLeg: V(0.1, -0.93, 0.35), LeftLeg: V(0.05, -0.96, -0.27) };
    var _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _rq = new THREE.Quaternion();
    function aim(p, name, dirLocal) {
      var bone = p.bones[name], child = p.bones[CHILD[name]];
      if (!bone || !child) return;
      bone.updateWorldMatrix(true, false);
      bone.getWorldPosition(_a); child.getWorldPosition(_b);
      var curDir = _b.sub(_a).normalize();
      p.root.getWorldQuaternion(_rq);
      _d.copy(dirLocal).applyQuaternion(_rq);
      _q.setFromUnitVectors(curDir, _d);
      bone.getWorldQuaternion(_wq);
      bone.parent.getWorldQuaternion(_pq);
      bone.quaternion.copy(_pq.invert().multiply(_q).multiply(_wq));
      bone.updateMatrixWorld(true);
    }
    function aimBlend(p, name, dirLocal, w) {
      var bone = p.bones[name], child = p.bones[CHILD[name]];
      if (!bone || !child) return;
      bone.updateWorldMatrix(true, false);
      bone.getWorldPosition(_a); child.getWorldPosition(_b);
      var cur = _b.clone().sub(_a).normalize();
      p.root.getWorldQuaternion(_rq);
      var target = dirLocal.clone().applyQuaternion(_rq);
      aim(p, name, cur.lerp(target, w).normalize().applyQuaternion(_rq.clone().invert()));
    }
    function lerpDir(a, b, t) { return new THREE.Vector3().copy(a).lerp(b, t).normalize(); }
    function poseArms(p) {
      var P0 = POSE.ready, pose = P0;
      if (p.swing > 0) {
        var t = 1 - p.swing / 0.55; // 0→1
        var from, to, k;
        if (t < 0.4) { from = P0; to = POSE.back; k = t / 0.4; }
        else if (t < 0.7) { from = POSE.back; to = POSE.through; k = (t - 0.4) / 0.3; }
        else { from = POSE.through; to = P0; k = (t - 0.7) / 0.3; }
        pose = {}; for (var n in P0) pose[n] = lerpDir(from[n], to[n], k);
      }
      ['RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm'].forEach(function (n) { aim(p, n, pose[n]); });
      // 準備姿勢：站定時膝蓋微彎（邊走邊淡出）
      if (p.readyW > 0.02) ['RightUpLeg', 'RightLeg', 'LeftUpLeg', 'LeftLeg'].forEach(function (n) { aimBlend(p, n, LEGS[n], p.readyW); });
    }
    var _h = new THREE.Vector3(), _f = new THREE.Vector3(), _fw = new THREE.Vector3(), _n = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
    function placePaddle(p) {
      var hand = p.bones.RightHand, fore = p.bones.RightForeArm;
      if (!hand || !fore) return;
      hand.getWorldPosition(_h); fore.getWorldPosition(_f);
      var dir = _h.clone().sub(_f).normalize();
      p.paddle.position.copy(_h).addScaledVector(dir, 0.04);
      p.paddle.quaternion.setFromUnitVectors(_up, dir);
      // 拍面朝向角色前方
      p.root.getWorldQuaternion(_rq);
      _fw.set(0, 0, 1).applyQuaternion(_rq);
      _fw.addScaledVector(dir, -_fw.dot(dir)).normalize();
      _n.set(0, 0, 1).applyQuaternion(p.paddle.quaternion);
      var ang = Math.atan2(_n.clone().cross(_fw).dot(dir), _n.dot(_fw));
      p.paddle.rotateOnWorldAxis(dir, ang);
    }

    function fade(p, name, dur) {
      if (p.cur === name || !p.actions[name]) return;
      var next = p.actions[name], prev = p.actions[p.cur];
      next.reset().setEffectiveWeight(1).fadeIn(dur || 0.2).play();
      if (prev) prev.fadeOut(dur || 0.2);
      p.cur = name;
    }
    function oneShot(p, name) {
      if (name === 'Punch') p.swing = 0.55;
      else if (name === 'Jump') p.jump = 0.75;
    }

    /* ---------- 把 3D 真人模型渲染成 2.5D 圖解用的圖（準備、揮拍、移動三種姿勢） ---------- */
    function renderSprites() {
      if (!window.PBIso) return;
      var W = 1.4, TOP = 1.95, BOT = -0.25, PX = 150; // 每單位 150 像素
      var r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(Math.round(W * PX), Math.round((TOP - BOT) * PX));
      r.outputColorSpace = THREE.SRGBColorSpace;
      var sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.7));
      var dl = new THREE.DirectionalLight(0xffffff, 2.0); dl.position.set(-3, 6, 5); sc.add(dl);
      // 與 app.js 的等角投影同一個視角：水平旋轉 0.32 rad、仰角 atan(0.5 / 0.95)
      var TH = 0.32, PHI = Math.atan(0.5 / 0.95);
      var cam = new THREE.OrthographicCamera(-W / 2, W / 2, TOP, BOT, 0.1, 50);
      cam.position.set(-Math.sin(TH) * Math.cos(PHI), Math.sin(PHI), Math.cos(TH) * Math.cos(PHI)).multiplyScalar(12);
      cam.lookAt(0, 0, 0);
      var LOCAL = 100 / (1.7 * Math.cos(PHI)); // 圖解座標：100 = 1.7 m 的身高
      var out = {};
      for (var id in players) {
        var p = players[id], a = p.actions;
        scene.remove(p.root); scene.remove(p.paddle); sc.add(p.root); sc.add(p.paddle);
        p.root.position.set(0, 0, 0); p.root.rotation.y = p.netYaw;
        var urls = {};
        [['ready', 'Idle', 0.4, 0, 1], ['swing', 'Idle', 0.4, 0.55 * 0.4, 1], ['move', 'Walk', 0.35, 0, 0]].forEach(function (f) {
          p.mixer.stopAllAction();
          var act = a[f[1]]; act.reset(); act.setEffectiveWeight(1); act.play(); act.time = f[2];
          p.mixer.update(0);
          p.swing = f[3]; p.readyW = f[4];
          p.root.position.y = -0.05 * p.readyW;
          p.root.updateMatrixWorld(true);
          poseArms(p); placePaddle(p);
          r.render(sc, cam);
          urls[f[0]] = r.domElement.toDataURL('image/png');
        });
        sc.remove(p.root); sc.remove(p.paddle); scene.add(p.root); scene.add(p.paddle);
        p.mixer.stopAllAction(); a.Idle.reset().play(); p.cur = 'Idle'; p.swing = 0; p.readyW = 1;
        out[id] = { ready: urls.ready, swing: urls.swing, move: urls.move, x: -W / 2 * LOCAL, y: -TOP * LOCAL, w: W * LOCAL, h: (TOP - BOT) * LOCAL };
      }
      r.dispose();
      window.PBIso.setSprites(out);
    }

    /* ---------- 劇本計算 ---------- */
    var cur = null, T = 0, playing = true, speed = 0.75;
    function contactPoint(id, xz) {
      var t = id[0], dir = t === 'A' ? 1 : -1;
      return new THREE.Vector3(xz[0] + dir * 0.35, 0.85, xz[1] + dir * 0.3);
    }
    function compile(sc) {
      var pos = {}; for (var k in sc.setup) pos[k] = sc.setup[k].slice();
      var t = 0, steps = [];
      sc.steps.forEach(function (st, i) {
        var s = { src: st, t0: t, dur: st.dur, start: {}, end: {}, segs: [] };
        for (var k in pos) s.start[k] = pos[k].slice();
        for (var m in (st.moves || {})) pos[m] = st.moves[m].slice();
        for (var k2 in pos) s.end[k2] = pos[k2].slice();
        steps.push(s); t += st.dur;
      });
      steps.forEach(function (s, i) {
        var st = s.src; if (!st.hitter) return;
        var A = contactPoint(st.hitter, s.start[st.hitter]);
        var nextSt = steps[i + 1] && steps[i + 1].src;
        var nx = nextSt && nextSt.hitter;
        var C = nx ? contactPoint(nx, s.end[nx]) : null;
        function arc(a, b, h) { return Math.max(0.05, h - (a.y + b.y) / 2); }
        if (st.land) {
          var Bp = new THREE.Vector3(st.land[0], 0.035, st.land[1]);
          if (!C) { var d = Bp.clone().sub(A).setY(0).normalize(); C = Bp.clone().add(d.multiplyScalar(1.4)); C.y = 0.035; }
          var d1 = A.distanceTo(Bp), d2 = Bp.distanceTo(C);
          var r = Math.min(0.85, Math.max(0.55, d1 / (d1 + d2 * 0.9)));
          s.segs.push({ a: A, b: Bp, arc: arc(A, Bp, st.h), t0: s.t0, t1: s.t0 + s.dur * r, bounceAt: true });
          s.segs.push({ a: Bp, b: C, arc: nx ? 0.28 + Math.max(0, C.y - 0.5) * 0.3 : 0.12, t0: s.t0 + s.dur * r, t1: s.t0 + s.dur });
        } else if (C) {
          s.segs.push({ a: A, b: C, arc: arc(A, C, st.h), t0: s.t0, t1: s.t0 + s.dur });
        }
      });
      return { sc: sc, steps: steps, total: t, segs: [].concat.apply([], steps.map(function (s) { return s.segs; })) };
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function select(id) {
      var sc = SCENARIOS.filter(function (s) { return s.id === id; })[0];
      cur = compile(sc);
      document.getElementById('lab-desc').textContent = sc.desc;
      [].forEach.call(document.querySelectorAll('.scn'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === id)); });
      restart();
    }
    function restart() {
      T = 0; trailPts = []; cur.fired = {};
      rings.forEach(function (r) { scene.remove(r); }); rings = [];
      for (var k in players) { fade(players[k], 'Idle', 0.01); players[k].swing = 0; players[k].jump = 0; players[k].yaw = players[k].netYaw; }
      playing = true; document.getElementById('lab-play').textContent = '暫停';
    }
    function buildList() {
      var box = document.getElementById('scn-list');
      SCENARIOS.forEach(function (s) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'scn'; b.dataset.id = s.id; b.id = 'scn-' + s.id;
        b.innerHTML = s.name + '<small>' + s.level + '</small>';
        b.addEventListener('click', function () { select(s.id); });
        box.appendChild(b);
      });
    }

    function stepAt(t) {
      var st = cur.steps; for (var i = st.length - 1; i >= 0; i--) if (t >= st[i].t0) return i; return 0;
    }
    var tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
    function update(dt) {
      if (!cur || !players.A1) return;
      var sdt = dt * speed;
      if (playing) {
        var prevT = T; T += sdt;
        if (T > cur.total + 1.5) {
          restart(); prevT = 0;
          var cv = renderer.domElement; cv.style.transition = 'none'; cv.style.opacity = '0';
          requestAnimationFrame(function () { cv.style.transition = 'opacity .45s'; cv.style.opacity = '1'; });
        }
        // 觸發揮拍與跳躍
        cur.steps.forEach(function (s, i) {
          var hit = s.src.hitter;
          if (hit && !cur.fired['p' + i] && T >= s.t0 - 0.22 && prevT < s.t0 + 0.2) { cur.fired['p' + i] = 1; oneShot(players[hit], 'Punch'); }
          for (var a in (s.src.anim || {})) if (!cur.fired['a' + i + a] && T >= s.t0 + s.dur * 0.25) { cur.fired['a' + i + a] = 1; oneShot(players[a], s.src.anim[a]); }
          s.segs.forEach(function (g, j) { if (g.bounceAt && !cur.fired['b' + i + j] && T >= g.t1) { cur.fired['b' + i + j] = 1; spawnRing(g.b.x, g.b.z); } });
        });
      }
      var Tc = Math.min(T, cur.total);
      var si = stepAt(Tc), s = cur.steps[si];
      var u = Math.min(1, (Tc - s.t0) / s.dur), e = ease(u);
      // 球員位置與動作
      for (var id in players) {
        var p = players[id], a = s.start[id], b = s.end[id];
        var x = a[0] + (b[0] - a[0]) * e, z = a[1] + (b[1] - a[1]) * e;
        var moving = (a[0] !== b[0] || a[1] !== b[1]) && u < 0.92;
        var spd = Math.hypot(b[0] - a[0], b[1] - a[1]) / s.dur;
        if (playing) { p.swing = Math.max(0, p.swing - sdt); p.jump = Math.max(0, p.jump - sdt); }
        var jy = (p.jump > 0 ? Math.sin((1 - p.jump / 0.75) * Math.PI) * 0.45 : 0) - 0.05 * p.readyW;
        p.root.position.set(x, jy, z);
        p.disc.position.set(x, 0.012, z);
        // 移動時身體轉向前進方向（避免倒著走），停下來再轉回面向球網
        var dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
        var wantYaw = (moving && dist > 0.5 && p.swing <= 0) ? Math.atan2(b[0] - a[0], b[1] - a[1]) : p.netYaw;
        var dy = Math.atan2(Math.sin(wantYaw - p.yaw), Math.cos(wantYaw - p.yaw));
        if (playing) p.yaw += dy * Math.min(1, sdt * 9);
        p.root.rotation.y = p.yaw;
        var gait = moving ? (spd > 1.6 ? 'Run' : 'Walk') : 'Idle';
        fade(p, gait, 0.25);
        if (gait !== 'Idle') p.actions[gait].timeScale = Math.max(0.6, Math.min(1.8, spd / (gait === 'Run' ? 3.4 : 1.2)));
        p.readyW += ((moving ? 0 : 1) - p.readyW) * Math.min(1, sdt * 6);
        p.mixer.update(playing ? sdt : 0);
        p.root.updateMatrixWorld(true);
        poseArms(p);
        placePaddle(p);
        p.label.position.set(x, 2.05 + jy, z);
      }
      // 球
      var seg = null;
      for (var k = 0; k < cur.segs.length; k++) { var g = cur.segs[k]; if (Tc >= g.t0 && Tc <= g.t1) { seg = g; break; } }
      if (!seg && cur.segs.length) {
        var last = null; cur.segs.forEach(function (g) { if (g.t1 <= Tc) last = g; });
        if (last) { ball.position.copy(last.b); ball.position.y = Math.max(0.065, last.b.y); } else { ball.position.copy(cur.segs[0].a); }
      } else if (seg) {
        var t = (Tc - seg.t0) / (seg.t1 - seg.t0);
        ball.position.lerpVectors(seg.a, seg.b, t);
        ball.position.y = seg.a.y + (seg.b.y - seg.a.y) * t + 4 * seg.arc * t * (1 - t);
        ball.position.y = Math.max(0.065, ball.position.y);
      }
      ballShadow.position.set(ball.position.x, 0.01, ball.position.z);
      if (playing) { trailPts.push(ball.position.clone()); if (trailPts.length > TRAIL) trailPts.shift(); }
      for (var q = 0; q < TRAIL; q++) {
        var idx = q - (TRAIL - trailPts.length);
        var tp = idx >= 0 ? trailPts[idx] : (trailPts[0] || ball.position);
        trailPos[q * 3] = tp.x; trailPos[q * 3 + 1] = tp.y; trailPos[q * 3 + 2] = tp.z;
      }
      trailGeo.attributes.position.needsUpdate = true;
      rings.forEach(function (r) { r.userData.age += sdt; var k = r.userData.age; r.scale.setScalar(1 + k * 4); r.material.opacity = Math.max(0, 0.9 - k * 0.9); });
      // 繩子線
      ['A', 'B'].forEach(function (t) {
        var l = ropes[t]; l.visible = ropeOn;
        if (!ropeOn) return;
        var p1 = players[t + '1'].root.position, p2 = players[t + '2'].root.position, arr = l.geometry.attributes.position.array;
        arr[0] = p1.x; arr[1] = 0.05; arr[2] = p1.z; arr[3] = p2.x; arr[4] = 0.05; arr[5] = p2.z;
        l.geometry.attributes.position.needsUpdate = true; l.computeLineDistances();
      });
      // 字幕
      var st = s.src;
      document.getElementById('cap-step').textContent = st.hitter ? ('第 ' + (si + 1) + ' 拍 · ' + NAMES[st.hitter]) : '結果';
      document.getElementById('cap-text').textContent = st.cap;
    }

    /* ---------- 攝影機 ---------- */
    var CAMS = {
      broadcast: { p: [-13.5, 6.2, 0.01], t: [0.8, 0.3, 0] },
      side: { p: [0.01, 7.5, 12.5], t: [0, 0.3, 0] },
      top: { p: [0.01, 18, 0.02], t: [0, 0, 0] },
      player: { p: [-8.8, 1.75, 1.6], t: [3, 0.7, -0.4] }
    };
    var camAnim = null;
    function setCam(name) {
      var c = CAMS[name];
      camAnim = { fromP: camera.position.clone(), fromT: controls.target.clone(), toP: new THREE.Vector3().fromArray(c.p), toT: new THREE.Vector3().fromArray(c.t), k: reduce ? 1 : 0 };
      [].forEach.call(document.querySelectorAll('[data-cam]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.cam === name)); });
    }
    [].forEach.call(document.querySelectorAll('[data-cam]'), function (b) { b.addEventListener('click', function () { setCam(b.dataset.cam); }); });
    setCam('broadcast');

    document.getElementById('lab-play').addEventListener('click', function () {
      playing = !playing; this.textContent = playing ? '暫停' : '播放';
    });
    document.getElementById('lab-replay').addEventListener('click', function () { if (cur) restart(); });
    document.getElementById('lab-speed').addEventListener('change', function () { speed = parseFloat(this.value); });
    document.getElementById('lab-rope').addEventListener('change', function () { ropeOn = this.checked; });

    /* ---------- 尺寸、可見性、繪製迴圈 ---------- */
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      camera.fov = w < 560 ? 55 : 42; camera.updateProjectionMatrix();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else addEventListener('resize', resize);
    resize();
    var visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(stage);
    var clock = new THREE.Clock();
    function tick() {
      requestAnimationFrame(tick);
      var dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || document.hidden) return;
      if (camAnim) {
        camAnim.k = Math.min(1, camAnim.k + dt * 1.6);
        var k = ease(camAnim.k);
        camera.position.lerpVectors(camAnim.fromP, camAnim.toP, k);
        controls.target.lerpVectors(camAnim.fromT, camAnim.toT, k);
        if (camAnim.k >= 1) camAnim = null;
      }
      controls.update();
      update(dt);
      renderer.render(scene, camera);
    }
    tick();
  }

  window.PB3D = { start: start, scenarios: SCENARIOS };
})();
