/**
 * Configuração do banco de dados Neon (PostgreSQL)
 * Substitui o Supabase como backend de dados
 */
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL não configurada nas variáveis de ambiente');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Testar conexão ao iniciar
pool.on('connect', () => {
  console.log('✅ Conectado ao banco Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool de conexão:', err.message);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Query executada:', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (error: any) {
    console.error('Erro na query:', { text: text.substring(0, 80), error: error.message });
    throw error;
  }
}

export default pool;
