-- PROGRESSION INSIGHTS & ANTI-DIP SYSTEM - DATABASE MIGRATION
-- PostgreSQL migration script for adding progression tracking fields

-- ============================================================================
-- MIGRATION: Add Progression Insights Fields to Tasks Table
-- ============================================================================

BEGIN;

-- Add progression tracking fields to tasks table with TIMESTAMPTZ
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS stuck_at_ninety BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_progress_update TIMESTAMPTZ DEFAULT NOW(), -- TIMESTAMPTZ for timezone awareness
ADD COLUMN IF NOT EXISTS implementation_intention JSONB;

-- Create index for efficient stuck tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_stuck_at_ninety
ON tasks (stuck_at_ninety)
WHERE stuck_at_ninety = TRUE;

-- Create index for progress update queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_tasks_last_progress_update
ON tasks (last_progress_update);

-- Create index for implementation intentions (JSONB queries)
CREATE INDEX IF NOT EXISTS idx_tasks_implementation_intention
ON tasks USING GIN (implementation_intention)
WHERE implementation_intention IS NOT NULL;

-- ============================================================================
-- TRIGGER: Auto-update last_progress_update only when progress changes
-- ============================================================================

-- Function to update last_progress_update only when progress changes
CREATE OR REPLACE FUNCTION update_task_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update timestamp if progress value actually changed
    IF OLD.progress IS DISTINCT FROM NEW.progress THEN
        NEW.last_progress_update = NOW();

        -- Reset stuck_at_ninety flag when progress changes
        -- (allows re-detection if task gets stuck again)
        IF OLD.progress >= 90 AND OLD.progress < 100 AND NEW.progress != OLD.progress THEN
            NEW.stuck_at_ninety = FALSE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tasks table
DROP TRIGGER IF EXISTS trigger_task_progress_update ON tasks;
CREATE TRIGGER trigger_task_progress_update
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_progress_timestamp();

-- ============================================================================
-- DATA MIGRATION: Initialize existing tasks
-- ============================================================================

-- Set last_progress_update for existing tasks based on their created_at or updated_at
UPDATE tasks
SET last_progress_update = COALESCE(updated_at, created_at, NOW())
WHERE last_progress_update IS NULL;

-- Mark existing stuck tasks (this is a one-time migration)
UPDATE tasks
SET stuck_at_ninety = TRUE
WHERE progress >= 90
  AND progress < 100
  AND last_progress_update < (NOW() - INTERVAL '3 days');

-- ============================================================================
-- ANALYTICS VIEW: Stuck Tasks Overview
-- ============================================================================

CREATE OR REPLACE VIEW stuck_tasks_overview AS
SELECT
    t.id,
    t.name,
    t.progress,
    t.last_progress_update,
    t.stuck_at_ninety,
    EXTRACT(EPOCH FROM (NOW() - t.last_progress_update)) / 86400 AS days_since_update,
    p.name AS pillar_name,
    u.username AS owner_username
FROM tasks t
JOIN pillars p ON t.pillar_id = p.id
LEFT JOIN users u ON t.user_id = u.id
WHERE t.stuck_at_ninety = TRUE
   OR (t.progress >= 90 AND t.progress < 100 AND t.last_progress_update < (NOW() - INTERVAL '3 days'));

-- ============================================================================
-- STORED PROCEDURE: Generate Progression Report
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_progression_report(
    user_id_param INTEGER DEFAULT NULL,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_tasks BIGINT,
    completed_tasks BIGINT,
    stuck_tasks BIGINT,
    completion_rate NUMERIC,
    avg_completion_time INTERVAL,
    health_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(*) as total_tasks,
            COUNT(*) FILTER (WHERE progress = 100) as completed_tasks,
            COUNT(*) FILTER (WHERE progress >= 90 AND progress < 100 AND last_progress_update < (NOW() - INTERVAL '3 days')) as stuck_tasks,
            AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_seconds
        FROM tasks
        WHERE (user_id_param IS NULL OR user_id = user_id_param)
          AND created_at >= (NOW() - (days_back || ' days')::INTERVAL)
    )
    SELECT
        s.total_tasks,
        s.completed_tasks,
        s.stuck_tasks,
        ROUND((s.completed_tasks::NUMERIC / NULLIF(s.total_tasks, 0)) * 100, 2) as completion_rate,
        MAKE_INTERVAL(secs => s.avg_completion_seconds) as avg_completion_time,
        GREATEST(0, LEAST(100,
            ROUND((s.completed_tasks::NUMERIC / NULLIF(s.total_tasks, 0)) * 100, 2) -
            (s.stuck_tasks * 10) +
            CASE WHEN s.avg_completion_seconds < 604800 THEN 20 ELSE 0 END
        )) as health_score
    FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;

-- Example usage:
-- SELECT * FROM generate_progression_report();
-- SELECT * FROM stuck_tasks_overview;