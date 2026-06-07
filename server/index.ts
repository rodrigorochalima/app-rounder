/**
 * Servidor Express - App Rounder
 * Backend completo com Neon PostgreSQL (substitui Supabase)
 * Compatível com Vercel Serverless Functions
 */
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, query } from './db.js';
import { Resend } from 'resend';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const resend = new Resend(process.env.RESEND_API_KEY || '');
const APP_URL = process.env.APP_URL || 'https://app-rounder.vercel.app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'app-rounder-secret-2025-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

const DEFAULT_RULES = [
  'Identificar o paciente pelo nome completo e leito',
  'Registrar data e hora do round',
  'Descrever queixas principais do paciente',
  'Registrar sinais vitais: PA, FC, FR, SpO2, Temperatura',
  'Avaliar nível de consciência (Glasgow ou RASS)',
  'Descrever exame físico por sistemas',
  'Registrar balanço hídrico das últimas 24h',
  'Listar medicamentos em uso com doses e vias',
  'Registrar resultados de exames laboratoriais relevantes',
  'Descrever achados de exames de imagem',
  'Formular hipótese diagnóstica principal',
  'Listar diagnósticos diferenciais quando pertinente',
  'Definir conduta e plano terapêutico',
  'Registrar pendências e solicitações',
  'Documentar comunicação com família quando realizada',
  'Assinar com CRM e especialidade',
];

let dbInitialized = false;

async function initDatabase() {
  if (dbInitialized) return;
  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    dbInitialized = true;
    console.log('✅ Schema do banco de dados inicializado');
  } catch (error: any) {
    console.error('❌ Erro ao inicializar schema:', error.message);
  }
}

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token de autenticação necessário' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

function generateRefreshToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 96; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function mapProfile(user: any, profile: any) {
  return {
    id: user?.id || profile?.user_id,
    email: user?.email || profile?.email,
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    specialty: profile?.specialty || '',
    crm: profile?.crm || '',
    crmState: profile?.crm_state || '',
    avatarUrl: profile?.avatar_url || '',
    hospitalName: profile?.hospital_name || '',
    hospitalPhone: profile?.hospital_phone || '',
    position: profile?.position || '',
    personalPhone: profile?.personal_phone || '',
    role: profile?.role || 'rotineiro',
    onboardingCompleted: profile?.onboarding_completed || false,
    apiConfig: profile?.api_config || {},
    createdAt: user?.created_at || profile?.created_at,
    updatedAt: profile?.updated_at,
  };
}

// Criar o app Express
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req: any, res: any, next: any) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Inicializar banco antes de cada request em serverless
app.use(async (_req: any, _res: any, next: any) => {
  await initDatabase();
  next();
});

// ---- AUTH ----

app.post('/api/auth/signup', async (req: any, res: any) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Este email já está cadastrado' });
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), passwordHash]
    );
    const user = userResult.rows[0];
    await query('INSERT INTO user_profiles (user_id, email, full_name) VALUES ($1, $2, $3)', [user.id, user.email, fullName || '']);
    for (let i = 0; i < DEFAULT_RULES.length; i++) {
      await query('INSERT INTO round_rules (user_id, rule_text, is_active, order_index) VALUES ($1, $2, $3, $4)', [user.id, DEFAULT_RULES[i], true, i + 1]);
    }
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = generateRefreshToken();
    const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, refreshExpires.toISOString()]);
    const profileResult = await query('SELECT * FROM user_profiles WHERE user_id = $1', [user.id]);
    return res.status(201).json({ user: mapProfile(user, profileResult.rows[0]), accessToken, refreshToken, expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 });
  } catch (error: any) {
    console.error('Erro signup:', error.message);
    return res.status(500).json({ error: 'Erro interno ao criar conta' });
  }
});

app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'Email ou senha incorretos' });
    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Email ou senha incorretos' });
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = generateRefreshToken();
    const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, refreshExpires.toISOString()]);
    const profileResult = await query('SELECT * FROM user_profiles WHERE user_id = $1', [user.id]);
    return res.json({ user: mapProfile(user, profileResult.rows[0]), accessToken, refreshToken, expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 });
  } catch (error: any) {
    console.error('Erro login:', error.message);
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

app.post('/api/auth/refresh', async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token necessário' });
    const tokenResult = await query('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [refreshToken]);
    if (tokenResult.rows.length === 0) return res.status(403).json({ error: 'Refresh token inválido ou expirado' });
    const userResult = await query('SELECT * FROM users WHERE id = $1', [tokenResult.rows[0].user_id]);
    const user = userResult.rows[0];
    const newAccessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ accessToken: newAccessToken, expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao renovar token' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    return res.json({ message: 'Logout realizado com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
  try {
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const profileResult = await query('SELECT * FROM user_profiles WHERE user_id = $1', [req.userId]);
    return res.json({ user: mapProfile(userResult.rows[0], profileResult.rows[0]) });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// Solicitar reset de senha — envia e-mail real via Resend
app.post('/api/auth/reset-password', async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    // Sempre retorna sucesso (segurança: não revelar se e-mail existe)
    const userResult = await query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) {
      return res.json({ message: 'Se o email existir, você receberá instruções em breve' });
    }

    const user = userResult.rows[0];

    // Invalidar tokens anteriores do usuário
    await query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.id]);

    // Gerar novo token com validade de 1 hora
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetToken, expiresAt.toISOString()]
    );

    const resetLink = `${APP_URL}/auth/reset-password?token=${resetToken}`;

    // Enviar e-mail via Resend
    await resend.emails.send({
      from: 'App Rounder <noreply@nexo.center>',
      to: [user.email],
      subject: '🔑 Redefinição de senha — App Rounder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4A90D9, #357ABD); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏥 App Rounder</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Gerador Inteligente de Rounds Médicos</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-top: 0;">Redefinição de senha</h2>
            <p style="color: #555; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no App Rounder.</p>
            <p style="color: #555; line-height: 1.6;">Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #4A90D9; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">Redefinir minha senha</a>
            </div>
            <p style="color: #888; font-size: 13px;">Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #aaa; font-size: 12px; text-align: center;">App Rounder • Nexo Soluções Digitais</p>
          </div>
        </div>
      `,
    });

    return res.json({ message: 'Se o email existir, você receberá instruções em breve' });
  } catch (error: any) {
    console.error('Erro reset-password:', error.message);
    return res.status(500).json({ error: 'Erro ao processar solicitação de reset' });
  }
});

// Confirmar reset de senha com token
app.post('/api/auth/reset-password/confirm', async (req: any, res: any) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

    // Buscar token válido
    const tokenResult = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Link de redefinição inválido ou expirado. Solicite um novo.' });
    }

    const resetRecord = tokenResult.rows[0];

    // Atualizar senha
    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, resetRecord.user_id]);

    // Marcar token como usado
    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetRecord.id]);

    // Invalidar todos os refresh tokens do usuário (segurança)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [resetRecord.user_id]);

    return res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
  } catch (error: any) {
    console.error('Erro reset-password confirm:', error.message);
    return res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

app.put('/api/auth/update-password', authenticateToken, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });
    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.userId]);
    return res.json({ message: 'Senha atualizada com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
});

// ---- PERFIL ----

app.put('/api/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const u = req.body;
    const result = await query(
      `UPDATE user_profiles SET
        full_name = COALESCE($1, full_name), phone = COALESCE($2, phone),
        specialty = COALESCE($3, specialty), crm = COALESCE($4, crm),
        crm_state = COALESCE($5, crm_state), avatar_url = COALESCE($6, avatar_url),
        hospital_name = COALESCE($7, hospital_name), hospital_phone = COALESCE($8, hospital_phone),
        position = COALESCE($9, position), personal_phone = COALESCE($10, personal_phone),
        api_config = COALESCE($11::jsonb, api_config)
       WHERE user_id = $12 RETURNING *`,
      [u.full_name||u.fullName, u.phone, u.specialty, u.crm, u.crm_state||u.crmState,
       u.avatar_url||u.avatarUrl, u.hospital_name||u.hospitalName, u.hospital_phone||u.hospitalPhone,
       u.position, u.personal_phone||u.personalPhone,
       u.api_config ? JSON.stringify(u.api_config) : null, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Perfil não encontrado' });
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
    return res.json({ user: mapProfile(userResult.rows[0], result.rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar perfil: ' + error.message });
  }
});

// ---- API KEYS ----

app.get('/api/api-keys', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query('SELECT * FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    return res.json({ data: result.rows });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar API keys' });
  }
});

app.post('/api/api-keys', authenticateToken, async (req: any, res: any) => {
  try {
    const { provider, name, encrypted_key, encryption_iv, monthly_limit, cost_per_million_tokens, notes } = req.body;
    const result = await query(
      `INSERT INTO user_api_keys (user_id, provider, name, encrypted_key, encryption_iv, monthly_limit, cost_per_million_tokens, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, provider, name, encrypted_key, encryption_iv, monthly_limit || 1000, cost_per_million_tokens || 0, notes || '']
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar API key: ' + error.message });
  }
});

app.put('/api/api-keys/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, is_active, is_default, monthly_limit, notes } = req.body;
    if (is_default) {
      const k = await query('SELECT provider FROM user_api_keys WHERE id = $1 AND user_id = $2', [id, req.userId]);
      if (k.rows.length > 0) await query('UPDATE user_api_keys SET is_default = false WHERE user_id = $1 AND provider = $2', [req.userId, k.rows[0].provider]);
    }
    const result = await query(
      `UPDATE user_api_keys SET name = COALESCE($1, name), is_active = COALESCE($2, is_active),
       is_default = COALESCE($3, is_default), monthly_limit = COALESCE($4, monthly_limit),
       notes = COALESCE($5, notes) WHERE id = $6 AND user_id = $7 RETURNING *`,
      [name, is_active, is_default, monthly_limit, notes, id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'API key não encontrada' });
    return res.json({ data: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Erro ao atualizar API key' });
  }
});

app.delete('/api/api-keys/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await query('DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    return res.json({ message: 'API key removida com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao remover API key' });
  }
});

// ---- REGRAS DE ROUND ----

app.get('/api/round-rules', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query('SELECT * FROM round_rules WHERE user_id = $1 ORDER BY order_index ASC', [req.userId]);
    return res.json({ data: result.rows });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar regras' });
  }
});

app.post('/api/round-rules', authenticateToken, async (req: any, res: any) => {
  try {
    const { rule_text, is_active, order_index } = req.body;
    const result = await query(
      'INSERT INTO round_rules (user_id, rule_text, is_active, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, rule_text, is_active !== false, order_index || 1]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Erro ao criar regra' });
  }
});

app.put('/api/round-rules/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { rule_text, is_active, order_index } = req.body;
    const result = await query(
      `UPDATE round_rules SET rule_text = COALESCE($1, rule_text), is_active = COALESCE($2, is_active),
       order_index = COALESCE($3, order_index) WHERE id = $4 AND user_id = $5 RETURNING *`,
      [rule_text, is_active, order_index, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Regra não encontrada' });
    return res.json({ data: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Erro ao atualizar regra' });
  }
});

app.delete('/api/round-rules/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await query('DELETE FROM round_rules WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    return res.json({ message: 'Regra removida com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao remover regra' });
  }
});

app.patch('/api/round-rules/reorder', authenticateToken, async (req: any, res: any) => {
  try {
    const { rules } = req.body;
    for (const rule of rules) {
      await query('UPDATE round_rules SET order_index = $1 WHERE id = $2 AND user_id = $3', [rule.order_index, rule.id, req.userId]);
    }
    return res.json({ message: 'Regras reordenadas com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao reordenar regras' });
  }
});

// ---- MÉTRICAS E USO DE LLM ----

// Registrar uso de uma LLM (chamado pelo frontend após cada geração)
app.post('/api/llm-usage', authenticateToken, async (req: any, res: any) => {
  try {
    const { provider, api_key_id, tokens_used, cost_usd, duration_ms, model_used, success, error_message } = req.body;
    // Inserir log de uso
    await query(
      `INSERT INTO user_api_usage_logs (user_id, api_key_id, provider, tokens_used, cost_usd, duration_ms, model_used, success, error_message, request_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'generation')`,
      [req.userId, api_key_id || null, provider, tokens_used || 0, cost_usd || 0, duration_ms || 0, model_used || provider, success !== false, error_message || null]
    );
    // Atualizar contadores na tabela de API keys
    if (api_key_id) {
      await query(
        `UPDATE user_api_keys SET 
          current_month_usage = current_month_usage + 1,
          usage_count = usage_count + 1,
          total_tokens_used = total_tokens_used + $1,
          total_cost_usd = total_cost_usd + $2,
          last_used_at = NOW()
         WHERE id = $3 AND user_id = $4`,
        [tokens_used || 0, cost_usd || 0, api_key_id, req.userId]
      );
    }
    return res.json({ message: 'Uso registrado' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao registrar uso: ' + error.message });
  }
});

// Buscar métricas detalhadas por provedor
app.get('/api/llm-metrics', authenticateToken, async (req: any, res: any) => {
  try {
    // Métricas por provedor (mês atual)
    const metricsResult = await query(
      `SELECT 
        provider,
        COUNT(*) as total_requests,
        SUM(tokens_used) as total_tokens,
        SUM(cost_usd) as total_cost,
        AVG(duration_ms) as avg_duration_ms,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
        MAX(created_at) as last_used
       FROM user_api_usage_logs
       WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())
       GROUP BY provider
       ORDER BY total_requests DESC`,
      [req.userId]
    );
    // Métricas globais do mês
    const globalResult = await query(
      `SELECT 
        COUNT(*) as total_requests,
        SUM(tokens_used) as total_tokens,
        SUM(cost_usd) as total_cost,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests
       FROM user_api_usage_logs
       WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
      [req.userId]
    );
    // Extrato dos últimos 30 registros
    const extractResult = await query(
      `SELECT provider, tokens_used, cost_usd, duration_ms, model_used, success, error_message, created_at
       FROM user_api_usage_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.userId]
    );
    // API keys com uso acumulado
    const keysResult = await query(
      `SELECT id, provider, name, is_active, is_default, current_month_usage, monthly_limit, 
              total_tokens_used, total_cost_usd, usage_count, last_used_at
       FROM user_api_keys WHERE user_id = $1 ORDER BY provider, created_at`,
      [req.userId]
    );
    return res.json({
      by_provider: metricsResult.rows,
      global: globalResult.rows[0],
      extract: extractResult.rows,
      api_keys: keysResult.rows
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao buscar métricas: ' + error.message });
  }
});

// Buscar/atualizar configuração de balanceamento
app.get('/api/llm-balance', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query('SELECT * FROM llm_balance_config WHERE user_id = $1', [req.userId]);
    if (result.rows.length === 0) {
      // Criar config padrão
      const created = await query(
        `INSERT INTO llm_balance_config (user_id, strategy, priority_order, fallback_enabled)
         VALUES ($1, 'smart', ARRAY['cerebras','groq','gemini','qwen','deepseek','openai'], true)
         RETURNING *`,
        [req.userId]
      );
      return res.json({ data: created.rows[0] });
    }
    return res.json({ data: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao buscar config: ' + error.message });
  }
});

app.put('/api/llm-balance', authenticateToken, async (req: any, res: any) => {
  try {
    const { strategy, priority_order, fallback_enabled, cost_threshold_usd } = req.body;
    const result = await query(
      `INSERT INTO llm_balance_config (user_id, strategy, priority_order, fallback_enabled, cost_threshold_usd)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         strategy = EXCLUDED.strategy,
         priority_order = EXCLUDED.priority_order,
         fallback_enabled = EXCLUDED.fallback_enabled,
         cost_threshold_usd = EXCLUDED.cost_threshold_usd,
         updated_at = NOW()
       RETURNING *`,
      [req.userId, strategy || 'smart', priority_order || ['cerebras','groq','gemini','qwen','deepseek','openai'], fallback_enabled !== false, cost_threshold_usd || 0.10]
    );
    return res.json({ data: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao salvar config: ' + error.message });
  }
});

// ---- HEALTH ----

app.get('/api/health', async (_req: any, res: any) => {
  try {
    await query('SELECT 1');
    return res.json({ status: 'ok', database: 'neon-connected', timestamp: new Date().toISOString() });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// ============================================================
// ROTA: EXTRAÇÃO DE TEXTO DE ARQUIVOS (PDF, TXT, etc.)
// ============================================================

app.post('/api/extract-text', authenticateToken, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const { originalname, buffer, mimetype } = req.file;
    const ext = originalname.split('.').pop()?.toLowerCase() || '';

    // PDF
    if (ext === 'pdf' || mimetype === 'application/pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        return res.json({ text: data.text, pages: data.numpages, source: originalname });
      } catch (pdfErr: any) {
        return res.status(500).json({ error: `Erro ao processar PDF: ${pdfErr.message}` });
      }
    }

    // Arquivos de texto simples: txt, srt, vtt, md, csv, rtf
    const textExts = ['txt', 'srt', 'vtt', 'md', 'csv', 'rtf', 'text'];
    if (textExts.includes(ext) || mimetype.startsWith('text/')) {
      const text = buffer.toString('utf-8');
      return res.json({ text, source: originalname });
    }

    return res.status(400).json({ error: `Formato não suportado: .${ext}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ROTAS RAG CLÍNICO: HISTÓRICO DE ROUNDS
// ============================================================

// Salvar round gerado no histórico
app.post('/api/rounds/history', authenticateToken, async (req: any, res: any) => {
  try {
    const { round_date, round_name, transcription_text, generated_document, raw_input_text, llm_provider, tokens_used } = req.body;
    const result = await query(
      `INSERT INTO round_history (user_id, round_date, round_name, transcription_text, generated_document, raw_input_text, llm_provider, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, round_date || new Date().toISOString().split('T')[0], round_name || '', transcription_text || '', generated_document || '', raw_input_text || '', llm_provider || '', tokens_used || 0]
    );
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Listar histórico de rounds
app.get('/api/rounds/history', authenticateToken, async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const result = await query(
      `SELECT id, round_date, round_name, processing_status, llm_provider, tokens_used, created_at,
       LEFT(generated_document, 500) as preview
       FROM round_history WHERE user_id = $1 ORDER BY round_date DESC, created_at DESC LIMIT $2`,
      [req.userId, limit]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Buscar round específico com conteúdo completo
app.get('/api/rounds/history/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(
      'SELECT * FROM round_history WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Round não encontrado' });
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Deletar round do histórico
app.delete('/api/rounds/history/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await query('DELETE FROM round_history WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ROTAS RAG CLÍNICO: CONTEXTO DE PACIENTES/LEITOS
// ============================================================

// Listar todos os pacientes/leitos ativos
app.get('/api/clinical/patients', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(
      `SELECT * FROM clinical_patients WHERE user_id = $1 ORDER BY bed_number ASC`,
      [req.userId]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Criar ou atualizar paciente/leito
app.post('/api/clinical/patients', authenticateToken, async (req: any, res: any) => {
  try {
    const { bed_number, patient_name, admission_date, main_diagnosis, current_status, pending_exams, active_antibiotics, key_notes, is_active } = req.body;
    // Verificar se já existe leito
    const existing = await query(
      'SELECT id FROM clinical_patients WHERE user_id = $1 AND bed_number = $2',
      [req.userId, bed_number]
    );
    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE clinical_patients SET patient_name=$1, admission_date=$2, main_diagnosis=$3, current_status=$4,
         pending_exams=$5, active_antibiotics=$6, key_notes=$7, is_active=$8, updated_at=NOW(), last_updated=CURRENT_DATE
         WHERE user_id=$9 AND bed_number=$10 RETURNING *`,
        [patient_name, admission_date, main_diagnosis, current_status, pending_exams, active_antibiotics, key_notes, is_active !== false, req.userId, bed_number]
      );
    } else {
      result = await query(
        `INSERT INTO clinical_patients (user_id, bed_number, patient_name, admission_date, main_diagnosis, current_status, pending_exams, active_antibiotics, key_notes, is_active, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE) RETURNING *`,
        [req.userId, bed_number, patient_name, admission_date, main_diagnosis, current_status, pending_exams, active_antibiotics, key_notes, is_active !== false]
      );
    }
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Dar alta / marcar óbito / transferência em paciente
app.patch('/api/clinical/patients/:id/discharge', authenticateToken, async (req: any, res: any) => {
  try {
    const { discharge_type } = req.body; // 'alta', 'obito', 'transferencia'
    const result = await query(
      `UPDATE clinical_patients SET discharge_type=$1, discharge_date=CURRENT_DATE, is_active=false, updated_at=NOW()
       WHERE id=$2 AND user_id=$3 RETURNING *`,
      [discharge_type || 'alta', req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Deletar paciente
app.delete('/api/clinical/patients/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await query('DELETE FROM clinical_patients WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ROTAS RAG: SNAPSHOTS DE LEITO POR ROUND
// ============================================================

// Salvar snapshots de leito após round gerado
app.post('/api/clinical/snapshots', authenticateToken, async (req: any, res: any) => {
  try {
    const { round_id, round_date, snapshots } = req.body;
    // snapshots = array de { bed_number, patient_name, patient_status, content_summary, new_exams, new_antibiotics, new_procedures, pending_items }
    const inserted = [];
    for (const snap of (snapshots || [])) {
      const r = await query(
        `INSERT INTO bed_round_snapshots (user_id, round_id, round_date, bed_number, patient_name, patient_status, content_summary, new_exams, new_antibiotics, new_procedures, pending_items)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [req.userId, round_id, round_date, snap.bed_number, snap.patient_name, snap.patient_status || 'active', snap.content_summary, snap.new_exams, snap.new_antibiotics, snap.new_procedures, snap.pending_items]
      );
      inserted.push(r.rows[0]);
    }
    return res.json(inserted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Buscar contexto RAG para um leito específico (últimos N rounds)
app.get('/api/clinical/context/:bed', authenticateToken, async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const result = await query(
      `SELECT * FROM bed_round_snapshots WHERE user_id = $1 AND bed_number = $2
       ORDER BY round_date DESC LIMIT $3`,
      [req.userId, req.params.bed, limit]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Buscar contexto RAG completo (todos os leitos, últimos 3 rounds) para injetar no prompt
app.get('/api/clinical/rag-context', authenticateToken, async (req: any, res: any) => {
  try {
    // Buscar pacientes ativos
    const patients = await query(
      `SELECT bed_number, patient_name, main_diagnosis, current_status, pending_exams, active_antibiotics, key_notes, last_updated
       FROM clinical_patients WHERE user_id = $1 AND is_active = true ORDER BY bed_number`,
      [req.userId]
    );
    // Buscar últimos 3 rounds
    const recentRounds = await query(
      `SELECT id, round_date, round_name FROM round_history WHERE user_id = $1 ORDER BY round_date DESC LIMIT 3`,
      [req.userId]
    );
    // Buscar snapshots dos últimos 3 rounds
    const snapshots = await query(
      `SELECT brs.* FROM bed_round_snapshots brs
       JOIN round_history rh ON brs.round_id = rh.id
       WHERE brs.user_id = $1
       ORDER BY brs.round_date DESC LIMIT 60`,
      [req.userId]
    );
    // Buscar pendências abertas
    const pending = await query(
      `SELECT bed_number, item_type, description, requested_date
       FROM clinical_pending_items WHERE user_id = $1 AND is_resolved = false
       ORDER BY requested_date DESC`,
      [req.userId]
    );
    return res.json({
      active_patients: patients.rows,
      recent_rounds: recentRounds.rows,
      bed_snapshots: snapshots.rows,
      pending_items: pending.rows
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ROTAS RAG: PENDÊNCIAS CLÍNICAS
// ============================================================

// Listar pendências
app.get('/api/clinical/pending', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(
      `SELECT * FROM clinical_pending_items WHERE user_id = $1 ORDER BY is_resolved ASC, requested_date DESC`,
      [req.userId]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Adicionar pendência
app.post('/api/clinical/pending', authenticateToken, async (req: any, res: any) => {
  try {
    const { bed_number, item_type, description, requested_date } = req.body;
    const result = await query(
      `INSERT INTO clinical_pending_items (user_id, bed_number, item_type, description, requested_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, bed_number, item_type || 'exam', description, requested_date || new Date().toISOString().split('T')[0]]
    );
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH pendência (alias sem sufixo)
app.patch('/api/clinical/pending/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { resolved, resolved_date } = req.body;
    const result = await query(
      `UPDATE clinical_pending_items SET is_resolved=$3, resolved_date=$4 WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.userId, resolved ?? false, resolved_date || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pendência não encontrada' });
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Resolver pendência
app.patch('/api/clinical/pending/:id/resolve', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(
      `UPDATE clinical_pending_items SET is_resolved=true, resolved_date=CURRENT_DATE
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pendência não encontrada' });
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH paciente (atualizar status)
app.patch('/api/clinical/patients/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { current_status, patient_name, main_diagnosis, pending_exams, active_antibiotics, relevant_notes } = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (current_status !== undefined) { fields.push(`current_status=$${idx++}`); values.push(current_status); }
    if (patient_name !== undefined) { fields.push(`patient_name=$${idx++}`); values.push(patient_name); }
    if (main_diagnosis !== undefined) { fields.push(`main_diagnosis=$${idx++}`); values.push(main_diagnosis); }
    if (pending_exams !== undefined) { fields.push(`pending_exams=$${idx++}`); values.push(pending_exams); }
    if (active_antibiotics !== undefined) { fields.push(`active_antibiotics=$${idx++}`); values.push(active_antibiotics); }
    if (relevant_notes !== undefined) { fields.push(`key_notes=$${idx++}`); values.push(relevant_notes); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    fields.push(`last_updated=NOW()`);
    values.push(req.params.id, req.userId);
    const result = await query(
      `UPDATE clinical_patients SET ${fields.join(', ')} WHERE id=$${idx} AND user_id=$${idx + 1} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Deletar pendência
app.delete('/api/clinical/pending/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await query('DELETE FROM clinical_pending_items WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ROTAS: INSTITUIÇÕES
// ============================================================

app.get('/api/institutions', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query('SELECT * FROM institutions WHERE user_id = $1 ORDER BY is_default DESC, name ASC', [req.userId]);
    return res.json(result.rows);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.post('/api/institutions', authenticateToken, async (req: any, res: any) => {
  try {
    const { name, short_name, logo_base64, address, city, state, phone, email, cnpj, cnes, gps_lat, gps_lng, maps_url, total_beds, icu_type, header_color, header_text_color, is_default } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (is_default) await query('UPDATE institutions SET is_default = FALSE WHERE user_id = $1', [req.userId]);
    const result = await query(
      `INSERT INTO institutions (user_id, name, short_name, logo_base64, address, city, state, phone, email, cnpj, cnes, gps_lat, gps_lng, maps_url, total_beds, icu_type, header_color, header_text_color, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [req.userId, name, short_name, logo_base64, address, city, state, phone, email, cnpj, cnes, gps_lat, gps_lng, maps_url, total_beds || 10, icu_type || 'UTI Adulto', header_color || '#1e3a5f', header_text_color || '#ffffff', is_default || false]
    );
    return res.json(result.rows[0]);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.put('/api/institutions/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { name, short_name, logo_base64, address, city, state, phone, email, cnpj, cnes, gps_lat, gps_lng, maps_url, total_beds, icu_type, header_color, header_text_color, is_default } = req.body;
    if (is_default) await query('UPDATE institutions SET is_default = FALSE WHERE user_id = $1', [req.userId]);
    const result = await query(
      `UPDATE institutions SET name=$1,short_name=$2,logo_base64=$3,address=$4,city=$5,state=$6,phone=$7,email=$8,cnpj=$9,cnes=$10,gps_lat=$11,gps_lng=$12,maps_url=$13,total_beds=$14,icu_type=$15,header_color=$16,header_text_color=$17,is_default=$18,updated_at=NOW()
       WHERE id=$19 AND user_id=$20 RETURNING *`,
      [name, short_name, logo_base64, address, city, state, phone, email, cnpj, cnes, gps_lat, gps_lng, maps_url, total_beds, icu_type, header_color, header_text_color, is_default, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Instituição não encontrada' });
    return res.json(result.rows[0]);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.delete('/api/institutions/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await query('DELETE FROM institutions WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    return res.json({ success: true });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// ============================================================
// ROTAS: PERFIL DO MÉDICO
// ============================================================

app.get('/api/doctor-profile', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query('SELECT * FROM doctor_profiles WHERE user_id=$1', [req.userId]);
    return res.json(result.rows[0] || null);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.put('/api/doctor-profile', authenticateToken, async (req: any, res: any) => {
  try {
    const { full_name, crm, crm_state, specialty, rqe, phone, email, signature_base64, show_crm, show_specialty, show_phone, show_email, show_qrcode, qrcode_url, footer_text } = req.body;
    const result = await query(
      `INSERT INTO doctor_profiles (user_id, full_name, crm, crm_state, specialty, rqe, phone, email, signature_base64, show_crm, show_specialty, show_phone, show_email, show_qrcode, qrcode_url, footer_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (user_id) DO UPDATE SET full_name=$2,crm=$3,crm_state=$4,specialty=$5,rqe=$6,phone=$7,email=$8,signature_base64=$9,show_crm=$10,show_specialty=$11,show_phone=$12,show_email=$13,show_qrcode=$14,qrcode_url=$15,footer_text=$16,updated_at=NOW()
       RETURNING *`,
      [req.userId, full_name, crm, crm_state, specialty, rqe, phone, email, signature_base64, show_crm ?? true, show_specialty ?? true, show_phone ?? false, show_email ?? false, show_qrcode ?? false, qrcode_url, footer_text]
    );
    return res.json(result.rows[0]);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// ============================================================
// ROTAS: RAG — INGESTÃO E BUSCA SEMÂNTICA
// ============================================================

function chunkTextByBed(text: string): Array<{text: string, bed: string|null, patient: string|null}> {
  const chunks: Array<{text: string, bed: string|null, patient: string|null}> = [];
  const lines = text.split('\n');
  let currentBed: string | null = null;
  let currentPatient: string | null = null;
  let currentChunk: string[] = [];
  const MAX_CHUNK_CHARS = 1500;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bedMatch = trimmed.match(/(?:leito|box|cama)\s*[:\-]?\s*(\d+[A-Za-z]?)/i) || trimmed.match(/\b([LB]\d+)\b/);
    if (bedMatch) {
      if (currentChunk.length > 0) { chunks.push({ text: currentChunk.join(' '), bed: currentBed, patient: currentPatient }); currentChunk = []; }
      currentBed = bedMatch[1] || bedMatch[0];
    }
    const patientMatch = trimmed.match(/(?:paciente|pt\.?)\s*[:\-]?\s*([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)*)/i);
    if (patientMatch) currentPatient = patientMatch[1];
    currentChunk.push(trimmed);
    if (currentChunk.join(' ').length > MAX_CHUNK_CHARS) {
      chunks.push({ text: currentChunk.join(' '), bed: currentBed, patient: currentPatient });
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0) chunks.push({ text: currentChunk.join(' '), bed: currentBed, patient: currentPatient });
  if (chunks.length === 0) {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += 300) chunks.push({ text: words.slice(i, i+300).join(' '), bed: null, patient: null });
  }
  return chunks;
}

async function generateEmbedding(text: string, userId: string): Promise<number[] | null> {
  try {
    const apiKeyResult = await query(`SELECT api_key FROM user_api_keys WHERE user_id=$1 AND provider='google_gemini' AND is_active=TRUE LIMIT 1`, [userId]);
    if (apiKeyResult.rows.length > 0) {
      const apiKey = apiKeyResult.rows[0].api_key;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: text.slice(0, 2048) }] } })
      });
      if (response.ok) { const data: any = await response.json(); return data.embedding?.values || null; }
    }
    return null;
  } catch (_) { return null; }
}

app.post('/api/rag/ingest', authenticateToken, async (req: any, res: any) => {
  try {
    const { text, source_date, institution_id, source_type } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto é obrigatório' });
    const chunks = chunkTextByBed(text);
    let inserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk.text, req.userId);
      if (embedding) {
        await query(
          `INSERT INTO rag_embeddings (user_id, institution_id, source_type, source_date, bed_number, patient_name, chunk_text, chunk_index, embedding, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10)`,
          [req.userId, institution_id||null, source_type||'transcription', source_date||new Date().toISOString().split('T')[0], chunk.bed, chunk.patient, chunk.text, i, `[${embedding.join(',')}]`, JSON.stringify({ source_type, chars: chunk.text.length })]
        );
      } else {
        await query(
          `INSERT INTO rag_embeddings (user_id, institution_id, source_type, source_date, bed_number, patient_name, chunk_text, chunk_index, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [req.userId, institution_id||null, source_type||'transcription', source_date||new Date().toISOString().split('T')[0], chunk.bed, chunk.patient, chunk.text, i, JSON.stringify({ source_type, chars: chunk.text.length, no_embedding: true })]
        );
      }
      inserted++;
    }
    await query('DELETE FROM rag_embeddings WHERE user_id=$1 AND expires_at < NOW()', [req.userId]);
    return res.json({ success: true, chunks_inserted: inserted, total_chunks: chunks.length });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.post('/api/rag/search', authenticateToken, async (req: any, res: any) => {
  try {
    const { query: searchQuery, institution_id, days_back, limit } = req.body;
    if (!searchQuery) return res.status(400).json({ error: 'Query é obrigatória' });
    const queryEmbedding = await generateEmbedding(searchQuery, req.userId);
    const daysBack = days_back || 60;
    const resultLimit = limit || 10;
    let results;
    if (queryEmbedding) {
      const embStr = `[${queryEmbedding.join(',')}]`;
      const q = institution_id
        ? await query(`SELECT chunk_text,bed_number,patient_name,source_date,source_type,1-(embedding<=>$1::vector) AS similarity FROM rag_embeddings WHERE user_id=$2 AND institution_id=$3 AND source_date>=NOW()-INTERVAL '${daysBack} days' AND embedding IS NOT NULL ORDER BY embedding<=>$1::vector LIMIT $4`, [embStr, req.userId, institution_id, resultLimit])
        : await query(`SELECT chunk_text,bed_number,patient_name,source_date,source_type,1-(embedding<=>$1::vector) AS similarity FROM rag_embeddings WHERE user_id=$2 AND source_date>=NOW()-INTERVAL '${daysBack} days' AND embedding IS NOT NULL ORDER BY embedding<=>$1::vector LIMIT $3`, [embStr, req.userId, resultLimit]);
      results = q.rows;
    } else {
      const q = await query(`SELECT chunk_text,bed_number,patient_name,source_date,source_type,0.5 AS similarity FROM rag_embeddings WHERE user_id=$1 AND source_date>=NOW()-INTERVAL '${daysBack} days' AND chunk_text ILIKE $2 ORDER BY source_date DESC LIMIT $3`, [req.userId, `%${searchQuery}%`, resultLimit]);
      results = q.rows;
    }
    return res.json({ results, total: results.length });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.get('/api/rag/index', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(`SELECT id,source_type,source_date,bed_number,patient_name,LEFT(chunk_text,100) AS preview,chunk_index,created_at,(embedding IS NOT NULL) AS has_embedding FROM rag_embeddings WHERE user_id=$1 ORDER BY source_date DESC,chunk_index ASC LIMIT 200`, [req.userId]);
    const stats = await query(`SELECT COUNT(*) AS total_chunks,COUNT(DISTINCT source_date) AS total_days,SUM(LENGTH(chunk_text)) AS total_chars,MIN(source_date) AS oldest_date,MAX(source_date) AS newest_date,COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) AS chunks_with_embedding FROM rag_embeddings WHERE user_id=$1`, [req.userId]);
    return res.json({ chunks: result.rows, stats: stats.rows[0] });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.get('/api/rag/backup', authenticateToken, async (req: any, res: any) => {
  try {
    const chunks = await query(`SELECT source_type,source_date,bed_number,patient_name,chunk_text,chunk_index,metadata,created_at FROM rag_embeddings WHERE user_id=$1 ORDER BY source_date DESC,chunk_index ASC`, [req.userId]);
    const institutions = await query('SELECT name,short_name,city,state,total_beds,icu_type,created_at FROM institutions WHERE user_id=$1', [req.userId]);
    const backup = { exported_at: new Date().toISOString(), user_id: req.userId, version: '2.0.0', stats: { total_chunks: chunks.rows.length, total_institutions: institutions.rows.length }, rag_index: chunks.rows, institutions: institutions.rows };
    try {
      await query(`INSERT INTO rag_backups (user_id, total_chunks, total_size_bytes, backup_data) VALUES ($1,$2,$3,$4)`, [req.userId, chunks.rows.length, JSON.stringify(backup).length, JSON.stringify(backup)]);
    } catch (_) {}
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="rag-backup-${new Date().toISOString().split('T')[0]}.json"`);
    return res.json(backup);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.delete('/api/rag/index', authenticateToken, async (req: any, res: any) => {
  try {
    const { days_older_than } = req.body;
    if (days_older_than) {
      await query(`DELETE FROM rag_embeddings WHERE user_id=$1 AND source_date < NOW() - ($2 || ' days')::INTERVAL`, [req.userId, days_older_than]);
    } else {
      await query('DELETE FROM rag_embeddings WHERE user_id=$1', [req.userId]);
    }
    return res.json({ success: true });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// ============================================================
// ROTAS: SISOP — VERSÕES E ATUALIZAÇÕES
// ============================================================

app.get('/api/sisop/versions', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query('SELECT * FROM system_versions ORDER BY component ASC');
    return res.json(result.rows);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.post('/api/sisop/check-updates', authenticateToken, async (req: any, res: any) => {
  try {
    const updates: any[] = [];
    try {
      const ghRes = await fetch('https://api.github.com/repos/rodrigorochalima/app-rounder/releases/latest', { headers: { 'User-Agent': 'app-rounder-sisop' } });
      if (ghRes.ok) {
        const release: any = await ghRes.json();
        const latestVersion = release.tag_name?.replace('v', '') || '2.0.0';
        await query(`UPDATE system_versions SET latest_version=$1,last_checked=NOW(),update_available=($1!=installed_version),changelog=$2 WHERE component='App Rounder'`, [latestVersion, release.body || '']);
        updates.push({ component: 'App Rounder', latest: latestVersion });
      }
    } catch (_) {}
    try {
      const pgvRes = await fetch('https://api.github.com/repos/pgvector/pgvector/releases/latest', { headers: { 'User-Agent': 'app-rounder-sisop' } });
      if (pgvRes.ok) {
        const release: any = await pgvRes.json();
        const latestVersion = release.tag_name?.replace('v', '') || '0.8.0';
        await query(`UPDATE system_versions SET latest_version=$1,last_checked=NOW(),update_available=($1!=installed_version) WHERE component='pgvector'`, [latestVersion]);
        updates.push({ component: 'pgvector', latest: latestVersion });
      }
    } catch (_) {}
    await query('UPDATE system_versions SET last_checked=NOW() WHERE last_checked IS NULL');
    const result = await query('SELECT * FROM system_versions ORDER BY component ASC');
    return res.json({ checked: updates.length, versions: result.rows });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.get('/api/sisop/backups', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(`SELECT id,backup_date,total_chunks,total_size_bytes,filename,status FROM rag_backups WHERE user_id=$1 ORDER BY backup_date DESC LIMIT 20`, [req.userId]);
    return res.json(result.rows);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// ---- FRONTEND (apenas em modo não-serverless) ----

if (process.env.NODE_ENV !== 'production' || process.env.SERVE_STATIC === 'true') {
  const staticPath = path.resolve(__dirname, '..', 'dist', 'public');
  app.use(express.static(staticPath));
  app.get('*', (_req: any, res: any) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Exportar o app para uso como serverless function na Vercel
export default app;

// Iniciar servidor local (apenas quando executado diretamente)
if (process.env.NODE_ENV !== 'production') {
  const server = createServer(app);
  initDatabase().then(() => {
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${port}/`);
      console.log(`📊 Health check: http://localhost:${port}/api/health`);
    });
  });
}
