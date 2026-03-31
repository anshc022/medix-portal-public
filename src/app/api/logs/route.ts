import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('application_id');

  try {
    let result;
    if (appId) {
      result = await query('SELECT * FROM agent_logs WHERE application_id = $1 ORDER BY created_at ASC', [appId]);
    } else {
      result = await query('SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT 100');
    }
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { application_id, agent_name, status, log_message } = body;

    // Initialize DB if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id SERIAL PRIMARY KEY,
        application_id VARCHAR(50) REFERENCES applications(application_id),
        agent_name VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        log_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await query(
      `INSERT INTO agent_logs (application_id, agent_name, status, log_message) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [application_id, agent_name, status, log_message]
    );

    return NextResponse.json({ success: true, log: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to insert log' }, { status: 500 });
  }
}
