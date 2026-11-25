"""Scout-Nin subclasses, batch 1 (King 2026-11-25). The Scout palette; kunai and headbands belong to the
core class, not every subclass. Arbiter Scout: a leader, commander, squad captain (war fan, rank chevrons,
a leader with his squad). Assault Scout: a battler, aggressive and combat-focused (fists, clashing blades,
impacts, momentum)."""
import math, os
from common import *
PAL = {"bg1": "#24465A", "bg2": "#0A1820", "acc": "#7FC4D8"}
A = PAL["acc"]
HERE = os.path.dirname(os.path.abspath(__file__))

AR = {}
AR["arbiter-scout"] = nobori(180, 450, 380, 150, f'stroke="{A}"')
AR["superior-arbitration"] = rank(256, 290, 3, 120, 70) + star(256, 120, 40, 5, .45, f'stroke="{A}" fill="{A}" fill-opacity=".3"')
AR["battlefield-judication"] = person(256, 330, 1.3, f'stroke="{A}"') + squad_arc(256, 250, 150, .62)
AR["absolute-authority"] = person(190, 290, 1.5, f'stroke="{A}"') + "".join(f'<path d="M{320+i*34} {170-i*22} q{40+i*16} {86+i*22} 0 {172+i*44}" stroke-opacity="{1-i*.25}"/>' for i in range(3))
AR["adaptive-orders"] = (person(120, 280, .9, f'stroke="{A}"') + "".join(f'<path d="M170 260 C250 260 270 {y} 330 {y}" stroke-dasharray="1 26" stroke-width="18"/>' for y in (130, 256, 382))
    + "".join(person(400, y + 20, .55) for y in (130, 256, 382)))
AR["commanding-presence"] = nobori(110, 440, 340, 110, f'stroke="{A}"') + chevrons(270, 300, 3, 60, 52)
AR["unbreakable-formation"] = f'<path d="M256 64 L420 120 Q422 330 256 452 Q90 330 92 120 Z" stroke="{A}"/>' + person(256, 220, .7, f'stroke="{A}"') + person(186, 330, .6) + person(326, 330, .6)
AR["who-decided-that"] = ('<path d="M190 110 V300" stroke-width="34"/><circle cx="190" cy="380" r="22" fill="' + INK + '" stroke="none"/>'
    + f'<path d="M280 170 Q280 110 340 110 Q400 110 400 170 Q400 220 340 240 V300" stroke="{A}" stroke-width="28"/><circle cx="340" cy="380" r="22" fill="{A}" stroke="none"/>')

AS = {}
AS["assault-scout"] = burst(256, 240, 175, f'stroke="{A}"') + fist(256, 250, .95)
AS["superior-assault"] = blade(150, 400, 40, 1.05) + blade(362, 400, -40, 1.05, f'stroke="{A}"') + burst(256, 268, 46, f'fill="{INK}" stroke="none"')
AS["brutish-momentum"] = chevrons(70, 256, 3, 70, 60) + f'<circle cx="380" cy="256" r="70" stroke="{A}"/><circle cx="380" cy="256" r="24" fill="{A}" stroke="none"/>'
AS["untapped-potential"] = energy(220, 290, 130, f'stroke="{A}"') + '<path d="M360 400 V140 M310 190 L360 140 L410 190"/>'
AS["brutish-aggression"] = fist(190, 256, .8) + f'<path d="M330 170 l70 86 l-70 86" stroke="{A}"/><path d="M380 170 l70 86 l-70 86" stroke="{A}" stroke-opacity=".6"/>'
AS["remarkable-aggression"] = blade(210, 380, 40, .95) + burst(352, 160, 74, f'stroke="{A}" fill="{A}" fill-opacity=".25"')
AS["devastating-assault"] = blade(256, 220, 180, 1.0) + "".join(f'<path d="M{256-r} 430 A{r} {r*.35:.0f} 0 0 1 {256+r} 430" stroke="{A}" stroke-opacity="{1-i*.28}"/>' for i, r in enumerate((80, 130, 180)))
AS["relentless"] = chevrons(110, 180, 3, 60, 70) + chevrons(110, 340, 3, 60, 70, f'stroke="{A}"')

print(write(os.path.join(HERE, "arbiter-scout"), AR, PAL), write(os.path.join(HERE, "assault-scout"), AS, PAL))
