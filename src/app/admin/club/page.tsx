import type { Metadata } from "next";

import { ClubAdminView } from "@/components/admin/ClubAdminView";

export const metadata: Metadata = { title: "Build Club" };

export default function Page() {
  return <ClubAdminView />;
}
