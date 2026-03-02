import { neon } from "@neondatabase/serverless";

function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  return neon(databaseUrl);
}

// ── ユーザー関連 ──

export async function getOrCreateUser(profile: {
  email: string;
  name?: string | null;
  image?: string | null;
  googleId?: string;
}) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO users (email, name, image, google_id)
    VALUES (${profile.email}, ${profile.name ?? null}, ${profile.image ?? null}, ${profile.googleId ?? null})
    ON CONFLICT (email) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, users.name),
      image = COALESCE(EXCLUDED.image, users.image),
      google_id = COALESCE(EXCLUDED.google_id, users.google_id)
    RETURNING id, email, name, image
  `;
  return rows[0];
}

export async function getUserByEmail(email: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, email, name, image FROM users WHERE email = ${email}
  `;
  return rows[0] ?? null;
}

// ── 問題取得 ──

export async function getQuestions(stageId: number, classId: number) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, question_number, question_text, choice_a, choice_b, choice_c, choice_d, correct_index, explanation
    FROM questions
    WHERE stage_id = ${stageId} AND class_id = ${classId}
    ORDER BY question_number
  `;
  return rows;
}

export async function getStageClassCounts() {
  const sql = getDb();
  const rows = await sql`
    SELECT stage_id, class_id, COUNT(*) as count
    FROM questions
    GROUP BY stage_id, class_id
    ORDER BY stage_id, class_id
  `;
  return rows;
}

// ── クイズ結果関連 ──

export async function saveQuizResult(
  userId: number,
  stageId: number,
  classId: number,
  score: number,
  completedQuestions: number = 10
) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO quiz_results (user_id, stage_id, class_id, score, completed_questions, finished, updated_at)
    VALUES (${userId}, ${stageId}, ${classId}, ${score}, ${completedQuestions}, TRUE, NOW())
    ON CONFLICT (user_id, stage_id, class_id) DO UPDATE SET
      score = GREATEST(quiz_results.score, EXCLUDED.score),
      completed_questions = EXCLUDED.completed_questions,
      finished = TRUE,
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0];
}

export async function loadQuizResults(userId: number) {
  const sql = getDb();
  const rows = await sql`
    SELECT stage_id, class_id, score, completed_questions, finished
    FROM quiz_results
    WHERE user_id = ${userId}
    ORDER BY stage_id, class_id
  `;
  const results: Record<string, { score: number; completedQuestions: number; finished: boolean }> = {};
  for (const row of rows) {
    const key = `${row.stage_id}-${row.class_id}`;
    results[key] = {
      score: row.score,
      completedQuestions: row.completed_questions,
      finished: row.finished,
    };
  }
  return results;
}

// ── ログ関連 ──

export async function logActivity(params: {
  userId?: number | null;
  userEmail?: string | null;
  action: string;
  stageId?: number | null;
  classId?: number | null;
  score?: number | null;
  detail?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const sql = getDb();
  await sql`
    INSERT INTO activity_logs (user_id, user_email, action, stage_id, class_id, score, detail, ip_address, user_agent)
    VALUES (
      ${params.userId ?? null},
      ${params.userEmail ?? null},
      ${params.action},
      ${params.stageId ?? null},
      ${params.classId ?? null},
      ${params.score ?? null},
      ${params.detail ? JSON.stringify(params.detail) : null},
      ${params.ipAddress ?? null},
      ${params.userAgent ?? null}
    )
  `;
}
