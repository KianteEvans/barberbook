import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { tryGetIdentity } from "@/auth/session";
import { AdminTabs } from "./AdminTabs";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const identity = await tryGetIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (identity.role !== "admin") redirect("/");

  return (
    <div>
      <AdminTabs />
      {children}
    </div>
  );
}
