import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const MEDIX_WEBHOOK_URL = process.env.MEDIX_WEBHOOK_URL;

export async function GET() {
  try {
    const result = await query('SELECT * FROM applications ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const applicationId = `PA-${uuidv4().substring(0, 12).toUpperCase()}`;

    // Initialize DB if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        application_id VARCHAR(50) UNIQUE NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        patient_age INTEGER,
        patient_gender VARCHAR(20),
        diagnosis_code VARCHAR(20),
        diagnosis_description TEXT,
        requested_treatment TEXT NOT NULL,
        insurance_payer VARCHAR(255),
        provider_name VARCHAR(255),
        clinical_notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        agent_rationale TEXT,
        fhir_bundle JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert into database
    await query(
      `INSERT INTO applications (
        application_id, patient_name, patient_age, patient_gender,
        diagnosis_code, diagnosis_description, requested_treatment,
        insurance_payer, provider_name, clinical_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        applicationId,
        body.patient_name,
        body.patient_age,
        body.patient_gender,
        body.diagnosis_code,
        body.diagnosis_description,
        body.requested_treatment,
        body.insurance_payer,
        body.provider_name,
        body.clinical_notes
      ]
    );

    // Trigger Medix Agent Webhook (Asynchronously so UI doesn't block)
    if (MEDIX_WEBHOOK_URL) {
      fetch(MEDIX_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'new_prior_auth',
          application_id: applicationId,
          case_data: body
        })
      }).catch(err => console.error('Failed to trigger Medix webhook:', err));
    }

    return NextResponse.json({ success: true, application_id: applicationId });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');

    if (!applicationId) {
      return NextResponse.json({ error: 'application_id is required' }, { status: 400 });
    }

    // Delete logs first to avoid foreign key constraints (if any were added)
    await query('DELETE FROM agent_logs WHERE application_id = $1', [applicationId]);
    
    // Delete the application
    await query('DELETE FROM applications WHERE application_id = $1', [applicationId]);

    return NextResponse.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Database delete error:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
