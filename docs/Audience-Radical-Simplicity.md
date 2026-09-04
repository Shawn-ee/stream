# Audience Radical Simplicity

Holiwyn uses `/` as its one canonical audience homepage. The visible shell is limited to logo, global search, avatar/login, one compact filter row, genuine live rooms, and creator recommendations only when live inventory is insufficient. Following management, activity, notifications, wallet, profile, security, sessions, and persistent discovery preferences remain independent account routes.

## Search and routing

Every room has an immutable six-digit `public_room_id` backed by a uniqueness constraint. The ID contains no user or database identifier. `/room/:value` resolves either the public ID or the retained room slug. Exact IDs navigate directly; fuzzy search is read-only and ranks exact room, slug, creator, live, and tag matches without joining realtime presence. Legacy `/discover`, `/tags`, `/tags/:tag`, and `/categories` routes redirect to `/` and retain compatible query state.

Temporary discovery state uses `q`, comma-separated `languages`, comma-separated `tags`, and `following=true`. Multiple languages are ORed, multiple tags are ORed, and the language/tag groups are ANDed. Persistent recommendation preferences remain under `/account/preferences`.

## Room lifecycle

Only a provider-authoritative non-local `live` room mounts playback, chat, presence, gifts, actions, private-show state, or support activity. An offline room shows one state, one follow control, profile navigation, a valid next-stream timestamp when available, Browse live rooms, Copy link, and Report. Offline entry and authentication UI do not join realtime presence, increment viewers, or write viewing activity.

## Production data

Local simulation remains a Studio development capability and is filtered out of the audience homepage. Production must not show SIMULATED, TEST, MOCK, or fixture labels. Seed/demo deletion is intentionally not automated; a reviewed marker/report migration is still required before production cleanup.
