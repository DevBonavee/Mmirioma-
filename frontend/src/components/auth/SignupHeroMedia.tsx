"use client";

/**
 * SignupHeroMedia — the left half of the MmiriOma sign-in / sign-up screen.
 *
 * - Plays the cleaned water-supply video (no burned-in text).
 * - Picks the 9:16 cut for portrait containers (the half-screen panel, phones)
 *   and the 16:9 cut for wide containers (tablet landscape, full-width hero).
 * - All copy is live HTML with motion graphics, so it stays crisp, editable
 *   and accessible. A Collect → Clean → Store → Deliver ticker is synced to
 *   the video's own timeline.
 * - Respects prefers-reduced-motion (video paused on its poster, no animation).
 *
 * Usage (inside the existing two-column auth layout):
 *   <div className="grid min-h-dvh lg:grid-cols-2">
 *     <SignupHeroMedia className="hidden lg:block" />
 *     <section>…existing form…</section>
 *   </div>
 */

import { useEffect, useRef, useState } from "react";
import styles from "./SignupHeroMedia.module.css";

type Step = { label: string; at: number };

// Seconds into the clip where each stage appears on screen.
const STEPS: Step[] = [
  { label: "Collect", at: 0.4 },
  { label: "Clean", at: 1.0 },
  { label: "Store", at: 3.1 },
  { label: "Deliver", at: 4.9 },
];

const SOURCES = {
  portrait: {
    webm: "/media/mmirioma-signup-9x16.webm",
    mp4: "/media/mmirioma-signup-9x16.mp4",
    poster: "/media/mmirioma-signup-9x16-poster.jpg",
  },
  landscape: {
    webm: "/media/mmirioma-signup-16x9.webm",
    mp4: "/media/mmirioma-signup-16x9.mp4",
    poster: "/media/mmirioma-signup-16x9-poster.jpg",
  },
} as const;

type Props = {
  className?: string;
  eyebrow?: string;
  headline?: [string, string]; // two lines
  accentWord?: string; // word in the headline that gets the water shimmer
  subline?: string;
};

export default function SignupHeroMedia({
  className = "",
  eyebrow = "MmiriOma Water Delivery",
  headline = ["Water at your gate,", "without the stress."],
  accentWord = "stress.",
  subline = "Order water and track your delivery, all in one place.",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Choose the cut that fits the container's shape.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return; // absent in jsdom (tests)
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!height) return;
      setOrientation(width / height > 1.15 ? "landscape" : "portrait");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reduced motion: hold on the poster.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)"); // absent in jsdom (tests)
    if (!mq) return;
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Reload when the source set changes, then play.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    // Promise.resolve: older engines and jsdom return nothing from play().
    if (!reduced) Promise.resolve(v.play()).catch(() => {});
  }, [orientation, reduced]);

  // Sync the stage ticker with the video timeline.
  useEffect(() => {
    if (reduced) return; // the render below shows the finished state
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && v.duration) {
        const t = v.currentTime;
        let i = 0;
        for (let s = 0; s < STEPS.length; s++) if (t >= STEPS[s].at) i = s;
        setActive(i);
        setProgress(Math.min(1, t / v.duration));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const src = SOURCES[orientation];
  // Reduced motion: no ticker animation, show every stage as done.
  const shownActive = reduced ? STEPS.length - 1 : active;
  const shownProgress = reduced ? 1 : progress;
  let wordIndex = 0;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${reduced ? styles.reduced : ""} ${className}`}
      data-orientation={orientation}
    >
      <video
        key={orientation}
        ref={videoRef}
        className={styles.video}
        poster={src.poster}
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={src.webm} type="video/webm" />
        <source src={src.mp4} type="video/mp4" />
      </video>

      {/* Depth: top veil for the logo bar, bottom navy for the copy, light sweep */}
      <div className={styles.veilTop} aria-hidden="true" />
      <div className={styles.veilBottom} aria-hidden="true" />
      <div className={styles.sheen} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowLine} aria-hidden="true" />
          <span className={styles.eyebrowText}>{eyebrow}</span>
        </p>

        <h2 className={styles.headline} aria-label={headline.join(" ")}>
          {headline.map((line, li) => (
            <span key={li} className={styles.line} aria-hidden="true">
              {line.split(" ").map((word) => {
                const i = wordIndex++;
                const isAccent = word === accentWord;
                return (
                  <span key={`${li}-${word}`} className={styles.wordMask}>
                    <span
                      className={`${styles.word} ${isAccent ? styles.accent : ""}`}
                      style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                    >
                      {word}
                    </span>
                  </span>
                );
              })}
            </span>
          ))}
        </h2>

        <p className={styles.subline}>{subline}</p>

        <ol className={styles.stages} aria-label="How MmiriOma gets water to you">
          {STEPS.map((s, i) => (
            <li
              key={s.label}
              className={`${styles.stage} ${i === shownActive ? styles.stageActive : ""} ${
                i < shownActive ? styles.stageDone : ""
              }`}
              aria-current={i === shownActive ? "step" : undefined}
            >
              <span className={styles.stageDot} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ol>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.fill} style={{ transform: `scaleX(${shownProgress})` }} />
        </div>
      </div>
    </div>
  );
}
