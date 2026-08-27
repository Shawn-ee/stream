import { useEffect, type ReactNode } from "react";

type OverlayProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  closeLabel?: string;
};

function useDismissableOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
}

export function Modal({
  open,
  title,
  onClose,
  children,
  description,
  footer,
  closeLabel,
}: OverlayProps) {
  useDismissableOverlay(open, onClose);
  if (!open) return null;
  const titleId = `modal-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="ui-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="ui-overlay-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="ui-icon-button" aria-label={closeLabel ?? `Close ${title}`} onClick={onClose}>×</button>
        </header>
        <div className="ui-overlay-body">{children}</div>
        {footer ? <footer className="ui-overlay-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  description,
  footer,
  closeLabel,
}: OverlayProps) {
  useDismissableOverlay(open, onClose);
  if (!open) return null;
  const titleId = `sheet-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="ui-overlay ui-sheet-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="ui-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="ui-sheet-handle" aria-hidden="true" />
        <header className="ui-overlay-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="ui-icon-button" aria-label={closeLabel ?? `Close ${title}`} onClick={onClose}>×</button>
        </header>
        <div className="ui-overlay-body">{children}</div>
        {footer ? <footer className="ui-overlay-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "◇",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <section className="ui-empty-state" aria-live="polite">
      <span className="ui-empty-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="ui-empty-action">{action}</div> : null}
    </section>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`ui-skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function LiveStreamCardSkeleton({
  count = 4,
  label = "Loading live creators",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <article className="ui-stream-card-skeleton" aria-hidden="true" key={index}>
          <Skeleton className="ui-skeleton-preview" />
          <div>
            <Skeleton className="ui-skeleton-avatar" />
            <span>
              <Skeleton className="ui-skeleton-line ui-skeleton-line-strong" />
              <Skeleton className="ui-skeleton-line" />
            </span>
          </div>
        </article>
      ))}
      <span className="sr-only" role="status">{label}</span>
    </>
  );
}
