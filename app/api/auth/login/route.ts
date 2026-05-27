import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth";
import { publicState } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginWithPassword(String(body.email || ""), String(body.password || ""));
    return NextResponse.json({ user: { email: user.email, displayName: user.displayName, role: user.role }, state: publicState(user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 401 });
  }
}
