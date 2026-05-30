-- Export helper for Supabase -> Neon migration.
-- Run these COPY commands in a trusted environment with psql access.
-- Example:
--   psql "$SUPABASE_DATABASE_URL" -f neon/export-from-supabase.sql
-- Then import the generated CSV files into Neon with neon/import-to-neon.sql.

\copy ifs_clients TO 'ifs_clients.csv' CSV HEADER;
\copy ifs_assessment_results TO 'ifs_assessment_results.csv' CSV HEADER;
\copy ifs_personalized_curriculum TO 'ifs_personalized_curriculum.csv' CSV HEADER;
\copy ifs_client_progress TO 'ifs_client_progress.csv' CSV HEADER;
\copy ifs_module_answers TO 'ifs_module_answers.csv' CSV HEADER;
\copy ifs_journal_entries TO 'ifs_journal_entries.csv' CSV HEADER;
\copy ifs_parts TO 'ifs_parts.csv' CSV HEADER;
\copy ifs_interactive_data TO 'ifs_interactive_data.csv' CSV HEADER;
\copy ifs_exercise_progress TO 'ifs_exercise_progress.csv' CSV HEADER;
\copy ifs_therapist_notes TO 'ifs_therapist_notes.csv' CSV HEADER;
\copy ifs_milestones TO 'ifs_milestones.csv' CSV HEADER;
\copy ifs_content_library TO 'ifs_content_library.csv' CSV HEADER;
\copy ifs_mood_entries TO 'ifs_mood_entries.csv' CSV HEADER;
\copy ifs_therapy_sessions TO 'ifs_therapy_sessions.csv' CSV HEADER;
\copy ifs_therapy_homework TO 'ifs_therapy_homework.csv' CSV HEADER;
\copy ifs_messages TO 'ifs_messages.csv' CSV HEADER;
\copy ifs_parts_dialogue TO 'ifs_parts_dialogue.csv' CSV HEADER;
\copy ifs_gamification TO 'ifs_gamification.csv' CSV HEADER;
\copy ifs_client_preferences TO 'ifs_client_preferences.csv' CSV HEADER;
\copy ifs_therapist_feedback TO 'ifs_therapist_feedback.csv' CSV HEADER;
\copy ifs_therapy_activity_progress TO 'ifs_therapy_activity_progress.csv' CSV HEADER;
