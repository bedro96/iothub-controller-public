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
  { params }: { params: Promise<{ deviceId: string }> }) {
    try {

      const { deviceId } = await params;
      const { searchParams } = new URL(request.url);
      const limit = Math.min(
        parseInt(searchParams.get('limit') || '50', 10),
        200
      );

      const where = deviceId ? { deviceId } : {};
      const records = await prisma.telemetry.findMany({
        where,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }) {
    try {
      const session = await requireAdmin();
      if (!session) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
      }

      const { deviceId } = await params;
      const body = await request.json();
      
      if ( !deviceId ) {
        return NextResponse.json(
          { error: 'deviceId is required in the URL path' },
          { status: 400 }
        );
      }
      const records = await prisma.telemetry.deleteMany({
        where: { deviceId },
      });
      console.log(`Deleted ${records.count} telemetry records for deviceId: ${deviceId}`);
      logInfo(`Deleted ${records.count} telemetry records for deviceId: ${deviceId}`);
      return NextResponse.json({ deleted: records.count });
    } catch (error) {
      console.error('Error deleting telemetry:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to delete telemetry' },
        { status: 500 }
      );
    }
}