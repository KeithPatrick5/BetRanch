import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { placeBet, publicState } from "@/lib/store";
import type { GameKey } from "@/lib/gameEngine";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const bet = placeBet(user, { game: body.game as GameKey, wager: Number(body.wager), params: body.params, idempotencyKey: body.idempotencyKey });
    return NextResponse.json({ bet, state: publicState(user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bet failed" }, { status: 400 });
  }
}
