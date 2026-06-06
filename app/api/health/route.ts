import { NextResponse } from 'next/server';
import { dbConnect } from '@/src/lib/db';
import Workspace from '@/src/models/Workspace';

export async function GET() {
  try {
    // Attempt Mongoose database connection
    await dbConnect();
    
    // Verify connection is active by making a read request
    await Workspace.findOne({});

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Health check database failure:", error);
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
