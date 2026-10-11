/// <reference types="vite/client" />

import type { ListingApi } from "../../preload";

declare global {
  interface Window {
    listingApi: ListingApi;
  }
}
