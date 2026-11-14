"""Extract a .docx body to text in reading order, including text boxes and tables (rows as ' | ')."""
import sys, zipfile
from lxml import etree
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
q = lambda t: "{%s}%s" % (W, t)
def para_text(p):
    out = []
    for el in p.iter():
        if el.tag == q("t"): out.append(el.text or "")
        elif el.tag in (q("tab"),): out.append(" ")
        elif el.tag == q("br"): out.append(" ")
    return "".join(out).strip()
def style(p):
    s = p.find(q("pPr") + "/" + q("pStyle"))
    return s.get(q("val")) if s is not None else ""
def boxes(el):
    # text boxes anchored in this paragraph: Choice branch only (Fallback duplicates it)
    for ac in el.iter("{%s}AlternateContent" % MC):
        ch = ac.find("{%s}Choice" % MC)
        if ch is not None:
            for tx in ch.iter(q("txbxContent")): yield tx
def in_fallback(el):
    a = el.getparent()
    while a is not None:
        if a.tag == "{%s}Fallback" % MC: return True
        a = a.getparent()
    return False
def walk(container, out, depth=0):
    for child in container:
        if child.tag == q("p"):
            own = etree.fromstring(etree.tostring(child))
            for ac in own.iter("{%s}AlternateContent" % MC): ac.getparent().remove(ac)
            t = para_text(own); st = style(child)
            if t: out.append(("#" * int(st[-1]) + " " if st.startswith("Heading") and st[-1].isdigit() else "") + t)
            for tx in boxes(child):
                out.append("[[box]]"); walk(tx, out, depth + 1); out.append("[[/box]]")
        elif child.tag == q("tbl"):
            out.append("[[table]]")
            for tr in child.iter(q("tr")):
                if in_fallback(tr): continue
                cells = []
                for tc in tr.findall(q("tc")):
                    cells.append(" ".join(para_text(p) for p in tc.iter(q("p")) if not in_fallback(p)).strip())
                out.append(" | ".join(cells))
            out.append("[[/table]]")
        elif child.tag == q("sdt"):
            c = child.find(q("sdtContent"))
            if c is not None: walk(c, out, depth)
z = zipfile.ZipFile(sys.argv[1])
root = etree.fromstring(z.read("word/document.xml"), etree.XMLParser(huge_tree=True))
out = []; walk(root.find(q("body")), out)
open(sys.argv[2], "w").write("\n".join(out))
print(len(out), "lines")
