import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import styles from "@/components/learning/Learning.module.css";
import { LearningAccessProvider } from "@/components/learning/LearningAccessProvider";
import { getVerifiedLearningAccess } from "@/lib/learning-auth/access";
export default async function LearningLayout({ children }: { children: React.ReactNode }) {
  const access = await getVerifiedLearningAccess();
  return <LearningAccessProvider key={access.accountId ?? "guest"} access={access}><a className={styles.skip} href="#learning-main">Skip to learning</a><SiteNav /><main id="learning-main" className={styles.shell}>{children}</main><SiteFooter /></LearningAccessProvider>;
}
