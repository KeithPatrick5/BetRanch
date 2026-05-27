import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { publicState } from "@/lib/store";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    return NextResponse.json(publicState(user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "State failed" }, { status: 500 });
  }
}
