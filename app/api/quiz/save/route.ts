import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, saveQuizResult, logActivity } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stageId, classId, score, completedQuestions } = await req.json();

    if (typeof stageId !== "number" || stageId < 1 || stageId > 5) {
      return NextResponse.json({ error: "Invalid stageId" }, { status: 400 });
    }
    if (typeof classId !== "number" || classId < 1 || classId > 3) {
      return NextResponse.json({ error: "Invalid classId" }, { status: 400 });
    }
    if (typeof score !== "number" || score < 0 || score > 10) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await saveQuizResult(user.id, stageId, classId, score, completedQuestions ?? 10);

    // ログ記録
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
    const ua = req.headers.get("user-agent") ?? null;
    await logActivity({
      userId: user.id,
      userEmail: session.user.email,
      action: "quiz_complete",
      stageId,
      classId,
      score,
      detail: { completedQuestions: completedQuestions ?? 10, percentage: Math.round((score / 10) * 100) },
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("Quiz save error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
