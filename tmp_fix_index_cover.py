from pathlib import Path
p = Path('/Users/tushar/.openclaw/workspace/dist/cyberpulse-site/index.html')
text = p.read_text()
old = './assets/covers/2026-04-18.png'
new = './assets/covers/2026-04-19.png'
if old not in text:
    raise SystemExit('old homepage cover path not found')
text = text.replace(old, new, 1)
p.write_text(text)
print('patched')
