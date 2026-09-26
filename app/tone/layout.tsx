import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import styles from "@/components/learning/Learning.module.css";

export default function ToneLayout({ children }: { children: React.ReactNode }) {
  return <><a className={styles.skip} href="#tone-main">Skip to the course</a><SiteNav /><main id="tone-main" className={styles.shell}>{children}</main><SiteFooter /></>;
}
