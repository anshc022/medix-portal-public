import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_vIpDtLa7By6M@ep-super-band-ann27k5c-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
