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

// ---- HEALTH ----

app.get('/api/health', async (_req: any, res: any) => {
  try {
    await query('SELECT 1');
    return res.json({ status: 'ok', database: 'neon-connected', timestamp: new Date().toISOString() });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
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
