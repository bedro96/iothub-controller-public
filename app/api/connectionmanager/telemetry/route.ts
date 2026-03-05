import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from 'console';
import { logInfo } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth';


/**
 * GET /api/telemetry
 *
 * Returns the most recent Device-to-Cloud (D2C) telemetry records saved by
 * the IoT Hub consumer. Optionally filter by deviceId and control the result
 * count with the `limit` query parameter (default 50, max 200).
 */
export async function GET(
    request: NextRequest,
    ) {
    try {
        
        const { searchParams } = new URL(request.url);
        const limit = Math.min(
            parseInt(searchParams.get('limit') || '50', 10),
            200 );

        
        // Only return telemetry records that is unique by deviceId, to avoid returning too many records in case of high telemetry volume. The unique is determined by the latest record for each deviceId.
        const records = await prisma.telemetry.findMany({
            distinct: ['deviceId'],
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ telemetry: records });
    } catch (error) {
        console.error('Error fetching telemetry:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch telemetry' },
            { status: 500 }
        );
    }
}

export async function POST( request: NextRequest) {
    try {
        const session = await requireAdmin();
        if (!session) { return NextResponse.json({ error: "Not authenticated" }, { status: 401 })}
        const records = await prisma.telemetry.deleteMany({});
        console.log(`Deleted ${records.count} telemetry records.`);
        logInfo(`Deleted ${records.count} telemetry records.`);
        return NextResponse.json({ deleted: records.count });
    } catch (error) {
        console.error('Error deleting telemetry:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete telemetry',
                deleted: 0,
            },
            { status: 500 }
        );
    }
}