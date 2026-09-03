-- Community labels are retained for audit/history but are no longer writable or public.
UPDATE tags
SET status = 'INACTIVE', creator_selectable = FALSE, updated_at = NOW()
WHERE tag_type = 'COMMUNITY';
