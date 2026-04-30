import type { IncomingMessage, ServerResponse } from 'node:http'

import { handleSummaryRequest } from './_lib/handlers.js'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await handleSummaryRequest(req, res)
}
