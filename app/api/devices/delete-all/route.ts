import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { connectionManager } from '@/lib/connection-manager';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get user email from header for authorization
    await requireAdmin();
    // Get all DeviceId entries
    const deviceIdEntries = await (prisma as any).deviceId.findMany();
    const deviceIds = deviceIdEntries.map((entry: any) => entry.deviceId);

    // Close all WebSocket connections
    for (const entry of deviceIdEntries) {
      if (entry.deviceUuid) {
        connectionManager.removeConnection(entry.deviceUuid);
      }
    }

    // Delete all DeviceId entries
    await prisma.deviceId.deleteMany({});

    return NextResponse.json({
      message: 'All devices deleted successfully',
      status: 'all devices deleted',
      deletedDeviceIds: deviceIds,
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting all devices:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete devices',
      },
      { status: 500 }
    );
  }
}
