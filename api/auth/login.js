import { handleRequest } from "../../server/server.mjs";

export default async function authLoginRoute(request, response) {
  await handleRequest(request, response);
}
