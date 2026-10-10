// next/image is CommonJS with the component on `.default`, and Node's ESM
// interop hands an importer the whole exports object instead. The render hooks
// point `next/image` here so components using it render in structural tests.
import image from "next/image.js";

export default image.default ?? image;
export const getImageProps = image.getImageProps;
