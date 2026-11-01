-- #40 / KYR-6: the 9-event webhook list is cut to file.ready / file.failed.
-- Rewrite every existing webhooks.events array: map the old values that have
-- a terminal-file equivalent to the new names, drop the intermediates
-- (extraction.started/completed, embedding.started) and the collection rollups
-- (subscribers just get file.ready / file.failed), dedupe.
UPDATE webhooks
SET    events = (
         SELECT COALESCE(array_agg(DISTINCT new_e), '{}'::text[])
         FROM   unnest(events) AS old_e,
                LATERAL (
                  SELECT CASE
                           WHEN old_e IN ('embedding.completed',
                                          'collection.embedding_completed') THEN 'file.ready'
                           WHEN old_e IN ('extraction.failed',
                                          'embedding.failed',
                                          'collection.embedding_failed',
                                          'embedding.skipped') THEN 'file.failed'
                         END AS new_e
                ) m
         WHERE  new_e IS NOT NULL
       );
