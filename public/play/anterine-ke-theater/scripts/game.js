import end from "./end.js";
import GameOver from "./GameOver.js";
import GameLevel from "./GameLevel.js";
import NextLevel from "./next.js";

/*
  Level Configuration Objects (Data separated from game logic)
*/

const data1 = {
    waterCoinsX: [288, 430, 667, 700, 136, 430, 750, 276],
    waterCoinsy: [130, 230, 220, 130, 318, 430, 510, 606],
    fireCoinsX:  [228, 60,  567, 600, 296, 50,  650, 376],
    fireCoinsy:  [130, 230, 220, 130, 318, 480, 490, 606],

    walls: [
        [480, 435, 0.8, 450, 606, 420, 478, 0.2],
        [600, 305, 0.8, 418, 318, 500, 190, 0.2]
    ],

    water: [[729, 350], [746, 348]],
    fire:  [[370, 188], [401, 188], [47, 444]]
};

const data2 = {
    waterCoinsX: [288, 127, 667, 700, 136, 430, 750, 276],
    waterCoinsy: [130, 600, 220, 130, 318, 370, 510, 606],
    fireCoinsX:  [348, 60,  550, 600, 296, 50,  650, 376],
    fireCoinsy:  [130, 350, 200, 300, 338, 480, 500, 640],

    walls: [
        [440, 465, 0.8, 408, 510, 583, 510, 0.2],
        [215, 83,  0.8, 300, 222, 130, 126, 0.2]
    ],
    
    water: [[594, 382], [625, 382]],
    fire:  [[241, 222], [495, 158], [432, 382]]
};

const data3 = {
    waterCoinsX: [288, 127, 720, 700, 116, 250, 750, 276],
    waterCoinsy: [130, 250, 400, 130, 400, 500, 510, 636],
    fireCoinsX:  [228, 60,  670, 600, 226, 50,  650, 376],
    fireCoinsy:  [130, 260, 400, 130, 400, 500, 500, 636],

    walls: [
        [450, 340, 0.8, 177, 253, 475, 382, 0.2],
        [542, 83,  0.8, 713, 254, 410, 158, 0.2]
    ],
    
    water: [[755, 252], [243, 252]],
    fire:  [[525, 252], [304, 380], [656, 508]]
};

// ── Array-based Level Configuration System ──
export const levelConfigs = [
    { key: "level1", mapName: "tilemap1", data: data1, levelNumber: 1, totalLevels: 3 },
    { key: "level2", mapName: "tilemap2", data: data2, levelNumber: 2, totalLevels: 3 },
    { key: "level3", mapName: "tilemap3", data: data3, levelNumber: 3, totalLevels: 3 }
];

const GameLevel1 = new GameLevel("level1", "tilemap1", data1, 1, 3);
const GameLevel2 = new GameLevel("level2", "tilemap2", data2, 2, 3);
const GameLevel3 = new GameLevel("level3", "tilemap3", data3, 3, 3);

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 640,
  parent: "gameContainer",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 640,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  // GameLevel1 is the primary scene — loads assets directly, so arena is ready immediately!
  scene: [GameLevel1, NextLevel, GameLevel2, GameLevel3, end, GameOver],
};

const game = new Phaser.Game(config);
window.game = game;

// ── Mute / Unmute System with LocalStorage ──
let isMuted = false;
try {
  isMuted = localStorage.getItem("gameMuted") === "true";
} catch(e) {
  isMuted = false;
}

// ── Complete Audio Engine (BGM + All SFX with HTML5 Audio Fallback) ──
const htmlBgm = new Audio("./assets/audio/theme.mp3");
htmlBgm.loop = true;
htmlBgm.volume = 0.4;
window.htmlBgm = htmlBgm;

const sfxFiles = {
  jump: "./assets/audio/jump.mp3",
  coin: "./assets/audio/coin.wav",
  levelEnd: "./assets/audio/levelEnd.mp3",
  wallOpen: "./assets/audio/wallOpen.mp3",
  wallClose: "./assets/audio/wallClose.mp3",
  lose: "./assets/audio/lose.wav",
  gameOverSound: "./assets/audio/gameOver.wav"
};

export function playSfx(key, vol = 0.7) {
  if (isMuted) return;

  // 1. Play via HTML5 Audio clone (100% works across all browsers & devices)
  try {
    const src = sfxFiles[key];
    if (src) {
      const sound = new Audio(src);
      sound.volume = vol;
      sound.play().catch(() => {});
    }
  } catch(e) {}

  // 2. Also trigger Phaser sound if unlocked & ready
  try {
    const currentScene = window.game && window.game.scene ? window.game.scene.getScenes(true)[0] : null;
    if (currentScene && currentScene.cache && currentScene.cache.audio && currentScene.cache.audio.has(key)) {
      if (currentScene.sound && !currentScene.sound.locked) {
        currentScene.sound.play(key, { volume: vol });
      }
    }
  } catch(e) {}
}
window.playSfx = playSfx;

export function playBgm() {
  if (isMuted) return;

  // Unsuspend WebAudio context
  if (window.game && window.game.sound && window.game.sound.context) {
    if (window.game.sound.context.state === "suspended") {
      window.game.sound.context.resume().catch(() => {});
    }
    if (window.game.sound.locked) {
      window.game.sound.unlock();
    }
  }

  // 1. Try Phaser WebAudio
  let startedPhaser = false;
  try {
    const currentScene = window.game && window.game.scene ? window.game.scene.getScenes(true)[0] : null;
    if (currentScene && currentScene.cache && currentScene.cache.audio && currentScene.cache.audio.has("theme")) {
      if (!window.bgm) {
        window.bgm = currentScene.sound.add("theme", { loop: true, volume: 0.4 });
      }
      if (!window.bgm.isPlaying) {
        window.bgm.play();
        startedPhaser = true;
      } else {
        startedPhaser = true;
      }
    }
  } catch(e) {
    console.warn("Phaser WebAudio error:", e);
  }

  // 2. If Phaser WebAudio didn't start or was locked, start HTML5 Audio fallback
  setTimeout(() => {
    const isPlaying = window.bgm && window.bgm.isPlaying;
    if (!isPlaying && !isMuted) {
      htmlBgm.play().catch(err => console.warn("HTML5 Audio fallback error:", err));
    }
  }, 250);
}
window.playBgm = playBgm;

function updateMuteButtonUI() {
  const muteBtn = document.getElementById("muteToggleBtn");
  if (!muteBtn) return;
  const icon = muteBtn.querySelector("i");
  if (icon) {
    icon.className = isMuted ? "bx bx-volume-mute" : "bx bx-volume-full";
  }
}

function toggleMute() {
  isMuted = !isMuted;
  try {
    localStorage.setItem("gameMuted", isMuted ? "true" : "false");
  } catch(e) {}
  updateMuteButtonUI();
  if (window.game && window.game.sound) {
    window.game.sound.mute = isMuted;
  }
  if (htmlBgm) {
    htmlBgm.muted = isMuted;
  }
  if (!isMuted) {
    playBgm();
  }
}

function initMuteButton() {
  updateMuteButtonUI();
  const muteBtn = document.getElementById("muteToggleBtn");
  if (muteBtn) {
    muteBtn.addEventListener("click", toggleMute);
  }
}

// ── Global Start Game Trigger (Invoked by Button, Key, or Click) ──
window.startGameNow = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  // 1. Play BGM directly on user gesture
  playBgm();
  // 2. Hide loading screen immediately with smooth fade
  const loader = document.getElementById("loadingScreen");
  if (loader && !loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => { loader.style.display = "none"; }, 350);
  }
};

// ── Connect "MAIN SEKARANG" Button on Loading Screen ──
function initStartGameButton() {
  const startBtn = document.getElementById("startGameBtn");
  if (startBtn) {
    startBtn.onclick = window.startGameNow;
  }

  // Also allow pressing SPACE or ENTER on loading screen when ready
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      const loader = document.getElementById("loadingScreen");
      if (loader && loader.style.display !== "none" && !loader.classList.contains("fade-out")) {
        window.startGameNow(e);
      }
    }
  });
}

// ── Player 2 Character Selector (Syncs both loading screen and sidebar buttons) ──
function initWaterCharacterSelector() {
  const characters = ["boy", "girl", "love", "dream"];
  const btnMap = {
    boy: [document.getElementById("waterBoyBtn"), document.getElementById("loadingWaterBoyBtn")].filter(Boolean),
    girl: [document.getElementById("waterGirlBtn"), document.getElementById("loadingWaterGirlBtn")].filter(Boolean),
    love: [document.getElementById("waterLoveBtn"), document.getElementById("loadingWaterLoveBtn")].filter(Boolean),
    dream: [document.getElementById("waterDreamBtn"), document.getElementById("loadingWaterDreamBtn")].filter(Boolean)
  };

  function setCharacter(charKey) {
    try {
      localStorage.setItem("waterGender", charKey);
    } catch(e) {}

    characters.forEach(key => {
      const isActive = (key === charKey);
      (btnMap[key] || []).forEach(b => {
        if (isActive) b.classList.add("active");
        else b.classList.remove("active");
      });
    });

    if (window.game && window.game.scene) {
      window.game.scene.getScenes(true).forEach(scene => {
        if (typeof scene.setWaterGender === "function") {
          scene.setWaterGender(charKey);
        }
      });
    }
  }

  let current = "girl";
  try {
    current = localStorage.getItem("waterGender") || "girl";
    if (!characters.includes(current)) current = "girl";
  } catch(e) {
    current = "girl";
  }
  setCharacter(current);

  characters.forEach(key => {
    (btnMap[key] || []).forEach(b => {
      b.addEventListener("click", () => {
        setCharacter(key);
        playBgm();
      });
    });
  });
}

// ── Setup UI Event Listeners ──
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initWaterCharacterSelector();
    initMuteButton();
    initStartGameButton();
  });
} else {
  initWaterCharacterSelector();
  initMuteButton();
  initStartGameButton();
}

// Sync mute status when Phaser boots
game.events.on("ready", () => {
  if (game.sound) {
    game.sound.mute = isMuted;
  }
});

// ── DOM-level Audio Unlock for any click or keypress ──
function unlockAudio() {
  if (window.game && window.game.sound && window.game.sound.context) {
    const ctx = window.game.sound.context;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        playBgm();
      }).catch(() => {});
    }
  }
}
document.addEventListener("click", unlockAudio, { passive: true });
document.addEventListener("touchstart", unlockAudio, { passive: true });
document.addEventListener("keydown", unlockAudio, { passive: true });
