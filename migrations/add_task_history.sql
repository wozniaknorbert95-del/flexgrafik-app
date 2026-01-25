-- TASK PROGRESS HISTORY - DATABASE MIGRATION
-- PostgreSQL migration for tracking task progress changes over time

-- ============================================================================
-- MIGRATION: Add Task History Table
-- ============================================================================

BEGIN;

-- Create task_history table for progress tracking with TIMESTAMPTZ
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
    timestamp TIMESTAMPTZ DEFAULT NOW(), -- Always use TIMESTAMPTZ for timezone awareness
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Index for efficient queries
    CONSTRAINT unique_task_progress UNIQUE (task_id, progress, timestamp)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history (task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_timestamp ON task_history (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_task_history_task_progress ON task_history (task_id, progress);

-- Add ai_nudge column to tasks table for Ollama-generated advice
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS ai_nudge TEXT,
ADD COLUMN IF NOT EXISTS ai_nudge_generated_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- STORED PROCEDURES: Task Progress Management
-- ============================================================================

-- Function to update task progress with history logging
CREATE OR REPLACE FUNCTION update_task_progress(
    p_task_id INTEGER,
    p_progress INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_progress INTEGER;
    v_success BOOLEAN := FALSE;
BEGIN
    -- Get current progress
    SELECT progress INTO v_old_progress
    FROM tasks
    WHERE id = p_task_id;

    -- Only proceed if progress actually changed
    IF v_old_progress IS DISTINCT FROM p_progress THEN
        -- Update task
        UPDATE tasks
        SET
            progress = p_progress,
            last_progress_update = NOW(),
            stuck_at_ninety = CASE
                WHEN p_progress >= 90 AND p_progress < 100 THEN TRUE
                WHEN p_progress = 100 THEN FALSE
                ELSE stuck_at_ninety
            END,
            completed_at = CASE
                WHEN p_progress = 100 AND completed_at IS NULL THEN NOW()
                ELSE completed_at
            END
        WHERE id = p_task_id;

        -- Log history
        INSERT INTO task_history (task_id, progress)
        VALUES (p_task_id, p_progress);

        v_success := TRUE;
    END IF;

    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- Function to add progress history entry (for manual logging)
CREATE OR REPLACE FUNCTION add_task_progress_history(
    p_task_id INTEGER,
    p_progress INTEGER,
    p_timestamp TIMESTAMPTZ DEFAULT NOW() -- TIMESTAMPTZ for timezone awareness
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO task_history (task_id, progress, timestamp)
    VALUES (p_task_id, p_progress, p_timestamp);

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to save AI nudge
CREATE OR REPLACE FUNCTION save_task_ai_nudge(
    p_task_id INTEGER,
    p_ai_nudge TEXT,
    p_generated_at TIMESTAMPTZ DEFAULT NOW() -- TIMESTAMPTZ for timezone awareness
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE tasks
    SET
        ai_nudge = p_ai_nudge,
        ai_nudge_generated_at = p_generated_at
    WHERE id = p_task_id;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS: Progress Analytics
-- ============================================================================

-- View for task progress over time
CREATE OR REPLACE VIEW task_progress_timeline AS
SELECT
    th.task_id,
    t.name as task_name,
    t.progress as current_progress,
    th.progress as historical_progress,
    th.timestamp,
    p.name as pillar_name,
    EXTRACT(EPOCH FROM (NOW() - th.timestamp)) / 86400 as days_ago
FROM task_history th
JOIN tasks t ON th.task_id = t.id
JOIN pillars p ON t.pillar_id = p.id
ORDER BY th.task_id, th.timestamp DESC;

-- View for AI nudge effectiveness
CREATE OR REPLACE VIEW ai_nudge_effectiveness AS
SELECT
    t.id,
    t.name,
    t.ai_nudge,
    t.ai_nudge_generated_at,
    t.progress,
    t.last_progress_update,
    CASE
        WHEN t.ai_nudge_generated_at IS NOT NULL AND t.last_progress_update > t.ai_nudge_generated_at THEN
            EXTRACT(EPOCH FROM (t.last_progress_update - t.ai_nudge_generated_at)) / 86400
        ELSE NULL
    END as days_after_ai_nudge,
    CASE
        WHEN t.progress = 100 AND t.ai_nudge_generated_at IS NOT NULL THEN TRUE
        ELSE FALSE
    END as completed_after_ai_nudge
FROM tasks t
WHERE t.ai_nudge IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;

-- Example usage:
-- SELECT update_task_progress(1, 95);
-- SELECT add_task_progress_history(1, 95);
-- SELECT save_task_ai_nudge(1, 'Brutal Navy SEAL advice here');
-- SELECT * FROM task_progress_timeline LIMIT 10;
-- SELECT * FROM ai_nudge_effectiveness;