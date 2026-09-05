import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import {
  IdentityPreparationError,
  IdentityUploadRequestError,
  prepareIdentityUpload,
  uploadIdentityDocument,
  type PreparedIdentityUpload,
} from "../identity-image";

type Step = "intro" | "profile" | "agreement" | "identity" | "review";
type State = {
  status: string;
  reasonCode?: string | null;
  draft: any;
  identity: any;
  agreement: any;
  configuration: { onboardingEnabled: boolean; automaticApproval: boolean; maximumFileSizeBytes: number };
};
type LanguageOption = { code: string; nameEn: string; nameNative: string };
type UploadPhase = "idle" | "preparing" | "ready" | "uploading";

function errorCode(error: unknown) {
  if (error instanceof IdentityPreparationError || error instanceof IdentityUploadRequestError) return error.code;
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return error instanceof Error ? error.message : "unknown";
}

function messageForError(code: string, zh: boolean) {
  const messages: Record<string, [string, string]> = {
    identity_document_empty: ["请选择一个非空文件。", "Choose a file that is not empty."],
    identity_document_too_large: ["文件仍超过 8 MB。请使用更小的文件；PDF 不会自动压缩。", "The file is still over 8 MB. Choose a smaller file; PDFs are not automatically compressed."],
    identity_image_source_too_large: ["原始图片超过 30 MB，请先选择较小的图片。", "The original image is over 30 MB. Choose a smaller image."],
    identity_image_dimensions_too_large: ["图片分辨率过高，请选择不超过 4000 万像素的图片。", "The image resolution is too large. Choose an image under 40 megapixels."],
    identity_image_decode_failed: ["无法读取这张图片。请尝试重新导出为 JPEG 或 PNG。", "This image could not be read. Try exporting it again as JPEG or PNG."],
    unsupported_identity_document: ["仅支持真实的 PDF、JPEG 或 PNG 文件。", "Only valid PDF, JPEG, or PNG files are supported."],
    identity_document_storage_unavailable: ["安全文件存储暂时不可用。你的文件没有被保存，请稍后重试。", "Secure document storage is temporarily unavailable. Your file was not saved; try again later."],
    upload_connection_failed: ["上传连接中断。请检查网络后重试。", "The upload was interrupted. Check your connection and try again."],
    upload_timed_out: ["上传超时。请检查网络后重试。", "The upload timed out. Check your connection and try again."],
    rate_limited: ["尝试次数过多，请稍后重试。", "Too many attempts. Wait a moment and try again."],
    creator_handle_unavailable: ["该主播账号已被使用。", "That creator handle is already taken."],
    invalid_timezone: ["请输入有效的 IANA 时区。", "Enter a valid IANA timezone."],
  };
  return messages[code]?.[zh ? 0 : 1] ?? (zh ? "无法完成此步骤。请检查信息后重试。" : "This step could not be completed. Check the information and try again.");
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function documentStatus(status: string, zh: boolean) {
  const labels: Record<string, [string, string]> = {
    NOT_UPLOADED: ["尚未上传", "Not uploaded"],
    UPLOADED: ["文件已收到", "Document received"],
    REVIEWED: ["管理员已审核", "Administratively reviewed"],
    NEEDS_REUPLOAD: ["需要重新上传", "New document needed"],
    REJECTED: ["文件未被接受", "Document not accepted"],
  };
  return labels[status]?.[zh ? 0 : 1] ?? (zh ? "等待处理" : "Pending");
}

export function CreatorOnboarding({ language, step, api, onNavigate, onActivated, onBack }: { language: "en" | "zh"; step: Step; api: (path: string, options?: RequestInit) => Promise<any>; onNavigate: (step: Step | "status") => void; onActivated: (user: any) => void; onBack: () => void }) {
  const zh = language === "zh";
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [form, setForm] = useState<{ creatorHandle: string; displayName: string; bio: string; primaryLanguage: string; timezone: string }>({ creatorHandle: "", displayName: "", bio: "", primaryLanguage: language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago" });
  const [signerName, setSignerName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [agreementConfirmed, setAgreementConfirmed] = useState(false);
  const [documentType, setDocumentType] = useState("passport");
  const [prepared, setPrepared] = useState<PreparedIdentityUpload | null>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  async function load() {
    const [value, catalog] = await Promise.all([api("/api/creator/onboarding"), api("/api/discovery/languages")]);
    setState(value);
    setLanguages(catalog.languages ?? []);
    if (value.draft) {
      setForm({ creatorHandle: value.draft.creator_handle ?? "", displayName: value.draft.display_name ?? "", bio: value.draft.bio ?? "", primaryLanguage: value.draft.primary_language ?? language, timezone: value.draft.timezone ?? "America/Chicago" });
      setSignerName(value.draft.display_name ?? "");
    }
  }

  useEffect(() => { void load().catch((error) => setNotice(messageForError(errorCode(error), zh))); }, []);
  useEffect(() => {
    if (!prepared?.file.type.startsWith("image/")) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(prepared.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [prepared]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try { await task(); }
    catch (error) { setNotice(messageForError(errorCode(error), zh)); }
    finally { setBusy(false); }
  }

  async function selectFile(file: File | null) {
    setPrepared(null);
    setNotice("");
    if (!file) { setUploadPhase("idle"); return; }
    setUploadPhase("preparing");
    try {
      setPrepared(await prepareIdentityUpload(file));
      setUploadPhase("ready");
    } catch (error) {
      setUploadPhase("idle");
      setNotice(messageForError(errorCode(error), zh));
    }
  }

  function dropFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void selectFile(event.dataTransfer.files.item(0));
  }

  if (!state) return <section className="creator-onboarding workspace" aria-busy="true"><p>{notice || (zh ? "正在加载…" : "Loading creator onboarding…")}</p></section>;
  if (step === "intro" || state.status === "AUDIENCE") return <section className="creator-onboarding workspace onboarding-intro">
    <button className="text-button" onClick={onBack}>{zh ? "← 返回" : "← Back"}</button>
    <h1>{state.status === "AUDIENCE" ? (zh ? "成为主播" : "Become a creator") : (zh ? "继续主播设置" : "Continue creator setup")}</h1>
    <p>{zh ? "完成主播资料、协议和私密证件上传。整个过程不会创建直播间。" : "Complete your creator profile, agreement, and private document upload. No stream room is created during setup."}</p>
    <ol className="onboarding-intro-list"><li>{zh ? "设置公开主播资料" : "Set up your public creator profile"}</li><li>{zh ? "确认年满 18 岁并接受协议" : "Confirm you are 18+ and accept the agreement"}</li><li>{zh ? "安全上传身份证件" : "Upload an identity document securely"}</li></ol>
    <button disabled={busy || !state.configuration.onboardingEnabled} onClick={() => void run(async () => { if (state.status === "AUDIENCE") await api("/api/creator/onboarding/start", { method: "POST", body: "{}" }); await load(); onNavigate(state.status === "ONBOARDING_AGREEMENT" ? "agreement" : state.status === "ONBOARDING_IDENTITY" ? "identity" : state.status === "READY_FOR_REVIEW" ? "review" : "profile"); })}>{state.status === "AUDIENCE" ? (zh ? "开始设置" : "Start setup") : (zh ? "继续设置" : "Continue setup")}</button>
    {notice ? <p className="account-notice" role="alert">{notice}</p> : null}
  </section>;
  if (["PENDING_REVIEW", "REJECTED", "SUSPENDED"].includes(state.status)) return <section className="creator-onboarding workspace onboarding-status"><button className="text-button" onClick={onBack}>{zh ? "← 返回" : "← Back"}</button><h1>{state.status.split("_").join(" ")}</h1><p>{state.reasonCode ?? (zh ? "你的主播账户状态需要处理。" : "Your creator account status needs attention.")}</p></section>;

  const steps: { id: Exclude<Step, "intro">; label: string }[] = [{ id: "profile", label: zh ? "资料" : "Profile" }, { id: "agreement", label: zh ? "协议" : "Agreement" }, { id: "identity", label: zh ? "证件" : "Document" }, { id: "review", label: zh ? "确认" : "Review" }];
  const allowed: Exclude<Step, "intro"> = state.status === "ONBOARDING_PROFILE" ? "profile" : state.status === "ONBOARDING_AGREEMENT" ? "agreement" : state.status === "ONBOARDING_IDENTITY" ? "identity" : "review";
  const allowedIndex = steps.findIndex((item) => item.id === allowed);
  const visible = steps.findIndex((item) => item.id === step) <= allowedIndex ? step : allowed;

  return <section className={`creator-onboarding workspace onboarding-step-${visible}`}>
    <div className="onboarding-heading"><div><h1>{zh ? "主播设置" : "Creator setup"}</h1><p>{zh ? "你的进度会自动保留。" : "Your progress is saved as you continue."}</p></div><button className="text-button" onClick={onBack}>{zh ? "稍后继续" : "Resume later"}</button></div>
    <ol className="onboarding-steps" aria-label={zh ? "主播设置进度" : "Creator setup progress"}>{steps.map((item, index) => <li key={item.id} aria-current={item.id === visible ? "step" : undefined} className={item.id === visible ? "current" : index < allowedIndex ? "complete" : ""}><span>{index < allowedIndex ? "✓" : index + 1}</span>{item.label}</li>)}</ol>

    {visible === "profile" ? <form className="onboarding-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(async () => { await api("/api/creator/onboarding/profile", { method: "PATCH", body: JSON.stringify(form) }); await load(); onNavigate("agreement"); }); }}>
      <div><h2>{zh ? "主播资料" : "Creator profile"}</h2><p className="form-help">{zh ? "这些信息将在激活后显示在你的公开主播资料中。" : "This information appears on your public creator profile after activation."}</p></div>
      <label>{zh ? "主播账号" : "Creator handle"}<input required minLength={3} maxLength={30} pattern="[a-z0-9_-]+" value={form.creatorHandle} onChange={(event) => setForm({ ...form, creatorHandle: event.target.value.toLowerCase() })} /></label>
      <label>{zh ? "显示名称" : "Display name"}<input required minLength={2} maxLength={50} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
      <label>{zh ? "简介" : "Bio"}<textarea required minLength={20} maxLength={500} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
      <div className="onboarding-form-row"><label>{zh ? "主要语言" : "Primary language"}<select required value={form.primaryLanguage} onChange={(event) => setForm({ ...form, primaryLanguage: event.target.value })}>{languages.map((item) => <option key={item.code} value={item.code}>{item.nameNative === item.nameEn ? item.nameEn : `${item.nameNative} — ${item.nameEn}`}</option>)}</select></label><label>{zh ? "时区" : "Timezone"}<input required value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label></div>
      <div className="onboarding-actions"><button disabled={busy}>{zh ? "保存并继续" : "Save and continue"}</button></div>
    </form> : null}

    {visible === "agreement" ? <form className="onboarding-form creator-agreement" onSubmit={(event) => { event.preventDefault(); void run(async () => { await api("/api/creator/onboarding/agreement/accept", { method: "POST", body: JSON.stringify({ agreementVersion: state.agreement.version, signerName, ageConfirmed, agreementConfirmed }) }); await load(); onNavigate("identity"); }); }}>
      <div><h2>{state.agreement?.title ?? "Holiwyn Creator Agreement"}</h2><p className="agreement-version">{state.agreement?.version}</p></div>
      <div className="agreement-copy">{state.agreement?.content_text}</div>
      <label>{zh ? "签署姓名" : "Signature name"}<input required minLength={2} value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label>
      <label className="agreement-check"><input type="checkbox" required checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} />{zh ? "我确认我已年满 18 岁。" : "I confirm that I am at least 18 years old."}</label>
      <label className="agreement-check"><input type="checkbox" required checked={agreementConfirmed} onChange={(event) => setAgreementConfirmed(event.target.checked)} />{zh ? "我已阅读并同意 Holiwyn 主播协议和社区规则。" : "I have read and agree to the Holiwyn Creator Agreement and Community Rules."}</label>
      <div className="onboarding-actions"><button disabled={busy || !ageConfirmed || !agreementConfirmed}>{zh ? "同意并继续" : "Agree and continue"}</button></div>
    </form> : null}

    {visible === "identity" ? <div className="onboarding-panel identity-upload">
      <div><h2>{zh ? "身份证件" : "Identity document"}</h2><p className="form-help">{zh ? "文件仅用于私密账户审核，不会出现在公开资料中。我们目前不会自动验证证件真实性。" : "Your document is private, used only for account review, and never shown publicly. We do not automatically verify document authenticity."}</p></div>
      <label>{zh ? "证件类型" : "Document type"}<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="passport">{zh ? "护照" : "Passport"}</option><option value="national_id">{zh ? "身份证" : "National ID"}</option><option value="driver_license">{zh ? "驾驶证" : "Driver license"}</option></select></label>
      <label className="identity-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
        <input className="identity-file-input" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} />
        <strong>{uploadPhase === "preparing" ? (zh ? "正在优化图片…" : "Optimizing image…") : (zh ? "选择文件" : "Choose a file")}</strong>
        <span>{zh ? "JPEG、PNG 或 PDF。大图片会在你的设备上自动缩小；PDF 最大 8 MB。" : "JPEG, PNG, or PDF. Large images are resized on your device; PDFs must be under 8 MB."}</span>
      </label>
      {prepared ? <div className="identity-file-card">
        {previewUrl ? <img src={previewUrl} alt={zh ? "待上传证件预览" : "Document preview before upload"} /> : <div className="identity-pdf-mark" aria-hidden="true">PDF</div>}
        <div><strong>{prepared.originalName}</strong><p>{prepared.optimized ? (zh ? `${formatBytes(prepared.originalSize)} → ${formatBytes(prepared.file.size)}（已优化）` : `${formatBytes(prepared.originalSize)} → ${formatBytes(prepared.file.size)} optimized`) : formatBytes(prepared.file.size)}</p></div>
        <button className="text-button" onClick={() => { setPrepared(null); setUploadPhase("idle"); }}>{zh ? "移除" : "Remove"}</button>
      </div> : null}
      {uploadPhase === "uploading" ? <div className="upload-progress" aria-live="polite"><progress max="100" value={uploadProgress ?? undefined} /><span>{uploadProgress === null ? (zh ? "正在安全上传…" : "Uploading securely…") : `${uploadProgress}%`}</span></div> : null}
      {state.identity.status !== "NOT_UPLOADED" ? <p className="document-received" role="status"><span aria-hidden="true">✓</span>{documentStatus(state.identity.status, zh)}</p> : null}
      <div className="onboarding-actions"><button disabled={busy || uploadPhase === "preparing" || uploadPhase === "uploading" || !prepared} onClick={() => void run(async () => {
        if (!prepared) return;
        setUploadPhase("uploading");
        setUploadProgress(null);
        try { await uploadIdentityDocument(documentType, prepared.file, setUploadProgress); await load(); onNavigate("review"); }
        finally { setUploadPhase(prepared ? "ready" : "idle"); }
      })}>{state.identity.status === "NEEDS_REUPLOAD" || state.identity.status === "UPLOADED" ? (zh ? "上传替换文件" : "Upload replacement") : (zh ? "上传并继续" : "Upload and continue")}</button></div>
    </div> : null}

    {visible === "review" ? <div className="onboarding-panel review-panel">
      <div><h2>{zh ? "确认并激活" : "Review and activate"}</h2><p className="form-help">{zh ? "请确认以下信息。激活后你仍可正常使用所有观众功能。" : "Confirm the details below. You will keep all audience features after activation."}</p></div>
      <dl><div><dt>{zh ? "主播资料" : "Creator profile"}</dt><dd><strong>{state.draft?.display_name}</strong><span>@{state.draft?.creator_handle}</span></dd></div><div><dt>{zh ? "年龄确认" : "Age confirmation"}</dt><dd>{state.agreement?.age_confirmed ? (zh ? "已确认年满 18 岁" : "18+ confirmed") : (zh ? "尚未确认" : "Not confirmed")}</dd></div><div><dt>{zh ? "主播协议" : "Creator agreement"}</dt><dd>{state.agreement?.accepted ? `${zh ? "已接受" : "Accepted"} · ${state.agreement.version}` : (zh ? "尚未接受" : "Not accepted")}</dd></div><div><dt>{zh ? "身份证件" : "Identity document"}</dt><dd>{documentStatus(state.identity.status, zh)} <button className="text-button" onClick={() => onNavigate("identity")}>{zh ? "更换" : "Change"}</button></dd></div></dl>
      <div className="privacy-note"><strong>{zh ? "请注意" : "Important"}</strong><span>{zh ? "文件已收到不代表身份已验证。管理员可能稍后进行审核。" : "Document receipt does not mean your identity has been verified. An administrator may review it later."}</span></div>
      <div className="onboarding-actions"><button disabled={busy || !["UPLOADED", "REVIEWED"].includes(state.identity.status) || !state.agreement?.age_confirmed || !state.agreement?.agreement_confirmed} onClick={() => void run(async () => { const result = await api("/api/creator/onboarding/activate", { method: "POST", body: "{}" }); if (result.status === "ACTIVE" && result.user) onActivated(result.user); else { await load(); onNavigate("status"); } })}>{zh ? "激活主播账户" : "Activate creator account"}</button></div>
      <p className="activation-note">{zh ? "不会创建直播间，也不会请求摄像头或麦克风权限。" : "This does not create a room or request camera or microphone access."}</p>
    </div> : null}
    {notice ? <p className="account-notice" role="alert">{notice}</p> : null}
  </section>;
}
