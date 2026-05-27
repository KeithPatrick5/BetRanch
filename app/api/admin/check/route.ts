import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    return NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, displayName: admin.displayName, role: admin.role } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Admin role required" }, { status: 403 });
  }
}
