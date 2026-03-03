// DSCSS-ACS クイズページ（AIクラウドセキュリティ版）
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { STAGES, CLASSES, STORAGE_KEY, POINTS_PER_CORRECT } from "../../lib/constants";

// Fisher-Yates シャッフル
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface DbQuestion {
  id: number;
  question_number: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_index: number;
  explanation: string;
}

interface ShuffledQuestion {
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
}

function shuffleChoices(q: DbQuestion): ShuffledQuestion {
  const choices = [q.choice_a, q.choice_b, q.choice_c, q.choice_d];
  const indices = [0, 1, 2, 3];
  const shuffledIndices = shuffleArray(indices);
  return {
    question: q.question_text,
    choices: shuffledIndices.map((i) => choices[i]),
    correct: shuffledIndices.indexOf(q.correct_index),
    explanation: q.explanation,
  };
}

const BRAND = {
  dark: "#0A1628",
  primary: "#1e3a5f",
  medium: "#2563eb",
  accent: "#3b82f6",
  light: "#60a5fa",
  bg: "#f0f4ff",
  bgCard: "#f0f7ff",
  border: "#c7d6ef",
};

// デバイスID生成（ログイン不要のダッシュボード追跡用）
function getDeviceId(): string {
  const key = "dscss_acs_device_id";
  if (typeof window === "undefined") return "unknown";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function QuizContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const stageNum = Math.min(5, Math.max(1, Number(searchParams.get("stage") ?? "1")));
  const classNum = Math.min(3, Math.max(1, Number(searchParams.get("class") ?? "1")));
  const stage = STAGES.find((s) => s.id === stageNum) ?? STAGES[0];
  const cls = CLASSES.find((c) => c.id === classNum) ?? CLASSES[0];

  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);

  // 問題をDBから取得
  useEffect(() => {
    setLoading(true);
    fetch(`/api/quiz/questions?stage=${stageNum}&class=${classNum}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch questions");
        return r.json();
      })
      .then((data: DbQuestion[]) => {
        if (data.length === 0) {
          setError("この組み合わせの問題はまだ登録されていません。");
          return;
        }
        const shuffled = data.map((q) => shuffleChoices(q));
        setQuestions(shuffled);
        setAnswers(new Array(shuffled.length).fill(null));
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError("問題の読み込みに失敗しました。");
        setLoading(false);
      });
  }, [stageNum, classNum]);

  // ログ記録
  useEffect(() => {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "quiz_start", stageId: stageNum, classId: classNum }),
    }).catch(() => {});
  }, [stageNum, classNum]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 16, color: "#64748b", background: BRAND.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔄</div>
          <p>問題を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 16, color: "#64748b", background: BRAND.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <p>{error}</p>
          <a href="/" style={{ color: BRAND.medium, textDecoration: "underline", fontSize: 14 }}>ホームに戻る</a>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const progressPct = Math.round(((current + (showResult ? 1 : 0)) / questions.length) * 100);

  function handleSelect(index: number) {
    if (selected !== null) return;
    setSelected(index);
    const isCorrect = index === q.correct;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = isCorrect;
      return next;
    });
    setShowResult(true);
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      const progressKey = `${stageNum}-${classNum}`;
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const prog = raw ? JSON.parse(raw) : {};
      // Save raw score (0-10) to localStorage — points are calculated on display
      const existingVal = typeof prog[progressKey] === "number" ? prog[progressKey] : 0;
      // Migrate: old format stored points (>10), new format stores raw score (0-10)
      const existingRawScore = existingVal > 10 ? Math.round(existingVal / 20) : existingVal;
      prog[progressKey] = Math.max(existingRawScore, score);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));

      // ダッシュボード用：ログイン不要で attempts テーブルに保存
      fetch("/api/attempts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          stageId: stageNum,
          classId: classNum,
          score: score,
          totalQuestions: questions.length,
        }),
      }).catch(() => {});

      if (session?.user?.email) {
        fetch("/api/quiz/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: stageNum,
            classId: classNum,
            score: score,
            completedQuestions: questions.length,
          }),
        }).catch(() => {});
      }

      setFinished(true);
    } else {
      setFadeIn(false);
      setTimeout(() => {
        setCurrent((c) => c + 1);
        setSelected(null);
        setShowResult(false);
        setFadeIn(true);
      }, 150);
    }
  }

  // ── 結果画面 ──
  if (finished) {
    const finalScore = score;
    const pct = Math.round((finalScore / questions.length) * 100);
    const pts = finalScore * POINTS_PER_CORRECT;
    const maxPts = questions.length * POINTS_PER_CORRECT;
    const isPassed = pct >= 80;
    const message =
      pct >= 80 ? "素晴らしい結果です！" : pct >= 60 ? "もう少しで合格ラインです！" : "もう一度復習しましょう";
    const resultColor = pct >= 80 ? "#16a34a" : pct >= 60 ? "#ca8a04" : "#ef4444";
    const resultEmoji = pct >= 80 ? "🎉" : pct >= 60 ? "💪" : "📖";

    // 次のクラスまたはステージを計算
    let nextLink: string | null = null;
    let nextLabel: string | null = null;
    if (classNum < 3) {
      const nextCls = CLASSES.find((c) => c.id === classNum + 1);
      nextLink = `/quiz?stage=${stageNum}&class=${classNum + 1}`;
      nextLabel = `${stage.emoji} Stage ${stageNum} - ${nextCls?.label} クラスへ進む →`;
    } else if (stageNum < 5) {
      const nextStage = STAGES.find((s) => s.id === stageNum + 1);
      nextLink = `/quiz?stage=${stageNum + 1}&class=1`;
      nextLabel = `${nextStage?.emoji} Stage ${stageNum + 1}: ${nextStage?.name} へ進む →`;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          background: BRAND.bg,
          fontFamily: "'Segoe UI', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <style>{`
          @keyframes resultFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes countUp { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
          @keyframes barGrow { from { width: 0; } }
          .result-card { animation: resultFadeIn 0.5s ease forwards; }
          .count-up { animation: countUp 0.6s ease 0.3s both; }
          .bar-grow { animation: barGrow 1s ease 0.5s both; }
          .next-stage-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        `}</style>

        <header
          style={{
            background: `linear-gradient(135deg, ${BRAND.dark}, ${BRAND.primary})`,
            padding: "0 20px",
            boxShadow: "0 2px 16px rgba(10,22,40,0.3)",
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto", height: 60, display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "rgba(255,255,255,0.12)", borderRadius: 8 }}>
              ← ホーム
            </a>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {stage.emoji} Stage {stage.id}: {stage.name} — {cls.icon} {cls.label}
            </span>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
          <div className="result-card" style={{ background: "#fff", borderRadius: 20, padding: "36px 28px 28px", maxWidth: 460, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: `1px solid ${BRAND.border}` }}>
            <div className="count-up" style={{ width: 80, height: 80, borderRadius: "50%", background: resultColor + "14", border: `3px solid ${resultColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 16px" }}>
              {resultEmoji}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{message}</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
              {questions.length}問中 <strong style={{ color: "#0f172a" }}>{finalScore}問</strong> 正解
            </p>
            <p style={{ fontSize: 11, color: isPassed ? "#16a34a" : "#94a3b8", fontWeight: 600, marginBottom: 20 }}>
              {isPassed ? "✓ 合格（80%以上）" : "合格ライン: 80%"}
            </p>

            <div style={{ background: "#f8fafc", border: `1px solid ${BRAND.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>正解率</p>
                  <p className="count-up" style={{ fontSize: 34, fontWeight: 800, color: resultColor, margin: 0, lineHeight: 1 }}>{pct}%</p>
                </div>
                <div style={{ width: 1, background: "#e2e8f0" }} />
                <div>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>獲得ポイント</p>
                  <p className="count-up" style={{ fontSize: 34, fontWeight: 800, color: BRAND.medium, margin: 0, lineHeight: 1 }}>
                    {pts}<span style={{ fontSize: 14, fontWeight: 600 }}>/{maxPts}pt</span>
                  </p>
                </div>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 8, height: 8, overflow: "hidden" }}>
                <div className="bar-grow" style={{ width: `${pct}%`, height: "100%", background: resultColor, borderRadius: 8 }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {answers.map((a, i) => (
                <div key={i} title={`問題${i + 1}: ${a ? "正解" : "不正解"}`} style={{ width: 24, height: 24, borderRadius: 6, background: a ? "#dcfce7" : "#fee2e2", border: `1.5px solid ${a ? "#16a34a" : "#ef4444"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: a ? "#16a34a" : "#ef4444" }}>
                  {a ? "○" : "✕"}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isPassed && nextLink && (
                <a href={nextLink} className="next-stage-btn" style={{ display: "block", background: `linear-gradient(135deg, ${BRAND.medium}, ${BRAND.accent})`, color: "#fff", textDecoration: "none", borderRadius: 12, padding: "14px 24px", fontSize: 14, fontWeight: 700, boxShadow: `0 4px 12px ${BRAND.accent}40`, transition: "all 0.2s ease" }}>
                  {nextLabel}
                </a>
              )}
              <a href="/" style={{ display: "block", background: `linear-gradient(135deg, ${BRAND.dark}, ${BRAND.primary})`, color: "#fff", textDecoration: "none", borderRadius: 12, padding: "13px 24px", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px rgba(10,22,40,0.3)" }}>
                ← ホームに戻る
              </a>
              <button onClick={() => window.location.reload()} style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                もう一度挑戦する
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── クイズ画面 ──
  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, fontFamily: "'Segoe UI', 'Hiragino Sans', 'Yu Gothic UI', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .choice-btn:hover:not([data-answered="true"]) { border-color: ${BRAND.light} !important; background: ${BRAND.bgCard} !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
        .explanation-appear { animation: slideUp 0.3s ease forwards; }
        .next-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
      `}</style>

      <header style={{ background: `linear-gradient(135deg, ${BRAND.dark}, ${BRAND.primary})`, padding: "0 20px", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 16px rgba(10,22,40,0.3)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "rgba(255,255,255,0.12)", borderRadius: 8 }}>
              ← 戻る
            </a>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
              {stage.emoji} Stage {stage.id} — {cls.icon} {cls.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              <span style={{ color: BRAND.light }}>{score}</span>/{current + (showResult ? 1 : 0)} 正解
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
              {current + 1} / {questions.length}
            </span>
          </div>
        </div>
      </header>

      <div style={{ background: "rgba(10,22,40,0.12)", height: 4 }}>
        <div style={{ width: `${progressPct}%`, height: "100%", background: stage.color, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 16px 0", display: "flex", justifyContent: "center", gap: 4 }}>
        {questions.map((_, i) => (
          <div key={i} style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, background: answers[i] === true ? "#16a34a" : answers[i] === false ? "#ef4444" : i === current ? stage.color : "#cbd5e1", transition: "all 0.3s ease" }} />
        ))}
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 80px", opacity: fadeIn ? 1 : 0, transform: fadeIn ? "translateY(0)" : "translateY(8px)", transition: "all 0.15s ease" }}>
        <div style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <p style={{ fontSize: 11, color: stage.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
            問題 {current + 1}
          </p>
          <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", lineHeight: 1.65, margin: 0 }}>
            {q.question}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {q.choices.map((choice, i) => {
            let bg = "#fff", border = BRAND.border, color = "#0f172a";
            let badgeBg = "#f1f5f9";
            const isAnswered = selected !== null;
            if (isAnswered) {
              if (i === q.correct) { bg = "#f0fdf4"; border = "#16a34a"; color = "#15803d"; badgeBg = "#dcfce7"; }
              else if (i === selected && selected !== q.correct) { bg = "#fff5f5"; border = "#ef4444"; color = "#dc2626"; badgeBg = "#fee2e2"; }
            }
            return (
              <button key={i} className="choice-btn" data-answered={isAnswered ? "true" : "false"} onClick={() => handleSelect(i)}
                style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: "14px 18px", textAlign: "left", cursor: isAnswered ? "default" : "pointer", transition: "all 0.2s ease", fontSize: 14, color, fontWeight: isAnswered && (i === q.correct || i === selected) ? 600 : 400, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: badgeBg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, flexShrink: 0, transition: "all 0.2s ease" }}>
                  {isAnswered && i === q.correct ? "○" : isAnswered && i === selected && selected !== q.correct ? "✕" : ["A", "B", "C", "D"][i]}
                </span>
                {choice}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="explanation-appear" style={{ background: selected === q.correct ? "#f0fdf4" : "#fff5f5", border: `1.5px solid ${selected === q.correct ? "#86efac" : "#fca5a5"}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: selected === q.correct ? "#16a34a" : "#dc2626", marginBottom: 6 }}>
              {selected === q.correct ? "✓ 正解！" : "✕ 不正解"}
              {selected !== q.correct && (
                <span style={{ fontWeight: 500, fontSize: 12, marginLeft: 8, color: "#16a34a" }}>
                  正解: {["A", "B", "C", "D"][q.correct]}
                </span>
              )}
            </p>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, margin: 0 }}>{q.explanation}</p>
          </div>
        )}

        {showResult && (
          <button className="next-btn" onClick={handleNext}
            style={{ background: `linear-gradient(135deg, ${BRAND.dark}, ${BRAND.primary})`, color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", boxShadow: "0 4px 12px rgba(10,22,40,0.3)", transition: "all 0.2s ease" }}>
            {current + 1 >= questions.length ? "結果を見る →" : "次の問題へ →"}
          </button>
        )}
      </main>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 16, color: "#64748b", background: "#f0f4ff" }}>
        読み込み中...
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
