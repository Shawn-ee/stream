# Audience Retention Design

## Implemented local loop

- **Follow/favorite:** an audience account can follow or unfollow a creator. The relationship is unique, private to that audience account, and exposed through a dedicated followed-creator feed.
- **Truthful creator feed:** followed rooms show live/offline state, ordered language labels, public tags, regular schedule text, and an optional next-stream timestamp rendered in the creator-selected IANA timezone.
- **Lifecycle notifications:** a real room transition into or out of `live` creates one in-app notification per follower. A lifecycle-event-derived key prevents duplicates when status is checked repeatedly.
- **Notification control:** an account can list its own notifications and mark one or all as read. Ownership checks prevent changing another account's read state.
- **Creator scheduling:** Creator Studio accepts a regular schedule description, an optional next-stream timestamp, and a validated IANA timezone. The timestamp can be cleared and must remain within a bounded future window.

## Privacy and delivery boundary

This milestone uses only authenticated in-app data. It does not collect phone numbers, activate email, request browser push permission, add tracking pixels, or send messages through an external provider. A future email/push channel requires consent UX, unsubscribe/preferences, provider/data-processing review, rate limits, bounce handling, and separate owner approval.

## Operational behavior

Notifications are informational, not guaranteed emergency delivery. Repeated provider polling without a lifecycle transition does not create another notification. Unfollowing immediately removes the creator from the feed and prevents notifications for later transitions; historical notifications remain readable until normal retention rules are defined.
