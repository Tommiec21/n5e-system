"""Scout-Nin subclasses, batch 1: Arbiter Scout and Assault Scout (King 2026-11-25).
Scout palette and motifs (kunai, shuriken, headbands, energy, paths, momentum) plus each subclass's emblem:
Arbiter = a command banner and the squad (three headbands); Assault = an impact burst."""
import math, os
from common import *
PAL = {"bg1": "#24465A", "bg2": "#0A1820", "acc": "#7FC4D8"}
A, PLATE = PAL["acc"], "#173040"
HERE = os.path.dirname(os.path.abspath(__file__))

def banner(x, y, h=260, extra=""):
    """A command banner on a kunai-tipped pole."""
    return (f'<g {extra}><line x1="{x}" y1="{y}" x2="{x}" y2="{y-h}"/><path d="M{x-14} {y-h+6} L{x} {y-h-34} L{x+14} {y-h+6}"/>'
            f'<path d="M{x} {y-h+20} H{x+130} L{x+104} {y-h+64} L{x+130} {y-h+108} H{x}"/></g>')
def burst(cx, cy, r, extra=""):
    return star(cx, cy, r, 8, .5, extra)
def squad(cx, cy, r, s=.36):
    return "".join(headband(cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a)), 110, s, 'stroke-width="10"', PLATE) for a in (-90, 30, 150))

AR = {}
AR["arbiter-scout"] = banner(200, 430, 300, f'stroke="{A}"') + headband(250, 380, 250, .9, "", PLATE)
AR["superior-arbitration"] = banner(170, 430, 290, f'stroke="{A}"') + shuriken(340, 330, 70)
AR["battlefield-judication"] = f'<circle cx="256" cy="270" r="150" stroke="{A}" stroke-dasharray="14 26"/>' + squad(256, 270, 96)
AR["absolute-authority"] = headband(190, 280, 260, .9, "", PLATE) + "".join(f'<path d="M{380+i*28} {200-i*20} q{40+i*16} {80+i*20} 0 {160+i*40}" stroke="{A}" stroke-opacity="{1-i*.25}"/>' for i in range(3))
AR["adaptive-orders"] = (dots([(130, 256)], 26, A) + "".join(f'<path d="M160 256 C240 256 260 {y} 330 {y}" stroke-dasharray="1 26" stroke-width="18"/>' for y in (130, 256, 382))
    + "".join(headband(390, y, 100, .38, 'stroke-width="10"', PLATE) for y in (130, 256, 382)))
AR["commanding-presence"] = banner(150, 440, 320, f'stroke="{A}"') + chevrons(250, 330, 3, 60, 52)
AR["unbreakable-formation"] = f'<path d="M256 64 L420 120 Q422 330 256 452 Q90 330 92 120 Z" stroke="{A}"/>' + squad(256, 260, 80)
# Who Decided That!?: a kunai as the "!" next to a "?", with an impact under it
AR["who-decided-that"] = (kunai(190, 230, 180, .95) + f'<circle cx="190" cy="400" r="18" fill="{INK}" stroke="none"/>'
    + f'<path d="M290 170 Q290 110 350 110 Q410 110 410 170 Q410 220 350 240 V300" stroke="{A}" stroke-width="22"/><circle cx="350" cy="380" r="18" fill="{A}" stroke="none"/>')

AS = {}
# one kunai driven through an impact burst (two crossed kunai read as scissors)
AS["assault-scout"] = burst(256, 256, 170, f'stroke="{A}"') + kunai(256, 270, 40, .95)
AS["superior-assault"] = burst(256, 256, 160, f'stroke="{A}" stroke-opacity=".7"') + shuriken(256, 256, 96)
AS["brutish-momentum"] = chevrons(70, 256, 3, 70, 60) + f'<circle cx="380" cy="256" r="70" stroke="{A}"/><circle cx="380" cy="256" r="24" fill="{A}" stroke="none"/>'
AS["untapped-potential"] = energy(220, 290, 130, f'stroke="{A}"') + '<path d="M360 400 V140 M310 190 L360 140 L410 190"/>'
AS["brutish-aggression"] = (kunai(190, 280, 90, .8) + f'<path d="M300 180 l60 76 l-60 76" stroke="{A}"/><path d="M350 180 l60 76 l-60 76" stroke="{A}" stroke-opacity=".6"/>')
AS["remarkable-aggression"] = kunai(230, 290, 30, .9) + burst(330, 150, 70, f'stroke="{A}" fill="{A}" fill-opacity=".25"') + '<path d="M120 400 l40 -20 M110 340 l46 0"/>'
AS["devastating-assault"] = kunai(256, 230, 180, 1.0) + "".join(f'<path d="M{256-r} 420 A{r} {r*.35:.0f} 0 0 1 {256+r} 420" stroke="{A}" stroke-opacity="{1-i*.28}"/>' for i, r in enumerate((80, 130, 180)))
AS["relentless"] = chevrons(110, 180, 3, 60, 70) + chevrons(110, 340, 3, 60, 70, f'stroke="{A}"')

print(write(os.path.join(HERE, "arbiter-scout"), AR, PAL), write(os.path.join(HERE, "assault-scout"), AS, PAL))
