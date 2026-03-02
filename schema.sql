-- DSCSS-ACS (AI Cloud Security) DBスキーマ
-- Neon Postgres で実行

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image VARCHAR(500),
  google_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 問題テーブル（5ステージ × 3クラス × 10問 = 150問）
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  stage_id INT NOT NULL CHECK (stage_id BETWEEN 1 AND 5),
  class_id INT NOT NULL CHECK (class_id BETWEEN 1 AND 3),
  question_number INT NOT NULL CHECK (question_number BETWEEN 1 AND 10),
  question_text TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(stage_id, class_id, question_number)
);

-- クイズ結果テーブル（ステージ×クラスごとに記録）
CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_id INT NOT NULL CHECK (stage_id BETWEEN 1 AND 5),
  class_id INT NOT NULL CHECK (class_id BETWEEN 1 AND 3),
  score INT NOT NULL CHECK (score BETWEEN 0 AND 10),
  completed_questions INT NOT NULL DEFAULT 10,
  finished BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, stage_id, class_id)
);

-- アクティビティログテーブル
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  stage_id INT,
  class_id INT,
  score INT,
  detail JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_questions_stage_class ON questions(stage_id, class_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
