import { Suspense } from "react";
import SetupPageClient from "./SetupPageClient";

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupPageClient />
    </Suspense>
  );
}
