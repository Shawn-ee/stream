import { CreatorAvatar, creatorInitials } from "./avatar";
import { ShareButton } from "./share";

export type PublicUserProfile = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  bio: string;
  joinedAt: string;
  creatorActive: boolean;
  creatorRoomSlug?: string | null;
  creatorRoomTitle?: string | null;
  creatorLive?: boolean;
  isSelf: boolean;
  blocked: boolean;
};

export function AudienceProfileSurface({ profile, zh, onBack, onEdit, onCreator, onBlock, onReport }: {
  profile: PublicUserProfile;
  zh: boolean;
  onBack: () => void;
  onEdit?: () => void;
  onCreator?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
}) {
  const joined = new Date(profile.joinedAt).toLocaleDateString(zh ? "zh-CN" : "en-US", { year: "numeric", month: "long" });
  return <section className="public-audience-profile" aria-labelledby="public-user-name">
    <button type="button" className="creator-profile-back" onClick={onBack}><span aria-hidden="true">←</span>{zh ? "返回发现" : "Back to discovery"}</button>
    <div className="audience-profile-card">
      <div className="audience-profile-cover" aria-hidden="true"><span>{creatorInitials(profile.displayName)}</span></div>
      <div className="audience-profile-body">
        <CreatorAvatar name={profile.displayName} url={profile.avatarUrl} className="audience-profile-avatar" />
        <div className="audience-profile-copy">
          <div className="audience-profile-title"><div><h2 id="public-user-name">{profile.displayName}</h2><p>@{profile.handle}</p></div>{profile.creatorActive ? <span className="creator-capability-badge">{zh ? "主播" : "CREATOR"}</span> : null}</div>
          <p className="audience-profile-bio">{profile.bio || (zh ? "这个用户还没有添加简介。" : "This user has not added a bio yet.")}</p>
          <p className="audience-profile-joined">{zh ? `加入于 ${joined}` : `Joined ${joined}`}</p>
          <div className="audience-profile-actions">
            {profile.isSelf && onEdit ? <button type="button" onClick={onEdit}>{zh ? "编辑资料" : "Edit profile"}</button> : null}
            {profile.creatorActive && onCreator ? <button type="button" className={profile.creatorLive ? "live" : "secondary"} onClick={onCreator}>{profile.creatorLive ? (zh ? "观看直播" : "Watch live") : (zh ? "查看主播主页" : "View creator profile")}</button> : null}
            {!profile.isSelf && onBlock ? <button type="button" className="secondary" aria-pressed={profile.blocked} onClick={onBlock}>{profile.blocked ? (zh ? "取消屏蔽" : "Unblock") : (zh ? "屏蔽" : "Block")}</button> : null}
            {!profile.isSelf && onReport ? <button type="button" className="secondary" onClick={onReport}>{zh ? "举报" : "Report"}</button> : null}
          </div>
        </div>
      </div>
    </div>
    <p className="audience-profile-privacy">{zh ? "电子邮箱、钱包、浏览记录和关注列表始终为私密信息。" : "Email, wallet, viewing activity, and followed creators are always private."}</p>
  </section>;
}

function nextStreamLabel(
  value: string | null | undefined,
  zh: boolean,
) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(zh ? "zh-CN" : "en-US", {
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
  languages,
  tags,
  followerCount,
  scheduleText: _scheduleText,
  nextStreamAt,
  scheduleTimezone: _scheduleTimezone,
  roomTitle: _roomTitle,
  state,
  following,
  zh,
  onBack,
  onFollow,
  onOpenRoom,
  onShare,
}: {
  displayName: string;
  avatarUrl?: string | null;
  handle: string;
  bio: string;
  languages: Array<{ code: string; nameEn: string; nameNative: string; isPrimary: boolean }>;
  tags: Array<{ id: string; slug: string; displayName: string; type: string }>;
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
  onShare: () => void;
}) {
  const nextStream = nextStreamLabel(nextStreamAt, zh);
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
            <h2 id="public-creator-name">{displayName}</h2>
            <p>@{handle} · {followerCount.toLocaleString()} {zh ? "位关注者" : followerCount === 1 ? "follower" : "followers"}</p>
          </div>
          <div className="creator-profile-actions">
            <button type="button" className="creator-profile-follow" aria-pressed={following} onClick={onFollow}>
              {following ? (zh ? "已关注" : "Following") : (zh ? "关注" : "Follow")}
            </button>
            {state === "live"?<button type="button" className="creator-profile-watch live" onClick={onOpenRoom}>{zh ? "观看直播" : "Watch live"}</button>:null}
            <ShareButton label={zh ? "分享主播" : "Share creator"} onShare={onShare} />
          </div>
        </div>
      </div>

      <div className="creator-profile-information simplified">
        <article className="creator-profile-about">
          <p>{bio || (zh ? "主播暂未填写简介。" : "This creator has not added a bio yet.")}</p>
          {languages.length ? <span>{(zh ? "语言" : "Languages")}: {languages.map((item) => item.nameNative || item.nameEn).join(" · ")}</span> : null}
          {tags.length ? <span>{tags.slice(0, 3).map((item) => item.displayName).join(" · ")}</span> : null}
          {nextStream?<span>{zh?"下一场直播":"Next stream"}: <time dateTime={nextStreamAt??undefined}>{nextStream}</time></span>:null}
        </article>
      </div>
    </section>
  );
}
