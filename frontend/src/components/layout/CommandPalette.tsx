import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Command,
  Sun,
  Moon,
  Layers,
  BarChart3,
  BookOpen,
  Settings,
  Cpu,
  Radio,
  Database,
  Zap,
  ArrowRight,
  X,
} from "lucide-react";
import { learningModules } from "../../content/modules";
import { domainCatalog } from "../../content/domains";
import { playClick } from "../../engines/audio/sound-fx";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: "Modules" | "Navigation" | "Actions";
  icon: typeof Search;
  keywords?: string[];
  action: () => void;
  badge?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or shortcut
        }
      }
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build searchable commands list
  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-overview",
      title: "Overview & Roadmap",
      category: "Navigation",
      icon: Layers,
      action: () => {
        navigate("/");
        onClose();
      },
    },
    {
      id: "nav-progress",
      title: "Competency Radar & Progress",
      category: "Navigation",
      icon: BarChart3,
      action: () => {
        navigate("/progress");
        onClose();
      },
    },
    {
      id: "nav-knowledge",
      title: "Knowledge Base & Assessment",
      category: "Navigation",
      icon: BookOpen,
      action: () => {
        navigate("/knowledge");
        onClose();
      },
    },
    {
      id: "nav-settings",
      title: "Workbench Settings & Shortcuts",
      category: "Navigation",
      icon: Settings,
      action: () => {
        navigate("/settings");
        onClose();
      },
    },

    // Actions
    {
      id: "action-theme",
      title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      category: "Actions",
      icon: theme === "dark" ? Sun : Moon,
      badge: "Theme",
      action: () => {
        onToggleTheme();
        onClose();
      },
    },

    // Interactive Modules
    ...learningModules.map((m) => {
      const domain = domainCatalog.find((d) => d.id === m.domainId);
      const icon =
        m.domainId === "messaging"
          ? Radio
          : m.domainId === "databases"
          ? Database
          : m.domainId === "caching"
          ? Zap
          : Cpu;

      return {
        id: `module-${m.slug}`,
        title: m.title,
        category: "Modules" as const,
        icon,
        badge: domain?.title.split("&")[0].trim() || m.domainId,
        keywords: [
          m.domainId,
          m.simulationId ?? "",
          ...m.keyTerms.map((k) => k.term),
        ],
        action: () => {
          navigate(`/domains/${m.domainId}/${m.slug}`);
          onClose();
        },
      };
    }),
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const cleanQ = query.toLowerCase();
    const titleMatch = cmd.title.toLowerCase().includes(cleanQ);
    const badgeMatch = cmd.badge?.toLowerCase().includes(cleanQ);
    const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(cleanQ));
    return titleMatch || badgeMatch || keywordMatch;
  });

  const handleSelect = (cmd: CommandItem) => {
    playClick();
    cmd.action();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredCommands[selectedIndex]);
    }
  };

  return (
    <div className="cmd-palette-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="cmd-palette-dialog"
        onClick={(e) => e.stopPropagation()}
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
      >
        <div className="cmd-palette-input-wrap">
          <Search size={18} className="cmd-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Type a command, domain, or lab name (e.g. Kafka, B-Tree, Virtual Threads)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            aria-label="Search modules and actions"
          />
          <div className="cmd-palette-esc">
            <kbd>ESC</kbd>
            <button
              type="button"
              className="icon-button cmd-close-btn"
              onClick={onClose}
              aria-label="Close command palette"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="cmd-palette-results" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="cmd-empty-state">
              <p>No matching interactive labs or commands found.</p>
              <span>Try searching for &quot;Memory&quot;, &quot;Rebalance&quot;, &quot;MVCC&quot;, or &quot;Stampede&quot;.</span>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = cmd.icon;

              return (
                <div
                  key={cmd.id}
                  className={`cmd-palette-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="cmd-item-left">
                    <Icon size={16} className="cmd-item-icon" aria-hidden="true" />
                    <span className="cmd-item-title">{cmd.title}</span>
                  </div>
                  <div className="cmd-item-right">
                    {cmd.badge ? (
                      <span className="cmd-item-badge">{cmd.badge}</span>
                    ) : (
                      <span className="cmd-item-category">{cmd.category}</span>
                    )}
                    <ArrowRight size={13} className="cmd-item-arrow" aria-hidden="true" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cmd-palette-footer">
          <div className="cmd-footer-hints">
            <span><kbd>&uarr;</kbd> <kbd>&darr;</kbd> Navigate</span>
            <span><kbd>&crarr;</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <div className="cmd-footer-brand">
            <Command size={12} />
            <span>Backend Visual Lab</span>
          </div>
        </div>
      </div>
    </div>
  );
}
