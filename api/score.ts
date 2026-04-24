import type { IncomingMessage, ServerResponse } from 'node:http'

import { handleScoreRequest } from './_lib/handlers'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await handleScoreRequest(req, res)
}
