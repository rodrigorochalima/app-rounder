#!/usr/bin/env python3
"""
Script para executar SQL de correção de RLS policies via Supabase REST API
"""

import requests
import os

# Configurações do Supabase
SUPABASE_URL = "https://reqkdqislsnzrfgggasy.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcWtkcWlzbHNuenJmZ2dnYXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzEzNjc4MSwiZXhwIjoyMDc4NzEyNzgxfQ.dtuueHZdyGQR8JwktAsE71Upueg4d5J3xza3nb9LlrA"

# SQL para executar
sql_commands = [
    # 1. Dropar policies existentes se houver conflito
    "DROP POLICY IF EXISTS \"Users can create their own profile\" ON user_profiles;",
    "DROP POLICY IF EXISTS \"Users can view their own profile\" ON user_profiles;",
    "DROP POLICY IF EXISTS \"Users can update their own profile\" ON user_profiles;",
    "DROP POLICY IF EXISTS \"Users can delete their own profile\" ON user_profiles;",
    
    # 2. Criar nova policy para INSERT
    """
    CREATE POLICY "Users can create their own profile"
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
    """,
    
    # 3. Criar policy para SELECT
    """
    CREATE POLICY "Users can view their own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
    """,
    
    # 4. Criar policy para UPDATE
    """
    CREATE POLICY "Users can update their own profile"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    """,
    
    # 5. Criar policy para DELETE
    """
    CREATE POLICY "Users can delete their own profile"
    ON user_profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
    """
]

def execute_sql(sql):
    """Executa SQL via Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Tentar via endpoint de query direto
    url = f"{SUPABASE_URL}/rest/v1/"
    
    print(f"Executando SQL via psycopg2...")
    
    # Como a API REST não suporta SQL arbitrário, vamos usar psycopg2
    try:
        import psycopg2
        
        # Connection string do Supabase
        conn_string = f"postgresql://postgres.reqkdqislsnzrfgggasy:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
        
        print("NOTA: Não é possível executar SQL DDL via REST API.")
        print("Por favor, execute o SQL manualmente no Supabase SQL Editor:")
        print("\nSQL a executar:")
        print("="*80)
        with open('/home/ubuntu/app-rounder/fix-rls-policies.sql', 'r') as f:
            print(f.read())
        print("="*80)
        
        return False
        
    except ImportError:
        print("psycopg2 não está instalado")
        return False

if __name__ == "__main__":
    print("Tentando executar correção de RLS policies...")
    print("\nInfelizmente, a API REST do Supabase não suporta execução de SQL DDL.")
    print("\nVocê precisa executar o SQL manualmente no Supabase Dashboard:")
    print(f"1. Acesse: https://supabase.com/dashboard/project/reqkdqislsnzrfgggasy/sql/new")
    print(f"2. Cole o conteúdo do arquivo: /home/ubuntu/app-rounder/fix-rls-policies.sql")
    print(f"3. Clique em 'Run' para executar")
    
    print("\n" + "="*80)
    print("CONTEÚDO DO SQL:")
    print("="*80)
    with open('/home/ubuntu/app-rounder/fix-rls-policies.sql', 'r') as f:
        print(f.read())
