import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { pickHilo } from "@/lib/store";
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = await request.json(); return NextResponse.json({ session: pickHilo(user, String(body.sessionId), String(body.choice) as "higher" | "lower") }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Hilo pick failed" }, { status: 400 }); }
}
