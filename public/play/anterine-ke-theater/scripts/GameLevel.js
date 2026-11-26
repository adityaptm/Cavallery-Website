let scores = [];

class GameLevel extends Phaser.Scene {
  constructor(levelName = "level1", mapName = "tilemap1", Data, levelNumber = 1, totalLevels = 3) {
    super({ key: levelName });
    this.levelName = levelName;
    this.mapName = mapName;
    this.intialData = Data;
    this.levelNumber = levelNumber;
    this.totalLevels = totalLevels;
    this.levelCount = totalLevels;

    this.touchState = {
      left1: false, right1: false,
      left2: false, right2: false
    };
  }

  init(data) {
    this.hearts = data.hearts !== undefined ? data.hearts : 8;
  }

  preload() {
    // Only load if not already loaded (e.g. on direct access or Level 1)
    if (!this.textures.exists("character1")) {
      this.load.bitmapFont("arcade", "assets/images/arcade.png", "assets/arcade.xml");
      this.load.image("tileset", "./assets/images/tileset.png");
      this.load.image("background", "./assets/images/Ground.png");
      this.load.spritesheet("character1", "assets/images/erine_passion.png", { frameWidth: 64, frameHeight: 96 });
      this.load.spritesheet("water_boy", "assets/images/water_boy.png", { frameWidth: 64, frameHeight: 96 });
      this.load.spritesheet("water_girl", "assets/images/water_girl.png", { frameWidth: 64, frameHeight: 96 });
      this.load.spritesheet("water_girl_love", "assets/images/water_girl_love.png", { frameWidth: 64, frameHeight: 96 });
      this.load.spritesheet("water_girl_dream", "assets/images/water_girl_dream.png", { frameWidth: 64, frameHeight: 96 });

      this.load.image("coin", "./assets/images/diamond.png");
      this.load.image("coin2", "./assets/images/fire.png");
      this.load.image("wall", "./assets/images/Wall.png");
      this.load.image("wallBtn", "./assets/images/wallBtn.png");
      this.load.image("heart", "./assets/images/heart.png");
      this.load.image("door", "./assets/images/door.png");

      this.load.tilemapCSV("tilemap1", "./assets/maps/LEVEL1.csv");
      this.load.tilemapCSV("tilemap2", "./assets/maps/level2.csv");
      this.load.tilemapCSV("tilemap3", "./assets/maps/level3.csv");

      // Loading screen Erine running progress updates
      this.load.on("progress", (val) => {
        const pct = Math.min(100, Math.floor(val * 100));
        const bar = document.getElementById("loadingBarFill");
        if (bar) bar.style.width = pct + "%";
        const pctText = document.getElementById("loadingPercent");
        if (pctText) pctText.textContent = pct + "%";
      });

      this.load.on("complete", () => {
        const bar = document.getElementById("loadingBarFill");
        if (bar) bar.style.width = "100%";
        const pctText = document.getElementById("loadingPercent");
        if (pctText) pctText.textContent = "100%";
        const status = document.getElementById("loadingStatus");
        if (status) status.textContent = "Siap Dimainkan!";

        // Show "MAIN SEKARANG" button
        const playBtn = document.getElementById("startGameBtn");
        if (playBtn) playBtn.style.display = "inline-flex";
      });
    }
  }

  create() {
    this.Data = structuredClone(this.intialData);
    this.levelStartTime = Math.floor(new Date().getTime() / 1000);
    this.isLevelTransitioning = false;

    // Reset touch state
    this.touchState = {
      left1: false, right1: false,
      left2: false, right2: false
    };

    // Keyboard keys
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    const background = this.add.image(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      "background"
    );
    background.displayWidth = this.cameras.main.width;
    background.displayHeight = this.cameras.main.height;
    background.setScrollFactor(0);

    const map = this.make.tilemap({
      key: this.mapName,
      tileWidth: 32,
      tileHeight: 32,
    });

    const tiles = map.addTilesetImage("tileset");
    const layer = map.createLayer(0, tiles, 0, 0);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const groundLevel = this.cameras.main.height - 60;

    this.createAnimations();

    // Player 1: Erine Passion
    this.character1 = this.physics.add
      .sprite(100, groundLevel, "character1")
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true)
      .setBounce(0.2)
      .setDrag(100)
      .setGravityY(500)
      .setScale(0.58);
    this.character1.body.setSize(40, 94);
    this.character1.play("idle");

    // Player 2: Gender/Character chosen by player (boy, girl, love, dream)
    this.waterGender = localStorage.getItem("waterGender") || "girl";
    const waterTextureKey = this.getWaterTextureKey(this.waterGender);

    this.character2 = this.physics.add
      .sprite(160, groundLevel, waterTextureKey)
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true)
      .setBounce(0.2)
      .setDrag(100)
      .setGravityY(500)
      .setScale(0.58);
    this.character2.body.setSize(40, 94);
    this.character2.play(`water_idle_${this.waterGender}`);

    this.coins = this.physics.add.staticGroup();
    this.coins2 = this.physics.add.staticGroup();

    map.setCollisionBetween(0, 2);
    this.physics.add.collider(this.character1, layer);
    this.physics.add.collider(this.character2, layer);

    this.physics.add.overlap(this.character2, this.coins, this.hitCoin, null, this);
    this.physics.add.overlap(this.character1, this.coins2, this.hitCoin, null, this);

    this.walls = this.physics.add.staticGroup();
    this.wallBtns = this.physics.add.staticGroup();
    this.createWalls();

    // Score & HUD
    this.score = this.registry.get("score") || 0;

    this.scoreText = this.add.text(26, 6, "Score: " + this.score, {
      fontSize: "22px",
      fontFamily: "Fredoka, Arial, sans-serif",
      fontStyle: "bold",
      fill: "#ffffff",
    }).setScrollFactor(0).setDepth(5);

    this.levelIndicator = this.add.text(26, 32, `Level ${this.levelNumber}/${this.totalLevels}`, {
      fontSize: "15px",
      fontFamily: "Fredoka, Arial, sans-serif",
      fontStyle: "bold",
      fill: "#ffb454",
    }).setScrollFactor(0).setDepth(5);

    // Door Portal
    let door = this.add.image(75, 80, "door");
    door.setDisplaySize(100, 76);
    door.setDepth(0);

    // Camera: fixed, showing entire level cleanly
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

    layer.setDepth(1);
    this.character1.setDepth(2);
    this.character2.setDepth(2);

    this.createCoins();
    this.createHearts();
    this.setupTouchControls();
  }

  setupTouchControls() {
    const bindBtn = (id, prop, isJump, character) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      const onDown = (e) => {
        if (e && e.cancelable) e.preventDefault();
        if (isJump) {
          this.jumpCharacter(character);
        } else {
          this.touchState[prop] = true;
        }
      };

      const onUp = (e) => {
        if (e && e.cancelable) e.preventDefault();
        if (!isJump) {
          this.touchState[prop] = false;
        }
      };

      btn.addEventListener("touchstart", onDown, { passive: false });
      btn.addEventListener("touchend", onUp, { passive: false });
      btn.addEventListener("touchcancel", onUp, { passive: false });
      btn.addEventListener("mousedown", onDown);
      btn.addEventListener("mouseup", onUp);
      btn.addEventListener("mouseleave", onUp);
    };

    bindBtn("left1", "left1", false, this.character1);
    bindBtn("right1", "right1", false, this.character1);
    bindBtn("up1", "up1", true, this.character1);

    bindBtn("left2", "left2", false, this.character2);
    bindBtn("right2", "right2", false, this.character2);
    bindBtn("up2", "up2", true, this.character2);
  }

  jumpCharacter(character) {
    if (character && character.body && character.body.blocked.down) {
      character.setVelocityY(-500);
      this.playAudio("jump");
    }
  }

  createCoins() {
    let coinsX = this.Data.waterCoinsX;
    let coinsY = this.Data.waterCoinsy;

    for (let i = 0; i < 10; i++) {
      const x = coinsX[i];
      const y = coinsY[i] - 60;
      const coin = this.coins.create(x, y, "coin");
      coin.body.allowGravity = false;
    }

    coinsX = this.Data.fireCoinsX;
    coinsY = this.Data.fireCoinsy;

    for (let i = 0; i < 10; i++) {
      const x = coinsX[i];
      const y = coinsY[i] - 60;
      const coin2 = this.coins2.create(x, y, "coin2");
      coin2.body.allowGravity = false;
    }
  }

  createHearts() {
    this.heartsGroup = this.physics.add.staticGroup().setDepth(5);

    for (let i = 0; i < this.hearts; i++) {
      let heart = this.heartsGroup.create(770 - i * 25, 16, "heart").setDepth(5).setScale(0.1);
      heart.refreshBody();
      this.heartsGroup.add(heart);
    }
  }

  loseHeart() {
    if (this.heartsGroup.getLength() > 0) {
      let lastHeart = this.heartsGroup.getLast(true);
      lastHeart.destroy();

      if (this.hearts <= 0) {
        this.looseGame();
      } else {
        this.playAudio("lose");
      }
    }
  }

  createWalls() {
    this.Data.walls.forEach((item) => {
      let wall = this.walls.create(item[0], item[1], "wall").setScale(item[2]).refreshBody();
      let wallBtn1 = this.wallBtns.create(item[3], item[4], "wallBtn").setScale(item[7]).refreshBody();
      let wallBtn2 = this.wallBtns.create(item[5], item[6], "wallBtn").setScale(item[7]).refreshBody();

      wall.body.allowGravity = false;
      wallBtn1.body.allowGravity = false;
      wallBtn2.body.allowGravity = false;

      item.push(wall, false, "close", "close");
    });

    this.physics.add.collider(this.character1, this.walls);
    this.physics.add.collider(this.character2, this.walls);
  }

  hitCoin(player, coin) {
    this.playAudio("coin");
    this.showPoints(100, coin.x, coin.y);
    this.updateScore(100);
    coin.destroy();
  }

  playAudio(key, volume = 0.7) {
    if (typeof window.playSfx === "function") {
      window.playSfx(key, volume);
    }
  }

  createAnimations() {
    if (!this.anims.exists("idle")) {
      this.anims.create({
        key: "idle",
        frames: this.anims.generateFrameNumbers("character1", { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!this.anims.exists("walk")) {
      this.anims.create({
        key: "walk",
        frames: this.anims.generateFrameNumbers("character1", { start: 8, end: 13 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists("run")) {
      this.anims.create({
        key: "run",
        frames: this.anims.generateFrameNumbers("character1", { start: 16, end: 23 }),
        frameRate: 12,
        repeat: -1,
      });
    }
    if (!this.anims.exists("jump")) {
      this.anims.create({
        key: "jump",
        frames: this.anims.generateFrameNumbers("character1", { start: 24, end: 27 }),
        frameRate: 8,
        repeat: 0,
      });
    }
    if (!this.anims.exists("fall")) {
      this.anims.create({
        key: "fall",
        frames: this.anims.generateFrameNumbers("character1", { start: 32, end: 35 }),
        frameRate: 8,
        repeat: 0,
      });
    }

    const genders = [
      { suffix: "boy", key: "water_boy" },
      { suffix: "girl", key: "water_girl" },
      { suffix: "love", key: "water_girl_love" },
      { suffix: "dream", key: "water_girl_dream" },
    ];

    genders.forEach(({ suffix, key }) => {
      if (!this.anims.exists(`water_idle_${suffix}`)) {
        this.anims.create({
          key: `water_idle_${suffix}`,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 6,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`water_walk_${suffix}`)) {
        this.anims.create({
          key: `water_walk_${suffix}`,
          frames: this.anims.generateFrameNumbers(key, { start: 8, end: 13 }),
          frameRate: 8,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`water_run_${suffix}`)) {
        this.anims.create({
          key: `water_run_${suffix}`,
          frames: this.anims.generateFrameNumbers(key, { start: 16, end: 23 }),
          frameRate: 12,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`water_jump_${suffix}`)) {
        this.anims.create({
          key: `water_jump_${suffix}`,
          frames: this.anims.generateFrameNumbers(key, { start: 24, end: 27 }),
          frameRate: 8,
          repeat: 0,
        });
      }
      if (!this.anims.exists(`water_fall_${suffix}`)) {
        this.anims.create({
          key: `water_fall_${suffix}`,
          frames: this.anims.generateFrameNumbers(key, { start: 32, end: 35 }),
          frameRate: 8,
          repeat: 0,
        });
      }
    });
  }

  getWaterTextureKey(gender) {
    if (gender === "boy") return "water_boy";
    if (gender === "love") return "water_girl_love";
    if (gender === "dream") return "water_girl_dream";
    return "water_girl";
  }

  setWaterGender(gender) {
    this.waterGender = gender;
    if (this.character2) {
      const texKey = this.getWaterTextureKey(gender);
      this.character2.setTexture(texKey);
      this.character2.play(`water_idle_${gender}`);
    }
  }

  updateCharacter2Animation() {
    if (!this.character2 || !this.character2.body) return;

    const vx = this.character2.body.velocity.x;
    const vy = this.character2.body.velocity.y;
    const onGround = this.character2.body.blocked.down;
    const gender = this.waterGender || "girl";

    if (vx < 0) this.character2.setFlipX(true);
    else if (vx > 0) this.character2.setFlipX(false);

    if (Math.abs(vx) > 10 && onGround) {
      if (!this.character2MoveStartTime) this.character2MoveStartTime = this.time.now;
    } else {
      this.character2MoveStartTime = 0;
    }

    if (!this.character2WasOnGround && onGround) this.character2LandingTime = this.time.now;
    this.character2WasOnGround = onGround;

    if (!onGround) {
      if (vy < -50) this.character2.anims.play(`water_jump_${gender}`, true);
      else this.character2.anims.play(`water_fall_${gender}`, true);
    } else {
      const justLanded = this.character2LandingTime && (this.time.now - this.character2LandingTime < 150);
      if (Math.abs(vx) > 10) {
        const moveDuration = this.character2MoveStartTime ? (this.time.now - this.character2MoveStartTime) : 0;
        if (moveDuration < 160) this.character2.anims.play(`water_walk_${gender}`, true);
        else this.character2.anims.play(`water_run_${gender}`, true);
      } else {
        if (justLanded) this.character2.anims.play(`water_fall_${gender}`, true);
        else this.character2.anims.play(`water_idle_${gender}`, true);
      }
    }
  }

  updateCharacter1Animation() {
    const vx = this.character1.body.velocity.x;
    const vy = this.character1.body.velocity.y;
    const onGround = this.character1.body.blocked.down;

    if (vx < 0) this.character1.setFlipX(true);
    else if (vx > 0) this.character1.setFlipX(false);

    if (Math.abs(vx) > 10 && onGround) {
      if (!this.character1MoveStartTime) this.character1MoveStartTime = this.time.now;
    } else {
      this.character1MoveStartTime = 0;
    }

    if (!this.character1WasOnGround && onGround) this.character1LandingTime = this.time.now;
    this.character1WasOnGround = onGround;

    if (!onGround) {
      if (vy < -50) this.character1.anims.play("jump", true);
      else this.character1.anims.play("fall", true);
    } else {
      const justLanded = this.character1LandingTime && (this.time.now - this.character1LandingTime < 150);
      if (Math.abs(vx) > 10) {
        const moveDuration = this.character1MoveStartTime ? (this.time.now - this.character1MoveStartTime) : 0;
        if (moveDuration < 160) this.character1.anims.play("walk", true);
        else this.character1.anims.play("run", true);
      } else {
        if (justLanded) this.character1.anims.play("fall", true);
        else this.character1.anims.play("idle", true);
      }
    }
  }

  update() {
    // Player 1 controls (Keyboard Arrow Keys + Mobile Touch)
    this.character1.setVelocityX(0);
    const p1Left = (this.cursors && this.cursors.left && this.cursors.left.isDown) || this.touchState.left1;
    const p1Right = (this.cursors && this.cursors.right && this.cursors.right.isDown) || this.touchState.right1;
    const p1Up = (this.cursors && this.cursors.up && this.cursors.up.isDown);

    if (p1Left) {
      this.character1.setVelocityX(-200);
    } else if (p1Right) {
      this.character1.setVelocityX(200);
    }
    if (p1Up && this.character1.body.blocked.down) {
      this.jumpCharacter(this.character1);
    }
    this.updateCharacter1Animation();

    // Player 2 controls (Keyboard WASD Keys + Mobile Touch)
    this.character2.setVelocityX(0);
    const p2Left = (this.keyA && this.keyA.isDown) || this.touchState.left2;
    const p2Right = (this.keyD && this.keyD.isDown) || this.touchState.right2;
    const p2Up = (this.keyW && this.keyW.isDown);

    if (p2Left) {
      this.character2.setVelocityX(-200);
    } else if (p2Right) {
      this.character2.setVelocityX(200);
    }
    if (p2Up && this.character2.body.blocked.down) {
      this.jumpCharacter(this.character2);
    }
    this.updateCharacter2Animation();

    // Door check: both players must reach the portal to advance
    const inDoor1 = (this.character1.x <= 130 && this.character1.y <= 160);
    const inDoor2 = (this.character2.x <= 130 && this.character2.y <= 160);
    if (inDoor1 && inDoor2 && !this.isLevelTransitioning) {
      this.isLevelTransitioning = true;
      this.finishScene();
    }

    let x1 = this.character1.x;
    let y1 = this.character1.y;
    let x2 = this.character2.x;
    let y2 = this.character2.y;

    // Walls logic
    this.Data.walls.forEach((item) => {
      item[9] = item[10];

      if (
        (x1 > item[3] - 20 && x1 <= item[3] + 20 && y1 > item[4] - 10 && y1 <= item[4] + 70) ||
        (x1 > item[5] - 20 && x1 <= item[5] + 20 && y1 > item[6] - 10 && y1 <= item[6] + 70) ||
        (x2 > item[3] - 20 && x2 <= item[3] + 20 && y2 > item[4] - 10 && y2 <= item[4] + 70) ||
        (x2 > item[5] - 20 && x2 <= item[5] + 20 && y2 > item[6] - 10 && y2 <= item[6] + 70)
      ) {
        item[10] = "open";
        item[8].setY(item[1] - 35);
        item[8].setAngle(90);
        item[8].body.enable = false;
        item[8].refreshBody();
      } else {
        item[10] = "close";
        item[8].setY(item[1]);
        item[8].setAngle(0);
        item[8].body.enable = true;
        item[8].refreshBody();
      }

      if (item[9] == "open" && item[10] == "close") {
        this.playAudio("wallClose");
      } else if (item[9] == "close" && item[10] == "open") {
        this.playAudio("wallOpen");
      }
    });

    // Fire hazards (damage Player 2)
    this.Data.fire.forEach((item) => {
      if (x2 > item[0] - 17 && x2 <= item[0] + 17 && y2 > item[1] - 8 && y2 <= item[1] + 8) {
        this.character2.x = x2 + 70;
        this.hearts--;
        this.loseHeart();
      }
    });

    // Water hazards (damage Player 1)
    this.Data.water.forEach((item) => {
      if (x1 > item[0] - 17 && x1 <= item[0] + 17 && y1 > item[1] - 8 && y1 <= item[1] + 8) {
        this.character1.x = x1 - 70;
        this.hearts--;
        this.loseHeart();
      }
    });
  }

  updateScore(points = 0) {
    this.score += points;
    this.scoreText.setText("Score: " + this.score);
  }

  showPoints(score, x, y) {
    let pointsText = this.add.text(x, y, `+${score}`, {
      fontSize: "24px",
      fill: "#ff0",
    }).setOrigin(0.5).setDepth(5);

    this.tweens.add({
      targets: pointsText,
      y: y - 50,
      alpha: { from: 1, to: 0 },
      duration: 800,
      onComplete: () => {
        pointsText.destroy();
      },
    });
  }

  looseGame() {
    if (this.isLevelTransitioning) return;
    this.isLevelTransitioning = true;

    this.playAudio("gameOverSound");
    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.time.delayedCall(450, () => {
      this.scene.stop();
      this.registry.set("currentLevel", 1);
      this.registry.set("score", 0);
      this.scene.start("gameover", { scores: scores, level: this.levelNumber });
      scores = [];
    });
  }

  finishScene() {
    if (this.registry.get("currentLevel") === undefined) {
      this.registry.set("currentLevel", this.levelNumber);
    }

    const levelEndTime = Math.floor(new Date().getTime() / 1000);
    const speedValue = Math.floor(10 / Math.max(1, (levelEndTime - this.levelStartTime)) * 10000);
    this.score += speedValue;
    scores.push(this.score);
    this.registry.set("score", this.score);

    this.playAudio("levelEnd");
    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.time.delayedCall(450, () => {
      this.scene.stop();
      if (this.levelNumber >= this.totalLevels) {
        this.registry.set("currentLevel", 1);
        this.registry.set("score", 0);
        this.scene.start("end", { level: this.levelNumber, scores: scores, totalScore: this.score });
        scores = [];
      } else {
        const nextLvl = this.levelNumber + 1;
        this.registry.set("currentLevel", nextLvl);
        this.scene.start("nextScenex", {
          currentLevel: this.levelNumber,
          totalLevels: this.totalLevels,
          nextLevel: nextLvl,
          score: this.score,
          hearts: this.hearts,
        });
      }
    });
  }
}

export default GameLevel;
