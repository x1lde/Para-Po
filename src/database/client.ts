import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { INITIAL_SCHEMA, SCHEMA_VERSION } from './schema';
import { bundledDataset, seedDatabase } from './seed';

let databasePromise: Promise<SQLiteDatabase> | undefined;

async function openInitializedDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('para-po.db');
  try {
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    // This connection is private until initialization completes. Using the same
    // connection keeps foreign-key enforcement enabled for schema and seed writes.
    await db.withTransactionAsync(async () => {
      const version = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version'
      );
      const currentVersion = version?.user_version ?? 0;
      if (currentVersion > SCHEMA_VERSION) {
        throw new Error('The local database schema is newer than this application supports.');
      }
      if (currentVersion === 0) {
        await db.execAsync(INITIAL_SCHEMA);
        await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      }
      await seedDatabase(db, bundledDataset);
    });
    return db;
  } catch (error) {
    await db.closeAsync();
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
