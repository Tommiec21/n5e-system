import math, os
from common import *
PAL = {"bg1": "#24465A", "bg2": "#0A1820", "acc": "#7FC4D8"}
A = PAL["acc"]
I = {}
# Scout-Nin (class): compass star
I["scout-nin"] = (f'<circle cx="256" cy="256" r="170" stroke="{A}"/>' + star(256, 256, 150, 4, .26) + star(256, 256, 96, 4, .3, 'transform="rotate(45 256 256)" stroke-width="10"')
    + dots([(256, 256)], 14, A))
# Shinobi's Path: a winding path that branches three ways
I["shinobis-path"] = (f'<path d="M256 440 C256 360 190 340 210 280 C228 228 290 230 256 170"/>'
    f'<path d="M256 170 L256 96" stroke="{A}"/><path d="M226 120 L256 90 L286 120" stroke="{A}"/>'
    f'<path d="M256 170 L170 110" stroke="{A}"/><path d="M168 150 L166 106 L208 102" stroke="{A}"/>'
    f'<path d="M256 170 L342 110" stroke="{A}"/><path d="M304 102 L346 106 L344 150" stroke="{A}"/>')
# General Technique: crossed kunai (a fighting stance)
I["general-technique"] = kunai(256, 270, -40, .95) + kunai(256, 270, 40, .95) + f'<circle cx="256" cy="230" r="150" stroke="{A}" stroke-dasharray="14 26"/>'
# Adaptive Initiative: a bolt inside a turning arrow
I["adaptive-initiative"] = (f'<path d="M380 200 A140 140 0 1 0 392 300" stroke="{A}"/><path d="M402 150 L382 204 L330 186" stroke="{A}"/>'
    '<path d="M276 130 L200 270 L262 270 L230 390 L320 236 L258 236 Z" fill="' + INK + '" fill-opacity=".15"/>')
# Superior Technique: Superiority Die with flowing lines
I["superior-technique"] = (die(300, 250, 120, extra=f'stroke="{A}"') + '<path d="M90 190 h90 M70 250 h110 M90 310 h90"/>' + star(300, 250, 30, 5, .45, f'fill="{A}" stroke="none"'))
# Switch Hitter: swap arrows between a kunai and a hand seal (circle)
I["switch-hitter"] = (swap(256, 256, 150) + kunai(150, 150, 45, .45) + f'<circle cx="360" cy="370" r="34" stroke="{A}"/>')
# Jack of All: three-part wheel (Warfare, Seize, Tactics)
pts = [(256 + 150*math.cos(math.radians(a)), 256 + 150*math.sin(math.radians(a))) for a in (-90, 30, 150)]
I["jack-of-all"] = (f'<circle cx="256" cy="256" r="150" stroke="{A}"/>' + "".join(f'<line x1="256" y1="256" x2="{x:.0f}" y2="{y:.0f}"/>' for x, y in pts)
    + kunai(256, 205, 0, .35) + shuriken(206, 310, 34) + f'<path d="M296 290 l36 36 m0 -36 l-36 36" stroke="{A}"/>')
# Scouting Technique: a spyglass
I["scouting-technique"] = ('<g transform="rotate(-35 256 256)"><rect x="110" y="226" width="110" height="60" rx="10"/><rect x="220" y="216" width="110" height="80" rx="10"/>'
    f'<rect x="330" y="204" width="70" height="104" rx="12" stroke="{A}"/></g>' + '<path d="M150 390 h80 M190 350 v80" stroke-width="10"/>')
# Extra Attack: two kunai side by side
I["extra-attack"] = kunai(200, 270, -12, .95) + kunai(312, 270, 12, .95, f'stroke="{A}"')
# Superior Momentum: chevrons + die
I["superior-momentum"] = ("".join(f'<path d="M{x} 170 L{x+80} 256 L{x} 342"/>' for x in (110, 190)) + f'<path d="M270 170 L350 256 L270 342" stroke="{A}"/>'
    + die(400, 140, 50, extra=f'stroke="{A}"'))
# Signature Jutsu: a scroll with a seal star
I["signature-jutsu"] = ('<rect x="130" y="150" width="252" height="212" rx="14"/><path d="M110 150 h292 M110 362 h292" stroke-width="26"/>'
    + star(256, 256, 64, 5, .45, f'stroke="{A}"'))
# Signature Path: a path leading to a star
I["signature-path"] = ('<path d="M130 430 C160 340 300 360 280 280 C266 226 200 230 230 180" stroke-dasharray="1 34" stroke-width="22"/>'
    + star(280, 130, 66, 5, .45, f'stroke="{A}" fill="{A}" fill-opacity=".25"'))
# Multifaceted: a cut gem
I["multifaceted"] = (f'<path d="M150 190 L206 120 H306 L362 190 L256 400 Z" stroke="{A}"/><path d="M150 190 H362 M206 120 L230 190 L256 400 L282 190 L306 120"/>')
# Signature Switch: swap arrows with a star
I["signature-switch"] = swap(240, 280, 140) + star(380, 150, 54, 5, .45, f'stroke="{A}" fill="{A}" fill-opacity=".25"')
# Superior Scout: compass star with a laurel
lau = "".join(f'<ellipse cx="{256 + 175*math.cos(math.radians(a)):.0f}" cy="{256 + 175*math.sin(math.radians(a)):.0f}" rx="12" ry="26" transform="rotate({a} {256 + 175*math.cos(math.radians(a)):.0f} {256 + 175*math.sin(math.radians(a)):.0f})" stroke="{A}" stroke-width="10"/>' for a in list(range(110, 250, 24)) + list(range(-70, 71, 24)))
I["superior-scout"] = star(256, 256, 130, 4, .26) + star(256, 256, 80, 4, .3, 'transform="rotate(45 256 256)" stroke-width="10"') + lau + dots([(256, 256)], 14, A)

# --- second pass ---
I["shinobis-path"] = (f'<path d="M256 440 C256 370 196 350 214 300 C230 256 280 262 256 220"/>'
    f'<path d="M256 220 L256 110" stroke="{A}"/><path d="M222 144 L256 110 L290 144" stroke="{A}"/>'
    f'<path d="M256 220 L140 140" stroke="{A}"/><path d="M140 186 L136 138 L184 134" stroke="{A}"/>'
    f'<path d="M256 220 L372 140" stroke="{A}"/><path d="M328 134 L376 138 L372 186" stroke="{A}"/>')
I["general-technique"] = (f'<circle cx="256" cy="256" r="160" stroke="{A}" stroke-dasharray="14 26"/>' + kunai(236, 280, 45, .95) + shuriken(330, 330, 60))
I["switch-hitter"] = (swap(256, 290, 140) + kunai(150, 150, 45, .55) + f'<circle cx="380" cy="150" r="44" stroke="{A}"/><circle cx="380" cy="150" r="12" fill="{A}" stroke="none"/>')
I["jack-of-all"] = (f'<circle cx="256" cy="256" r="160" stroke="{A}"/>' + "".join(f'<line x1="256" y1="256" x2="{x:.0f}" y2="{y:.0f}" stroke="{A}" stroke-width="10"/>' for x, y in pts)
    + kunai(256, 200, 0, .32)
    + '<g stroke-width="12"><ellipse cx="178" cy="318" rx="22" ry="14" transform="rotate(-30 178 318)"/><ellipse cx="206" cy="300" rx="22" ry="14" transform="rotate(-30 206 300)"/></g>'
    + '<path d="M312 352 V280 L360 296 L312 312" stroke-width="12"/>')
I["scouting-technique"] = ('<g transform="rotate(-35 256 256)"><rect x="100" y="226" width="110" height="60" rx="10"/><rect x="210" y="216" width="110" height="80" rx="10"/>'
    f'<rect x="320" y="204" width="70" height="104" rx="12" stroke="{A}"/></g>'
    f'<path d="M402 120 l22 -22 M420 160 h30 M366 92 v-30" stroke="{A}" stroke-width="12"/>')
print(write(os.path.join(os.path.dirname(os.path.abspath(__file__)), "scout-nin"), I, PAL))
