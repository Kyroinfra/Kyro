// rag/scope.ts — what documents does this query see?
//
// Placeholder (per #32): the collection→fileIds resolution both /search and
// /ask need, rehomed from routes/search.ts to kill the route→route import.
// The unification of collection/fileIds/filters resolution (intersect logic,
// uniform errors) lands via #37, which will absorb resolveMetadataFilter
// (lib/metadata.ts) into this module.

import { db } from '../db';
import { collections, collectionFiles } from '../db/schema';
import { and, eq } from 'drizzle-orm';

export async function resolveCollectionToFileIds(
  collectionId: string,
  orgId:        string,
): Promise<string[] | null> {
  const [col] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.orgId, orgId)));

  if (!col) {return null;}

  const rows = await db
    .select({ fileId: collectionFiles.fileId })
    .from(collectionFiles)
    .where(eq(collectionFiles.collectionId, collectionId));

  return rows.map(r => r.fileId);
}
