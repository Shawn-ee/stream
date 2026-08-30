import { LiveStreamCardSkeleton } from "./ui";
import { CreatorAvatar } from "./avatar";

export type DiscoveryRoom = {
  slug: string;
  title: string;
  status: string;
  streamer_id: string;
  streamer_name: string;
  avatar_url?: string | null;
  category: string;
  schedule_text?: string;
  next_stream_at?: string | null;
  schedule_timezone?: string;
  follower_count?: number;
  broadcast_state?: "live" | "connecting" | "offline" | "unavailable";
};

type DiscoveryCopy = Record<string, string>;
export type MobileDiscoveryView = "for-you" | "following" | "live";

function roomState(room: DiscoveryRoom) {
  return room.broadcast_state ?? (room.status === "live" ? "live" : "offline");
}

function stateLabel(state: string, zh: boolean) {
  if (state === "live") return zh ? "直播中" : "LIVE";
  if (state === "connecting") return zh ? "连接中" : "STARTING";
  if (state === "unavailable") return zh ? "状态未知" : "UNAVAILABLE";
  return zh ? "离线" : "OFFLINE";
}

function scheduleLabel(room: DiscoveryRoom, zh: boolean) {
  if (!room.next_stream_at) return room.schedule_text || (zh ? "日程待定" : "Schedule coming soon");
  try {
    return `${zh ? "下一场" : "Next"}: ${new Date(room.next_stream_at).toLocaleString(
      zh ? "zh-CN" : "en-US",
      { timeZone: room.schedule_timezone || undefined, dateStyle: "medium", timeStyle: "short" },
    )}`;
  } catch {
    return room.schedule_text || (zh ? "日程待定" : "Schedule coming soon");
  }
}

export function LiveStreamCard({
  room,
  index,
  t,
  zh,
  onOpen,
}: {
  room: DiscoveryRoom;
  index: number;
  t: DiscoveryCopy;
  zh: boolean;
  onOpen: (room: DiscoveryRoom) => void;
}) {
  const state = roomState(room);
  return (
    <button
      type="button"
      className={`live-stream-card state-${state}`}
      onClick={() => onOpen(room)}
      aria-label={`${room.streamer_name}: ${room.title}`}
    >
      <span className={`live-card-preview room-card-art-${index % 4}`}>
        <span className="live-card-status">
          {state === "live" ? <i aria-hidden="true" /> : null}
          {stateLabel(state, zh)}
        </span>
        <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className="live-card-preview-avatar" />
        <span className="live-card-category">{room.category}</span>
      </span>
      <span className="live-card-details">
        <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className={`live-card-avatar state-${state}`} />
        <span className="live-card-copy">
          <strong>{room.title}</strong>
          <span className="live-card-creator">{room.streamer_name}</span>
          <small>{room.follower_count ?? 0} {t.followers}</small>
        </span>
      </span>
    </button>
  );
}

export function FeaturedLive({
  room,
  zh,
  onOpen,
  onProfile,
}: {
  room: DiscoveryRoom;
  zh: boolean;
  onOpen: (room: DiscoveryRoom) => void;
  onProfile?: (room: DiscoveryRoom) => void;
}) {
  const state = roomState(room);
  return (
    <section className={`featured-live state-${state}`} aria-labelledby="featured-live-title">
      <div className="featured-live-art room-card-art-0" aria-hidden="true">
        <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className="featured-live-avatar" />
      </div>
      <div className="featured-live-overlay">
        <span className="featured-kicker">
          {state === "live" ? <i aria-hidden="true" /> : null}
          {state === "live" ? (zh ? "精选直播" : "FEATURED LIVE") : (zh ? "推荐主播" : "FEATURED CREATOR")}
        </span>
        <div>
          <p>{room.streamer_name} · {room.category}</p>
          <h2 id="featured-live-title">{room.title}</h2>
          <p className="featured-schedule">{scheduleLabel(room, zh)}</p>
        </div>
        <button type="button" onClick={() => state === "live" || !onProfile ? onOpen(room) : onProfile(room)}>
          {state === "live" ? (zh ? "观看直播" : "Watch live") : (zh ? "查看主播" : "View creator")}
        </button>
      </div>
    </section>
  );
}

export function MobileDiscoveryFeed({
  rooms,
  following,
  view,
  category,
  categories,
  roomsLoading,
  followingLoading,
  roomsError,
  followingError,
  t,
  zh,
  onViewChange,
  onCategoryChange,
  onRetry,
  onOpen,
}: {
  rooms: DiscoveryRoom[];
  following: DiscoveryRoom[];
  view: MobileDiscoveryView;
  category: string;
  categories: string[];
  roomsLoading: boolean;
  followingLoading: boolean;
  roomsError: boolean;
  followingError: boolean;
  t: DiscoveryCopy;
  zh: boolean;
  onViewChange: (view: MobileDiscoveryView) => void;
  onCategoryChange: (category: string) => void;
  onRetry: () => void;
  onOpen: (room: DiscoveryRoom) => void;
}) {
  const tabs: { id: MobileDiscoveryView; en: string; zh: string }[] = [
    { id: "for-you", en: "For You", zh: "推荐" },
    { id: "following", en: "Following", zh: "关注" },
    { id: "live", en: "Live", zh: "直播" },
  ];
  const visibleRooms = view === "following"
    ? following
    : view === "live"
      ? rooms.filter((room) => roomState(room) === "live")
      : [...rooms].sort((a, b) => Number(roomState(b) === "live") - Number(roomState(a) === "live"));
  const loading = view === "following" ? followingLoading : roomsLoading;
  const error = view === "following" ? followingError : roomsError;
  const emptyTitle = view === "following"
    ? (zh ? "尚未关注主播" : "No followed creators yet")
    : view === "live"
      ? (zh ? "暂时没有直播" : "Nobody is live right now")
      : (zh ? "没有找到主播" : "No creators found");
  const emptyDescription = view === "following"
    ? (zh ? "从推荐列表进入直播间并关注喜欢的主播。" : "Open a room from For You and follow creators you want to see again.")
    : view === "live"
      ? (zh ? "可以先看看推荐主播，直播开始后状态会自动更新。" : "Explore recommended creators while live status updates automatically.")
      : (zh ? "请尝试其他搜索或清除分类筛选。" : "Try another search or clear the category filter.");

  return (
    <section className="mobile-discovery-feed" aria-labelledby="mobile-discovery-title">
      <header className="mobile-discovery-heading">
        <div>
          <p className="eyebrow">{zh ? "发现主播" : "DISCOVER CREATORS"}</p>
          <h2 id="mobile-discovery-title">{zh ? "现在想看谁？" : "Who do you want to watch?"}</h2>
        </div>
        <span>{visibleRooms.length} {zh ? "位主播" : visibleRooms.length === 1 ? "creator" : "creators"}</span>
      </header>
      <div className="mobile-discovery-controls">
        <div className="mobile-discovery-tabs" role="tablist" aria-label={zh ? "发现筛选" : "Discovery filters"}>
          {tabs.map((tab) => (
            <button
              type="button"
              role="tab"
              key={tab.id}
              aria-selected={view === tab.id}
              onClick={() => onViewChange(tab.id)}
            >
              {zh ? tab.zh : tab.en}
            </button>
          ))}
        </div>
        <label className="mobile-category-filter">
          <span className="sr-only">{t.allCategories}</span>
          <select value={category} onChange={(event) => onCategoryChange(event.target.value)} aria-label={t.allCategories}>
            <option value="">{t.allCategories}</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="mobile-live-feed-list" aria-live="polite">
        {loading ? (
          <LiveStreamCardSkeleton count={3} label={zh ? "正在加载主播" : "Loading live creators"} />
        ) : error ? (
          <div className="mobile-discovery-empty" role="alert">
            <span aria-hidden="true">!</span>
            <strong>{zh ? "暂时无法加载主播" : "Creators are temporarily unavailable"}</strong>
            <p>{zh ? "请检查连接后重试。" : "Check the connection and try again."}</p>
            <button type="button" onClick={onRetry}>{zh ? "重试" : "Try again"}</button>
          </div>
        ) : visibleRooms.length ? visibleRooms.map((room, index) => (
          <LiveStreamCard key={room.slug} room={room} index={index} t={t} zh={zh} onOpen={onOpen} />
        )) : (
          <div className="mobile-discovery-empty">
            <span aria-hidden="true">◉</span>
            <strong>{emptyTitle}</strong>
            <p>{emptyDescription}</p>
            {view !== "for-you" ? (
              <button type="button" onClick={() => onViewChange("for-you")}>{zh ? "查看推荐" : "Explore For You"}</button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function CreatorRailRow({
  room,
  zh,
  compact,
  onOpen,
}: {
  room: DiscoveryRoom;
  zh: boolean;
  compact: boolean;
  onOpen: (room: DiscoveryRoom) => void;
}) {
  const state = roomState(room);
  return (
    <button type="button" className="creator-rail-row" onClick={() => onOpen(room)} title={compact ? room.streamer_name : undefined}>
      <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className={`creator-rail-avatar state-${state}`} />
      {!compact ? (
        <span className="creator-rail-copy">
          <strong>{room.streamer_name}</strong>
          <small>{state === "live" ? (zh ? "正在直播" : "Live now") : stateLabel(state, zh)}</small>
        </span>
      ) : null}
      {!compact && state === "live" ? <span className="creator-rail-live-dot" aria-label={zh ? "直播中" : "Live"} /> : null}
    </button>
  );
}

export function DesktopDiscoveryRail({
  rooms,
  following,
  collapsed,
  zh,
  onToggle,
  onOpen,
}: {
  rooms: DiscoveryRoom[];
  following: DiscoveryRoom[];
  collapsed: boolean;
  zh: boolean;
  onToggle: () => void;
  onOpen: (room: DiscoveryRoom) => void;
}) {
  const recommended = [...rooms]
    .sort((a, b) => Number(roomState(b) === "live") - Number(roomState(a) === "live"))
    .slice(0, 6);
  return (
    <aside className={`desktop-discovery-rail ${collapsed ? "collapsed" : ""}`} aria-label={zh ? "主播发现" : "Creator discovery"}>
      <button
        type="button"
        className="creator-rail-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? (zh ? "展开主播栏" : "Expand creator sidebar") : (zh ? "收起主播栏" : "Collapse creator sidebar")}
      >
        <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
        {!collapsed ? (zh ? "收起" : "Collapse") : null}
      </button>
      <section>
        {!collapsed ? <h2>{zh ? "为你推荐" : "FOR YOU"}</h2> : null}
        <div className="creator-rail-list">
          {recommended.map((room) => <CreatorRailRow key={room.slug} room={room} zh={zh} compact={collapsed} onOpen={onOpen} />)}
        </div>
      </section>
      {following.length ? (
        <section>
          {!collapsed ? <h2>{zh ? "已关注" : "FOLLOWING"}</h2> : null}
          <div className="creator-rail-list">
            {following.slice(0, 5).map((room) => <CreatorRailRow key={room.slug} room={room} zh={zh} compact={collapsed} onOpen={onOpen} />)}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
