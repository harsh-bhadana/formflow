import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/db';
import Workspace from '@/src/models/Workspace';

export async function GET() {
  try {
    await dbConnect();
    // Attempt a simple operation on the database to verify full connectivity
    await Workspace.findOne({});
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
