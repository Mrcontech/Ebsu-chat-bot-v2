-- EBSU Enquiry Bot database schema
-- Works on the MySQL/MariaDB that ships with XAMPP (MariaDB 10.4+) and on MySQL 8.
-- The setup script (npm start) runs this file automatically. You can also import it
-- by hand in phpMyAdmin: create a database called ebsu_chatbot, open it, Import this file.

SET NAMES utf8mb4;

-- Topics that group the questions (Admission, School fees, Hostels, ...)
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  icon VARCHAR(40) NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- University offices the bot refers students to when it has no answer
CREATE TABLE IF NOT EXISTS offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  handles VARCHAR(255) NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(150) NULL,
  location VARCHAR(255) NULL,
  website VARCHAR(255) NULL,
  source_url VARCHAR(500) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The knowledge base: one row per question-and-answer pair
CREATE TABLE IF NOT EXISTS qa_pairs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ref_key VARCHAR(60) NULL UNIQUE,
  category_id INT NOT NULL,
  office_id INT NULL,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  source_url VARCHAR(500) NULL,
  source_note VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_qa_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_qa_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Other ways students ask the same question (improves matching)
CREATE TABLE IF NOT EXISTS qa_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  qa_id INT NOT NULL,
  phrasing VARCHAR(500) NOT NULL,
  CONSTRAINT fk_variant_qa FOREIGN KEY (qa_id) REFERENCES qa_pairs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Language rules: Pidgin, abbreviations, common misspellings and synonyms
CREATE TABLE IF NOT EXISTS language_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phrase VARCHAR(100) NOT NULL UNIQUE,
  canonical VARCHAR(100) NOT NULL,
  kind ENUM('pidgin','abbreviation','spelling','synonym') NOT NULL DEFAULT 'synonym'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every message students send, with what the bot did
CREATE TABLE IF NOT EXISTS chat_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NULL,
  message VARCHAR(1000) NOT NULL,
  normalized VARCHAR(1000) NULL,
  outcome ENUM('answered','suggested','fallback','smalltalk','empty') NOT NULL,
  matched_qa_id INT NULL,
  score DECIMAL(5,3) NULL,
  feedback TINYINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_created (created_at),
  CONSTRAINT fk_log_qa FOREIGN KEY (matched_qa_id) REFERENCES qa_pairs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questions the bot could not answer, grouped so the admin can grow the knowledge base
CREATE TABLE IF NOT EXISTS unanswered_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(1000) NOT NULL,
  norm_key CHAR(64) NOT NULL UNIQUE,
  times_asked INT NOT NULL DEFAULT 1,
  best_score DECIMAL(5,3) NULL,
  best_qa_id INT NULL,
  office_id INT NULL,
  status ENUM('pending','resolved','dismissed') NOT NULL DEFAULT 'pending',
  resolved_qa_id INT NULL,
  first_asked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_asked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unanswered_status (status, last_asked_at),
  CONSTRAINT fk_unanswered_best FOREIGN KEY (best_qa_id) REFERENCES qa_pairs(id) ON DELETE SET NULL,
  CONSTRAINT fk_unanswered_resolved FOREIGN KEY (resolved_qa_id) REFERENCES qa_pairs(id) ON DELETE SET NULL,
  CONSTRAINT fk_unanswered_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin accounts (passwords are stored as bcrypt hashes, never in plain text)
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(100) NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  admin_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Matching thresholds and other settings the admin can change
CREATE TABLE IF NOT EXISTS settings (
  name VARCHAR(50) PRIMARY KEY,
  value VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Test questions used to measure accuracy (Admin > Test bench, and npm run evaluate)
CREATE TABLE IF NOT EXISTS test_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  expected_outcome ENUM('answer','fallback') NOT NULL DEFAULT 'answer',
  expected_qa_id INT NULL,
  style VARCHAR(40) NULL,
  set_name ENUM('test','dev') NOT NULL DEFAULT 'test',
  CONSTRAINT fk_test_expected FOREIGN KEY (expected_qa_id) REFERENCES qa_pairs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
