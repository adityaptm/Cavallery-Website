"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./PlayerNameModal.module.css";
import { validatePlayerName } from "@/lib/validatePlayerName";

interface PlayerNameModalProps {
  gameTitle?: string;
  onConfirm: (name: string, deviceId: string) => void;
}

export const STORAGE_KEY_NAME = "cava_player_name";
export const STORAGE_KEY_DEVICE = "cava_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "browser-device";
  let devId = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!devId) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      devId = crypto.randomUUID();
    } else {
      devId = "dev-" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    }
    localStorage.setItem(STORAGE_KEY_DEVICE, devId);
  }
  return devId;
}

export default function PlayerNameModal({
  gameTitle = "Anterine Ke Theater",
  onConfirm,
}: PlayerNameModalProps) {
  const [existingName, setExistingName] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_NAME) || "";
      if (saved.trim()) {
        setExistingName(saved.trim());
        setNameInput(saved.trim());
      } else {
        setIsEditing(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validation = validatePlayerName(nameInput);
    if (!validation.valid) {
      setErrorMsg(validation.error || "Nama tidak valid.");
      return;
    }

    const clean = validation.cleanName;
    const deviceId = getOrCreateDeviceId();
    localStorage.setItem(STORAGE_KEY_NAME, clean);
    setExistingName(clean);
    setIsEditing(false);
    onConfirm(clean, deviceId);
  };

  const handleStartExisting = () => {
    const deviceId = getOrCreateDeviceId();
    onConfirm(existingName, deviceId);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.iconWrapper}>
          <i className="bx bx-joystick" />
        </div>

        <h2 className={styles.title}>{gameTitle}</h2>

        {existingName && !isEditing ? (
          <div>
            <div className={styles.greetingBox}>
              <span style={{ fontSize: "0.85rem", color: "var(--cv-text-dim)" }}>
                Pemain Terdaftar:
              </span>
              <div className={styles.playerNameDisplay}>
                Halo, {existingName}!
              </div>
            </div>

            <p className={styles.subtitle}>
              Skor kamu akan otomatis dicatat di Leaderboard resmi Cavallery.
            </p>

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleStartExisting}
            >
              <span>Mulai Main Sekarang</span>
              <i className="bx bx-right-arrow-alt" style={{ fontSize: "1.3rem" }} />
            </button>

            <div>
              <button
                type="button"
                className={styles.changeNameBtn}
                onClick={() => setIsEditing(true)}
              >
                <i className="bx bx-edit-alt" /> Ganti nama panggilan
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className={styles.subtitle}>
              Masukkan nama panggilanmu untuk mencatat skor terbaik di papan peringkat.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label htmlFor="playerNameInput" className={styles.label}>
                Nama Panggilan
              </label>

              <div className={styles.inputWrapper}>
                <input
                  id="playerNameInput"
                  ref={inputRef}
                  type="text"
                  maxLength={20}
                  className={styles.input}
                  placeholder="Contoh: ErineFans_99"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                />
                <span className={styles.charCount}>
                  {nameInput.length}/20
                </span>
              </div>

              {errorMsg && (
                <div className={styles.errorText}>
                  <i className="bx bx-error-circle" /> {errorMsg}
                </div>
              )}

              <button type="submit" className={styles.primaryBtn} style={{ marginTop: "12px" }}>
                <span>Simpan & Mainkan Game</span>
                <i className="bx bx-play-circle" style={{ fontSize: "1.3rem" }} />
              </button>

              {existingName && (
                <button
                  type="button"
                  className={styles.changeNameBtn}
                  onClick={() => setIsEditing(false)}
                  style={{ alignSelf: "center", marginTop: "8px" }}
                >
                  Batal, gunakan nama "{existingName}"
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
