import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.CREWAI_SERVICE_URL || 'http://127.0.0.1:8000';

// Only these path prefixes may be reached through the proxy. Everything else is
// rejected so the proxy cannot be used to hit arbitrary backend/internal routes.
const ALLOWED_PREFIXES = ['auth/', 'research/', 'health'];

// Headers we refuse to forward in either direction (hop-by-hop + host).
const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function isAllowed(path: string[]): boolean {
  const joined = path.join('/');
  // Block path traversal and enforce the prefix allowlist.
  if (joined.includes('..')) return false;
  return ALLOWED_PREFIXES.some((p) => (p.endsWith('/') ? joined.startsWith(p) : joined === p));
}

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  if (!isAllowed(path)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const target = `${BACKEND}/${path.join('/')}`;

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v);
  });

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  });

  const resHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) resHeaders.set(k, v);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET    = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => proxy(req, params);
export const POST   = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => proxy(req, params);
export const PUT    = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => proxy(req, params);
export const PATCH  = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => proxy(req, params);
export const DELETE = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => proxy(req, params);
