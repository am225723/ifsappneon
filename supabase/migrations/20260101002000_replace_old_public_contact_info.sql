-- Replace old public address/phone references in Supabase CMS content.
-- This removes stale references to 670 Prospect Ave, Hartford, CT 06105
-- and replaces the prior phone number with the current public contact information.

-- FAQ answers
update public.faqs
set
  answer = replace(
    replace(
      replace(
        replace(answer, '670 Prospect Ave, Hartford, CT 06105, USA', '45 South Main Street, Suite 111, West Hartford, CT 06107'),
        '670 Prospect Ave, Hartford, CT 06105', '45 South Main Street, Suite 111, West Hartford, CT 06107'
      ),
      '959-236-5722', '860.615.3629'
    ),
    '959.236.5722', '860.615.3629'
  ),
  updated_at = now()
where
  answer ilike '%670 Prospect Ave%'
  or answer ilike '%959-236-5722%'
  or answer ilike '%959.236.5722%';

-- Page metadata/content JSON
update public.pages
set
  seo_description = replace(
    replace(
      replace(
        replace(coalesce(seo_description, ''), '670 Prospect Ave, Hartford, CT 06105, USA', '45 South Main Street, Suite 111, West Hartford, CT 06107'),
        '670 Prospect Ave, Hartford, CT 06105', '45 South Main Street, Suite 111, West Hartford, CT 06107'
      ),
      '959-236-5722', '860.615.3629'
    ),
    '959.236.5722', '860.615.3629'
  ),
  content_json = replace(
    replace(
      replace(
        replace(content_json::text, '670 Prospect Ave, Hartford, CT 06105, USA', '45 South Main Street, Suite 111, West Hartford, CT 06107'),
        '670 Prospect Ave, Hartford, CT 06105', '45 South Main Street, Suite 111, West Hartford, CT 06107'
      ),
      '959-236-5722', '860.615.3629'
    ),
    '959.236.5722', '860.615.3629'
  )::jsonb,
  updated_at = now()
where
  coalesce(seo_description, '') ilike '%670 Prospect Ave%'
  or coalesce(seo_description, '') ilike '%959-236-5722%'
  or coalesce(seo_description, '') ilike '%959.236.5722%'
  or content_json::text ilike '%670 Prospect Ave%'
  or content_json::text ilike '%959-236-5722%'
  or content_json::text ilike '%959.236.5722%';

-- Article content, if the old info was accidentally used in articles.
update public.articles
set
  excerpt = replace(
    replace(
      replace(
        replace(coalesce(excerpt, ''), '670 Prospect Ave, Hartford, CT 06105, USA', '45 South Main Street, Suite 111, West Hartford, CT 06107'),
        '670 Prospect Ave, Hartford, CT 06105', '45 South Main Street, Suite 111, West Hartford, CT 06107'
      ),
      '959-236-5722', '860.615.3629'
    ),
    '959.236.5722', '860.615.3629'
  ),
  body = replace(
    replace(
      replace(
        replace(coalesce(body, ''), '670 Prospect Ave, Hartford, CT 06105, USA', '45 South Main Street, Suite 111, West Hartford, CT 06107'),
        '670 Prospect Ave, Hartford, CT 06105', '45 South Main Street, Suite 111, West Hartford, CT 06107'
      ),
      '959-236-5722', '860.615.3629'
    ),
    '959.236.5722', '860.615.3629'
  ),
  seo_description = replace(
    replace(
      replace(
        replace(coalesce(seo_description, ''), '670 Prospect Ave, Hartford, CT 06105, USA', '45 South Main Street, Suite 111, West Hartford, CT 06107'),
        '670 Prospect Ave, Hartford, CT 06105', '45 South Main Street, Suite 111, West Hartford, CT 06107'
      ),
      '959-236-5722', '860.615.3629'
    ),
    '959.236.5722', '860.615.3629'
  ),
  updated_at = now()
where
  coalesce(excerpt, '') ilike '%670 Prospect Ave%'
  or coalesce(body, '') ilike '%670 Prospect Ave%'
  or coalesce(seo_description, '') ilike '%670 Prospect Ave%'
  or coalesce(excerpt, '') ilike '%959-236-5722%'
  or coalesce(body, '') ilike '%959-236-5722%'
  or coalesce(seo_description, '') ilike '%959-236-5722%'
  or coalesce(excerpt, '') ilike '%959.236.5722%'
  or coalesce(body, '') ilike '%959.236.5722%'
  or coalesce(seo_description, '') ilike '%959.236.5722%';
