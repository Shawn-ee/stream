# Owner-Approved Camera and Audio Broadcast Test

## Result

Passed on 2026-08-24 using the existing private Cloudflare Stream Live Input. The physical Logitech C270 camera and its microphone reached Cloudflare signed playback as separate video and audio tracks. The capture was stopped automatically and the platform confirmed the Cloudflare input returned offline.

## Procedure and evidence

1. The owner explicitly approved one short private camera/microphone test immediately before the action.
2. OBS was not installed on the machine. The existing FFmpeg installation was used as a functionally equivalent RTMPS encoder; no software was installed.
3. A two-second local device probe confirmed `Logi C270 HD WebCam` video and `Microphone (Logi C270 HD WebCam)` audio could be captured together.
4. A read-only Cloudflare status check confirmed the existing input began in `disconnected` state.
5. The test streamed the physical camera and microphone to the existing RTMPS input. No Live Input or Cloudflare setting was created, modified, or deleted.
6. Creator status refresh normalized Cloudflare `status.current.state=connected` to local `live`.
7. The audience playback endpoint returned an authorized signed Cloudflare player URL.
8. An FFprobe read of the signed live manifest confirmed both `video` and `audio` streams were available through Cloudflare playback.
9. Capture was stopped. Cloudflare `status.current.state=disconnected` normalized to local `offline` within the verification window.

The RTMPS URL, stream key, Cloudflare token, and signed playback URL were never printed or written to repository files.

## Lifecycle defect found and corrected

Before broadcasting, the read-only status check showed that Cloudflare retains connected entries in `status.history` after the current input disconnects. The old normalizer searched the entire response and could therefore claim an offline input was live. It now reads only `status.current.state`; a regression test proves current `disconnected` wins over historical `connected`.

## Limitations

- The in-app browser's localhost URL policy blocked a fresh visual reload during the short live window. The signed audience endpoint and actual Cloudflare HLS audio/video tracks were verified programmatically, but this run does not claim a human visual/audio quality assessment.
- OBS-specific controls were not tested because OBS is not installed. FFmpeg exercised the same camera, microphone, RTMPS ingest, Cloudflare transcoding/delivery, lifecycle, and signed playback path.
- The test consumed a short amount of the existing Cloudflare Stream quota under explicit owner approval.

Run `npm run verify:camera-live` only after fresh owner approval immediately before each use and set `OWNER_APPROVED_CAMERA_TEST=yes` for that one process. The script otherwise refuses to start. It is intentionally excluded from default and staging gates.
