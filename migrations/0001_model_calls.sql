-- One row per model call: what it was for, which model, its tokens, and what OpenRouter says it cost (issue #12).
-- No photos, prompts, or answers are stored here.
CREATE TABLE model_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- When the call finished, as an ISO 8601 UTC timestamp.
  time TEXT NOT NULL,
  -- The app's name for the step that made the call, like "describe".
  operation TEXT NOT NULL,
  -- The OpenRouter model id, like "google/gemini-2.5-flash".
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  -- OpenRouter's usage.cost for the call, in US dollars. Null when OpenRouter did not report one.
  cost_usd REAL
);

CREATE INDEX model_calls_operation ON model_calls (operation);
