"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerNameModal, { STORAGE_KEY_NAME, getOrCreateDeviceId } from "@/components/games/PlayerNameModal";
import GameResultModal from "@/components/games/GameResultModal";

interface GameFrameProps {
  src: string;
  title: string;
  slug?: string;
  showMusicToggle?: boolean;
}

export default function GameFrame({ src, title, slug = "anterine-ke-theater", showMusicToggle }: GameFrameProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [musicOn, setMusicOn] = useState(true);
  const [playerName, setPlayerName] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Result Modal State
  const [gameOverResult, setGameOverResult] = useState<{
    score: number;
    duration: number;
  } | null>(null);

  // Hanya game Anterine Ke Theater yang butuh modal input nama sebelum main
  // (Game Belalang & Bibir sudah memiliki input nama di dalam gamenya sendiri)
  const needsPreGameModal = slug === "anterine-ke-theater";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const devId = getOrCreateDeviceId();
      setDeviceId(devId);
      const savedName = localStorage.getItem(STORAGE_KEY_NAME) || "";
      if (savedName) {
        setPlayerName(savedName);
      }
      // Jika tidak butuh modal nama sebelum main, langsung start
      if (!needsPreGameModal) {
        setHasStarted(true);
        setStartTime(Date.now());
      }
    }
  }, [needsPreGameModal]);

  const handleNameConfirm = (name: string, devId: string) => {
    setPlayerName(name);
    setDeviceId(devId);
    setHasStarted(true);
    setStartTime(Date.now());
  };

  const getAvailableHeight = () => {
    if (wrapperRef.current) {
      return wrapperRef.current.getBoundingClientRect().height;
    }
    return window.innerHeight;
  };

  const toggleMusic = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const bgm = iframe.contentWindow?.document.getElementById("bgm") as HTMLAudioElement | null;
      if (bgm) {
        musicOn ? bgm.pause() : bgm.play();
        setMusicOn(!musicOn);
      }
    } catch {
      iframe.contentWindow?.postMessage({ type: "TOGGLE_MUSIC" }, "*");
      setMusicOn(!musicOn);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data) return;
      const { type, score } = event.data;

      if (type === "GAME_OVER" || type === "GAME_SCORE_SUBMIT" || type === "SUBMIT_SCORE") {
        const finalScore = Number(score) || 0;
        const durationSec = Math.max(1, Math.round((Date.now() - (startTime || Date.now())) / 1000));

        setGameOverResult({
          score: finalScore,
          duration: durationSec,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [slug, startTime]);

  const handlePlayAgain = () => {
    setGameOverResult(null);
    setStartTime(Date.now());
    // Reload iframe to restart game
    if (iframeRef.current) {
      iframeRef.current.src = src;
    }
  };

  const handleViewLeaderboard = () => {
    router.push(`/games?tab=${slug}#leaderboard`);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: "600px", background: "#0c0a09" }}>
      {/* 1. Modal Input Nama (Hanya untuk Anterine Ke Theater) */}
      {!hasStarted && needsPreGameModal && (
        <PlayerNameModal
          gameTitle={title}
          onConfirm={handleNameConfirm}
        />
      )}

      {/* 2. Top Controls Bar (Player Name Pill & Music Toggle) */}
      {hasStarted && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {playerName && needsPreGameModal && (
            <div
              style={{
                background: "rgba(18, 15, 13, 0.85)",
                border: "1px solid rgba(255, 107, 26, 0.4)",
                color: "#f5efe6",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 700,
                backdropFilter: "blur(8px)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <i className="bx bxs-user-circle" style={{ color: "var(--cv-orange, #ff6b1a)", fontSize: "16px" }} />
              <span>{playerName}</span>
            </div>
          )}

          {showMusicToggle && (
            <button
              onClick={toggleMusic}
              style={{
                background: "rgba(18, 15, 13, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "white",
                borderRadius: "8px",
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: "13px",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <i className={`bx ${musicOn ? "bx-volume-full" : "bx-volume-mute"}`} style={{ fontSize: "16px" }} />
              {musicOn ? "Music On" : "Music Off"}
            </button>
          )}
        </div>
      )}

      {/* 3. Game Iframe (Hanya dimuat jika sudah start) */}
      {hasStarted ? (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          onLoad={(e) => {
            const iframe = e.currentTarget;
            const resize = () => {
              try {
                const body = iframe.contentWindow?.document.body;
                const html = iframe.contentWindow?.document.documentElement;
                if (body && html) {
                  const contentHeight = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.scrollHeight,
                    html.offsetHeight
                  );
                  const available = getAvailableHeight();
                  iframe.style.height = Math.max(contentHeight, available) + "px";
                }
              } catch {}
            };
            setTimeout(resize, 300);
            setTimeout(resize, 800);
            setTimeout(resize, 1500);
            setTimeout(resize, 3000);
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--cv-text-dim, rgba(245, 239, 230, 0.6))",
            fontSize: "1rem",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <i className="bx bx-joystick" style={{ fontSize: "3rem", color: "var(--cv-orange, #ff6b1a)" }} />
          <span>Silakan masukkan nama untuk memulai permainan...</span>
        </div>
      )}

      {/* 4. Modal Hasil Game Over / Menang */}
      {gameOverResult && (
        <GameResultModal
          score={gameOverResult.score}
          gameSlug={slug}
          playerName={playerName || "Pemain"}
          deviceId={deviceId || "dev-player"}
          durationSeconds={gameOverResult.duration}
          onPlayAgain={handlePlayAgain}
          onViewLeaderboard={handleViewLeaderboard}
        />
      )}
    </div>
  );
}
