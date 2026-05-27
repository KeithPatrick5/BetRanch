import { NextResponse } from "next/server";
import { liveFeed } from "@/lib/store";
export async function GET() { return NextResponse.json({ feed: liveFeed() }); }
