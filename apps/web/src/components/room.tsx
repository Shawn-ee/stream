import type { FormEvent } from "react";

type ChatMessage = {
  id: string;
  sender: { displayName: string };
  body: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function RoomCreatorBar({
  creatorName,
  ariaLabel,
  title,
  category,
  state,
  stateLabel,
  presence,
  presenceLabel,
  following,
  followLabel,
  unfollowLabel,
  giftLabel,
  reportLabel,
  moreLabel,
  privateAccessLabel,
  privateAccessCost,
  profileLabel,
  onFollow,
  onProfile,
  onReport,
  onBuyPrivateAccess,
}: {
  creatorName: string;
  ariaLabel: string;
  title: string;
  category: string;
  state: string;
  stateLabel: string;
  presence: number;
  presenceLabel: string;
  following: boolean;
  followLabel: string;
  unfollowLabel: string;
  giftLabel: string;
  reportLabel: string;
  moreLabel: string;
  privateAccessLabel?: string;
  privateAccessCost?: number;
  profileLabel: string;
  onFollow: () => void;
  onProfile: () => void;
  onReport: () => void;
  onBuyPrivateAccess?: () => void;
}) {
  return (
    <section className="room-creator-bar" aria-label={ariaLabel}>
      <button type="button" className="room-creator-profile-link" aria-label={profileLabel} onClick={onProfile}>
        <span className={`room-creator-avatar state-${state}`} aria-hidden="true">{initials(creatorName)}</span>
      </button>
      <div className="room-creator-copy">
        <div className="room-creator-name-row">
          <button type="button" className="room-creator-name-link" onClick={onProfile}>{creatorName}</button>
          <span className={`room-state state-${state}`}>{stateLabel}</span>
        </div>
        <h2>{title}</h2>
        <p>{category} · {presence} {presenceLabel}</p>
      </div>
      <div className="room-creator-actions">
        <button type="button" className="room-follow-button" aria-pressed={following} onClick={onFollow}>
          {following ? unfollowLabel : followLabel}
        </button>
        <a className="room-gift-jump" href="#room-gifts">{giftLabel}</a>
        {privateAccessLabel && onBuyPrivateAccess ? (
          <button type="button" className="room-private-button" onClick={onBuyPrivateAccess}>
            {privateAccessLabel}{privateAccessCost === undefined ? "" : ` · ${privateAccessCost}`}
          </button>
        ) : null}
        <details className="room-more-actions">
          <summary aria-label={moreLabel}>•••</summary>
          <div><button type="button" onClick={onReport}>{reportLabel}</button></div>
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
  emptyLabel,
  onDraftChange,
  onSend,
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
  emptyLabel: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
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
            <strong>{item.sender.displayName}</strong>
            <span>{item.body}</span>
          </p>
        )) : <p className="room-chat-empty">{emptyLabel}</p>}
      </div>
      <div className="room-chat-actions"><a href="#room-gifts">{giftLabel}</a></div>
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
  moreLabel,
  reportLabel,
  privateAccessLabel,
  profileLabel,
  onBack,
  onFollow,
  onProfile,
  onChat,
  onGift,
  onReport,
  onBuyPrivateAccess,
}: {
  creatorName: string;
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
  moreLabel: string;
  reportLabel: string;
  privateAccessLabel?: string;
  profileLabel: string;
  onBack: () => void;
  onFollow: () => void;
  onProfile: () => void;
  onChat: () => void;
  onGift: () => void;
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
          <span className={`room-creator-avatar state-${state}`} aria-hidden="true">{initials(creatorName)}</span>
        </button>
        <div>
          <strong>{creatorName}</strong>
          <span>{title}</span>
          <small>{presence} {presenceLabel}</small>
        </div>
      </div>
      <div className="mobile-room-action-rail" aria-label={moreLabel}>
        <button type="button" aria-pressed={following} aria-label={following ? unfollowLabel : followLabel} onClick={onFollow}>
          <span aria-hidden="true">♥</span><small>{following ? unfollowLabel : followLabel}</small>
        </button>
        <button type="button" aria-label={chatLabel} onClick={onChat}>
          <span aria-hidden="true">✦</span><small>{chatLabel}</small>
        </button>
        <button type="button" className="mobile-room-gift" aria-label={giftLabel} onClick={onGift}>
          <span aria-hidden="true">◆</span><small>{giftLabel}</small>
        </button>
        {privateAccessLabel && onBuyPrivateAccess ? (
          <button type="button" aria-label={privateAccessLabel} onClick={onBuyPrivateAccess}>
            <span aria-hidden="true">◇</span><small>{privateAccessLabel}</small>
          </button>
        ) : null}
        <details className="mobile-room-more">
          <summary aria-label={moreLabel}>•••</summary>
          <button type="button" onClick={onReport}>{reportLabel}</button>
        </details>
      </div>
    </div>
  );
}
