"use client";

import React from "react";
import type { Metadata } from "next";
import styles from "./page.module.css";

export default function MerchandisePage() {
  return (
    <div className={styles.page}>
      <iframe
        src="https://st.oshigo.web.id/cava/shop"
        title="Cavallery Shop"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
          display: "block",
        }}
        allow="clipboard-write; fullscreen"
      />
    </div>
  );
}
