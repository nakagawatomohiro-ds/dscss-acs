import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, logActivity } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { action, stageId, classId, detail } = await req.json();

    let userId = null;
    let userEmail = session?.user?.email ?? null;
    if (userEmail) {
      const user = await getUserByEmail(userEmail);
      userId = user?.id ?? null;
    }

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
    const ua = req.headers.get("user-agent") ?? null;

    await logActivity({
      userId,
      userEmail,
      action: action ?? "page_view",
      stageId: stageId ?? null,
      classId: classId ?? null,
      score: null,
      detail: detail ?? null,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Log error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
