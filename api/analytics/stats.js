import { handleRequest } from "../../server/server.mjs";

export default async function analyticsStatsRoute(request, response) {
  await handleRequest(request, response);
}
