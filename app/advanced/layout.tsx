import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import styles from "@/components/learning/Learning.module.css";

export default function AdvancedLayout({ children }: { children: React.ReactNode }) {
  return <><SiteNav /><main id="main-content" tabIndex={-1} className={styles.shell}>{children}</main><SiteFooter /></>;
}
