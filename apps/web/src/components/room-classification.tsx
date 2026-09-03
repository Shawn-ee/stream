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
}) {
  const selectedLanguages = [primaryLanguage, ...additionalLanguages].filter(Boolean);
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
  function toggleTag(id: string) {
    if (selectedTagIds.includes(id)) onTagIdsChange(selectedTagIds.filter((item) => item !== id));
    else if (selectedTagIds.length < 8) onTagIdsChange([...selectedTagIds, id]);
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
        <strong>{zh ? "内容标签" : "Content tags"}</strong>
        <small>{zh ? `已选择 ${selectedTagIds.length}/8` : `${selectedTagIds.length}/8 selected`}</small>
        <div role="group" aria-label={zh ? "直播内容标签" : "Room content tags"}>
          {tags.map((item) => <label key={item.id} className={selectedTagIds.includes(item.id) ? "selected" : ""}><input type="checkbox" checked={selectedTagIds.includes(item.id)} disabled={!selectedTagIds.includes(item.id) && selectedTagIds.length >= 8} onChange={() => toggleTag(item.id)} /><span>{item.displayName}</span></label>)}
        </div>
      </div>
    </fieldset>
  );
}
