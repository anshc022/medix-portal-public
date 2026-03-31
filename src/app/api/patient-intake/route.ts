import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    let icdCode = 'R68.89'; 
    let diagnosis = body.symptoms || 'General medical condition';
    
    const textToAnalyze = (body.symptoms + " " + body.treatment).toLowerCase();
    
    if (textToAnalyze.includes('arthritis') || textToAnalyze.includes('joint') || textToAnalyze.includes('pain')) {
       icdCode = 'M06.9';
       diagnosis = 'Rheumatoid arthritis, unspecified';
    } else if (textToAnalyze.includes('diabetes') || textToAnalyze.includes('sugar')) {
       icdCode = 'E11.9';
       diagnosis = 'Type 2 diabetes mellitus without complications';
    } else if (textToAnalyze.includes('heart') || textToAnalyze.includes('blood pressure') || textToAnalyze.includes('bp')) {
       icdCode = 'I10';
       diagnosis = 'Essential (primary) hypertension';
    } else if (textToAnalyze.includes('cancer') || textToAnalyze.includes('tumor') || textToAnalyze.includes('chemo')) {
       icdCode = 'C80.1';
       diagnosis = 'Malignant (primary) neoplasm, unspecified';
    } else if (textToAnalyze.includes('asthma') || textToAnalyze.includes('breathing') || textToAnalyze.includes('lungs')) {
       icdCode = 'J45.909';
       diagnosis = 'Unspecified asthma, uncomplicated';
    }

    const appId = 'APP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const query = `
      INSERT INTO applications 
      (application_id, patient_name, patient_age, insurance_payer, diagnosis_code, diagnosis_description, requested_treatment, clinical_notes, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *
    `;
    
    const clinicalNotes = `Patient self-reported symptoms: "${body.symptoms}". Medix AI Auto-translation applied.`;
    
    const values = [
      appId, 
      body.patient_name, 
      parseInt(body.patient_age) || 0, 
      body.insurance_payer, 
      icdCode, 
      diagnosis, 
      body.treatment || 'Pending Doctor Verification', 
      clinicalNotes
    ];

    await pool.query(query, values);
    
    // If prevent_cron is true (like in Step 1 of the UI), don't trigger the agents yet!
    if (!body.prevent_cron) {
      try {
        fetch('http://localhost:3000/api/cron').catch(e => console.error(e));
      } catch (e) {}
    }
    
    return NextResponse.json({ 
        success: true, 
        application_id: appId, 
        assigned_icd: icdCode,
        medical_term: diagnosis
    });
    
  } catch (err: any) {
    console.error('Patient Intake Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
