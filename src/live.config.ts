import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

// Single live collection backing all EmDash content types.
// getEmDashEntry()/getEmDashCollection() query this under the hood (key "_emdash").
export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
