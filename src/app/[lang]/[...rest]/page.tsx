import { notFound } from "next/navigation";

// Any URL under a locale that matches no other route lands here, so unmatched addresses
// render the localized not-found page inside the normal layout instead of Next's default.
export default function UnmatchedRoute() {
  notFound();
}
