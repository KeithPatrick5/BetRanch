import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { publicState, rotateSeed } from "@/lib/store";
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = await request.json().catch(() => ({})); const rotation = rotateSeed(user, body.clientSeed); return NextResponse.json({ rotation, state: publicState(user.id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Seed rotation failed" }, { status: 400 }); }
}
