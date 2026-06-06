const WORKSHEET_PERSISTENCE_COLUMNS = ['activity_blocks', 'interactive_responses'];

export function isMissingWorksheetPersistenceColumn(error, columns = WORKSHEET_PERSISTENCE_COLUMNS) {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || error.details || error.hint || '').toLowerCase();
  const mentionsWorksheetColumn = columns.some((column) => message.includes(column.toLowerCase()));
  return (
    (code === '42703' && mentionsWorksheetColumn) ||
    (code === 'PGRST204' && mentionsWorksheetColumn) ||
    (message.includes('schema cache') && mentionsWorksheetColumn) ||
    (message.includes('column') && message.includes('does not exist') && mentionsWorksheetColumn)
  );
}

export const WORKSHEET_MIGRATION_ADMIN_WARNING = 'Structured worksheet persistence is not available yet. Apply the Phase 21B worksheet persistence migration.';

export const WORKSHEET_MIGRATION_CLIENT_WARNING = 'Your written reflection was saved, but the interactive activity responses could not be saved right now.';
