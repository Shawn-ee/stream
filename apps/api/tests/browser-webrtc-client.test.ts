import assert from "node:assert/strict";
import test from "node:test";

const offer = "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=offer\r\nt=0 0\r\n";
const answer = "v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\ns=answer\r\nt=0 0\r\n";

class FakeMediaStream {
  tracks: unknown[] = [];
  constructor(tracks: unknown[] = []) {
    this.tracks = [...tracks];
  }
  getTracks() {
    return this.tracks;
  }
  addTrack(track: unknown) {
    this.tracks.push(track);
  }
}

class FakePeerConnection {
  iceGatheringState = "complete";
  connectionState = "new";
  localDescription: { sdp: string } | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  addedTracks: unknown[] = [];
  senders: Array<{ track: { kind: string }; replaceTrack: (track: unknown) => Promise<void> }> = [];
  transceivers: string[] = [];
  listeners = new Map<string, Array<(event: { track: unknown }) => void>>();
  async createOffer() {
    return { type: "offer" as const, sdp: offer };
  }
  async setLocalDescription(description: { sdp?: string }) {
    this.localDescription = { sdp: description.sdp ?? "" };
  }
  async setRemoteDescription(description: { type: string; sdp: string }) {
    this.remoteDescription = description;
  }
  addTrack(track: unknown) {
    this.addedTracks.push(track);
    const typedTrack = track as { kind: string };
    this.senders.push({
      track: typedTrack,
      replaceTrack: async (replacement: unknown) => {
        const replacementTrack = replacement as { kind: string };
        if (replacementTrack.kind !== typedTrack.kind)
          throw new Error("replacement_kind_mismatch");
        typedTrack.kind = replacementTrack.kind;
        this.replacedTrack = replacementTrack;
      },
    });
  }
  replacedTrack: { kind: string } | null = null;
  getSenders() {
    return this.senders;
  }
  addTransceiver(kind: string) {
    this.transceivers.push(kind);
  }
  addEventListener(name: string, listener: (event: { track: unknown }) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  removeEventListener() {}
  close() {
    this.connectionState = "closed";
  }
  emitTrack(track: unknown) {
    for (const listener of this.listeners.get("track") ?? []) listener({ track });
  }
}

Object.assign(globalThis, {
  window: { setTimeout, clearTimeout },
  MediaStream: FakeMediaStream,
  RTCPeerConnection: FakePeerConnection,
});

const { createWhipPublisher, createWhepPlayer, replacePublishedTrack } = await import(
  "../../web/src/webrtc.js"
);

test("browser publisher adds media tracks and applies the signaling answer", async () => {
  const tracks = [{ kind: "video" }, { kind: "audio" }];
  const controller = await createWhipPublisher(
    new FakeMediaStream(tracks) as unknown as MediaStream,
    async (sdp) => {
      assert.equal(sdp, offer);
      return { answerSdp: answer, sessionId: "publisher-session" };
    },
  );
  const peer = controller.peer as unknown as FakePeerConnection;
  assert.deepEqual(peer.addedTracks, tracks);
  assert.equal(peer.remoteDescription?.sdp, answer);
  assert.equal(controller.sessionId, "publisher-session");
  controller.close();
});

test("browser publisher can replace a camera track without renegotiating", async () => {
  const originalVideo = { kind: "video" };
  const controller = await createWhipPublisher(
    new FakeMediaStream([originalVideo]) as unknown as MediaStream,
    async () => ({ answerSdp: answer, sessionId: "publisher-switch" }),
  );
  const replacementVideo = { kind: "video" };
  await replacePublishedTrack(
    controller,
    replacementVideo as unknown as MediaStreamTrack,
  );
  const peer = controller.peer as unknown as FakePeerConnection;
  assert.equal(peer.replacedTrack, replacementVideo);
  await assert.rejects(
    () =>
      replacePublishedTrack(
        controller,
        { kind: "audio" } as unknown as MediaStreamTrack,
      ),
    /webrtc_sender_unavailable/,
  );
  controller.close();
});

test("browser player requests audio/video and attaches received tracks", async () => {
  let received: FakeMediaStream | null = null;
  const controller = await createWhepPlayer(
    async () => ({ answerSdp: answer, sessionId: "viewer-session" }),
    (stream) => {
      received = stream as unknown as FakeMediaStream;
    },
  );
  const peer = controller.peer as unknown as FakePeerConnection;
  assert.deepEqual(peer.transceivers, ["video", "audio"]);
  peer.emitTrack({ kind: "video" });
  assert.equal(received?.getTracks().length, 1);
  assert.equal(controller.sessionId, "viewer-session");
  controller.close();
});
