import { CreatorAvatar, creatorInitials } from "./avatar";

function nextStreamLabel(
  value: string | null | undefined,
  timezone: string | undefined,
  zh: boolean,
) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(zh ? "zh-CN" : "en-US", {
      timeZone: timezone || undefined,
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

export function CreatorProfileSurface({
  displayName,
  avatarUrl,
  handle,
  bio,
  category,
  followerCount,
  scheduleText,
  nextStreamAt,
  scheduleTimezone,
  roomTitle,
  state,
  following,
  zh,
  onBack,
  onFollow,
  onOpenRoom,
}: {
  displayName: string;
  avatarUrl?: string | null;
  handle: string;
  bio: string;
  category: string;
  followerCount: number;
  scheduleText: string;
  nextStreamAt?: string | null;
  scheduleTimezone?: string;
  roomTitle: string;
  state: "live" | "connecting" | "offline" | "unavailable";
  following: boolean;
  zh: boolean;
  onBack: () => void;
  onFollow: () => void;
  onOpenRoom: () => void;
}) {
  const nextStream = nextStreamLabel(nextStreamAt, scheduleTimezone, zh);
  const stateText = state === "live"
    ? (zh ? "直播中" : "LIVE NOW")
    : state === "connecting"
      ? (zh ? "正在准备直播" : "STARTING SOON")
      : state === "unavailable"
        ? (zh ? "直播状态暂时不可用" : "STATUS UNAVAILABLE")
        : (zh ? "当前离线" : "OFFLINE");
  return (
    <section className={`public-creator-profile state-${state}`} aria-labelledby="public-creator-name">
      <button type="button" className="creator-profile-back" onClick={onBack}>
        <span aria-hidden="true">←</span> {zh ? "返回发现" : "Back to discovery"}
      </button>
      <div className="creator-profile-hero">
        <div className="creator-profile-hero-art" aria-hidden="true">
          <span>{creatorInitials(displayName)}</span>
        </div>
        <div className="creator-profile-identity">
          <CreatorAvatar name={displayName} url={avatarUrl} className={`creator-profile-avatar state-${state}`} />
          <div className="creator-profile-name">
            <span className={`creator-profile-state state-${state}`}>{stateText}</span>
            <h2 id="public-creator-name">{displayName}</h2>
            <p>@{handle} · {followerCount.toLocaleString()} {zh ? "位关注者" : followerCount === 1 ? "follower" : "followers"}</p>
          </div>
          <div className="creator-profile-actions">
            <button type="button" className="creator-profile-follow" aria-pressed={following} onClick={onFollow}>
              {following ? (zh ? "已关注" : "Following") : (zh ? "关注" : "Follow")}
            </button>
            <button type="button" className={state === "live" ? "creator-profile-watch live" : "creator-profile-watch"} onClick={onOpenRoom}>
              {state === "live" ? (zh ? "观看直播" : "Watch live") : (zh ? "进入直播间" : "Visit room")}
            </button>
          </div>
        </div>
      </div>

      <div className="creator-profile-information">
        <article className="creator-profile-about">
          <p className="eyebrow">{zh ? "关于主播" : "ABOUT"}</p>
          <h3>{zh ? "认识" : "Meet"} {displayName}</h3>
          <p>{bio || (zh ? "主播暂未填写简介。" : "This creator has not added a bio yet.")}</p>
          <span>{category}</span>
        </article>
        <article className="creator-profile-schedule">
          <p className="eyebrow">{zh ? "直播日程" : "SCHEDULE"}</p>
          <h3>{nextStream ? (zh ? "下一场直播" : "Next stream") : (zh ? "常规直播时间" : "Regular schedule")}</h3>
          {nextStream ? <time dateTime={nextStreamAt ?? undefined}>{nextStream}</time> : null}
          <p>{scheduleText || (zh ? "直播时间待公布。" : "Stream times will be announced here.")}</p>
          {scheduleTimezone ? <small>{zh ? "时区" : "Timezone"}: {scheduleTimezone}</small> : null}
        </article>
      </div>

      <article className={`creator-profile-current-room state-${state}`}>
        <div className="creator-profile-room-art" aria-hidden="true">
          <CreatorAvatar name={displayName} url={avatarUrl} className="creator-profile-room-avatar" />
          <strong>{stateText}</strong>
        </div>
        <div>
          <p className="eyebrow">{zh ? "直播间" : "CURRENT ROOM"}</p>
          <h3>{roomTitle}</h3>
          <p>{state === "live" ? (zh ? "直播正在进行，立即加入互动。" : "The broadcast is live. Join the room now.") : (zh ? "主播离线时仍可查看日程和直播间信息。" : "Visit the room for the schedule and offline details.")}</p>
          <button type="button" onClick={onOpenRoom}>
            {state === "live" ? (zh ? "立即观看" : "Watch now") : (zh ? "查看直播间" : "View room")}
          </button>
        </div>
      </article>
    </section>
  );
}
