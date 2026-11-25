"""Scout-Nin core class features. King 2026-11-25: Scout iconography = kunai, shuriken, generic headbands,
energy, paths and momentum (every icon built from those six)."""
import math, os
from common import *
PAL = {"bg1": "#24465A", "bg2": "#0A1820", "acc": "#7FC4D8"}
A = PAL["acc"]
I = {}
# Scout-Nin (class): a headband over a crossed kunai and shuriken
I["scout-nin"] = kunai_at_ring(176, 420, 35, .75, f'stroke="{A}"') + shuriken(360, 360, 54, f'stroke="{A}"') + headband(240, 180, 300, 1.0, "", "#173040")
# Shinobi's Path (path): a road that branches three ways
I["shinobis-path"] = (f'<path d="M256 440 C256 370 196 350 214 300 C230 256 280 262 256 220"/>'
    f'<path d="M256 220 L256 110" stroke="{A}"/><path d="M222 144 L256 110 L290 144" stroke="{A}"/>'
    f'<path d="M256 220 L140 140" stroke="{A}"/><path d="M140 186 L136 138 L184 134" stroke="{A}"/>'
    f'<path d="M256 220 L372 140" stroke="{A}"/><path d="M328 134 L376 138 L372 186" stroke="{A}"/>')
# General Technique (kunai, shuriken): a fighting stance circle
I["general-technique"] = (f'<circle cx="256" cy="256" r="160" stroke="{A}" stroke-dasharray="14 26"/>' + kunai(236, 280, 45, .95) + shuriken(330, 330, 60))
# Adaptive Initiative (energy): a bolt inside a turning arrow
I["adaptive-initiative"] = (f'<path d="M380 200 A140 140 0 1 0 392 300" stroke="{A}"/><path d="M402 150 L382 204 L330 186" stroke="{A}"/>'
    '<path d="M276 130 L200 270 L262 270 L230 390 L320 236 L258 236 Z" fill="' + INK + '" fill-opacity=".15"/>')
# Superior Technique (shuriken, energy): a spinning shuriken trailing energy
I["superior-technique"] = (shuriken(300, 256, 110) + f'<path d="M150 170 A170 170 0 0 0 150 342" stroke="{A}"/><path d="M110 210 A130 130 0 0 0 110 302" stroke="{A}" stroke-opacity=".6"/>'
    + dots([(300, 256)], 10, A))
# Switch Hitter (kunai, shuriken, momentum): kunai and shuriken trading places on swap arrows
I["switch-hitter"] = (swap(256, 300, 150) + kunai(160, 170, 45, .6) + shuriken(360, 150, 54, f'stroke="{A}"'))
# Jack of All (kunai, shuriken, headband): one of each in a three-part wheel
pts = [(256 + 160*math.cos(math.radians(a)), 256 + 160*math.sin(math.radians(a))) for a in (-90, 30, 150)]
I["jack-of-all"] = (f'<circle cx="256" cy="256" r="160" stroke="{A}"/>' + "".join(f'<line x1="256" y1="256" x2="{x:.0f}" y2="{y:.0f}" stroke="{A}" stroke-width="10"/>' for x, y in pts)
    + kunai(256, 200, 0, .34) + shuriken(186, 316, 40, 'stroke-width="12"') + headband(318, 318, 96, .42, 'stroke-width="10"', "#173040"))
# Scouting Technique (headband, path): a headband over a winding road
I["scouting-technique"] = (f'<path d="M190 440 C200 380 330 370 300 320 C280 290 230 300 250 260" stroke="{A}" stroke-dasharray="1 30" stroke-width="20"/>'
    + headband(256, 170, 320, 1.0, "", "#173040"))
# Extra Attack (kunai): two kunai side by side
I["extra-attack"] = kunai(200, 270, -12, .95) + kunai(312, 270, 12, .95, f'stroke="{A}"')
# Superior Momentum (momentum, shuriken): chevrons driving a shuriken
I["superior-momentum"] = chevrons(90, 256, 3, 80, 66, f'stroke="{A}"') + shuriken(390, 256, 70)
# Signature Jutsu (energy, kunai): a kunai wrapped in chakra
I["signature-jutsu"] = ("".join(f'<path d="M{256 + 150*math.cos(math.radians(a)):.0f} {256 + 150*math.sin(math.radians(a)):.0f} Q{256 + 120*math.cos(math.radians(a+22)):.0f} {256 + 120*math.sin(math.radians(a+22)):.0f} {256 + 96*math.cos(math.radians(a+8)):.0f} {256 + 96*math.sin(math.radians(a+8)):.0f}" stroke="{A}"/>' for a in range(0, 360, 45))
    + kunai(256, 270, 35, .82))
# Signature Path (path, headband): a dotted road leading to a headband
I["signature-path"] = ('<path d="M130 440 C160 350 300 370 280 300 C268 256 210 260 236 220" stroke-dasharray="1 34" stroke-width="22"/>'
    + headband(270, 140, 230, .75, f'stroke="{A}"', "#173040"))
# Multifaceted (kunai, shuriken): a fan of kunai and shuriken thrown at once
I["multifaceted"] = (kunai_at_ring(256, 420, -38, .72) + kunai_at_ring(256, 420, 0, .78, f'stroke="{A}"') + kunai_at_ring(256, 420, 38, .72)
    + shuriken(120, 150, 34, 'stroke-width="12"') + shuriken(392, 150, 34, 'stroke-width="12"'))
# Signature Switch (momentum, energy, shuriken): swap arrows charged with energy
I["signature-switch"] = swap(240, 300, 140) + energy(380, 140, 62, f'stroke="{A}"')
# Superior Scout (headband, capstone): a headband in a laurel ring
lau = "".join(f'<ellipse cx="{256 + 175*math.cos(math.radians(a)):.0f}" cy="{256 + 175*math.sin(math.radians(a)):.0f}" rx="12" ry="26" transform="rotate({a} {256 + 175*math.cos(math.radians(a)):.0f} {256 + 175*math.sin(math.radians(a)):.0f})" stroke="{A}" stroke-width="10"/>' for a in list(range(110, 250, 24)) + list(range(-70, 71, 24)))
I["superior-scout"] = lau + headband(244, 236, 270, 1.0, "", "#173040") + shuriken(256, 360, 40, f'stroke="{A}" stroke-width="12"')
print(write(os.path.join(os.path.dirname(os.path.abspath(__file__)), "scout-nin"), I, PAL))
