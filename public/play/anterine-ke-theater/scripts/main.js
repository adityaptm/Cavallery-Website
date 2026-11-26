// Loading screen is managed cleanly by GameStart scene and user interaction.
// When loading reaches 100%, the prominent "MAIN SEKARANG" button appears.
// Safety fallback: if loading somehow takes more than 7s, show the play button so user is never stuck.
setTimeout(function() {
    var playBtn = document.getElementById('startGameBtn');
    if (playBtn) {
        playBtn.style.display = 'inline-flex';
    }
    var status = document.getElementById('loadingStatus');
    if (status && status.textContent === 'Memuat Aset Game...') {
        status.textContent = 'Siap Dimainkan!';
    }
    var bar = document.getElementById('loadingBarFill');
    if (bar) bar.style.width = '100%';
    var pct = document.getElementById('loadingPercent');
    if (pct) pct.textContent = '100%';
}, 7000);
