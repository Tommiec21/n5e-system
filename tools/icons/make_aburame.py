import math, os
OUT = os.path.join(os.path.dirname(__file__), "aburame")
INK = "#F3E9D2"   # glyph
ACC = "#C9D86B"   # clan accent (chitin green-gold)
BG1, BG2 = "#3E4A22", "#141A0B"
def frame(body, accent=ACC):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="{BG1}"/><stop offset="1" stop-color="{BG2}"/></radialGradient></defs>
<rect x="8" y="8" width="496" height="496" rx="72" fill="url(#g)"/>
<rect x="22" y="22" width="468" height="468" rx="60" fill="none" stroke="{accent}" stroke-opacity=".55" stroke-width="6"/>
<g fill="none" stroke="{INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">{body}</g>
</svg>'''
def hexagon(cx, cy, r):
    pts = " ".join(f"{cx + r*math.cos(math.radians(60*i-30)):.1f},{cy + r*math.sin(math.radians(60*i-30)):.1f}" for i in range(6))
    return f'<polygon points="{pts}"/>'
def dots(pts, r=9, color=INK):
    return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="none"/>' for x, y in pts)
def beetle(cx, cy, s=1.0, fill=None):
    # oval shell split down the middle, head, six legs, two antennae
    f = f' fill="{fill}"' if fill else ""
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="{70*s}" ry="{92*s}"{f}/>'
            f'<line x1="{cx}" y1="{cy-70*s}" x2="{cx}" y2="{cy+92*s}"/>'
            f'<path d="M{cx-38*s} {cy-92*s} Q{cx} {cy-128*s} {cx+38*s} {cy-92*s}"/>'
            + "".join(f'<path d="M{cx+side*66*s} {cy+dy*s} l{side*40*s} {dz*s}"/>' for side in (-1, 1) for dy, dz in ((-40, -26), (5, 0), (50, 30)))
            + f'<path d="M{cx-18*s} {cy-118*s} q-18 -36 -44 -40"/><path d="M{cx+18*s} {cy-118*s} q18 -36 44 -40"/>')
ICONS = {}
# Clan: beetle over a honeycomb
ICONS["aburame"] = hexagon(256, 256, 170).replace("<polygon", f'<polygon stroke="{ACC}" stroke-opacity=".7"') + beetle(256, 270, 1.15)
# Symbiotic Hive: honeycomb cluster with insects
ICONS["symbiotic-hive"] = (hexagon(256, 186, 70) + hexagon(196, 290, 70) + hexagon(316, 290, 70)
    + dots([(256, 186), (196, 290), (316, 290)], 14, ACC) + dots([(140, 160), (372, 150), (390, 380), (120, 390), (256, 400)], 8))
# Ants: ant + whisper arcs
ICONS["ants"] = ('<circle cx="200" cy="300" r="34"/><ellipse cx="270" cy="300" rx="26" ry="22"/><ellipse cx="350" cy="300" rx="48" ry="36"/>'
    '<path d="M178 274 q-14 -40 -48 -54"/><path d="M196 268 q4 -44 -14 -70"/>'
    + "".join(f'<path d="M{x} 322 l{d} 50"/>' for x, d in ((250, -24), (272, 0), (294, 24)))
    + '<path d="M120 120 q30 -30 60 0" stroke="{a}"/><path d="M100 96 q50 -56 100 0" stroke="{a}" stroke-opacity=".7"/>'.format(a=ACC))
# Beetles: beetle inside a shield
ICONS["beetles"] = ('<path d="M256 70 L410 120 Q412 330 256 442 Q100 330 102 120 Z" stroke="' + ACC + '"/>' + beetle(256, 262, .78))
# Flies: fly + magnifying glass
ICONS["flies"] = ('<circle cx="230" cy="230" r="120" stroke="' + ACC + '"/><line x1="318" y1="318" x2="420" y2="420" stroke-width="26"/>'
    '<ellipse cx="230" cy="250" rx="26" ry="44"/><circle cx="230" cy="194" r="18"/>'
    '<ellipse cx="186" cy="214" rx="40" ry="20" transform="rotate(-30 186 214)"/><ellipse cx="274" cy="214" rx="40" ry="20" transform="rotate(30 274 214)"/>')
# Larva: segmented curled grub
segs = "".join(f'<circle cx="{256 + 110*math.cos(math.radians(a)):.0f}" cy="{256 + 110*math.sin(math.radians(a)):.0f}" r="{34 - i*2}"/>' for i, a in enumerate(range(200, 470, 34)))
ICONS["larva"] = segs + dots([(256 + 110*math.cos(math.radians(200)) - 10, 256 + 110*math.sin(math.radians(200)) - 8)], 7)
# Mosquitoes: mosquito + blood drop
ICONS["mosquitoes"] = ('<ellipse cx="230" cy="250" rx="22" ry="70" transform="rotate(35 230 250)"/><circle cx="296" cy="192" r="20"/>'
    '<line x1="312" y1="176" x2="372" y2="116"/>'
    '<path d="M214 214 q-80 -70 -110 -30 q30 40 110 30"/><path d="M240 210 q-10 -100 -60 -110 q-10 50 60 110"/>'
    + "".join(f'<path d="M{x} {y} l{dx} {dy}"/>' for x, y, dx, dy in ((210, 280, -60, 60), (232, 290, -20, 90), (250, 284, 30, 80)))
    + f'<path d="M380 300 q40 60 0 92 q-40 -32 0 -92 Z" fill="{ACC}" stroke="{ACC}"/>')
# Moths: moth with broad wings, hovering line
ICONS["moths"] = ('<ellipse cx="256" cy="230" rx="18" ry="70"/>'
    '<path d="M248 200 Q130 90 96 170 Q110 250 246 236"/><path d="M264 200 Q382 90 416 170 Q402 250 266 236"/>'
    '<path d="M246 246 Q160 300 170 350 Q220 344 250 270"/><path d="M266 246 Q352 300 342 350 Q292 344 262 270"/>'
    '<path d="M246 164 q-20 -40 -48 -48"/><path d="M266 164 q20 -40 48 -48"/>'
    f'<path d="M150 420 h212" stroke="{ACC}" stroke-dasharray="4 26"/>')
# Parasites: medical cross with a small worm
ICONS["parasites"] = ('<path d="M216 96 h80 v120 h120 v80 h-120 v120 h-80 v-120 h-120 v-80 h120 Z" stroke="' + ACC + '"/>'
    '<path d="M196 256 q20 -30 40 0 t40 0 t40 0" stroke-width="18"/>' + dots([(332, 250)], 9))
# Worms: worm rising from ground + tremor lines
ICONS["worms"] = ('<path d="M100 380 h312" stroke="' + ACC + '"/>'
    '<path d="M220 380 q0 -80 30 -110 q40 -40 10 -100 q-14 -30 20 -50" stroke-width="30"/>' + dots([(290, 116)], 8, BG2)
    + '<path d="M120 420 q20 -14 40 0 t40 0" /><path d="M312 420 q20 -14 40 0 t40 0"/>')
# Kikaichu Swarm: a stream of insects forming a strike arrow
sw = [(120 + i*26, 380 - i*24 + (12 if i % 2 else -12)) for i in range(11)]
ICONS["kikaichu-swarm"] = dots(sw, 11) + dots([(x + 30, y + 20) for x, y in sw[1::2]], 7, ACC) + '<path d="M330 120 L410 110 L400 190" stroke="' + ACC + '" stroke-width="20"/>'
# Festering Brood: a drained drop with bugs boring in
ICONS["festering-brood"] = ('<path d="M256 90 Q350 230 350 300 A94 94 0 0 1 162 300 Q162 230 256 90 Z" stroke="' + ACC + '"/>'
    '<path d="M200 300 q56 40 112 0" stroke-dasharray="6 22"/>' + dots([(226, 250), (290, 236), (256, 330), (214, 346), (306, 330)], 10))
# Deceptive Swarm: a human silhouette made of insects
body = [(256, 130), (236, 150), (276, 150), (256, 170)] + [(256 + dx, 210 + dy) for dy in range(0, 120, 28) for dx in (-40, -14, 14, 40)] \
     + [(206, 220), (306, 220), (190, 260), (322, 260)] + [(236, 340 + i*30) for i in range(3)] + [(276, 340 + i*30) for i in range(3)]
ICONS["deceptive-swarm"] = dots(body, 11) + '<path d="M120 120 l40 40 M392 120 l-40 40" stroke="' + ACC + '" stroke-dasharray="2 22"/>'
# Grand Veil: an eye swallowed by a cloud of insects
import random
random.seed(7)
cloud = [(256 + random.gauss(0, 95), 256 + random.gauss(0, 80)) for _ in range(70)]
cloud = [(round(x), round(y)) for x, y in cloud if 70 < x < 442 and 70 < y < 442]
ICONS["grand-veil"] = ('<path d="M120 256 Q256 140 392 256 Q256 372 120 256 Z" stroke="' + ACC + '"/><circle cx="256" cy="256" r="40" stroke="' + ACC + '"/>'
    + dots(cloud, 6))

def bug(x, y, a, s=1.0):
    return (f'<g transform="translate({x} {y}) rotate({a}) scale({s})"><ellipse cx="0" cy="0" rx="12" ry="18" fill="{INK}" stroke="none"/>'
            f'<path d="M-12 -6 l-12 -8 M12 -6 l12 -8 M-12 8 l-12 8 M12 8 l12 8" stroke-width="7"/></g>')
ICONS["festering-brood"] = ('<path d="M256 80 Q356 228 356 300 A100 100 0 0 1 156 300 Q156 228 256 80 Z" stroke="' + ACC + '"/>'
    '<path d="M176 320 Q256 300 336 320 Q336 390 256 392 Q176 390 176 320 Z" fill="' + ACC + '" fill-opacity=".35" stroke="none"/>'
    '<path d="M256 150 v70 m-26 -26 l26 26 l26 -26" stroke-width="14"/>'
    + bug(150, 210, -35) + bug(368, 250, 30) + bug(176, 396, -120, .9) + bug(340, 380, 140, .9))
# person outline made of insects (dots along the outline)
def along(path_pts, step):
    out=[]
    for (x1,y1),(x2,y2) in zip(path_pts, path_pts[1:]):
        n=max(1,int(math.hypot(x2-x1,y2-y1)//step))
        out+= [(x1+(x2-x1)*i/n, y1+(y2-y1)*i/n) for i in range(n)]
    return out
head=[(256+46*math.cos(math.radians(a)), 150+46*math.sin(math.radians(a))) for a in range(0,360,30)]
body=along([(150,420),(156,300),(196,236),(316,236),(356,300),(362,420)], 30)
ICONS["deceptive-swarm"] = (dots([(round(x),round(y)) for x,y in head+body], 10)
    + dots([(round(x),round(y)) for x,y in [(232,140),(280,140)]], 6, ACC)
    + '<path d="M106 120 q30 20 40 50 M406 120 q-30 20 -40 50" stroke="' + ACC + '" stroke-dasharray="2 20"/>')

os.makedirs(OUT, exist_ok=True)
for k, body in ICONS.items():
    open(os.path.join(OUT, f"{k}.svg"), "w").write(frame(body))
print(len(ICONS))
