"use client";
import { useState } from "react";
import styles from "./Learning.module.css";
const strings = [{number:6,name:"Low E",note:"E2"},{number:5,name:"A",note:"A2"},{number:4,name:"D",note:"D3"},{number:3,name:"G",note:"G3"},{number:2,name:"B",note:"B3"},{number:1,name:"High E",note:"E4"}];
export function StringGuide({ canHide = false }: { canHide?: boolean }) {
  const [hidden, setHidden] = useState(false);
  return <section className={styles.stringGuide} aria-label="Standard guitar tuning">
    <h3>Your six open strings</h3><p className={styles.small}>From the thickest string to the thinnest. Open means no fret is pressed. Standard tuning uses A4 = 440 Hz.</p>
    {canHide && <button className={styles.secondary} onClick={() => setHidden(!hidden)} aria-expanded={!hidden} aria-controls="open-string-guide">{hidden ? "Show string names" : "Hide names for your check"}</button>}
    <div id="open-string-guide" hidden={hidden}><table className={styles.stringTable}><thead><tr><th scope="col">String</th><th scope="col">Name</th><th scope="col">Pitch</th></tr></thead><tbody>{strings.map(string => <tr key={string.number}><th scope="row">{string.number}</th><td>{string.name}</td><td>{string.note}</td></tr>)}</tbody></table></div>
    <p className={styles.small}>Complete the tuning preparation above before this check. A pitch match applies only to the selected note; listen separately for extra ringing or buzzing.</p>
  </section>;
}
