import { handleRequest } from "../../server/server.mjs";

export default async function authSessionRoute(request, response) {
  await handleRequest(request, response);
}
