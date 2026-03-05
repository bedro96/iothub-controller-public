"use client"

import { usePathname } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Admin Home",
  "/admin/usermanagement": "User Management",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? "Admin"

  return (
    <div className="min-h-screen bg-background">
      <AdminNav title={title} />
      {children}
    </div>
  )
}
