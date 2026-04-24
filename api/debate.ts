import type { IncomingMessage, ServerResponse } from 'node:http'

import { handleDebateRequest } from '../server/handlers'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await handleDebateRequest(req, res)
}
