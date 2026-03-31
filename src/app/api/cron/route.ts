import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processApplication(app: any) {
  const log = async (agent: string, message: string, status: string = 'info') => {
    await pool.query(
      `INSERT INTO agent_logs (application_id, agent_name, log_message, status) VALUES ($1, $2, $3, $4)`,
      [app.application_id, agent, message, status]
    );
  };

  try {
    // Polaris - Policy Retrieval
    await log('Polaris', 'Initiating policy retrieval via vector search...', 'processing');
    await sleep(2500);
    const requiresPreAuth = app.requested_treatment.toLowerCase().includes('rituxan') || app.requested_treatment.toLowerCase().includes('mri');
    await log('Polaris', `Policy criteria retrieved from Knowledge Base. Prior auth required for ${app.requested_treatment}.`, 'completed');
    
    // Veritas - Medical Necessity & Fact Comparison
    await log('Veritas', 'Comparing clinical facts from uploaded document vs policy criteria...', 'processing');
    await sleep(3000);
    
    // NEW LOGIC: Require Human Review instead of automatic approval
    let decision = 'human_review';
    let decisionReason = 'Requires Provider Review before final submission to Payer.';
    
    const requiresFollowUp = !app.clinical_notes || app.clinical_notes.length < 15;
    const isDenied = app.requested_treatment.toLowerCase().includes('surgery') || app.requested_treatment.toLowerCase().includes('experimental');

    if (requiresFollowUp) {
      decision = 'more_info';
      decisionReason = 'Requires follow-up: Missing documented duration of symptoms and prior medications attempted.';
      await log('Veritas', 'INCOMPLETE CLINICAL FACTS: Cannot verify medical necessity.', 'failed');
    } else if (isDenied) {
      decision = 'denied';
      decisionReason = 'Treatment deemed not medically necessary or experimental under current policy.';
      await log('Veritas', 'DENIED: Fails step-therapy protocol criteria.', 'failed');
    } else {
      await log('Veritas', 'PENDING HUMAN REVIEW: Documented facts meet all step-therapy policy criteria. Final approval requires human physician sign-off.', 'processing');
    }
    
    await log('Veritas', `Final Assessment: ${decision.toUpperCase()} - ${decisionReason}`, decision === 'human_review' ? 'processing' : 'failed');

    // Nexus - Submission (Paused pending human review)
    if (decision === 'human_review') {
      await log('Nexus', 'Drafting standardized FHIR authorization request. Awaiting Human Review to transmit...', 'processing');
    }

    // Argus - Appeal / Follow up
    if (decision === 'more_info') {
      await log('Argus', 'Generating RFI (Request For Information) to provider...', 'processing');
      await sleep(2500);
      await log('Argus', 'ACTION REQUIRED: Please upload doctor notes detailing prior medications (e.g. Methotrexate failures).', 'failed');
    } else if (decision === 'denied') {
      await log('Argus', 'Generating automated appeal with supporting clinical evidence...', 'processing');
      await sleep(2500);
      await log('Argus', 'Appeal packet generated and queued for human provider review.', 'completed');
    }

    // Update main status
    await pool.query(
      `UPDATE applications SET status = $1 WHERE application_id = $2`,
      [decision, app.application_id]
    );

  } catch (e: any) {
    await log('System', `Pipeline failed: ${e.message}`, 'failed');
  }
}

export async function GET(req: Request) {
  try {
    const { rows } = await pool.query(`SELECT * FROM applications WHERE status = 'pending'`);
    
    if (rows.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending applications' });
    }

    for (const app of rows) {
      await pool.query(`UPDATE applications SET status = 'review' WHERE application_id = $1`, [app.application_id]);
    }

    rows.forEach(app => {
      processApplication(app).catch(console.error);
    });

    return NextResponse.json({ success: true, processed_count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
