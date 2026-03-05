"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { ROLES, Role } from "@/lib/types";

interface MentionTextareaProps
  extends Omit<React.ComponentProps<"textarea">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (roles: Role[]) => void;
  onSubmit?: () => void;
  excludeRole?: Role;
}

function extractMentions(text: string): Role[] {
  const found: Role[] = [];
  for (const role of ROLES) {
    if (text.includes(`@${role}`)) found.push(role);
  }
  return found;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  onSubmit,
  excludeRole,
  className,
  ...textareaProps
}: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    bottom: number;
    left: number;
    width: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredRoles = ROLES.filter(
    (r) =>
      r !== excludeRole &&
      r.toLowerCase().startsWith(mentionQuery.toLowerCase())
  );

  const mentions = extractMentions(value);

  useEffect(() => {
    onMentionsChange?.(mentions);
  }, [mentions.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showDropdown && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showDropdown, mentionQuery]);

  useEffect(() => {
    if (!showDropdown) return;
    const close = () => setShowDropdown(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [showDropdown]);

  const insertMention = useCallback(
    (role: Role) => {
      if (mentionStart === null) return;
      const before = value.slice(0, mentionStart);
      const afterCursor = value.slice(mentionStart + 1 + mentionQuery.length);
      const newValue = `${before}@${role} ${afterCursor}`;
      onChange(newValue);
      setShowDropdown(false);
      setMentionQuery("");
      setMentionStart(null);
      setSelectedIndex(0);

      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          const pos = before.length + role.length + 2;
          ta.focus();
          ta.setSelectionRange(pos, pos);
        }
      });
    },
    [mentionStart, mentionQuery, value, onChange]
  );

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart ?? newValue.length;
    onChange(newValue);

    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (
      atIndex !== -1 &&
      (atIndex === 0 || /\s/.test(textBeforeCursor[atIndex - 1]))
    ) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!/\s/.test(query)) {
        setMentionStart(atIndex);
        setMentionQuery(query);
        setShowDropdown(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowDropdown(false);
    setMentionQuery("");
    setMentionStart(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (showDropdown && filteredRoles.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredRoles.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + filteredRoles.length) % filteredRoles.length
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredRoles[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }

  const dropdown = showDropdown &&
    filteredRoles.length > 0 &&
    dropdownPos && (
      <div
        ref={dropdownRef}
        className="fixed z-[100] overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        style={{
          bottom: `${dropdownPos.bottom}px`,
          left: `${dropdownPos.left}px`,
          width: `${dropdownPos.width}px`,
        }}
      >
        {filteredRoles.map((role, i) => (
          <button
            key={role}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              insertMention(role);
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
              i === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <span className="text-muted-foreground">@</span>
            {role}
          </button>
        ))}
      </div>
    );

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        {...textareaProps}
      />

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}

export { extractMentions };
