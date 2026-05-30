-- =====================================================
-- Migration 013: Functions and Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ifs_clients_updated_at ON ifs_clients;
CREATE TRIGGER update_ifs_clients_updated_at BEFORE UPDATE ON ifs_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifs_personalized_curriculum_updated_at ON ifs_personalized_curriculum;
CREATE TRIGGER update_ifs_personalized_curriculum_updated_at BEFORE UPDATE ON ifs_personalized_curriculum
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifs_client_progress_updated_at ON ifs_client_progress;
CREATE TRIGGER update_ifs_client_progress_updated_at BEFORE UPDATE ON ifs_client_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifs_journal_entries_updated_at ON ifs_journal_entries;
CREATE TRIGGER update_ifs_journal_entries_updated_at BEFORE UPDATE ON ifs_journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifs_parts_updated_at ON ifs_parts;
CREATE TRIGGER update_ifs_parts_updated_at BEFORE UPDATE ON ifs_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifs_exercise_progress_updated_at ON ifs_exercise_progress;
CREATE TRIGGER update_ifs_exercise_progress_updated_at BEFORE UPDATE ON ifs_exercise_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifs_therapist_notes_updated_at ON ifs_therapist_notes;
CREATE TRIGGER update_ifs_therapist_notes_updated_at BEFORE UPDATE ON ifs_therapist_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifs_content_library_updated_at ON ifs_content_library;
CREATE TRIGGER update_ifs_content_library_updated_at BEFORE UPDATE ON ifs_content_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_module_answers_updated_at ON ifs_module_answers;
CREATE TRIGGER trigger_update_module_answers_updated_at BEFORE UPDATE ON ifs_module_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_client_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ifs_clients
    SET last_active = NOW()
    WHERE id = NEW.client_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_last_active_on_progress ON ifs_client_progress;
CREATE TRIGGER update_last_active_on_progress AFTER INSERT OR UPDATE ON ifs_client_progress
    FOR EACH ROW EXECUTE FUNCTION update_client_last_active();

DROP TRIGGER IF EXISTS update_last_active_on_journal ON ifs_journal_entries;
CREATE TRIGGER update_last_active_on_journal AFTER INSERT ON ifs_journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_client_last_active();

CREATE OR REPLACE FUNCTION generate_unique_pin()
RETURNS TEXT AS $$
DECLARE
    new_pin TEXT;
    pin_exists BOOLEAN;
BEGIN
    LOOP
        new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM ifs_clients WHERE pin = new_pin) INTO pin_exists;
        EXIT WHEN NOT pin_exists;
    END LOOP;
    RETURN new_pin;
END;
$$ LANGUAGE plpgsql;
