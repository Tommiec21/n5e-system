"""N5e feature icons: shared tile, palette and reusable shapes (see 14-feature-icon-design.md)."""
import math, os
INK = "#F3E9D2"
def frame(body, pal):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="{pal['bg1']}"/><stop offset="1" stop-color="{pal['bg2']}"/></radialGradient></defs>
<rect x="8" y="8" width="496" height="496" rx="72" fill="url(#g)"/>
<rect x="22" y="22" width="468" height="468" rx="60" fill="none" stroke="{pal['acc']}" stroke-opacity=".55" stroke-width="6"/>
<g fill="none" stroke="{INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">{body}</g>
</svg>'''
def dots(pts, r=9, color=INK):
    return "".join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="{color}" stroke="none"/>' for x, y in pts)
def hexagon(cx, cy, r, extra=""):
    pts = " ".join(f"{cx + r*math.cos(math.radians(60*i-30)):.1f},{cy + r*math.sin(math.radians(60*i-30)):.1f}" for i in range(6))
    return f'<polygon points="{pts}" {extra}/>'
def star(cx, cy, r, points=5, inner=.45, extra=""):
    pts = []
    for i in range(points * 2):
        rr = r if i % 2 == 0 else r * inner
        a = math.radians(-90 + i * 180 / points)
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" {extra}/>'
def kunai(x, y, angle, s=1.0, extra=""):
    # blade, guard, grip, ring; pointing up before rotation
    return (f'<g transform="translate({x} {y}) rotate({angle}) scale({s})" {extra}>'
            '<path d="M0 -150 L26 -40 L0 -20 L-26 -40 Z"/><line x1="0" y1="-20" x2="0" y2="60"/>'
            '<line x1="-14" y1="0" x2="14" y2="0"/><line x1="-14" y1="30" x2="14" y2="30"/><circle cx="0" cy="86" r="24"/></g>')
def shuriken(cx, cy, r, extra=""):
    return star(cx, cy, r, 4, .32, extra) + f'<circle cx="{cx}" cy="{cy}" r="{r*.16:.0f}"/>'
def die(cx, cy, r, label="", extra=""):
    # d8-style diamond (Superiority Die)
    d = f'<polygon points="{cx},{cy-r} {cx+r*.8},{cy} {cx},{cy+r} {cx-r*.8},{cy}" {extra}/><line x1="{cx-r*.8}" y1="{cy}" x2="{cx+r*.8}" y2="{cy}"/>'
    return d
def swap(cx, cy, w, extra=""):
    return (f'<g {extra}><path d="M{cx-w} {cy-40} H{cx+w}"/><path d="M{cx+w-40} {cy-80} L{cx+w} {cy-40} L{cx+w-40} {cy}"/>'
            f'<path d="M{cx+w} {cy+50} H{cx-w}"/><path d="M{cx-w+40} {cy+10} L{cx-w} {cy+50} L{cx-w+40} {cy+90}"/></g>')
def headband(cx, cy, w=300, s=1.0, extra="", plate_fill="#0B1218"):
    """A generic shinobi headband, front view: a cloth band, a metal plate (filled dark so the band
    doesn't show through) with four rivets and one plain groove (no village mark), two tails on the right."""
    h = 56 * s
    pw, ph = w * .46, h * 1.7
    return (f'<g {extra}><rect x="{cx-w/2:.0f}" y="{cy-h/2:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{h*.3:.0f}"/>'
            f'<path d="M{cx+w/2-6:.0f} {cy-h*.2:.0f} q{50*s:.0f} {6*s:.0f} {80*s:.0f} {70*s:.0f} M{cx+w/2-6:.0f} {cy+h*.25:.0f} q{30*s:.0f} {30*s:.0f} {36*s:.0f} {96*s:.0f}" stroke-width="{max(8, 14*s):.0f}"/>'
            f'<rect x="{cx-pw/2:.0f}" y="{cy-ph/2:.0f}" width="{pw:.0f}" height="{ph:.0f}" rx="{14*s:.0f}" fill="{plate_fill}"/>'
            f'<line x1="{cx-pw*.24:.0f}" y1="{cy:.0f}" x2="{cx+pw*.24:.0f}" y2="{cy:.0f}" stroke-width="{max(6, 10*s):.0f}"/>'
            + "".join(f'<circle cx="{cx + dx*pw/2*.74:.0f}" cy="{cy + dy*ph/2*.6:.0f}" r="{max(3, 6*s):.1f}" fill="{INK}" stroke="none"/>' for dx in (-1, 1) for dy in (-1, 1))
            + '</g>')
def kunai_at_ring(rx, ry, angle, s=1.0, extra=""):
    """A kunai placed by its ring (for fans that spread from one hand)."""
    a = math.radians(angle)
    return kunai(rx + 86*s*math.sin(a), ry - 86*s*math.cos(a), angle, s, extra)
def energy(cx, cy, r, extra=""):
    """Chakra energy: an open spiral with three sparks."""
    pts = []
    for i in range(60):
        a = math.radians(i * 12)
        rr = r * (0.12 + i / 60 * .88)
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    sparks = "".join(f'<path d="M{cx + r*1.15*math.cos(math.radians(a)):.0f} {cy + r*1.15*math.sin(math.radians(a)):.0f} l{14*math.cos(math.radians(a)):.0f} {14*math.sin(math.radians(a)):.0f}"/>' for a in (-60, 60, 180))
    return f'<g {extra}><polyline points="{" ".join(pts)}"/>{sparks}</g>'
def chevrons(x, cy, n=3, size=80, gap=70, last_extra=""):
    return "".join(f'<path d="M{x+i*gap} {cy-size} L{x+i*gap+size} {cy} L{x+i*gap} {cy+size}" {last_extra if i == n-1 else ""}/>' for i in range(n))
def write(outdir, icons, pal):
    os.makedirs(outdir, exist_ok=True)
    for k, body in icons.items():
        open(os.path.join(outdir, f"{k}.svg"), "w").write(frame(body, pal))
    return len(icons)
