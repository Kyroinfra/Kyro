I ran this to create a trigger for text_search_vector creation for files and file_chunks

== file_chunks ================================================== 

CREATE OR REPLACE FUNCTION update_chunk_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.text_search_vector := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chunk_search_vector_update
  BEFORE INSERT OR UPDATE OF content
  ON file_chunks
  FOR EACH ROW EXECUTE FUNCTION update_chunk_search_vector();

== files ==================================================


CREATE OR REPLACE FUNCTION update_file_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.text_search_vector := to_tsvector('english', COALESCE(NEW.extracted_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_search_vector_update
  BEFORE INSERT OR UPDATE OF extracted_text
  ON files
  FOR EACH ROW EXECUTE FUNCTION update_file_search_vector();

UPDATE files 
SET text_search_vector = to_tsvector('english', COALESCE(extracted_text, ''))
WHERE extracted_text IS NOT NULL;
