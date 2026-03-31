import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAcU4AG8OeBEbxReP6r0u4uGwicpwd6Xqc');

export async function POST(req: Request) {
  try {
    const { message, history, application_id } = await req.json();

    let context = 'You are the Medix AI Assistant. You help doctors and reviewers understand the prior authorization process.';
    
    if (application_id) {
        const { rows } = await pool.query('SELECT * FROM applications WHERE application_id = $1', [application_id]);
        if (rows.length > 0) {
            const app = rows[0];
            context += `\nYou are currently looking at case ${application_id} for patient ${app.patient_name} (${app.patient_age}y) requesting ${app.requested_treatment} from ${app.insurance_payer}. Symptoms: ${app.symptoms}. Status: ${app.status}.`;
        }
        
        const logQuery = await pool.query('SELECT agent_name, log_message FROM agent_logs WHERE application_id = $1 ORDER BY created_at ASC', [application_id]);
        if (logQuery.rows.length > 0) {
            context += `\nHere is what the AI Agents have done so far:\n`;
            logQuery.rows.forEach((l: any) => {
                context += `- ${l.agent_name}: ${l.log_message}\n`;
            });
        }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `${context}\n\nUser Question: ${message}\nAnswer concisely as a helpful AI medical assistant.`;
    const result = await model.generateContent(prompt);
    
    return NextResponse.json({ success: true, reply: result.response.text() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
