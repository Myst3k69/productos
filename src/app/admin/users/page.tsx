import type { Metadata } from "next";

import { UsersView } from "@/components/admin/UsersView";

export const metadata: Metadata = { title: "Utilisateurs" };

export default function Page() {
  return <UsersView />;
}
