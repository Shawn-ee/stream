import { useState } from "react";
import { LiveStreamCardSkeleton } from "./ui";
import { CreatorAvatar } from "./avatar";

export type DiscoveryRoom = {
  slug: string;
  title: string;
  status: string;
  streamer_id: string;
  streamer_name: string;
  avatar_url?: string | null;
  schedule_text?: string;
  next_stream_at?: string | null;
  schedule_timezone?: string;
  follower_count?: number;
  viewer_count?: number;
  is_following?: boolean;
  broadcast_state?: "live" | "connecting" | "offline" | "unavailable";
  broadcast_status_message?: string;
  broadcast_status_source?: "local" | "cloudflare";
  languages: {code:string;nameEn:string;nameNative:string;isPrimary:boolean}[];
  tags: {id:string;slug:string;displayName:string;type:string}[];
  stream_thumbnail_url?: string | null;
};
export type DiscoveryLanguage={code:string;name_en:string;name_native:string};
export type DiscoveryTag={id:string;slug:string;displayName:string;type:string};

type DiscoveryCopy = Record<string, string>;
export type MobileDiscoveryView = "for-you" | "following" | "live";

function roomState(room: DiscoveryRoom) {
  return room.broadcast_state ?? (room.status === "live" ? "live" : "offline");
}

function isSimulated(room: DiscoveryRoom) {
  return room.broadcast_status_source === "local";
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

export function RoomLanguageLabels({room,compact=false}:{room:DiscoveryRoom;compact?:boolean}){
  const languages=(room.languages??[]).slice(0,3);
  const visible=compact&&languages.length>1?[languages[0]]:languages;
  const full=languages.map(item=>item.nameEn).join(", ");
  return <span className="room-language-labels" aria-label={`Languages: ${full}`} title={full}>{visible.map(item=><span key={item.code}>{item.nameNative.length<=4?item.nameNative:item.code.toUpperCase()}</span>)}{compact&&languages.length>1?<span>+{languages.length-1}</span>:null}</span>;
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
      <span className={`live-card-preview room-card-art-${index % 6}`}>
        {room.stream_thumbnail_url ? <img className="live-card-thumbnail" src={room.stream_thumbnail_url} alt="" loading="lazy" decoding="async" /> : null}
        <span className="live-card-status">
          {state === "live" ? <i aria-hidden="true" /> : null}
          {isSimulated(room) ? (zh ? "模拟" : "SIMULATED") : stateLabel(state, zh)}
        </span>
        <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className="live-card-preview-avatar" />
        <RoomLanguageLabels room={room} compact />
        {state === "live" ? <span className="live-card-viewers">{room.viewer_count ?? 0} {zh ? "观看" : "watching"}</span> : null}
        <span className="mobile-live-card-overlay">
          <span className="mobile-live-card-meta">
            <span>{room.languages?.map(item=>item.nameNative).join(" · ")}</span>
            {room.tags?.slice(0,2).map(tag=><span key={tag.id}>#{tag.displayName}</span>)}
            {state === "live" ? <span>{room.viewer_count ?? 0} {zh ? "人正在观看" : "watching"}</span> : null}
          </span>
          <strong>{room.title}</strong>
          <span className="mobile-live-card-creator">
            <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className="mobile-live-card-avatar" />
            <span><b>{room.streamer_name}</b><small>{room.follower_count ?? 0} {t.followers}</small></span>
          </span>
          {state !== "live" ? <small className="mobile-live-card-schedule">{scheduleLabel(room, zh)}</small> : null}
          <span className="mobile-live-card-cta">{state === "live" ? (zh ? "进入直播" : "Watch live") : (zh ? "查看主播" : "View creator")}</span>
        </span>
      </span>
      <span className="live-card-details">
        <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className={`live-card-avatar state-${state}`} />
        <span className="live-card-copy">
          <strong>{room.title}</strong>
          <span className="live-card-creator">{room.streamer_name}</span>
          <small>{room.follower_count ?? 0} {t.followers}{room.is_following ? ` · ${zh ? "已关注" : "Following"}` : ""}</small>
          {room.tags?.length ? <span className="live-card-tags" aria-label={`${zh ? "标签" : "Tags"}: ${room.tags.map(tag=>tag.displayName).join(", ")}`}>{room.tags.slice(0,3).map(tag=><span key={tag.id}>#{tag.displayName}</span>)}</span> : null}
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
        {room.stream_thumbnail_url ? <img className="live-card-thumbnail" src={room.stream_thumbnail_url} alt="" /> : null}
        <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className="featured-live-avatar" />
      </div>
      <div className="featured-live-overlay">
        <span className="featured-kicker">
          {state === "live" ? <i aria-hidden="true" /> : null}
          {isSimulated(room) ? (zh ? "模拟直播状态" : "SIMULATED STATUS") : state === "live" ? (zh ? "精选直播" : "FEATURED LIVE") : (zh ? "推荐主播" : "FEATURED CREATOR")}
        </span>
        <div>
          <p>{room.streamer_name}{room.tags?.[0]?` · ${room.tags[0].displayName}`:""}</p>
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
  selectedLanguages,
  selectedTag,
  languages,
  tags,
  roomsLoading,
  followingLoading,
  roomsError,
  followingError,
  t,
  zh,
  onViewChange,
  onLanguagesChange,
  onTagChange,
  onRetry,
  onOpen,
}: {
  rooms: DiscoveryRoom[];
  following: DiscoveryRoom[];
  view: MobileDiscoveryView;
  selectedLanguages:string[];
  selectedTag:string;
  languages:DiscoveryLanguage[];
  tags:DiscoveryTag[];
  roomsLoading: boolean;
  followingLoading: boolean;
  roomsError: boolean;
  followingError: boolean;
  t: DiscoveryCopy;
  zh: boolean;
  onViewChange: (view: MobileDiscoveryView) => void;
  onLanguagesChange:(languages:string[])=>void;
  onTagChange:(tag:string)=>void;
  onRetry: () => void;
  onOpen: (room: DiscoveryRoom) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const tabs: { id: MobileDiscoveryView; en: string; zh: string }[] = [
    { id: "for-you", en: "For You", zh: "推荐" },
    { id: "following", en: "Following", zh: "关注" },
    { id: "live", en: "Live", zh: "直播" },
  ];
  const visibleRooms = view === "following"
    ? following
    : view === "live"
      ? rooms.filter((room) => roomState(room) === "live" && !isSimulated(room))
      : [...rooms].sort((a, b) => Number(roomState(b) === "live" && !isSimulated(b)) - Number(roomState(a) === "live" && !isSimulated(a)));
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
      : selectedLanguages.length
        ? (zh?"当前语言没有直播间。请清除筛选。":"No live rooms currently use these languages. Clear the filters to explore all rooms.")
        : selectedTag?(zh?"没有符合此标签的直播间。":"No rooms match this tag."):(zh?"没有符合搜索的主播或直播间。":"No creators or rooms match this search.");

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
        <button
          type="button"
          className="mobile-filter-toggle secondary"
          aria-expanded={filtersOpen}
          aria-controls="mobile-discovery-filter-panel"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          {zh ? "筛选" : "Filter"}{selectedTag||selectedLanguages.length ? " · 1+" : ""}
        </button>
        {filtersOpen ? <div className="mobile-filter-panel" id="mobile-discovery-filter-panel">
          <label className="mobile-language-filter">
            <span>{zh?"标签":"Tag"}</span>
            <select value={selectedTag} onChange={(event)=>onTagChange(event.target.value)} aria-label={zh?"内容标签":"Content tag"}>
              <option value="">{zh?"所有标签":"All tags"}</option>
              {tags.map(item=><option key={item.id} value={item.slug}>{item.displayName}</option>)}
            </select>
          </label>
          <fieldset className="mobile-language-multiselect"><legend>{zh?"直播语言":"Stream languages"}</legend>{languages.map(item=><label key={item.code}><input type="checkbox" checked={selectedLanguages.includes(item.code)} onChange={()=>onLanguagesChange(selectedLanguages.includes(item.code)?selectedLanguages.filter(code=>code!==item.code):[...selectedLanguages,item.code])}/>{zh?item.name_native:item.name_en}</label>)}</fieldset>
          {selectedTag||selectedLanguages.length?<button type="button" className="text-action" onClick={()=>{onLanguagesChange([]);onTagChange("");}}>{zh?"清除筛选":"Clear filters"}</button>:null}
        </div> : null}
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

export function FollowingAvatarRow({
  creators,
  zh,
  onOpen,
  onViewAll,
}: {
  creators: DiscoveryRoom[];
  zh: boolean;
  onOpen: (room: DiscoveryRoom) => void;
  onViewAll: () => void;
}) {
  const ordered = [...creators].sort((a, b) => {
    const aLive = roomState(a) === "live" && !isSimulated(a);
    const bLive = roomState(b) === "live" && !isSimulated(b);
    return Number(bLive) - Number(aLive);
  });
  return (
    <section className="following-avatar-section" aria-labelledby="following-avatar-title">
      <div className="compact-section-heading">
        <h2 id="following-avatar-title">{zh ? "正在关注" : "Following"}</h2>
        <button type="button" className="text-action" onClick={onViewAll}>{zh ? "查看全部" : "View all"}</button>
      </div>
      <div className="following-avatar-row">
        {ordered.length ? ordered.slice(0, 12).map((room) => {
          const live = roomState(room) === "live" && !isSimulated(room);
          return (
            <button type="button" className={`following-avatar-item ${live ? "is-live" : "is-offline"}`} key={room.streamer_id} onClick={() => onOpen(room)}>
              <span className="following-avatar-wrap">
                <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className="following-avatar" />
                {live ? <span className="following-live-badge">LIVE</span> : null}
              </span>
              <span>{room.streamer_name}</span>
            </button>
          );
        }) : <button type="button" className="following-avatar-empty" onClick={onViewAll}>
          <span aria-hidden="true">+</span>
          <span>{zh ? "关注主播后会显示在这里" : "Follow creators to see them here"}</span>
        </button>}
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
