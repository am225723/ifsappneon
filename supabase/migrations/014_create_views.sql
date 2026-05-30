-- =====================================================
-- Migration 014: Views
-- =====================================================

CREATE OR REPLACE VIEW ifs_client_dashboard AS
SELECT
    c.id AS client_id,
    c.name,
    c.pin,
    c.status,
    c.last_active,
    ar.primary_wound,
    ar.secondary_wound,
    ar.assessment_date,
    COUNT(DISTINCT cp.module_id) AS modules_started,
    COUNT(DISTINCT CASE WHEN cp.completed THEN cp.module_id END) AS modules_completed,
    COUNT(DISTINCT je.id) AS journal_entries_count,
    COUNT(DISTINCT p.id) AS parts_identified,
    MAX(cp.last_accessed) AS last_module_access
FROM ifs_clients c
LEFT JOIN ifs_assessment_results ar ON c.id = ar.client_id
LEFT JOIN ifs_client_progress cp ON c.id = cp.client_id
LEFT JOIN ifs_journal_entries je ON c.id = je.client_id
LEFT JOIN ifs_parts p ON c.id = p.client_id
GROUP BY c.id, c.name, c.pin, c.status, c.last_active,
         ar.primary_wound, ar.secondary_wound, ar.assessment_date;

CREATE OR REPLACE VIEW ifs_module_progress_summary AS
SELECT
    cp.client_id,
    cp.module_id,
    pc.module_title,
    pc.primary_wound_focus,
    COUNT(*) AS total_activities,
    COUNT(CASE WHEN cp.completed THEN 1 END) AS completed_activities,
    ROUND(COUNT(CASE WHEN cp.completed THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) AS completion_percentage,
    MIN(cp.started_at) AS module_started,
    MAX(cp.completed_at) AS last_activity_completed,
    SUM(cp.time_spent_minutes) AS total_time_spent
FROM ifs_client_progress cp
JOIN ifs_personalized_curriculum pc ON cp.client_id = pc.client_id AND cp.module_id = pc.module_id
GROUP BY cp.client_id, cp.module_id, pc.module_title, pc.primary_wound_focus;

CREATE OR REPLACE VIEW client_module_progress AS
SELECT
    client_id,
    module_id,
    COUNT(DISTINCT step_id) AS completed_steps,
    MAX(updated_at) AS last_activity,
    jsonb_agg(
        jsonb_build_object(
            'step_id', step_id,
            'answers', answers,
            'updated_at', updated_at
        )
    ) AS all_responses
FROM ifs_module_answers
GROUP BY client_id, module_id;
