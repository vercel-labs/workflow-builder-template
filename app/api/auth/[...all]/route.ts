import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    console.log('[Auth GET]', {
      path: url.pathname,
      search: url.search,
      timestamp: new Date().toISOString(),
    });

    const response = await handlers.GET(req);

    console.log('[Auth GET] Success:', {
      status: response.status,
      path: url.pathname,
    });

    return response;
  } catch (error) {
    console.error('[Auth GET] ERROR:', {
      path: req.url,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const clonedReq = req.clone();
    let body;

    try {
      body = await clonedReq.json();
      // Don't log passwords
      const sanitizedBody = { ...body };
      if (sanitizedBody.password) {
        sanitizedBody.password = '[REDACTED]';
      }
      console.log('[Auth POST]', {
        path: url.pathname,
        body: sanitizedBody,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.log('[Auth POST]', {
        path: url.pathname,
        body: 'Could not parse body',
        timestamp: new Date().toISOString(),
      });
    }

    const response = await handlers.POST(req);

    console.log('[Auth POST] Success:', {
      status: response.status,
      path: url.pathname,
    });

    return response;
  } catch (error) {
    console.error('[Auth POST] ERROR:', {
      path: req.url,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
      } : error,
      timestamp: new Date().toISOString(),
    });

    // Also log the full error object
    console.error('[Auth POST] Full Error Object:', error);

    throw error;
  }
}
