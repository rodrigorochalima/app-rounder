/**
 * Script para executar migrations no Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration(filename: string) {
  console.log(`\n📄 Executando migration: ${filename}`);
  
  try {
    const sql = readFileSync(
      join(__dirname, '..', 'supabase', 'migrations', filename),
      'utf-8'
    );
    
    // Dividir em statements individuais (separados por ponto e vírgula)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Erro ao executar statement:`, error);
          console.error(`Statement:`, statement.substring(0, 100) + '...');
        }
      }
    }
    
    console.log(`✅ Migration ${filename} executada com sucesso!`);
  } catch (error: any) {
    console.error(`❌ Erro ao executar migration ${filename}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando migrations...\n');
  console.log(`URL: ${SUPABASE_URL}`);
  
  try {
    // Executar migrations em ordem
    await runMigration('001_initial_schema.sql');
    await runMigration('002_instituicoes_templates.sql');
    
    console.log('\n✅ Todas as migrations foram executadas com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro ao executar migrations:', error);
    process.exit(1);
  }
}

main();
