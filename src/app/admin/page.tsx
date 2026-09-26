import type { Metadata } from "next";

import { AdminOverview } from "@/components/admin/AdminOverview";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default function Page() {
  return <AdminOverview />;
}
