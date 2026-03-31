import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { application_id, additional_info } = await request.json();

    if (!application_id) {
      return NextResponse.json({ error: 'application_id is required' }, { status: 400 });
    }

    // Update application status to review to simulate re-processing
    await query(
      `UPDATE applications 
       SET status = 'review', 
           clinical_notes = CONCAT(clinical_notes, '\n\n[FOLLOW UP INFO]: ', $2::text) 
       WHERE application_id = $1`,
      [application_id, additional_info || 'Uploaded document']
    );

    // Add log for the Provider submitting info
    await query(
      `INSERT INTO agent_logs (application_id, agent_name, log_message, status) 
       VALUES ($1, 'Provider', 'Submitted additional medical information/documents.', 'completed')`,
      [application_id]
    );

    // Simulate Medix Orchestrator and Veritas waking back up
    await query(
      `INSERT INTO agent_logs (application_id, agent_name, log_message, status) 
       VALUES ($1, 'Medix', 'Received new information. Waking Veritas for re-evaluation...', 'processing')`,
      [application_id]
    );

    // After a delay, approve the case based on the new info
    setTimeout(async () => {
      await query(
        `INSERT INTO agent_logs (application_id, agent_name, log_message, status) 
         VALUES ($1, 'Veritas', 'Re-evaluated clinical facts including new follow-up data against policy. Final Assessment: APPROVED.', 'completed')`,
        [application_id]
      );
      
      await query(
        `INSERT INTO agent_logs (application_id, agent_name, log_message, status) 
         VALUES ($1, 'Nexus', 'Formatting approved case into FHIR JSON authorization bundle for submission.', 'completed')`,
        [application_id]
      );

      await query(
        `UPDATE applications SET status = 'approved' WHERE application_id = $1`,
        [application_id]
      );
    }, 4000);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Follow-up error:', error);
    return NextResponse.json({ error: 'Failed to process follow up' }, { status: 500 });
  }
}
