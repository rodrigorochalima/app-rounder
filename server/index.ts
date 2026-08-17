/**
 * Servidor Express - App Rounder
 * Backend completo com Neon PostgreSQL (substitui Supabase)
 * Compatível com Vercel Serverless Functions
 */
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, query } from './db.js';
import { Resend } from 'resend';
import multer from 'multer';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const resend = new Resend(process.env.RESEND_API_KEY || '');
const APP_URL = process.env.APP_URL || 'https://app-rounder.vercel.app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredJwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !configuredJwtSecret) {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}
const JWT_SECRET = configuredJwtSecret || 'app-rounder-development-secret-only';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;
const AUTH_COOKIE_NAME = 'rounder_rt';
const API_KEY_ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET || JWT_SECRET;
const ALLOWED_ORIGINS = new Set([APP_URL, 'https://app-rounder.vercel.app', 'http://localhost:5173']);

type RateLimitOptions = { windowMs: number; max: number; keyPrefix: string };
type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function createRateLimiter(options: RateLimitOptions) {
  return (req: any, res: any, next: any) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${getClientIp(req)}:${String(req.body?.email || '').toLowerCase()}`;
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
    }
    return next();
  };
}

const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8, keyPrefix: 'login' });
const resetRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 4, keyPrefix: 'password-reset' });

function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function parseCookies(req: any): Record<string, string> {
  const cookie = req.headers.cookie || '';
  return cookie.split(';').reduce((cookies: Record<string, string>, item: string) => {
    const index = item.indexOf('=');
    if (index > 0) cookies[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
    return cookies;
  }, {});
}

function setRefreshCookie(res: any, token: string, remember: boolean) {
  const attributes = [`${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`, 'HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/api/auth'];
  if (remember) attributes.push(`Max-Age=${REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60}`);
  res.setHeader('Set-Cookie', attributes.join('; '));
}

function clearRefreshCookie(res: any) {
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=0`);
}

function getAccessToken(user: any): string {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function encryptApiSecret(secret: string): { encrypted: string; iv: string } {
  const key = createHash('sha256').update(API_KEY_ENCRYPTION_SECRET).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return { encrypted: encrypted.toString('base64'), iv: `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}` };
}

function decryptApiSecret(encrypted: string, encryptionIv: string): string {
  // Compatibilidade temporária com a codificação Base64 legada. A chave será recifrada ao ser cadastrada novamente.
  if (!encryptionIv?.includes('.')) return Buffer.from(encrypted, 'base64').toString('utf8');
  const [ivBase64, tagBase64] = encryptionIv.split('.');
  const key = createHash('sha256').update(API_KEY_ENCRYPTION_SECRET).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}

function mapApiKeyMetadata(row: any) {
  const { encrypted_key, encryption_iv, ...metadata } = row;
  return metadata;
}

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
    const schemaCandidates = [
      path.resolve(__dirname, 'schema.sql'),
      path.resolve(process.cwd(), 'server/schema.sql'),
    ];
    const schemaPath = schemaCandidates.find(existsSync);
    if (!schemaPath) throw new Error('Arquivo de migração schema.sql não encontrado no runtime.');
    const schema = readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    dbInitialized = true;
    console.log('✅ Schema do banco de dados inicializado');
  } catch (error: any) {
    console.error('❌ Erro ao inicializar schema:', error.message);
    throw error;
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
  return randomBytes(48).toString('base64url');
}

function generateResetToken(): string {
  return randomBytes(48).toString('base64url');
}

async function createRefreshSession(userId: string, req: any): Promise<string> {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);
  const ipHash = hashOpaqueToken(getClientIp(req));
  await query(
    `INSERT INTO refresh_tokens (user_id, token, token_hash, session_id, expires_at, user_agent, ip_hash, last_used_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [userId, randomUUID(), hashOpaqueToken(refreshToken), randomUUID(), expiresAt.toISOString(), userAgent, ipHash]
  );
  return refreshToken;
}

async function revokeRefreshSession(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [hashOpaqueToken(refreshToken)]);
}

function requireRole(...allowedRoles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const profile = await query('SELECT role FROM user_profiles WHERE user_id = $1', [req.userId]);
      const role = profile.rows[0]?.role || 'rotineiro';
      if (!allowedRoles.includes(role)) return res.status(403).json({ error: 'Acesso restrito ao perfil autorizado.' });
      req.userRole = role;
      return next();
    } catch {
      return res.status(500).json({ error: 'Não foi possível validar a autorização.' });
    }
  };
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
app.disable('x-powered-by');

app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Permissions-Policy', 'camera=(), geolocation=(self), microphone=(self), payment=()');
  res.header('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' https://api.cerebras.ai https://api.groq.com https://generativelanguage.googleapis.com https://api.openai.com https://api.deepseek.com https://dashscope.aliyuncs.com");
  if (req.method === 'OPTIONS') return origin && !ALLOWED_ORIGINS.has(origin) ? res.sendStatus(403) : res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Inicializar banco antes de cada request em serverless
app.use(async (_req: any, res: any, next: any) => {
  try {
    await initDatabase();
    next();
  } catch {
    res.status(503).json({ error: 'Serviço temporariamente indisponível durante a inicialização segura.' });
  }
});

// ---- AUTH ----

app.post('/api/auth/signup', loginRateLimit, async (req: any, res: any) => {
  try {
    const { email, password, fullName, rememberMe = true } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    if (String(password).length < 10) return res.status(400).json({ error: 'Use uma senha com pelo menos 10 caracteres.' });
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
    const refreshToken = await createRefreshSession(user.id, req);
    setRefreshCookie(res, refreshToken, rememberMe !== false);
    const profileResult = await query('SELECT * FROM user_profiles WHERE user_id = $1', [user.id]);
    return res.status(201).json({ user: mapProfile(user, profileResult.rows[0]), accessToken: getAccessToken(user), expiresAt: Math.floor(Date.now() / 1000) + 15 * 60 });
  } catch (error: any) {
    console.error('Erro signup:', error.message);
    return res.status(500).json({ error: 'Erro interno ao criar conta' });
  }
});

app.post('/api/auth/login', loginRateLimit, async (req: any, res: any) => {
  try {
    const { email, password, rememberMe = true } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'Email ou senha incorretos' });
    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Email ou senha incorretos' });
    const refreshToken = await createRefreshSession(user.id, req);
    setRefreshCookie(res, refreshToken, rememberMe !== false);
    const profileResult = await query('SELECT * FROM user_profiles WHERE user_id = $1', [user.id]);
    return res.json({ user: mapProfile(user, profileResult.rows[0]), accessToken: getAccessToken(user), expiresAt: Math.floor(Date.now() / 1000) + 15 * 60 });
  } catch (error: any) {
    console.error('Erro login:', error.message);
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

app.post('/api/auth/refresh', async (req: any, res: any) => {
  try {
    const refreshToken = parseCookies(req)[AUTH_COOKIE_NAME] || req.body?.refreshToken;
    if (!refreshToken) return res.status(403).json({ error: 'Sessão expirada. Entre novamente.' });
    const tokenHash = hashOpaqueToken(refreshToken);
    const tokenResult = await query(
      `SELECT * FROM refresh_tokens
       WHERE ((token_hash = $1) OR (token = $2 AND token_hash IS NULL))
         AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash, refreshToken]
    );
    if (tokenResult.rows.length === 0) return res.status(403).json({ error: 'Sessão expirada. Entre novamente.' });
    const session = tokenResult.rows[0];
    const userResult = await query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (userResult.rows.length === 0) return res.status(403).json({ error: 'Sessão inválida.' });
    await query('UPDATE refresh_tokens SET revoked_at = NOW(), last_used_at = NOW() WHERE id = $1', [session.id]);
    const nextRefreshToken = await createRefreshSession(session.user_id, req);
    setRefreshCookie(res, nextRefreshToken, true);
    return res.json({ accessToken: getAccessToken(userResult.rows[0]), expiresAt: Math.floor(Date.now() / 1000) + 15 * 60 });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao renovar sessão' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req: any, res: any) => {
  try {
    const refreshToken = parseCookies(req)[AUTH_COOKIE_NAME] || req.body?.refreshToken;
    await revokeRefreshSession(refreshToken);
    clearRefreshCookie(res);
    return res.json({ message: 'Logout realizado com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

app.post('/api/auth/logout-all', authenticateToken, async (req: any, res: any) => {
  try {
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [req.userId]);
    clearRefreshCookie(res);
    return res.json({ message: 'Sessões encerradas com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao encerrar sessões' });
  }
});

app.get('/api/auth/sessions', authenticateToken, async (req: any, res: any) => {
  try {
    const sessions = await query(
      `SELECT id, session_id, user_agent, created_at, last_used_at, expires_at
       FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY last_used_at DESC NULLS LAST, created_at DESC`,
      [req.userId]
    );
    return res.json({ data: sessions.rows });
  } catch {
    return res.status(500).json({ error: 'Erro ao listar sessões' });
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
app.post('/api/auth/reset-password', resetRateLimit, async (req: any, res: any) => {
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
    if (newPassword.length < 10) return res.status(400).json({ error: 'A senha deve ter pelo menos 10 caracteres' });

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

    // Invalidar todas as sessões ativas após redefinição de senha.
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [resetRecord.user_id]);

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
    if (!newPassword || newPassword.length < 10) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 10 caracteres' });
    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.userId]);
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [req.userId]);
    clearRefreshCookie(res);
    return res.json({ message: 'Senha atualizada. Faça login novamente em todos os dispositivos.' });
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

// ---- DIREITOS DE PRIVACIDADE E GESTÃO DE CONTA ----
const LEGAL_DOCUMENT_VERSIONS = {
  terms: '2026-08-17',
  privacy: '2026-08-17',
  clinical_ai_notice: '2026-08-17',
} as const;

app.post('/api/legal/acceptance', authenticateToken, async (req: any, res: any) => {
  try {
    const type = String(req.body?.document_type || '');
    if (!(type in LEGAL_DOCUMENT_VERSIONS)) return res.status(400).json({ error: 'Documento legal inválido.' });
    const version = LEGAL_DOCUMENT_VERSIONS[type as keyof typeof LEGAL_DOCUMENT_VERSIONS];
    await query(
      `INSERT INTO legal_acceptances (user_id, document_type, document_version, ip_hash, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.userId, type, version, hashOpaqueToken(getClientIp(req)), String(req.headers['user-agent'] || '').slice(0, 500)]
    );
    return res.status(201).json({ document_type: type, document_version: version, accepted_at: new Date().toISOString() });
  } catch {
    return res.status(500).json({ error: 'Não foi possível registrar o aceite legal.' });
  }
});

app.get('/api/legal/acceptances', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(
      `SELECT document_type, document_version, accepted_at FROM legal_acceptances
       WHERE user_id = $1 ORDER BY accepted_at DESC`,
      [req.userId]
    );
    return res.json({ data: result.rows, versions: LEGAL_DOCUMENT_VERSIONS });
  } catch {
    return res.status(500).json({ error: 'Não foi possível consultar os aceites legais.' });
  }
});

app.get('/api/account/export', authenticateToken, async (req: any, res: any) => {
  try {
    const [account, profile, rules, rounds, institutions, doctor, patients, pendingItems, rag, apiKeys, acceptances] = await Promise.all([
      query('SELECT email, email_verified, created_at, updated_at FROM users WHERE id = $1', [req.userId]),
      query('SELECT full_name, phone, specialty, crm, crm_state, hospital_name, hospital_phone, position, personal_phone, created_at, updated_at FROM user_profiles WHERE user_id = $1', [req.userId]),
      query('SELECT rule_text, is_active, order_index, created_at, updated_at FROM round_rules WHERE user_id = $1 ORDER BY order_index', [req.userId]),
      query('SELECT round_date, round_name, transcription_text, generated_document, raw_input_text, llm_provider, tokens_used, created_at FROM round_history WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]),
      query('SELECT name, short_name, address, city, state, phone, email, cnpj, cnes, gps_lat, gps_lng, maps_url, total_beds, icu_type, is_default, created_at, updated_at FROM institutions WHERE user_id = $1', [req.userId]),
      query('SELECT full_name, crm, crm_state, specialty, rqe, phone, email, show_crm, show_specialty, show_phone, show_email, show_qrcode, qrcode_url, footer_text, created_at, updated_at FROM doctor_profiles WHERE user_id = $1', [req.userId]),
      query('SELECT * FROM clinical_patients WHERE user_id = $1 ORDER BY bed_number', [req.userId]),
      query('SELECT * FROM clinical_pending_items WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]),
      query('SELECT source_type, source_date, bed_number, patient_name, chunk_text, chunk_index, metadata, created_at, expires_at FROM rag_embeddings WHERE user_id = $1 ORDER BY source_date DESC, chunk_index', [req.userId]),
      query('SELECT id, provider, name, is_active, is_default, monthly_limit, current_month_usage, created_at, updated_at FROM user_api_keys WHERE user_id = $1', [req.userId]),
      query('SELECT document_type, document_version, accepted_at FROM legal_acceptances WHERE user_id = $1 ORDER BY accepted_at DESC', [req.userId]),
    ]);
    return res.json({
      exported_at: new Date().toISOString(),
      format_version: '1.0',
      account: account.rows[0] || null,
      profile: profile.rows[0] || null,
      rules: rules.rows,
      rounds: rounds.rows,
      institutions: institutions.rows,
      doctor_profile: doctor.rows[0] || null,
      clinical_patients: patients.rows,
      clinical_pending_items: pendingItems.rows,
      rag_chunks: rag.rows,
      api_key_metadata: apiKeys.rows,
      legal_acceptances: acceptances.rows,
    });
  } catch (error: any) {
    console.error('Falha na exportação de dados:', error?.message);
    return res.status(500).json({ error: 'Não foi possível preparar sua exportação de dados.' });
  }
});

app.delete('/api/account', authenticateToken, async (req: any, res: any) => {
  const client = await pool.connect();
  try {
    const { currentPassword, confirmation } = req.body || {};
    if (confirmation !== 'EXCLUIR MINHA CONTA') return res.status(400).json({ error: 'Digite EXCLUIR MINHA CONTA para confirmar.' });
    const userResult = await client.query('SELECT password_hash FROM users WHERE id = $1 FOR UPDATE', [req.userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Conta não encontrada.' });
    const passwordOk = await bcrypt.compare(String(currentPassword || ''), userResult.rows[0].password_hash);
    if (!passwordOk) return res.status(401).json({ error: 'Senha atual incorreta.' });
    await client.query('BEGIN');
    await client.query('INSERT INTO account_deletion_requests (user_id, confirmation_method) VALUES ($1, $2)', [req.userId, 'password']);
    await client.query('DELETE FROM users WHERE id = $1', [req.userId]);
    await client.query('COMMIT');
    clearRefreshCookie(res);
    return res.json({ message: 'Sua conta e os dados associados foram excluídos.' });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Falha na exclusão de conta:', error?.message);
    return res.status(500).json({ error: 'Não foi possível concluir a exclusão da conta. Tente novamente ou entre em contato pelo suporte.' });
  } finally {
    client.release();
  }
});

// ---- API KEYS ----

app.get('/api/api-keys', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await query(
      `SELECT id, user_id, provider, name, is_active, is_default, monthly_limit, current_month_usage,
              cost_per_million_tokens, last_used_at, notes, created_at, updated_at
       FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    return res.json({ data: result.rows });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar API keys' });
  }
});

app.post('/api/api-keys', authenticateToken, async (req: any, res: any) => {
  try {
    const { provider, name, api_key, encrypted_key, monthly_limit, cost_per_million_tokens, notes } = req.body;
    if (!provider || !api_key && !encrypted_key) return res.status(400).json({ error: 'Provedor e chave de API são obrigatórios.' });
    const rawKey = api_key || Buffer.from(String(encrypted_key), 'base64').toString('utf8');
    if (!rawKey || rawKey.length < 8) return res.status(400).json({ error: 'Chave de API inválida.' });
    const encrypted = encryptApiSecret(rawKey);
    const result = await query(
      `INSERT INTO user_api_keys (user_id, provider, name, encrypted_key, encryption_iv, monthly_limit, cost_per_million_tokens, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, provider, name || `${provider} Key`, encrypted.encrypted, encrypted.iv, monthly_limit || 1000, cost_per_million_tokens || 0, notes || '']
    );
    return res.status(201).json({ data: mapApiKeyMetadata(result.rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar API key.' });
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
    return res.json({ data: mapApiKeyMetadata(result.rows[0]) });
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

// ---- PROXY SEGURO DE IA ----
// As chaves ficam cifradas no banco e são decriptadas somente no runtime do servidor.
const LLM_PROVIDERS: Record<string, { endpoint: string; defaultModel: string }> = {
  cerebras: { endpoint: 'https://api.cerebras.ai/v1/chat/completions', defaultModel: 'llama-3.3-70b' },
  deepseek: { endpoint: 'https://api.deepseek.com/v1/chat/completions', defaultModel: 'deepseek-chat' },
  groq: { endpoint: 'https://api.groq.com/openai/v1/chat/completions', defaultModel: 'llama-3.1-8b-instant' },
  qwen: { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', defaultModel: 'qwen-turbo' },
  openai: { endpoint: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o-mini' },
};

async function getUsableApiKey(userId: string, provider: string) {
  const keyResult = await query(
    `SELECT id, encrypted_key, encryption_iv, monthly_limit, current_month_usage
     FROM user_api_keys WHERE user_id = $1 AND provider = $2 AND is_active = true
     ORDER BY is_default DESC, created_at ASC LIMIT 1`,
    [userId, provider]
  );
  if (keyResult.rows.length === 0) return null;
  const key = keyResult.rows[0];
  if (key.monthly_limit > 0 && key.current_month_usage >= key.monthly_limit) {
    throw new Error('O limite mensal configurado para este provedor foi atingido.');
  }
  return { id: key.id, secret: decryptApiSecret(key.encrypted_key, key.encryption_iv) };
}

async function registerServerUsage(userId: string, apiKeyId: string, provider: string, model: string, startedAt: number, payload: any, errorMessage?: string) {
  const tokens = Number(payload?.usage?.total_tokens || 0);
  const duration = Date.now() - startedAt;
  await query(
    `INSERT INTO user_api_usage_logs (user_id, api_key_id, provider, tokens_used, cost_usd, duration_ms, model_used, success, error_message, request_type)
     VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, 'generation')`,
    [userId, apiKeyId, provider, tokens, duration, model, !errorMessage, errorMessage || null]
  ).catch(() => undefined);
  await query(
    `UPDATE user_api_keys SET current_month_usage = current_month_usage + 1, usage_count = usage_count + 1,
     total_tokens_used = total_tokens_used + $1, last_used_at = NOW() WHERE id = $2 AND user_id = $3`,
    [tokens, apiKeyId, userId]
  ).catch(() => undefined);
}

app.post('/api/ai/chat', authenticateToken, async (req: any, res: any) => {
  const startedAt = Date.now();
  let key: { id: string; secret: string } | null = null;
  let provider = '';
  let model = '';
  try {
    provider = String(req.body?.provider || '').toLowerCase();
    const config = LLM_PROVIDERS[provider];
    if (!config) return res.status(400).json({ error: 'Provedor de IA não suportado.' });
    const system = String(req.body?.system || '').slice(0, 12000);
    const prompt = String(req.body?.prompt || '');
    if (!prompt.trim()) return res.status(400).json({ error: 'O conteúdo para geração é obrigatório.' });
    if (prompt.length > 180000) return res.status(413).json({ error: 'O conteúdo é grande demais para processamento seguro. Divida o documento em partes menores.' });
    model = String(req.body?.model || config.defaultModel).slice(0, 100);
    key = await getUsableApiKey(req.userId, provider);
    if (!key) return res.status(409).json({ error: `Configure uma API key ativa para ${provider} antes de gerar o round.` });
    const upstream = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.secret}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: Math.min(Math.max(Number(req.body?.temperature ?? 0.3), 0), 1),
        max_tokens: Math.min(Math.max(Number(req.body?.max_tokens ?? 8000), 256), 8000),
      }),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      await registerServerUsage(req.userId, key.id, provider, model, startedAt, payload, `Upstream HTTP ${upstream.status}`);
      return res.status(502).json({ error: 'O provedor de IA não conseguiu processar esta solicitação. Tente novamente ou confira a chave configurada.' });
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'O provedor retornou uma resposta vazia. Tente novamente.' });
    await registerServerUsage(req.userId, key.id, provider, model, startedAt, payload);
    return res.json({ content, provider, model, usage: payload.usage || null });
  } catch (error: any) {
    if (key) await registerServerUsage(req.userId, key.id, provider, model, startedAt, null, error?.message || 'Erro interno');
    console.error('Falha no proxy de IA:', error?.message);
    return res.status(500).json({ error: 'Não foi possível processar a geração com segurança.' });
  }
});

app.post('/api/ai/transcribe', authenticateToken, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de áudio.' });
    const key = await getUsableApiKey(req.userId, 'groq');
    if (!key) return res.status(409).json({ error: 'Configure uma API key Groq ativa para transcrever áudio.' });
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/mpeg' }), req.file.originalname);
    form.append('model', 'whisper-large-v3');
    form.append('language', 'pt');
    form.append('response_format', 'text');
    const upstream = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key.secret}` }, body: form });
    if (!upstream.ok) return res.status(502).json({ error: 'A transcrição de áudio não foi concluída pelo provedor.' });
    const text = await upstream.text();
    return res.json({ text, source: req.file.originalname });
  } catch (error: any) {
    console.error('Falha na transcrição segura:', error?.message);
    return res.status(500).json({ error: 'Não foi possível transcrever este áudio.' });
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

    // PDF: usa a API v2 do pdf-parse, compatível com runtime Node/serverless.
    if (ext === 'pdf' || mimetype === 'application/pdf') {
      let parser: { getText: () => Promise<{ text?: string; total?: number }>; destroy: () => Promise<void> } | null = null;
      try {
        // Importação tardia: algumas versões do pdf-parse inicializam APIs gráficas
        // ausentes no runtime serverless se forem carregadas durante o boot da função.
        const { PDFParse } = await import('pdf-parse');
        parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        const text = data.text?.trim() || '';
        if (!text) return res.status(422).json({ error: 'Não foi possível localizar texto neste PDF. Se ele for uma imagem digitalizada, envie uma transcrição ou use um PDF com texto selecionável.' });
        return res.json({ text, pages: data.total, source: originalname });
      } catch (pdfErr: any) {
        console.error('Falha na extração de PDF:', pdfErr?.message);
        return res.status(422).json({ error: 'Não foi possível processar este PDF. Verifique se o arquivo não está protegido por senha ou corrompido.' });
      } finally {
        await parser?.destroy().catch(() => undefined);
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

app.get('/api/sisop/versions', authenticateToken, requireRole('sisop', 'admin'), async (req: any, res: any) => {
  try {
    const result = await query('SELECT * FROM system_versions ORDER BY component ASC');
    return res.json(result.rows);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.post('/api/sisop/check-updates', authenticateToken, requireRole('sisop', 'admin'), async (req: any, res: any) => {
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
    // A ausência de release pública não pode manter uma data antiga na interface.
    // O painel diferencia “sem atualização disponível” de “nunca verificado”.
    await query('UPDATE system_versions SET last_checked=NOW()');
    const result = await query('SELECT * FROM system_versions ORDER BY component ASC');
    return res.json({ checked: updates.length, versions: result.rows, checked_at: new Date().toISOString() });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.get('/api/sisop/backups', authenticateToken, requireRole('sisop', 'admin'), async (req: any, res: any) => {
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
