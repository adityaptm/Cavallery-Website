export default class NextLevel extends Phaser.Scene {
    constructor() {
        super({ key: "nextScenex" });
    }

    init(data) {
        this.hearts = data.hearts !== undefined ? data.hearts : 8;
        this.previousScore = data.score || 0;
        this.currentLevel = data.currentLevel || 1;
        this.totalLevels = data.totalLevels || 3;
        this.nextLevel = data.nextLevel || (this.currentLevel + 1);
    }

    create() {
        this.width = this.sys.game.config.width;
        this.height = this.sys.game.config.height;
        this.center_width = this.width / 2;
        this.center_height = this.height / 2;

        this.cameras.main.setBackgroundColor(0x140d08);

        this.add.text(this.center_width, this.center_height - 130, `Level ${this.currentLevel} Selesai!`, {
            fontSize: "36px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fontStyle: "bold",
            fill: "#ff7a00"
        }).setOrigin(0.5).setShadow(0, 3, "#000000", 8);

        this.add.text(this.center_width, this.center_height - 75, `Total Score: ${this.previousScore}`, {
            fontSize: "22px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fill: "#ffd700"
        }).setOrigin(0.5);

        // Next level button
        const btnY = this.center_height + 20;
        const btn = this.add.rectangle(this.center_width, btnY, 280, 60, 0xff5a00, 1)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);

        this.add.text(this.center_width, btnY, `LANJUT LEVEL ${this.nextLevel}`, {
            fontSize: "22px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fontStyle: "bold",
            fill: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(this.center_width, btnY + 55, "Tekan SPACE atau Klik untuk Lanjut", {
            fontSize: "15px",
            fontFamily: "Fredoka, Arial, sans-serif",
            fill: "#bda393"
        }).setOrigin(0.5);

        btn.on("pointerover", () => btn.setFillStyle(0xff7722));
        btn.on("pointerout", () => btn.setFillStyle(0xff5a00));
        btn.on("pointerdown", () => this.startNextLevel());

        this.input.keyboard.on("keydown-SPACE", this.startNextLevel, this);
        this.input.keyboard.on("keydown-ENTER", this.startNextLevel, this);
        this.input.on("pointerdown", () => this.startNextLevel(), this);
    }

    startNextLevel() {
        this.registry.set("currentLevel", this.nextLevel);
        this.scene.start(`level${this.nextLevel}`, { hearts: this.hearts });
    }
}
