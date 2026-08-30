import { useEffect, useState } from "react";

export function creatorInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CreatorAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <span className={className} aria-hidden="true">
      {url && !failed ? (
        <img
          className="creator-avatar-image"
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : creatorInitials(name)}
    </span>
  );
}
