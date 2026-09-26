import type { Metadata } from "next";

import { JournalView } from "@/components/admin/JournalView";

export const metadata: Metadata = { title: "Journal" };

export default function Page() {
  return <JournalView />;
}
