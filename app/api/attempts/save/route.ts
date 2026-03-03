import { NextResponse } from "next/server";
import { saveAttempt } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { deviceId, stageId, classId, score, totalQuestions } = await req.json();

    if (!deviceId || !stageId || !classId || score == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await saveAttempt({
      deviceId,
      stageId: Number(stageId),
      classId: Number(classId),
      score: Number(score),
      totalQuestions: totalQuestions ?? 10,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Save attempt error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
