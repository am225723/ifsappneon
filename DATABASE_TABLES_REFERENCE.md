# IFS Database Tables Reference

## Overview
All database tables are prefixed with `IFS_` for clear namespace separation and professional organization.

---

## Table List

### 1. **IFS_clients**
**Purpose:** Store client account information and authentication
**Key Fields:**
- `id` (UUID) - Primary key
- `pin` (VARCHAR) - 6-digit authentication PIN
- `name` (VARCHAR) - Client full name
- `email` (VARCHAR) - Contact email
- `status` (VARCHAR) - active, inactive, completed
- `last_active` (TIMESTAMP) - Last login time

**Usage:**
```javascript
// Authenticate client
const { data } = await supabase
  .from('IFS_clients')
  .select('*')
  .eq('pin', '123456')
  .single();
```

---

### 2. **IFS_assessment_results**
**Purpose:** Store child wound assessment scores and results
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `abandonment_score` (INTEGER) - Score 0-24
- `shame_score` (INTEGER) - Score 0-24
- `neglect_score` (INTEGER) - Score 0-24
- `betrayal_score` (INTEGER) - Score 0-24
- `primary_wound` (VARCHAR) - Highest scoring wound
- `secondary_wound` (VARCHAR) - Second highest wound
- `responses` (JSONB) - All question responses

**Usage:**
```javascript
// Save assessment
const { data } = await supabase
  .from('IFS_assessment_results')
  .insert({
    client_id: clientId,
    abandonment_score: 22,
    shame_score: 15,
    neglect_score: 10,
    betrayal_score: 8,
    primary_wound: 'abandonment',
    secondary_wound: 'shame'
  });
```

---

### 3. **IFS_personalized_curriculum**
**Purpose:** Store customized curriculum modules for each client
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `module_id` (VARCHAR) - Unique module identifier
- `module_order` (INTEGER) - Sequence number
- `module_title` (TEXT) - Customized title
- `customized_content` (JSONB) - Full module content
- `primary_wound_focus` (VARCHAR) - Wound this module targets

**Usage:**
```javascript
// Get personalized curriculum
const { data } = await supabase
  .from('IFS_personalized_curriculum')
  .select('*')
  .eq('client_id', clientId)
  .order('module_order', { ascending: true });
```

---

### 4. **IFS_client_progress**
**Purpose:** Track module and activity completion
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `module_id` (VARCHAR) - Module being tracked
- `activity_id` (VARCHAR) - Specific activity
- `completed` (BOOLEAN) - Completion status
- `responses` (JSONB) - Activity responses
- `time_spent_minutes` (INTEGER) - Time investment

**Usage:**
```javascript
// Save progress
const { data } = await supabase
  .from('IFS_client_progress')
  .upsert({
    client_id: clientId,
    module_id: 'module-1',
    activity_id: 'reflection-1',
    completed: true,
    time_spent_minutes: 15
  });
```

---

### 5. **IFS_journal_entries**
**Purpose:** Store client journal entries and reflections
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `title` (VARCHAR) - Entry title
- `content` (TEXT) - Journal content
- `mood` (VARCHAR) - Current mood
- `parts_identified` (TEXT[]) - Parts mentioned
- `related_wound` (VARCHAR) - Wound connection
- `is_breakthrough` (BOOLEAN) - Significant insight flag

**Usage:**
```javascript
// Save journal entry
const { data } = await supabase
  .from('IFS_journal_entries')
  .insert({
    client_id: clientId,
    title: 'Meeting My Inner Critic',
    content: 'Today I recognized...',
    mood: 'reflective',
    parts_identified: ['Inner Critic', 'Perfectionist'],
    related_wound: 'shame'
  });
```

---

### 6. **IFS_parts**
**Purpose:** Track identified IFS parts and their characteristics
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `part_name` (VARCHAR) - Name of the part
- `part_type` (VARCHAR) - manager, firefighter, exile
- `role` (VARCHAR) - Specific role (critic, caretaker, etc.)
- `triggers` (TEXT[]) - What activates this part
- `burdens` (TEXT[]) - Beliefs/emotions carried
- `unburdening_status` (VARCHAR) - Healing progress

**Usage:**
```javascript
// Save identified part
const { data } = await supabase
  .from('IFS_parts')
  .insert({
    client_id: clientId,
    part_name: 'The Perfectionist',
    part_type: 'manager',
    role: 'protector',
    triggers: ['criticism', 'mistakes'],
    burdens: ['I must be perfect to be loved'],
    related_wound: 'shame'
  });
```

---

### 7. **IFS_exercise_progress**
**Purpose:** Track completion of exercises and meditations
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `exercise_id` (VARCHAR) - Exercise identifier
- `exercise_type` (VARCHAR) - meditation, visualization, etc.
- `completed` (BOOLEAN) - Completion status
- `helpfulness_rating` (INTEGER) - 1-5 rating
- `parts_accessed` (TEXT[]) - Parts worked with

**Usage:**
```javascript
// Track exercise completion
const { data } = await supabase
  .from('IFS_exercise_progress')
  .upsert({
    client_id: clientId,
    exercise_id: 'meditation-1',
    exercise_type: 'meditation',
    completed: true,
    helpfulness_rating: 5,
    parts_accessed: ['Inner Child', 'Protector']
  });
```

---

### 8. **IFS_therapist_notes**
**Purpose:** Store therapist observations and notes
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `note_type` (VARCHAR) - session_note, observation, etc.
- `title` (VARCHAR) - Note title
- `content` (TEXT) - Note content
- `requires_follow_up` (BOOLEAN) - Follow-up needed
- `visible_to_client` (BOOLEAN) - Client visibility

**Usage:**
```javascript
// Add therapist note
const { data } = await supabase
  .from('IFS_therapist_notes')
  .insert({
    client_id: clientId,
    note_type: 'session_note',
    title: 'Session 3 - Breakthrough',
    content: 'Client identified primary protector...',
    requires_follow_up: true,
    visible_to_client: false
  });
```

---

### 9. **IFS_milestones**
**Purpose:** Record client achievements and breakthroughs
**Key Fields:**
- `client_id` (UUID) - Foreign key to IFS_clients
- `milestone_type` (VARCHAR) - Type of achievement
- `title` (VARCHAR) - Milestone title
- `description` (TEXT) - Details
- `badge_earned` (VARCHAR) - Badge/reward
- `points_earned` (INTEGER) - Points awarded

**Usage:**
```javascript
// Record milestone
const { data } = await supabase
  .from('IFS_milestones')
  .insert({
    client_id: clientId,
    milestone_type: 'module_completion',
    title: 'Completed Module 1',
    description: 'Successfully completed Introduction to IFS',
    badge_earned: 'First Steps',
    points_earned: 100
  });
```

---

### 10. **IFS_content_library**
**Purpose:** Store additional resources and materials
**Key Fields:**
- `content_type` (VARCHAR) - article, video, audio, etc.
- `title` (VARCHAR) - Resource title
- `content` (JSONB) - Structured content
- `wound_types` (TEXT[]) - Applicable wounds
- `module_ids` (TEXT[]) - Related modules
- `evidence_based` (BOOLEAN) - Research-backed flag

**Usage:**
```javascript
// Add resource
const { data } = await supabase
  .from('IFS_content_library')
  .insert({
    content_type: 'article',
    title: 'Understanding Abandonment Wounds',
    wound_types: ['abandonment'],
    module_ids: ['module-1', 'module-4'],
    evidence_based: true
  });
```

---

## Views

### IFS_client_dashboard
**Purpose:** Comprehensive client overview
**Returns:** Client info, wound profile, progress stats, activity counts

**Usage:**
```sql
SELECT * FROM IFS_client_dashboard WHERE client_id = 'uuid';
```

### IFS_module_progress_summary
**Purpose:** Detailed module progress analytics
**Returns:** Module completion percentages, time spent, activity counts

**Usage:**
```sql
SELECT * FROM IFS_module_progress_summary WHERE client_id = 'uuid';
```

---

## Common Queries

### Get Client by PIN
```sql
SELECT * FROM IFS_clients WHERE pin = '123456' AND status = 'active';
```

### Get Latest Assessment
```sql
SELECT * FROM IFS_assessment_results 
WHERE client_id = 'uuid' 
ORDER BY assessment_date DESC 
LIMIT 1;
```

### Get Personalized Curriculum
```sql
SELECT * FROM IFS_personalized_curriculum 
WHERE client_id = 'uuid' 
ORDER BY module_order ASC;
```

### Get Module Progress
```sql
SELECT * FROM IFS_client_progress 
WHERE client_id = 'uuid' AND module_id = 'module-1';
```

### Get All Journal Entries
```sql
SELECT * FROM IFS_journal_entries 
WHERE client_id = 'uuid' 
ORDER BY created_at DESC;
```

### Get Identified Parts
```sql
SELECT * FROM IFS_parts 
WHERE client_id = 'uuid' AND is_active = true;
```

### Get Completion Stats
```sql
SELECT 
  COUNT(DISTINCT module_id) as modules_started,
  COUNT(CASE WHEN completed THEN 1 END) as activities_completed
FROM IFS_client_progress 
WHERE client_id = 'uuid';
```

---

## Migration Notes

If you have existing data without the IFS_ prefix, you can migrate using:

```sql
-- Example: Rename existing table
ALTER TABLE clients RENAME TO IFS_clients;
ALTER TABLE assessment_results RENAME TO IFS_assessment_results;
-- Repeat for all tables
```

Or create new tables and migrate data:

```sql
-- Copy data from old to new
INSERT INTO IFS_clients SELECT * FROM clients;
INSERT INTO IFS_assessment_results SELECT * FROM assessment_results;
-- Repeat for all tables
```

---

## Table Relationships

```
IFS_clients (1) ──→ (many) IFS_assessment_results
IFS_clients (1) ──→ (many) IFS_personalized_curriculum
IFS_clients (1) ──→ (many) IFS_client_progress
IFS_clients (1) ──→ (many) IFS_journal_entries
IFS_clients (1) ──→ (many) IFS_parts
IFS_clients (1) ──→ (many) IFS_exercise_progress
IFS_clients (1) ──→ (many) IFS_therapist_notes
IFS_clients (1) ──→ (many) IFS_milestones

IFS_assessment_results (1) ──→ (many) IFS_personalized_curriculum
```

---

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Clients can only access their own data
- Therapist notes are not visible to clients by default
- Journal entries are private by default
- Content library is publicly readable

---

## Backup & Maintenance

### Backup All IFS Tables
```sql
-- Export all IFS tables
pg_dump -t 'IFS_*' your_database > ifs_backup.sql
```

### Check Table Sizes
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'IFS_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**Last Updated:** December 2025  
**Schema Version:** 1.0 with IFS_ prefix  
**Total Tables:** 10  
**Total Views:** 2