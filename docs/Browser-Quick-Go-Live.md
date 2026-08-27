# Browser-Native Quick Go Live

## Outcome

Quick Go Live lets an authenticated room owner explicitly grant browser camera/microphone permission, review a private preview, select devices, monitor microphone activity, and start or stop a Cloudflare WebRTC broadcast without OBS. Audience browsers use WHEP for that session. OBS remains available as the professional RTMPS/HLS mode.

## Security and media boundary

```text
Creator browser -- SDP --> Linux API -- SDP --> Cloudflare WHIP
Creator browser ===== direct encrypted WebRTC media =====> Cloudflare

Audience browser -- SDP --> Linux API -- SDP --> Cloudflare WHEP
Audience browser <==== direct encrypted WebRTC media ===== Cloudflare
```

The API discovers fixed provider endpoints with its account token and never returns those endpoints to browser code. It retains upstream resource locations only in process memory for bounded teardown. The database stores non-sensitive broadcast session identity, owner, room, transport, state, and timestamps. No SDP or provider URL is persisted.

Endpoint discovery is cached for five minutes and concurrent discovery requests share one provider call. Active browser sessions send an authenticated heartbeat every minute. If a tab crashes or disappears, the API terminates its in-memory upstream resource after three missed minutes. A signaling answer failure still retains the opaque local session identifier so the creator or viewer can clean up safely.

Publishing requires the authenticated room owner, CSRF validation, rate limits, an offline room, and no other active publisher. WHEP requires an authenticated viewer, a provider-confirmed live browser session, and any applicable private-show entitlement. HLS rejects browser-transport rooms, and WHEP rejects OBS-transport rooms.

## Lifecycle

```text
idle -> permission request -> private preview -> connecting
     -> provider-confirmed live -> stopping -> offline
```

A button click never proves live status. The existing Cloudflare lifecycle poller remains authoritative. Browser connection failures are shown safely, and the creator retains an End Broadcast recovery action. Abandoned database sessions age out before a replacement attempt; OBS mode can be selected explicitly while offline.

## Verification status

- Existing production input read-only capability check: WHIP available, WHEP available, input identity matched, disconnected before testing.
- Focused provider tests: SDP exchange, HTTPS enforcement, same-provider resource validation, teardown, and endpoint non-disclosure.
- Browser-client tests: creator audio/video track publishing and audience audio/video receive negotiation.
- Application tests: migration, schema, creator/audience/admin authorization, transport switching, Cloudflare-free failure, and existing workflows.
- Full local staging gate: passed.
- English/Chinese Creator Studio browser review: passed without granting real media permission.
- Production Compose build/migration/readiness/gateway/artifact gate: passed.
- Git/Linux deployment: commit `6aa776d` deployed; migration `012` applied; API/web healthy; public HTTPS bundle and camera/microphone policy headers verified; demo data reset.
- Physical creator proof: passed with the Logitech camera/microphone; private preview, WHIP publish, provider-confirmed live state, 3 minute 8 second session, explicit stop, provider disconnect, and offline recovery were observed.
- Physical audience WHEP proof: blocked by the existing Live Input's `requireSignedURLs=true` setting. The current low-volume Stream token endpoint does not support Live WebRTC; a Stream signing key or an owner-approved test-input policy change is required before retrying.

## Current limitation

Cloudflare WebRTC is beta and currently requires WHIP publishing to use WHEP playback. Recording, simulcasting, provider analytics, and provider viewer counts are not part of this milestone. The assigned input also requires signed playback. Cloudflare's [signed URL documentation](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/) says its low-volume token endpoint does not support Live WebRTC, so the production-safe WHEP path needs a signing key. OBS with signed HLS remains the fallback until that separately approved configuration is complete and operationally proven.
