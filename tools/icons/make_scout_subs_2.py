"""Scout-Nin subclasses, batch 2 (King 2026-11-25): Barrier Scout and Cloning Scout. The Scout palette;
each subclass its own iconography. Barrier: chakra barriers (hex-panel domes, bubbles, shields, rings).
Cloning: Bunshin (repeated figures, dashed copies), smoke puffs, multiplying."""
import math, os
from common import *
PAL = {"bg1": "#24465A", "bg2": "#0A1820", "acc": "#7FC4D8"}
A = PAL["acc"]
HERE = os.path.dirname(os.path.abspath(__file__))
SH = "M256 64 L420 120 Q422 330 256 452 Q90 330 92 120 Z"

def dome(cx, cy, r, extra=""):
    """A chakra barrier dome made of hex panels: an arc with a few panel seams."""
    seams = "".join(f'<line x1="{cx + r*math.cos(math.radians(a)):.0f}" y1="{cy - r*math.sin(math.radians(a)):.0f}" x2="{cx + r*.55*math.cos(math.radians(a)):.0f}" y2="{cy - r*.55*math.sin(math.radians(a)):.0f}"/>' for a in (40, 90, 140))
    return (f'<g {extra}><path d="M{cx - r} {cy} A{r} {r} 0 0 1 {cx + r} {cy}"/><path d="M{cx - r*.55:.0f} {cy} A{r*.55:.0f} {r*.55:.0f} 0 0 1 {cx + r*.55:.0f} {cy}"/>{seams}'
            f'<line x1="{cx - r - 20}" y1="{cy}" x2="{cx + r + 20}" y2="{cy}"/></g>')
def shield(extra="", s=1.0, cx=256, cy=258):
    return f'<path d="{SH}" transform="translate({cx - 256*s:.0f} {cy - 258*s:.0f}) scale({s})" {extra}/>'
def puff(cx, cy, r, extra=""):
    """A smoke puff (a clone appearing or leaving): one cloud outline with a swirl inside."""
    k = r / 100
    d = (f"M{cx-95*k:.0f} {cy+40*k:.0f} Q{cx-120*k:.0f} {cy-10*k:.0f} {cx-70*k:.0f} {cy-30*k:.0f} Q{cx-60*k:.0f} {cy-90*k:.0f} {cx:.0f} {cy-80*k:.0f} "
         f"Q{cx+50*k:.0f} {cy-110*k:.0f} {cx+80*k:.0f} {cy-40*k:.0f} Q{cx+130*k:.0f} {cy-20*k:.0f} {cx+100*k:.0f} {cy+40*k:.0f} Z")
    return f'<g {extra}><path d="{d}"/><path d="M{cx-30*k:.0f} {cy+10*k:.0f} q{30*k:.0f} {-40*k:.0f} {60*k:.0f} 0" stroke-width="12"/></g>'
def ghost(cx, cy, s=1.0):
    """A Bunshin: a dashed copy of a figure in the accent color."""
    return person(cx, cy, s, f'stroke="{A}" stroke-dasharray="10 16"')

BA = {}
BA["barrier-scout"] = dome(256, 380, 190, f'stroke="{A}"') + person(256, 340, 1.0)
BA["superior-defense"] = shield(f'stroke="{A}"') + "".join(hexagon(256 + dx, 250 + dy, 40, 'stroke-width="10"') for dx, dy in ((0, -70), (-60, -35), (60, -35), (-60, 35), (60, 35), (0, 70), (0, 0)))
BA["chakra-barrier"] = f'<circle cx="256" cy="256" r="170" stroke="{A}"/><circle cx="256" cy="256" r="146" stroke="{A}" stroke-opacity=".4" stroke-width="8"/>' + person(256, 290, 1.1)
BA["projected-barrier"] = person(256, 290, .8) + "".join(f'<circle cx="256" cy="256" r="{r}" stroke="{A}" stroke-opacity="{o}" stroke-dasharray="{d}"/>' for r, o, d in ((110, 1, "none"), (160, .7, "20 18"), (205, .45, "8 22")))
BA["sturdy-shielding"] = shield(f'stroke="{A}"') + '<path d="M256 170 V330 M176 250 H336" stroke-width="30"/>'
BA["rallying-barrier"] = (dome(256, 420, 200, f'stroke="{A}"') + "".join(person(256 + dx, 400, .55) for dx in (-120, -40, 40, 120))
    + "".join(f'<path d="M{x} {y-22} v44 M{x-22} {y} h44" stroke-width="12"/>' for x, y in ((150, 120), (362, 120))))
BA["mastered-barrier"] = shield(f'stroke="{A}" stroke-opacity=".4"', 1.0) + shield(f'stroke="{A}" stroke-opacity=".7"', .78) + shield('', .56)
BA["adaptive-shielding"] = shield(f'stroke="{A}"') + '<path d="M330 200 A90 90 0 1 0 336 300"/><path d="M350 150 L332 204 L282 190"/>'
lau = "".join(f'<ellipse cx="{256 + 190*math.cos(math.radians(a)):.0f}" cy="{256 + 190*math.sin(math.radians(a)):.0f}" rx="12" ry="26" transform="rotate({a} {256 + 190*math.cos(math.radians(a)):.0f} {256 + 190*math.sin(math.radians(a)):.0f})" stroke="{A}" stroke-width="10"/>' for a in list(range(110, 250, 24)) + list(range(-70, 71, 24)))
BA["superior-shielding"] = lau + dome(256, 330, 130, f'stroke="{A}"') + person(256, 310, .65)

CL = {}
CL["cloning-scout"] = ghost(150, 300, .9) + ghost(362, 300, .9) + person(256, 290, 1.25)
CL["superior-clones"] = puff(330, 330, 110, f'stroke="{A}"') + person(170, 280, 1.0)
CL["taju-kage-bunshin"] = "".join(ghost(130 + i*84, 200, .55) for i in range(4)) + "".join(ghost(170 + i*84, 300, .55) for i in range(3)) + person(256, 410, .7)
CL["clones-everywhere"] = (f'<path d="M110 256 Q200 176 290 256 Q200 336 110 256 Z"/><circle cx="200" cy="256" r="30"/>'
    f'<path d="M222 256 Q312 176 402 256 Q312 336 222 256 Z" stroke="{A}" stroke-dasharray="10 16"/>'
    + star(150, 140, 26, 5, .45, f'stroke="{A}"') + star(362, 380, 26, 5, .45, f'stroke="{A}"') + star(380, 130, 18, 5, .45))
CL["never-alone"] = person(210, 290, 1.25) + ghost(320, 290, 1.25)
CL["specialized-clones"] = ("".join(ghost(130 + i*126, 330, .8) for i in range(3))
    + '<path d="M130 150 q30 40 0 70 q-30 -30 0 -70 Z"/>' + '<path d="M266 140 L236 200 H272 L246 250"/>' + '<path d="M382 150 q30 30 10 64 q-20 -10 -10 -30 q-20 20 -10 40 q-30 -30 10 -74 Z"/>')
CL["clone-tactics"] = puff(150, 330, 80, f'stroke="{A}"') + '<path d="M210 250 C260 180 300 180 330 220" stroke-dasharray="1 26" stroke-width="18"/><path d="M300 200 L336 226 L310 262"/>' + person(380, 330, .9)
CL["clone-master"] = person(256, 380, .85) + "".join(ghost(256 + side*(70 + i*62), 300 - i*56, .55 - i*.05) for side in (-1, 1) for i in range(3)) + ghost(256, 200, .5)

print(write(os.path.join(HERE, "barrier-scout"), BA, PAL), write(os.path.join(HERE, "cloning-scout"), CL, PAL))
