import { handleRequest } from "../server/server.mjs";

export default async function vercelApiHandler(request, response) {
  await handleRequest(request, response);
}
