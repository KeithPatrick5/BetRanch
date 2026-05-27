import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminSummary } from "@/lib/store";
export async function GET() { try { const admin = await requireAdmin(); return NextResponse.json(adminSummary(admin)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Admin summary failed" }, { status: 403 }); } }
