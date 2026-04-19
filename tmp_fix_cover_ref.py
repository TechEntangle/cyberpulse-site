from pathlib import Path
p = Path('/Users/tushar/.openclaw/workspace/dist/cyberpulse-site/posts/2026-04-19.html')
text = p.read_text()
old = '          <img class="article-cover" src="/assets/og/2026-04-19.png" alt="CyberPulse editorial visual for The Half-Life of Exposure Is Shrinking" loading="lazy">'
new = '          <img class="article-cover" src="/assets/covers/2026-04-19.png" alt="CyberPulse editorial visual for The Half-Life of Exposure Is Shrinking" loading="lazy">'
if old not in text:
    raise SystemExit('old string not found')
text = text.replace(old, new, 1)
p.write_text(text)
print('patched')
