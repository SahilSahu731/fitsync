import Link from "next/link";
import { PublicShell } from "@/components/shell";
import { Icon } from "@/components/icon";
import styles from "./home.module.css";

const features = [
  ["dumbbell", "Train with purpose", "Find your plan. Make every session count."],
  ["chart", "See your momentum", "Bring your activity and progress into focus."],
  ["people", "Make it personal", "Your goals, your pace, your way forward."],
];

function TrainingPreview() {
  return <div className={styles.preview} aria-label="Example FitSync training dashboard">
    <div className={styles.previewTop}><span className={styles.status}><span /> TRAINING, IN SYNC</span><span>APP PREVIEW</span></div>
    <div className={styles.previewHeading}><div><p>Your next chapter</p><h2>Stronger every week.</h2></div><span className="icon-tile"><Icon name="dumbbell" size={26} /></span></div>
    <div className={styles.session}><div><span className={styles.smallLabel}>EXAMPLE SESSION</span><h3>Full body foundations</h3><p><Icon name="clock" size={14} /> 35 min <span>·</span> Strength</p></div><Link href="/programs" aria-label="Explore training programs"><Icon name="arrow" size={22} /></Link></div>
    <div className={styles.progressRow}><div><span className={styles.smallLabel}>WEEKLY MOMENTUM</span><p><strong>3<span> / 4</span></strong> sessions</p></div><span className={styles.progressBadge}><Icon name="chart" size={15} /> Keep building</span></div>
    <div className={styles.progressTrack}><span /></div>
    <div className={styles.week}>{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <div key={i}><span>{day}</span><b className={i === 0 || i === 2 || i === 4 ? styles.done : ""}>{i === 0 || i === 2 || i === 4 ? <Icon name="check" size={15} /> : "·"}</b></div>)}</div>
    <div className={styles.previewNote}><Icon name="check" size={16} /><p>One account. A connected fitness journey.</p></div>
  </div>;
}

export default function Home() {
  return <PublicShell><main id="main" className={styles.home}>
    <section className={`container ${styles.hero}`}>
      <div className={styles.copy}><p className={styles.eyebrow}><span /> A LITTLE PROGRESS. EVERY DAY.</p><h1>Find your rhythm.<br /><span>Grow stronger.</span></h1><p className={styles.description}>Training, tracking, and progress in one place. Build routines that fit your life and keep moving toward what matters to you.</p><div className="button-row"><Link href="/register" className="button">Start your journey <Icon name="arrow" size={18} /></Link><Link href="/programs" className="button secondary">Explore training plans</Link></div><p className={styles.footnote}><Icon name="check" size={15} /> Free to get started · Web and mobile, in sync</p></div>
      <TrainingPreview />
      <div className={styles.features}>{features.map(([icon, title, text], index) => <div key={title}><span className={styles.featureNumber}>0{index + 1}</span><span className="icon-tile"><Icon name={icon} /></span><div><h2>{title}</h2><p>{text}</p></div></div>)}</div>
    </section>
    <section className={styles.foundation}><div className={`container ${styles.split}`}><div><p className="eyebrow">A stronger foundation</p><h2>Good movement.<br /><span>Great possibilities.</span></h2><p>Find exercises for your muscles, equipment, and experience. Clear instructions and demonstrations help you make every rep count.</p><Link href="/exercises" className="text-link">Find your next exercise <Icon name="arrow" size={18} /></Link></div><div className={styles.steps}>{[["01", "Find your focus", "Explore by muscle group and training style.", "filter"], ["02", "Learn the technique", "Follow clear steps, tips, and demonstrations.", "book"], ["03", "Make it your own", "Save a routine or program, then train in the mobile app.", "user"]].map(([n, title, description, icon]) => <div key={n}><span>{n}</span><div><h3>{title}</h3><p>{description}</p></div><Icon name={icon} size={22} /></div>)}</div></div></section>
    <section className={`container ${styles.cta}`}><span className="icon-tile"><Icon name="dumbbell" size={28} /></span><p className="eyebrow">Make your next move</p><h2>Big changes start<br />with one small rep.</h2><p>Bring your goals, your experience, and your ambition.<br />We’ll keep them in sync.</p><Link href="/register" className="button">Get started with FitSync <Icon name="arrow" size={18} /></Link></section>
  </main></PublicShell>;
}
