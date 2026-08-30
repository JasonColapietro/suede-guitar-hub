/* The X/Twitter card is the same 1200x630 artwork as the Open Graph card, so
   it re-exports that route rather than keeping a second copy of the design.
   Duplicating the JSX would let the two cards drift apart silently the next
   time the artwork is edited.

   `alt` is redeclared rather than re-exported because it is the one field
   worth being able to word differently per network. */
export { default, size, contentType } from "./opengraph-image";

export const alt = "GuitarHub — prove one guitar breakthrough in 30 days.";
