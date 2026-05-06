ALTER TABLE "files" ADD COLUMN "text_search_vector" "tsvector";

-- GIN index for fast full-text queries
CREATE INDEX IF NOT EXISTS idx_files_text_search
  ON files USING GIN (text_search_vector);

-- Trigger function
CREATE OR REPLACE FUNCTION files_text_search_update() RETURNS trigger AS $$
BEGIN
  NEW.text_search_vector := CASE
    WHEN NEW.extracted_text IS NOT NULL
    THEN to_tsvector('english', NEW.extracted_text)
    ELSE NULL
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS files_text_search_trigger ON files;
CREATE TRIGGER files_text_search_trigger
BEFORE INSERT OR UPDATE OF extracted_text ON files
FOR EACH ROW EXECUTE FUNCTION files_text_search_update();

-- Backfill any existing rows that already have extracted_text
UPDATE files
SET text_search_vector = to_tsvector('english', extracted_text)
WHERE extracted_text IS NOT NULL AND text_search_vector IS NULL;
