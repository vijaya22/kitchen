import { handleChat } from '../src/handler.js';

export const config = { runtime: 'edge' };

export default async function (request: Request): Promise<Response> {
  const clientAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined;
  return handleChat({ request, clientAddress });
}
