"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { LogOut, LayoutDashboard, RefreshCw } from "lucide-react"

interface AdminNavProps {
  title: string
  onRefresh?: () => void
}

export function AdminNav({ title, onRefresh }: AdminNavProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json().then((data) => data.user?.email) : null))
      .then((email) => setUserEmail(email ?? null))
      .catch((err) => console.error("Failed to fetch user session:", err))
  }, [])

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      if (res.ok) {
        router.push("/")
      }
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="gap-2 font-semibold px-2">
              <Link href="/admin">
                <LayoutDashboard className="h-5 w-5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
            {title && (
              <>
                <span className="text-muted-foreground text-sm">/</span>
                <span className="font-medium text-sm">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {userEmail}
              </span>
            )}
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            )}
            <ModeToggle />
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
