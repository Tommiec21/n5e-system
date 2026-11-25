import sys, os
clan, title, pairs = sys.argv[1], sys.argv[2], sys.argv[3:]
cells = "".join(f'<figure><img src="{clan}/{k}.svg"><figcaption>{n}</figcaption></figure>' for k, n in (p.split("=", 1) for p in pairs))
open(f"{clan}-sheet.html", "w").write(f"""<!doctype html><html><body style="margin:0;background:#2a2622;font:600 15px/1.25 system-ui,sans-serif;color:#eee">
<h2 style="margin:18px 24px 6px;font:700 22px Georgia,serif">{title}</h2>
<div style="display:grid;grid-template-columns:repeat(5,170px);gap:14px 18px;padding:12px 24px 24px">{cells}</div>
<style>figure{{margin:0;text-align:center}} img{{width:150px;height:150px}} figcaption{{margin-top:6px}}</style></body></html>""")
