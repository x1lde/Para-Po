import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { COMMUTER_INSTRUCTIONS_MIGRATION, INITIAL_SCHEMA, MANUAL_CATALOG_MIGRATION, SCHEMA_VERSION } from './schema';
import { bundledDataset, seedDatabase } from './seed';

let databasePromise: Promise<SQLiteDatabase> | undefined;

async function openInitializedDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('para-po.db');
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    const storedVersion = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = storedVersion?.user_version ?? 0;
    if (currentVersion > SCHEMA_VERSION) {
      throw new Error('The local database schema is newer than this application supports.');
    }
    const rebuildRequired = currentVersion < 3;
    await db.execAsync(rebuildRequired ? 'PRAGMA foreign_keys = OFF;' : 'PRAGMA foreign_keys = ON;');
    // This connection is private until initialization completes. Using the same
    // connection prevents unrelated writes from entering the initialization transaction.
    await db.withTransactionAsync(async () => {
      if (currentVersion === 0) {
        await db.execAsync(INITIAL_SCHEMA);
      }
      if (currentVersion < 2) {
        await db.execAsync(COMMUTER_INSTRUCTIONS_MIGRATION);
      }
      if (rebuildRequired) {
        await db.execAsync(MANUAL_CATALOG_MIGRATION);
      }
      if (currentVersion < SCHEMA_VERSION) {
        await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      }
      await seedDatabase(db, bundledDataset);
      const violations = await db.getAllAsync<{ table: string; rowid: number | null; parent: string; fkid: number }>(
        'PRAGMA foreign_key_check'
      );
      if (violations.length > 0) {
        throw new Error('The local reference dataset contains invalid relationships.');
      }
    });
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return db;
  } catch (error) {
    try { await db.closeAsync(); } catch { /* Preserve the initialization failure for diagnosis/retry. */ }
    throw error;
  }
}

/** Lazy native initialization. Concurrent callers share one connection and migration. */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openInitializedDatabase().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}
