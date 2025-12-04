let idleSheet, walkSheet, jumpSheet, pushSheet, toolSheet;
let idleAnimation = [], walkAnimation = [], jumpAnimation = [], pushAnimation = [], toolAnimation = [];
let currentFrame = 0;
let characterX, characterY;
let state = 'idle'; // 'idle', 'walking', 'jumping', 'attacking'
let facingDirection = 'right'; // 'right' or 'left'
const speed = 5;

let isJumping = false;
let jumpFrame = 0;
let originalY;

let isAttacking = false;
let attackFrame = 0;

let projectiles = [];
const projectileSpeed = 10;

// 待機動畫的畫格尺寸
const idleFrameCount = 8;
const idleFrameWidth = 699 / idleFrameCount;
const idleFrameHeight = 190;

// 走路動畫的畫格尺寸
const walkFrameCount = 8;
const walkFrameWidth = 1019 / walkFrameCount;
const walkFrameHeight = 195;

// 跳躍動畫的畫格尺寸
const jumpFrameCount = 14;
const jumpFrameWidth = 2249 / jumpFrameCount;
const jumpFrameHeight = 214;

// 攻擊動畫的畫格尺寸
const pushFrameCount = 10;
const pushFrameWidth = 2215 / pushFrameCount;
const pushFrameHeight = 185;

// 投射物動畫的畫格尺寸
const toolFrameCount = 4;
const toolFrameWidth = 503 / toolFrameCount;
const toolFrameHeight = 229;

function preload() {
  // 預先載入所有圖片精靈檔案
  idleSheet = loadImage('1/stop/stop_1.png');
  walkSheet = loadImage('1/walk/walk_1.png');
  jumpSheet = loadImage('1/jump/jump_1.png');
  pushSheet = loadImage('1/push/push_1.png');
  toolSheet = loadImage('1/tool/tool_1.png');
}

function setup() {
  // 建立一個全視窗的畫布
  createCanvas(windowWidth, windowHeight);

  // 初始化角色位置在畫布中央
  characterX = width / 2;
  originalY = characterY = height / 2;

  // 將待機圖片精靈切割成個別的畫格
  for (let i = 0; i < idleFrameCount; i++) {
    let frame = idleSheet.get(i * idleFrameWidth, 0, idleFrameWidth, idleFrameHeight);
    idleAnimation.push(frame);
  }

  // 將走路圖片精靈切割成個別的畫格
  for (let i = 0; i < walkFrameCount; i++) {
    let frame = walkSheet.get(i * walkFrameWidth, 0, walkFrameWidth, walkFrameHeight);
    walkAnimation.push(frame);
  }

  // 將跳躍圖片精靈切割成個別的畫格
  for (let i = 0; i < jumpFrameCount; i++) {
    let frame = jumpSheet.get(i * jumpFrameWidth, 0, jumpFrameWidth, jumpFrameHeight);
    jumpAnimation.push(frame);
  }

  // 將攻擊圖片精靈切割成個別的畫格
  for (let i = 0; i < pushFrameCount; i++) {
    let frame = pushSheet.get(i * pushFrameWidth, 0, pushFrameWidth, pushFrameHeight);
    pushAnimation.push(frame);
  }

  // 將投射物圖片精靈切割成個別的畫格
  for (let i = 0; i < toolFrameCount; i++) {
    let frame = toolSheet.get(i * toolFrameWidth, 0, toolFrameWidth, toolFrameHeight);
    toolAnimation.push(frame);
  }

  // 設定動畫播放速度
  frameRate(10);
  imageMode(CENTER); // 將圖片的繪製原點設為中心
}

function draw() {
  // 設定背景顏色
  background('#fefae0');

  // 狀態管理
  if (isJumping) {
    // 1. 跳躍狀態優先
    state = 'jumping';
    // 跳躍物理：前8幀上升，後6幀下降
    if (jumpFrame < 8) {
      characterY -= 15; // 向上移動
    } else {
      characterY += 15; // 向下移動
    }
    jumpFrame++;
    // 當動畫播放完畢
    if (jumpFrame >= jumpFrameCount) {
      isJumping = false;
      jumpFrame = 0;
      characterY = originalY; // 重設回原始高度
    }
  } else if (isAttacking) {
    // 2. 其次是攻擊狀態
    state = 'attacking';
    // 當攻擊動畫播放完畢
    if (attackFrame >= pushFrameCount) {
      isAttacking = false;
      attackFrame = 0;
      spawnProjectile();
    }
    attackFrame++;
  } else {
    // 3. 最後才檢查其他輸入
    if (keyIsDown(UP_ARROW)) {
      isJumping = true;
      state = 'jumping'; // 立即設定狀態
    } else if (keyIsDown(32)) { // 32是空白鍵的 keycode
      isAttacking = true;
      state = 'attacking'; // 立即設定狀態
    } else if (keyIsDown(RIGHT_ARROW)) {
      state = 'walking';
      facingDirection = 'right';
      characterX += speed;
    } else if (keyIsDown(LEFT_ARROW)) {
      state = 'walking';
      facingDirection = 'left';
      characterX -= speed;
    } else {
      state = 'idle';
    }
  }

  // --- 繪製角色 ---
  push();
  translate(characterX, characterY);
  if (facingDirection === 'left') {
    scale(-1, 1);
  }

  // 根據狀態選擇動畫並繪製
  if (state === 'idle') {
    currentFrame = (currentFrame + 1) % idleFrameCount;
    image(idleAnimation[currentFrame], 0, 0);
  } else if (state === 'walking') {
    currentFrame = (currentFrame + 1) % walkFrameCount;
    image(walkAnimation[currentFrame], 0, 0);
  } else if (state === 'jumping' && jumpFrame < jumpFrameCount) {
    image(jumpAnimation[jumpFrame], 0, 0);
  } else if (state === 'attacking' && attackFrame < pushFrameCount) {
    image(pushAnimation[attackFrame], 0, 0);
  }

  pop();

  // --- 繪製與更新投射物 ---
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.x += p.speed;

    push();
    translate(p.x, p.y);
    if (p.direction === 'left') {
      scale(-1, 1);
    }
    image(toolAnimation[p.animFrame], 0, 0);
    pop();

    p.animFrame = (p.animFrame + 1) % toolFrameCount;

    // 如果投射物飛出畫面，就將其移除
    if (p.x > width + toolFrameWidth || p.x < -toolFrameWidth) {
      projectiles.splice(i, 1);
    }
  }
}

function spawnProjectile() {
  let projectile = {
    x: characterX + (facingDirection === 'right' ? 50 : -50), // 根據方向微調起始位置
    y: characterY,
    direction: facingDirection,
    speed: facingDirection === 'right' ? projectileSpeed : -projectileSpeed,
    animFrame: 0
  };
  projectiles.push(projectile);
}
