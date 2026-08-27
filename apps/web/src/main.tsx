import {
  StrictMode,
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
  stopMediaStream,
  type WebRtcController,
} from "./webrtc";
import "./styles.css";

type Role = "audience" | "streamer" | "admin";
type Language = "en" | "zh";
type User = {
  id: string;
  handle: string;
  displayName: string;
  role: Role;
  ageAcknowledged: boolean;
};
type Room = {
  slug: string;
  title: string;
  status: string;
  streamer_id: string;
  streamer_name: string;
  category: string;
  bio?: string;
  schedule_text?: string;
  follower_count?: number;
  goal_text?: string;
  broadcast_state?: "live" | "connecting" | "offline" | "unavailable";
  broadcast_checked_at?: string | null;
  broadcast_status_message?: string;
  broadcast_transport?: "obs_hls" | "browser_webrtc";
};
type StreamerProfile = {
  display_name: string;
  bio: string;
  category: string;
  schedule_text: string;
  follower_count: number;
  room_slug: string | null;
  room_status: string | null;
};
const audienceId = "10000000-0000-4000-8000-000000000001";
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
    search: "Search rooms or streamers",
    allCategories: "All categories",
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
    coins: "Test coins",
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
    search: "搜索直播间或主播",
    allCategories: "全部分类",
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
    coins: "测试金币",
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
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...(options?.body ? { "content-type": "application/json" } : {}),
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
function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [handle, setHandle] = useState("demo-audience");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const t = copy[language];
  const loadRooms = () =>
    void request(
      `/api/rooms?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
    ).then((d) => setRooms(d.rooms));
  useEffect(() => {
    void request("/api/auth/session").then((d) => setUser(d.user));
    void request("/api/discovery/categories").then((d) =>
      setCategories(d.categories),
    );
  }, []);
  useEffect(() => {
    if (user?.role === "audience" && user.ageAcknowledged) loadRooms();
  }, [user, query, category]);
  useEffect(() => {
    if (user?.role !== "audience" || !user.ageAcknowledged) return;
    const socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket.emit("discovery:join"));
    socket.on(
      "discovery:broadcast",
      (event: {
        slug: string;
        state: "live" | "connecting" | "offline" | "unavailable";
        message: string;
        checkedAt: string;
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
                  broadcast_checked_at: event.checkedAt,
                }
              : item,
          ),
        );
      },
    );
    return () => {
      socket.disconnect();
    };
  }, [user?.role, user?.ageAcknowledged]);
  async function login(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      setUser(
        (
          await request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ handle, password }),
          })
        ).user,
      );
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
      setUser(
        (
          await request("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
              handle,
              displayName,
              password,
              locale: language,
            }),
          })
        ).user,
      );
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
    setHandle("");
    setDisplayName("");
    setPassword("");
    setLoginError("");
    setUser(null);
    setRoom(null);
  }
  if (!user)
    return (
      <main className="landing">
        <LanguagePicker language={language} onChange={setLanguage} />
        <p className="eyebrow">{t.local}</p>
        <h1>{t.title}</h1>
        <p className="notice">{t.test}</p>
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={authMode === "login" ? "active" : ""}
            onClick={() => {
              setAuthMode("login");
              setLoginError("");
            }}
          >
            {language === "en" ? "Sign in" : "登录"}
          </button>
          <button
            type="button"
            className={authMode === "register" ? "active" : ""}
            onClick={() => {
              setAuthMode("register");
              setHandle("");
              setLoginError("");
            }}
          >
            {language === "en" ? "Create audience account" : "创建观众账户"}
          </button>
        </div>
        <h2>
          {authMode === "login"
            ? language === "en"
              ? "Sign in"
              : "登录"
            : language === "en"
              ? "Join as an audience member"
              : "注册观众账户"}
        </h2>
        {authMode === "login" && (
          <div className="account-shortcuts">
            {(["audience", "streamer", "admin"] as Role[]).map((role) => (
              <button
                type="button"
                className="secondary"
                key={role}
                onClick={() => setHandle(`demo-${role}`)}
              >
                {roleLabel(t, role)}
              </button>
            ))}
          </div>
        )}
        <form
          className="login-form"
          onSubmit={(e) =>
            void (authMode === "login" ? login(e) : register(e))
          }
        >
          <label>
            {language === "en" ? "Account handle" : "账户名"}
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern={
                authMode === "register" ? "[a-z0-9_]+" : "[a-z0-9_-]+"
              }
              required
            />
          </label>
          {authMode === "register" && (
            <label>
              {language === "en" ? "Display name" : "显示名称"}
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                minLength={2}
                maxLength={50}
                required
              />
            </label>
          )}
          <label>
            {language === "en" ? "Password" : "密码"}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                authMode === "register" ? "new-password" : "current-password"
              }
              minLength={authMode === "register" ? 12 : 8}
              required
            />
          </label>
          {authMode === "register" && (
            <p className="form-help">
              {language === "en"
                ? "Test environment only. Do not use a real password or personal information. New accounts begin with zero test coins."
                : "仅限测试环境。请勿使用真实密码或个人信息。新账户初始测试金币为零。"}
            </p>
          )}
          <button>
            {authMode === "login"
              ? language === "en"
                ? "Sign in"
                : "登录"
              : language === "en"
                ? "Create account"
                : "创建账户"}
          </button>
        </form>
        {loginError && <p className="error">{loginError}</p>}
      </main>
    );
  return (
    <main className={`app role-${user.role}`}>
      <header className="product-header">
        <div className="product-identity">
          <span className="product-mark" aria-hidden="true">
            S
          </span>
          <div>
          <p className="eyebrow">{t.test}</p>
          <h1>{t.title}</h1>
          <p>
            {user.displayName} · {roleLabel(t, user.role)}
          </p>
          </div>
        </div>
        {user.role === "audience" && user.ageAcknowledged && (
          <nav
            className="audience-main-nav"
            aria-label={language === "en" ? "Audience navigation" : "观众导航"}
          >
            <button
              className={!room ? "active" : ""}
              onClick={() => {
                setRoom(null);
                window.scrollTo({ top: 0 });
                void loadRooms();
              }}
            >
              {language === "en" ? "Browse live" : "浏览直播"}
            </button>
            <a href="#audience-library">
              {language === "en" ? "My activity" : "我的动态"}
            </a>
          </nav>
        )}
        <div className="product-account">
          <LanguagePicker language={language} onChange={setLanguage} />
          {user.role === "audience" && <span>{user.displayName}</span>}
          <button className="secondary" onClick={() => void logout()}>
            {t.end}
          </button>
        </div>
      </header>
      {!user.ageAcknowledged ? (
        <section className="age-gate">
          <h2>{t.ageTitle}</h2>
          <p>{t.ageText}</p>
          <button onClick={() => void acknowledge()}>{t.age}</button>
        </section>
      ) : user.role === "audience" ? (
        room ? (
          <RoomView
            room={room}
            back={() => {
              setRoom(null);
              window.scrollTo({ top: 0 });
              loadRooms();
            }}
            t={t}
          />
        ) : (
          <section className="workspace audience-discovery" id="discover">
            <div className="discovery-heading">
              <div>
                <p className="eyebrow">
                  {language === "en" ? "Discover" : "发现"}
                </p>
                <h2>{t.live}</h2>
                <p className="muted">
                  {language === "en"
                    ? "Find a room, join the conversation, and support creators you enjoy."
                    : "发现直播间、加入互动，并支持你喜欢的主播。"}
                </p>
              </div>
              <span className="live-room-count">
                {rooms.filter(
                  (item) => (item.broadcast_state ?? item.status) === "live",
                ).length}{" "}
                {language === "en" ? "live now" : "正在直播"}
              </span>
            </div>
            <div className="filters">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{t.allCategories}</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="roles">
              {rooms.map((item, index) => (
                <button
                  className={`room-card ${item.broadcast_state ?? item.status}`}
                  key={item.slug}
                  onClick={() => {
                    setRoom(item);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <span
                    className={`room-card-art room-card-art-${index % 4}`}
                    aria-hidden="true"
                  >
                    <span className="room-card-avatar">
                      {item.streamer_name
                        .split(/\s+/)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="room-card-category">{item.category}</span>
                  </span>
                  <span className="room-card-copy">
                    <strong>{item.title}</strong>
                    <span>
                      {item.streamer_name} · {item.category}
                    </span>
                    <span>
                      {item.follower_count ?? 0} {t.followers} ·{" "}
                      {item.schedule_text}
                    </span>
                  </span>
                  <span
                    className={`broadcast-label state-${item.broadcast_state ?? item.status}`}
                  >
                    {broadcastLabel(t, item.broadcast_state ?? item.status)}
                  </span>
                </button>
              ))}
            </div>
            <AudienceShelf t={t} />
          </section>
        )
      ) : user.role === "admin" ? (
        <AdminPanel t={t} />
      ) : (
        <StreamerStudio t={t} />
      )}
    </main>
  );
}
function AudienceShelf({ t }: { t: typeof copy.en }) {
  const [history, setHistory] = useState<Room[]>([]);
  const [notes, setNotes] = useState<
    { id: string; title: string; body: string }[]
  >([]);
  useEffect(() => {
    void request("/api/me/history").then((d) => setHistory(d.rooms));
    void request("/api/me/notifications").then((d) =>
      setNotes(d.notifications),
    );
  }, []);
  return (
    <div className="shelves" id="audience-library">
      <div>
        <h3>{t.recent}</h3>
        {history.length ? (
          history.map((item) => (
            <p key={item.slug}>
              {item.title} · {item.streamer_name}
            </p>
          ))
        ) : (
          <p className="muted">{t.noHistory}</p>
        )}
      </div>
      <div>
        <h3>{t.notifications}</h3>
        {notes.length ? (
          notes.slice(0, 4).map((item) => (
            <p key={item.id}>
              <strong>{item.title}</strong> · {item.body}
            </p>
          ))
        ) : (
          <p className="muted">{t.noNotes}</p>
        )}
      </div>
    </div>
  );
}
function CreatorLiveMonitor({ slug, t }: { slug: string; t: typeof copy.en }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "support" | "audience">(
    "chat",
  );
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  useEffect(() => {
    void request(`/api/rooms/${slug}/chat-history`).then((d) =>
      setMessages(d.messages),
    );
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
    socket.on("gift:sent", (d) =>
      setGifts((current) =>
        [{ ...d, createdAt: new Date().toISOString() }, ...current].slice(0, 8),
      ),
    );
    socket.on("action:purchased", (d) =>
      setGifts((current) =>
        [
          {
            ...d,
            name: d.title,
            createdAt: new Date().toISOString(),
            action: true,
          },
          ...current,
        ].slice(0, 8),
      ),
    );
    return () => {
      socket.disconnect();
    };
  }, [slug]);
  const zh = t.title !== "Stream MVP";
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
  async function moderate(targetId: string, action: "mute" | "unmute") {
    await request(`/api/streamer/rooms/${slug}/moderation`, {
      method: "POST",
      body: JSON.stringify({ targetId, action }),
    });
  }
  return (
    <div className="creator-monitor">
      <div className="creator-monitor-heading">
        <div>
          <p className="eyebrow">{zh ? "实时互动" : "Live activity"}</p>
          <h3>{zh ? "与观众保持联系" : "Stay connected to your room"}</h3>
        </div>
        <span className="presence-pill">
          <i /> {participants.length} {zh ? "位观众" : "viewers"}
        </span>
      </div>
      <div className="creator-monitor-tabs" role="tablist">
        <button
          type="button"
          className={activeTab === "chat" ? "active" : ""}
          onClick={() => setActiveTab("chat")}
        >
          {zh ? "聊天" : "Chat"}
        </button>
        <button
          type="button"
          className={activeTab === "support" ? "active" : ""}
          onClick={() => setActiveTab("support")}
        >
          {zh ? "礼物与支持" : "Gifts & support"}
          {gifts.length ? <span>{gifts.length}</span> : null}
        </button>
        <button
          type="button"
          className={activeTab === "audience" ? "active" : ""}
          onClick={() => setActiveTab("audience")}
        >
          {zh ? "观众" : "Audience"}
        </button>
      </div>
      {activeTab === "chat" ? (
        <div className="creator-monitor-panel">
          <div className="messages">
            {messages.length ? (
              messages.map((message) => (
                <p key={message.id}>
                  <strong>{message.sender.displayName}</strong> {message.body}
                </p>
              ))
            ) : (
              <div className="creator-empty-state">
                <strong>{zh ? "聊天会显示在这里" : "Chat will appear here"}</strong>
                <span>
                  {zh
                    ? "开播后向第一位观众打个招呼。"
                    : "Say hello when your first viewer arrives."}
                </span>
              </div>
            )}
          </div>
          <form className="creator-chat-form" onSubmit={send}>
            <input
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={zh ? "给直播间发送消息" : "Message your room"}
            />
            <button>{zh ? "发送" : "Send"}</button>
          </form>
          {status && <p className="error">{status}</p>}
        </div>
      ) : null}
      {activeTab === "support" ? (
        <div className="creator-monitor-panel support-timeline">
          {gifts.length ? (
            gifts.map((gift) => (
              <article key={gift.eventId ?? gift.id}>
                <span className={gift.action ? "support-icon action" : "support-icon"}>
                  {gift.action ? "⚡" : gift.symbol ?? "◆"}
                </span>
                <div>
                  <strong>{gift.sender}</strong>
                  <p>
                    {gift.action
                      ? zh
                        ? "购买了互动动作"
                        : "purchased an action"
                      : zh
                        ? "送出了礼物"
                        : "sent a gift"}{" "}
                    · {zh ? gift.nameZh ?? gift.name : gift.nameEn ?? gift.name}
                    {gift.quantity > 1 ? ` ×${gift.quantity}` : ""}
                  </p>
                </div>
                <b>
                  +{gift.cost} {t.coins}
                </b>
              </article>
            ))
          ) : (
            <div className="creator-empty-state">
              <strong>{zh ? "等待第一份支持" : "Waiting for your first support"}</strong>
              <span>
                {zh
                  ? "礼物和互动动作会实时出现在这里。"
                  : "Gifts and action purchases appear here in real time."}
              </span>
            </div>
          )}
        </div>
      ) : null}
      {activeTab === "audience" ? (
        <div className="creator-monitor-panel participant-roster">
          {participants.length ? (
            participants.map((participant) => (
              <article key={participant.id}>
                <span className="viewer-avatar">
                  {participant.displayName.slice(0, 1).toUpperCase()}
                </span>
                <strong>{participant.displayName}</strong>
                <div>
                  <button
                    type="button"
                    onClick={() => void moderate(participant.id, "mute")}
                  >
                    {zh ? "禁言" : "Mute"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void moderate(participant.id, "unmute")}
                  >
                    {zh ? "解除" : "Unmute"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="creator-empty-state">
              <strong>{zh ? "直播间里还没有观众" : "No viewers in the room yet"}</strong>
              <span>{zh ? "观众加入后会显示在这里。" : "Viewers appear here as they join."}</span>
            </div>
          )}
        </div>
      ) : null}
      <CreatorSessionInsights
        slug={slug}
        audienceCount={participants.length}
        t={t}
      />
    </div>
  );
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
  t,
  onChanged,
}: {
  slug: string;
  state?: string;
  t: typeof copy.en;
  onChanged: () => void;
}) {
  const zh = t.title !== "Stream MVP";
  const stateGuide: Record<string, string> = zh
    ? {
        offline: "OBS \u5c1a\u672a\u5f00\u59cb\u63a8\u6d41\u3002",
        connecting:
          "Cloudflare \u6b63\u5728\u51c6\u5907\u89c2\u4f17\u64ad\u653e\u3002",
        live: "\u89c2\u4f17\u73b0\u5728\u5e94\u53ef\u4ee5\u89c2\u770b\u76f4\u64ad\u3002",
        unavailable:
          "\u6682\u65f6\u65e0\u6cd5\u786e\u8ba4\u76f4\u64ad\u72b6\u6001\u3002",
      }
    : {
        offline: "OBS is not streaming yet.",
        connecting: "Cloudflare is preparing audience playback.",
        live: "Audience playback should now be available.",
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
  | "error";

function VideoActivityOverlay({
  messages,
  gift,
  t,
}: {
  messages: any[];
  gift: any | null;
  t: Record<string, string>;
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
    <div className={`video-activity-overlay ${visible ? "is-visible" : "is-hidden"}`}>
      <button
        type="button"
        className="video-overlay-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
      >
        {visible ? (zh ? "隐藏互动" : "Hide activity") : zh ? "显示互动" : "Show activity"}
      </button>
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
    socket.on("gift:sent", (event) => {
      window.clearTimeout(giftTimer);
      setGift(event);
      giftTimer = window.setTimeout(() => setGift(null), 6_000);
    });
    return () => {
      window.clearTimeout(giftTimer);
      socket.disconnect();
    };
  }, [slug]);
  return <VideoActivityOverlay messages={messages} gift={gift} t={t} />;
}

function QuickGoLive({
  slug,
  available,
  broadcastState,
  transport,
  t,
  onChanged,
  overlay,
}: {
  slug: string;
  available: boolean;
  broadcastState: string;
  transport?: "obs_hls" | "browser_webrtc";
  t: typeof copy.en;
  onChanged: () => void;
  overlay?: ReactNode;
}) {
  const zh = t.title !== "Stream MVP";
  const [phase, setPhase] = useState<QuickLivePhase>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [microphoneId, setMicrophoneId] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<WebRtcController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (broadcastState === "live" && transport === "browser_webrtc")
      setPhase("live");
    else if (phase === "live" && broadcastState !== "live")
      setPhase(stream ? "preview" : "idle");
  }, [broadcastState, transport, phase, stream]);
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
      if (sessionId && csrf)
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
    const heartbeat = window.setInterval(() => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      void request(
        `/api/streamer/rooms/${slug}/webrtc/publish/${sessionId}`,
        { method: "PATCH" },
      ).catch(() => {
        setPhase("error");
        setError(
          zh
            ? "直播会话已失去联系。请结束后重新开始。"
            : "The broadcast session lost contact. End it before trying again.",
        );
      });
    }, 60_000);
    return () => window.clearInterval(heartbeat);
  }, [slug, zh]);

  async function enableDevices(nextCamera = cameraId, nextMicrophone = microphoneId) {
    setPhase("requesting");
    setError("");
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: nextCamera ? { deviceId: { exact: nextCamera } } : true,
        audio: nextMicrophone ? { deviceId: { exact: nextMicrophone } } : true,
      });
      stopMediaStream(streamRef.current);
      setStream(next);
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(availableDevices);
      setCameraId(next.getVideoTracks()[0]?.getSettings().deviceId ?? nextCamera);
      setMicrophoneId(next.getAudioTracks()[0]?.getSettings().deviceId ?? nextMicrophone);
      setCameraEnabled(true);
      setMicrophoneEnabled(true);
      setPhase("preview");
    } catch (caught) {
      setPhase("error");
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
  async function goLive() {
    if (!stream || !available) return;
    setPhase("connecting");
    setError("");
    try {
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
          if (state === "failed" || state === "disconnected") {
            setPhase("error");
            setError(
              zh
                ? "直播连接已中断。请结束后重试。"
                : "The broadcast connection was interrupted. End it and try again.",
            );
          }
        },
      );
      controllerRef.current = controller;
      sessionIdRef.current = controller.sessionId;
      onChanged();
    } catch {
      setPhase("error");
      setError(
        zh
          ? "无法连接直播服务。相机尚未对观众开放。"
          : "The broadcast service could not connect. Your camera was not made available to viewers.",
      );
    }
  }
  async function endBroadcast() {
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
    setPhase("idle");
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
  return (
    <section className={`quick-live-panel phase-${phase}`} id="quick-go-live">
      <div className="quick-live-heading">
        <div>
          <p className="eyebrow">{zh ? "快速开播" : "Quick Go Live"}</p>
          <h3>{zh ? "直接使用浏览器开播" : "Broadcast directly from your browser"}</h3>
        </div>
        <span>{phase === "live" ? (zh ? "直播中" : "LIVE") : zh ? "私密预览" : "Private preview"}</span>
      </div>
      <div className="quick-live-video-shell">
        {stream ? (
          <video ref={videoRef} className="quick-live-preview" autoPlay muted playsInline />
        ) : (
          <div className="quick-live-empty">
            <strong>{zh ? "您的预览仅在授权后显示" : "Your preview appears only after permission"}</strong>
            <p>{zh ? "浏览器不会在您点击之前访问设备。" : "The browser will not access devices until you click."}</p>
          </div>
        )}
        {overlay}
      </div>
      {stream ? (
        <>
          <div className="device-grid">
            <label>
              {zh ? "相机" : "Camera"}
              <select value={cameraId} onChange={(event) => void enableDevices(event.target.value, microphoneId)} disabled={phase === "connecting" || phase === "live"}>
                {cameras.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${zh ? "相机" : "Camera"} ${index + 1}`}</option>)}
              </select>
            </label>
            <label>
              {zh ? "麦克风" : "Microphone"}
              <select value={microphoneId} onChange={(event) => void enableDevices(cameraId, event.target.value)} disabled={phase === "connecting" || phase === "live"}>
                {microphones.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${zh ? "麦克风" : "Microphone"} ${index + 1}`}</option>)}
              </select>
            </label>
          </div>
          <div className="microphone-meter" aria-label={zh ? "麦克风音量" : "Microphone level"}>
            <span style={{ width: `${microphoneEnabled ? micLevel : 0}%` }} />
          </div>
          <div className="quick-live-controls">
            <button type="button" className="secondary" onClick={toggleCamera}>{cameraEnabled ? (zh ? "关闭相机" : "Camera off") : zh ? "打开相机" : "Camera on"}</button>
            <button type="button" className="secondary" onClick={toggleMicrophone}>{microphoneEnabled ? (zh ? "静音" : "Mute") : zh ? "取消静音" : "Unmute"}</button>
            {phase === "connecting" || phase === "live" || phase === "error" ? (
              <button type="button" className="danger" onClick={() => void endBroadcast()}>{zh ? "结束直播" : "End broadcast"}</button>
            ) : (
              <button type="button" className="creator-primary-action" onClick={() => void goLive()} disabled={!available || phase !== "preview"}>{zh ? "开始直播" : "Go Live"}</button>
            )}
          </div>
        </>
      ) : (
        <button type="button" className="creator-primary-action" onClick={() => void enableDevices()} disabled={phase === "requesting"}>{phase === "requesting" ? (zh ? "正在请求权限…" : "Requesting permission…") : zh ? "启用相机和麦克风" : "Enable camera and microphone"}</button>
      )}
      {!available ? <p className="control-note">{zh ? "此本地环境可测试预览，但未连接浏览器直播服务。" : "This local environment can test preview, but browser broadcasting is not connected."}</p> : null}
      {error ? <p className="quick-live-error" role="alert">{error}</p> : null}
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

function StreamerStudio({ t }: { t: typeof copy.en }) {
  const [studio, setStudio] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [goalTarget, setGoalTarget] = useState(500);
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("");
  const [schedule, setSchedule] = useState("");
  const [mode, setMode] = useState<"ticket" | "per_minute">("ticket");
  const [ticketCost, setTicketCost] = useState(100);
  const [perMinuteCost, setPerMinuteCost] = useState(10);
  const [activeSection, setActiveSection] = useState<
    "live" | "earnings" | "actions" | "private" | "profile" | "settings"
  >("live");
  const refresh = () =>
    void request("/api/streamer/studio").then((d) => {
      setStudio(d);
      setTitle(d.room?.title ?? "");
      setGoal(d.room?.goal_text ?? "");
      setGoalTarget(d.room?.goal_target ?? 500);
      setBio(d.room?.bio ?? "");
      setCategory(d.room?.category ?? "");
      setSchedule(d.room?.schedule_text ?? "");
      setMode(d.room?.private_show_mode ?? "ticket");
      setTicketCost(d.room?.private_show_ticket_cost ?? 100);
      setPerMinuteCost(d.room?.private_show_per_minute_cost ?? 10);
    });
  useEffect(refresh, []);
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
  async function moderate(action: "mute" | "unmute") {
    await request(`/api/streamer/rooms/${studio.room.slug}/moderation`, {
      method: "POST",
      body: JSON.stringify({ targetId: audienceId, action }),
    });
    const zh = t.title !== "Stream MVP";
    setNotice(
      action === "mute"
        ? zh
          ? "此直播间已禁言演示观众。"
          : "Demo Audience muted in this room."
        : zh
          ? "此直播间已解除演示观众禁言。"
          : "Demo Audience unmuted in this room.",
    );
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
  async function save(e: FormEvent) {
    e.preventDefault();
    await request(`/api/streamer/rooms/${studio.room.slug}`, {
      method: "PUT",
      body: JSON.stringify({ title, goalText: goal, goalTarget }),
    });
    setNotice(t.metadataSaved);
    refresh();
  }
  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    await request("/api/streamer/profile", {
      method: "PUT",
      body: JSON.stringify({ bio, category, scheduleText: schedule }),
    });
    setNotice(
      t.title === "Stream MVP"
        ? "Test profile saved."
        : "测试主页信息已保存。 ",
    );
    refresh();
  }
  if (!studio) return <section className="workspace">{t.preparing}</section>;
  const room = studio.room;
  const zh = t.title !== "Stream MVP";
  if (!room)
    return (
      <section className="workspace creator-studio">
        <h2>{t.studio}</h2>
        <p>{t.noRoom}</p>
      </section>
    );
  const broadcastState = room.broadcast_state ?? "offline";
  const goalPercent = Math.min(
    100,
    Math.round((room.goal_progress / Math.max(1, room.goal_target)) * 100),
  );
  return (
    <section className="workspace creator-studio">
      <div className="creator-studio-heading">
        <div>
          <p className="eyebrow">{zh ? "主播控制台" : "Creator cockpit"}</p>
          <h2>{zh ? "准备并管理您的直播" : "Run your live session"}</h2>
          <p>
            {zh
              ? "画面、观众互动与收益集中在一个清晰的工作区。"
              : "Your broadcast, audience activity, and support in one focused workspace."}
          </p>
        </div>
        <div className={`creator-live-badge state-${broadcastState}`}>
          <span />
          <div>
            <small>{zh ? "直播状态" : "Broadcast status"}</small>
            <strong>{broadcastLabel(t, broadcastState)}</strong>
          </div>
        </div>
      </div>

      <nav
        className="creator-section-nav"
        aria-label={zh ? "主播工作区导航" : "Creator workspace navigation"}
      >
        {(
          [
            ["live", zh ? "直播" : "Live"],
            ["earnings", zh ? "收益" : "Earnings"],
            ["actions", zh ? "互动动作" : "Actions"],
            ["private", zh ? "私密直播" : "Private Show"],
            ["profile", zh ? "主页" : "Profile"],
            ["settings", zh ? "设置" : "Settings"],
          ] as const
        ).map(([section, label]) => (
          <button
            key={section}
            type="button"
            className={activeSection === section ? "active" : ""}
            aria-current={activeSection === section ? "page" : undefined}
            onClick={() => {
              setActiveSection(section);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeSection === "live" ? (
      <div className="creator-section creator-live-section">
      <div className="creator-broadcast-layout">
        <div className="creator-stage-column">
          <QuickGoLive
            slug={room.slug}
            available={Boolean(studio.broadcastControls?.browserQuickLiveAvailable)}
            broadcastState={broadcastState}
            transport={room.broadcast_transport}
            t={t}
            onChanged={refresh}
            overlay={<CreatorRealtimeOverlay slug={room.slug} t={t} />}
          />
          {broadcastState !== "offline" ? (
            <CreatorBroadcastPreview
              slug={room.slug}
              state={broadcastState}
              transport={room.broadcast_transport}
              configured={studio.broadcastControls?.cloudflareConfigured}
              t={t}
            />
          ) : null}
          <div className="creator-session-metrics">
            <div>
              <span>{zh ? "当前状态" : "Current state"}</span>
              <strong>{broadcastLabel(t, broadcastState)}</strong>
            </div>
            <div>
              <span>{zh ? "本地测试收益" : "Test earnings"}</span>
              <strong>
                {room.test_earnings} <small>{t.coins}</small>
              </strong>
            </div>
            <div>
              <span>{zh ? "目标进度" : "Goal progress"}</span>
              <strong>{goalPercent}%</strong>
            </div>
            <div>
              <span>{zh ? "关注者" : "Followers"}</span>
              <strong>{room.followers}</strong>
            </div>
          </div>
        </div>

        <aside className="creator-control-rail">
          <div className="control-rail-section">
            <p className="eyebrow">{zh ? "开播流程" : "Go live"}</p>
            <h3>
              {broadcastState === "live"
                ? zh
                  ? "您的直播已上线"
                  : "Your broadcast is live"
                : zh
                  ? "使用浏览器快速开播"
                  : "Go live from your browser"}
            </h3>
            <p className="muted">
              {creatorBroadcastMessage(t, broadcastState)}
            </p>
            <ol className="go-live-steps">
              <li className="complete">
                <span>1</span>
                {zh ? "允许相机和麦克风" : "Allow camera and microphone"}
              </li>
              <li className="complete">
                <span>2</span>
                {zh ? "检查私密预览和音量" : "Check your private preview and audio"}
              </li>
              <li className={broadcastState === "live" ? "complete" : ""}>
                <span>3</span>
                {broadcastState === "live"
                  ? zh
                    ? "观众已可观看"
                    : "Audience playback ready"
                  : zh
                    ? "点击“开始直播”"
                    : "Select Go Live"}
              </li>
            </ol>
            <a className="creator-primary-action" href="#quick-go-live">
              {broadcastState === "live"
                ? zh
                  ? "查看直播控制"
                  : "View live controls"
                : zh
                  ? "打开快速开播"
                  : "Open Quick Go Live"}
            </a>
            <button type="button" className="secondary" onClick={() => void refreshBroadcast()} disabled={!studio.broadcastControls?.cloudflareConfigured}>
              {zh ? "刷新直播状态" : "Refresh broadcast status"}
            </button>
            {!studio.broadcastControls?.cloudflareConfigured ? (
              <p className="control-note">
                {zh
                  ? "此本地环境未连接直播服务；仍可测试全部界面状态。"
                  : "This local environment is not connected to the broadcast service; all interface states remain testable."}
              </p>
            ) : null}
          </div>

          <div className="control-rail-section quick-goal">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">{zh ? "直播目标" : "Live goal"}</p>
                <h3>{room.goal_text}</h3>
              </div>
              <strong>{goalPercent}%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${goalPercent}%` }} />
            </div>
            <small>
              {room.goal_progress} / {room.goal_target} {t.coins}
            </small>
            <button type="button" onClick={() => setActiveSection("actions")}>
              {zh ? "管理目标与互动动作" : "Manage goal and actions"}
            </button>
          </div>

          <div className="control-rail-section broadcast-health">
            <div>
              <span>{zh ? "上次状态检查" : "Last status check"}</span>
              <strong>
                {room.broadcast_checked_at
                  ? new Date(room.broadcast_checked_at).toLocaleTimeString()
                  : "—"}
              </strong>
            </div>
            <button type="button" className="text-button" onClick={() => setActiveSection("settings")}>
              {zh ? "查看 OBS 设置帮助" : "View OBS setup help"}
            </button>
          </div>
        </aside>
      </div>

      <CreatorLiveMonitor slug={room.slug} t={t} />
      <CreatorSessionSummary slug={room.slug} state={broadcastState} t={t} />
      </div>
      ) : null}

      {activeSection === "earnings" ? (
        <section className="creator-section creator-config-page">
          <div className="creator-page-heading">
            <div>
              <p className="eyebrow">{zh ? "收益" : "Earnings"}</p>
              <h3>{zh ? "本场直播支持概览" : "Session support overview"}</h3>
              <p className="muted">
                {zh ? "所有金额均为本地测试金币，不代表真实收入。" : "All amounts are local test coins and do not represent real income."}
              </p>
            </div>
            <strong className="test-earnings-total">{room.test_earnings} {t.coins}</strong>
          </div>
          <CreatorSessionSummary slug={room.slug} state={broadcastState} t={t} />
        </section>
      ) : null}

      {activeSection === "actions" ? (
        <section className="creator-section creator-config-page">
          <div className="creator-page-heading">
            <div>
              <p className="eyebrow">{zh ? "互动与目标" : "Actions and goal"}</p>
              <h3>{zh ? "设置观众支持方式" : "Configure viewer support"}</h3>
              <p className="muted">{zh ? "保持选择简单，让观众快速理解如何支持。" : "Keep choices simple so viewers immediately understand how to support."}</p>
            </div>
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
              <label>{zh ? "目标测试金币" : "Target test coins"}<input type="number" min="1" value={goalTarget} onChange={(e) => setGoalTarget(Number(e.target.value))} /></label>
              <button>{zh ? "更新直播目标" : "Update live goal"}</button>
            </form>
            <div className="creator-action-workspace"><ActionMenuManager slug={room.slug} t={t} /></div>
          </div>
        </section>
      ) : null}

      {activeSection === "private" ? (
        <section className="creator-section creator-config-page">
          <div className="creator-page-heading">
            <div><p className="eyebrow">{zh ? "私密直播" : "Private Show"}</p><h3>{zh ? "管理测试访问模式" : "Manage test access mode"}</h3></div>
            <span className={`creator-state-chip ${room.private_show_enabled ? "active" : ""}`}>{room.private_show_enabled ? t.active : t.inactive}</span>
          </div>
          <div className="creator-settings-grid creator-private-grid">
            <section>
              <h3>{zh ? "访问与价格" : "Access and pricing"}</h3>
              <p className="muted">{zh ? "这是测试金币流程；未连接真实付款或提现。" : "This is a test-coin workflow with no real payment or cashout."}</p>
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
              <p className="muted">{zh ? "启用后，观众必须通过测试金币访问流程。结束后直播间恢复公开状态。" : "When active, viewers use the test-coin access flow. Ending it returns the room to public mode."}</p>
            </section>
          </div>
        </section>
      ) : null}

      {activeSection === "profile" ? (
        <section className="creator-section creator-config-page">
          <div className="creator-page-heading"><div><p className="eyebrow">{zh ? "公开主页" : "Public profile"}</p><h3>{zh ? "观众看到的主播信息" : "What viewers see about you"}</h3></div></div>
          <div className="creator-settings-grid">
            <section><h3>{zh ? "直播间信息" : "Room details"}</h3><form className="studio-form" onSubmit={(e) => void save(e)}><label>{t.roomTitle}<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><button>{t.saveRoom}</button></form></section>
            <section><h3>{zh ? "主播资料" : "Creator profile"}</h3><form className="studio-form" onSubmit={(e) => void saveProfile(e)}><label>{zh ? "简介" : "Bio"}<input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} /></label><label>{zh ? "分类" : "Category"}<input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} /></label><label>{zh ? "直播时间" : "Schedule"}<input value={schedule} onChange={(e) => setSchedule(e.target.value)} maxLength={160} /></label><button>{zh ? "保存公开主页" : "Save public profile"}</button></form></section>
          </div>
        </section>
      ) : null}

      {activeSection === "settings" ? (
        <section className="creator-section creator-config-page" id="obs-setup">
          <div className="creator-page-heading"><div><p className="eyebrow">{zh ? "设置与帮助" : "Settings and help"}</p><h3>{zh ? "设备、OBS 与直播间管理" : "Devices, OBS, and room management"}</h3></div></div>
          <div className="creator-settings-grid creator-settings-operations">
            <section><h3>{zh ? "快速管理" : "Quick moderation"}</h3><p className="muted">{zh ? "当前仅限合成演示观众。" : "Currently limited to the synthetic demo audience."}</p><div className="admin-actions"><button type="button" onClick={() => void moderate("mute")}>{zh ? "禁言观众" : "Mute audience"}</button><button type="button" onClick={() => void moderate("unmute")}>{zh ? "解除观众禁言" : "Unmute audience"}</button></div></section>
            <section className="broadcast-health"><div><span>{zh ? "上次状态检查" : "Last status check"}</span><strong>{room.broadcast_checked_at ? new Date(room.broadcast_checked_at).toLocaleTimeString() : "—"}</strong></div><button type="button" className="secondary" onClick={() => void refreshBroadcast()} disabled={!studio.broadcastControls?.cloudflareConfigured}>{zh ? "刷新直播状态" : "Refresh broadcast status"}</button></section>
          </div>
          <div className="creator-obs-workspace"><ObsReadiness slug={room.slug} state={broadcastState} t={t} onChanged={refresh} /></div>
          {studio.broadcastControls?.localFallbackEnabled ? <div className="local-state-tool"><label>{t.localBroadcast}</label><select value={broadcastState} onChange={(e) => void setLocalBroadcast(e.target.value as "live" | "connecting" | "offline" | "unavailable")}><option value="live">live</option><option value="connecting">connecting</option><option value="offline">offline</option><option value="unavailable">unavailable</option></select></div> : null}
        </section>
      ) : null}
      {notice && <p className="creator-toast">{notice}</p>}
    </section>
  );
}
function AdminPanel({ t }: { t: typeof copy.en }) {
  const [events, setEvents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
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
  };
  useEffect(refresh, []);
  async function action(value: "mute" | "unmute" | "ban" | "unban") {
    await request("/api/admin/rooms/demo-streamer/moderation", {
      method: "POST",
      body: JSON.stringify({
        targetId: audienceId,
        action: value,
        reason: "local admin test",
      }),
    });
    setNotice(`${value}: Demo Audience`);
    refresh();
  }
  async function review(id: string, status: "reviewed" | "dismissed") {
    await request(`/api/admin/reports/${id}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    refresh();
  }
  return (
    <section className="workspace">
      <h2>{t.admin}</h2>
      <div className="admin-actions">
        {(["mute", "unmute", "ban", "unban"] as const).map((v) => (
          <button key={v} onClick={() => void action(v)}>
            {v}
          </button>
        ))}
      </div>
      {notice && <p>{notice}</p>}
      <h3>
        {t.title === "Stream MVP" ? "Local account review" : "本地账号审核"}
      </h3>
      <div className="transaction-list">
        {users.map((user) => (
          <p key={user.id}>
            <strong>{user.display_name}</strong> · {user.role} ·{" "}
            {user.is_banned ? "banned" : user.is_muted ? "muted" : "active"}
          </p>
        ))}
      </div>
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
    </section>
  );
}
function CreatorProfile({
  streamerId,
  fallbackName,
  broadcastState,
  t,
}: {
  streamerId: string;
  fallbackName: string;
  broadcastState?: "live" | "connecting" | "offline" | "unavailable";
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
        <span>{profile.category}</span>
        <span>
          {profile.follower_count} {t.followers}
        </span>
        <span>{profile.schedule_text}</span>
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
  back,
  t,
}: {
  room: Room;
  back: () => void;
  t: Record<string, string>;
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
  const [following, setFollowing] = useState(false);
  const [show, setShow] = useState<any>(null);
  const [broadcast, setBroadcast] = useState<any>({
    state: room.broadcast_state ?? "offline",
    message: room.broadcast_status_message ?? t.offline,
    checkedAt: room.broadcast_checked_at ?? null,
    transport: room.broadcast_transport ?? "obs_hls",
  });
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const giftTimerRef = useRef(0);
  const refreshShow = () =>
    void request(`/api/rooms/${room.slug}/private-show`).then(setShow);
  const refreshWallet = () => {
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
    broadcast.state !== "live"
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
    void request(`/api/rooms/${room.slug}/visit`, {
      method: "POST",
      body: "{}",
    });
    refreshPlayback();
    refreshBroadcast();
    refreshShow();
    refreshWallet();
    void request(`/api/rooms/${room.slug}/chat-history`).then((d) =>
      setMessages(d.messages),
    );
    void request("/api/gifts").then((d) => {
      setGifts(d.gifts);
      setSelectedGiftId((current) => current || d.gifts[0]?.id || "");
    });
    refreshActions();
    refreshSupportFeed();
  }, [room.slug]);
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
      window.clearTimeout(giftTimerRef.current);
      setActiveGift(d);
      giftTimerRef.current = window.setTimeout(() => setActiveGift(null), 6_000);
      setGiftNotice(
        `${d.sender} ${t.send} ${t.title === "Stream MVP" ? d.nameEn ?? d.name : d.nameZh ?? d.name}${d.quantity > 1 ? ` ×${d.quantity}` : ""}`,
      );
      if (d.goal) setGoalProgress(d.goal);
      refreshSupportFeed();
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
        transport?: "obs_hls" | "browser_webrtc";
      }) => {
        setBroadcast({
          state: d.state,
          message: d.message,
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
  }, [room.slug, t]);
  function send() {
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
  async function sendGift(gift: any) {
    const total = gift.coin_cost * giftQuantity;
    const highValue = total >= 1_000;
    if (
      highValue &&
      !window.confirm(
        t.title === "Stream MVP"
          ? `Confirm this test gift: ${giftQuantity} × ${gift.name_en} = ${total.toLocaleString()} test tokens (¥${total.toLocaleString()} reference value). No real money is charged.`
          : `确认测试礼物：${giftQuantity} × ${gift.name_zh} = ${total.toLocaleString()} 测试代币（¥${total.toLocaleString()} 参考价值）。不会产生真实扣款。`,
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
            ? "Not enough test tokens for this gift."
            : "测试代币余额不足。"
          : t.title === "Stream MVP"
            ? "The test gift could not be sent. Please try again."
            : "测试礼物发送失败，请重试。",
      );
    } finally {
      setSendingGift(false);
    }
  }
  async function purchaseAction(id: string) {
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
    const d = await request(`/api/rooms/${room.slug}/private-show/purchase`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    });
    setGiftNotice(`${t.buyAccess}: ${d.cost}`);
    refreshWallet();
    refreshShow();
    refreshPlayback();
  }
  async function follow() {
    await request(`/api/streamers/${room.streamer_id}/follow`, {
      method: "POST",
      body: "{}",
    });
    setFollowing(true);
  }
  async function report() {
    await request(`/api/rooms/${room.slug}/reports`, {
      method: "POST",
      body: JSON.stringify({ reason: "Local test report" }),
    });
    setGiftNotice(t.reportSent);
  }
  return (
    <section className="workspace audience-room">
      <button className="secondary room-back" onClick={back}>
        {t.back}
      </button>
      <div className="room-media-panel">
        {broadcast.state === "live" &&
        broadcast.transport === "browser_webrtc" ? (
          <>
            <p className="watching-live">
              {t.title === "Stream MVP"
                ? "You are watching the creator’s browser broadcast."
                : "您正在观看主播的浏览器直播。"}
            </p>
            <WhepPlayer slug={room.slug} active t={t} />
          </>
        ) : iframeUrl && broadcast.state === "live" ? (
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
            {broadcast.state === "connecting"
              ? t.connectingBroadcast
              : broadcast.state === "unavailable"
                ? t.unavailableBroadcast
                : broadcast.message || playerMessage}
          </div>
        )}
        <VideoActivityOverlay messages={messages} gift={activeGift} t={t} />
      </div>
      <div className="room-heading">
        <div>
          <p className="eyebrow">
            {broadcastLabel(t, broadcast.state)} · {presence} {t.inRoom}
          </p>
          <h2>{room.title}</h2>
          <p>
            {room.streamer_name} · {room.category}
          </p>
        </div>
        <span className={`room-state state-${broadcast.state}`}>
          {broadcastLabel(t, broadcast.state)}
        </span>
      </div>
      {room.goal_text && !goalProgress && (
        <aside className="room-goal room-goal-compact">
          <p className="eyebrow">{t.goal}</p>
          <strong>{room.goal_text}</strong>
        </aside>
      )}
      {goalProgress && (
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
      <aside className="public-support-feed">
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
      </aside>
      <CreatorProfile
        streamerId={room.streamer_id}
        fallbackName={room.streamer_name}
        broadcastState={room.broadcast_state}
        t={t}
      />
      <PrivateShowStatus show={show} t={t} />
      <div className="gift room-social-actions">
        <button onClick={() => void follow()}>
          {following ? t.following : t.follow}
        </button>
        <button onClick={() => void report()}>{t.report}</button>
        {show?.active && !show.session.hasAccess && (
          <button onClick={() => void buyAccess()}>
            {t.buyAccess} (
            {show.session.mode === "ticket"
              ? show.session.ticket_cost
              : show.session.per_minute_cost}
            )
          </button>
        )}
      </div>
      <section className="room-gift-tray">
        <div className="gift-tray-heading">
          <div>
            <p className="eyebrow">{t.title === "Stream MVP" ? "Send a gift" : "赠送礼物"}</p>
            <strong>{t.title === "Stream MVP" ? "Support this creator" : "支持这位主播"}</strong>
          </div>
          <div className="test-wallet-balance">
            <span>{t.title === "Stream MVP" ? "Test balance" : "测试余额"}</span>
            <strong>{wallet?.toLocaleString() ?? "…"}</strong>
          </div>
        </div>
        <p className="gift-token-note">
          {t.title === "Stream MVP"
            ? "1 test token = ¥1 reference value · no purchase, cashout, or real-money redemption"
            : "1 测试代币 = ¥1 参考价值 · 不支持购买、提现或真实货币兑换"}
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
                <small>¥{total.toLocaleString()} {t.title === "Stream MVP" ? "reference" : "参考价值"}</small>
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
      </section>
      <aside className="wallet-history room-wallet">
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
      </aside>
      <div className="chat room-chat">
        <h3>{t.liveChat}</h3>
        <p className="muted">{chatStatus}</p>
        <div className="messages">
          {messages.map((item) => (
            <p key={item.id}>
              <strong>{item.sender.displayName}</strong> {item.body}
            </p>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder={t.message}
          />
          <button>{t.send}</button>
        </form>
      </div>
    </section>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />{" "}
  </StrictMode>,
);
