import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import styles from "@/components/learning/Learning.module.css";
export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return <><a className={styles.skip} href="#learning-main">Skip to learning</a><SiteNav /><main id="learning-main" className={styles.shell}>{children}</main><SiteFooter /></>;
}
