import { useMemo, useState } from "react";

export type LanguageOption = {
  code: string;
  nameEn: string;
  nameNative: string;
};

export type TagOption = {
  id: string;
  slug: string;
  displayName: string;
  type: "CONTENT" | "FORMAT" | "MOOD";
};

export function RoomClassificationFields({
  languages,
  tags,
  primaryLanguage,
  additionalLanguages,
  selectedTagIds,
  zh,
  onPrimaryLanguageChange,
  onAdditionalLanguagesChange,
  onTagIdsChange,
  onCreateTag,
}: {
  languages: LanguageOption[];
  tags: TagOption[];
  primaryLanguage: string;
  additionalLanguages: string[];
  selectedTagIds: string[];
  zh: boolean;
  onPrimaryLanguageChange: (code: string) => void;
  onAdditionalLanguagesChange: (codes: string[]) => void;
  onTagIdsChange: (ids: string[]) => void;
  onCreateTag: (name: string) => Promise<TagOption>;
}) {
  const [tagQuery, setTagQuery] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [tagError, setTagError] = useState("");
  const selectedLanguages = [primaryLanguage, ...additionalLanguages].filter(Boolean);
  const selectedTags = selectedTagIds
    .map((id) => tags.find((item) => item.id === id))
    .filter((item): item is TagOption => Boolean(item));
  const matchingTags = useMemo(() => {
    const query = tagQuery.trim().replace(/^#+/, "").toLocaleLowerCase();
    if (!query) return [];
    return tags
      .filter((item) => !selectedTagIds.includes(item.id))
      .filter((item) => item.displayName.toLocaleLowerCase().includes(query) || item.slug.includes(query))
      .slice(0, 4);
  }, [selectedTagIds, tagQuery, tags]);
  const languageName = (item: LanguageOption) =>
    item.nameNative === item.nameEn ? item.nameEn : `${item.nameNative} — ${item.nameEn}`;
  function makePrimary(code: string) {
    if (!code || code === primaryLanguage) return;
    const nextAdditional = [primaryLanguage, ...additionalLanguages.filter((item) => item !== code)]
      .filter(Boolean)
      .slice(0, 2);
    onPrimaryLanguageChange(code);
    onAdditionalLanguagesChange(nextAdditional);
  }
  async function addTag() {
    const name = tagQuery.trim().replace(/^#+/, "").replace(/\s+/g, " ");
    if (!name || selectedTagIds.length >= 8 || tagBusy) return;
    setTagError("");
    const existing = tags.find((item) =>
      item.displayName.toLocaleLowerCase() === name.toLocaleLowerCase() || item.slug === name.toLocaleLowerCase(),
    );
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) onTagIdsChange([...selectedTagIds, existing.id]);
      setTagQuery("");
      return;
    }
    setTagBusy(true);
    try {
      const created = await onCreateTag(name);
      onTagIdsChange([...selectedTagIds, created.id]);
      setTagQuery("");
    } catch {
      setTagError(zh ? "无法添加此标签，请换一个名称。" : "This tag could not be added. Try a different name.");
    } finally {
      setTagBusy(false);
    }
  }
  return (
    <fieldset className="room-classification-fields">
      <legend>{zh ? "直播语言" : "Stream languages"}</legend>
      <p>{zh ? "选择观众在直播中可能听到的语言。最多三种。" : "Choose the languages viewers can expect to hear in this stream. Select up to three."}</p>
      <label>
        {zh ? "主要语言" : "Primary language"}
        <select required value={primaryLanguage} onChange={(event) => makePrimary(event.target.value)}>
          <option value="" disabled>{zh ? "选择主要语言" : "Choose a primary language"}</option>
          {languages.map((item) => <option key={item.code} value={item.code}>{languageName(item)}</option>)}
        </select>
      </label>
      <label>
        {zh ? "其他语言（可选）" : "Additional languages (optional)"}
        <select value="" disabled={selectedLanguages.length >= 3} onChange={(event) => { if (event.target.value) onAdditionalLanguagesChange([...additionalLanguages, event.target.value]); }}>
          <option value="">{selectedLanguages.length >= 3 ? (zh ? "已达到三种语言上限" : "Three-language limit reached") : (zh ? "添加一种语言" : "Add a language")}</option>
          {languages.filter((item) => !selectedLanguages.includes(item.code)).map((item) => <option key={item.code} value={item.code}>{languageName(item)}</option>)}
        </select>
      </label>
      <div className="room-language-options" role="list" aria-label={zh ? "已选直播语言" : "Selected stream languages"}>
        {additionalLanguages.map((code) => {
          const item = languages.find((entry) => entry.code === code);
          if (!item) return null;
          return <span key={code} role="listitem" className="selected"><span>{languageName(item)}</span><button type="button" onClick={() => makePrimary(code)}>{zh ? "设为主要" : "Make primary"}</button><button type="button" className="remove" aria-label={`${zh ? "移除" : "Remove"} ${item.nameEn}`} onClick={() => onAdditionalLanguagesChange(additionalLanguages.filter((entry) => entry !== code))}>×</button></span>;
        })}
      </div>
      <div className="room-tag-selector">
        <div className="room-tag-heading"><strong>{zh ? "内容标签" : "Content tags"}</strong><small>{selectedTagIds.length}/8</small></div>
        {selectedTags.length ? <div className="selected-room-tags" role="list" aria-label={zh ? "已选内容标签" : "Selected content tags"}>
          {selectedTags.map((item) => <span key={item.id} role="listitem">#{item.displayName}<button type="button" aria-label={`${zh ? "移除" : "Remove"} ${item.displayName}`} onClick={() => onTagIdsChange(selectedTagIds.filter((id) => id !== item.id))}>×</button></span>)}
        </div> : null}
        <div className="room-tag-search">
          <input
            value={tagQuery}
            maxLength={30}
            disabled={selectedTagIds.length >= 8 || tagBusy}
            aria-label={zh ? "搜索或创建内容标签" : "Search or create a content tag"}
            placeholder={selectedTagIds.length >= 8 ? (zh ? "已达到 8 个标签上限" : "8-tag limit reached") : (zh ? "搜索或输入新标签" : "Search or create a tag")}
            onChange={(event) => { setTagQuery(event.target.value); setTagError(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addTag(); } }}
          />
          <button type="button" className="secondary" disabled={!tagQuery.trim() || selectedTagIds.length >= 8 || tagBusy} onClick={() => void addTag()}>{tagBusy ? (zh ? "添加中…" : "Adding…") : (zh ? "添加" : "Add")}</button>
        </div>
        {matchingTags.length ? <div className="room-tag-suggestions" role="listbox" aria-label={zh ? "匹配的标签" : "Matching tags"}>{matchingTags.map((item) => <button key={item.id} type="button" role="option" aria-selected="false" onClick={() => { onTagIdsChange([...selectedTagIds, item.id]); setTagQuery(""); }}>#{item.displayName}</button>)}</div> : null}
        <small>{zh ? "按 Enter 添加；没有匹配项时会创建新标签。" : "Press Enter to add. A new tag is created when there is no match."}</small>
        {tagError ? <small className="room-tag-error" role="alert">{tagError}</small> : null}
      </div>
    </fieldset>
  );
}
