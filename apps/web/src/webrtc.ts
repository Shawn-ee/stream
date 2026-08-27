export type SignalingExchange = (offerSdp: string) => Promise<{
  answerSdp: string;
  sessionId: string;
}>;

export type WebRtcController = {
  peer: RTCPeerConnection;
  sessionId: string;
  close: () => void;
};

export async function waitForIceGathering(
  peer: RTCPeerConnection,
  timeoutMilliseconds = 8_000,
) {
  if (peer.iceGatheringState === "complete") return;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("ice_gathering_timeout"));
    }, timeoutMilliseconds);
    const changed = () => {
      if (peer.iceGatheringState !== "complete") return;
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      peer.removeEventListener("icegatheringstatechange", changed);
    };
    peer.addEventListener("icegatheringstatechange", changed);
  });
}

async function negotiate(
  peer: RTCPeerConnection,
  exchange: SignalingExchange,
) {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await waitForIceGathering(peer);
  const offerSdp = peer.localDescription?.sdp;
  if (!offerSdp) throw new Error("webrtc_offer_unavailable");
  const result = await exchange(offerSdp);
  if (!result.answerSdp.startsWith("v=0"))
    throw new Error("webrtc_answer_invalid");
  await peer.setRemoteDescription({ type: "answer", sdp: result.answerSdp });
  return result.sessionId;
}

export async function createWhipPublisher(
  stream: MediaStream,
  exchange: SignalingExchange,
  onConnectionState?: (state: RTCPeerConnectionState) => void,
): Promise<WebRtcController> {
  const peer = new RTCPeerConnection();
  for (const track of stream.getTracks()) peer.addTrack(track, stream);
  peer.addEventListener("connectionstatechange", () =>
    onConnectionState?.(peer.connectionState),
  );
  try {
    const sessionId = await negotiate(peer, exchange);
    return { peer, sessionId, close: () => peer.close() };
  } catch (error) {
    peer.close();
    throw error;
  }
}

export async function createWhepPlayer(
  exchange: SignalingExchange,
  onStream: (stream: MediaStream) => void,
  onConnectionState?: (state: RTCPeerConnectionState) => void,
): Promise<WebRtcController> {
  const peer = new RTCPeerConnection();
  const stream = new MediaStream();
  peer.addTransceiver("video", { direction: "recvonly" });
  peer.addTransceiver("audio", { direction: "recvonly" });
  peer.addEventListener("track", (event) => {
    stream.addTrack(event.track);
    onStream(stream);
  });
  peer.addEventListener("connectionstatechange", () =>
    onConnectionState?.(peer.connectionState),
  );
  try {
    const sessionId = await negotiate(peer, exchange);
    return { peer, sessionId, close: () => peer.close() };
  } catch (error) {
    peer.close();
    throw error;
  }
}

export async function replacePublishedTrack(
  controller: WebRtcController,
  track: MediaStreamTrack,
) {
  const sender = controller.peer
    .getSenders()
    .find((candidate) => candidate.track?.kind === track.kind);
  if (!sender) throw new Error("webrtc_sender_unavailable");
  await sender.replaceTrack(track);
}

export function stopMediaStream(stream: MediaStream | null) {
  for (const track of stream?.getTracks() ?? []) track.stop();
}
