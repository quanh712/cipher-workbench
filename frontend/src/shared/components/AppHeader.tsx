import { useTheme } from "../hooks/useTheme";
import { ThemeToggle } from "./ThemeToggle";
import { CipherMark } from "./CipherMark";

interface AppHeaderProps {
  disabled: boolean;
  onReset: () => void;
}

export function AppHeader({ disabled, onReset }: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="nav" aria-label="Điều hướng chính">
      <div className="nav__inner">
        <a
          className="logo brand-lockup"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="Cipher Workbench"
        >
          <CipherMark busy={disabled} />
          <span className="brand-name">
            <span className="brand-name__cipher">Cipher</span> <span>Workbench</span>
          </span>
        </a>
        <div className="nav__actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="refresh-button" type="button" onClick={onReset} disabled={disabled}>
            <span aria-hidden="true">↻</span>
            Đặt lại tất cả
          </button>
        </div>
      </div>
    </nav>
  );
}
