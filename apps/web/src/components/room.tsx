import type { FormEvent } from "react";
import { CreatorAvatar } from "./avatar";
import { ShareButton } from "./share";

type ChatMessage = {
  id: string;
  sender: { displayName: string; handle?: string };
  body: string;
};

export function RoomCreatorBar({
  creatorName,
  avatarUrl,
  ariaLabel,
  title,
  languages,
  tags,
  state,
  stateLabel,
  presence,
  showPresence,
  presenceLabel,
  following,
  followLabel,
  unfollowLabel,
  giftLabel,
  shareLabel,
  copyLabel,
  giftEnabled,
  reportLabel,
  moreLabel,
  privateAccessLabel,
  privateAccessCost,
  profileLabel,
  onFollow,
  onGift,
  onShare,
  onCopy,
  onProfile,
  onReport,
  onBuyPrivateAccess,
}: {
  creatorName: string;
  avatarUrl?: string | null;
  ariaLabel: string;
  title: string;
  languages: Array<{ code: string; nameEn: string; nameNative: string; isPrimary: boolean }>;
  tags: Array<{ id: string; slug: string; displayName: string; type: string }>;
  state: string;
  stateLabel: string;
  presence: number;
  showPresence: boolean;
  presenceLabel: string;
  following: boolean;
  followLabel: string;
  unfollowLabel: string;
  giftLabel: string;
  shareLabel: string;
  copyLabel: string;
  giftEnabled: boolean;
  reportLabel: string;
  moreLabel: string;
  privateAccessLabel?: string;
  privateAccessCost?: number;
  profileLabel: string;
  onFollow: () => void;
  onGift: () => void;
  onShare: () => void;
  onCopy: () => void;
  onProfile: () => void;
  onReport: () => void;
  onBuyPrivateAccess?: () => void;
}) {
  return (
    <section className="room-creator-bar" aria-label={ariaLabel}>
      <button type="button" className="room-creator-profile-link" aria-label={profileLabel} onClick={onProfile}>
        <CreatorAvatar name={creatorName} url={avatarUrl} className={`room-creator-avatar state-${state}`} />
      </button>
      <div className="room-creator-copy">
        <div className="room-creator-name-row">
          <button type="button" className="room-creator-name-link" onClick={onProfile}>{creatorName}</button>
          <span className={`room-state state-${state}`}>{stateLabel}</span>
        </div>
        <h2>{title}</h2>
        <p>{languages.map((item) => item.nameNative || item.nameEn).join(" · ")}{showPresence?` · ${presence} ${presenceLabel}`:""}</p>
        {tags.length ? <div className="room-detail-tags">{tags.map((item) => <span key={item.id}>{item.displayName}</span>)}</div> : null}
      </div>
      <div className="room-creator-actions">
        <button type="button" className="room-follow-button" aria-pressed={following} onClick={onFollow}>
          {following ? unfollowLabel : followLabel}
        </button>
        {giftEnabled ? <button type="button" className="room-gift-jump" onClick={onGift}>{giftLabel}</button> : null}
        <ShareButton label={shareLabel} onShare={onShare} />
        {privateAccessLabel && onBuyPrivateAccess ? (
          <button type="button" className="room-private-button" onClick={onBuyPrivateAccess}>
            {privateAccessLabel}{privateAccessCost === undefined ? "" : ` · ${privateAccessCost}`}
          </button>
        ) : null}
        <details className="room-more-actions">
          <summary aria-label={moreLabel}>•••</summary>
          <div>
            <button type="button" onClick={onCopy}>{copyLabel}</button>
            <button type="button" data-auth-action="report" onClick={onReport}>{reportLabel}</button>
          </div>
        </details>
      </div>
    </section>
  );
}

export function LiveChatPanel({
  title,
  status,
  presence,
  presenceLabel,
  messages,
  draft,
  placeholder,
  sendLabel,
  giftLabel,
  giftEnabled,
  emptyLabel,
  onDraftChange,
  onSend,
  onGift,
  className = "",
  inputId = "room-chat-input",
}: {
  title: string;
  status: string;
  presence: number;
  presenceLabel: string;
  messages: ChatMessage[];
  draft: string;
  placeholder: string;
  sendLabel: string;
  giftLabel: string;
  giftEnabled: boolean;
  emptyLabel: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onGift: () => void;
  className?: string;
  inputId?: string;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSend();
  }
  return (
    <aside className={`chat room-chat ${className}`.trim()} aria-label={title}>
      <header className="room-chat-heading">
        <div>
          <h2>{title}</h2>
          <p>{status}</p>
        </div>
        <span>{presence} {presenceLabel}</span>
      </header>
      <div className="messages" aria-live="polite" aria-relevant="additions">
        {messages.length ? messages.map((item) => (
          <p className="chat-message" key={item.id}>
            {item.sender.handle ? <a className="chat-profile-link" href={`/@${encodeURIComponent(item.sender.handle)}`}><strong>{item.sender.displayName}</strong></a> : <strong>{item.sender.displayName}</strong>}
            <span>{item.body}</span>
          </p>
        )) : <p className="room-chat-empty">{emptyLabel}</p>}
      </div>
      {giftEnabled ? <div className="room-chat-actions"><button type="button" onClick={onGift}>{giftLabel}</button></div> : null}
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor={inputId}>{placeholder}</label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          maxLength={500}
          placeholder={placeholder}
        />
        <button>{sendLabel}</button>
      </form>
    </aside>
  );
}

export function MobileRoomOverlay({
  creatorName,
  avatarUrl,
  title,
  state,
  stateLabel,
  presence,
  presenceLabel,
  following,
  backLabel,
  followLabel,
  unfollowLabel,
  chatLabel,
  giftLabel,
  shareLabel,
  giftEnabled,
  chatEnabled,
  moreLabel,
  reportLabel,
  privateAccessLabel,
  profileLabel,
  onBack,
  onFollow,
  onProfile,
  onChat,
  onGift,
  onShare,
  onReport,
  onBuyPrivateAccess,
}: {
  creatorName: string;
  avatarUrl?: string | null;
  title: string;
  state: string;
  stateLabel: string;
  presence: number;
  presenceLabel: string;
  following: boolean;
  backLabel: string;
  followLabel: string;
  unfollowLabel: string;
  chatLabel: string;
  giftLabel: string;
  shareLabel: string;
  giftEnabled: boolean;
  chatEnabled: boolean;
  moreLabel: string;
  reportLabel: string;
  privateAccessLabel?: string;
  profileLabel: string;
  onBack: () => void;
  onFollow: () => void;
  onProfile: () => void;
  onChat: () => void;
  onGift: () => void;
  onShare: () => void;
  onReport: () => void;
  onBuyPrivateAccess?: () => void;
}) {
  return (
    <div className="mobile-room-overlay">
      <div className="mobile-room-topbar">
        <button type="button" aria-label={backLabel} onClick={onBack}><span aria-hidden="true">←</span></button>
        <span className={`room-state state-${state}`}>{stateLabel}</span>
      </div>
      <div className="mobile-room-identity">
        <button type="button" className="mobile-room-profile-link" aria-label={profileLabel} onClick={onProfile}>
          <CreatorAvatar name={creatorName} url={avatarUrl} className={`room-creator-avatar state-${state}`} />
        </button>
        <div>
          <strong>{creatorName}</strong>
          <span>{title}</span>
          {chatEnabled?<small>{presence} {presenceLabel}</small>:null}
        </div>
      </div>
      <div className="mobile-room-action-rail" aria-label={moreLabel}>
        <button type="button" aria-pressed={following} aria-label={following ? unfollowLabel : followLabel} onClick={onFollow}>
          <span aria-hidden="true">♥</span><small>{following ? unfollowLabel : followLabel}</small>
        </button>
        {chatEnabled?<button type="button" aria-label={chatLabel} onClick={onChat}>
          <span aria-hidden="true">✦</span><small>{chatLabel}</small>
        </button>:null}
        {giftEnabled ? (
          <button type="button" className="mobile-room-gift" aria-label={giftLabel} onClick={onGift}>
            <span aria-hidden="true">◆</span><small>{giftLabel}</small>
          </button>
        ) : null}
        <ShareButton label={shareLabel} onShare={onShare} className="mobile-room-share" />
        {privateAccessLabel && onBuyPrivateAccess ? (
          <button type="button" aria-label={privateAccessLabel} onClick={onBuyPrivateAccess}>
            <span aria-hidden="true">◇</span><small>{privateAccessLabel}</small>
          </button>
        ) : null}
        <details className="mobile-room-more">
          <summary aria-label={moreLabel}>•••</summary>
          <button type="button" data-auth-action="report" onClick={onReport}>{reportLabel}</button>
        </details>
      </div>
    </div>
  );
}
