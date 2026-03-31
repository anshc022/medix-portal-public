import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    const totalQuery = await pool.query('SELECT COUNT(*) as count FROM applications');
    const statusQuery = await pool.query('SELECT status, COUNT(*) as count FROM applications GROUP BY status');
    const payerQuery = await pool.query('SELECT insurance_payer, COUNT(*) as count FROM applications GROUP BY insurance_payer');

    return NextResponse.json({
        success: true,
        total: parseInt(totalQuery.rows[0].count),
        by_status: statusQuery.rows,
        by_payer: payerQuery.rows
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
