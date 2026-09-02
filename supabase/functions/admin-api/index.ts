import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const encoder = new TextEncoder();

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

function secureEqual(first: Uint8Array, second: Uint8Array) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }
  return difference === 0;
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

async function createToken(secret: string) {
  const payload = base64Url(encoder.encode(JSON.stringify({
    expiresAt: Date.now() + 30 * 60 * 1000,
    nonce: crypto.randomUUID(),
  })));
  return `${payload}.${await sign(payload, secret)}`;
}

async function isValidToken(token: string, secret: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expectedSignature = await sign(payload, secret);
  if (!secureEqual(encoder.encode(signature), encoder.encode(expectedSignature))) return false;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as { expiresAt?: number };
    return typeof decoded.expiresAt === 'number' && decoded.expiresAt > Date.now();
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const adminUsername = Deno.env.get('ADMIN_USERNAME');
  const adminPassword = Deno.env.get('ADMIN_PASSWORD');
  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET');
  if (!adminUsername || !adminPassword || !tokenSecret) {
    return json({ success: false, message: 'El acceso administrativo no está configurado' }, 503);
  }

  const pathname = new URL(request.url).pathname;

  if (request.method === 'POST' && pathname.endsWith('/api/admin/login/')) {
    const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
    const validUsername = secureEqual(await digest(body.username || ''), await digest(adminUsername));
    const validPassword = secureEqual(await digest(body.password || ''), await digest(adminPassword));
    if (!validUsername || !validPassword) {
      return json({ success: false, message: 'Usuario o contraseña incorrectos' }, 401);
    }
    return json({ success: true, token: await createToken(tokenSecret) });
  }

  if (request.method === 'POST' && pathname.endsWith('/api/admin/logout/')) {
    return json({ success: true });
  }

  if (request.method === 'GET' && pathname.endsWith('/api/admin/respuestas/')) {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!await isValidToken(token, tokenSecret)) {
      return json({ success: false, message: 'La sesión administrativa no es válida' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
    const { data, error } = await supabase
      .from('respuestas')
      .select('*')
      .order('fecha_registro', { ascending: false })
      .limit(500);
    if (error) return json({ success: false, message: 'No fue posible consultar la base de datos' }, 500);
    return json({ success: true, data: data || [] });
  }

  return json({ success: false, message: 'Ruta no encontrada' }, 404);
});