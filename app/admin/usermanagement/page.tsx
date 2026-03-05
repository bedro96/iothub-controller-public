"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useCsrf from "@/components/hooks/useCsrf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"

type User = {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

type EditForm = {
  username: string
  email: string
  password: string
}

export default function UserManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { ensureCsrf, fetchWithCsrf } = useCsrf()

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ username: "", email: "", password: "" })
  const [editError, setEditError] = useState("")
  const [editInfo, setEditInfo] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        credentials: "include",
      })

      if (response.status === 401 || response.status === 403) {
        router.push("/login")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users")
      }

      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // ensure CSRF token ready for subsequent POST/PATCH/DELETE requests
    ;(async () => {
      try {
        await ensureCsrf()
      } catch (e) {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      const response = await fetchWithCsrf(`/api/users?id=${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete user")
      }

      setUsers(users.filter((user) => user.id !== userId))
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin"

    try {
      await ensureCsrf()
      const response = await fetchWithCsrf("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update user")
      }

      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({ username: user.username, email: user.email, password: "" })
    setEditError("")
    setEditInfo("")
  }

  const handleEditSave = async () => {
    if (!editingUser) return

    setEditError("")
    setEditInfo("")
    setEditSaving(true)

    try {
      await ensureCsrf()

      const body: Record<string, string> = { id: editingUser.id }
      if (editForm.username.trim() !== editingUser.username) {
        body.username = editForm.username.trim()
      }
      if (editForm.email.trim() !== editingUser.email) {
        body.email = editForm.email.trim()
      }
      if (editForm.password) {
        body.password = editForm.password
      }

      if (Object.keys(body).length === 1) {
        // No changes were made
        setEditInfo("No changes detected.")
        return
      }

      const response = await fetchWithCsrf("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user")
      }

      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, username: data.user.username, email: data.user.email }
            : u
        )
      )
      setEditingUser(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell
                      className="font-medium cursor-pointer hover:underline"
                      onClick={() => openEditDialog(user)}
                    >
                      {user.username}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer hover:underline"
                      onClick={() => openEditDialog(user)}
                    >
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRole(user.id, user.role)}
                      >
                        {user.role}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {editError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {editError}
              </div>
            )}
            {editInfo && (
              <div className="p-3 text-sm text-muted-foreground bg-muted rounded-md">
                {editInfo}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
