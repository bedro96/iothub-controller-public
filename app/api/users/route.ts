import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { logAudit } from "@/lib/logger"
import { getRequestIP } from '@/lib/request'

export async function GET() {
  try {
    // Verify user is authenticated and is an admin
    await requireAdmin()

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        )
      }
    }
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated and is an admin
    const currentUser = await requireAdmin()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Prevent admin from deleting themselves
    if (currentUser.userId === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    const ip = getRequestIP(request)
    await logAudit('user.deleted', currentUser.userId, {
      deletedUserId: userId,
      ipAddress: ip,
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        )
      }
    }
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify user is authenticated and is an admin
    const currentUser = await requireAdmin()

    const { id, role, username, email, password } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Role-only update path
    if (role !== undefined && !username && !email && !password) {
      // Prevent admin from changing their own role
      if (currentUser.userId === id) {
        return NextResponse.json(
          { error: "Cannot modify your own role" },
          { status: 400 }
        )
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      const ip2 = getRequestIP(request)
      await logAudit('user.role_updated', currentUser.userId, {
        updatedUserId: id,
        newRole: role,
        ipAddress: ip2,
      })

      return NextResponse.json({ message: "User updated successfully", user })
    }

    // Profile update path (username, email, password)
    const updateData: Record<string, string> = {}

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length === 0) {
        return NextResponse.json({ error: "Invalid username" }, { status: 400 })
      }
      updateData.username = username.trim()
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 })
      }
      updateData.email = email.trim()
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        )
      }
      const bcrypt = await import('bcryptjs')
      updateData.password = await bcrypt.default.hash(password, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const ip3 = getRequestIP(request)
    await logAudit('user.profile_updated', currentUser.userId, {
      updatedUserId: id,
      updatedFields: Object.keys(updateData).filter(k => k !== 'password'),
      ipAddress: ip3,
    })

    return NextResponse.json({ message: "User updated successfully", user })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        )
      }
    }
    console.error("Update user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
