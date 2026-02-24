import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logInfo } from "@/lib/logger"

/**
 * GET /api/monitoring/logs
 * Get recent logs
 */
export async function GET(request: NextRequest) {
    // const { ensureCsrf, fetchWithCsrf } = useCsrf()
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // await ensureCsrf()
        // const statsResponse = await fetchWithCsrf("/api/monitoring", {
        //     method: "POST",
        //     headers: { 'Content-Type': 'application/json' },
        // })

        // Prisma DeviceId query to findout how many records that have deviceId not null.
        const responsedeviceId = await prisma.deviceId.findFirst({
            where: { deviceUuid: null },
            orderBy: { deviceId : 'asc'},
            select: { deviceId: true },
        })
        
        logInfo(`DeviceId entries with deviceUuid is null: ${responsedeviceId?.deviceId}`)
        console.log(`DeviceId entries with deviceUuid is null: ${responsedeviceId?.deviceId}`)
        
        return NextResponse.json({ message: "DeviceId entries with deviceUuid is null", deviceId: responsedeviceId?.deviceId }, { status: 200 })
    } catch (error) {
        console.error("Get deviceId from database error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
