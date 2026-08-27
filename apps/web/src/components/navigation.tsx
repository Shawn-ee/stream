export type MobileTab = "home" | "discover" | "go-live" | "inbox" | "me";

export function MobileHeaderActions({
  searchOpen,
  accountLabel,
  searchLabel,
  initials,
  onSearch,
  onAccount,
}: {
  searchOpen: boolean;
  accountLabel: string;
  searchLabel: string;
  initials: string;
  onSearch: () => void;
  onAccount: () => void;
}) {
  return (
    <div className="mobile-header-actions">
      <button type="button" aria-label={searchLabel} aria-expanded={searchOpen} onClick={onSearch}>
        <span aria-hidden="true">⌕</span>
      </button>
      <button type="button" className="mobile-account-button" aria-label={accountLabel} onClick={onAccount}>
        <span aria-hidden="true">{initials}</span>
      </button>
    </div>
  );
}

export function MobileBottomNav({
  active,
  zh,
  hidden,
  onNavigate,
}: {
  active: MobileTab;
  zh: boolean;
  hidden?: boolean;
  onNavigate: (tab: MobileTab) => void;
}) {
  const items: { id: MobileTab; icon: string; en: string; zh: string }[] = [
    { id: "home", icon: "⌂", en: "Home", zh: "首页" },
    { id: "discover", icon: "◉", en: "Discover", zh: "发现" },
    { id: "go-live", icon: "+", en: "Go Live", zh: "开播" },
    { id: "inbox", icon: "✉", en: "Inbox", zh: "消息" },
    { id: "me", icon: "○", en: "Me", zh: "我的" },
  ];
  return (
    <nav className={`mobile-bottom-nav ${hidden ? "is-hidden" : ""}`} aria-label={zh ? "移动导航" : "Mobile navigation"}>
      {items.map((item) => (
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
