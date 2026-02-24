import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { connectionManager } from '@/lib/connection-manager';
import { MessageEnvelope } from '@/lib/message-envelope';
import { getSession, requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Create command record
    const deviceCommand = await prisma.deviceCommand.create({
      data: {
        command: action,
        payload: payload || {},
        broadcast: true,
        status: 'sent',
      },
    });

    // Create MessageEnvelope for broadcast
    const envelope = new MessageEnvelope({
      version: 1,
      type: 'command',
      action: action,
      payload: payload || {},
      status: 'pending',
      meta: {
        commandId: deviceCommand.id,
        timestamp: new Date().toISOString(),
      },
    });

    const sentCount = connectionManager.broadcast(envelope.toDict());

    return NextResponse.json({
      message: 'Command broadcast successfully',
      commandId: deviceCommand.id,
      sentCount: sentCount,
      totalConnections: connectionManager.getConnectionCount(),
    }, { status: 200 });

  } catch (error) {
    console.error('Error broadcasting command:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to broadcast command',
      },
      { status: 500 }
    );
  }
}
