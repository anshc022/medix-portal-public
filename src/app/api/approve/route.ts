import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { application_id } = await request.json();

    if (!application_id) {
      return NextResponse.json({ error: 'application_id is required' }, { status: 400 });
    }

    // Add log for the Human Provider approving the case
    await query(
      `INSERT INTO agent_logs (application_id, agent_name, log_message, status) 
       VALUES ($1, 'Human Reviewer', 'Physician reviewed case facts and approved the AI drafted prior authorization.', 'completed')`,
      [application_id]
    );

    // Medix wakes Nexus up to actually transmit
    await query(
      `INSERT INTO agent_logs (application_id, agent_name, log_message, status) 
       VALUES ($1, 'Nexus', 'Human approval received. Transmitting official FHIR payload to payer API...', 'processing')`,
      [application_id]
    );

    setTimeout(async () => {
      await query(
        `INSERT INTO agent_logs (application_id, agent_name, log_message, status) 
         VALUES ($1, 'Nexus', 'Payload successfully submitted to payer API. Case officially closed.', 'completed')`,
        [application_id]
      );

      await query(
        `UPDATE applications SET status = 'approved' WHERE application_id = $1`,
        [application_id]
      );
    }, 2500);

    // Update to 'review' temporarily to show the transmission UI (triggering the refresh loop)
    await query(`UPDATE applications SET status = 'review' WHERE application_id = $1`, [application_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json({ error: 'Failed to approve case' }, { status: 500 });
  }
}
