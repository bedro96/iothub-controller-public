"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import useCsrf from "@/components/hooks/useCsrf"

type User = {
  userId: string
  email: string
  role: string
} | null

type AuthContextValue = {
  user: User
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const { ensureCsrf } = useCsrf()
  const [user, setUser] = useState<User>(null)

  const fetchSession = useCallback(async () => {
    try {
      const resp = await fetch('/api/auth/me', { credentials: 'include' })
      if (!resp.ok) {
        setUser(null)
        return
      }
      const data = await resp.json()
      setUser(data?.user || null)
    } catch (e) {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    // ensure CSRF cookie then load session
    ensureCsrf().catch(() => {})
    fetchSession()
  }, [ensureCsrf, fetchSession])

  return (
    <AuthContext.Provider value={{ user, refresh: fetchSession }}>
      {children}
    </AuthContext.Provider>
  )
}
