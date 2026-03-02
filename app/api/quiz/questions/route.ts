import { NextResponse } from "next/server";
import { getQuestions } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const stageId = Number(url.searchParams.get("stage") ?? "1");
    const classId = Number(url.searchParams.get("class") ?? "1");

    if (stageId < 1 || stageId > 5 || classId < 1 || classId > 3) {
      return NextResponse.json({ error: "Invalid stage or class" }, { status: 400 });
    }

    const questions = await getQuestions(stageId, classId);
    return NextResponse.json(questions);
  } catch (e) {
    console.error("Questions fetch error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
