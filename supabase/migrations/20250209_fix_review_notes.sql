-- Create function to handle empty strings as null for review_notes
CREATE OR REPLACE FUNCTION handle_empty_review_notes()
RETURNS TRIGGER AS $$
BEGIN
    -- Convert empty review_notes to null
    IF NEW.review_notes = '' THEN
        NEW.review_notes = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle empty review_notes before insert or update
CREATE TRIGGER handle_empty_review_notes_trigger
    BEFORE INSERT OR UPDATE ON timesheets
    FOR EACH ROW
    EXECUTE FUNCTION handle_empty_review_notes();
