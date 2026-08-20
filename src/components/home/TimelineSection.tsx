/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect } from "react";
import styles from "./TimelineSection.module.css";

interface TimelineEvent {
  id: string;
  year: string;
  date_label: string;
  title: string;
  description: string;
  image_url: string | null;
}

interface TimelineData {
  years: string[];
  events: TimelineEvent[];
}

function groupByYear(events: TimelineEvent[]) {
  const groups: { year: string; events: TimelineEvent[] }[] = [];
  let current: { year: string; events: TimelineEvent[] } | null = null;
  for (const ev of events) {
    if (!current || current.year !== ev.year) {
      current = { year: ev.year, events: [ev] };
      groups.push(current);
    } else {
      current.events.push(ev);
    }
  }
  return groups;
}

export default function TimelineSection() {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ image: "", date: "", title: "", desc: "" });

  const openModal = (image: string, date: string, title: string, desc: string) => {
    setModalData({ image, date, title, desc });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.events) {
          setTimelineData(json.data);
        } else {
          const events = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
          if (events.length > 0) {
            const years = Array.from(new Set(events.map((e: TimelineEvent) => e.year).filter(Boolean))) as string[];
            setTimelineData({ years, events });
          } else {
            setTimelineData({ years: [], events: [] });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className="badge"><i className="bx bx-history" /> Journey</div>
            <h2 className="sectionTitle">Timeline <span className="textGold">Erine</span></h2>
          </div>
          <div style={{ color: "var(--gold)", padding: "2rem", textAlign: "center" }}>
            <i className="bx bx-loader-alt bx-spin" /> Memuat timeline...
          </div>
        </div>
      </section>
    );
  }

  if (!timelineData || timelineData.events.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className="badge"><i className="bx bx-history" /> Journey</div>
            <h2 className="sectionTitle">Timeline <span className="textGold">Erine</span></h2>
          </div>
          <div style={{ color: "var(--gold)", padding: "2rem", textAlign: "center" }}>
            <i className="bx bx-calendar-x" /> Belum ada data timeline.
          </div>
        </div>
      </section>
    );
  }

  const yearGroups = groupByYear(timelineData.events).reverse().map((group) => ({
    ...group,
    events: [...group.events].reverse(),
  }));

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className="badge"><i className="bx bx-history" /> Journey</div>
          <h2 className="sectionTitle">Timeline <span className="textGold">Erine</span></h2>
        </div>

        {yearGroups.map((group) => (
          <div key={group.year} className={styles.yearSection}>
            <div className={styles.yearHeader}>
              <span className={styles.yearBadge}>{group.year}</span>
              <div className={styles.yearLine} />
            </div>

            <div className={styles.timeline}>
              {group.events.map((event) => (
                <div key={event.id} className={styles.item}>
                  <div className={styles.dot} />
                  <div className={styles.content}>
                    <div className={styles.cardInner}>
                      <div
                        className={styles.imgPlaceholder}
                        style={{ cursor: event.image_url ? "pointer" : "default" }}
                        onClick={() => event.image_url && openModal(event.image_url, event.date_label, event.title, event.description)}
                      >
                        {event.image_url ? (
                          <img src={event.image_url} alt={event.title} />
                        ) : (
                          <div className={styles.noImg}>
                            <i className="bx bx-image" />
                          </div>
                        )}
                      </div>
                      <div className={styles.textSide}>
                        <div className={styles.date}>{event.date_label}</div>
                        <h3 className={styles.title}>{event.title}</h3>
                        <p className={styles.desc}>{event.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div
          className={`${styles.modalOverlay} ${styles.active}`}
          onClick={() => setIsModalOpen(false)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
            <div className={styles.modalImgWrapper}>
              <img src={modalData.image} alt={modalData.title} />
            </div>
            <div className={styles.modalDetails}>
              <span className={styles.modalDate}>{modalData.date}</span>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "10px", color: "var(--primary)" }}>{modalData.title}</h3>
              <p className={styles.modalDesc}>{modalData.desc}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
