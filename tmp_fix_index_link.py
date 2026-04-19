from pathlib import Path
p = Path('/Users/tushar/.openclaw/workspace/dist/cyberpulse-site/index.html')
text = p.read_text()
old = '<a href="./posts/2026-04-18.html" data-analytics="hero-panel-click">'
new = '<a href="./posts/2026-04-19.html" data-analytics="hero-panel-click">'
if old not in text:
    raise SystemExit('old hero link not found')
text = text.replace(old, new, 1)
p.write_text(text)
print('patched')
