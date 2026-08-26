import type { BroadcastStatus } from "./broadcast-status.js";

export type BroadcastRoom = { slug: string; liveInputId: string };

type BroadcastPollerOptions = {
  enabled: boolean;
  intervalMs?: number;
  listRooms: () => Promise<BroadcastRoom[]>;
  readStatus: (liveInputId: string) => Promise<BroadcastStatus>;
  persistStatus: (slug: string, status: BroadcastStatus) => Promise<unknown>;
  onError: (error: unknown, slug?: string) => void;
};

export function createBroadcastPoller(options: BroadcastPollerOptions) {
  const intervalMs = options.intervalMs ?? 15_000;
  let timer: NodeJS.Timeout | undefined;
  let running = false;

  async function pollOnce() {
    if (!options.enabled || running) return;
    running = true;
    try {
      const rooms = await options.listRooms();
      for (const room of rooms) {
        try {
          const status = await options.readStatus(room.liveInputId);
          await options.persistStatus(room.slug, status);
        } catch (error) {
          options.onError(error, room.slug);
        }
      }
    } catch (error) {
      options.onError(error);
    } finally {
      running = false;
    }
  }

  function start() {
    if (!options.enabled || timer) return;
    void pollOnce();
    timer = setInterval(() => void pollOnce(), intervalMs);
    timer.unref();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined;
  }

  return { pollOnce, start, stop };
}
