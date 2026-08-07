import { handleRequest } from "../../server/server.mjs";

export default async function analyticsRoute(request, response) {
  await handleRequest(request, response);
}
