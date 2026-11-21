import styles from "./ScheduleSkeletons.module.css";

export function SpotlightCardSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.leftStack}>
        <div className={styles.barChip} />
        <div className={styles.barTitle} />
        <div className={styles.barLocation} />
        <div className={styles.barAvatars} />
      </div>
      <div className={styles.rightBox} />
    </div>
  );
}

export function TimelineSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <SpotlightCardSkeleton key={i} />
      ))}
    </div>
  );
}
