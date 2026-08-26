# Owner-Approved Public Camera and Audio Broadcast Test

## Result

Passed technically on 2026-08-26 through the public `https://holiwyn.online` deployment using the existing Cloudflare Stream Live Input. The physical Logitech C270 camera and its microphone reached signed playback as separate video and audio tracks. A second audience client running inside the Linux deployment authenticated through the public origin, observed the automatic live lifecycle, obtained authorized playback, and fetched the Cloudflare HLS manifest. Capture stopped automatically and the platform returned offline.

## Procedure and evidence

1. The owner explicitly approved one maximum two-minute camera/microphone test immediately before the action, including possible short recording/quota use.
2. OBS was not installed on the machine. The existing FFmpeg installation was used as a functionally equivalent RTMPS encoder; no software was installed.
3. A two-second local device probe confirmed `Logi C270 HD WebCam` video and `Microphone (Logi C270 HD WebCam)` audio could be captured together.
4. Production readiness and a read-only Cloudflare status check confirmed the configured existing input began offline.
5. The test streamed the physical camera and microphone to the existing RTMPS input. No Live Input or Cloudflare setting was created, modified, or deleted.
6. The deployed 15-second poller automatically normalized Cloudflare `status.current.state=connected` to local `live`; no fake-live endpoint or manual refresh was used for the transition.
7. The audience playback endpoint returned an authorized signed Cloudflare player URL.
8. An FFprobe read of the signed live manifest confirmed both `video` and `audio` streams were available through Cloudflare playback.
9. A separate audience client inside the Linux API container logged in via `https://holiwyn.online`, observed `live`, received signed playback authorization, and fetched a valid HLS manifest.
10. Capture was stopped. Automatic polling normalized Cloudflare `status.current.state=disconnected` to local `offline` within the verification window.
11. Demo data was reset, the production readiness gate passed again, all Stream containers remained healthy, and the existing Odoo containers remained running.

The RTMPS URL, stream key, Cloudflare token, and signed playback URL were never printed or written to tracked repository files. The restricted temporary credential handoff was deleted immediately after the test. The Linux production environment remains mode `600`.

## Lifecycle defect found and corrected

Before broadcasting, the read-only status check showed that Cloudflare retains connected entries in `status.history` after the current input disconnects. The old normalizer searched the entire response and could therefore claim an offline input was live. It now reads only `status.current.state`; a regression test proves current `disconnected` wins over historical `connected`.

## Limitations

- The signed audience endpoint, public HLS delivery, and actual audio/video tracks were verified programmatically. This run does not claim a human subjective picture/sound-quality assessment; the owner may perform that acceptance check from a separate device/network.
- OBS-specific controls were not tested because OBS is not installed. FFmpeg exercised the same camera, microphone, RTMPS ingest, Cloudflare transcoding/delivery, lifecycle, and signed playback path.
- Cloudflare may retain the short recording according to the existing Live Input policy. It was not deleted because recording deletion was not authorized.
- The test consumed a short amount of the existing Cloudflare Stream quota under explicit owner approval.

Run `npm run verify:camera-live` only after fresh owner approval immediately before each use and set `OWNER_APPROVED_CAMERA_TEST=yes` for that one process. The script otherwise refuses to start. It is intentionally excluded from default and staging gates.
