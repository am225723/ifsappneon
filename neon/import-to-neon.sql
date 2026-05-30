-- Import helper for Supabase -> Neon migration.
-- First run neon/schema.sql against Neon, then run this file from the directory containing CSV exports.
-- Example:
--   psql "$DATABASE_URL" -f neon/schema.sql
--   psql "$DATABASE_URL" -f neon/import-to-neon.sql

\copy ifs_clients FROM 'ifs_clients.csv' CSV HEADER;
\copy ifs_assessment_results FROM 'ifs_assessment_results.csv' CSV HEADER;
\copy ifs_personalized_curriculum FROM 'ifs_personalized_curriculum.csv' CSV HEADER;
\copy ifs_client_progress FROM 'ifs_client_progress.csv' CSV HEADER;
\copy ifs_module_answers FROM 'ifs_module_answers.csv' CSV HEADER;
\copy ifs_journal_entries FROM 'ifs_journal_entries.csv' CSV HEADER;
\copy ifs_parts FROM 'ifs_parts.csv' CSV HEADER;
\copy ifs_interactive_data FROM 'ifs_interactive_data.csv' CSV HEADER;
\copy ifs_exercise_progress FROM 'ifs_exercise_progress.csv' CSV HEADER;
\copy ifs_therapist_notes FROM 'ifs_therapist_notes.csv' CSV HEADER;
\copy ifs_milestones FROM 'ifs_milestones.csv' CSV HEADER;
\copy ifs_content_library FROM 'ifs_content_library.csv' CSV HEADER;
\copy ifs_mood_entries FROM 'ifs_mood_entries.csv' CSV HEADER;
\copy ifs_therapy_sessions FROM 'ifs_therapy_sessions.csv' CSV HEADER;
\copy ifs_therapy_homework FROM 'ifs_therapy_homework.csv' CSV HEADER;
\copy ifs_messages FROM 'ifs_messages.csv' CSV HEADER;
\copy ifs_parts_dialogue FROM 'ifs_parts_dialogue.csv' CSV HEADER;
\copy ifs_gamification FROM 'ifs_gamification.csv' CSV HEADER;
\copy ifs_client_preferences FROM 'ifs_client_preferences.csv' CSV HEADER;
\copy ifs_therapist_feedback FROM 'ifs_therapist_feedback.csv' CSV HEADER;
\copy ifs_therapy_activity_progress FROM 'ifs_therapy_activity_progress.csv' CSV HEADER;
