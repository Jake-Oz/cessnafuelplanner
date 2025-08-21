// Server component: injects an inline script in <head> to set Tailwind dark class before paint
export default function ThemeInitScript() {
  const script = `(() => {
    try {
      const el = document.documentElement;
      const saved = localStorage.getItem('theme');
      const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved ? saved === 'dark' : sysDark;
      if (isDark) {
        el.classList.add('dark');
      } else {
        el.classList.remove('dark');
      }
    } catch {}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
