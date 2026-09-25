import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import styles from "@/components/learning/Learning.module.css";

export default function AdvancedLayout({ children }: { children: React.ReactNode }) {
  return <><a className={styles.skip} href="#advanced-main">Skip to the lab</a><SiteNav /><main id="advanced-main" className={styles.shell}>{children}</main><SiteFooter /></>;
}
