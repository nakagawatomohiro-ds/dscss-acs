import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, loadQuizResults } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const results = await loadQuizResults(user.id);
    return NextResponse.json(results);
  } catch (e) {
    console.error("Quiz load error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
