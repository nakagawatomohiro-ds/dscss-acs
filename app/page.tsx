"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthHeader from "./components/AuthHeader";
import { STAGES, CLASSES, MAX_POINTS, RANKS, getRank } from "@/lib/constants";

interface ProgressData {
  [key: string]: number;
}

interface MergedProgress {
  [key: string]: number;
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

export default function Home() {
  const router = useRouter();
  const [progress, setProgress] = useState<MergedProgress>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load progress from localStorage and sync with DB
  useEffect(() => {
    const loadProgress = async () => {
      try {
        // First, load from localStorage
        const storedProgress = localStorage.getItem("dscss_acs_progress");
        const localData: ProgressData = storedProgress
          ? JSON.parse(storedProgress)
          : {};

        // Then fetch from DB
        const response = await fetch("/api/quiz/load");
        const dbData = await response.json();

        // Merge: DB takes priority if higher score
        const merged: MergedProgress = { ...localData };
        if (dbData?.progress) {
          Object.entries(dbData.progress).forEach(([key, dbScore]: [string, any]) => {
            const localScore = localData[key] ?? 0;
            merged[key] = Math.max(localScore, dbScore);
          });
        }

        // Calculate total points
        const total = Object.values(merged).reduce((sum, score) => sum + score, 0);

        setProgress(merged);
        setTotalPoints(total);

        // Log page view
        try {
          await fetch("/api/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "page_view", page: "home" }),
          });
        } catch {
          // Silent fail for logging
        }
      } catch {
        // Silent fail - use localStorage only
        const storedProgress = localStorage.getItem("dscss_acs_progress");
        const localData: ProgressData = storedProgress
          ? JSON.parse(storedProgress)
          : {};
        const total = Object.values(localData).reduce((sum, score) => sum + score, 0);
        setProgress(localData);
        setTotalPoints(total);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, []);

  const handleStartQuiz = (stageId: number, classId: number) => {
    router.push(`/quiz?stage=${stageId}&class=${classId}`);
  };

  const handleResetData = () => {
    if (showResetConfirm) {
      localStorage.removeItem("dscss_acs_progress");
      setProgress({});
      setTotalPoints(0);
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
    }
  };

  const completedCount = Object.values(progress).filter((score) => score > 0).length;
  const rank = getRank(totalPoints);

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.primary} 100%)`,
          color: "#fff",
          padding: "20px 16px",
          boxShadow: "0 4px 12px rgba(10, 22, 40, 0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: "bold",
                background: "rgba(255,255,255,0.15)",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              🛡️
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: "bold",
                  letterSpacing: -0.5,
                }}
              >
                DSCSS-ACS
              </h1>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: 12,
                  opacity: 0.85,
                  letterSpacing: 0.5,
                }}
              >
                DropStone AI Cloud Security Study
              </p>
            </div>
          </div>
          <AuthHeader />
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 16px",
        }}
      >
        {loading ? (
          // Loading skeleton
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(37, 99, 235, 0.1)",
                margin: "0 auto 16px",
                animation: "pulse 1.5s infinite",
              }}
            />
            <p style={{ color: BRAND.medium, fontWeight: 500 }}>データを読み込み中...</p>
          </div>
        ) : (
          <>
            {/* Score Summary Card */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "28px",
                marginBottom: 32,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                border: `1px solid ${BRAND.border}`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 24,
                }}
              >
                {/* Score */}
                <div>
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    総スコア
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: "bold",
                        color: BRAND.primary,
                      }}
                    >
                      {totalPoints.toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: "#999",
                        fontWeight: 600,
                      }}
                    >
                      / {MAX_POINTS.toLocaleString()}pt
                    </span>
                  </div>
                </div>

                {/* Completion */}
                <div>
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    完了状況
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: "bold",
                        color: BRAND.accent,
                      }}
                    >
                      {completedCount}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: "#999",
                        fontWeight: 600,
                      }}
                    >
                      / 15コース
                    </span>
                  </div>
                </div>

                {/* Rank */}
                <div>
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    現在のランク
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{rank.icon}</span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: rank.color,
                      }}
                    >
                      {rank.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginTop: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#666",
                    }}
                  >
                    進捗
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: BRAND.medium,
                    }}
                  >
                    {Math.round((totalPoints / MAX_POINTS) * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "#e5e7eb",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: `linear-gradient(90deg, ${BRAND.accent} 0%, ${BRAND.medium} 100%)`,
                      width: `${Math.min((totalPoints / MAX_POINTS) * 100, 100)}%`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stages Grid */}
            <div style={{ marginBottom: 40 }}>
              <h2
                style={{
                  margin: "0 0 20px 0",
                  fontSize: 20,
                  fontWeight: "bold",
                  color: BRAND.primary,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>📚</span> 学習ステージ
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: 20,
                }}
              >
                {STAGES.map((stage) => (
                  <div
                    key={stage.id}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      padding: 24,
                      border: `1px solid ${BRAND.border}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Stage Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        marginBottom: 20,
                        paddingBottom: 20,
                        borderBottom: `1px solid ${BRAND.border}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 32,
                          minWidth: 48,
                          textAlign: "center",
                        }}
                      >
                        {stage.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 4,
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 16,
                              fontWeight: "bold",
                              color: BRAND.primary,
                            }}
                          >
                            ステージ {stage.id}: {stage.name}
                          </h3>
                          <span
                            style={{
                              background: stage.color,
                              color: "#fff",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {stage.subtitle}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            color: "#666",
                          }}
                        >
                          {stage.purpose}
                        </p>
                      </div>
                    </div>

                    {/* Classes Row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {CLASSES.map((cls) => {
                        const progressKey = `${stage.id}-${cls.id}`;
                        const score = progress[progressKey] ?? 0;
                        const isCompleted = score > 0;

                        return (
                          <button
                            key={progressKey}
                            onClick={() => handleStartQuiz(stage.id, cls.id)}
                            style={{
                              background: isCompleted
                                ? `linear-gradient(135deg, ${cls.color}22 0%, ${cls.color}11 100%)`
                                : "#f9fafb",
                              border: `2px solid ${isCompleted ? cls.color : BRAND.border}`,
                              borderRadius: 8,
                              padding: 16,
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              textAlign: "center",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                `0 4px 12px ${cls.color}33`;
                              (e.currentTarget as HTMLButtonElement).style.transform =
                                "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                "none";
                              (e.currentTarget as HTMLButtonElement).style.transform =
                                "translateY(0)";
                            }}
                          >
                            <div
                              style={{
                                fontSize: 24,
                                marginBottom: 8,
                              }}
                            >
                              {cls.icon}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: "bold",
                                color: BRAND.primary,
                                marginBottom: 4,
                              }}
                            >
                              {cls.label}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#999",
                                marginBottom: 8,
                              }}
                            >
                              {cls.name}
                            </div>
                            {isCompleted ? (
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: "bold",
                                  color: cls.color,
                                }}
                              >
                                {score}pt
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#999",
                                  fontWeight: 600,
                                }}
                              >
                                挑戦する →
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rank Table */}
            <div style={{ marginBottom: 40 }}>
              <h2
                style={{
                  margin: "0 0 20px 0",
                  fontSize: 20,
                  fontWeight: "bold",
                  color: BRAND.primary,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🏆</span> ランクシステム
              </h2>

              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${BRAND.border}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr style={{ background: BRAND.bg, borderBottom: `1px solid ${BRAND.border}` }}>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: 600,
                            color: BRAND.primary,
                          }}
                        >
                          ランク
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: 600,
                            color: BRAND.primary,
                          }}
                        >
                          ラベル
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: BRAND.primary,
                          }}
                        >
                          必要スコア
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {RANKS.map((r, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: `1px solid ${BRAND.border}`,
                            background: totalPoints >= r.min ? `${r.color}11` : "#fff",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: 20,
                            }}
                          >
                            {r.icon}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 600,
                              color:
                                totalPoints >= r.min
                                  ? r.color
                                  : "#999",
                            }}
                          >
                            {r.label}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "right",
                              color: "#666",
                              fontWeight: 500,
                            }}
                          >
                            {r.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div
              style={{
                marginBottom: 40,
              }}
            >
              <button
                onClick={handleResetData}
                style={{
                  background: showResetConfirm ? "#dc2626" : "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
              >
                {showResetConfirm
                  ? "本当にリセットしますか？クリックで確認"
                  : "データをリセット"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          background: "#f9fafb",
          borderTop: `1px solid ${BRAND.border}`,
          padding: "24px 16px",
          marginTop: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            textAlign: "center",
            fontSize: 12,
            color: "#999",
          }}
        >
          <p style={{ margin: 0 }}>
            DSCSS-ACS — DropStone AIクラウドセキュリティ スタディ
          </p>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
