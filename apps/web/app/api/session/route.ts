import { handleSession } from "../../../api/session";

export async function POST(request: Request) {
  try {
    return Response.json(await handleSession(await request.json()));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid session request." }, { status: 400 });
  }
}
