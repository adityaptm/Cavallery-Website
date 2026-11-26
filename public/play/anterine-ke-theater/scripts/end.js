export default class End extends Phaser.Scene {
    constructor() {
        super({ key: "end" });
    }

    init(data) {
        this.scores = data.scores || [];
        this.totalScore = data.totalScore || 0;
    }

    create() {
        // Kirim event game over / kemenangan ke parent window jika ada
        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: "GAME_OVER",
                    gameId: "anterine-ke-theater",
                    score: this.totalScore || 0,
                    scores: this.scores || [],
                }, "*");
            } catch (e) {}
        }

        this.width = this.sys.game.config.width;
        this.height = this.sys.game.config.height;
        this.center_width = this.width / 2;
        this.center_height = this.height / 2;

        this.cameras.main.setBackgroundColor(0x140d08);

        // Main Victory Title
        this.add.text(this.center_width, this.center_height - 180, "Sampai di Theater!", {
            fontSize: "38px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fontStyle: "bold",
            fill: "#ff7a00"
        }).setOrigin(0.5).setShadow(0, 3, "#000000", 8);

        this.add.text(this.center_width, this.center_height - 130, "Erine berhasil tiba di Theater JKT48 tepat waktu!", {
            fontSize: "18px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fill: "#f5ebe6"
        }).setOrigin(0.5);

        // Score summary box
        const boxY = this.center_height - 85;
        this.add.rectangle(this.center_width, boxY + 55, 340, 130, 0x22130a, 0.9)
            .setStrokeStyle(2, 0xff7a00, 0.6);

        this.add.text(this.center_width, boxY + 15, "TOTAL SCORE", {
            fontSize: "14px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fill: "#bda393"
        }).setOrigin(0.5);

        this.add.text(this.center_width, boxY + 45, `${this.totalScore}`, {
            fontSize: "34px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fontStyle: "bold",
            fill: "#ffd700"
        }).setOrigin(0.5);

        // Scores breakdown
        let scoresText = "";
        for (let i = 0; i < this.scores.length; i++) {
            scoresText += `Level ${i + 1}: ${this.scores[i]}   `;
        }
        this.add.text(this.center_width, boxY + 90, scoresText, {
            fontSize: "14px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fill: "#f5ebe6"
        }).setOrigin(0.5);

        // "Main Lagi" Button
        const btnY = this.center_height + 110;
        const btn = this.add.rectangle(this.center_width, btnY, 260, 56, 0xff5a00, 1)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);

        this.add.text(this.center_width, btnY, "↻  Main Lagi", {
            fontSize: "22px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fontStyle: "bold",
            fill: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(this.center_width, btnY + 48, "Tekan SPACE atau Klik untuk Main Lagi", {
            fontSize: "14px",
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
