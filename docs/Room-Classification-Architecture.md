# Room Classification Architecture

## Product model

Rooms are classified by structured languages and controlled tags. Category is no longer a room creation, publication, broadcast, discovery, search, or presentation requirement. The legacy `streamer_profiles.category`, `live_rooms.stream_language`, `live_rooms.stream_tags`, and `audience_discovery_preferences.preferred_categories` columns remain only as deprecated compatibility storage during the transition.

Every room has exactly one primary language and zero to two additional languages. `room_languages` preserves primary-first display order, rejects duplicates, and constrains the total to three. Codes come from `supported_languages`: `en`, `zh`, `es`, `ja`, `ko`, `fr`, `de`, `pt`, `ar`, and `hi`. Display text comes from the catalog. Language never implies country, nationality, ethnicity, or region, and the product renders no flags.

`tags` contains normalized, platform-controlled records. Creators may assign active `CONTENT`, `FORMAT`, and `MOOD` tags, with a room limit of eight. `SYSTEM` and `MODERATION` tags are never creator-selectable or returned as public classification. Trending and Featured are system-owned signals, not selectable tags. The former `COMMUNITY` type is deprecated: migration 029 marks those records inactive and non-selectable while preserving historical rows.

## API and discovery

Studio create/update commands accept `primaryLanguage`, `additionalLanguages`, and `tagIds`. All invariants and tag permissions are checked server-side in a transaction. Opening Studio, opening the classification form, and changing selections are read-only; only explicit create/save commands persist data. Draft rooms remain private.

Public rooms expose ordered `languages` and public content/format/mood `tags`. Search covers room titles, creator names/handles, public tags, and supported language codes/names. `languages=en,zh` uses OR semantics. `tag=live-music` is an exact normalized-slug filter. Query parameters are canonical URL state. Ranking uses authoritative live state, following, viewer count, freshness, recent viewing, language affinity, and tag affinity. Trending is calculated from system signals and cannot be submitted by creators.

## Migrations 027–029

Migration 027 adds catalogs and normalized join tables, backfills existing room languages, maps reviewed legacy categories, and records every observed value in `legacy_category_migration_report`. Migration 028 removes the old two-language check constraints so the compatibility mirror and onboarding locale can hold any enabled standard code.
Migration 029 stops new Community use without deleting historical rows. The public Community endpoint now returns `410 community_discovery_removed`.

| Legacy category | Resolution | Public tag |
| --- | --- | --- |
| Music | Mapped | `music` |
| Gaming | Mapped | `gaming` |
| Interview | Mapped | `interview` |
| Lifestyle | Mapped | `lifestyle` |
| Talk | Mapped | `conversation` |
| General | Omitted | — |
| Featured | Excluded system dimension | — |
| Unknown value | Manual review report | — |

The migration preserves room/user IDs and publication state, creates no rooms, and changes no creator status. Legacy readers may be supported temporarily, but new public and Studio contracts neither accept nor return Category. Compatibility-column removal is deferred until all external consumers have migrated and a production inventory has been reviewed.

## Privacy, integrity, and operations

Public discovery joins only published rooms owned by ACTIVE creators. Internal, moderation, and deprecated Community tags are excluded. Database indexes support language/tag discovery; deferred constraints protect the complete language set, while API validation supplies stable client errors.

Run `npm run verify:room-classification` after migration and seed. It verifies catalogs, three-language ordering, invalid-set rejection, tag permissions, filtering, public privacy, migration decisions, the absence of flag glyphs, and the no-navigation-side-effect invariant.
