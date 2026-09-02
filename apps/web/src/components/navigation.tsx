import { useEffect, useRef } from "react";

export type MobileTab = "home" | "discover" | "go-live" | "inbox" | "me";

export function AudienceAccountMenu({
  open,
  initials,
  displayName,
  handle,
  zh,
  onToggle,
  onClose,
  onFollowing,
  onAccount,
  onWallet,
  onBroadcast,
  creatorActive,
  onSettings,
  onLanguageChange,
  onLogout,
}: {
  open: boolean;
  initials: string;
  displayName: string;
  handle: string;
  zh: boolean;
  onToggle: () => void;
  onClose: () => void;
  onFollowing: () => void;
  onAccount: () => void;
  onWallet: () => void;
  onBroadcast: () => void;
  creatorActive: boolean;
  onSettings: () => void;
  onLanguageChange: () => void;
  onLogout: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open, onClose]);
  const choose = (action: () => void) => () => { onClose(); action(); };
  return (
    <div className="audience-account-menu" ref={rootRef}>
      <button type="button" className="audience-avatar-button" aria-haspopup="menu" aria-expanded={open} aria-label={zh ? "打开账户菜单" : "Open account menu"} onClick={onToggle}>
        <span aria-hidden="true">{initials}</span>
      </button>
      {open ? <div className="audience-account-popover" role="menu" aria-label={zh ? "账户选项" : "Account options"}>
        <header><strong>{displayName}</strong><small>@{handle}</small></header>
        <button type="button" role="menuitem" onClick={choose(onAccount)}>{zh ? "查看个人资料" : "View profile"}</button>
        <button type="button" role="menuitem" onClick={choose(onFollowing)}>{zh ? "关注" : "Following"}</button>
        <button type="button" role="menuitem" onClick={choose(onWallet)}>{zh ? "钱包" : "Wallet"}</button>
        <hr />
        <button type="button" role="menuitem" className="menu-creator-action" onClick={choose(onBroadcast)}>{creatorActive ? (zh ? "主播工作室" : "Streamer Studio") : (zh ? "成为主播" : "Become a creator")}</button>
        <button type="button" role="menuitem" onClick={choose(onSettings)}>{zh ? "设置" : "Settings"}</button>
        <button type="button" role="menuitem" onClick={choose(onLanguageChange)}>{zh ? "Language · 中文" : "Language · English"}</button>
        <hr />
        <button type="button" role="menuitem" className="menu-signout" onClick={choose(onLogout)}>{zh ? "退出登录" : "Sign out"}</button>
      </div> : null}
    </div>
  );
}

export function MobileHeaderActions({
  searchOpen,
  searchLabel,
  onSearch,
}: {
  searchOpen: boolean;
  searchLabel: string;
  onSearch: () => void;
}) {
  return (
    <div className="mobile-header-actions">
      <button type="button" aria-label={searchLabel} aria-expanded={searchOpen} onClick={onSearch}>
        <span aria-hidden="true">⌕</span>
      </button>
    </div>
  );
}

export function MobileBottomNav({
  active,
  zh,
  hidden,
  showCreatorEntry,
  onNavigate,
}: {
  active: MobileTab;
  zh: boolean;
  hidden?: boolean;
  showCreatorEntry: boolean;
  onNavigate: (tab: MobileTab) => void;
}) {
  const items: { id: MobileTab; icon: string; en: string; zh: string }[] = [
    { id: "home", icon: "⌂", en: "Home", zh: "首页" },
    { id: "discover", icon: "◉", en: "Discover", zh: "发现" },
    { id: "go-live", icon: "+", en: "Create", zh: "创作" },
    { id: "inbox", icon: "✉", en: "Inbox", zh: "消息" },
    { id: "me", icon: "○", en: "Me", zh: "我的" },
  ];
  return (
    <nav
      className={`mobile-bottom-nav ${hidden ? "is-hidden" : ""}`}
      style={{ gridTemplateColumns: `repeat(${showCreatorEntry ? 5 : 4}, minmax(0, 1fr))` }}
      aria-label={zh ? "移动导航" : "Mobile navigation"}
    >
      {items.filter((item) => item.id !== "go-live" || showCreatorEntry).map((item) => (
        <button
          type="button"
          key={item.id}
          className={item.id === "go-live" ? "mobile-go-live" : ""}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span aria-hidden="true">{item.icon}</span>
          <small>{zh ? item.zh : item.en}</small>
        </button>
      ))}
    </nav>
  );
}
