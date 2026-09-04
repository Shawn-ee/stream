import {
  StrictMode,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  createWhepPlayer,
  createWhipPublisher,
  replacePublishedTrack,
  stopMediaStream,
  type WebRtcController,
} from "./webrtc";
import "./styles.css";
import "./design-system.css";
import "./discovery.css";
import "./room.css";
import "./mobile-shell.css";
import "./broadcast.css";
import "./profile.css";
import { BottomSheet, EmptyState, LiveStreamCardSkeleton, Modal } from "./components/ui";
import {
  LiveStreamCard,
  SimpleDiscovery,
  type DiscoveryRoom,
} from "./components/discovery";
import { LiveChatPanel, MobileRoomOverlay, RoomCreatorBar } from "./components/room";
import { AudienceProfileSurface, CreatorProfileSurface, type PublicUserProfile } from "./components/profile";
import { RoomClassificationFields, type LanguageOption, type TagOption } from "./components/room-classification";
import { CreatorAvatar } from "./components/avatar";
import { CreatorOnboarding } from "./components/creator-onboarding";
import { audienceRoutePath, parseAudienceRoute, type AudienceRoute } from "./audience-route";
import { shareAudienceTarget, syncAudienceMetadata, type AudienceShareTarget, type ShareKind, type ShareOutcome } from "./audience-share";
import {
  AudienceAccountMenu,
  MobileHeaderActions,
} from "./components/navigation";

type Role = "audience" | "streamer" | "admin";
type Language = "en" | "zh";
type SupportedLanguage={code:string;name_en:string;name_native:string};
type RoomLanguage={code:string;nameEn:string;nameNative:string;isPrimary:boolean};
type PublicTag={id:string;slug:string;displayName:string;type:"CONTENT"|"FORMAT"|"MOOD"};
type AccountSection="profile"|"security"|"sessions"|"preferences"|"wallet"|"following"|"activity"|"notifications";
type User = {
  id: string;
  handle: string;
  displayName: string;
  role: Role;
  locale: Language;
  ageAcknowledged: boolean;
  creatorStatus?: string;
};
type AuthIntentKind =
  | "account"
  | "following"
  | "wallet"
  | "broadcast"
  | "go-live"
  | "inbox"
  | "me"
  | "follow"
  | "chat"
  | "gift"
  | "action"
  | "private-access"
  | "report";
type AuthIntent = { id: number; kind: AuthIntentKind };
const authIntentPolicy: Record<AuthIntentKind, "navigate" | "execute" | "review"> = {
  account: "navigate",
  following: "navigate",
  wallet: "navigate",
  broadcast: "navigate",
  "go-live": "navigate",
  inbox: "navigate",
  me: "navigate",
  follow: "execute",
  chat: "review",
  gift: "review",
  action: "review",
  "private-access": "review",
  report: "review",
};
const publicGuest = (locale: Language): User => ({
  id: "public-guest",
  handle: "public-guest",
  displayName: locale === "zh" ? "访客" : "Guest",
  role: "audience",
  locale,
  ageAcknowledged: true,
});
type Room = {
  slug: string;
  publicRoomId?: string;
  title: string;
  status: string;
  streamer_id: string;
  streamer_name: string;
  avatar_url?: string | null;
  bio?: string;
  schedule_text?: string;
  next_stream_at?: string | null;
  schedule_timezone?: string;
  follower_count?: number;
  viewer_count?: number;
  is_following?: boolean;
  reminder_enabled?: boolean;
  goal_text?: string;
  broadcast_state?: "live" | "connecting" | "offline" | "unavailable";
  broadcast_checked_at?: string | null;
  broadcast_status_message?: string;
  broadcast_status_source?: "local" | "cloudflare";
  broadcast_transport?: "obs_hls" | "browser_webrtc";
  languages: RoomLanguage[];
  tags: PublicTag[];
  stream_thumbnail_url?: string | null;
  recommendation_reasons?: string[];
  personalization_applied?: boolean;
};
type DiscoveryPreferences = {
  preferred_languages: string[];
  preferred_tag_slugs: string[];
  prioritize_live: boolean;
  prioritize_following: boolean;
  personalization_enabled: boolean;
  updated_at?: string | null;
};
type StreamerProfile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string | null;
  bio: string;
  languages: RoomLanguage[];
  tags: PublicTag[];
  schedule_text: string;
  next_stream_at?: string | null;
  schedule_timezone?: string;
  follower_count: number;
  room_slug: string | null;
  room_status: string | null;
  broadcast_state?: "live" | "connecting" | "offline" | "unavailable";
  broadcast_status_source?: "local" | "cloudflare";
};
function audienceShareTarget(room: Room, kind: ShareKind): AudienceShareTarget {
  return {
    kind,
    slug: room.slug,
    creatorName: room.streamer_name,
    roomTitle: room.title,
  };
}
const audienceId = "10000000-0000-4000-8000-000000000001";
function shareOutcomeMessage(outcome: ShareOutcome, zh: boolean) {
  if (outcome === "copied") return zh ? "链接已复制。" : "Link copied.";
  if (outcome === "failed") return zh ? "请重试。" : "Try again.";
  return "";
}
const copy: Record<Language, Record<string, string>> = {
  en: {
    title: "Stream MVP",
    test: "LOCAL TEST MODE - synthetic accounts, no real payments or age verification",
    choose: "Choose a demo role",
    local: "LOCAL DEVELOPMENT",
    end: "Sign out",
    audience: "Audience",
    streamer: "Streamer",
    adminRole: "Administrator",
    demoSession: "Demo-only test session",
    ageTitle: "Test age acknowledgement",
    ageText: "This is not real age verification or a launch gate.",
    age: "I confirm for this local test",
    live: "Live now",
    search: "Search room ID, creator or tag",
    followers: "followers",
    recent: "Recently visited",
    notifications: "Notifications",
    noHistory: "No rooms visited in this test session yet.",
    noNotes: "No test notifications yet.",
    back: "Back to rooms",
    privateLocked: "Private show: purchase test access to watch.",
    privateAccessActive: "Private access active",
    privateAccessLocked: "Private access locked",
    accessEnds: "Test access ends in",
    offline: "The stream is offline or not broadcasting.",
    preparing: "Preparing secure playback...",
    inRoom: "in room",
    follow: "Follow",
    following: "Following",
    report: "Report",
    buyAccess: "Buy private access",
    coins: "R",
    send: "Send",
    liveChat: "Live chat",
    connecting: "Connecting chat...",
    joining: "Joining chat...",
    connected: "Chat connected",
    unavailable: "Chat connection unavailable",
    message: "Test message",
    studio: "Creator studio",
    studioText:
      "Local test controls only. Use OBS and your Cloudflare Live Input for broadcasting.",
    room: "Room",
    noRoom: "No room",
    earnings: "Test earnings",
    roomTitle: "Room title",
    goal: "Test goal / notice",
    saveRoom: "Save room details",
    privateShow: "Private show",
    active: "Active",
    inactive: "Inactive",
    ticket: "Ticket access",
    perMinute: "Per-minute access",
    ticketCost: "Ticket coin cost",
    minuteCost: "Per-minute coin cost",
    startPrivate: "Start private show",
    endPrivate: "End private show",
    admin: "Admin dashboard",
    reports: "Open reports",
    noReports: "No reports.",
    review: "Review",
    dismiss: "Dismiss",
    audit: "Audit events",
    transactions: "Test transactions",
    noTransactions: "No gift or private-show test transactions yet.",
    reportSent: "Test report sent to the admin queue.",
    metadataSaved: "Test room metadata saved.",
    privateOn: "Private-show test mode is active.",
    privateOff: "Private-show test mode ended.",
    broadcast: "Broadcast status",
    refreshBroadcast: "Refresh Cloudflare status",
    localBroadcast: "Local test broadcast state",
    broadcastGuidance:
      "Use OBS with the existing Cloudflare Live Input. This screen never displays stream credentials.",
    connectingBroadcast:
      "The creator is starting the broadcast. Playback will appear when it is ready.",
    unavailableBroadcast:
      "Broadcast status is temporarily unavailable. Please try again later.",
    lastChecked: "Last checked",
    stateLive: "Live",
    stateConnecting: "Connecting",
    stateOffline: "Offline",
    stateUnavailable: "Status unavailable",
  },
  zh: {
    title: "直播平台 MVP",
    test: "本地测试模式：使用合成账户，无真实支付或年龄验证",
    choose: "选择测试角色",
    local: "本地开发",
    end: "退出登录",
    audience: "观众",
    streamer: "主播",
    adminRole: "管理员",
    demoSession: "仅限演示的测试会话",
    ageTitle: "测试年龄确认",
    ageText: "这不是真实年龄验证，也不是上线门槛。",
    age: "我确认用于本地测试",
    live: "正在直播",
    search: "搜索房间号、主播或标签",
    followers: "位关注者",
    recent: "最近访问",
    notifications: "通知",
    noHistory: "本次测试尚未访问直播间。",
    noNotes: "暂无测试通知。",
    back: "返回直播间列表",
    privateLocked: "私密直播：请购买测试访问权限后观看。",
    privateAccessActive: "私密访问已开启",
    privateAccessLocked: "私密访问已锁定",
    accessEnds: "测试访问剩余",
    offline: "直播未开始或已离线。",
    preparing: "正在准备安全播放...",
    inRoom: "人在房间",
    follow: "关注",
    following: "已关注",
    report: "举报",
    buyAccess: "购买私密访问",
    coins: "R",
    send: "发送",
    liveChat: "实时聊天",
    connecting: "正在连接聊天...",
    joining: "正在加入聊天...",
    connected: "聊天已连接",
    unavailable: "聊天连接不可用",
    message: "测试消息",
    studio: "主播工作室",
    studioText: "仅限本地测试。请使用 OBS 和 Cloudflare Live Input 推流。",
    room: "直播间",
    noRoom: "暂无直播间",
    earnings: "测试收益",
    roomTitle: "直播间标题",
    goal: "测试目标 / 公告",
    saveRoom: "保存直播间信息",
    privateShow: "私密直播",
    active: "已开启",
    inactive: "未开启",
    ticket: "门票访问",
    perMinute: "按分钟访问",
    ticketCost: "门票金币价格",
    minuteCost: "每分钟金币价格",
    startPrivate: "开启私密直播",
    endPrivate: "结束私密直播",
    admin: "管理后台",
    reports: "待处理举报",
    noReports: "暂无举报。",
    review: "审核",
    dismiss: "驳回",
    audit: "审计记录",
    transactions: "测试交易记录",
    noTransactions: "暂时没有礼物或私密直播测试交易。",
    reportSent: "测试举报已发送至管理队列。",
    metadataSaved: "测试直播间信息已保存。",
    privateOn: "私密直播测试模式已开启。",
    privateOff: "私密直播测试模式已结束。",
    broadcast: "\u63a8\u6d41\u72b6\u6001",
    refreshBroadcast: "\u5237\u65b0 Cloudflare \u72b6\u6001",
    localBroadcast: "\u672c\u5730\u6d4b\u8bd5\u63a8\u6d41\u72b6\u6001",
    broadcastGuidance:
      "\u8bf7\u4f7f\u7528 OBS \u548c\u73b0\u6709 Cloudflare Live Input\u3002\u6b64\u5904\u4e0d\u4f1a\u663e\u793a\u63a8\u6d41\u51ed\u8bc1\u3002",
    connectingBroadcast:
      "\u4e3b\u64ad\u6b63\u5728\u542f\u52a8\u63a8\u6d41\u3002\u51c6\u5907\u5b8c\u6210\u540e\u5c06\u663e\u793a\u64ad\u653e\u3002",
    unavailableBroadcast:
      "\u63a8\u6d41\u72b6\u6001\u6682\u65f6\u4e0d\u53ef\u7528\u3002\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
    lastChecked: "\u4e0a\u6b21\u68c0\u67e5",
    stateLive: "\u6b63\u5728\u76f4\u64ad",
    stateConnecting: "\u6b63\u5728\u8fde\u63a5",
    stateOffline: "\u5df2\u79bb\u7ebf",
    stateUnavailable: "\u72b6\u6001\u6682\u65f6\u4e0d\u53ef\u7528",
  },
};
function csrfToken() {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("stream_csrf="))
    ?.slice("stream_csrf=".length);
}
async function request(path: string, options?: RequestInit) {
  const csrf = csrfToken();
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...(options?.body && !isFormData ? { "content-type": "application/json" } : {}),
      ...(csrf && options?.method && options.method !== "GET"
        ? { "x-csrf-token": csrf }
        : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!response.ok && response.status !== 204)
    throw new Error(`${response.status}`);
  return response.status === 204 ? null : response.json();
}
function roleLabel(t: Record<string, string>, role: Role) {
  return role === "admin" ? t.adminRole : t[role];
}
function broadcastLabel(
  t: Record<string, string>,
  state: string | null | undefined,
) {
  return state === "live"
    ? t.stateLive
    : state === "connecting"
      ? t.stateConnecting
      : state === "unavailable"
        ? t.stateUnavailable
        : t.stateOffline;
}
function creatorBroadcastMessage(
  t: Record<string, string>,
  state: string | null | undefined,
) {
  const zh = t.title !== "Stream MVP";
  return state === "live"
    ? zh
      ? "直播已连接，观众现在可以观看。"
      : "Your broadcast is connected and available to viewers."
    : state === "connecting"
      ? zh
        ? "正在准备安全播放，请稍候。"
        : "Secure playback is being prepared."
      : state === "unavailable"
        ? zh
          ? "暂时无法确认直播状态，请稍后重试。"
          : "Broadcast status cannot be confirmed right now."
        : zh
          ? "尚未开始推流，直播间目前离线。"
          : "No broadcast is active and your room is offline.";
}

function playGiftTone(tier: string | undefined) {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const premium = tier === "premium" || tier === "celebration";
  oscillator.type = premium ? "sine" : "triangle";
  oscillator.frequency.setValueAtTime(premium ? 523.25 : 392, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    premium ? 783.99 : 523.25,
    context.currentTime + 0.22,
  );
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.34);
  oscillator.addEventListener("ended", () => void context.close());
}
function LanguagePicker({
  language,
  onChange,
}: {
  language: Language;
  onChange: (v: Language) => void;
}) {
  return (
    <div className="locale">
      <button
        onClick={() => onChange("en")}
        className={language === "en" ? "active" : ""}
      >
        EN
      </button>
      <button
        onClick={() => onChange("zh")}
        className={language === "zh" ? "active" : ""}
      >
        {"中文"}
      </button>
    </div>
  );
}
function DiscoveryPreferencePanel({
  preferences,
  languages,
  tags,
  zh,
  saving,
  message,
  onChange,
  onSave,
  onReset,
}: {
  preferences: DiscoveryPreferences;
  languages: SupportedLanguage[];
  tags: PublicTag[];
  zh: boolean;
  saving: boolean;
  message: "" | "saved" | "reset" | "error";
  onChange: (preferences: DiscoveryPreferences) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const toggleLanguage = (item: string) => onChange({
    ...preferences,
    preferred_languages: preferences.preferred_languages.includes(item)
      ? preferences.preferred_languages.filter((language) => language !== item)
      : [...preferences.preferred_languages, item],
  });
  const toggleTag = (item: string) => onChange({
    ...preferences,
    preferred_tag_slugs: preferences.preferred_tag_slugs.includes(item)
      ? preferences.preferred_tag_slugs.filter((tag) => tag !== item)
      : [...preferences.preferred_tag_slugs, item],
  });
  return (
    <section className="discovery-preferences">
      <h3>{zh ? "发现偏好" : "Discovery preferences"}</h3>
      <div className="discovery-preference-body account-form">
        <p>{zh ? "此处保存的偏好会影响不同会话中的推荐排序。发现页上的临时筛选只影响当前 URL 和浏览。" : "Saved preferences influence recommendation ordering across sessions. Temporary Discover filters affect only the current URL and browsing session."}</p>
        <fieldset className="account-shortcuts">
          <legend>{zh ? "偏好语言" : "Preferred languages"}</legend>
          {languages.map(item=><label key={item.code}><input type="checkbox" checked={preferences.preferred_languages.includes(item.code as Language)} onChange={() => toggleLanguage(item.code)} /> {zh?item.name_native:item.name_en}</label>)}
        </fieldset>
        <fieldset className="account-shortcuts">
          <legend>{zh ? "偏好标签" : "Preferred tags"}</legend>
          <div className="preference-tag-list account-shortcuts">
            {tags.map((item) => <label key={item.id}><input type="checkbox" checked={preferences.preferred_tag_slugs.includes(item.slug)} onChange={() => toggleTag(item.slug)} /> {item.displayName}</label>)}
          </div>
        </fieldset>
        <label><input type="checkbox" checked={preferences.prioritize_live} onChange={(event) => onChange({ ...preferences, prioritize_live: event.target.checked })} /> {zh ? "优先直播中的房间" : "Prioritize live rooms"}</label>
        <label><input type="checkbox" checked={preferences.prioritize_following} onChange={(event) => onChange({ ...preferences, prioritize_following: event.target.checked })} /> {zh ? "优先已关注主播" : "Prioritize followed creators"}</label>
        <label><input type="checkbox" checked={preferences.personalization_enabled} onChange={(event) => onChange({ ...preferences, personalization_enabled: event.target.checked })} /> {zh ? "启用个性化排序" : "Use personalized ordering"}</label>
        <div className="preference-actions account-shortcuts">
          <button type="button" disabled={saving} onClick={onSave}>{saving ? (zh ? "保存中…" : "Saving…") : (zh ? "保存偏好" : "Save preferences")}</button>
          <button type="button" className="secondary" disabled={saving} onClick={onReset}>{zh ? "恢复默认" : "Reset"}</button>
          {message ? <small role="status">{
            message === "saved" ? (zh ? "推荐偏好已保存。" : "Discovery preferences saved.")
              : message === "reset" ? (zh ? "已恢复默认推荐。" : "Default recommendations restored.")
                : (zh ? "暂时无法保存，请重试。" : "Could not update preferences. Try again.")
          }</small> : null}
        </div>
      </div>
    </section>
  );
}
function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(false);
  const [followingRooms, setFollowingRooms] = useState<Room[]>([]);
  const [followingLoading, setFollowingLoading] = useState(true);
  const [followingError, setFollowingError] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [profileRoom, setProfileRoom] = useState<Room | null>(null);
  const [publicUserProfile, setPublicUserProfile] = useState<PublicUserProfile | null>(null);
  const initialFilters=new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(()=>initialFilters.get("q")??"");
  const [settledQuery, setSettledQuery] = useState(()=>initialFilters.get("q")??"");
  const [selectedLanguages,setSelectedLanguages]=useState<string[]>(()=>initialFilters.get("languages")?.split(",").filter(Boolean)??[]);
  const [selectedTags,setSelectedTags]=useState<string[]>(()=>((initialFilters.get("tags")??initialFilters.get("tag")??"").split(",").filter(Boolean)));
  const [followingOnly,setFollowingOnly]=useState(()=>initialFilters.get("following")==="true");
  const [supportedLanguages,setSupportedLanguages]=useState<SupportedLanguage[]>([]);
  const [publicTags,setPublicTags]=useState<PublicTag[]>([]);
  const [discoveryPreferences, setDiscoveryPreferences] = useState<DiscoveryPreferences | null>(null);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState<"" | "saved" | "reset" | "error">("");
  const [handle, setHandle] = useState("demo-audience");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authGate, setAuthGate] = useState<AuthIntent | null>(null);
  const [resumeIntent, setResumeIntent] = useState<AuthIntent | null>(null);
  const [resumeNotice, setResumeNotice] = useState("");
  const [routeLoading, setRouteLoading] = useState(() => parseAudienceRoute(window.location.pathname).view !== "discovery");
  const [routeError, setRouteError] = useState<"not-found" | "unavailable" | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountSection, setAccountSection] = useState<AccountSection>("profile");
  const [creatorPortalStep, setCreatorPortalStep] = useState<"intro" | "profile" | "identity" | "agreement" | "review" | "status" | null>(() => {
    const initial = parseAudienceRoute(window.location.pathname);
    return initial.view === "creator-onboarding" ? initial.step : initial.view === "creator-status" ? "status" : null;
  });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(() => window.location.pathname === "/studio" || window.location.pathname === "/broadcast");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const roomsRequestRef = useRef(0);
  const routeRequestRef = useRef(0);
  const filterHistoryReadyRef = useRef(false);
  const restoringFilterHistoryRef = useRef(false);
  const authIntentIdRef = useRef(0);
  const t = copy[language];
  const audienceCapable=user?.role==="audience"||user?.role==="streamer";
  const requireAuth = (kind: AuthIntentKind) => {
    setAuthMode("login");
    setLoginError("");
    setAuthGate({ id: ++authIntentIdRef.current, kind });
  };
  const writeAudienceHistory = (route: Exclude<AudienceRoute, { view: "invalid" }>, mode: "push" | "replace" = "push") => {
    const path = audienceRoutePath(route);
    if (mode === "push" && window.location.pathname === path) return;
    window.history[mode === "push" ? "pushState" : "replaceState"](
      {
        ...window.history.state,
        holiwynAudienceRoute: path,
        holiwynAudienceParent: mode === "push" ? window.location.pathname : null,
      },
      "",
      path,
    );
  };
  const showDiscovery = (mode: "push" | "replace" = "push") => {
    routeRequestRef.current += 1;
    setRouteLoading(false);
    setRouteError(null);
    setRoom(null);
    setProfileRoom(null);
    setPublicUserProfile(null);
    setAccountMenuOpen(false);
    setAccountOpen(false);
    setCreatorPortalStep(null);
    writeAudienceHistory({ view: "discovery" }, mode);
    window.scrollTo({ top: 0 });
  };
  const showHome = () => {
    setQuery("");
    setSettledQuery("");
    setSelectedLanguages([]);
    setSelectedTags([]);
    setFollowingOnly(false);
    window.history.pushState({ ...window.history.state, holiwynAudienceRoute: "/" }, "", "/");
    showDiscovery("replace");
  };
  const openAccountSection = (section: AccountSection, mode: "push" | "replace" = "push") => {
    setRoom(null); setProfileRoom(null); setPublicUserProfile(null); setCreatorPortalStep(null); setStudioOpen(false);
    setAccountSection(section); setAccountOpen(true); setAccountMenuOpen(false);
    writeAudienceHistory({ view: "account", section }, mode);
    window.scrollTo({ top: 0 });
  };
  const submitGlobalSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    let value=query.trim();
    if(/^https?:\/\//i.test(value)){
      try{const parsed=new URL(value);if(![window.location.hostname,"holiwyn.online","www.holiwyn.online"].includes(parsed.hostname))throw new Error("external");const match=parsed.pathname.match(/^\/room\/([^/]+)\/?$/);if(!match)throw new Error("route");value=decodeURIComponent(match[1]);}catch{setRouteError("not-found");return;}
    }
    if(/^[1-9][0-9]{5}$/.test(value)){
      try{const data=await request(`/api/rooms/${value}`);routeRequestRef.current+=1;setRoom(data.room);setProfileRoom(null);setPublicUserProfile(null);setAccountOpen(false);setMobileSearchOpen(false);window.history.pushState({...window.history.state,holiwynAudienceRoute:`/room/${value}`} ,"",`/room/${value}`);setQuery("");window.scrollTo({top:0});return;}catch{setRouteError("not-found");return;}
    }
    setQuery(value); setSettledQuery(value); setAccountOpen(false); setRoom(null); setProfileRoom(null); setPublicUserProfile(null); setCreatorPortalStep(null);
    const params=new URLSearchParams();
    if(value)params.set("q",value);
    if(selectedLanguages.length)params.set("languages",selectedLanguages.join(","));
    if(selectedTags.length)params.set("tags",selectedTags.join(","));
    if(followingOnly)params.set("following","true");
    const path=`/${params.size?`?${params}`:""}`;
    window.history.pushState({...window.history.state,holiwynAudienceRoute:path},"",path);
    setMobileSearchOpen(false); setRouteLoading(false); setRouteError(null); window.scrollTo({top:0});
  };
  const returnFromAudienceDetail = () => {
    if (window.history.state?.holiwynAudienceParent) window.history.back();
    else showDiscovery("replace");
  };
  const showRoom = (item: Room, mode: "push" | "replace" = "push") => {
    routeRequestRef.current += 1;
    setRouteLoading(false);
    setRouteError(null);
    setProfileRoom(null);
    setPublicUserProfile(null);
    setRoom(item);
    setAccountOpen(false);
    setMobileSearchOpen(false);
    writeAudienceHistory({ view: "room", slug: item.slug }, mode);
    window.scrollTo({ top: 0 });
  };
  const showProfile = (item: Room, mode: "push" | "replace" = "push") => {
    routeRequestRef.current += 1;
    setRouteLoading(false);
    setRouteError(null);
    setRoom(null);
    setPublicUserProfile(null);
    setProfileRoom(item);
    setAccountOpen(false);
    setMobileSearchOpen(false);
    writeAudienceHistory({ view: "creator", slug: item.slug }, mode);
    window.scrollTo({ top: 0 });
  };
  const showPublicUserProfile = (profileHandle: string, mode: "push" | "replace" = "push") => {
    routeRequestRef.current += 1;setRoom(null);setProfileRoom(null);setPublicUserProfile(null);setAccountOpen(false);setMobileSearchOpen(false);setRouteError(null);
    writeAudienceHistory({view:"user",handle:profileHandle},mode);void hydrateAudienceRoute(`/@${encodeURIComponent(profileHandle)}`);window.scrollTo({top:0});
  };
  const hydrateAudienceRoute = useCallback(async (pathname: string) => {
    const requestId = ++routeRequestRef.current;
    const route = parseAudienceRoute(pathname);
    setAccountOpen(false);
    setMobileSearchOpen(false);
    setRouteError(null);
    if (route.view === "account") {
      setRoom(null); setProfileRoom(null); setPublicUserProfile(null); setCreatorPortalStep(null);
      setAccountSection(route.section); setAccountOpen(true); setRouteLoading(false); return;
    }
    if (route.view === "creator-onboarding") {
      setRoom(null); setProfileRoom(null); setPublicUserProfile(null); setAccountOpen(false);
      setCreatorPortalStep(route.step); setRouteLoading(false); return;
    }
    if (route.view === "creator-status" || route.view === "studio") {
      setRoom(null); setProfileRoom(null); setPublicUserProfile(null); setAccountOpen(false);
      setCreatorPortalStep("status"); setRouteLoading(false); return;
    }
    if (route.view === "legacy-discovery") {
      const legacyTag=window.location.pathname.match(/^\/tags\/([a-z0-9-]+)\/?$/)?.[1];
      const params=new URLSearchParams(window.location.search);if(legacyTag&&!params.has("tags")&&!params.has("tag"))params.set("tags",legacyTag);
      const target=`/${params.size?`?${params}`:""}`;
      window.history.replaceState({...window.history.state,holiwynAudienceRoute:target},"",target);
      setRoom(null); setProfileRoom(null); setPublicUserProfile(null); setAccountOpen(false); setCreatorPortalStep(null); setRouteLoading(false);
      return;
    }
    if (route.view === "discovery") {
      setRoom(null);
      setProfileRoom(null);
      setPublicUserProfile(null);
      setRouteLoading(false);
      return;
    }
    if (route.view === "invalid") {
      setRoom(null);
      setProfileRoom(null);
      setPublicUserProfile(null);
      setRouteError("not-found");
      setRouteLoading(false);
      return;
    }
    const canonicalPath = audienceRoutePath(route);
    if (window.location.pathname !== canonicalPath || !window.history.state?.holiwynAudienceRoute) {
      window.history.replaceState(
        {
          ...window.history.state,
          holiwynAudienceRoute: canonicalPath,
          holiwynAudienceParent: window.history.state?.holiwynAudienceParent ?? null,
        },
        "",
        canonicalPath,
      );
    }
    setRouteLoading(true);
    try {
      if(route.view==="user"){
        const data=await request(`/api/users/${encodeURIComponent(route.handle)}/public`);if(requestId!==routeRequestRef.current)return;setRoom(null);setProfileRoom(null);setPublicUserProfile(data.profile);return;
      }
      const data = await request(`/api/rooms/${encodeURIComponent(route.slug)}`);
      if (requestId !== routeRequestRef.current) return;
      if (route.view === "room") {
        setProfileRoom(null);
        setPublicUserProfile(null);
        setRoom(data.room);
      } else {
        setRoom(null);
        setPublicUserProfile(null);
        setProfileRoom(data.room);
      }
    } catch (error) {
      if (requestId !== routeRequestRef.current) return;
      setRoom(null);
      setProfileRoom(null);
      setPublicUserProfile(null);
      setRouteError(error instanceof Error && error.message === "404" ? "not-found" : "unavailable");
    } finally {
      if (requestId === routeRequestRef.current) {
        setRouteLoading(false);
        window.scrollTo({ top: 0 });
      }
    }
  }, []);
  const loadRooms = async () => {
    const requestId = ++roomsRequestRef.current;
    setRoomsLoading(true);
    setRoomsError(false);
    try {
      const data = await request(
        `/api/rooms?q=${encodeURIComponent(settledQuery)}&languages=${encodeURIComponent(selectedLanguages.join(","))}&tags=${encodeURIComponent(selectedTags.join(","))}${followingOnly?"&following=true":""}`,
      );
      if (requestId === roomsRequestRef.current) setRooms(data.rooms);
    } catch {
      if (requestId === roomsRequestRef.current) {
        setRooms([]);
        setRoomsError(true);
      }
    } finally {
      if (requestId === roomsRequestRef.current) setRoomsLoading(false);
    }
  };
  const loadFollowing = async () => {
    setFollowingLoading(true);
    setFollowingError(false);
    try {
      const data = await request("/api/me/following");
      setFollowingRooms(data.creators);
    } catch {
      setFollowingError(true);
    } finally {
      setFollowingLoading(false);
    }
  };
  const saveDiscoveryPreferences = async () => {
    if (!discoveryPreferences) return;
    setPreferencesSaving(true);
    setPreferencesMessage("");
    try {
      const data = await request("/api/me/discovery-preferences", {
        method: "PUT",
        body: JSON.stringify({
          preferredLanguages: discoveryPreferences.preferred_languages,
          preferredTags: discoveryPreferences.preferred_tag_slugs,
          prioritizeLive: discoveryPreferences.prioritize_live,
          prioritizeFollowing: discoveryPreferences.prioritize_following,
          personalizationEnabled: discoveryPreferences.personalization_enabled,
        }),
      });
      setDiscoveryPreferences(data.preferences);
      setPreferencesMessage("saved");
      await loadRooms();
    } catch {
      setPreferencesMessage("error");
    } finally {
      setPreferencesSaving(false);
    }
  };
  const resetDiscoveryPreferences = async () => {
    setPreferencesSaving(true);
    setPreferencesMessage("");
    try {
      const data = await request("/api/me/discovery-preferences", { method: "DELETE" });
      setDiscoveryPreferences(data.preferences);
      setPreferencesMessage("reset");
      await loadRooms();
    } catch {
      setPreferencesMessage("error");
    } finally {
      setPreferencesSaving(false);
    }
  };
  useEffect(() => {
    void request("/api/auth/session")
      .then((d) => {
        setUser(d.user ?? publicGuest(language));
        if (d.user?.locale) setLanguage(d.user.locale);
        const initialRoute = parseAudienceRoute(window.location.pathname);
        if (["creator-onboarding", "creator-status", "studio"].includes(initialRoute.view)) {
          const intent = { id: ++authIntentIdRef.current, kind: "go-live" as const };
          if (d.user) setResumeIntent(intent);
          else {
            setAuthMode("login");
            setAuthGate(intent);
          }
        }
      })
      .catch(() => setUser(publicGuest(language)))
      .finally(() => setSessionLoading(false));
    void request("/api/discovery/languages").then((d)=>setSupportedLanguages(d.languages)).catch(()=>setSupportedLanguages([]));
    void request("/api/discovery/tags").then((d)=>setPublicTags(d.tags)).catch(()=>setPublicTags([]));
  }, []);
  useEffect(() => {
    if (sessionLoading || !audienceCapable || !user?.ageAcknowledged) return;
    void hydrateAudienceRoute(window.location.pathname);
  }, [sessionLoading, user?.id, user?.role, user?.ageAcknowledged, hydrateAudienceRoute]);
  useEffect(() => {
    if (!audienceCapable || !user?.ageAcknowledged) return;
    const restoreAudienceRoute = () => {
      const params = new URLSearchParams(window.location.search);
      restoringFilterHistoryRef.current = true;
      setQuery(params.get("q") ?? "");
      setSettledQuery(params.get("q") ?? "");
      setSelectedLanguages((params.get("languages") ?? "").split(",").filter(Boolean).slice(0, 20));
      setSelectedTags((params.get("tags") ?? params.get("tag") ?? "").split(",").filter(Boolean).slice(0,20));
      setFollowingOnly(params.get("following")==="true");
      void hydrateAudienceRoute(window.location.pathname);
    };
    window.addEventListener("popstate", restoreAudienceRoute);
    return () => window.removeEventListener("popstate", restoreAudienceRoute);
  }, [user?.role, user?.ageAcknowledged, hydrateAudienceRoute]);
  useEffect(() => {
    if (!audienceCapable) return;
    const item = room ?? profileRoom;
    syncAudienceMetadata(item ? audienceShareTarget(item, room ? "room" : "creator") : null);
  }, [user?.role, room, profileRoom]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (audienceCapable && user?.ageAcknowledged) loadRooms();
  }, [user, settledQuery, selectedLanguages.join(","), selectedTags.join(","), followingOnly]);
  useEffect(()=>{
    if (!filterHistoryReadyRef.current) {
      filterHistoryReadyRef.current = true;
      return;
    }
    if (restoringFilterHistoryRef.current) {
      restoringFilterHistoryRef.current = false;
      return;
    }
    const params=new URLSearchParams(window.location.search);
    if(settledQuery)params.set("q",settledQuery);else params.delete("q");
    if(selectedLanguages.length)params.set("languages",selectedLanguages.join(","));else params.delete("languages");
    params.delete("tag");
    if(selectedTags.length)params.set("tags",selectedTags.join(","));else params.delete("tags");
    if(followingOnly)params.set("following","true");else params.delete("following");
    if(window.location.pathname!=="/")return;
    const next=`/${params.size?`?${params}`:""}`;
    window.history.pushState({...window.history.state,holiwynAudienceRoute:next},"",next);
  },[settledQuery,selectedLanguages.join(","),selectedTags.join(","),followingOnly]);
  useEffect(() => {
    if (audienceCapable && user?.ageAcknowledged && user.id !== "public-guest") void loadFollowing();
    else if (user?.id === "public-guest") {
      setFollowingRooms([]);
      setFollowingLoading(false);
      setFollowingError(false);
    }
  }, [user?.id, user?.role, user?.ageAcknowledged]);
  useEffect(() => {
    if (!audienceCapable || !user?.ageAcknowledged || user.id === "public-guest") {
      setDiscoveryPreferences(null);
      return;
    }
    void request("/api/me/discovery-preferences")
      .then((data) => setDiscoveryPreferences(data.preferences))
      .catch(() => setDiscoveryPreferences(null));
  }, [user?.id, user?.role, user?.ageAcknowledged]);
  useEffect(() => {
    if (!audienceCapable || !user?.ageAcknowledged) return;
    const socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket.emit("discovery:join"));
    socket.on(
      "discovery:broadcast",
      (event: {
        slug: string;
        state: "live" | "connecting" | "offline" | "unavailable";
        message: string;
        checkedAt: string;
        source?: "local" | "cloudflare";
        transport?: "obs_hls" | "browser_webrtc";
      }) => {
        setRooms((current) =>
          current.map((item) =>
            item.slug === event.slug
              ? {
                  ...item,
                  status: event.state === "live" ? "live" : "offline",
                  broadcast_state: event.state,
                  broadcast_status_message: event.message,
                  broadcast_status_source: event.source,
                  broadcast_checked_at: event.checkedAt,
                }
              : item,
          ),
        );
        setFollowingRooms((current) =>
          current.map((item) =>
            item.slug === event.slug
              ? {
                  ...item,
                  status: event.state === "live" ? "live" : "offline",
                  broadcast_state: event.state,
                  broadcast_status_message: event.message,
                  broadcast_status_source: event.source,
                  broadcast_checked_at: event.checkedAt,
                }
              : item,
          ),
        );
        void loadRooms();
      },
    );
    socket.on(
      "follow:changed",
      (event: { streamerId: string; slug: string; followerCount: number }) => {
        const updateCount = (item: Room) =>
          item.streamer_id === event.streamerId || item.slug === event.slug
            ? { ...item, follower_count: event.followerCount }
            : item;
        setRooms((current) => current.map(updateCount));
        setFollowingRooms((current) => current.map(updateCount));
      },
    );
    socket.on(
      "follow:state",
      (event: { streamerId: string; following: boolean; followerCount: number }) => {
        if (event.streamerId) {
          void loadFollowing();
          void loadRooms();
        }
      },
    );
    socket.on(
      "schedule:changed",
      (event: { streamerId: string; slug: string; nextStreamAt: string | null; scheduleTimezone: string }) => {
        const updateSchedule = (item: Room) =>
          item.streamer_id === event.streamerId || item.slug === event.slug
            ? { ...item, next_stream_at: event.nextStreamAt, schedule_timezone: event.scheduleTimezone }
            : item;
        setRooms((current) => current.map(updateSchedule));
        setFollowingRooms((current) => current.map(updateSchedule));
      },
    );
    socket.on(
      "reminder:preference",
      (event: { streamerId: string; enabled: boolean }) =>
        setFollowingRooms((current) => current.map((item) =>
          item.streamer_id === event.streamerId ? { ...item, reminder_enabled: event.enabled } : item,
        )),
    );
    return () => {
      socket.disconnect();
    };
  }, [user?.role, user?.ageAcknowledged, settledQuery, selectedLanguages, selectedTags, followingOnly]);
  async function login(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const result = await request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ handle, password }),
          });
      setUser(result.user);
      setResumeIntent(["audience","streamer"].includes(result.user.role) ? authGate : null);
      setAuthGate(null);
      setPassword("");
    } catch {
      setLoginError(
        language === "en"
          ? "Invalid local account credentials."
          : "\u672c\u5730\u8d26\u6237\u51ed\u636e\u65e0\u6548\u3002",
      );
    }
  }
  async function register(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const result = await request("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
              handle,
              displayName,
              password,
              locale: language,
            }),
          });
      setUser(result.user);
      setResumeIntent(["audience","streamer"].includes(result.user.role) ? authGate : null);
      setAuthGate(null);
      setPassword("");
      setDisplayName("");
    } catch (error) {
      const status = error instanceof Error ? error.message : "";
      setLoginError(
        language === "en"
          ? status === "409"
            ? "That account handle is already in use."
            : "Could not create the account. Use 3–30 lowercase letters, numbers, or underscores and a 12+ character password with uppercase, lowercase, and a number."
          : status === "409"
            ? "该账户名已被使用。"
            : "无法创建账户。账户名请使用 3–30 个小写字母、数字或下划线；密码至少 12 位并包含大小写字母和数字。",
      );
    }
  }
  async function acknowledge() {
    setUser(
      (
        await request("/api/demo/age-acknowledgement", {
          method: "POST",
          body: "{}",
        })
      ).user,
    );
  }
  async function logout() {
    await request("/api/auth/session", { method: "DELETE" });
    setAuthGate(null);
    setResumeIntent(null);
    setResumeNotice("");
    setHandle("");
    setDisplayName("");
    setPassword("");
    setLoginError("");
    setUser(publicGuest(language));
    setAccountOpen(false);
    setMobileSearchOpen(false);
  }
  async function openBroadcastDashboard() {
    if (user?.id === "public-guest") {
      requireAuth("go-live");
      return;
    }
    setResumeNotice("");
    try {
      const result = await request("/api/broadcast/access");
      setAccountOpen(false);
      setAccountMenuOpen(false);
      if (result.allowed) {
        window.history.pushState({ ...window.history.state, holiwynCreatorRoute: "/studio" }, "", "/studio");
        setCreatorPortalStep(null);
        setStudioOpen(true);
        return;
      }
      const step = result.status === "AUDIENCE" ? "intro" : result.status === "ONBOARDING_IDENTITY" ? "identity" : result.status === "ONBOARDING_AGREEMENT" ? "agreement" : result.status === "READY_FOR_REVIEW" ? "review" : ["PENDING_REVIEW","REJECTED","SUSPENDED"].includes(result.status) ? "status" : "profile";
      setCreatorPortalStep(step);
      const path = step === "status" ? "/creator/status" : step === "intro" ? "/creator/onboarding" : `/creator/onboarding/${step}`;
      window.history.pushState({ ...window.history.state, holiwynCreatorRoute: path }, "", path);
    } catch (error) {
      setResumeNotice(
        error instanceof Error && error.message === "403"
          ? language === "en" ? "Creator access is not available for this account." : "此账户暂时无法使用主播功能。"
          : language === "en" ? "Creator onboarding is temporarily unavailable." : "主播入驻暂时不可用。",
      );
    }
  }
  useEffect(() => {
    if (!resumeIntent || !user || user.id === "public-guest") return;
    if (!["audience","streamer"].includes(user.role)) {
      setResumeIntent(null);
      return;
    }
    if (["follow", "chat", "gift", "action", "private-access", "report"].includes(resumeIntent.kind)) return;
    if (resumeIntent.kind === "following") {
      openAccountSection("following");
    } else if (resumeIntent.kind === "wallet") {
      openAccountSection("wallet");
    } else if (["broadcast", "go-live"].includes(resumeIntent.kind)) {
      void openBroadcastDashboard();
    } else if (resumeIntent.kind === "inbox") {
      openAccountSection("notifications");
    } else {
      openAccountSection("profile");
    }
    setResumeNotice(language === "en" ? "Signed in — your requested destination is ready." : "登录成功——已返回您请求的位置。");
    setResumeIntent(null);
  }, [resumeIntent, user?.id, user?.role, user?.ageAcknowledged, language]);
  useEffect(() => {
    if (!resumeNotice) return;
    const timer = window.setTimeout(() => setResumeNotice(""), 4_000);
    return () => window.clearTimeout(timer);
  }, [resumeNotice]);
  if (sessionLoading)
    return (
      <main className="app-loading" aria-busy="true">
        <span className="product-mark" aria-hidden="true">H</span>
        <h1>HOLIWYN</h1>
        <p>{language === "en" ? "Preparing your streaming experience…" : "正在准备直播体验…"}</p>
        <span className="app-loading-bar" aria-hidden="true" />
      </main>
    );
  if (!user) return null;
  const isGuest = user.id === "public-guest";
  const audienceExperience = (user.role === "audience" || user.role === "streamer") && !studioOpen;
  const audienceInitials = user.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <main className={`app role-${user.role}${room ? " room-open" : profileRoom || publicUserProfile ? " profile-open" : ""}`}>
      <header className={`product-header ${audienceExperience && user.ageAcknowledged ? "audience-product-header" : ""}`}>
        <button type="button" className="product-identity logo-home" aria-label={language==="zh"?"返回首页":"Holiwyn home"} onClick={showHome}>
          <span className="product-mark" aria-hidden="true">
            H
          </span>
          <div>
          <p className="eyebrow">{language === "en" ? "PRIVATE STAGING · Creator preview environment" : "私有预发布环境 · 主播预览环境"}</p>
          <h1>HOLIWYN</h1>
          <p>
            {user.displayName} · {roleLabel(t, user.role)}
          </p>
          </div>
        </button>
        {audienceExperience && user.ageAcknowledged && (
          <MobileHeaderActions
            searchOpen={mobileSearchOpen}
            searchLabel={language === "en" ? "Search creators" : "搜索主播"}
            onSearch={() => setMobileSearchOpen((current) => !current)}
          />
        )}
        {audienceExperience && user.ageAcknowledged && (
          <div className={`audience-header-center ${mobileSearchOpen ? "mobile-search-open" : ""}`}>
            <form className="audience-global-search" role="search" onSubmit={submitGlobalSearch}>
              <span className="sr-only">{t.search}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
              <button type="submit" aria-label={language === "en" ? "Search" : "搜索"}>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        )}
        <div className="product-account">
          {audienceExperience && user.ageAcknowledged ? <>
            {isGuest ? <button className="header-login" onClick={() => requireAuth("account")}>{language === "en" ? "Log in" : "登录"}</button> : <>
              <AudienceAccountMenu
              open={accountMenuOpen}
              initials={audienceInitials}
              displayName={user.displayName}
              handle={user.handle}
              zh={language === "zh"}
              onToggle={() => setAccountMenuOpen((current) => !current)}
              onClose={() => setAccountMenuOpen(false)}
              onFollowing={() => openAccountSection("following")}
              onActivity={() => openAccountSection("activity")}
              onNotifications={() => openAccountSection("notifications")}
              onWallet={() => openAccountSection("wallet")}
              onBroadcast={() => void openBroadcastDashboard()}
              creatorActive={user.creatorStatus === "ACTIVE" || user.role === "streamer"}
              onSettings={() => openAccountSection("profile")}
              onLogout={() => void logout()}
            /></>}
          </> : <><LanguagePicker language={language} onChange={setLanguage} /><button className="secondary" onClick={() => void logout()}>{t.end}</button></>}
        </div>
      </header>
       {!isGuest && creatorPortalStep ? (
         <CreatorOnboarding
           language={language}
           step={creatorPortalStep === "status" ? "review" : creatorPortalStep}
           api={request}
           onNavigate={(next) => {
             setCreatorPortalStep(next);
             const path = next === "status" ? "/creator/status" : next === "intro" ? "/creator/onboarding" : `/creator/onboarding/${next}`;
             window.history.pushState({}, "", path);
             window.scrollTo({ top: 0 });
           }}
           onActivated={(activated) => {
             setUser(activated);
             setCreatorPortalStep(null);
             setStudioOpen(true);
             window.history.replaceState({}, "", "/studio");
           }}
           onBack={() => showDiscovery()}
         />
       ) : !isGuest && accountOpen ? (
         <AccountCenter
          user={user}
          language={language}
          onUpdated={(updated) => {
            setUser(updated);
            setLanguage(updated.locale);
          }}
          onBack={() => showDiscovery()}
          onLogout={() => void logout()}
          onViewPublicProfile={()=>showPublicUserProfile(user.handle)}
          section={accountSection}
          onSectionChange={(section) => openAccountSection(section)}
          preferences={discoveryPreferences}
          languages={supportedLanguages}
          tags={publicTags}
          preferencesSaving={preferencesSaving}
          preferencesMessage={preferencesMessage}
          onPreferencesChange={(preferences) => { setDiscoveryPreferences(preferences); setPreferencesMessage(""); }}
          onPreferencesSave={() => void saveDiscoveryPreferences()}
          onPreferencesReset={() => void resetDiscoveryPreferences()}
          following={followingRooms}
          followingLoading={followingLoading}
          followingError={followingError}
          onFollowingRetry={() => void loadFollowing()}
          onOpenFollowing={(item) => showRoom(item)}
          onReminderChange={async (streamerId, enabled) => { await request(`/api/streamers/${streamerId}/reminder`, {method:"PATCH",body:JSON.stringify({enabled})}); await loadFollowing(); }}
          onUnfollow={async (item) => { await request(`/api/streamers/${item.streamer_id}/follow`, {method:"DELETE"}); await loadFollowing(); await loadRooms(); }}
          onOpenHistory={(slug) => void request(`/api/rooms/${encodeURIComponent(slug)}`).then((data) => showRoom(data.room))}
        />
      ) : !isGuest && !user.ageAcknowledged ? (
        <section className="age-gate">
          <h2>{t.ageTitle}</h2>
          <p>{t.ageText}</p>
          <button onClick={() => void acknowledge()}>{t.age}</button>
        </section>
      ) : audienceExperience ? (
        routeLoading ? (
          <section className="workspace route-status" aria-busy="true">
            <LiveStreamCardSkeleton count={1} label={language === "en" ? "Opening this Holiwyn page" : "正在打开 Holiwyn 页面"} />
          </section>
        ) : routeError ? (
          <section className="workspace route-status">
            <EmptyState
              icon="!"
              title={routeError === "not-found"
                ? language === "en" ? "This Holiwyn page was not found" : "未找到此 Holiwyn 页面"
                : language === "en" ? "This page is temporarily unavailable" : "此页面暂时不可用"}
              description={routeError === "not-found"
                ? language === "en" ? "The room or creator link may be invalid or no longer available." : "直播间或主播链接可能无效，或已不再可用。"
                : language === "en" ? "Check the local service and try this link again." : "请检查本地服务后重试此链接。"}
              action={routeError === "not-found"
                ? <button type="button" onClick={() => showDiscovery("replace")}>{language === "en" ? "Explore live creators" : "发现直播主播"}</button>
                : <button type="button" onClick={() => void hydrateAudienceRoute(window.location.pathname)}>{language === "en" ? "Try again" : "重试"}</button>}
            />
          </section>
        ) : publicUserProfile ? (
          <PublicAudienceProfileView profile={publicUserProfile} authenticated={!isGuest} zh={language==="zh"} onBack={returnFromAudienceDetail} onEdit={()=>openAccountSection("profile")} onChanged={setPublicUserProfile} onOpenCreator={()=>{
            if(!publicUserProfile.creatorRoomSlug)return;
            const creatorRoom=rooms.find(item=>item.slug===publicUserProfile.creatorRoomSlug);
            if(creatorRoom)showProfile(creatorRoom);else void request(`/api/rooms/${encodeURIComponent(publicUserProfile.creatorRoomSlug)}`).then(data=>showProfile(data.room));
          }}/>
        ) : profileRoom ? (
          <PublicCreatorProfileView
            room={profileRoom}
            recommendations={rooms.filter((item) => item.streamer_id !== profileRoom.streamer_id)}
            t={t}
            back={() => {
              returnFromAudienceDetail();
            }}
            onOpenRoom={(item) => {
              showRoom(item);
            }}
            onFollowingChanged={() => {
              void loadFollowing();
              void loadRooms();
            }}
            authenticated={!isGuest}
            resumeIntent={resumeIntent}
            onRequireAuth={requireAuth}
            onIntentHandled={(message) => {
              setResumeIntent(null);
              if (message) setResumeNotice(message);
            }}
          />
        ) : room ? (
          <RoomView
            room={room}
            recommendations={rooms.filter((item) => item.slug !== room.slug)}
            back={() => {
              returnFromAudienceDetail();
              loadRooms();
            }}
            onOpenRoom={(item) => {
              showRoom(item);
            }}
            onOpenProfile={() => {
              showProfile(room);
            }}
            t={t}
            authenticated={!isGuest}
            resumeIntent={resumeIntent}
            onRequireAuth={requireAuth}
            onIntentHandled={(message) => {
              setResumeIntent(null);
              if (message) setResumeNotice(message);
            }}
          />
        ) : (
          <section className="workspace audience-discovery" id="live-now">
            <SimpleDiscovery rooms={rooms} languages={supportedLanguages} tags={publicTags} selectedLanguages={selectedLanguages} selectedTags={selectedTags} followingOnly={followingOnly} authenticated={!isGuest} loading={roomsLoading} error={roomsError} zh={language==="zh"} onLanguagesChange={setSelectedLanguages} onTagsChange={setSelectedTags} onFollowingChange={setFollowingOnly} onClear={()=>{setQuery("");setSettledQuery("");setSelectedLanguages([]);setSelectedTags([]);setFollowingOnly(false);}} onRetry={()=>void loadRooms()} onOpenRoom={(selected)=>showRoom(selected as Room)} onOpenCreator={(selected)=>showProfile(selected as Room)}/>
          </section>
        )
      ) : user.role === "admin" ? (
        <AdminPanel t={t} />
      ) : (
        <StreamerStudio
          t={t}
          language={language}
          onLanguageChange={setLanguage}
          onLogout={() => void logout()}
          onDiscover={() => { setStudioOpen(false); showDiscovery("push"); }}
        />
      )}
      <Modal
        open={isGuest && Boolean(authGate)}
        title={authMode === "login" ? (language === "en" ? "Sign in" : "登录") : (language === "en" ? "Create account" : "创建账户")}
        closeLabel={language === "en" ? "Continue browsing" : "继续浏览"}
        onClose={() => setAuthGate(null)}
      >
        <form className="login-form" onSubmit={(event) => void (authMode === "login" ? login(event) : register(event))}>
          <label>{language === "en" ? "Account handle" : "账户名"}<input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} autoComplete="username" minLength={3} maxLength={30} pattern={authMode === "register" ? "[a-z0-9_]+" : "[a-z0-9_-]+"} required /></label>
          {authMode === "register" ? <label>{language === "en" ? "Display name" : "显示名称"}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" minLength={2} maxLength={50} required /></label> : null}
          <label>{language === "en" ? "Password" : "密码"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={authMode === "register" ? 12 : 8} required /></label>
          {authMode === "register" ? <p className="form-help">{language === "en" ? "Private staging only. Do not use personal information or a real password. New accounts begin with zero R." : "仅限私有预发布环境。请勿使用个人信息或真实密码。新账户初始 R 为零。"}</p> : null}
          <button>{authMode === "login" ? (language === "en" ? "Sign in" : "登录") : (language === "en" ? "Create account" : "创建账户")}</button>
        </form>
        <button type="button" className="auth-mode-switch text-action" onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setLoginError("");setPassword("");}}>{authMode==="login"?(language==="en"?"New to Holiwyn? Create account":"首次使用 Holiwyn？创建账户"):(language==="en"?"Already have an account? Sign in":"已有账户？登录")}</button>
        {loginError ? <p className="error" role="alert">{loginError}</p> : null}
      </Modal>
      {resumeNotice ? <p className="notice auth-resume-notice" role="status">{resumeNotice}</p> : null}
    </main>
  );
}
type AccountSession = {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};
function AccountCenter({
  user,
  language,
  onUpdated,
  onBack,
  onLogout,
  onViewPublicProfile,
  section,
  onSectionChange,
  preferences,languages,tags,preferencesSaving,preferencesMessage,onPreferencesChange,onPreferencesSave,onPreferencesReset,
  following,followingLoading,followingError,onFollowingRetry,onOpenFollowing,onReminderChange,onUnfollow,onOpenHistory,
}: {
  user: User;
  language: Language;
  onUpdated: (user: User) => void;
  onBack: () => void;
  onLogout: () => void;
  onViewPublicProfile:()=>void;
  section: AccountSection;
  onSectionChange: (section: AccountSection) => void;
  preferences: DiscoveryPreferences|null; languages: SupportedLanguage[]; tags: PublicTag[]; preferencesSaving:boolean; preferencesMessage:""|"saved"|"reset"|"error";
  onPreferencesChange:(value:DiscoveryPreferences)=>void; onPreferencesSave:()=>void; onPreferencesReset:()=>void;
  following:Room[]; followingLoading:boolean; followingError:boolean; onFollowingRetry:()=>void; onOpenFollowing:(room:Room)=>void;
  onReminderChange:(streamerId:string,enabled:boolean)=>Promise<void>; onUnfollow:(room:Room)=>Promise<void>; onOpenHistory:(slug:string)=>void;
}) {
  const zh = language === "zh";
  const titles:Record<AccountSection,string>={profile:zh?"资料":"Profile",security:zh?"密码与恢复":"Password & recovery",sessions:zh?"登录设备":"Signed-in devices",preferences:zh?"发现偏好":"Discovery preferences",wallet:zh?"钱包":"Wallet",following:zh?"关注":"Following",activity:zh?"活动记录":"Activity",notifications:zh?"通知":"Notifications"};
  const [displayName, setDisplayName] = useState(user.displayName);
  const [locale, setLocale] = useState<Language>(user.locale);
  const [publicBio,setPublicBio]=useState("");
  const [publicProfileEnabled,setPublicProfileEnabled]=useState(true);
  const [publicAvatarUrl,setPublicAvatarUrl]=useState<string|null>(null);
  const [avatarSaving,setAvatarSaving]=useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [notice, setNotice] = useState("");
  const refreshSessions = () =>
    void request("/api/account/sessions").then((result) =>
      setSessions(result.sessions),
    );
  useEffect(refreshSessions, []);
  useEffect(()=>{void request("/api/account/profile").then(result=>{setPublicBio(result.publicProfile?.bio??"");setPublicProfileEnabled(result.publicProfile?.enabled!==false);setPublicAvatarUrl(result.publicProfile?.avatarUrl??null);});},[user.id]);
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    try {
      const result = await request("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName, locale, bio:publicBio, publicProfileEnabled }),
      });
      onUpdated(result.user);
      setNotice(zh ? "账户资料已保存。" : "Account profile saved.");
    } catch {
      setNotice(zh ? "无法保存账户资料。" : "The account profile could not be saved.");
    }
  }
  async function uploadPublicAvatar(file:File|null){if(!file)return;setAvatarSaving(true);setNotice("");try{const form=new FormData();form.append("avatar",file);const result=await request("/api/account/avatar",{method:"POST",body:form});setPublicAvatarUrl(result.avatarUrl);setNotice(zh?"头像已保存。":"Avatar saved.");}catch{setNotice(zh?"无法保存头像。请使用不超过 5 MB 的 JPEG、PNG 或 WebP。":"Avatar could not be saved. Use a JPEG, PNG, or WebP up to 5 MB.");}finally{setAvatarSaving(false);}}
  async function removePublicAvatar(){setAvatarSaving(true);setNotice("");try{await request("/api/account/avatar",{method:"DELETE"});setPublicAvatarUrl(null);setNotice(zh?"头像已移除。":"Avatar removed.");}catch{setNotice(zh?"暂时无法移除头像。":"Avatar could not be removed.");}finally{setAvatarSaving(false);}}
  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    if (newPassword !== confirmPassword) {
      setNotice(zh ? "两次输入的新密码不一致。" : "The new passwords do not match.");
      return;
    }
    try {
      await request("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(
        zh
          ? "密码已更改，其他所有设备均已退出。"
          : "Password changed. Every other device has been signed out.",
      );
      refreshSessions();
    } catch {
      setNotice(
        zh
          ? "无法更改密码。请检查当前密码和新密码强度。"
          : "Password change failed. Check the current password and new-password strength.",
      );
    }
  }
  async function revokeSession(id: string) {
    await request(`/api/account/sessions/${id}`, { method: "DELETE" });
    setNotice(zh ? "该设备已退出。" : "That device has been signed out.");
    refreshSessions();
  }
  async function revokeOthers() {
    const result = await request("/api/account/sessions", {
      method: "DELETE",
    });
    setNotice(
      zh
        ? `已退出 ${result.revoked} 个其他会话。`
        : `Signed out ${result.revoked} other session${result.revoked === 1 ? "" : "s"}.`,
    );
    refreshSessions();
  }
  return (
    <section className="account-center workspace">
      <div className="account-center-heading">
        <div>
          <h2>{titles[section]}</h2>
          <p className="muted">@{user.handle} · {roleLabel(copy[language], user.role)}</p>
        </div>
        <div>
          <button className="secondary account-back-link" onClick={onBack}>{zh ? "返回直播" : "Back to live"}</button>
          <button className="secondary mobile-account-signout" onClick={onLogout}>{zh ? "退出登录" : "Sign out"}</button>
        </div>
      </div>
      {notice && <p className="account-notice" role="status">{notice}</p>}
      <nav className="account-section-nav" aria-label={zh ? "账户设置" : "Account settings"}>
        {(["profile","security","sessions","preferences","wallet"] as const).map((item) => <button key={item} type="button" className={section === item ? "active" : "secondary"} aria-current={section === item ? "page" : undefined} onClick={() => onSectionChange(item)}>{titles[item]}</button>)}
      </nav>
      <div className="account-center-grid">
        <section hidden={section !== "profile"}>
          <h3>{zh ? "账户资料" : "Account profile"}</h3>
          <form className="account-form" onSubmit={(event) => void saveProfile(event)}>
            <div className="account-public-avatar"><CreatorAvatar name={displayName} url={publicAvatarUrl} className="account-public-avatar-image"/><div><label className="secondary account-avatar-upload">{avatarSaving?(zh?"保存中…":"Saving…"):(zh?"上传头像":"Upload avatar")}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarSaving} onChange={event=>{void uploadPublicAvatar(event.target.files?.[0]??null);event.currentTarget.value="";}}/></label>{publicAvatarUrl?<button type="button" className="secondary" disabled={avatarSaving} onClick={()=>void removePublicAvatar()}>{zh?"移除":"Remove"}</button>:null}</div></div>
            <label>{zh ? "显示名称" : "Display name"}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={50} required /></label>
            <label>{zh?"公开简介":"Public bio"}<textarea value={publicBio} onChange={event=>setPublicBio(event.target.value)} maxLength={280} placeholder={zh?"简单介绍一下自己":"Tell people a little about yourself"}/><small>{publicBio.length}/280</small></label>
            <label>{zh ? "界面语言" : "Interface language"}<select value={locale} onChange={(event) => setLocale(event.target.value as Language)}><option value="en">English</option><option value="zh">中文</option></select></label>
            <label className="account-profile-visibility"><input type="checkbox" checked={publicProfileEnabled} onChange={event=>setPublicProfileEnabled(event.target.checked)}/><span><strong>{zh?"公开我的观众资料":"Public audience profile"}</strong><small>{zh?"关闭后，其他用户无法打开您的观众资料。已启用的主播主页仍保持公开。":"When off, other people cannot open your audience profile. An active creator profile remains public."}</small></span></label>
            <button>{zh ? "保存资料" : "Save profile"}</button>
            {publicProfileEnabled?<button type="button" className="secondary" onClick={onViewPublicProfile}>{zh?"查看公开资料":"View public profile"}</button>:null}
          </form>
          <p className="form-help">{zh ? "账户名目前不可更改，以保持直播间、账本和审核记录的一致性。" : "Handles remain fixed so room ownership, ledgers, and moderation records stay consistent."}</p>
        </section>
        <section hidden={section !== "security"}>
          <h3>{zh ? "更改密码" : "Change password"}</h3>
          <form className="account-form" onSubmit={(event) => void changePassword(event)}>
            <label>{zh ? "当前密码" : "Current password"}<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} minLength={8} required /></label>
            <label>{zh ? "新密码" : "New password"}<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required /></label>
            <label>{zh ? "确认新密码" : "Confirm new password"}<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} required /></label>
            <p className="form-help">{zh ? "至少 12 位，并包含大写字母、小写字母和数字。更改后其他设备会自动退出。" : "Use 12+ characters with uppercase, lowercase, and a number. Other devices are signed out after a change."}</p>
            <button>{zh ? "更新密码" : "Update password"}</button>
          </form>
        </section>
        <section className="account-sessions" hidden={section !== "sessions"}>
          <div className="account-session-heading"><h3>{zh ? "登录设备" : "Signed-in devices"}</h3><button className="secondary" onClick={() => void revokeOthers()}>{zh ? "退出其他设备" : "Sign out other devices"}</button></div>
          {sessions.map((session) => (
            <article key={session.id}>
              <div><strong>{session.label}</strong><span>{session.current ? (zh ? "当前设备" : "Current device") : `${zh ? "最近活动" : "Last active"}: ${new Date(session.lastSeenAt).toLocaleString()}`}</span><small>{zh ? "到期" : "Expires"}: {new Date(session.expiresAt).toLocaleString()}</small></div>
              {!session.current && <button className="secondary" onClick={() => void revokeSession(session.id)}>{zh ? "退出" : "Sign out"}</button>}
            </article>
          ))}
        </section>
        {section === "preferences" && preferences ? <DiscoveryPreferencePanel preferences={preferences} languages={languages} tags={tags} zh={zh} saving={preferencesSaving} message={preferencesMessage} onChange={onPreferencesChange} onSave={onPreferencesSave} onReset={onPreferencesReset} /> : null}
        {section === "wallet" ? <AudienceRWallet zh={zh} /> : null}
        {section === "following" ? <FollowingFeed t={copy[language]} creators={following} loading={followingLoading} error={followingError} onRetry={onFollowingRetry} onOpen={onOpenFollowing} onReminderChange={onReminderChange} onUnfollow={onUnfollow} /> : null}
        {section === "activity" ? <ActivityPage zh={zh} onOpenRoom={onOpenHistory} /> : null}
        {section === "notifications" ? <NotificationsPage zh={zh} onOpenRoom={onOpenHistory} /> : null}
        <section className="account-recovery" hidden={section !== "security"}>
          <h3>{zh ? "账户恢复" : "Account recovery"}</h3>
          <p>{zh ? "账户恢复功能尚不可用。" : "Account recovery is not available yet."}</p>
        </section>
      </div>
    </section>
  );
}
function AudienceRWallet({ zh }: { zh: boolean }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<number[]>([]);
  const [orders, setOrders] = useState<{ id: string; amount: number; created_at: string }[]>([]);
  const [history, setHistory] = useState<{ entry_type: string; amount: number; reference_type: string; created_at: string }[]>([]);
  const [selected, setSelected] = useState(100);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    const [walletResult, orderResult, historyResult] = await Promise.all([
      request("/api/wallet"),
      request("/api/wallet/orders"),
      request("/api/wallet/history"),
    ]);
    setBalance(walletResult.balance);
    setPackages(orderResult.packages);
    setOrders(orderResult.orders);
    setHistory(historyResult.entries);
    setSelected((current) => orderResult.packages.includes(current) ? current : orderResult.packages[0] ?? 100);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function placeOrder() {
    setPending(true);
    setNotice("");
    try {
      await request("/api/wallet/orders", {
        method: "POST",
        body: JSON.stringify({ amount: selected, idempotencyKey: crypto.randomUUID() }),
      });
      await refresh();
      setNotice(zh ? `${selected.toLocaleString()} R 已加入此测试账户。` : `${selected.toLocaleString()} R was added to this test account.`);
    } catch {
      setNotice(zh ? "暂时无法完成 R 测试订单。" : "The R test order could not be completed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="account-r-wallet" id="audience-wallet">
      <div className="account-wallet-heading">
        <div><p className="eyebrow">{zh ? "钱包" : "WALLET"}</p><h3>{zh ? "R 余额" : "R balance"}</h3></div>
        <strong>{balance?.toLocaleString() ?? "…"} R</strong>
      </div>
      <p className="form-help">{zh ? "R 仅用于此测试环境，没有现金价值，也不能兑换或提现。" : "R is for this test environment only. It has no cash value and cannot be redeemed or withdrawn."}</p>
      <div className="r-package-grid" aria-label={zh ? "R 测试订单选项" : "R test order options"}>
        {packages.map((amount) => <button type="button" className={selected === amount ? "active" : "secondary"} aria-pressed={selected === amount} key={amount} onClick={() => setSelected(amount)}>{amount.toLocaleString()} R</button>)}
      </div>
      <button type="button" onClick={() => void placeOrder()} disabled={pending}>{pending ? (zh ? "处理中…" : "Processing…") : (zh ? `下测试订单 · ${selected.toLocaleString()} R` : `Place test order · ${selected.toLocaleString()} R`)}</button>
      {notice ? <p className="account-notice" role="status">{notice}</p> : null}
      <div className="r-wallet-history">
        <h4>{zh ? "最近记录" : "Recent activity"}</h4>
        {[...history].slice(0, 5).map((entry, index) => <p key={`${entry.created_at}-${index}`}><span>{entry.reference_type === "test_order" ? (zh ? "R 测试订单" : "R test order") : entry.reference_type}</span><strong>{entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString()} R</strong></p>)}
        {!history.length && !orders.length ? <p className="muted">{zh ? "暂无记录。" : "No activity yet."}</p> : null}
      </div>
    </section>
  );
}
function ActivityPage({zh,onOpenRoom}:{zh:boolean;onOpenRoom:(slug:string)=>void}){
  const [history,setHistory]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [page,setPage]=useState(1);const [more,setMore]=useState(false);
  const load=(next=1)=>{setLoading(true);request(`/api/me/history?page=${next}`).then((d)=>{setHistory((old)=>next===1?d.rooms:[...old,...d.rooms]);setMore(d.hasMore);setPage(next);}).catch(()=>setError(true)).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  return <section className="account-route-page" aria-busy={loading}><h3>{zh?"最近浏览":"Recently visited"}</h3>{error?<EmptyState icon="!" title={zh?"暂时无法加载活动记录":"Activity is temporarily unavailable"} description={zh?"请稍后重试。":"Try again in a moment."}/>:history.length?<><div className="activity-list">{history.map((item)=><button className="secondary" type="button" key={item.slug} onClick={()=>onOpenRoom(item.slug)}><span><strong>{item.title}</strong><small>{item.streamer_name}</small></span><time dateTime={item.visited_at}>{new Date(item.visited_at).toLocaleString()}</time></button>)}</div>{more?<button className="secondary account-load-more" disabled={loading} onClick={()=>load(page+1)}>{zh?"加载更多":"Load more"}</button>:null}</>:!loading?<EmptyState icon="↺" title={zh?"还没有浏览记录":"No viewing activity yet"} description={zh?"您访问过的公开直播间会显示在这里。":"Public rooms you visit will appear here."}/>:null}</section>;
}
function NotificationsPage({zh,onOpenRoom}:{zh:boolean;onOpenRoom:(slug:string)=>void}){
  const [notes,setNotes]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [page,setPage]=useState(1);const [more,setMore]=useState(false);
  const load=(next=1)=>request(`/api/me/notifications?page=${next}`).then((d)=>{setNotes((old)=>next===1?d.notifications:[...old,...d.notifications]);setMore(d.hasMore);setPage(next);}).finally(()=>setLoading(false));
  useEffect(()=>{void load();const socket=io({transports:["websocket"]});socket.on("notification:new",()=>void load());return()=>{socket.disconnect();};},[]);
  const mark=async(id:string)=>{await request(`/api/me/notifications/${id}/read`,{method:"PATCH",body:"{}"});await load();};
  const markAll=async()=>{await request("/api/me/notifications/read-all",{method:"POST",body:"{}"});await load();};
  const unread=notes.filter((item)=>!item.read_at).length;
  return <section className="account-route-page" aria-busy={loading}><div className="notification-heading"><h3>{zh?"账户通知":"Account notifications"}</h3>{unread?<button className="secondary" onClick={()=>void markAll()}>{zh?"全部标为已读":"Mark all read"}</button>:null}</div>{notes.length?<><div className="notification-list">{notes.map((item)=><article key={item.id} className={`notification-item ${item.read_at?"read":"unread"}`}><div><strong>{item.title}</strong><p>{item.room_slug&&item.room_is_live===false?(zh?"该主播目前未直播。":"This creator is currently offline."):item.body}</p><time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()}>{new Intl.RelativeTimeFormat(zh?"zh":"en",{numeric:"auto"}).format(Math.round((new Date(item.created_at).getTime()-Date.now())/60000),"minute")}</time></div><div className="notification-actions">{item.room_slug?<button className="secondary" onClick={()=>{if(!item.read_at)void mark(item.id);onOpenRoom(item.room_slug);}}>{zh?"查看当前页面":"Open current page"}</button>:null}{!item.read_at?<button className="secondary" onClick={()=>void mark(item.id)}>{zh?"标为已读":"Mark read"}</button>:null}</div></article>)}</div>{more?<button className="secondary account-load-more" disabled={loading} onClick={()=>void load(page+1)}>{zh?"加载更多":"Load more"}</button>:null}</>:!loading?<EmptyState icon="○" title={zh?"暂无通知":"No notifications yet"} description={zh?"账户和主播更新会显示在这里。":"Account and creator updates will appear here."}/>:null}</section>;
}
function FollowingFeed({
  t,
  creators,
  loading,
  error,
  onRetry,
  onOpen,
  onReminderChange,
  onUnfollow,
}: {
  t: typeof copy.en;
  creators: Room[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (room: Room) => void;
  onReminderChange: (streamerId: string, enabled: boolean) => Promise<void>;
  onUnfollow: (room: Room) => Promise<void>;
}) {
  const zh = t.title !== "Stream MVP";
  if (loading)
    return (
      <section className="following-feed" id="following-feed" aria-busy="true">
        <div className="following-feed-heading"><div><p className="eyebrow">{zh ? "我的关注" : "Following"}</p><h3>{zh ? "正在加载关注主播" : "Loading followed creators"}</h3></div></div>
      </section>
    );
  if (error)
    return (
      <section className="following-feed empty" id="following-feed" role="alert">
        <div><p className="eyebrow">{zh ? "我的关注" : "Following"}</p><h3>{zh ? "暂时无法加载关注列表" : "Following is temporarily unavailable"}</h3></div>
        <p className="muted">{zh ? "请检查连接后重试。" : "Check the connection and try again."}</p>
        <button type="button" onClick={onRetry}>{zh ? "重试" : "Try again"}</button>
      </section>
    );
  if (!creators.length)
    return (
      <section className="following-feed empty" id="following-feed">
        <div><p className="eyebrow">{zh ? "我的关注" : "Following"}</p><h3>{zh ? "收藏你想再次观看的主播" : "Save creators you want to watch again"}</h3></div>
        <p className="muted">{zh ? "进入直播间并点击关注后，主播状态和下一场日程会显示在这里。" : "Follow a creator from their room to see live status and the next scheduled stream here."}</p>
      </section>
    );
  return (
    <section className="following-feed" id="following-feed">
      <div className="following-feed-heading"><div><p className="eyebrow">{zh ? "我的关注" : "Following"}</p><h3>{zh ? "全部已关注主播" : "All followed creators"}</h3></div><span>{creators.filter((item) => item.broadcast_state === "live" && item.broadcast_status_source !== "local").length} {zh ? "正在直播" : "live"}</span></div>
      <div className="following-feed-list">
        {creators.map((item) => (
          <article key={item.slug} className="following-feed-item">
            <button type="button" className="secondary following-feed-open" onClick={() => onOpen(item)}>
              <CreatorAvatar name={item.streamer_name} url={item.avatar_url} className={`following-avatar state-${item.broadcast_state}`} />
              <span><strong>{item.streamer_name}</strong><small>{broadcastLabel(t, item.broadcast_state)}</small><small>{item.next_stream_at ? `${zh ? "下一场" : "Next"}: ${new Date(item.next_stream_at).toLocaleString(zh ? "zh-CN" : "en-US", { timeZone: item.schedule_timezone || undefined })}` : item.schedule_text}</small></span>
            </button>
            <button type="button" className="secondary reminder-toggle" aria-pressed={item.reminder_enabled !== false} onClick={() => void onReminderChange(item.streamer_id, item.reminder_enabled === false)}>
              {item.reminder_enabled === false ? (zh ? "开启提醒" : "Remind me") : (zh ? "提醒已开启" : "Reminder on")}
            </button>
            <button type="button" className="secondary" onClick={() => { if(window.confirm(zh?`取消关注 ${item.streamer_name}？`:`Unfollow ${item.streamer_name}?`)) void onUnfollow(item); }}>{zh?"取消关注":"Unfollow"}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
function CreatorLiveMonitor({
  slug,
  t,
  mobileOpen,
  onMobileClose,
  onViewerCountChange,
  initialSlowModeSeconds,
  initialBlockedTerms,
}: {
  slug: string;
  t: typeof copy.en;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onViewerCountChange: (count: number) => void;
  initialSlowModeSeconds: number;
  initialBlockedTerms: string[];
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slowModeSeconds, setSlowModeSeconds] = useState(initialSlowModeSeconds);
  const [blockedTerms, setBlockedTerms] = useState(initialBlockedTerms.join(", "));
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const zh = t.title !== "Stream MVP";
  useEffect(() => {
    void request(`/api/rooms/${slug}/chat-history`)
      .then((d) => setMessages(d.messages))
      .catch(() => setStatus(zh ? "暂时无法加载聊天记录。" : "Chat history is temporarily unavailable."));
    const socket = io({ transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("room:join", slug));
    socket.on("room:presence", (d: { users: any[] }) => {
      const audience = d.users.filter((user) => user.role === "audience");
      setParticipants(
        Array.from(new Map(audience.map((user) => [user.id, user])).values()),
      );
    });
    socket.on("chat:message", (d) =>
      setMessages((current) => [...current.slice(-39), d]),
    );
    socket.on("chat:deleted", (d: { messageId: string }) =>
      setMessages((current) => current.filter((message) => message.id !== d.messageId)),
    );
    socket.on("gift:sent", (d) =>
      setGifts((current) =>
        [...current.slice(-7), { ...d, createdAt: new Date().toISOString() }],
      ),
    );
    socket.on("gift:acknowledged", (d) =>
      setGifts((current) =>
        current.map((gift) =>
          gift.giftTransactionId === d.giftTransactionId
            ? { ...gift, acknowledgement: d }
            : gift,
        ),
      ),
    );
    socket.on("action:purchased", (d) =>
      setGifts((current) =>
        [
          ...current.slice(-7),
          { ...d, name: d.title, createdAt: new Date().toISOString(), action: true },
        ],
      ),
    );
    return () => {
      socket.disconnect();
    };
  }, [slug, zh]);
  useEffect(() => setSlowModeSeconds(initialSlowModeSeconds), [initialSlowModeSeconds]);
  useEffect(() => setBlockedTerms(initialBlockedTerms.join(", ")), [initialBlockedTerms]);
  useEffect(() => onViewerCountChange(participants.length), [onViewerCountChange, participants.length]);
  function send(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit(
      "chat:send",
      { roomSlug: slug, body: draft.trim() },
      (result: { error?: string }) =>
        setStatus(result?.error ? result.error : ""),
    );
    setDraft("");
  }
  async function moderate(message: any, action: "mute" | "timeout" | "ban" | "delete") {
    try {
      await request(`/api/streamer/rooms/${slug}/moderation`, {
        method: "POST",
        body: JSON.stringify({
          action,
          targetId: message.sender?.id,
          messageId: message.id,
          durationSeconds: action === "timeout" ? 600 : undefined,
        }),
      });
      setStatus(action === "delete" ? (zh ? "消息已删除。" : "Message deleted.") : action === "ban" ? (zh ? "观众已被禁止发言。" : "Viewer banned from chat.") : action === "timeout" ? (zh ? "观众已被暂停发言 10 分钟。" : "Viewer timed out for 10 minutes.") : (zh ? "观众已被禁言。" : "Viewer muted."));
    } catch {
      setStatus(zh ? "暂时无法执行管理操作。" : "Moderation action is temporarily unavailable.");
    }
  }
  async function saveChatSettings() {
    try {
      await request(`/api/streamer/rooms/${slug}/chat-settings`, {
        method: "PUT",
        body: JSON.stringify({
          slowModeSeconds,
          blockedTerms: blockedTerms.split(",").map((term) => term.trim()).filter(Boolean),
        }),
      });
      setSettingsOpen(false);
      setStatus(zh ? "聊天管理设置已保存。" : "Chat moderation settings saved.");
    } catch {
      setStatus(zh ? "无法保存聊天设置。" : "Chat settings could not be saved.");
    }
  }
  return (
    <aside className={`broadcaster-chat ${mobileOpen ? "is-open" : ""}`} aria-label={zh ? "直播聊天" : "Live chat"}>
      <header className="broadcaster-chat-header">
        <div><span className="live-dot" /> <strong>{zh ? "直播聊天" : "LIVE CHAT"}</strong></div>
        <span className="presence-pill">
          {participants.length} {zh ? "位观众" : "viewers"}
        </span>
        <button type="button" className="broadcaster-chat-settings-button" onClick={() => setSettingsOpen((current) => !current)} aria-label={zh ? "聊天管理设置" : "Chat moderation settings"}><BroadcastIcon name="settings" /></button>
        <button type="button" className="broadcaster-chat-close" onClick={onMobileClose} aria-label={zh ? "关闭聊天" : "Close chat"}><BroadcastIcon name="close" /></button>
      </header>
      {settingsOpen ? <div className="broadcaster-chat-settings">
        <label>{zh ? "慢速模式" : "Slow mode"}<select value={slowModeSeconds} onChange={(event) => setSlowModeSeconds(Number(event.target.value))}><option value={0}>{zh ? "关闭" : "Off"}</option><option value={5}>5s</option><option value={15}>15s</option><option value={30}>30s</option><option value={60}>60s</option></select></label>
        <label>{zh ? "屏蔽词（逗号分隔）" : "Blocked terms (comma separated)"}<input value={blockedTerms} maxLength={500} onChange={(event) => setBlockedTerms(event.target.value)} /></label>
        <button type="button" onClick={() => void saveChatSettings()}>{zh ? "保存" : "Save"}</button>
      </div> : null}
      <div className="broadcaster-chat-feed" aria-live="polite">
        {!messages.length && !gifts.length ? (
          <div className="creator-empty-state">
            <strong>{zh ? "聊天会显示在这里" : "Chat will appear here"}</strong>
            <span>{zh ? "开播后向第一位观众打个招呼。" : "Say hello when your first viewer arrives."}</span>
          </div>
        ) : null}
        {messages.map((message) => (
          <div className={`broadcaster-chat-message ${message.sender?.role === "streamer" ? "creator" : ""}`} key={message.id}>
            <p><strong>{message.sender.displayName}</strong><span>{message.body}</span></p>
            {message.sender?.role === "audience" ? <details className="chat-message-actions"><summary aria-label={zh ? `管理 ${message.sender.displayName}` : `Moderate ${message.sender.displayName}`}><BroadcastIcon name="more" /></summary><div>
              <button type="button" onClick={() => void moderate(message, "delete")}><BroadcastIcon name="trash" />{zh ? "删除" : "Delete"}</button>
              <button type="button" onClick={() => void moderate(message, "mute")}><BroadcastIcon name="mute" />{zh ? "禁言" : "Mute"}</button>
              <button type="button" onClick={() => void moderate(message, "timeout")}><BroadcastIcon name="timeout" />{zh ? "暂停 10 分钟" : "Timeout 10m"}</button>
              <button type="button" className="danger" onClick={() => void moderate(message, "ban")}><BroadcastIcon name="ban" />{zh ? "禁止" : "Ban"}</button>
            </div></details> : null}
          </div>
        ))}
        {gifts.map((gift) => (
          <p className="broadcaster-gift-event" key={gift.eventId ?? gift.id}>
            <span aria-hidden="true">{gift.action ? "⚡" : gift.symbol ?? "◆"}</span>
            <strong>{gift.sender}</strong>
            <span>{gift.action ? (zh ? "购买了" : "purchased") : (zh ? "送出了" : "sent")} {zh ? gift.nameZh ?? gift.name : gift.nameEn ?? gift.name}{gift.quantity > 1 ? ` ×${gift.quantity}` : ""}</span>
          </p>
        ))}
      </div>
      <form className="broadcaster-chat-form" onSubmit={send}>
        <input value={draft} maxLength={500} onChange={(event) => setDraft(event.target.value)} placeholder={zh ? "输入消息…" : "Type message…"} />
        <button>{zh ? "发送" : "Send"}</button>
      </form>
      {status ? <p className="error broadcaster-chat-error">{status}</p> : null}
    </aside>
  );
}
function CreatorModerationRestrictions({ slug, t }: { slug: string; t: typeof copy.en }) {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const zh = t.title !== "Stream MVP";
  const refresh = () => void request(`/api/streamer/rooms/${slug}/moderation`).then((result) => setItems(result.restrictions)).catch(() => setStatus(zh ? "暂时无法加载管理列表。" : "Moderation list is temporarily unavailable."));
  useEffect(refresh, [slug]);
  async function clear(item: any, action: "unmute" | "unban") {
    await request(`/api/streamer/rooms/${slug}/moderation`, { method: "POST", body: JSON.stringify({ targetId: item.user_id, action }) });
    refresh();
  }
  return <section className="creator-moderation-list"><div><h3>{zh ? "聊天管理" : "Chat moderation"}</h3><p>{zh ? "在直播聊天中点击消息旁的菜单可删除、暂停或禁止用户。" : "Use the menu beside a live-chat message to delete, timeout, mute, or ban a viewer."}</p></div>{items.length ? <ul>{items.map((item) => <li key={item.user_id}><span><strong>{item.display_name}</strong><small>{item.is_banned ? (zh ? "已禁止" : "Banned") : item.muted_until ? (zh ? `暂停至 ${new Date(item.muted_until).toLocaleTimeString()}` : `Timed out until ${new Date(item.muted_until).toLocaleTimeString()}`) : (zh ? "已禁言" : "Muted")}</small></span><button type="button" className="secondary" onClick={() => void clear(item, item.is_banned ? "unban" : "unmute")}>{zh ? "解除" : "Remove"}</button></li>)}</ul> : <p className="muted">{zh ? "当前没有受限用户。" : "No viewers are currently restricted."}</p>}{status ? <p className="error">{status}</p> : null}</section>;
}
function CreatorSessionInsights({
  slug,
  audienceCount,
  t,
}: {
  slug: string;
  audienceCount: number;
  t: typeof copy.en;
}) {
  const [insights, setInsights] = useState<any>(null);
  const zh = t.title !== "Stream MVP";
  const refresh = () =>
    void request(`/api/streamer/rooms/${slug}/insights`).then(setInsights);
  useEffect(() => {
    refresh();
    const socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket.emit("room:join", slug));
    socket.on("gift:sent", refresh);
    socket.on("action:purchased", refresh);
    return () => {
      socket.disconnect();
    };
  }, [slug]);
  if (!insights)
    return (
      <section className="session-insights">
        <p className="muted">{t.preparing}</p>
      </section>
    );
  const stats = insights.stats;
  return (
    <section className="session-insights">
      <div>
        <p className="eyebrow">
          {zh ? "\u4f1a\u8bdd\u6d1e\u5bdf" : "Session insights"}
        </p>
        <h3>
          {zh
            ? "\u76f4\u64ad\u652f\u6301\u6982\u89c8"
            : "Live support overview"}
        </h3>
      </div>
      <div className="insight-metrics">
        <div>
          <span>{zh ? "\u5f53\u524d\u89c2\u4f17" : "Audience now"}</span>
          <strong>{audienceCount}</strong>
        </div>
        <div>
          <span>{zh ? "\u793c\u7269\u652f\u6301" : "Gift support"}</span>
          <strong>
            {stats.gift_total} {t.coins}
          </strong>
        </div>
        <div>
          <span>{zh ? "\u52a8\u4f5c\u652f\u6301" : "Action support"}</span>
          <strong>
            {stats.action_total} {t.coins}
          </strong>
        </div>
        <div>
          <span>{zh ? "\u52a8\u4f5c\u89e6\u53d1" : "Action purchases"}</span>
          <strong>{stats.action_count}</strong>
        </div>
      </div>
      <div className="insight-detail">
        <div>
          <p className="eyebrow">
            {zh
              ? "\u672c\u573a\u6700\u4f73\u652f\u6301\u8005"
              : "Top supporter"}
          </p>
          <strong>
            {insights.topSupporter
              ? `${insights.topSupporter.sender} · ${insights.topSupporter.total} ${t.coins}`
              : zh
                ? "\u6682\u65e0\u652f\u6301"
                : "No support yet"}
          </strong>
        </div>
        <div>
          <p className="eyebrow">
            {zh ? "\u76ee\u6807\u8fdb\u5ea6" : "Goal progress"}
          </p>
          <strong>
            {insights.goal.goal_progress} / {insights.goal.goal_target}{" "}
            {t.coins}
          </strong>
        </div>
      </div>
      <div className="insight-activity">
        <p className="eyebrow">
          {zh ? "\u6700\u8fd1\u652f\u6301" : "Recent support"}
        </p>
        {insights.recent.length ? (
          insights.recent.map((item: any, index: number) => (
            <p key={`${item.created_at}-${index}`}>
              <strong>{item.sender}</strong> ·{" "}
              {item.support_type === "gift"
                ? zh
                  ? "\u793c\u7269"
                  : "Gift"
                : zh
                  ? "\u52a8\u4f5c"
                  : "Action"}{" "}
              · {item.label} · {item.coin_cost} {t.coins}
            </p>
          ))
        ) : (
          <p className="muted">
            {zh
              ? "\u6682\u65e0\u6d4b\u8bd5\u652f\u6301\u3002"
              : "No test support yet."}
          </p>
        )}
      </div>
    </section>
  );
}
function ActionMenuManager({ slug, t }: { slug: string; t: typeof copy.en }) {
  const [actions, setActions] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState(25);
  const [duration, setDuration] = useState("");
  const zh = t.title !== "Stream MVP";
  const refresh = () =>
    void request(`/api/streamer/rooms/${slug}/actions`).then((d) =>
      setActions(d.actions),
    );
  useEffect(refresh, [slug]);
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await request(`/api/streamer/rooms/${slug}/actions`, {
      method: "POST",
      body: JSON.stringify({ title, coinCost: cost, durationLabel: duration }),
    });
    setTitle("");
    setCost(25);
    setDuration("");
    refresh();
  }
  async function update(action: any, patch: Record<string, unknown>) {
    await request(`/api/streamer/rooms/${slug}/actions/${action.id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    refresh();
  }
  return (
    <section className="action-manager">
      <div>
        <p className="eyebrow">
          {zh
            ? "\u89c2\u4f17\u652f\u6301\u52a8\u4f5c"
            : "Viewer-supported actions"}
        </p>
        <h3>{zh ? "\u5feb\u901f\u64cd\u4f5c\u83dc\u5355" : "Action menu"}</h3>
      </div>
      <p className="muted">
        {zh
          ? "\u8bbe\u7f6e\u5c0f\u800c\u6e05\u695a\u7684\u6d4b\u8bd5\u91d1\u5e01\u52a8\u4f5c\u3002\u89c2\u4f17\u89e6\u53d1\u540e\uff0c\u76f4\u64ad\u95f4\u4f1a\u5b9e\u65f6\u663e\u793a\u652f\u6301\u3002"
          : "Set a small, clear set of test-coin actions. Viewer support appears in the room in real time."}
      </p>
      <div className="action-editor-list">
        {actions.map((action) => (
          <div className="action-editor" key={action.id}>
            <input
              defaultValue={action.title}
              onBlur={(e) =>
                e.target.value !== action.title &&
                void update(action, { title: e.target.value })
              }
              aria-label="Action title"
            />
            <input
              type="number"
              min="1"
              defaultValue={action.coin_cost}
              onBlur={(e) =>
                Number(e.target.value) !== action.coin_cost &&
                void update(action, { coinCost: Number(e.target.value) })
              }
              aria-label="Action coin cost"
            />
            <input
              defaultValue={action.duration_label ?? ""}
              onBlur={(e) =>
                e.target.value !== (action.duration_label ?? "") &&
                void update(action, { durationLabel: e.target.value })
              }
              placeholder={
                zh
                  ? "\u65f6\u957f\uff08\u53ef\u9009\uff09"
                  : "Duration (optional)"
              }
            />
            <button
              type="button"
              className="secondary"
              onClick={() =>
                void update(action, { isActive: !action.is_active })
              }
            >
              {action.is_active
                ? zh
                  ? "\u5df2\u542f\u7528"
                  : "Active"
                : zh
                  ? "\u5df2\u505c\u7528"
                  : "Inactive"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                void update(action, {
                  displayOrder: Math.max(0, action.display_order - 1),
                })
              }
              aria-label="Move action earlier"
            >
              ↑
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                void update(action, { displayOrder: action.display_order + 1 })
              }
              aria-label="Move action later"
            >
              ↓
            </button>
          </div>
        ))}
      </div>
      <form className="action-editor add-action" onSubmit={(e) => void add(e)}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder={
            zh ? "\u65b0\u52a8\u4f5c\u6807\u9898" : "New action title"
          }
        />
        <input
          type="number"
          min="1"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          aria-label="New action coin cost"
        />
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          maxLength={60}
          placeholder={
            zh ? "\u65f6\u957f\uff08\u53ef\u9009\uff09" : "Duration (optional)"
          }
        />
        <button>{zh ? "\u6dfb\u52a0\u52a8\u4f5c" : "Add action"}</button>
      </form>
    </section>
  );
}
function ObsReadiness({
  slug,
  state,
  source,
  t,
  onChanged,
}: {
  slug: string;
  state?: string;
  source?: "local" | "cloudflare";
  t: typeof copy.en;
  onChanged: () => void;
}) {
  const zh = t.title !== "Stream MVP";
  const simulated = source === "local";
  const stateGuide: Record<string, string> = zh
    ? {
        offline: "OBS \u5c1a\u672a\u5f00\u59cb\u63a8\u6d41\u3002",
        connecting:
          simulated
            ? "\u6b63\u5728\u6a21\u62df\u8fde\u63a5\u72b6\u6001\uff0c\u672a\u53d1\u5e03\u5a92\u4f53\u3002"
            : "Cloudflare \u6b63\u5728\u51c6\u5907\u89c2\u4f17\u64ad\u653e\u3002",
        live: simulated
          ? "\u8fd9\u662f\u6a21\u62df\u76f4\u64ad\u72b6\u6001\uff0c\u89c2\u4f17\u65e0\u6cd5\u64ad\u653e\u89c6\u9891\u3002"
          : "\u89c2\u4f17\u73b0\u5728\u5e94\u53ef\u4ee5\u89c2\u770b\u76f4\u64ad\u3002",
        unavailable:
          "\u6682\u65f6\u65e0\u6cd5\u786e\u8ba4\u76f4\u64ad\u72b6\u6001\u3002",
      }
    : {
        offline: "OBS is not streaming yet.",
        connecting: simulated
          ? "Simulated connecting state; no media is being published."
          : "Cloudflare is preparing audience playback.",
        live: simulated
          ? "This is a simulated live state; viewers cannot play video."
          : "Audience playback should now be available.",
        unavailable: "The broadcast status could not be confirmed.",
      };
  return (
    <section className="obs-readiness">
      <div>
        <p className="eyebrow">
          {zh ? "OBS \u5f00\u64ad\u51c6\u5907" : "Go live with OBS"}
        </p>
        <h3>
          {zh
            ? "\u76f8\u673a\u4e0e\u9ea6\u514b\u98ce\u5728 OBS \u4e2d\u9009\u62e9"
            : "Choose camera and microphone in OBS"}
        </h3>
      </div>
      <ol>
        <li>
          {zh
            ? "\u6253\u5f00 OBS\uff0c\u6dfb\u52a0\u6b63\u786e\u7684\u6444\u50cf\u5934\u548c\u9ea6\u514b\u98ce\u6765\u6e90\u3002"
            : "Open OBS and add the correct camera and microphone sources."}
        </li>
        <li>
          {zh
            ? "\u5728 OBS \u4e2d\u4f7f\u7528\u60a8\u5df2\u914d\u7f6e\u7684\u79c1\u6709 Cloudflare Live Input\u3002"
            : "Use your already configured private Cloudflare Live Input in OBS."}
        </li>
        <li>
          {zh
            ? "\u5f00\u59cb\u63a8\u6d41\u540e\uff0c\u5728\u8fd9\u91cc\u5237\u65b0\u72b6\u6001\u3002"
            : "Start streaming, then refresh status here."}
        </li>
      </ol>
      <p className={`obs-state state-${state ?? "offline"}`}>
        {stateGuide[state ?? "offline"]}
      </p>
      <button
        type="button"
        className="secondary"
        disabled={state === "live"}
        onClick={() =>
          void request(`/api/streamer/rooms/${slug}/broadcast/transport`, {
            method: "PUT",
            body: JSON.stringify({ transport: "obs_hls" }),
          }).then(onChanged)
        }
      >
        {zh ? "切换到专业 OBS 模式" : "Switch to professional OBS mode"}
      </button>
      <details>
        <summary>
          {zh
            ? "OBS \u76f8\u673a / \u97f3\u9891\u6392\u67e5"
            : "OBS camera / audio checks"}
        </summary>
        <ul>
          <li>
            {zh
              ? "\u786e\u8ba4\u9009\u4e2d\u4e86\u6b63\u786e\u6444\u50cf\u5934\u6765\u6e90\u3002"
              : "Check that the correct camera source is selected."}
          </li>
          <li>
            {zh
              ? "\u786e\u8ba4\u9ea6\u514b\u98ce\u97f3\u91cf\u8868\u5728\u6d3b\u52a8\u3002"
              : "Confirm the microphone meter is moving."}
          </li>
          <li>
            {zh
              ? "\u786e\u8ba4 OBS \u5177\u6709\u6444\u50cf\u5934\u548c\u9ea6\u514b\u98ce\u6743\u9650\u3002"
              : "Confirm OBS has camera and microphone permissions."}
          </li>
          <li>
            {zh
              ? "\u5728\u672c\u5730\u76d1\u542c\u97f3\u9891\uff0c\u5f00\u59cb\u63a8\u6d41\u540e\u518d\u5237\u65b0\u72b6\u6001\u3002"
              : "Monitor audio locally, then refresh status after streaming starts."}
          </li>
        </ul>
      </details>
    </section>
  );
}

type QuickLivePhase =
  | "idle"
  | "requesting"
  | "preview"
  | "connecting"
  | "live"
  | "ending"
  | "ended"
  | "error";

type BroadcastConnectionHealth =
  | "ready"
  | "connecting"
  | "excellent"
  | "weak"
  | "reconnecting"
  | "unavailable";

type BroadcasterRuntime = {
  phase: QuickLivePhase;
  health: BroadcastConnectionHealth;
  duration: string;
};

type CameraFacingMode = "user" | "environment";

type WakeLockHandle = {
  released: boolean;
  release: () => Promise<void>;
};

type CreatorIconName = "microphone" | "camera" | "flip" | "chat" | "stop" | "live" | "earnings" | "supporters" | "followers" | "actions" | "profile" | "settings" | "trash" | "mute" | "timeout" | "ban" | "upload" | "viewers" | "more" | "close";
function BroadcastIcon({ name }: { name: CreatorIconName }) {
  const paths = {
    microphone: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    camera: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="m8 6 1.5-3h5L16 6M9 12.5l2 2 4-4" /></>,
    flip: <><path d="M4 8a8 8 0 0 1 13-3l2 2M20 16a8 8 0 0 1-13 3l-2-2" /><path d="M19 3v4h-4M5 21v-4h4" /></>,
    chat: <path d="M4 4h16v12H9l-5 4V4Z" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    live: <><circle cx="12" cy="12" r="3" /><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10" /></>,
    earnings: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1 1.8 3 2.2 3 1 3 2.3-1.3 2.3-3 2.3c-1.2 0-2.4-.4-3.2-1.2M12 5.5v13" /></>,
    supporters: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
    followers: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 7 4.5" /></>,
    actions: <><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.5 6A8 8 0 0 0 9 7L6.6 6 4.7 9.5 6.8 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.3-1A8 8 0 0 0 10.5 18l.3 2.6h4L15 18a8 8 0 0 0 1.5-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    mute: <><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6" /></>,
    timeout: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    ban: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" /></>,
    viewers: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg className="broadcast-control-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function VideoActivityOverlay({
  messages,
  gift,
  t,
  variant = "viewer",
}: {
  messages: any[];
  gift: any | null;
  t: Record<string, string>;
  variant?: "viewer" | "creator";
}) {
  const [visible, setVisible] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const zh = t.title !== "Stream MVP";
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const recentMessages = messages
    .filter((message) => {
      const created = Date.parse(message.createdAt ?? "");
      return !Number.isFinite(created) || clock - created < 12_000;
    })
    .slice(-5);
  return (
    <div className={`video-activity-overlay ${variant === "creator" ? "creator-activity-overlay" : "viewer-activity-overlay"} ${visible ? "is-visible" : "is-hidden"}`}>
      {variant === "viewer" ? (
        <button
          type="button"
          className="video-overlay-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
        >
          {visible ? (zh ? "隐藏互动" : "Hide activity") : zh ? "显示互动" : "Show activity"}
        </button>
      ) : null}
      {visible ? (
        <>
          <div className="video-overlay-comments" aria-live="polite">
            {recentMessages.map((message) => (
              <p key={message.id} className={`overlay-comment ${message.sender?.role === "streamer" ? "creator" : ""}`}>
                <strong>{message.sender?.displayName}</strong>
                <span>{message.body}</span>
              </p>
            ))}
          </div>
          {gift ? (
            <div
              key={gift.eventId ?? gift.id}
              className={`overlay-gift ${gift.animationTier ?? "small"}`}
              aria-live="polite"
            >
              <span className="overlay-gift-symbol" aria-hidden="true">{gift.symbol ?? "◆"}</span>
              <div>
                <strong>{gift.sender}</strong>
                <span>
                  {zh ? gift.nameZh ?? gift.name : gift.nameEn ?? gift.name}
                  {gift.quantity > 1 ? ` ×${gift.quantity}` : ""}
                  {gift.comboCount > 1 ? ` · COMBO ×${gift.comboCount}` : ""}
                </span>
              </div>
              <b>+{gift.cost}</b>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function CreatorRealtimeOverlay({ slug, t }: { slug: string; t: typeof copy.en }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [gift, setGift] = useState<any | null>(null);
  useEffect(() => {
    void request(`/api/rooms/${slug}/chat-history`).then((result) =>
      setMessages(result.messages.slice(-5)),
    );
    const socket = io({ transports: ["websocket"] });
    let giftTimer = 0;
    socket.on("connect", () => socket.emit("room:join", slug));
    socket.on("chat:message", (message) =>
      setMessages((current) => [...current.slice(-4), message]),
    );
    socket.on("chat:deleted", ({ messageId }: { messageId: string }) =>
      setMessages((current) => current.filter((message) => message.id !== messageId)),
    );
    socket.on("gift:sent", (event) => {
      window.clearTimeout(giftTimer);
      setGift(event);
      giftTimer = window.setTimeout(() => setGift(null), 3_500);
    });
    return () => {
      window.clearTimeout(giftTimer);
      socket.disconnect();
    };
  }, [slug]);
  return <VideoActivityOverlay messages={messages} gift={gift} t={t} variant="creator" />;
}

function QuickGoLive({
  slug,
  available,
  broadcastState,
  broadcastSource,
  transport,
  title,
  primaryLanguage,
  additionalLanguages,
  tagIds,
  languageOptions,
  tagOptions,
  thumbnailUrl,
  t,
  onChanged,
  onTitleChange,
  onPrimaryLanguageChange,
  onAdditionalLanguagesChange,
  onTagIdsChange,
  onSaveMetadata,
  onThumbnailSelected,
  overlay,
  viewerCount,
  onRuntimeChange,
  onChatOpen,
  activeView,
}: {
  slug: string;
  available: boolean;
  broadcastState: string;
  broadcastSource?: "local" | "cloudflare";
  transport?: "obs_hls" | "browser_webrtc";
  title: string;
  primaryLanguage: string;
  additionalLanguages: string[];
  tagIds: string[];
  languageOptions: LanguageOption[];
  tagOptions: TagOption[];
  thumbnailUrl?: string | null;
  t: typeof copy.en;
  onChanged: () => void;
  onTitleChange: (title: string) => void;
  onPrimaryLanguageChange: (language: string) => void;
  onAdditionalLanguagesChange: (languages: string[]) => void;
  onTagIdsChange: (ids: string[]) => void;
  onSaveMetadata: () => Promise<void>;
  onThumbnailSelected: (file: File | null) => void;
  overlay?: ReactNode;
  viewerCount: number;
  onRuntimeChange: (runtime: BroadcasterRuntime) => void;
  onChatOpen: () => void;
  activeView: boolean;
}) {
  const zh = t.title !== "Stream MVP";
  const [phase, setPhase] = useState<QuickLivePhase>("idle");
  const [connectionHealth, setConnectionHealth] =
    useState<BroadcastConnectionHealth>("ready");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [microphoneId, setMicrophoneId] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>("user");
  const [cameraSwitching, setCameraSwitching] = useState(false);
  const [backgroundNotice, setBackgroundNotice] = useState("");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState("");
  const [endConfirmationOpen, setEndConfirmationOpen] = useState(false);
  const [liveStartedAt, setLiveStartedAt] = useState<number | null>(null);
  const [lastDuration, setLastDuration] = useState("00:00");
  const [peakViewers, setPeakViewers] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<any | null>(null);
  const [clock, setClock] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<WebRtcController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pageHidingRef = useRef(false);
  const controlsTimerRef = useRef(0);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);
  const immersiveBroadcast =
    phase === "connecting" ||
    phase === "live" ||
    phase === "ending" ||
    (phase === "error" && Boolean(sessionIdRef.current));

  useEffect(() => {
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (
      broadcastState === "live" &&
      transport === "browser_webrtc" &&
      controllerRef.current
    ) {
      setPhase("live");
      setConnectionHealth("excellent");
      setLiveStartedAt((current) => current ?? Date.now());
    }
    else if (
      phase === "live" &&
      broadcastState === "connecting" &&
      transport === "browser_webrtc"
    )
      setConnectionHealth("reconnecting");
    else if (phase === "live" && !["live", "connecting"].includes(broadcastState))
      setPhase(stream ? "preview" : "idle");
  }, [broadcastState, transport, phase, stream]);
  useEffect(() => {
    if (!liveStartedAt || phase !== "live") return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [liveStartedAt, phase]);
  useEffect(() => {
    if (!stream?.getAudioTracks()[0]) {
      setMicLevel(0);
      return;
    }
    const context = new AudioContext();
    void context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const measure = () => {
      analyser.getByteFrequencyData(samples);
      setMicLevel(Math.min(100, Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)));
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [stream]);
  useEffect(
    () => () => {
      controllerRef.current?.close();
      stopMediaStream(streamRef.current);
      const sessionId = sessionIdRef.current;
      const csrf = csrfToken();
      if (sessionId && csrf && !pageHidingRef.current)
        void fetch(`/api/streamer/rooms/${slug}/webrtc/publish/${sessionId}`, {
          method: "DELETE",
          credentials: "include",
          keepalive: true,
          headers: { "x-csrf-token": csrf },
        });
    },
    [slug],
  );
  useEffect(() => {
    const protectActiveBroadcast = (event: BeforeUnloadEvent) => {
      if (!sessionIdRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectActiveBroadcast);
    return () => window.removeEventListener("beforeunload", protectActiveBroadcast);
  }, []);
  useEffect(() => {
    const markInterrupted = () => {
      const sessionId = sessionIdRef.current;
      const csrf = csrfToken();
      if (!sessionId || !csrf) return;
      pageHidingRef.current = true;
      void fetch(`/api/streamer/rooms/${slug}/webrtc/publish/${sessionId}/interruption`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ reason: "page_hidden" }),
      });
    };
    const restorePage = () => {
      pageHidingRef.current = false;
    };
    const handleVisibility = () => {
      if (!sessionIdRef.current) return;
      if (document.hidden) {
        markInterrupted();
        setBackgroundNotice(
          zh
            ? "请保持 Holiwyn 在前台。手机可能会暂停相机和直播。"
            : "Keep Holiwyn in the foreground. Your phone may pause the camera and broadcast.",
        );
        return;
      }
      pageHidingRef.current = false;
      void requestWakeLock();
      if (controllerRef.current?.peer.connectionState === "connected") {
        setPhase("live");
        setConnectionHealth("excellent");
        window.setTimeout(() => setBackgroundNotice(""), 4_000);
      } else {
        setPhase("error");
        setConnectionHealth("reconnecting");
        setBackgroundNotice(
          zh
            ? "直播已中断。点击恢复直播以重新连接观众。"
            : "Your broadcast was interrupted. Tap Resume Live to reconnect viewers.",
        );
      }
    };
    window.addEventListener("pagehide", markInterrupted);
    window.addEventListener("pageshow", restorePage);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", markInterrupted);
      window.removeEventListener("pageshow", restorePage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [slug, zh]);
  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      void request(
        `/api/streamer/rooms/${slug}/webrtc/publish/${sessionId}`,
        { method: "PATCH" },
      ).catch(() => {
        setPhase("error");
        setConnectionHealth("reconnecting");
        setError(
          zh
            ? "直播会话已失去联系。点击恢复直播以重新连接。"
            : "The broadcast session lost contact. Tap Resume Live to reconnect.",
        );
      });
    }, 15_000);
    return () => window.clearInterval(heartbeat);
  }, [slug, zh]);
  useEffect(() => {
    if (phase !== "live") {
      window.clearTimeout(controlsTimerRef.current);
      setControlsVisible(true);
      return;
    }
    void requestWakeLock();
    showBroadcastControls();
    return () => {
      window.clearTimeout(controlsTimerRef.current);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [phase]);
  useEffect(() => {
    if (!immersiveBroadcast || !activeView) return;
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    const root = document.documentElement;
    const body = document.body;
    let locked = false;
    let previousScrollY = 0;
    const lockScroll = () => {
      if (locked) return;
      previousScrollY = window.scrollY;
      root.classList.add("mobile-broadcast-scroll-locked");
      body.classList.add("mobile-broadcast-scroll-locked");
      window.scrollTo(0, 0);
      locked = true;
    };
    const unlockScroll = () => {
      if (!locked) return;
      root.classList.remove("mobile-broadcast-scroll-locked");
      body.classList.remove("mobile-broadcast-scroll-locked");
      window.scrollTo(0, previousScrollY);
      locked = false;
    };
    const syncScrollLock = () => {
      if (mobileViewport.matches) lockScroll();
      else unlockScroll();
    };
    syncScrollLock();
    mobileViewport.addEventListener("change", syncScrollLock);
    return () => {
      mobileViewport.removeEventListener("change", syncScrollLock);
      unlockScroll();
    };
  }, [activeView, immersiveBroadcast]);

  async function requestWakeLock() {
    if (document.hidden || wakeLockRef.current) return;
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> };
    }).wakeLock;
    if (!wakeLock) return;
    try {
      wakeLockRef.current = await wakeLock.request("screen");
    } catch {
      // Wake lock is a progressive enhancement; the broadcast must continue without it.
    }
  }

  function showBroadcastControls() {
    setControlsVisible(true);
    window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 5_000);
  }

  function enterMobileFullscreen() {
    if (!window.matchMedia("(max-width: 767px)").matches || document.fullscreenElement)
      return;
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  async function enableDevices(nextCamera = cameraId, nextMicrophone = microphoneId) {
    setPhase("requesting");
    setConnectionHealth("connecting");
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new DOMException("Media devices are unavailable", "NotSupportedError");
      const next = await navigator.mediaDevices.getUserMedia({
        video: nextCamera
          ? { deviceId: { exact: nextCamera } }
          : { facingMode: "user" },
        audio: nextMicrophone ? { deviceId: { exact: nextMicrophone } } : true,
      });
      stopMediaStream(streamRef.current);
      setStream(next);
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(availableDevices);
      const videoSettings = next.getVideoTracks()[0]?.getSettings();
      setCameraId(videoSettings?.deviceId ?? nextCamera);
      if (["user", "environment"].includes(videoSettings?.facingMode ?? ""))
        setCameraFacingMode(videoSettings?.facingMode as CameraFacingMode);
      setMicrophoneId(next.getAudioTracks()[0]?.getSettings().deviceId ?? nextMicrophone);
      setCameraEnabled(true);
      setMicrophoneEnabled(true);
      setPhase("preview");
      setConnectionHealth("ready");
    } catch (caught) {
      setPhase("error");
      setConnectionHealth("unavailable");
      setError(
        (caught as DOMException).name === "NotAllowedError"
          ? zh
            ? "相机或麦克风权限被拒绝。请在浏览器地址栏中允许后重试。"
            : "Camera or microphone permission was denied. Allow it in the browser address bar and try again."
          : zh
            ? "无法打开相机或麦克风。请检查设备是否被其他程序占用。"
            : "The camera or microphone could not be opened. Check whether another application is using it.",
      );
    }
  }
  async function replaceInputDevice(
    kind: "video" | "audio",
    deviceId: string,
  ) {
    if (!deviceId) return;
    if (kind === "video") {
      await replaceCameraTrack({ deviceId: { exact: deviceId } });
      return;
    }
    const currentStream = streamRef.current;
    if (!currentStream) return;
    setError("");
    try {
      const replacement = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { deviceId: { exact: deviceId } },
      });
      const nextTrack = replacement.getAudioTracks()[0];
      if (!nextTrack) throw new Error("replacement_track_unavailable");
      const oldTrack = currentStream.getAudioTracks()[0];
      if (controllerRef.current)
        await replacePublishedTrack(controllerRef.current, nextTrack);
      const nextTracks = currentStream
        .getTracks()
        .filter((track) => track.kind !== "audio")
        .concat(nextTrack);
      oldTrack?.stop();
      setStream(new MediaStream(nextTracks));
      setMicrophoneId(deviceId);
      setMicrophoneEnabled(true);
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch {
      setError(
        zh
          ? "麦克风切换失败。当前设备保持不变。"
          : "Microphone switching failed. The current device remains active.",
      );
    }
  }

  async function replaceCameraTrack(
    constraints: MediaTrackConstraints,
    requestedFacingMode?: CameraFacingMode,
    reportFailure = true,
  ) {
    const currentStream = streamRef.current;
    if (!currentStream || cameraSwitching) return false;
    setCameraSwitching(true);
    setError("");
    let replacement: MediaStream | null = null;
    const oldTrack = currentStream.getVideoTracks()[0];
    const oldSettings = oldTrack?.getSettings();
    let releasedOldTrack = false;
    try {
      try {
        replacement = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: false,
        });
      } catch (firstError) {
        if (!requestedFacingMode || oldTrack?.readyState !== "live") throw firstError;
        // Some mobile browsers cannot open the other physical camera while the first is held.
        oldTrack.stop();
        releasedOldTrack = true;
        replacement = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: false,
        });
      }
      const nextTrack = replacement.getVideoTracks()[0];
      if (!nextTrack) throw new Error("replacement_track_unavailable");
      if (controllerRef.current)
        await replacePublishedTrack(controllerRef.current, nextTrack);
      const nextStream = new MediaStream(
        currentStream.getTracks().filter((track) => track.kind !== "video").concat(nextTrack),
      );
      oldTrack?.stop();
      streamRef.current = nextStream;
      setStream(nextStream);
      const settings = nextTrack.getSettings();
      setCameraId(settings.deviceId ?? "");
      const facing = settings.facingMode;
      if (facing === "user" || facing === "environment")
        setCameraFacingMode(facing);
      else if (requestedFacingMode)
        setCameraFacingMode(requestedFacingMode);
      setCameraEnabled(true);
      setDevices(await navigator.mediaDevices.enumerateDevices());
      return true;
    } catch {
      replacement?.getTracks().forEach((track) => track.stop());
      if (releasedOldTrack) {
        try {
          const restoreConstraints: boolean | MediaTrackConstraints = oldSettings?.deviceId
            ? { deviceId: { exact: oldSettings.deviceId } }
            : oldSettings?.facingMode
              ? { facingMode: oldSettings.facingMode }
              : true;
          const restored = await navigator.mediaDevices.getUserMedia({
            video: restoreConstraints,
            audio: false,
          });
          const restoredTrack = restored.getVideoTracks()[0];
          if (restoredTrack) {
            if (controllerRef.current)
              await replacePublishedTrack(controllerRef.current, restoredTrack);
            const restoredStream = new MediaStream(
              currentStream
                .getTracks()
                .filter((track) => track.kind !== "video")
                .concat(restoredTrack),
            );
            streamRef.current = restoredStream;
            setStream(restoredStream);
          }
        } catch {
          setCameraEnabled(false);
        }
      }
      if (reportFailure)
        setError(
          zh
            ? "无法切换相机。请确认手机具有可用的前置和后置相机。"
            : "Camera switching failed. Confirm that this phone exposes usable front and rear cameras.",
        );
      return false;
    } finally {
      setCameraSwitching(false);
    }
  }

  async function switchCamera() {
    if (cameraSwitching) return;
    const targetFacingMode: CameraFacingMode =
      cameraFacingMode === "user" ? "environment" : "user";
    if (
      await replaceCameraTrack(
        { facingMode: { exact: targetFacingMode } },
        targetFacingMode,
        false,
      )
    )
      return;
    const cameras = devices.filter((device) => device.kind === "videoinput");
    if (cameras.length < 2) {
      setError(
        zh
          ? "此浏览器只提供了一个可用相机。"
          : "This browser exposes only one usable camera.",
      );
      return;
    }
    const currentIndex = cameras.findIndex((device) => device.deviceId === cameraId);
    const next = cameras[(currentIndex + 1 + cameras.length) % cameras.length];
    if (next)
      await replaceCameraTrack(
        { deviceId: { exact: next.deviceId } },
        targetFacingMode,
      );
  }
  async function goLive() {
    if (!stream || !available || !title.trim() || !primaryLanguage) return;
    enterMobileFullscreen();
    pageHidingRef.current = false;
    setBackgroundNotice("");
    setPhase("connecting");
    setConnectionHealth("connecting");
    setError("");
    try {
      await onSaveMetadata();
      const controller = await createWhipPublisher(
        stream,
        async (sdp) => {
          const result = await request(`/api/streamer/rooms/${slug}/webrtc/publish`, {
            method: "POST",
            body: JSON.stringify({ sdp }),
          });
          sessionIdRef.current = result.sessionId;
          return result;
        },
        (state) => {
          if (state === "connected") {
            setPhase("live");
            setConnectionHealth("excellent");
            setLiveStartedAt((current) => current ?? Date.now());
            onChanged();
          } else if (state === "disconnected") {
            setConnectionHealth("reconnecting");
            setBackgroundNotice(
              zh ? "连接暂时中断，正在等待恢复…" : "Connection interrupted. Waiting to recover…",
            );
          } else if (state === "failed") {
            setPhase("error");
            setConnectionHealth("reconnecting");
            setError(
              zh
                ? "直播连接已中断。点击恢复直播以重新连接。"
                : "The broadcast connection was interrupted. Tap Resume Live to reconnect.",
            );
          }
        },
      );
      controllerRef.current = controller;
      sessionIdRef.current = controller.sessionId;
      if (controller.peer.connectionState === "connected") {
        setPhase("live");
        setConnectionHealth("excellent");
        setLiveStartedAt((current) => current ?? Date.now());
      }
      onChanged();
    } catch {
      setPhase("error");
      setConnectionHealth("unavailable");
      setError(
        zh
          ? "无法连接直播服务。相机尚未对观众开放。"
          : "The broadcast service could not connect. Your camera was not made available to viewers.",
      );
    }
  }
  async function resumeBroadcast() {
    const previousSessionId = sessionIdRef.current;
    controllerRef.current?.close();
    controllerRef.current = null;
    sessionIdRef.current = null;
    if (previousSessionId)
      await request(
        `/api/streamer/rooms/${slug}/webrtc/publish/${previousSessionId}/resume`,
        { method: "POST" },
      ).catch(() => undefined);
    setError("");
    setBackgroundNotice(zh ? "正在恢复直播…" : "Restoring your broadcast…");
    if (!streamRef.current?.active) {
      await enableDevices();
      return;
    }
    await goLive();
  }
  async function endBroadcast() {
    setPhase("ending");
    setLastDuration(duration);
    const sessionId = sessionIdRef.current;
    controllerRef.current?.close();
    controllerRef.current = null;
    sessionIdRef.current = null;
    if (sessionId)
      await request(`/api/streamer/rooms/${slug}/webrtc/publish/${sessionId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    stopMediaStream(streamRef.current);
    setStream(null);
    setPhase("ended");
    setConnectionHealth("ready");
    setLiveStartedAt(null);
    setBackgroundNotice("");
    setEndConfirmationOpen(false);
    if (document.fullscreenElement)
      await document.exitFullscreen?.().catch(() => undefined);
    const summaryResult = await request(`/api/streamer/rooms/${slug}/session-summary`).catch(() => null);
    setSessionSummary(summaryResult?.summary ?? null);
    onChanged();
  }
  function toggleCamera() {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }
  function toggleMicrophone() {
    const track = stream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicrophoneEnabled(track.enabled);
  }
  const cameras = devices.filter((device) => device.kind === "videoinput");
  const microphones = devices.filter((device) => device.kind === "audioinput");
  const sessionActive = immersiveBroadcast;
  const durationSeconds = liveStartedAt
    ? Math.max(0, Math.floor((clock - liveStartedAt) / 1_000))
    : 0;
  const duration = `${Math.floor(durationSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(durationSeconds % 60).toString().padStart(2, "0")}`;
  const healthLabel: Record<BroadcastConnectionHealth, string> = {
    ready: stream ? (zh ? "预览就绪" : "Preview ready") : (zh ? "等待设置" : "Ready to set up"),
    connecting: zh ? "正在连接" : "Connecting",
    excellent: zh ? "连接良好" : "Excellent",
    weak: zh ? "连接较弱" : "Weak",
    reconnecting: zh ? "正在重新连接" : "Reconnecting",
    unavailable: zh ? "连接不可用" : "Unavailable",
  };
  useEffect(() => {
    if (phase === "live") setPeakViewers((current) => Math.max(current, viewerCount));
    onRuntimeChange({ phase, health: connectionHealth, duration });
  }, [connectionHealth, duration, onRuntimeChange, phase, viewerCount]);
  const metadataEditor = (
    <>
      <div className="broadcast-setup-heading">
        <div><h4>{zh ? "准备开播" : "Ready to go live"}</h4></div>
      </div>
      <div className="broadcast-metadata-layout">
        <div className="broadcast-metadata-fields">
          <label className="broadcast-title-field">
            {zh ? "直播标题" : "Stream title"}
            <input value={title} maxLength={120} onChange={(event) => onTitleChange(event.target.value)} placeholder={zh ? "告诉观众您正在直播什么" : "Tell viewers what you are streaming"} />
          </label>
          <RoomClassificationFields languages={languageOptions} tags={tagOptions} primaryLanguage={primaryLanguage} additionalLanguages={additionalLanguages} selectedTagIds={tagIds} zh={zh} onPrimaryLanguageChange={onPrimaryLanguageChange} onAdditionalLanguagesChange={onAdditionalLanguagesChange} onTagIdsChange={onTagIdsChange} />
          <label className="stream-thumbnail-picker"><BroadcastIcon name="upload" />{zh ? "选择直播封面" : "Choose stream thumbnail"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onThumbnailSelected(event.target.files?.[0] ?? null)} /></label>
          <button type="button" className="secondary broadcast-metadata-save" disabled={!title.trim() || !primaryLanguage} onClick={() => void onSaveMetadata()}>{zh ? "保存直播信息" : "Save details"}</button>
        </div>
        <aside className="broadcast-audience-preview" aria-label={zh ? "观众卡片预览" : "Audience card preview"}>
          <div className="broadcast-audience-preview-media">{thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <span>HOLIWYN</span>}<b>{zh ? "预览" : "PREVIEW"}</b></div>
          <strong>{title || (zh ? "未命名直播" : "Untitled stream")}</strong>
          <small>{[primaryLanguage, ...additionalLanguages].map((code) => languageOptions.find((item) => item.code === code)?.nameNative ?? code.toUpperCase()).join(" · ")}</small>
        </aside>
      </div>
    </>
  );
  return (
    <section className={`quick-live-panel phase-${phase} ${stream ? "has-media" : "no-media"} camera-facing-${cameraFacingMode} controls-${controlsVisible ? "visible" : "hidden"}`} id="quick-go-live">
      <div className="quick-live-heading">
        <div>
          <p className="eyebrow">{zh ? "快速开播" : "Quick Go Live"}</p>
          <h3>{zh ? "直接使用浏览器开播" : "Broadcast directly from your browser"}</h3>
        </div>
        <span>{phase === "live" ? (zh ? "直播中" : "LIVE") : zh ? "开播预览" : "Broadcast preview"}</span>
      </div>
      <div className="quick-live-video-shell" onPointerDown={phase === "live" ? showBroadcastControls : undefined}>
        {stream ? (
          <video ref={videoRef} className={`quick-live-preview ${cameraFacingMode === "user" ? "is-mirrored" : ""}`} autoPlay muted playsInline />
        ) : (
          <div className="quick-live-empty">
            <strong>{zh ? "相机预览" : "Camera preview"}</strong>
            <p>{zh ? "在下方启用相机和麦克风。" : "Enable camera and microphone below."}</p>
          </div>
        )}
        <div className="broadcast-stage-status" aria-live="polite">
          <span className={`broadcast-health-dot health-${connectionHealth}`} />
          <strong>{healthLabel[connectionHealth]}</strong>
          {phase === "live" ? <><time>{duration}</time><span className="stage-viewers" aria-label={zh ? `${viewerCount} 位观众` : `${viewerCount} viewers`}><BroadcastIcon name="viewers" /> {viewerCount}</span></> : null}
        </div>
        {stream && phase !== "live" ? (
          <div className="broadcast-stage-controls">
            <button type="button" disabled={cameraSwitching} onClick={() => void switchCamera()} aria-label={cameraSwitching ? (zh ? "正在切换相机" : "Switching camera") : zh ? "切换相机" : "Switch camera"}><BroadcastIcon name="flip" /></button>
          </div>
        ) : null}
        {phase === "live" ? overlay : null}
        {backgroundNotice && sessionActive ? <p className="broadcast-background-notice" role="status">{backgroundNotice}</p> : null}
      </div>
      <div className="broadcast-health-layers" aria-label={zh ? "直播传输状态" : "Broadcast delivery health"}>
        <span className={stream ? "ready" : "waiting"}><i /> <b>{zh ? "设备" : "Device"}</b><small>{stream ? (zh ? "相机和麦克风已就绪" : "Camera and microphone ready") : (zh ? "等待权限" : "Waiting for permission")}</small></span>
        <span className={broadcastSource === "local" ? "waiting" : broadcastState === "live" ? "ready" : broadcastState === "connecting" ? "pending" : broadcastState === "unavailable" ? "error" : "waiting"}><i /> <b>{broadcastSource === "local" ? (zh ? "模拟状态" : "Simulation status") : (zh ? "Cloudflare 接收" : "Cloudflare ingest")}</b><small>{broadcastSource === "local" ? (zh ? "未发布媒体" : "No media published") : broadcastState === "live" ? (zh ? "正在接收直播" : "Receiving broadcast") : broadcastState === "connecting" ? (zh ? "正在建立连接" : "Connecting") : broadcastState === "unavailable" ? (zh ? "暂时无法确认" : "Temporarily unconfirmed") : (zh ? "尚未开播" : "Not live yet")}</small></span>
        <span className={broadcastSource === "local" ? "waiting" : broadcastState === "live" ? "ready" : broadcastState === "connecting" ? "pending" : "waiting"}><i /> <b>{zh ? "观众播放" : "Audience playback"}</b><small>{broadcastSource === "local" ? (zh ? "没有观众视频" : "No audience media") : broadcastState === "live" ? (zh ? "播放授权已可用" : "Playback authorization available") : broadcastState === "connecting" ? (zh ? "正在准备播放" : "Preparing playback") : (zh ? "等待直播" : "Waiting for broadcast")}</small></span>
      </div>
      {phase === "ended" ? (
        <div className="broadcast-ended-summary">
          <span className="broadcast-ended-icon" aria-hidden="true">✓</span>
          <h4>{zh ? "直播已结束" : "Stream ended"}</h4>
          <p>{zh ? `时长 ${lastDuration} · 峰值观众 ${peakViewers}` : `Duration ${lastDuration} · Peak viewers ${peakViewers}`}</p>
          {sessionSummary ? <div className="broadcast-ended-metrics">
            <span><small>{zh ? "测试收益" : "Test support"}</small><strong>{Number(sessionSummary.totalSupport ?? 0).toLocaleString()}</strong></span>
            <span><small>{zh ? "支持者" : "Supporters"}</small><strong>{sessionSummary.supporterCount ?? 0}</strong></span>
            <span><small>{zh ? "聊天消息" : "Chat messages"}</small><strong>{sessionSummary.chatMessages ?? 0}</strong></span>
            <span><small>{zh ? "新关注" : "New followers"}</small><strong>{sessionSummary.newFollowers ?? 0}</strong></span>
            <span><small>{zh ? "最佳支持者" : "Top supporter"}</small><strong>{sessionSummary.topSupporter?.sender ?? "—"}</strong></span>
          </div> : null}
          <button type="button" className="creator-primary-action" onClick={() => { setPeakViewers(0); setSessionSummary(null); setPhase("idle"); }}>{zh ? "完成" : "Done"}</button>
        </div>
      ) : stream && !sessionActive ? (
        <>
          {metadataEditor}
          <div className="device-grid">
            <label>
              {zh ? "相机" : "Camera"}
              <select value={cameraId} onChange={(event) => void replaceInputDevice("video", event.target.value)}>
                {cameras.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${zh ? "相机" : "Camera"} ${index + 1}`}</option>)}
              </select>
            </label>
            <label>
              {zh ? "麦克风" : "Microphone"}
              <select value={microphoneId} onChange={(event) => void replaceInputDevice("audio", event.target.value)}>
                {microphones.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${zh ? "麦克风" : "Microphone"} ${index + 1}`}</option>)}
              </select>
            </label>
          </div>
          <div className="broadcast-audio-check">
            <span>{microphoneEnabled ? (zh ? "麦克风已开启" : "Microphone on") : zh ? "麦克风已静音" : "Microphone muted"}</span>
            <div className="microphone-meter" aria-label={zh ? "麦克风音量" : "Microphone level"}>
              <span style={{ width: `${microphoneEnabled ? micLevel : 0}%` }} />
            </div>
          </div>
          <div className="quick-live-controls">
            <button type="button" className={`secondary ${cameraEnabled ? "" : "is-off"}`} onClick={toggleCamera}><BroadcastIcon name="camera" /><span>{cameraEnabled ? (zh ? "关闭相机" : "Camera off") : zh ? "打开相机" : "Camera on"}</span></button>
            <button type="button" className={`secondary ${microphoneEnabled ? "" : "is-off"}`} onClick={toggleMicrophone} aria-pressed={!microphoneEnabled} aria-label={microphoneEnabled ? (zh ? "麦克风已开启，点击静音" : "Microphone on, tap to mute") : zh ? "麦克风已静音，点击取消静音" : "Microphone muted, tap to unmute"}><BroadcastIcon name="microphone" /><span>{microphoneEnabled ? (zh ? "静音" : "Mute") : zh ? "取消静音" : "Unmute"}</span></button>
            <button type="button" className="creator-primary-action" onClick={() => void goLive()} disabled={!available || phase !== "preview" || !title.trim() || !primaryLanguage}><span className="go-live-dot" aria-hidden="true" />{zh ? "开始直播" : "Go Live"}</button>
          </div>
        </>
      ) : stream && sessionActive ? (
        <div className="broadcast-live-console">
          <div className="broadcast-live-metrics">
            <span><small>{zh ? "直播时长" : "Duration"}</small><strong>{duration}</strong></span>
            <span><small>{zh ? "连接" : "Connection"}</small><strong>{healthLabel[connectionHealth]}</strong></span>
            <span><small>{zh ? "麦克风" : "Microphone"}</small><strong>{microphoneEnabled ? (zh ? "开启" : "On") : zh ? "静音" : "Muted"}</strong></span>
          </div>
          {phase === "error" ? (
            <button type="button" className="broadcast-resume-button" onClick={() => void resumeBroadcast()}>
              {zh ? "恢复直播" : "Resume Live"}
            </button>
          ) : null}
          <div className="quick-live-controls live-controls">
            <button type="button" className={`secondary ${microphoneEnabled ? "" : "is-off"}`} onClick={toggleMicrophone}><BroadcastIcon name="microphone" /><span>{microphoneEnabled ? (zh ? "静音" : "Mute") : zh ? "取消静音" : "Unmute"}</span></button>
            <button type="button" className={`secondary ${cameraEnabled ? "" : "is-off"}`} onClick={toggleCamera}><BroadcastIcon name="camera" /><span>{cameraEnabled ? (zh ? "关闭相机" : "Camera off") : zh ? "打开相机" : "Camera on"}</span></button>
            <button type="button" className="secondary" disabled={cameraSwitching} onClick={() => void switchCamera()}><BroadcastIcon name="flip" /><span>{cameraSwitching ? (zh ? "切换中…" : "Switching…") : zh ? "切换相机" : "Flip"}</span></button>
            <button type="button" className="secondary mobile-chat-trigger" onClick={onChatOpen}><BroadcastIcon name="chat" /><span>{zh ? "聊天" : "Chat"}</span></button>
            <button type="button" className="danger" onClick={() => setEndConfirmationOpen(true)} aria-label={zh ? "结束直播" : "End stream"} title={zh ? "结束直播" : "End stream"}><BroadcastIcon name="stop" /><span>{zh ? "结束直播" : "End stream"}</span></button>
          </div>
        </div>
      ) : (
        <>
          {metadataEditor}
          <div className="broadcast-permission-step">
            <h4>{zh ? "相机和麦克风" : "Camera and microphone"}</h4>
            <button type="button" className="creator-primary-action" onClick={() => void enableDevices()} disabled={phase === "requesting"}>{phase === "requesting" ? (zh ? "正在请求权限…" : "Requesting permission…") : phase === "error" ? (zh ? "重试相机和麦克风" : "Try camera and microphone again") : zh ? "允许相机和麦克风" : "Allow camera and microphone"}</button>
          </div>
        </>
      )}
      {!available ? <p className="control-note">{zh ? "此本地环境可测试预览，但未连接浏览器直播服务。" : "This local environment can test preview, but browser broadcasting is not connected."}</p> : null}
      {error ? <p className="quick-live-error" role="alert">{error}</p> : null}
      <Modal
        open={endConfirmationOpen}
        title={zh ? "结束直播？" : "End live stream?"}
        description={zh ? "您的直播将对所有观众停止。" : "Your broadcast will stop for every viewer."}
        closeLabel={zh ? "关闭结束直播确认" : "Close end-live confirmation"}
        onClose={() => setEndConfirmationOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setEndConfirmationOpen(false)}>{zh ? "取消" : "Cancel"}</button>
            <button type="button" className="danger" onClick={() => void endBroadcast()}>{zh ? "结束直播" : "End stream"}</button>
          </>
        }
      >
        <p>{zh ? "结束后，相机和麦克风将立即关闭。" : "Your camera and microphone will turn off immediately after ending."}</p>
      </Modal>
    </section>
  );
}

function WhepPlayer({ slug, active, t }: { slug: string; active: boolean; t: typeof copy.en }) {
  const zh = t.title !== "Stream MVP";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<WebRtcController | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "playing" | "error">("idle");
  useEffect(() => {
    if (!active) {
      setState("idle");
      return;
    }
    let cancelled = false;
    let sessionId: string | null = null;
    const heartbeat = window.setInterval(() => {
      if (!sessionId) return;
      void request(`/api/rooms/${slug}/webrtc/play/${sessionId}`, {
        method: "PATCH",
      }).catch(() => setState("error"));
    }, 60_000);
    setState("connecting");
    void createWhepPlayer(
      async (sdp) => {
        const result = await request(`/api/rooms/${slug}/webrtc/play`, {
          method: "POST",
          body: JSON.stringify({ sdp }),
        });
        sessionId = result.sessionId;
        return result;
      },
      (stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      },
      (connection) => {
        if (!cancelled && connection === "connected") setState("playing");
        if (!cancelled && (connection === "failed" || connection === "disconnected")) setState("error");
      },
    ).then((controller) => {
      if (cancelled) {
        controller.close();
        return;
      }
      controllerRef.current = controller;
      sessionId = controller.sessionId;
    }).catch(() => {
      if (!cancelled) setState("error");
      const csrf = csrfToken();
      if (sessionId && csrf)
        void fetch(`/api/rooms/${slug}/webrtc/play/${sessionId}`, {
          method: "DELETE",
          credentials: "include",
          keepalive: true,
          headers: { "x-csrf-token": csrf },
        });
    });
    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      controllerRef.current?.close();
      controllerRef.current = null;
      const csrf = csrfToken();
      if (sessionId && csrf)
        void fetch(`/api/rooms/${slug}/webrtc/play/${sessionId}`, { method: "DELETE", credentials: "include", keepalive: true, headers: { "x-csrf-token": csrf } });
    };
  }, [slug, active]);
  return (
    <div className="whep-player-shell">
      <video ref={videoRef} className="player" autoPlay playsInline controls />
      {state !== "playing" ? <div className="whep-status">{state === "error" ? (zh ? "直播连接暂时不可用。" : "Live connection is temporarily unavailable.") : zh ? "正在连接实时画面…" : "Connecting to the live feed…"}</div> : null}
    </div>
  );
}

function CreatorBroadcastPreview({
  slug,
  state,
  transport,
  configured,
  t,
}: {
  slug: string;
  state: "live" | "connecting" | "offline" | "unavailable";
  transport?: "obs_hls" | "browser_webrtc";
  configured: boolean;
  t: typeof copy.en;
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const zh = t.title !== "Stream MVP";
  useEffect(() => {
    setIframeUrl(null);
    setPreviewUnavailable(false);
    if (state !== "live" || !configured || transport === "browser_webrtc") return;
    let active = true;
    void request(`/api/rooms/${slug}/playback`)
      .then((result) => {
        if (active) setIframeUrl(result.iframeUrl);
      })
      .catch(() => {
        if (active) setPreviewUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [slug, state, configured, transport]);

  return (
    <section className={`creator-preview state-${state}`}>
      <div className="creator-preview-toolbar">
        <div>
          <span className={`broadcast-dot state-${state}`} />
          <strong>{zh ? "您的观众画面" : "Your audience feed"}</strong>
        </div>
        <span>{zh ? "安全延迟预览" : "Secure delayed preview"}</span>
      </div>
      {state === "live" && transport === "browser_webrtc" ? (
        <WhepPlayer slug={slug} active t={t} />
      ) : state === "live" && iframeUrl ? (
        <iframe
          src={iframeUrl}
          title={zh ? "主播实时观众画面" : "Creator live audience feed"}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="creator-preview-placeholder">
          <div className="preview-orbit" aria-hidden="true">
            <span>●</span>
          </div>
          <strong>
            {state === "connecting"
              ? zh
                ? "正在准备您的直播画面"
                : "Preparing your live feed"
              : state === "unavailable" || previewUnavailable
                ? zh
                  ? "暂时无法确认预览"
                  : "Preview is temporarily unavailable"
                : state === "live"
                  ? zh
                    ? "直播已连接，正在加载预览"
                    : "Broadcast connected—loading preview"
                  : zh
                    ? "开播后，您的观众画面会显示在这里"
                    : "Your audience feed will appear here when you go live"}
          </strong>
          <p>
            {state === "offline"
              ? zh
                ? "使用上方快速开播，或在技术帮助中选择 OBS。"
                : "Use Quick Go Live above, or choose OBS in Technical help."
              : state === "connecting"
                ? zh
                  ? "Cloudflare 正在准备安全播放，通常需要片刻。"
                  : "Cloudflare is preparing secure playback. This usually takes a moment."
                : zh
                  ? "预览不会显示推流密钥或基础设施信息。"
                  : "The preview never exposes stream keys or infrastructure details."}
          </p>
        </div>
      )}
    </section>
  );
}

function CreatorSessionSummary({
  slug,
  state,
  t,
}: {
  slug: string;
  state: string;
  t: typeof copy.en;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const zh = t.title !== "Stream MVP";
  useEffect(() => {
    void request(`/api/streamer/rooms/${slug}/session-summary`)
      .then((result) => setSummary(result.summary))
      .catch(() => setSummary(null));
  }, [slug, state]);
  useEffect(() => {
    if (summary?.status !== "live") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [summary?.status]);
  if (!summary) return null;
  const durationSeconds =
    summary.status === "live"
      ? Math.max(
          0,
          Math.round((now - new Date(summary.startedAt).getTime()) / 1000),
        )
      : summary.durationSeconds;
  const duration = `${Math.floor(durationSeconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((durationSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(durationSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
  return (
    <section className="creator-session-summary">
      <div className="session-summary-heading">
        <div>
          <p className="eyebrow">
            {summary.status === "live"
              ? zh
                ? "本场直播"
                : "Current session"
              : zh
                ? "最近一场直播"
                : "Latest session"}
          </p>
          <h3>
            {summary.status === "live"
              ? zh
                ? "直播进行中"
                : "Session in progress"
              : zh
                ? "直播总结"
                : "Session summary"}
          </h3>
        </div>
        <span>
          {new Date(summary.startedAt).toLocaleString(zh ? "zh-CN" : "en-US")}
        </span>
      </div>
      <div className="session-summary-metrics">
        <div>
          <span>{zh ? "直播时长" : "Duration"}</span>
          <strong>{duration}</strong>
        </div>
        <div>
          <span>{zh ? "支持总额" : "Total support"}</span>
          <strong>
            {summary.totalSupport} <small>{t.coins}</small>
          </strong>
        </div>
        <div>
          <span>{zh ? "礼物" : "Gifts"}</span>
          <strong>{summary.giftTotal}</strong>
        </div>
        <div>
          <span>{zh ? "互动动作" : "Actions"}</span>
          <strong>{summary.actionCount}</strong>
        </div>
        <div>
          <span>{zh ? "最佳支持者" : "Top supporter"}</span>
          <strong>
            {summary.topSupporter?.sender ?? (zh ? "暂无" : "None yet")}
          </strong>
        </div>
      </div>
    </section>
  );
}

function CreatorEarningsWallet({
  slug,
  state,
  t,
}: {
  slug: string;
  state: string;
  t: typeof copy.en;
}) {
  const [period, setPeriod] = useState<"session" | "7d" | "30d" | "lifetime">("session");
  const [type, setType] = useState<"all" | "gift" | "action" | "private_show">("all");
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const zh = t.title !== "Stream MVP";
  const refreshWallet = useCallback((cursorToUse: string | null = null, append = false) => {
    setLoading(true);
    setError("");
    const cursor = append && cursorToUse ? `&cursor=${encodeURIComponent(cursorToUse)}` : "";
    void Promise.all([
      request(`/api/streamer/wallet/summary?period=${period}`),
      request(`/api/streamer/wallet/transactions?period=${period}&type=${type}&limit=12${cursor}`),
    ])
      .then(([summaryResult, transactionResult]) => {
        setSummary(summaryResult);
        setTransactions((current) => append ? [...current, ...(transactionResult.transactions ?? [])] : (transactionResult.transactions ?? []));
        setNextCursor(transactionResult.nextCursor ?? null);
      })
      .catch(() => {
        if (!append) {
          setSummary(null);
          setTransactions([]);
          setNextCursor(null);
        }
        setError(zh ? "暂时无法确认钱包数据，请稍后重试。" : "Wallet data could not be confirmed. Please try again shortly.");
      })
      .finally(() => setLoading(false));
  }, [period, type, zh]);
  useEffect(() => {
    refreshWallet();
    const socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket.emit("room:join", slug));
    socket.on("gift:sent", () => refreshWallet());
    socket.on("action:purchased", () => refreshWallet());
    return () => {
      socket.disconnect();
    };
  }, [refreshWallet, slug]);
  const periods = [
    ["session", zh ? "本场" : "Session"],
    ["7d", zh ? "7 天" : "7 days"],
    ["30d", zh ? "30 天" : "30 days"],
    ["lifetime", zh ? "全部" : "Lifetime"],
  ] as const;
  const types = [
    ["all", zh ? "全部" : "All"],
    ["gift", zh ? "礼物" : "Gifts"],
    ["action", zh ? "互动" : "Actions"],
    ["private_show", zh ? "私密直播" : "Private"],
  ] as const;
  return (
    <div className="creator-wallet-workspace">
      <section className="creator-wallet-balance">
        <div>
          <h3>{zh ? "R 余额" : "R balance"}</h3>
          <strong>{summary ? Number(summary.availableBalance).toLocaleString() : "—"}</strong>
          <span>{t.coins}</span>
        </div>
      </section>
      <section className="creator-earnings-overview">
        <div className="creator-earnings-heading">
          <h3>{zh ? "收入" : "Income"}</h3>
          <button type="button" className="secondary" onClick={() => refreshWallet()} disabled={loading}>{loading ? (zh ? "加载中…" : "Loading…") : (zh ? "刷新" : "Refresh")}</button>
        </div>
        <div className="creator-period-tabs" aria-label={zh ? "收益周期" : "Earnings period"}>{periods.map(([value, label]) => <button type="button" key={value} className={period === value ? "active" : ""} onClick={() => { setNextCursor(null); setTransactions([]); setPeriod(value); }}>{label}</button>)}</div>
        <div className="creator-earnings-cards">
          <article><span>{zh ? "所选周期收入" : "Selected-period income"}</span><strong>{summary ? Number(summary.periodIncome).toLocaleString() : "—"}</strong><small>{t.coins}</small></article>
          <article><span>{zh ? "累计测试收入" : "Lifetime test income"}</span><strong>{summary ? Number(summary.lifetimeIncome).toLocaleString() : "—"}</strong><small>{t.coins}</small></article>
          <article><span>{zh ? "礼物收入" : "Gift income"}</span><strong>{summary ? Number(summary.breakdown.gift).toLocaleString() : "—"}</strong><small>{t.coins}</small></article>
          <article><span>{zh ? "互动收入" : "Action income"}</span><strong>{summary ? Number(summary.breakdown.action).toLocaleString() : "—"}</strong><small>{t.coins}</small></article>
          <article><span>{zh ? "私密直播" : "Private show"}</span><strong>{summary ? Number(summary.breakdown.privateShow).toLocaleString() : "—"}</strong><small>{t.coins}</small></article>
        </div>
      </section>
      <section className="creator-wallet-history creator-wallet-transactions">
        <div className="creator-earnings-heading"><h3>{zh ? "交易记录" : "Transactions"}</h3><span>{summary ? `${summary.transactionCount} ${zh ? "笔" : "transactions"}` : ""}</span></div>
        <div className="creator-period-tabs creator-transaction-filters" aria-label={zh ? "交易类型" : "Transaction type"}>{types.map(([value, label]) => <button type="button" key={value} className={type === value ? "active" : ""} onClick={() => { setNextCursor(null); setTransactions([]); setType(value); }}>{label}</button>)}</div>
        {transactions.length ? transactions.map((entry) => (
          <div className="creator-wallet-entry creator-wallet-entry-detailed" key={entry.id}>
            <span className={`creator-transaction-icon transaction-${entry.type}`}>{entry.type === "gift" ? "✦" : entry.type === "action" ? "⚡" : "◆"}</span>
            <span><strong>{entry.supporter}</strong><small>{zh ? entry.label.zh : entry.label.en}{entry.quantity > 1 ? ` ×${entry.quantity}` : ""} · {entry.room?.title ?? "Holiwyn"}</small></span>
            <time>{new Date(entry.createdAt).toLocaleString(zh ? "zh-CN" : "en-US")}</time>
            <strong>+{Number(entry.amount).toLocaleString()} <small>{t.coins}</small></strong>
          </div>
        )) : !loading && !error ? <div className="creator-wallet-empty"><strong>{zh ? "此周期暂无收入" : "No income in this period"}</strong><p>{zh ? "更换周期或收入类型查看其他记录。" : "Try another period or transaction type."}</p></div> : null}
        {nextCursor ? <button type="button" className="secondary creator-load-more" onClick={() => refreshWallet(nextCursor, true)} disabled={loading}>{zh ? "加载更多" : "Load more"}</button> : null}
      </section>
      {error ? <div className="creator-data-unavailable" role="alert"><strong>{zh ? "数据暂时不可用" : "Data temporarily unavailable"}</strong><p>{error}</p><button type="button" className="secondary" onClick={() => refreshWallet()}>{zh ? "重试" : "Try again"}</button></div> : null}
      <CreatorSessionSummary slug={slug} state={state} t={t} />
    </div>
  );
}

function CreatorSupportersPage({ slug, t }: { slug: string; t: typeof copy.en }) {
  const zh = t.title !== "Stream MVP";
  const [period, setPeriod] = useState<"session" | "7d" | "30d" | "lifetime">("session");
  const [kind, setKind] = useState<"all" | "gift">("all");
  const [supporters, setSupporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    void request(`/api/streamer/rooms/${slug}/supporters?period=${period}&kind=${kind}`)
      .then((result) => setSupporters(result.supporters ?? []))
      .catch(() => { setSupporters([]); setError(zh ? "暂时无法确认支持者排行。" : "Supporter ranking could not be confirmed."); })
      .finally(() => setLoading(false));
  }, [kind, period, slug, zh]);
  useEffect(() => {
    refresh();
    const socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket.emit("room:join", slug));
    socket.on("gift:sent", refresh);
    socket.on("action:purchased", refresh);
    return () => {
      socket.disconnect();
    };
  }, [refresh, slug]);
  const periods = [["session", zh ? "本场" : "Session"], ["7d", zh ? "7 天" : "7 days"], ["30d", zh ? "30 天" : "30 days"], ["lifetime", zh ? "全部" : "Lifetime"]] as const;
  return <section className="creator-supporters-workspace">
    <div className="creator-supporter-toolbar">
      <div className="creator-period-tabs">{periods.map(([value, label]) => <button type="button" key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div>
      <div className="creator-period-tabs"><button type="button" className={kind === "all" ? "active" : ""} onClick={() => setKind("all")}>{zh ? "全部支持" : "All support"}</button><button type="button" className={kind === "gift" ? "active" : ""} onClick={() => setKind("gift")}>{zh ? "仅礼物" : "Gifts only"}</button></div>
    </div>
    {error ? <div className="creator-data-unavailable" role="alert"><strong>{zh ? "排行暂时不可用" : "Ranking temporarily unavailable"}</strong><p>{error}</p><button type="button" className="secondary" onClick={refresh}>{zh ? "重试" : "Try again"}</button></div> : null}
    {!error && supporters.length ? <ol className="creator-supporter-list">{supporters.map((supporter, index) => <li key={`${supporter.displayName}-${index}`}>
      <span className={`gifter-rank rank-${index + 1}`}>{index + 1}</span><span className="gifter-avatar">{supporter.displayName?.[0]?.toUpperCase() ?? "?"}</span>
      <span className="creator-supporter-identity"><strong>{supporter.displayName}</strong><small>{supporter.supportCount} {zh ? "次支持" : "support events"} · {zh ? "最近" : "latest"} {new Date(supporter.lastSupportedAt).toLocaleDateString(zh ? "zh-CN" : "en-US")}</small></span>
      <span className="creator-supporter-breakdown"><small>{zh ? "礼物" : "Gifts"} {Number(supporter.giftTotal).toLocaleString()} · {zh ? "互动" : "Actions"} {Number(supporter.actionTotal).toLocaleString()} · {zh ? "私密" : "Private"} {Number(supporter.privateShowTotal).toLocaleString()}</small><strong>{Number(supporter.totalSupport).toLocaleString()} {t.coins}</strong></span>
    </li>)}</ol> : null}
    {!loading && !error && !supporters.length ? <div className="creator-wallet-empty"><strong>{zh ? "此周期暂无支持者" : "No supporters in this period"}</strong><p>{zh ? "收到礼物、互动购买或私密直播访问后，排行会显示在这里。" : "Gift, action, and private-show support will appear here."}</p></div> : null}
    {loading ? <p className="muted">{zh ? "正在加载支持者…" : "Loading supporters…"}</p> : null}
  </section>;
}

type CreatorFollower = {
  id: string;
  handle: string;
  displayName: string;
  followedAt: string;
  status: "following";
};

function CreatorFollowersPage({ slug, t }: { slug: string; t: typeof copy.en }) {
  const zh = t.title !== "Stream MVP";
  const [followers, setFollowers] = useState<CreatorFollower[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback((cursor?: string, append = false) => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ limit: "20" });
    if (cursor) query.set("cursor", cursor);
    void request(`/api/streamer/rooms/${slug}/followers?${query}`)
      .then((result) => {
        setFollowers((current) => append ? [...current, ...(result.followers ?? [])] : (result.followers ?? []));
        setTotalCount(Number(result.totalCount ?? 0));
        setNextCursor(result.nextCursor ?? null);
      })
      .catch(() => {
        if (!append) setFollowers([]);
        setError(zh ? "暂时无法加载关注者。" : "Followers could not be loaded right now.");
      })
      .finally(() => setLoading(false));
  }, [slug, zh]);
  useEffect(() => {
    refresh();
    const socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket.emit("discovery:join"));
    socket.on("follow:changed", (event: { slug?: string }) => {
      if (event.slug === slug) refresh();
    });
    return () => {
      socket.disconnect();
    };
  }, [refresh, slug]);
  return (
    <section className="creator-followers-workspace" aria-busy={loading}>
      <header className="creator-followers-heading">
        <div><p className="eyebrow">{zh ? "观众留存" : "Audience retention"}</p><h3>{zh ? "关注者" : "Followers"}</h3></div>
        <strong>{totalCount.toLocaleString()} <small>{zh ? "位关注者" : totalCount === 1 ? "follower" : "followers"}</small></strong>
      </header>
      <p className="creator-followers-privacy">{zh ? "仅显示公开名称、账户名和关注时间。" : "Only public display names, handles, and follow dates are shown."}</p>
      {error ? <div className="creator-data-unavailable" role="alert"><strong>{zh ? "关注者暂时不可用" : "Followers temporarily unavailable"}</strong><p>{error}</p><button type="button" className="secondary" onClick={() => refresh()}>{zh ? "重试" : "Try again"}</button></div> : null}
      {!error && followers.length ? <ul className="creator-follower-list">{followers.map((follower) => (
        <li key={follower.id}>
          <CreatorAvatar name={follower.displayName} className="creator-follower-avatar" />
          <span className="creator-follower-identity"><strong>{follower.displayName}</strong><small>@{follower.handle}</small></span>
          <span className="creator-follower-date"><small>{zh ? "关注时间" : "Followed"}</small><time dateTime={follower.followedAt}>{new Date(follower.followedAt).toLocaleDateString(zh ? "zh-CN" : "en-US")}</time></span>
          <span className="creator-follower-status"><i />{zh ? "正在关注" : "Following"}</span>
        </li>
      ))}</ul> : null}
      {!loading && !error && !followers.length ? <div className="creator-wallet-empty"><strong>{zh ? "还没有关注者" : "No followers yet"}</strong><p>{zh ? "观众关注您后会安全地显示在这里。" : "Audience members who follow you will appear here."}</p></div> : null}
      {loading ? <p className="muted creator-followers-loading">{zh ? "正在加载关注者…" : "Loading followers…"}</p> : null}
      {nextCursor ? <button type="button" className="secondary creator-load-more" onClick={() => refresh(nextCursor, true)} disabled={loading}>{zh ? "加载更多" : "Load more"}</button> : null}
    </section>
  );
}

type StreamerSection = "live" | "earnings" | "supporters" | "followers" | "actions" | "private" | "profile" | "settings";

function StreamerStudio({
  t,
  language,
  onLanguageChange,
  onLogout,
  onDiscover,
}: {
  t: typeof copy.en;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onLogout: () => void;
  onDiscover: () => void;
}) {
  const [studio, setStudio] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [studioLanguages, setStudioLanguages] = useState<LanguageOption[]>([]);
  const [studioTags, setStudioTags] = useState<TagOption[]>([]);
  const [goal, setGoal] = useState("");
  const [goalTarget, setGoalTarget] = useState(500);
  const [bio, setBio] = useState("");
  const [schedule, setSchedule] = useState("");
  const [nextStreamAt, setNextStreamAt] = useState("");
  const [scheduleTimezone, setScheduleTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [mode, setMode] = useState<"ticket" | "per_minute">("ticket");
  const [ticketCost, setTicketCost] = useState(100);
  const [perMinuteCost, setPerMinuteCost] = useState(10);
  const [activeSection, setActiveSection] = useState<StreamerSection>("live");
  const [viewerCount, setViewerCount] = useState(0);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [discoverConfirmationOpen, setDiscoverConfirmationOpen] = useState(false);
  const [endingForLogout, setEndingForLogout] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarFocusX, setAvatarFocusX] = useState(50);
  const [avatarFocusY, setAvatarFocusY] = useState(50);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [, setThumbnailSaving] = useState(false);
  const accountMenuRef = useRef<HTMLDetailsElement | null>(null);
  const [runtime, setRuntime] = useState<BroadcasterRuntime>({
    phase: "idle",
    health: "ready",
    duration: "00:00",
  });
  const updateRuntime = useCallback((next: BroadcasterRuntime) => setRuntime(next), []);
  const updateViewerCount = useCallback((count: number) => setViewerCount(count), []);
  const closeCreatorMenu = useCallback(() => {
    if (accountMenuRef.current) accountMenuRef.current.open = false;
  }, []);
  const returnToLive = useCallback(() => {
    if (window.history.state?.holiwynStreamerSection && window.history.state.holiwynStreamerSection !== "live") {
      window.history.back();
      return;
    }
    window.history.replaceState(
      { ...window.history.state, holiwynStreamerSection: "live" },
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    setActiveSection("live");
  }, []);
  const openAuxiliarySection = useCallback((section: Exclude<StreamerSection, "live">) => {
    if (activeSection === section) return;
    const nextUrl = `#streamer-${section}`;
    const nextState = { ...window.history.state, holiwynStreamerSection: section };
    if (activeSection !== "live") window.history.replaceState(nextState, "", nextUrl);
    else window.history.pushState(nextState, "", nextUrl);
    setActiveSection(section);
  }, [activeSection]);
  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) closeCreatorMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCreatorMenu();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeCreatorMenu]);
  useEffect(() => () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);
  useEffect(() => () => {
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
  }, [thumbnailPreviewUrl]);
  const refresh = () =>
    void request("/api/streamer/studio").then((d) => {
      setStudio(d);
      setTitle(d.room?.title ?? "");
      setPrimaryLanguage(d.room?.languages?.find((item: RoomLanguage) => item.isPrimary)?.code ?? "en");
      setAdditionalLanguages((d.room?.languages ?? []).filter((item: RoomLanguage) => !item.isPrimary).map((item: RoomLanguage) => item.code));
      setTagIds((d.room?.tags ?? []).map((item: PublicTag) => item.id));
      setGoal(d.room?.goal_text ?? "");
      setGoalTarget(d.room?.goal_target ?? 500);
      setBio(d.room?.bio ?? "");
      setSchedule(d.room?.schedule_text ?? "");
      if (d.room?.next_stream_at) {
        const date = new Date(d.room.next_stream_at);
        setNextStreamAt(
          new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
            .toISOString()
            .slice(0, 16),
        );
      } else setNextStreamAt("");
      setScheduleTimezone(
        d.room?.schedule_timezone ??
          Intl.DateTimeFormat().resolvedOptions().timeZone ??
          "UTC",
      );
      setMode(d.room?.private_show_mode ?? "ticket");
      setTicketCost(d.room?.private_show_ticket_cost ?? 100);
      setPerMinuteCost(d.room?.private_show_per_minute_cost ?? 10);
    });
  useEffect(() => {
    refresh();
    void Promise.all([
      request("/api/discovery/languages"),
      request("/api/discovery/tags?type=PUBLIC"),
    ]).then(([languageResult, publicResult]) => {
      setStudioLanguages((languageResult.languages ?? []).map((item: SupportedLanguage) => ({ code: item.code, nameEn: item.name_en, nameNative: item.name_native })));
      setStudioTags((publicResult.tags ?? []).map((item: any) => ({ id: item.id, slug: item.slug, displayName: item.display_name ?? item.displayName, type: item.tag_type ?? item.type })));
    });
  }, []);
  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, holiwynStreamerSection: "live" },
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    const restoreStudioSection = () => {
      const requestedSection = window.history.state?.holiwynStreamerSection;
      const hashSection = window.location.hash.replace("#streamer-", "");
      const allowedSections: StreamerSection[] = ["live", "earnings", "supporters", "actions", "private", "profile", "settings"];
      const section = allowedSections.includes(requestedSection)
        ? requestedSection
        : allowedSections.includes(hashSection as StreamerSection)
          ? hashSection as StreamerSection
          : "live";
      setActiveSection(section);
    };
    window.addEventListener("popstate", restoreStudioSection);
    window.addEventListener("hashchange", restoreStudioSection);
    return () => {
      window.removeEventListener("popstate", restoreStudioSection);
      window.removeEventListener("hashchange", restoreStudioSection);
    };
  }, []);
  useEffect(() => {
    const slug = studio?.room?.slug;
    if (!slug) return;
    const socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket.emit("room:join", slug));
    socket.on(
      "broadcast:state",
      (event: {
        slug: string;
        state: "live" | "connecting" | "offline" | "unavailable";
        message: string;
        checkedAt: string;
        source?: "local" | "cloudflare";
        transport?: "obs_hls" | "browser_webrtc";
      }) => {
        if (event.slug !== slug) return;
        setStudio((current: any) => ({
          ...current,
          room: {
            ...current.room,
            status: event.state === "live" ? "live" : "offline",
            broadcast_state: event.state,
            broadcast_status_message: event.message,
            broadcast_status_source: event.source,
            broadcast_checked_at: event.checkedAt,
            broadcast_transport:
              event.transport ?? current.room.broadcast_transport,
          },
        }));
      },
    );
    return () => {
      socket.disconnect();
    };
  }, [studio?.room?.slug]);
  async function toggle(active: boolean) {
    const result = await request(
      `/api/streamer/rooms/${studio.room.slug}/private-show`,
      {
        method: "PUT",
        body: JSON.stringify({ active, mode, ticketCost, perMinuteCost }),
      },
    );
    setNotice(result.active ? t.privateOn : t.privateOff);
    refresh();
  }
  async function refreshBroadcast() {
    const result = await request(
      `/api/streamer/rooms/${studio.room.slug}/broadcast/refresh`,
      { method: "POST", body: "{}" },
    );
    setNotice(result.broadcast.message);
    refresh();
  }
  async function setLocalBroadcast(
    state: "live" | "connecting" | "offline" | "unavailable",
  ) {
    const result = await request(
      `/api/streamer/rooms/${studio.room.slug}/broadcast/local-status`,
      { method: "PUT", body: JSON.stringify({ state }) },
    );
    setNotice(result.broadcast.message);
    refresh();
  }
  async function endBroadcastAndLogout() {
    if (!studio?.room?.slug || endingForLogout) return;
    setEndingForLogout(true);
    setNotice("");
    try {
      await request(`/api/streamer/rooms/${studio.room.slug}/broadcast/end`, {
        method: "POST",
        body: "{}",
      });
      setLogoutConfirmationOpen(false);
      onLogout();
    } catch (error) {
      setLogoutConfirmationOpen(false);
      setNotice(
        error instanceof Error && error.message === "409"
          ? zh
            ? "OBS 仍在推流。请先在 OBS 中停止直播，然后刷新状态再退出。"
            : "OBS is still publishing. Stop streaming in OBS, refresh status, then sign out."
          : zh
            ? "无法确认直播已结束，因此没有退出。请重试。"
            : "The broadcast could not be confirmed ended, so you were not signed out. Try again.",
      );
    } finally {
      setEndingForLogout(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    await request(`/api/streamer/rooms/${studio.room.slug}`, {
      method: "PUT",
      body: JSON.stringify({ title, goalText: goal, goalTarget }),
    });
    setNotice(t.metadataSaved);
    refresh();
  }
  async function savePublicPresence(e: FormEvent) {
    e.preventDefault();
    await request(`/api/streamer/rooms/${studio.room.slug}`, {
      method: "PUT",
      body: JSON.stringify({ title, goalText: goal, goalTarget }),
    });
    await request("/api/streamer/profile", {
      method: "PUT",
      body: JSON.stringify({
        bio,
        scheduleText: schedule,
        nextStreamAt: nextStreamAt ? new Date(nextStreamAt).toISOString() : null,
        scheduleTimezone,
      }),
    });
    setNotice(zh ? "公开主页和直播间信息已保存。" : "Public profile and room details saved.");
    refresh();
  }
  function selectAvatar(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice(zh ? "请选择 JPEG、PNG 或 WebP 图片。" : "Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice(zh ? "头像图片不能超过 5 MB。" : "Avatar images must be 5 MB or smaller.");
      return;
    }
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAvatarFocusX(50);
    setAvatarFocusY(50);
  }
  async function uploadAvatar() {
    if (!avatarFile) return;
    setAvatarSaving(true);
    try {
      const form = new FormData();
      form.append("avatar", avatarFile);
      await request(`/api/streamer/avatar?focusX=${avatarFocusX / 100}&focusY=${avatarFocusY / 100}`, { method: "POST", body: form });
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setNotice(zh ? "头像已更新。" : "Avatar updated.");
      refresh();
    } catch (error) {
      setNotice(error instanceof Error && error.message === "413"
        ? (zh ? "图片过大，请选择 5 MB 以下的图片。" : "That image is too large. Choose an image under 5 MB.")
        : (zh ? "无法保存头像，请检查图片后重试。" : "Avatar could not be saved. Check the image and try again."));
    } finally {
      setAvatarSaving(false);
    }
  }
  function selectThumbnail(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 6 * 1024 * 1024) {
      setNotice(zh ? "请选择 6 MB 以下的 JPEG、PNG 或 WebP 封面。" : "Choose a JPEG, PNG, or WebP thumbnail under 6 MB.");
      return;
    }
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  }
  async function saveBroadcastMetadata() {
    await request(`/api/streamer/rooms/${studio.room.slug}`, {
      method: "PUT",
      body: JSON.stringify({ title, primaryLanguage, additionalLanguages, tagIds }),
    });
    if (thumbnailFile) {
      setThumbnailSaving(true);
      try {
        const form = new FormData();
        form.append("thumbnail", thumbnailFile);
        await request("/api/streamer/stream-thumbnail", { method: "POST", body: form });
        if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
        setThumbnailFile(null);
        setThumbnailPreviewUrl(null);
      } finally {
        setThumbnailSaving(false);
      }
    }
    setNotice(zh ? "直播信息已保存。" : "Stream details saved.");
    refresh();
  }
  async function removeAvatar() {
    setAvatarSaving(true);
    try {
      await request("/api/streamer/avatar", { method: "DELETE" });
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setNotice(zh ? "头像已移除。" : "Avatar removed.");
      refresh();
    } catch {
      setNotice(zh ? "暂时无法移除头像。" : "Avatar could not be removed right now.");
    } finally {
      setAvatarSaving(false);
    }
  }
  if (!studio) return <section className="workspace">{t.preparing}</section>;
  const room = studio.room;
  const zh = t.title !== "Stream MVP";
  if (!room)
    return (
      <section className="workspace creator-studio creator-room-empty">
        <p className="eyebrow">{t.title === "Stream MVP" ? "STREAMER STUDIO" : "主播工作室"}</p>
        <h2>{t.title === "Stream MVP" ? "Create your first stream" : "创建您的首个直播间"}</h2>
        <p>{t.title === "Stream MVP" ? "Your creator account is active. Creating a draft is an explicit action; it will remain private until you publish it." : "您的主播账户已激活。创建草稿需要明确操作，发布前不会出现在公开发现中。"}</p>
        <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); void request("/api/studio/rooms", { method: "POST", body: JSON.stringify({ title: title || (t.title === "Stream MVP" ? "My first Holiwyn stream" : "我的首场 Holiwyn 直播"), primaryLanguage, additionalLanguages, tagIds }) }).then(() => refresh()).catch(() => setNotice(t.title === "Stream MVP" ? "The draft room could not be created." : "无法创建直播间草稿。")); }}>
          <label>{t.title === "Stream MVP" ? "Stream title" : "直播标题"}<input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <RoomClassificationFields languages={studioLanguages} tags={studioTags} primaryLanguage={primaryLanguage} additionalLanguages={additionalLanguages} selectedTagIds={tagIds} zh={t.title !== "Stream MVP"} onPrimaryLanguageChange={setPrimaryLanguage} onAdditionalLanguagesChange={setAdditionalLanguages} onTagIdsChange={setTagIds} />
          <button>{t.title === "Stream MVP" ? "Create private draft" : "创建私有草稿"}</button>
        </form>
        {notice ? <p role="alert">{notice}</p> : null}
      </section>
    );
  const broadcastState = room.broadcast_state ?? "offline";
  const simulatedBroadcast = room.broadcast_status_source === "local";
  const effectiveSessionPhase =
    ["connecting", "live", "error", "ending"].includes(runtime.phase)
      ? runtime.phase
      : broadcastState === "live" || broadcastState === "connecting"
        ? broadcastState
        : runtime.phase;
  const liveSessionActive = ["connecting", "live", "error", "ending"].includes(
    effectiveSessionPhase,
  );
  const goalPercent = Math.min(
    100,
    Math.round((room.goal_progress / Math.max(1, room.goal_target)) * 100),
  );
  return (
    <section className={`workspace creator-studio broadcaster-runtime-${effectiveSessionPhase} ${activeSection === "live" ? "creator-live-view" : "creator-center-view"}`}>
      <header className="broadcaster-header">
        <strong className="broadcaster-brand">HOLIWYN</strong>
        <div className="broadcaster-session-state" aria-live="polite">
          <span className={effectiveSessionPhase === "live" ? "is-live" : ""}>
            <i /> {simulatedBroadcast && effectiveSessionPhase === "live" ? (zh ? "模拟直播" : "SIMULATED LIVE") : effectiveSessionPhase === "live" ? (zh ? "直播中" : "LIVE") : simulatedBroadcast && effectiveSessionPhase === "connecting" ? (zh ? "模拟连接" : "SIMULATED STARTING") : effectiveSessionPhase === "connecting" ? (zh ? "正在开播" : "STARTING") : effectiveSessionPhase === "ending" ? (zh ? "正在结束" : "ENDING") : effectiveSessionPhase === "preview" ? (zh ? "预览就绪" : "PREVIEW READY") : (zh ? "准备开播" : "SET UP")}
          </span>
          <time>{runtime.duration}</time>
          <span className="broadcaster-viewers"><BroadcastIcon name="viewers" /> {viewerCount}</span>
        </div>
        <div className="broadcaster-header-actions">
          <details className="broadcaster-account-menu" ref={accountMenuRef}>
            <summary aria-label={zh ? "打开创作者菜单" : "Open creator menu"} title={zh ? "创作者菜单" : "Creator menu"}>
              <CreatorAvatar
                name={studio.user?.displayName ?? (zh ? "主播" : "Creator")}
                url={studio.room?.avatar_url}
                className="broadcaster-menu-avatar"
              />
            </summary>
            <div className="broadcaster-account-popover">
              <header className="creator-menu-identity">
                <CreatorAvatar
                  name={studio.user?.displayName ?? (zh ? "主播" : "Creator")}
                  url={studio.room?.avatar_url}
                  className="creator-menu-identity-avatar"
                />
                <span><strong>{studio.user?.displayName}</strong><small>@{studio.user?.handle}</small></span>
              </header>
              <nav className="creator-menu-sections" aria-label={zh ? "创作者页面" : "Creator pages"}>
                <button type="button" className="creator-discover-live" onClick={() => { closeCreatorMenu(); if(liveSessionActive)setDiscoverConfirmationOpen(true);else onDiscover(); }}><BroadcastIcon name="live" />{zh ? "发现直播" : "Discover Live"}</button>
                {([
                  ["live", zh ? "返回直播" : "Return to live", "live"],
                  ["earnings", zh ? "收益" : "Earnings", "earnings"],
                  ["supporters", zh ? "支持者排行" : "Top supporters", "supporters"],
                  ["followers", zh ? "关注者" : "Followers", "followers"],
                  ["actions", zh ? "互动与私密直播" : "Actions & private show", "actions"],
                  ["profile", zh ? "公开主页" : "Public profile", "profile"],
                  ["settings", zh ? "设置" : "Settings", "settings"],
                ] as const).map(([section, label, icon]) => (
                  <button
                    type="button"
                    key={section}
                    className={activeSection === section || (section === "actions" && activeSection === "private") ? "active" : ""}
                    aria-current={activeSection === section ? "page" : undefined}
                    onClick={() => {
                      if (section === "live") returnToLive();
                      else openAuxiliarySection(section);
                      closeCreatorMenu();
                    }}
                  ><BroadcastIcon name={icon as CreatorIconName} />{label}</button>
                ))}
              </nav>
              <div className="creator-menu-language">
                <span>{zh ? "语言" : "Language"}</span>
                <LanguagePicker language={language} onChange={onLanguageChange} />
              </div>
              <button
                type="button"
                className="danger broadcaster-signout-button"
                onClick={() => {
                  closeCreatorMenu();
                  if (liveSessionActive) setLogoutConfirmationOpen(true);
                  else onLogout();
                }}
              >
                {zh ? "退出登录" : "Sign out"}
              </button>
            </div>
          </details>
        </div>
      </header>
      {room.publication_status === "draft" ? <aside className="studio-draft-banner"><span><strong>{zh ? "私有草稿" : "Private draft"}</strong><small>{zh ? "此直播间尚未出现在公开发现中。" : "This room is not visible in public discovery yet."}</small></span><button type="button" onClick={() => void request(`/api/studio/rooms/${encodeURIComponent(room.slug)}/publish`, { method: "POST", body: "{}" }).then(() => refresh()).catch(() => setNotice(zh ? "无法发布直播间。" : "The room could not be published."))}>{zh ? "发布直播间" : "Publish room"}</button></aside> : null}

      <div
        className={`creator-section broadcaster-page phase-${effectiveSessionPhase} ${activeSection === "live" ? "studio-view-active" : "studio-view-inactive"}`}
        aria-hidden={activeSection !== "live"}
      >
        <div className="broadcaster-layout">
          <main className="broadcaster-stage">
          <QuickGoLive
            slug={room.slug}
            available={Boolean(studio.broadcastControls?.browserQuickLiveAvailable)}
            broadcastState={broadcastState}
            broadcastSource={room.broadcast_status_source}
            transport={room.broadcast_transport}
            title={title}
            primaryLanguage={primaryLanguage}
            additionalLanguages={additionalLanguages}
            tagIds={tagIds}
            languageOptions={studioLanguages}
            tagOptions={studioTags}
            thumbnailUrl={thumbnailPreviewUrl ?? room.stream_thumbnail_url}
            t={t}
            onChanged={refresh}
            onTitleChange={setTitle}
            onPrimaryLanguageChange={setPrimaryLanguage}
            onAdditionalLanguagesChange={setAdditionalLanguages}
            onTagIdsChange={setTagIds}
            onSaveMetadata={saveBroadcastMetadata}
            onThumbnailSelected={selectThumbnail}
            overlay={<CreatorRealtimeOverlay slug={room.slug} t={t} />}
            viewerCount={viewerCount}
            onRuntimeChange={updateRuntime}
            onChatOpen={() => setMobileChatOpen(true)}
            activeView={activeSection === "live"}
          />
            <div className="broadcaster-stream-bar">
              <span>{title || (zh ? "未命名直播" : "Untitled stream")}</span>
              <span className={`compact-health health-${runtime.health}`}><i /> {runtime.health === "excellent" ? (zh ? "连接良好" : "Excellent") : runtime.health === "reconnecting" ? (zh ? "正在重新连接" : "Reconnecting") : runtime.health === "weak" ? (zh ? "连接较弱" : "Weak") : runtime.health === "connecting" ? (zh ? "正在连接" : "Connecting") : runtime.health === "unavailable" ? (zh ? "连接不可用" : "Unavailable") : (zh ? "准备就绪" : "Ready")}</span>
            </div>
          </main>
          <CreatorLiveMonitor
            slug={room.slug}
            t={t}
            mobileOpen={mobileChatOpen}
            onMobileClose={() => setMobileChatOpen(false)}
            onViewerCountChange={updateViewerCount}
            initialSlowModeSeconds={Number(room.chat_slow_mode_seconds ?? 0)}
            initialBlockedTerms={Array.isArray(room.blocked_terms) ? room.blocked_terms : []}
          />
        </div>
        {!studio.broadcastControls?.cloudflareConfigured ? (
          <p className="control-note broadcaster-service-note">{zh ? "此环境可测试相机预览，但浏览器直播服务尚未连接。" : "Camera preview is available, but browser broadcasting is not connected in this environment."}</p>
        ) : null}
        {notice && (activeSection !== "live" || !liveSessionActive) ? <p className="form-notice broadcaster-notice">{notice}</p> : null}
      </div>

      {activeSection === "earnings" ? (
        <section className="creator-section creator-config-page creator-earnings-page">
          {liveSessionActive ? <div className="broadcast-continues-banner" role="status"><span><i />{zh ? "您的直播仍在继续；钱包和排行榜会实时更新。" : "Your broadcast is still running; wallet and rankings update in realtime."}</span><button type="button" onClick={returnToLive}>{zh ? "返回直播" : "Back to live"}</button></div> : null}
          <div className="creator-page-heading">
            <div>
              <h3>{zh ? "收益" : "Earnings"}</h3>
              <p className="creator-test-note">{zh ? "R 没有现金价值 · 不支持充值或提现" : "R has no cash value · No deposits or withdrawals"}</p>
            </div>
          </div>
          <CreatorEarningsWallet slug={room.slug} state={broadcastState} t={t} />
        </section>
      ) : null}

      {activeSection === "supporters" ? (
        <section className="creator-section creator-config-page creator-supporters-page">
          {liveSessionActive ? <div className="broadcast-continues-banner" role="status"><span><i />{zh ? "您的直播仍在继续；支持者排行会实时更新。" : "Your broadcast is still running; supporter rankings update in realtime."}</span><button type="button" onClick={returnToLive}>{zh ? "返回直播" : "Back to live"}</button></div> : null}
          <div className="creator-page-heading"><h3>{zh ? "支持者" : "Supporters"}</h3></div>
          <CreatorSupportersPage slug={room.slug} t={t} />
        </section>
      ) : null}

      {activeSection === "followers" ? (
        <section className="creator-section creator-config-page creator-followers-page">
          {liveSessionActive ? <div className="broadcast-continues-banner" role="status"><span><i />{zh ? "您的直播仍在继续；关注者会实时更新。" : "Your broadcast is still running; followers update in realtime."}</span><button type="button" onClick={returnToLive}>{zh ? "返回直播" : "Back to live"}</button></div> : null}
          <div className="creator-page-heading"><h3>{zh ? "关注者" : "Followers"}</h3></div>
          <CreatorFollowersPage slug={room.slug} t={t} />
        </section>
      ) : null}

      {activeSection === "actions" ? (
        <section className="creator-section creator-config-page">
          <div className="creator-page-heading">
            <div>
              <h3>{zh ? "互动与目标" : "Actions & goal"}</h3>
            </div>
            <button type="button" className="secondary" onClick={() => openAuxiliarySection("private")}>{zh ? "私密直播设置" : "Private show settings"}</button>
          </div>
          <div className="creator-tools-grid">
            <form className="control-rail-section quick-goal" onSubmit={(e) => void save(e)}>
              <div className="section-title-row">
                <div><p className="eyebrow">{zh ? "直播目标" : "Live goal"}</p><h3>{room.goal_text}</h3></div>
                <strong>{goalPercent}%</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${goalPercent}%` }} /></div>
              <small>{room.goal_progress} / {room.goal_target} {t.coins}</small>
              <label>{zh ? "目标标题" : "Goal title"}<input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={160} /></label>
              <label>{zh ? "目标 R" : "Target R"}<input type="number" min="1" value={goalTarget} onChange={(e) => setGoalTarget(Number(e.target.value))} /></label>
              <button>{zh ? "更新直播目标" : "Update live goal"}</button>
            </form>
            <div className="creator-action-workspace"><ActionMenuManager slug={room.slug} t={t} /></div>
          </div>
        </section>
      ) : null}

      {activeSection === "private" ? (
        <section className="creator-section creator-config-page">
          <div className="creator-page-heading">
            <h3>{zh ? "私密直播" : "Private show"}</h3>
            <span className={`creator-state-chip ${room.private_show_enabled ? "active" : ""}`}>{room.private_show_enabled ? t.active : t.inactive}</span>
          </div>
          <div className="creator-settings-grid creator-private-grid">
            <section>
              <h3>{zh ? "访问与价格" : "Access and pricing"}</h3>
              <p className="creator-test-note">{zh ? "R 没有现金价值" : "R has no cash value"}</p>
              <div className="studio-form">
                <label>{zh ? "访问模式" : "Access mode"}<select value={mode} onChange={(e) => setMode(e.target.value as "ticket" | "per_minute")}><option value="ticket">{t.ticket}</option><option value="per_minute">{t.perMinute}</option></select></label>
                <label>{t.ticketCost}<input type="number" min="1" value={ticketCost} onChange={(e) => setTicketCost(Number(e.target.value))} /></label>
                <label>{t.minuteCost}<input type="number" min="1" value={perMinuteCost} onChange={(e) => setPerMinuteCost(Number(e.target.value))} /></label>
                <button type="button" onClick={() => void toggle(!room.private_show_enabled)}>{room.private_show_enabled ? t.endPrivate : t.startPrivate}</button>
              </div>
            </section>
            <section className="creator-guidance-card">
              <p className="eyebrow">{zh ? "当前状态" : "Current state"}</p>
              <h3>{room.private_show_enabled ? (zh ? "私密模式已开启" : "Private mode is active") : (zh ? "公开直播模式" : "Public room mode")}</h3>
            </section>
          </div>
        </section>
      ) : null}

      {activeSection === "profile" ? (
        <section className="creator-section creator-config-page streamer-profile-page">
          {liveSessionActive ? (
            <div className="broadcast-continues-banner" role="status">
              <span><i />{zh ? "您的直播仍在继续，观众仍可观看和互动。" : "Your live broadcast is still running for viewers."}</span>
              <button type="button" onClick={returnToLive}>{zh ? "返回直播" : "Back to live"}</button>
            </div>
          ) : null}
          <div className="creator-page-heading"><h3>{zh ? "公开主页" : "Public profile"}</h3></div>
          <form className="streamer-profile-editor" onSubmit={(e) => void savePublicPresence(e)}>
            <aside className="streamer-profile-preview" aria-label={zh ? "公开主页预览" : "Public profile preview"}>
              <div className="streamer-avatar-editor">
                <CreatorAvatar
                  name={studio.user?.displayName ?? title ?? "Creator"}
                  url={avatarPreviewUrl ?? room.avatar_url}
                  className="streamer-profile-avatar"
                  objectPosition={avatarPreviewUrl ? `${avatarFocusX}% ${avatarFocusY}%` : undefined}
                />
                <input
                  id="streamer-avatar-file"
                  className="avatar-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => selectAvatar(event.target.files?.[0] ?? null)}
                />
                <label className="avatar-select-button" htmlFor="streamer-avatar-file">{zh ? "选择头像" : "Choose avatar"}</label>
                {avatarFile ? <button type="button" className="creator-primary-action" disabled={avatarSaving} onClick={() => void uploadAvatar()}>{avatarSaving ? (zh ? "正在保存…" : "Saving…") : (zh ? "保存头像" : "Save avatar")}</button> : null}
                {room.avatar_url ? <button type="button" className="avatar-remove-button" disabled={avatarSaving} onClick={() => void removeAvatar()}>{zh ? "移除" : "Remove"}</button> : null}
                <small>{zh ? "JPEG、PNG 或 WebP，最大 5 MB。保存后会裁剪为正方形。" : "JPEG, PNG, or WebP up to 5 MB. Saved as a square crop."}</small>
                {avatarFile ? <div className="avatar-focus-controls"><label>{zh ? "左右位置" : "Horizontal position"}<input type="range" min="0" max="100" value={avatarFocusX} onChange={(event) => setAvatarFocusX(Number(event.target.value))} /></label><label>{zh ? "上下位置" : "Vertical position"}<input type="range" min="0" max="100" value={avatarFocusY} onChange={(event) => setAvatarFocusY(Number(event.target.value))} /></label></div> : null}
              </div>
              <p className="eyebrow">{zh ? "观众预览" : "Viewer preview"}</p>
              <h3>{title || (zh ? "未命名直播" : "Untitled stream")}</h3>
              <p>{bio || (zh ? "添加一句简介，告诉观众您的直播内容。" : "Add a short bio so viewers know what you stream.")}</p>
              <div className="streamer-profile-preview-meta">
                <span>{[primaryLanguage, ...additionalLanguages].map((code) => studioLanguages.find((item) => item.code === code)?.nameNative ?? code.toUpperCase()).join(" · ")}</span>
                <span>{schedule || (zh ? "尚未添加常规时间" : "No regular schedule yet")}</span>
              </div>
            </aside>
            <div className="streamer-profile-fields">
              <label>{t.roomTitle}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
              <label>{zh ? "简介" : "Bio"}<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} /></label>
              <label>{zh ? "常规直播时间说明" : "Regular schedule description"}<input value={schedule} onChange={(e) => setSchedule(e.target.value)} maxLength={160} placeholder={zh ? "例如：每周二、周四晚上 8 点" : "For example: Tuesdays and Thursdays at 8 PM"} /></label>
              <div className="streamer-profile-field-row">
                <label>{zh ? "下一场直播（可选）" : "Next stream (optional)"}<input type="datetime-local" value={nextStreamAt} onChange={(e) => setNextStreamAt(e.target.value)} /></label>
                <label>{zh ? "日程时区" : "Schedule timezone"}<select value={scheduleTimezone} onChange={(e) => setScheduleTimezone(e.target.value)}>{Array.from(new Set([scheduleTimezone, "UTC", "America/Chicago", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Shanghai", "Asia/Tokyo"])).map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select></label>
              </div>
              <div className="streamer-profile-save-row"><p className="form-help">{zh ? "清空“下一场直播”可移除单次日程。" : "Clear the next-stream field to remove that one-time schedule."}</p><button className="creator-primary-action">{zh ? "保存全部公开信息" : "Save all public details"}</button></div>
            </div>
          </form>
        </section>
      ) : null}

      {activeSection === "settings" ? (
        <section className="creator-section creator-config-page" id="obs-setup">
          <div className="creator-page-heading"><h3>{zh ? "设置" : "Settings"}</h3></div>
          <div className="creator-settings-grid creator-settings-operations">
            <CreatorModerationRestrictions slug={room.slug} t={t} />
            <section className="broadcast-health"><div><span>{zh ? "上次状态检查" : "Last status check"}</span><strong>{room.broadcast_checked_at ? new Date(room.broadcast_checked_at).toLocaleTimeString() : "—"}</strong></div><button type="button" className="secondary" onClick={() => void refreshBroadcast()} disabled={!studio.broadcastControls?.cloudflareConfigured}>{zh ? "刷新直播状态" : "Refresh broadcast status"}</button></section>
          </div>
          <div className="creator-obs-workspace"><ObsReadiness slug={room.slug} state={broadcastState} source={room.broadcast_status_source} t={t} onChanged={refresh} /></div>
          {studio.broadcastControls?.localFallbackEnabled ? <div className="local-state-tool"><label>{zh ? "仅模拟状态" : "Simulation status only"}</label><p className="control-note">{zh ? "此控件只测试界面状态，不会发布或停止任何视频。" : "This control tests UI states. It does not publish or stop video."}</p><select value={broadcastState} onChange={(e) => void setLocalBroadcast(e.target.value as "live" | "connecting" | "offline" | "unavailable")}><option value="live">simulated live</option><option value="connecting">simulated connecting</option><option value="offline">simulated offline</option><option value="unavailable">simulated unavailable</option></select></div> : null}
        </section>
      ) : null}
      {notice && <p className="creator-toast">{notice}</p>}
      <Modal
        open={discoverConfirmationOpen}
        title={zh ? "离开直播工作室？" : "Leave Streamer Studio?"}
        description={zh ? "浏览器正在发布您的直播。离开工作室可能中断摄像头推流；请留在此页面以保持直播。" : "This browser is publishing your stream. Leaving Studio may interrupt camera publishing; stay here to keep broadcasting."}
        closeLabel={zh ? "关闭离开确认" : "Close leave confirmation"}
        onClose={() => setDiscoverConfirmationOpen(false)}
        footer={<><button type="button" onClick={() => setDiscoverConfirmationOpen(false)}>{zh ? "继续直播" : "Keep broadcasting"}</button><button type="button" className="secondary" onClick={() => {setDiscoverConfirmationOpen(false);onDiscover();}}>{zh ? "仍然离开" : "Leave anyway"}</button></>}
      ><p>{zh ? "离开不会退出登录或移除您的主播权限。" : "Leaving does not sign you out or remove creator access."}</p></Modal>
      <Modal
        open={logoutConfirmationOpen}
        title={zh ? "退出并结束直播？" : "Sign out and end stream?"}
        description={zh ? "退出登录将结束当前直播。" : "Signing out will end your current broadcast."}
        closeLabel={zh ? "关闭退出确认" : "Close sign-out confirmation"}
        onClose={() => setLogoutConfirmationOpen(false)}
        footer={
          <>
            <button type="button" className="secondary" onClick={() => setLogoutConfirmationOpen(false)}>{zh ? "取消" : "Cancel"}</button>
            <button type="button" className="danger" disabled={endingForLogout} onClick={() => void endBroadcastAndLogout()}>{endingForLogout ? (zh ? "正在结束…" : "Ending…") : (zh ? "结束直播并退出" : "End stream and sign out")}</button>
          </>
        }
      >
        <p>{zh ? "退出后，您需要重新登录才能使用创作者工具。" : "You will need to sign in again to use creator tools."}</p>
      </Modal>
    </section>
  );
}
function AdminCreatorReviews({zh}:{zh:boolean}){
  const initialAdminQuery=new URLSearchParams(window.location.search);
  const [items,setItems]=useState<any[]>([]),[filter,setFilter]=useState(initialAdminQuery.get("filter")??"all"),[search,setSearch]=useState(initialAdminQuery.get("search")??""),[selected,setSelected]=useState<any>(null),[notice,setNotice]=useState("");
  const load=()=>{window.history.replaceState({},"",`/admin/creator-reviews?filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`);void request(`/api/admin/creator-reviews?filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}&limit=25`).then(d=>setItems(d.items)).catch(()=>setNotice(zh?"无法加载主播审核。":"Creator reviews could not be loaded."));};
  useEffect(()=>{window.history.replaceState({},"",`/admin/creator-reviews?filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`);load();},[filter]);
  const open=async(id:string)=>setSelected(await request(`/api/admin/creator-reviews/${id}`));
  const act=async(action:string)=>{if(!selected)return;const reason=window.prompt(zh?"请输入原因代码或简短原因":"Enter a reason code or short reason");if(!reason)return;await request(`/api/admin/creator-reviews/${selected.creator.user_id}/actions`,{method:"POST",body:JSON.stringify({action,reasonCode:reason,userFacingReason:reason,idempotencyKey:crypto.randomUUID()})});setNotice(zh?"操作已记录。":"Decision recorded and audited.");await open(selected.creator.user_id);load();};
  const viewDocument=async()=>{if(!selected?.creator.document_id)return;const result=await request(`/api/admin/creator-reviews/${selected.creator.user_id}/document-view`,{method:"POST",body:JSON.stringify({documentId:selected.creator.document_id})});window.open(result.viewPath,"_blank","noopener,noreferrer");};
  return <section className="admin-creator-review"><div className="admin-section-heading"><div><p className="eyebrow">{zh?"权限保护":"PERMISSION PROTECTED"}</p><h3>{zh?"主播审核":"Creator Reviews"}</h3></div></div><div className="admin-review-filters"><label>{zh?"状态":"Status"}<select value={filter} onChange={e=>setFilter(e.target.value)}>{["all","new","auto_unreviewed","pending","uploaded","needs_reupload","active","rejected","suspended"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label><label>{zh?"搜索":"Search"}<input value={search} onChange={e=>setSearch(e.target.value)} placeholder={zh?"姓名、账号或用户 ID":"Name, handle, or user ID"}/></label><button type="button" onClick={load}>{zh?"搜索":"Search"}</button></div><div className="creator-review-list">{items.map(x=><button type="button" key={x.user_id} onClick={()=>void open(x.user_id)}><strong>{x.creator_handle?`@${x.creator_handle}`:x.account_handle}</strong><span>{x.creator_status} · {x.document_status??"NOT_UPLOADED"} · {x.activation_method??"—"}</span></button>)}{!items.length?<p className="muted">{zh?"没有符合条件的主播。":"No creators match these filters."}</p>:null}</div>{selected?<article className="admin-review-detail"><h4>{selected.creator.creator_name??selected.creator.display_name} · {selected.creator.creator_status}</h4><dl><div><dt>{zh?"账户":"Account"}</dt><dd>@{selected.creator.account_handle} · {selected.creator.user_id}</dd></div><div><dt>{zh?"协议":"Agreement"}</dt><dd>{selected.creator.agreement_version??"—"} · 18+ {selected.creator.age_confirmed?"confirmed":"missing"}</dd></div><div><dt>{zh?"证件":"Document"}</dt><dd>{selected.creator.document_status??"NOT_UPLOADED"} · {selected.creator.mime_type??"—"}</dd></div><div><dt>{zh?"激活":"Activation"}</dt><dd>{selected.creator.activation_method??"—"} · {selected.creator.administrative_review_status}</dd></div></dl><div className="admin-actions">{selected.creator.document_id?<button type="button" onClick={()=>void viewDocument()}>{zh?"安全查看证件":"Securely view document"}</button>:null}<button type="button" onClick={()=>void act("DOCUMENT_REVIEWED")}>{zh?"标记已审核":"Mark reviewed"}</button><button type="button" onClick={()=>void act("REUPLOAD_REQUESTED")}>{zh?"要求重新上传":"Request re-upload"}</button><button type="button" onClick={()=>void act("APPROVED")}>{zh?"批准":"Approve"}</button><button type="button" className="danger" onClick={()=>void act("REJECTED")}>{zh?"拒绝":"Reject"}</button><button type="button" className="danger" onClick={()=>void act("SUSPENDED")}>{zh?"暂停":"Suspend"}</button><button type="button" onClick={()=>void act("REACTIVATED")}>{zh?"恢复":"Reactivate"}</button></div><h5>{zh?"生命周期":"Lifecycle"}</h5>{selected.history.map((x:any,i:number)=><p key={i} className="muted">{x.from_status??"—"} → {x.to_status} · {x.reason_code??"—"}</p>)}</article>:null}{notice?<p role="status">{notice}</p>:null}</section>;
}
function AdminPanel({ t }: { t: typeof copy.en }) {
  const zh = t.title !== "Stream MVP";
  const [events, setEvents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationReasons, setApplicationReasons] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [moderationTargetId, setModerationTargetId] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [pendingModeration, setPendingModeration] = useState<"mute" | "unmute" | "ban" | "unban" | null>(null);
  const [moderationSaving, setModerationSaving] = useState(false);
  const refresh = () => {
    void request("/api/admin/rooms/demo-streamer/moderation").then((d) =>
      setEvents(d.events),
    );
    void request("/api/admin/reports").then((d) => setReports(d.reports));
    void request("/api/admin/test-transactions").then((d) =>
      setTransactions(d.transactions),
    );
    void request("/api/admin/users").then((d) => setUsers(d.users));
    void request("/api/admin/rooms/broadcasts").then((d) =>
      setBroadcasts(d.rooms),
    );
    void request("/api/admin/creator-applications").then((d) =>
      setApplications(d.applications),
    );
  };
  useEffect(refresh, []);
  async function confirmModeration() {
    if (!pendingModeration || !moderationTargetId || moderationReason.trim().length < 2) return;
    const target = users.find((user) => user.id === moderationTargetId);
    setModerationSaving(true);
    try {
      await request("/api/admin/rooms/demo-streamer/moderation", {
        method: "POST",
        body: JSON.stringify({
          targetId: moderationTargetId,
          action: pendingModeration,
          reason: moderationReason.trim(),
        }),
      });
      setNotice(`${pendingModeration}: ${target?.display_name ?? moderationTargetId}`);
      setPendingModeration(null);
      setModerationReason("");
      refresh();
    } catch {
      setNotice(zh ? "管理操作未能应用，请重试。" : "The moderation action could not be applied. Try again.");
    } finally {
      setModerationSaving(false);
    }
  }
  async function review(id: string, status: "reviewed" | "dismissed") {
    await request(`/api/admin/reports/${id}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    refresh();
  }
  async function decideCreator(id: string, decision: "approved" | "rejected") {
    const reason = applicationReasons[id]?.trim();
    if (!reason) {
      setNotice(t.title === "Stream MVP" ? "Add a review reason first." : "请先填写审核意见。");
      return;
    }
    await request(`/api/admin/creator-applications/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    });
    setNotice(decision === "approved" ? (t.title === "Stream MVP" ? "Creator approved and provisioned." : "主播已批准并完成初始化。") : (t.title === "Stream MVP" ? "Application rejected with feedback." : "申请已拒绝并附上反馈。"));
    refresh();
  }
  return (
    <section className="workspace">
      <h2>{t.admin}</h2>
      <AdminCreatorReviews zh={zh} />
      <section className="admin-creator-review">
        <div className="admin-section-heading">
          <div><p className="eyebrow">{t.title === "Stream MVP" ? "Creator onboarding" : "主播入驻"}</p><h3>{t.title === "Stream MVP" ? "Creator applications" : "主播申请"}</h3></div>
          <span>{applications.filter((item) => item.status === "pending").length} {t.title === "Stream MVP" ? "pending" : "待审核"}</span>
        </div>
        <div className="creator-review-list">
          {applications.filter((item) => item.status === "pending").map((item) => (
            <article key={item.id}>
              <div><strong>{item.display_name}</strong><span>@{item.handle}</span></div>
              <p>{item.bio}</p>
              <p className="muted"><strong>{t.title === "Stream MVP" ? "Schedule:" : "计划时间："}</strong> {item.schedule_text}</p>
              <p className="muted"><strong>{t.title === "Stream MVP" ? "Motivation:" : "申请说明："}</strong> {item.motivation}</p>
              <label>{t.title === "Stream MVP" ? "Decision reason" : "审核意见"}<textarea value={applicationReasons[item.id] ?? ""} onChange={(event) => setApplicationReasons((current) => ({ ...current, [item.id]: event.target.value }))} minLength={2} maxLength={500} /></label>
              <div className="admin-actions"><button onClick={() => void decideCreator(item.id, "approved")}>{t.title === "Stream MVP" ? "Approve creator" : "批准主播"}</button><button className="secondary" onClick={() => void decideCreator(item.id, "rejected")}>{t.title === "Stream MVP" ? "Reject with feedback" : "拒绝并反馈"}</button></div>
            </article>
          ))}
          {!applications.some((item) => item.status === "pending") ? <p className="muted">{t.title === "Stream MVP" ? "No creator applications are waiting." : "暂无待审核主播申请。"}</p> : null}
        </div>
      </section>
      <h3>
        {t.title === "Stream MVP" ? "Local account review" : "本地账号审核"}
      </h3>
      <section className="admin-account-moderation">
        <p className="muted">{zh ? "先选择具体账户，再选择操作并填写审核原因。" : "Select a specific account, choose an action, and provide an audit reason."}</p>
        <div className="transaction-list admin-user-list">
        {users.filter((user) => user.role !== "admin").map((user) => (
          <label key={user.id} className={moderationTargetId === user.id ? "selected" : ""}>
            <input type="radio" name="moderation-target" value={user.id} checked={moderationTargetId === user.id} onChange={() => setModerationTargetId(user.id)} />
            <span><strong>{user.display_name}</strong><small>@{user.handle} · {user.role} · {user.is_banned ? (zh ? "已封禁" : "banned") : user.is_muted ? (zh ? "已禁言" : "muted") : (zh ? "正常" : "active")}</small></span>
          </label>
        ))}
        </div>
        <label>{zh ? "审核原因" : "Moderation reason"}<textarea value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} minLength={2} maxLength={500} placeholder={zh ? "必填，2–500 个字符" : "Required, 2–500 characters"} /></label>
        <div className="admin-actions">
          {(["mute", "unmute", "ban", "unban"] as const).map((value) => (
            <button key={value} type="button" className={value === "ban" ? "danger" : "secondary"} disabled={!moderationTargetId || moderationReason.trim().length < 2} onClick={() => setPendingModeration(value)}>
              {zh ? ({ mute: "禁言", unmute: "解除禁言", ban: "封禁", unban: "解除封禁" } as const)[value] : value}
            </button>
          ))}
        </div>
      </section>
      {notice && <p role="status">{notice}</p>}
      <h3>
        {t.title === "Stream MVP"
          ? "Broadcast health"
          : "\u76f4\u64ad\u72b6\u6001"}
      </h3>
      <div className="transaction-list">
        {broadcasts.map((item) => (
          <p key={item.slug}>
            <strong>{item.title}</strong> ·{" "}
            {broadcastLabel(t, item.broadcast_state)} ·{" "}
            {item.broadcast_checked_at
              ? new Date(item.broadcast_checked_at).toLocaleString()
              : "—"}
          </p>
        ))}
      </div>
      <h3>{t.reports}</h3>
      {reports.length ? (
        reports.map((r) => (
          <p key={r.id}>
            {r.status} · {r.reason} ·{" "}
            <button onClick={() => void review(r.id, "reviewed")}>
              {t.review}
            </button>{" "}
            <button onClick={() => void review(r.id, "dismissed")}>
              {t.dismiss}
            </button>
          </p>
        ))
      ) : (
        <p className="muted">{t.noReports}</p>
      )}
      <h3>{t.transactions}</h3>
      {transactions.length ? (
        <div className="transaction-list">
          {transactions.map((item, i) => (
            <p key={i}>
              <strong>{item.participant_name}</strong> · {item.reference_type} ·{" "}
              {item.entry_type} · {item.amount > 0 ? "+" : ""}
              {item.amount} {t.coins}
            </p>
          ))}
        </div>
      ) : (
        <p className="muted">{t.noTransactions}</p>
      )}
      <h3>{t.audit}</h3>
      {events.map((e, i) => (
        <p key={i}>
          {e.action} · {e.target_name} · {e.reason ?? "-"}
        </p>
      ))}
      <Modal
        open={Boolean(pendingModeration)}
        title={zh ? "确认管理操作" : "Confirm moderation action"}
        description={zh ? "此操作会立即影响所选账户，并写入审核记录。" : "This action immediately affects the selected account and is written to the audit log."}
        closeLabel={zh ? "关闭确认" : "Close confirmation"}
        onClose={() => setPendingModeration(null)}
        footer={<><button type="button" className="secondary" onClick={() => setPendingModeration(null)}>{zh ? "取消" : "Cancel"}</button><button type="button" className={pendingModeration === "ban" ? "danger" : ""} disabled={moderationSaving} onClick={() => void confirmModeration()}>{moderationSaving ? (zh ? "正在应用…" : "Applying…") : (zh ? "确认操作" : "Confirm action")}</button></>}
      >
        <p><strong>{users.find((user) => user.id === moderationTargetId)?.display_name ?? "—"}</strong> · {pendingModeration ?? "—"}</p>
        <p>{moderationReason}</p>
      </Modal>
    </section>
  );
}
function PublicAudienceProfileView({profile,authenticated,zh,onBack,onEdit,onChanged,onOpenCreator}:{profile:PublicUserProfile;authenticated:boolean;zh:boolean;onBack:()=>void;onEdit:()=>void;onChanged:(profile:PublicUserProfile)=>void;onOpenCreator:()=>void}){
  const [notice,setNotice]=useState("");const [reporting,setReporting]=useState(false);const [reason,setReason]=useState("inappropriate_profile");const [details,setDetails]=useState("");const [busy,setBusy]=useState(false);
  async function toggleBlock(){if(!authenticated)return;setBusy(true);setNotice("");try{const result=await request(`/api/users/${encodeURIComponent(profile.handle)}/block`,{method:profile.blocked?"DELETE":"PUT",...(profile.blocked?{}:{body:"{}"})});onChanged({...profile,blocked:result.blocked});setNotice(result.blocked?(zh?"已屏蔽此用户。":"User blocked."):(zh?"已取消屏蔽。":"User unblocked."));}catch{setNotice(zh?"暂时无法更新屏蔽设置。":"Block setting could not be updated.");}finally{setBusy(false);}}
  async function submitReport(event:FormEvent){event.preventDefault();setBusy(true);setNotice("");try{await request(`/api/users/${encodeURIComponent(profile.handle)}/reports`,{method:"POST",body:JSON.stringify({reason,details})});setReporting(false);setDetails("");setNotice(zh?"举报已提交审核。":"Report submitted for review.");}catch{setNotice(zh?"暂时无法提交举报。":"Report could not be submitted.");}finally{setBusy(false);}}
  return <>
    <AudienceProfileSurface profile={profile} zh={zh} onBack={onBack} onEdit={profile.isSelf?onEdit:undefined} onCreator={profile.creatorActive&&profile.creatorRoomSlug?onOpenCreator:undefined} onBlock={!profile.isSelf&&authenticated&&!busy?()=>void toggleBlock():undefined} onReport={!profile.isSelf&&authenticated?()=>setReporting(current=>!current):undefined}/>
    {!profile.isSelf&&!authenticated?<p className="notice auth-resume-notice" role="status">{zh?"登录后可屏蔽或举报用户。":"Log in to block or report a user."}</p>:null}
    {reporting?<form className="public-profile-report" onSubmit={(event)=>void submitReport(event)}><h3>{zh?"举报个人资料":"Report profile"}</h3><label>{zh?"原因":"Reason"}<select value={reason} onChange={event=>setReason(event.target.value)}><option value="inappropriate_profile">{zh?"不当资料":"Inappropriate profile"}</option><option value="harassment">{zh?"骚扰或辱骂":"Harassment or abuse"}</option><option value="impersonation">{zh?"冒充他人":"Impersonation"}</option><option value="spam">{zh?"垃圾信息":"Spam"}</option></select></label><label>{zh?"补充说明（可选）":"Details (optional)"}<textarea value={details} maxLength={500} onChange={event=>setDetails(event.target.value)}/></label><div><button type="button" className="secondary" onClick={()=>setReporting(false)}>{zh?"取消":"Cancel"}</button><button disabled={busy}>{zh?"提交举报":"Submit report"}</button></div></form>:null}
    {notice?<p className="notice auth-resume-notice" role="status">{notice}</p>:null}
  </>;
}

function PublicCreatorProfileView({
  room,
  recommendations,
  t,
  back,
  onOpenRoom,
  onFollowingChanged,
  authenticated,
  resumeIntent,
  onRequireAuth,
  onIntentHandled,
}: {
  room: Room;
  recommendations: Room[];
  t: Record<string, string>;
  back: () => void;
  onOpenRoom: (room: Room) => void;
  onFollowingChanged: () => void;
  authenticated: boolean;
  resumeIntent: AuthIntent | null;
  onRequireAuth: (reason: AuthIntentKind) => void;
  onIntentHandled: (message?: string) => void;
}) {
  const [profile, setProfile] = useState<StreamerProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const handledAuthIntentRef = useRef(0);
  const zh = t.title !== "Stream MVP";

  useEffect(() => {
    if (!shareNotice) return;
    const timer = window.setTimeout(() => setShareNotice(""), 4_000);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void Promise.all([
      request(`/api/streamers/${room.streamer_id}`),
      authenticated ? request(`/api/streamers/${room.streamer_id}/follow-status`) : Promise.resolve({ following: false }),
    ])
      .then(([profileResult, followResult]) => {
        if (!active) return;
        setProfile(profileResult.streamer);
        setFollowing(Boolean(followResult.following));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [room.streamer_id, authenticated]);

  async function toggleFollow(forceFollowing?: boolean) {
    if (!authenticated) return onRequireAuth("follow");
    if (!profile) return;
    const nextFollowing = forceFollowing ?? !following;
    const result = await request(`/api/streamers/${profile.id}/follow`, {
      method: nextFollowing ? "POST" : "DELETE",
      ...(nextFollowing ? { body: "{}" } : {}),
    });
    setFollowing(nextFollowing);
    setProfile((current) => current ? {
      ...current,
      follower_count: typeof result?.followerCount === "number"
        ? result.followerCount
        : Math.max(0, current.follower_count + (nextFollowing ? 1 : -1)),
    } : current);
    onFollowingChanged();
  }
  useEffect(() => {
    if (!authenticated || resumeIntent?.kind !== "follow" || !profile || handledAuthIntentRef.current === resumeIntent.id) return;
    handledAuthIntentRef.current = resumeIntent.id;
    void toggleFollow(true)
      .then(() => onIntentHandled(zh ? "登录成功——已关注该主播。" : "Signed in — you are now following this creator."))
      .catch(() => onIntentHandled(zh ? "登录成功，但关注失败，请重试。" : "Signed in, but follow failed. Please try again."));
  }, [authenticated, resumeIntent?.id, profile?.id]);

  if (loading) {
    return (
      <section className="creator-profile-loading" aria-busy="true">
        <span />
        <span />
        <span />
        <p>{zh ? "正在加载主播主页…" : "Loading creator profile…"}</p>
      </section>
    );
  }
  if (error || !profile) {
    return (
      <section className="creator-profile-error">
        <h2>{zh ? "暂时无法加载主播主页" : "Creator profile is unavailable"}</h2>
        <p>{zh ? "请返回发现页后重试。" : "Return to discovery and try again."}</p>
        <button type="button" onClick={back}>{zh ? "返回发现" : "Back to discovery"}</button>
      </section>
    );
  }
  const state = profile.broadcast_status_source === "local" || room.broadcast_status_source === "local"
    ? "offline"
    : profile.broadcast_state ?? room.broadcast_state ?? (room.status === "live" ? "live" : "offline");
  async function shareProfile(copyOnly = false) {
    const outcome = await shareAudienceTarget(audienceShareTarget(room, "creator"), copyOnly);
    setShareNotice(shareOutcomeMessage(outcome, zh));
  }
  return (
    <section className="creator-profile-page">
      <CreatorProfileSurface
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        handle={profile.handle}
        bio={profile.bio}
        languages={profile.languages ?? []}
        tags={profile.tags ?? []}
        followerCount={profile.follower_count}
        scheduleText={profile.schedule_text}
        nextStreamAt={profile.next_stream_at}
        scheduleTimezone={profile.schedule_timezone}
        roomTitle={room.title}
        state={state}
        following={following}
        zh={zh}
        onBack={back}
        onFollow={() => void toggleFollow()}
        onOpenRoom={() => onOpenRoom(room)}
        onShare={() => void shareProfile()}
      />
      {shareNotice ? <p className="notice auth-resume-notice share-notice" role="status">{shareNotice}</p> : null}
      {recommendations.length ? (
        <section className="creator-profile-recommendations" aria-labelledby="profile-recommendations-title">
          <h2 id="profile-recommendations-title">{zh ? "更多主播" : "More creators"}</h2>
          <div className="live-stream-grid">
            {recommendations.slice(0, 4).map((item, index) => (
              <LiveStreamCard key={item.slug} room={item} index={index} t={t} zh={zh} onOpen={(selected) => onOpenRoom(selected as Room)} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function RoomCreatorProfileCard({
  streamerId,
  fallbackName,
  broadcastState,
  onOpenProfile,
  t,
}: {
  streamerId: string;
  fallbackName: string;
  broadcastState?: "live" | "connecting" | "offline" | "unavailable";
  onOpenProfile: () => void;
  t: Record<string, string>;
}) {
  const [profile, setProfile] = useState<StreamerProfile | null>(null);
  useEffect(() => {
    void request(`/api/streamers/${streamerId}`)
      .then((d) => setProfile(d.streamer))
      .catch(() => setProfile(null));
  }, [streamerId]);
  if (!profile) return null;
  return (
    <aside className="creator-profile" aria-label={`${fallbackName} profile`}>
      <p className="eyebrow">
        {broadcastState === "live"
          ? t.stateLive
          : broadcastState === "connecting"
            ? t.connectingBroadcast
            : broadcastState === "unavailable"
              ? t.unavailableBroadcast
              : t.offline}
      </p>
      <h3>{profile.display_name}</h3>
      <p>{profile.bio}</p>
      <div>
        {profile.languages?.length ? <span>{profile.languages.map((item) => item.nameNative || item.nameEn).join(" · ")}</span> : null}
        <span>
          {profile.follower_count} {t.followers}
        </span>
        <span>{profile.schedule_text}</span>
        {profile.next_stream_at ? (
          <span>
            {t.title === "Stream MVP" ? "Next" : "下一场"}: {new Date(profile.next_stream_at).toLocaleString(t.title === "Stream MVP" ? "en-US" : "zh-CN", { timeZone: profile.schedule_timezone || undefined })}
          </span>
        ) : null}
      </div>
      <div className="creator-profile-card-actions">
        <button type="button" className="secondary" onClick={onOpenProfile}>
          {t.title === "Stream MVP" ? "View full profile" : "查看完整主页"}
        </button>
      </div>
    </aside>
  );
}
function PrivateShowStatus({
  show,
  t,
}: {
  show: any;
  t: Record<string, string>;
}) {
  const [now, setNow] = useState(Date.now());
  const expiresAt = show?.session?.expiresAt as string | null | undefined;
  useEffect(() => {
    if (!expiresAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  if (!show?.active) return null;
  const remaining = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000))
    : null;
  const hasAccess = Boolean(show.session?.hasAccess) && remaining !== 0;
  return (
    <aside
      className={`private-status ${hasAccess ? "access-active" : "access-locked"}`}
    >
      <p className="eyebrow">
        {t.privateShow} ·{" "}
        {show.session.mode === "ticket" ? t.ticket : t.perMinute}
      </p>
      <strong>
        {hasAccess ? t.privateAccessActive : t.privateAccessLocked}
      </strong>
      <span>
        {show.session.mode === "ticket"
          ? `${show.session.ticket_cost} ${t.coins}`
          : `${show.session.per_minute_cost} ${t.coins}`}
      </span>
      {hasAccess && remaining !== null && (
        <span>
          {t.accessEnds} {remaining}s
        </span>
      )}
    </aside>
  );
}
function RoomView({
  room,
  recommendations,
  back,
  onOpenRoom,
  onOpenProfile,
  t,
  authenticated,
  resumeIntent,
  onRequireAuth,
  onIntentHandled,
}: {
  room: Room;
  recommendations: Room[];
  back: () => void;
  onOpenRoom: (room: Room) => void;
  onOpenProfile: () => void;
  t: Record<string, string>;
  authenticated: boolean;
  resumeIntent: AuthIntent | null;
  onRequireAuth: (reason: AuthIntentKind) => void;
  onIntentHandled: (message?: string) => void;
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [playerMessage, setPlayerMessage] = useState(t.preparing);
  const [messages, setMessages] = useState<any[]>([]);
  const [presence, setPresence] = useState(0);
  const [chatStatus, setChatStatus] = useState(t.connecting);
  const [draft, setDraft] = useState("");
  const [wallet, setWallet] = useState<number | null>(null);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [selectedGiftId, setSelectedGiftId] = useState("");
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [activeGift, setActiveGift] = useState<any | null>(null);
  const [sendingGift, setSendingGift] = useState(false);
  const [actions, setActions] = useState<any[]>([]);
  const [goalProgress, setGoalProgress] = useState<any>(null);
  const [supportFeed, setSupportFeed] = useState<any[]>([]);
  const [giftNotice, setGiftNotice] = useState("");
  const [giftSoundEnabled, setGiftSoundEnabled] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [following, setFollowing] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"chat" | "gifts" | null>(null);
  const [show, setShow] = useState<any>(null);
  const [broadcast, setBroadcast] = useState<any>({
    state: room.broadcast_state ?? "offline",
    message: room.broadcast_status_message ?? t.offline,
    source: room.broadcast_status_source ?? "cloudflare",
    checkedAt: room.broadcast_checked_at ?? null,
    transport: room.broadcast_transport ?? "obs_hls",
  });
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const giftTimerRef = useRef(0);
  const handledAuthIntentRef = useRef(0);
  const supportAvailable = broadcast.state === "live" && broadcast.source !== "local";
  useEffect(() => {
    if (!shareNotice) return;
    const timer = window.setTimeout(() => setShareNotice(""), 4_000);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);
  const refreshShow = () =>
    void request(`/api/rooms/${room.slug}/private-show`).then(setShow);
  const refreshWallet = () => {
    if (!authenticated) return;
    void request("/api/wallet").then((d) => setWallet(d.balance));
    void request("/api/wallet/history").then((d) =>
      setWalletHistory(d.entries),
    );
  };
  const refreshBroadcast = () =>
    void request(`/api/rooms/${room.slug}/broadcast`).then((d) =>
      setBroadcast(d.broadcast),
    );
  const refreshActions = () =>
    void request(`/api/rooms/${room.slug}/actions`).then((d) => {
      setActions(d.actions);
      setGoalProgress(d.goal);
    });
  const refreshSupportFeed = () =>
    void request(`/api/rooms/${room.slug}/support-feed`).then((d) =>
      setSupportFeed(d.support),
    );
  const refreshPlayback = () =>
    broadcast.state !== "live" || broadcast.source === "local"
      ? setIframeUrl(null)
      : broadcast.transport === "browser_webrtc"
        ? setIframeUrl(null)
      : void request(`/api/rooms/${room.slug}/playback`)
          .then((d) => setIframeUrl(d.iframeUrl))
          .catch((e) =>
            setPlayerMessage(e.message === "403" ? t.privateLocked : t.offline),
          );
  useEffect(() => {
    setPlayerMessage(t.preparing);
    setChatStatus(t.connecting);
  }, [t]);
  useEffect(() => {
    setMobileSheet(null);
    refreshBroadcast();
    if (authenticated) void request(`/api/streamers/${room.streamer_id}/follow-status`).then((data) =>
      setFollowing(data.following),
    );
    if(!supportAvailable)return;
    if (authenticated) void request(`/api/rooms/${room.slug}/visit`, {
      method: "POST",
      body: "{}",
    });
    refreshPlayback();
    refreshShow();
    refreshWallet();
    if (authenticated) void request("/api/gifts").then((d) => {
      setGifts(d.gifts);
      setSelectedGiftId((current) => current || d.gifts[0]?.id || "");
    });
    refreshActions();
    refreshSupportFeed();
  }, [room.slug, authenticated,supportAvailable]);
  useEffect(()=>{if(supportAvailable)void request(`/api/rooms/${room.slug}/chat-history`).then((d)=>setMessages(d.messages));else{setMessages([]);setPresence(0);setChatStatus(t.offline);}},[room.slug,supportAvailable,t.offline]);
  useEffect(() => {
    refreshPlayback();
  }, [broadcast.state, room.slug]);
  useEffect(() => {
    const expiry = show?.session?.expiresAt;
    if (!expiry) return;
    const delay = new Date(expiry).getTime() - Date.now() + 150;
    const timer = window.setTimeout(
      () => {
        refreshShow();
        refreshPlayback();
      },
      Math.max(delay, 0),
    );
    return () => window.clearTimeout(timer);
  }, [show?.session?.expiresAt, room.slug]);
  useEffect(() => {
    if(!supportAvailable){setPresence(0);setMessages([]);setChatStatus(t.offline);socketRef.current=null;return;}
    const socket = io({ transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setChatStatus(t.joining);
      socket.emit("room:join", room.slug, (result: { error?: string }) =>
        setChatStatus(
          result?.error ? `${t.unavailable}: ${result.error}` : t.connected,
        ),
      );
    });
    socket.on("connect_error", () => setChatStatus(t.unavailable));
    socket.on("room:presence", (d: { count: number }) => setPresence(d.count));
    socket.on("chat:message", (d) => setMessages((items) => [...items, d]));
    socket.on("chat:deleted", ({ messageId }: { messageId: string }) =>
      setMessages((items) => items.filter((message) => message.id !== messageId)),
    );
    socket.on(
      "moderation:action",
      (d: { action?: string; targetId?: string }) => {
        if (
          d.targetId === audienceId &&
          ["mute", "ban", "creator_mute"].includes(d.action ?? "")
        )
          setChatStatus(`${t.unavailable}: ${d.action}`);
      },
    );
    socket.on("gift:sent", (d) => {
      if (giftSoundEnabled) playGiftTone(d.animationTier);
      window.clearTimeout(giftTimerRef.current);
      setActiveGift(d);
      giftTimerRef.current = window.setTimeout(() => setActiveGift(null), 6_000);
      setGiftNotice(
        `${d.sender} ${t.send} ${t.title === "Stream MVP" ? d.nameEn ?? d.name : d.nameZh ?? d.name}${d.quantity > 1 ? ` ×${d.quantity}` : ""}${d.comboCount > 1 ? ` · COMBO ×${d.comboCount}` : ""}`,
      );
      if (d.goal) setGoalProgress(d.goal);
      refreshSupportFeed();
    });
    socket.on("gift:acknowledged", (d) => {
      setGiftNotice(
        t.title === "Stream MVP"
          ? `${d.creator} thanked ${d.sender} for the gift.`
          : `${d.creator} 感谢了 ${d.sender} 的礼物。`,
      );
    });
    socket.on("action:purchased", (d) => {
      setGiftNotice(
        `${d.sender} ${t.title === "Stream MVP" ? "supported" : "\u652f\u6301\u4e86"} ${d.title}`,
      );
      if (d.goal) setGoalProgress(d.goal);
      refreshSupportFeed();
    });
    socket.on(
      "broadcast:state",
      (d: {
        state: "live" | "connecting" | "offline" | "unavailable";
        message: string;
        source?: "local" | "cloudflare";
        transport?: "obs_hls" | "browser_webrtc";
      }) => {
        setBroadcast({
          state: d.state,
          message: d.message,
          source: d.source ?? broadcast.source,
          checkedAt: new Date().toISOString(),
          transport: d.transport ?? broadcast.transport,
        });
        if (d.state !== "live") setIframeUrl(null);
      },
    );
    return () => {
      window.clearTimeout(giftTimerRef.current);
      socket.disconnect();
    };
  }, [room.slug, t, giftSoundEnabled, supportAvailable]);
  function send() {
    if (!authenticated) {
      onRequireAuth("chat");
      return;
    }
    if (draft.trim() && socketRef.current?.connected) {
      socketRef.current.emit(
        "chat:send",
        {
          roomSlug: room.slug,
          body: draft.trim(),
        },
        (result: { error?: string }) => {
          if (result?.error) setChatStatus(`${t.unavailable}: ${result.error}`);
        },
      );
      setDraft("");
    }
  }
  async function shareRoom(copyOnly = false) {
    const outcome = await shareAudienceTarget(audienceShareTarget(room, "room"), copyOnly);
    setShareNotice(shareOutcomeMessage(outcome, t.title !== "Stream MVP"));
  }
  async function sendGift(gift: any) {
    if (!authenticated) return onRequireAuth("gift");
    const total = gift.coin_cost * giftQuantity;
    const highValue = total >= 1_000;
    if (
      highValue &&
      !window.confirm(
        t.title === "Stream MVP"
          ? `Confirm this gift: ${giftQuantity} × ${gift.name_en} = ${total.toLocaleString()} R. No real money is charged.`
          : `确认礼物：${giftQuantity} × ${gift.name_zh} = ${total.toLocaleString()} R。不会产生真实扣款。`,
      )
    )
      return;
    setSendingGift(true);
    try {
      const d = await request(`/api/rooms/${room.slug}/gifts`, {
        method: "POST",
        body: JSON.stringify({
          giftId: gift.id,
          quantity: giftQuantity,
          confirmedHighValue: highValue,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (!d.duplicate)
        setGiftNotice(
          t.title === "Stream MVP"
            ? `Sent ${gift.symbol} ${gift.name_en} ×${giftQuantity}`
            : `已送出 ${gift.symbol} ${gift.name_zh} ×${giftQuantity}`,
        );
      refreshWallet();
    } catch (error) {
      setGiftNotice(
        (error as Error).message === "409"
          ? t.title === "Stream MVP"
            ? "Not enough R for this gift."
            : "R 余额不足。"
          : t.title === "Stream MVP"
            ? "The test gift could not be sent. Please try again."
            : "测试礼物发送失败，请重试。",
      );
    } finally {
      setSendingGift(false);
    }
  }
  async function purchaseAction(id: string) {
    if (!authenticated) return onRequireAuth("action");
    const d = await request(`/api/rooms/${room.slug}/actions/${id}/purchase`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    });
    if (!d.duplicate)
      setGiftNotice(
        `${t.title === "Stream MVP" ? "Action supported" : "\u5df2\u652f\u6301\u52a8\u4f5c"}: ${d.action.title}`,
      );
    if (d.action?.goal) setGoalProgress(d.action.goal);
    refreshWallet();
    refreshSupportFeed();
  }
  async function buyAccess() {
    if (!authenticated) return onRequireAuth("private-access");
    const d = await request(`/api/rooms/${room.slug}/private-show/purchase`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    });
    setGiftNotice(`${t.buyAccess}: ${d.cost}`);
    refreshWallet();
    refreshShow();
    refreshPlayback();
  }
  async function follow(forceFollowing?: boolean) {
    if (!authenticated) return onRequireAuth("follow");
    const nextFollowing = forceFollowing ?? !following;
    await request(`/api/streamers/${room.streamer_id}/follow`, {
      method: nextFollowing ? "POST" : "DELETE",
      ...(nextFollowing ? { body: "{}" } : {}),
    });
    setFollowing(nextFollowing);
  }
  async function report() {
    if (!authenticated) return onRequireAuth("report");
    await request(`/api/rooms/${room.slug}/reports`, {
      method: "POST",
      body: JSON.stringify({ reason: "Local test report" }),
    });
    setGiftNotice(t.reportSent);
  }
  useEffect(() => {
    if (!authenticated || !resumeIntent || handledAuthIntentRef.current === resumeIntent.id) return;
    if (!["follow", "chat", "gift", "action", "private-access", "report"].includes(resumeIntent.kind)) return;
    handledAuthIntentRef.current = resumeIntent.id;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (resumeIntent.kind === "follow") {
      void follow(true)
        .then(() => onIntentHandled(t.title === "Stream MVP" ? "Signed in — you are now following this creator." : "登录成功——已关注该主播。"))
        .catch(() => onIntentHandled(t.title === "Stream MVP" ? "Signed in, but follow failed. Please try again." : "登录成功，但关注失败，请重试。"));
      return;
    }
    if (resumeIntent.kind === "chat") {
      if (mobile) setMobileSheet("chat");
      window.setTimeout(() => document.querySelector<HTMLInputElement>(mobile ? "#room-chat-input-sheet" : "#room-chat-input")?.focus(), 0);
      onIntentHandled(t.title === "Stream MVP" ? "Signed in — your message is still here. Review it, then send." : "登录成功——消息仍在，请确认后发送。");
      return;
    }
    if (resumeIntent.kind === "gift") {
      if (supportAvailable) {
        if (mobile) setMobileSheet("gifts");
        else window.setTimeout(() => document.querySelector("#room-gifts")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      }
      onIntentHandled(supportAvailable
        ? t.title === "Stream MVP" ? "Signed in — choose a gift. Nothing has been sent." : "登录成功——请选择礼物，系统尚未发送任何礼物。"
        : t.title === "Stream MVP" ? "Signed in. Gifts will be available when the creator is live." : "登录成功。主播开播后可使用礼物。"
      );
      return;
    }
    if (resumeIntent.kind === "action") {
      if (supportAvailable) window.setTimeout(() => {
        document.querySelector(".support-actions")?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.querySelector<HTMLButtonElement>(".viewer-actions button")?.focus();
      }, 0);
      onIntentHandled(supportAvailable
        ? t.title === "Stream MVP" ? "Signed in — review the action before purchasing." : "登录成功——请确认动作后再购买。"
        : t.title === "Stream MVP" ? "Signed in. Actions are available only during a live stream." : "登录成功。动作仅在直播期间可用。"
      );
      return;
    }
    if (resumeIntent.kind === "private-access") {
      window.setTimeout(() => document.querySelector<HTMLButtonElement>(".room-private-button")?.focus(), 0);
      onIntentHandled(t.title === "Stream MVP" ? "Signed in — review private access before purchasing. Nothing was charged." : "登录成功——请确认私密访问，系统尚未扣除任何 R。");
      return;
    }
    window.setTimeout(() => {
      const menu = document.querySelector<HTMLDetailsElement>(".room-more-actions, .mobile-room-more");
      if (menu) menu.open = true;
      document.querySelector<HTMLButtonElement>('[data-auth-action="report"]')?.focus();
    }, 0);
    onIntentHandled(t.title === "Stream MVP" ? "Signed in — review Report and submit it when ready." : "登录成功——请确认后再提交举报。");
  }, [authenticated, resumeIntent?.id, supportAvailable, room.slug]);
  if(!supportAvailable)return <section className="workspace audience-room offline-room-simple">
    <button className="secondary room-back" onClick={back}>{t.back}</button>
    <div className="offline-room-card">
      <CreatorAvatar name={room.streamer_name} url={room.avatar_url} className="offline-room-avatar" />
      <div className="offline-room-copy">
        <h2>{room.streamer_name} {t.title === "Stream MVP" ? "is offline" : "当前离线"}</h2>
        <p>{following?(t.title === "Stream MVP"?"You’re following this creator.":"您已关注该主播。"):(t.title === "Stream MVP"?"Follow this creator to be notified when they go live.":"关注该主播以接收开播通知。")}</p>
        {room.next_stream_at?<p className="offline-next-stream">{t.title === "Stream MVP"?"Next stream":"下一场直播"}: <time dateTime={room.next_stream_at}>{new Date(room.next_stream_at).toLocaleString()}</time></p>:null}
        <div className="offline-room-actions"><button type="button" onClick={()=>void follow()}>{following?(t.title === "Stream MVP"?"Following":"已关注"):t.follow}</button><button type="button" className="secondary" onClick={onOpenProfile}>{t.title === "Stream MVP"?"View profile":"查看主页"}</button></div>
      </div>
      <details className="room-more-actions"><summary aria-label={t.title === "Stream MVP"?"More actions":"更多操作"}>•••</summary><div><button type="button" onClick={()=>void shareRoom(true)}>{t.title === "Stream MVP"?"Copy room link":"复制直播间链接"}</button><button type="button" data-auth-action="report" onClick={()=>void report()}>{t.report}</button></div></details>
    </div>
    {shareNotice?<p className="offline-room-toast" role="status">{shareNotice}</p>:null}
  </section>;
  return (
    <section className="workspace audience-room">
      <button className="secondary room-back" onClick={back}>
        {t.back}
      </button>
      <div className="room-media-panel">
        {broadcast.state === "live" && broadcast.source !== "local" &&
        broadcast.transport === "browser_webrtc" ? (
          <>
            <p className="watching-live">
              {t.title === "Stream MVP"
                ? "You are watching the creator’s browser broadcast."
                : "您正在观看主播的浏览器直播。"}
            </p>
            <WhepPlayer slug={room.slug} active t={t} />
          </>
        ) : iframeUrl && broadcast.state === "live" && broadcast.source !== "local" ? (
          <>
            <p className="watching-live">
              {t.title === "Stream MVP"
                ? "You are watching the creator’s live broadcast."
                : "\u60a8\u6b63\u5728\u89c2\u770b\u4e3b\u64ad\u7684\u76f4\u64ad\u3002"}
            </p>
            <iframe
              className="player"
              title="Cloudflare Stream playback"
              src={iframeUrl}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </>
        ) : (
          <div className="player-placeholder">
            {broadcast.source === "local"
              ? (t.title === "Stream MVP" ? `Simulated ${broadcast.state}: no media is being published.` : `模拟${broadcast.state}：此状态不会发布视频。`)
              : broadcast.state === "connecting"
              ? t.connectingBroadcast
              : broadcast.state === "unavailable"
                ? t.unavailableBroadcast
                : broadcast.message || playerMessage}
          </div>
        )}
        {supportAvailable?<VideoActivityOverlay messages={messages} gift={activeGift} t={t} />:null}
        <MobileRoomOverlay
          creatorName={room.streamer_name}
          avatarUrl={room.avatar_url}
          title={room.title}
          state={broadcast.state}
          stateLabel={broadcastLabel(t, broadcast.state)}
          presence={presence}
          presenceLabel={t.inRoom}
          following={following}
          backLabel={t.back}
          followLabel={t.follow}
          unfollowLabel={t.title === "Stream MVP" ? "Unfollow" : "取消关注"}
          chatLabel={t.liveChat}
          giftLabel={t.title === "Stream MVP" ? "Gift" : "礼物"}
          shareLabel={t.title === "Stream MVP" ? "Share" : "分享"}
          giftEnabled={supportAvailable}
          chatEnabled={supportAvailable}
          moreLabel={t.title === "Stream MVP" ? "More stream actions" : "更多直播操作"}
          reportLabel={t.report}
          privateAccessLabel={supportAvailable && show?.active && !show.session.hasAccess ? t.buyAccess : undefined}
          profileLabel={t.title === "Stream MVP" ? `Open ${room.streamer_name} profile` : `打开 ${room.streamer_name} 的主页`}
          onBack={back}
          onFollow={() => void follow()}
          onProfile={onOpenProfile}
          onChat={() => setMobileSheet("chat")}
          onGift={() => authenticated ? setMobileSheet("gifts") : onRequireAuth("gift")}
          onShare={() => void shareRoom()}
          onReport={() => void report()}
          onBuyPrivateAccess={supportAvailable && show?.active && !show.session.hasAccess ? () => void buyAccess() : undefined}
        />
      </div>
      <RoomCreatorBar
        creatorName={room.streamer_name}
        avatarUrl={room.avatar_url}
        ariaLabel={t.title === "Stream MVP" ? `${room.streamer_name} stream information` : `${room.streamer_name} 的直播信息`}
        title={room.title}
        languages={room.languages ?? []}
        tags={room.tags ?? []}
        state={broadcast.state}
        stateLabel={broadcastLabel(t, broadcast.state)}
        presence={presence}
        showPresence={supportAvailable}
        presenceLabel={t.inRoom}
        following={following}
        followLabel={t.follow}
        unfollowLabel={t.title === "Stream MVP" ? "Unfollow" : "取消关注"}
        giftLabel={t.title === "Stream MVP" ? "Send gift" : "赠送礼物"}
        shareLabel={t.title === "Stream MVP" ? "Share" : "分享"}
        copyLabel={t.title === "Stream MVP" ? "Copy link" : "复制链接"}
        giftEnabled={supportAvailable}
        reportLabel={t.report}
        moreLabel={t.title === "Stream MVP" ? "More stream actions" : "更多直播操作"}
        privateAccessLabel={supportAvailable && show?.active && !show.session.hasAccess ? t.buyAccess : undefined}
        privateAccessCost={supportAvailable && show?.active && !show.session.hasAccess ? (show.session.mode === "ticket" ? show.session.ticket_cost : show.session.per_minute_cost) : undefined}
        profileLabel={t.title === "Stream MVP" ? `Open ${room.streamer_name} profile` : `打开 ${room.streamer_name} 的主页`}
        onFollow={() => void follow()}
        onGift={() => authenticated ? document.querySelector("#room-gifts")?.scrollIntoView({ behavior: "smooth" }) : onRequireAuth("gift")}
        onShare={() => void shareRoom()}
        onCopy={() => void shareRoom(true)}
        onProfile={onOpenProfile}
        onReport={() => void report()}
        onBuyPrivateAccess={supportAvailable && show?.active && !show.session.hasAccess ? () => void buyAccess() : undefined}
      />
      {shareNotice ? <p className="notice auth-resume-notice share-notice room-share-notice" role="status">{shareNotice}</p> : null}
      {!supportAvailable ? (
        <aside className="room-offline-guidance" role="status">
          <div>
            <p className="eyebrow">{t.title === "Stream MVP" ? "CREATOR OFFLINE" : "主播离线"}</p>
            <strong>{following?(t.title === "Stream MVP" ? "You’re following this creator. We’ll let you know when they go live." : "您已关注该主播，开播时我们会通知您。"):(t.title === "Stream MVP" ? "Follow this creator to be notified when they go live." : "关注主播以接收开播通知。")}</strong>
          </div>
          <div className="offline-room-actions"><button type="button" className="secondary" onClick={onOpenProfile}>{t.title === "Stream MVP" ? "View schedule" : "查看日程"}</button><button type="button" onClick={back}>{t.title === "Stream MVP" ? "Browse live streams" : "浏览直播"}</button></div>
        </aside>
      ) : null}
      {supportAvailable && room.goal_text && !goalProgress && (
        <aside className="room-goal room-goal-compact">
          <p className="eyebrow">{t.goal}</p>
          <strong>{room.goal_text}</strong>
        </aside>
      )}
      {supportAvailable && goalProgress && (
        <aside className="support-actions">
          <div>
            <p className="eyebrow">
              {t.title === "Stream MVP"
                ? "Support / Actions"
                : "\u652f\u6301 / \u52a8\u4f5c"}
            </p>
            <strong>{goalProgress.goal_text}</strong>
          </div>
          <div className="goal-progress">
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min(100, Math.round((goalProgress.goal_progress / goalProgress.goal_target) * 100))}%`,
                }}
              />
            </div>
            <small>
              {goalProgress.goal_progress} / {goalProgress.goal_target}{" "}
              {t.coins}
            </small>
          </div>
          <div className="viewer-actions">
            {actions.length ? (
              actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => void purchaseAction(action.id)}
                >
                  <strong>{action.title}</strong>
                  <span>
                    {action.coin_cost} {t.coins}
                    {action.duration_label ? ` · ${action.duration_label}` : ""}
                  </span>
                </button>
              ))
            ) : (
              <p className="muted">
                {t.title === "Stream MVP"
                  ? "No actions are active right now."
                  : "\u6682\u65e0\u5df2\u542f\u7528\u52a8\u4f5c\u3002"}
              </p>
            )}
          </div>
        </aside>
      )}
      {supportAvailable ? <aside className="public-support-feed">
        <p className="eyebrow">
          {t.title === "Stream MVP"
            ? "Recent support"
            : "\u6700\u8fd1\u652f\u6301"}
        </p>
        {supportFeed.length ? (
          supportFeed.map((item, index) => (
            <p key={`${item.created_at}-${index}`}>
              <strong>{item.sender}</strong> ·{" "}
              <span className={`support-kind ${item.support_type}`}>
                {item.support_type === "gift"
                  ? t.title === "Stream MVP"
                    ? "Gift"
                    : "\u793c\u7269"
                  : t.title === "Stream MVP"
                    ? "Action"
                    : "\u52a8\u4f5c"}
              </span>{" "}
              · {item.label} · {item.coin_cost} {t.coins}
            </p>
          ))
        ) : (
          <p className="muted">
            {t.title === "Stream MVP"
              ? "No support activity yet."
              : "\u6682\u65e0\u652f\u6301\u52a8\u6001\u3002"}
          </p>
        )}
      </aside> : null}
      <RoomCreatorProfileCard
        streamerId={room.streamer_id}
        fallbackName={room.streamer_name}
        broadcastState={broadcast.state}
        onOpenProfile={onOpenProfile}
        t={t}
      />
      {supportAvailable ? <PrivateShowStatus show={show} t={t} /> : null}
      {supportAvailable && authenticated ? <section className="room-gift-tray desktop-room-gifts" id="room-gifts">
        <div className="gift-tray-heading">
          <div>
            <p className="eyebrow">{t.title === "Stream MVP" ? "Send a gift" : "赠送礼物"}</p>
            <strong>{t.title === "Stream MVP" ? "Support this creator" : "支持这位主播"}</strong>
          </div>
          <div className="test-wallet-balance">
            <span>{t.title === "Stream MVP" ? "R balance" : "R 余额"}</span>
            <strong>{wallet?.toLocaleString() ?? "…"}</strong>
          </div>
          <button type="button" className="secondary gift-sound-toggle" aria-pressed={giftSoundEnabled} onClick={() => setGiftSoundEnabled((current) => !current)}>{giftSoundEnabled ? (t.title === "Stream MVP" ? "Gift sounds: on" : "礼物提示音：开") : (t.title === "Stream MVP" ? "Gift sounds: off" : "礼物提示音：关")}</button>
        </div>
        <p className="gift-token-note">
          {t.title === "Stream MVP"
            ? "R has no cash value · no cashout or real-money redemption"
            : "R 没有现金价值 · 不支持提现或真实货币兑换"}
        </p>
        <div
          className="gift-catalog"
          aria-label={t.title === "Stream MVP" ? "Gift catalog" : "礼物目录"}
        >
          {gifts.map((gift) => (
            <button
              type="button"
              key={gift.id}
              className={`gift-card ${selectedGiftId === gift.id ? "selected" : ""} tier-${gift.animation_tier}`}
              aria-pressed={selectedGiftId === gift.id}
              aria-label={`${t.title === "Stream MVP" ? gift.name_en : gift.name_zh}, ${gift.coin_cost.toLocaleString()} ${t.coins}`}
              onClick={() => setSelectedGiftId(gift.id)}
            >
              <span className="gift-card-symbol" aria-hidden="true">{gift.symbol}</span>
              <strong className="gift-card-name">{t.title === "Stream MVP" ? gift.name_en : gift.name_zh}</strong>
              <span className="gift-card-price">{gift.coin_cost.toLocaleString()} {t.coins}</span>
            </button>
          ))}
        </div>
        {(() => {
          const selected = gifts.find((gift) => gift.id === selectedGiftId);
          if (!selected) return null;
          const total = selected.coin_cost * giftQuantity;
          return (
            <div className="gift-checkout">
              <label>
                {t.title === "Stream MVP" ? "Quantity" : "数量"}
                <select value={giftQuantity} onChange={(event) => setGiftQuantity(Number(event.target.value))}>
                  <option value="1">×1</option>
                  <option value="5">×5</option>
                  <option value="10">×10</option>
                </select>
              </label>
              <div>
                <span>{t.title === "Stream MVP" ? "Total" : "合计"}</span>
                <strong>{total.toLocaleString()} {t.coins}</strong>
                <small>{total.toLocaleString()} R</small>
              </div>
              <button
                type="button"
                className="gift-send-button"
                disabled={sendingGift || wallet === null || wallet < total}
                onClick={() => void sendGift(selected)}
              >
                <span aria-hidden="true">{selected.symbol}</span>
                {sendingGift
                  ? t.title === "Stream MVP" ? "Sending…" : "发送中…"
                  : t.title === "Stream MVP" ? "Send gift" : "赠送礼物"}
              </button>
            </div>
          );
        })()}
        {giftNotice && <p className="gift-notice" role="status">{giftNotice}</p>}
      </section> : null}
      {supportAvailable && authenticated ? <aside className="wallet-history room-wallet">
        <p className="eyebrow">
          {t.title === "Stream MVP" ? "Recent test activity" : "最近测试记录"}
        </p>
        {walletHistory
          .filter((entry) => entry.reference_type !== "seed")
          .slice(0, 4)
          .map((entry, index) => (
            <p key={index}>
              {entry.entry_type} · {entry.amount > 0 ? "+" : ""}
              {entry.amount} {t.coins}
            </p>
          ))}
      </aside> : null}
      {supportAvailable?<LiveChatPanel
        title={t.liveChat}
        status={chatStatus}
        presence={presence}
        presenceLabel={t.inRoom}
        messages={messages}
        draft={draft}
        placeholder={t.message}
        sendLabel={t.send}
        giftLabel={t.title === "Stream MVP" ? "Send a gift" : "赠送礼物"}
        giftEnabled={supportAvailable}
        emptyLabel={t.title === "Stream MVP" ? "Be the first to say hello." : "来发送第一条消息吧。"}
        onDraftChange={setDraft}
        onSend={send}
        onGift={() => authenticated ? document.querySelector("#room-gifts")?.scrollIntoView({ behavior: "smooth" }) : onRequireAuth("gift")}
        className="desktop-room-chat"
      />:null}
      <section className="mobile-room-recommendations" aria-labelledby="mobile-room-next-title">
        <div className="mobile-room-next-heading">
          <p className="eyebrow">{t.title === "Stream MVP" ? "Keep watching" : "继续观看"}</p>
          <h2 id="mobile-room-next-title">{t.title === "Stream MVP" ? "Discover another creator" : "发现其他主播"}</h2>
        </div>
        <div>
          {recommendations.slice(0, 3).map((item, index) => (
            <LiveStreamCard
              key={item.slug}
              room={item}
              index={index + 1}
              t={t}
              zh={t.title !== "Stream MVP"}
              onOpen={(selected) => onOpenRoom(selected as Room)}
            />
          ))}
        </div>
      </section>
      <BottomSheet
        open={supportAvailable && mobileSheet === "chat"}
        title={t.liveChat}
        description={`${chatStatus} · ${presence} ${t.inRoom}`}
        closeLabel={t.title === "Stream MVP" ? "Close live chat" : "关闭直播聊天"}
        onClose={() => setMobileSheet(null)}
      >
        <LiveChatPanel
          title={t.liveChat}
          status={chatStatus}
          presence={presence}
          presenceLabel={t.inRoom}
          messages={messages}
          draft={draft}
          placeholder={t.message}
          sendLabel={t.send}
          giftLabel={t.title === "Stream MVP" ? "Send a gift" : "赠送礼物"}
          giftEnabled={supportAvailable}
          emptyLabel={t.title === "Stream MVP" ? "Be the first to say hello." : "来发送第一条消息吧。"}
          onDraftChange={setDraft}
          onSend={send}
          onGift={() => authenticated ? setMobileSheet("gifts") : onRequireAuth("gift")}
          className="room-chat-sheet"
          inputId="room-chat-input-sheet"
        />
      </BottomSheet>
      <BottomSheet
        open={authenticated && supportAvailable && mobileSheet === "gifts"}
        title={t.title === "Stream MVP" ? "Send a gift" : "赠送礼物"}
        description={t.title === "Stream MVP" ? "R has no cash value · no real-money charge" : "R 没有现金价值 · 不会产生真实扣款"}
        closeLabel={t.title === "Stream MVP" ? "Close gift picker" : "关闭礼物选择器"}
        onClose={() => setMobileSheet(null)}
      >
        <div className="mobile-gift-sheet-content">
          <div className="gift-tray-heading">
            <div>
              <p className="eyebrow">{t.title === "Stream MVP" ? "Choose a gift" : "选择礼物"}</p>
              <strong>{t.title === "Stream MVP" ? "Support this creator" : "支持这位主播"}</strong>
            </div>
            <div className="test-wallet-balance">
              <span>{t.title === "Stream MVP" ? "R balance" : "R 余额"}</span>
              <strong>{wallet?.toLocaleString() ?? "…"}</strong>
            </div>
          </div>
          <div className="gift-catalog" aria-label={t.title === "Stream MVP" ? "Mobile gift catalog" : "移动礼物目录"}>
            {gifts.map((gift) => (
              <button
                type="button"
                key={gift.id}
                className={`gift-card ${selectedGiftId === gift.id ? "selected" : ""} tier-${gift.animation_tier}`}
                aria-pressed={selectedGiftId === gift.id}
                aria-label={`${t.title === "Stream MVP" ? gift.name_en : gift.name_zh}, ${gift.coin_cost.toLocaleString()} ${t.coins}`}
                onClick={() => setSelectedGiftId(gift.id)}
              >
                <span className="gift-card-symbol" aria-hidden="true">{gift.symbol}</span>
                <strong className="gift-card-name">{t.title === "Stream MVP" ? gift.name_en : gift.name_zh}</strong>
                <span className="gift-card-price">{gift.coin_cost.toLocaleString()} {t.coins}</span>
              </button>
            ))}
          </div>
          {(() => {
            const selected = gifts.find((gift) => gift.id === selectedGiftId);
            if (!selected) return null;
            const total = selected.coin_cost * giftQuantity;
            return (
              <div className="gift-checkout">
                <label>
                  {t.title === "Stream MVP" ? "Quantity" : "数量"}
                  <select value={giftQuantity} onChange={(event) => setGiftQuantity(Number(event.target.value))}>
                    <option value="1">×1</option><option value="5">×5</option><option value="10">×10</option>
                  </select>
                </label>
                <div><span>{t.title === "Stream MVP" ? "Total" : "合计"}</span><strong>{total.toLocaleString()} {t.coins}</strong></div>
                <button type="button" className="gift-send-button" disabled={sendingGift || wallet === null || wallet < total} onClick={() => void sendGift(selected)}>
                  <span aria-hidden="true">{selected.symbol}</span>{sendingGift ? (t.title === "Stream MVP" ? "Sending…" : "发送中…") : (t.title === "Stream MVP" ? "Send gift" : "赠送礼物")}
                </button>
              </div>
            );
          })()}
          {giftNotice ? <p className="gift-notice" role="status">{giftNotice}</p> : null}
        </div>
      </BottomSheet>
    </section>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />{" "}
  </StrictMode>,
);
