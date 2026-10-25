"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const storageKey = "project-theme";
const themeChangeEvent = "project-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(storageKey) === "light";
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const light = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) === "light";
    document.documentElement.classList.toggle("light-theme", saved);
  }, []);

  function toggle() {
    const next = !light;
    document.documentElement.classList.toggle("light-theme", next);
    localStorage.setItem(storageKey, next ? "light" : "dark");
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return <button type="button" onClick={toggle} aria-label="Переключить тему оформления" aria-pressed={light} className="app-theme-toggle"><Sun className="h-4 w-4" aria-hidden="true" /><span>Сменить тему</span><Moon className="h-4 w-4" aria-hidden="true" /></button>;
}
