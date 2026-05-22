import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.CREWAI_SERVICE_URL || 'http://127.0.0.1:8000';

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const target = `${BACKEND}/${path.join('/')}`;

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (k.toLowerCase() !== 'host') headers.set(k, v);
  });

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  });

  const resHeaders = new Headers();
  upstream.headers.forEach((v, k) => resHeaders.set(k, v));

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
