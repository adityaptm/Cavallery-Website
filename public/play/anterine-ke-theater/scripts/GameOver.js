export default class GameOver extends Phaser.Scene {
    constructor() {
        super({ key: "gameover" });
    }

    init(data) {
        this.scores = data.scores || [];
        this.level = data.level || 1;
    }

    create() {
        // Kirim event game over ke parent window jika ada
        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: "GAME_OVER",
                    gameId: "anterine-ke-theater",
                    score: 0,
                    level: this.level || 1,
                }, "*");
            } catch (e) {}
        }

        this.width = this.sys.game.config.width;
        this.height = this.sys.game.config.height;
        this.center_width = this.width / 2;
        this.center_height = this.height / 2;

        this.cameras.main.setBackgroundColor(0x140d08);

        this.add.text(this.center_width, this.center_height - 140, "Belum Sampai di Theater", {
            fontSize: "36px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fontStyle: "bold",
            fill: "#ff4444"
        }).setOrigin(0.5).setShadow(0, 3, "#000000", 8);

        this.add.text(this.center_width, this.center_height - 85, "Erine kehabisan nyawa di perjalanan!", {
            fontSize: "18px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fill: "#f5ebe6"
        }).setOrigin(0.5);

        // Restart button
        const btnY = this.center_height + 20;
        const btn = this.add.rectangle(this.center_width, btnY, 260, 56, 0xff5a00, 1)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);

        this.add.text(this.center_width, btnY, "↻  Coba Lagi", {
            fontSize: "22px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fontStyle: "bold",
            fill: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(this.center_width, btnY + 50, "Tekan SPACE atau Klik untuk Coba Lagi", {
            fontSize: "15px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fill: "#bda393"
        }).setOrigin(0.5);

        btn.on("pointerover", () => btn.setFillStyle(0xff7722));
        btn.on("pointerout", () => btn.setFillStyle(0xff5a00));
        btn.on("pointerdown", () => this.restartGame());

        this.input.keyboard.on("keydown-SPACE", this.restartGame, this);
        this.input.keyboard.on("keydown-ENTER", this.restartGame, this);
        this.input.on("pointerdown", () => this.restartGame(), this);
    }

    restartGame() {
        if (this.registry) {
            this.registry.set("score", 0);
            this.registry.set("currentLevel", 1);
        }
        if (typeof window.playBgm === "function") {
            window.playBgm();
        }
        this.scene.start("level1", { hearts: 8 });
    }
}
