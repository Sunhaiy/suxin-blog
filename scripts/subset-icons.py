#!/usr/bin/env python3
# 把 Material Symbols Rounded 可变字体(927KB wght 轴)子集成「仅站点用到的图标」。
# 难点：Material Symbols 用 ligature(字母序列->图标字形)。直接按字符子集会保留全部图标，
# 所以这里先解析 GSUB ligature 找到每个图标名对应的输出字形，显式保留这些字形 + 字母，
# 并关闭 layout 闭包，使 pyftsubset 只保留这些图标的 ligature 规则。图标用法(组件渲染 ligature 文本)不变。
import subprocess
import sys
from fontTools.ttLib import TTFont

SRC = "node_modules/@fontsource-variable/material-symbols-rounded/files/material-symbols-rounded-latin-wght-normal.woff2"
ICONS_FILE = "scripts/_used-icons.txt"
OUT = "app/fonts/msr-subset.woff2"

icons = [l.strip() for l in open(ICONS_FILE, encoding="utf-8") if l.strip()]
font = TTFont(SRC)
cmap = font.getBestCmap()
char_to_glyph = {chr(cp): gn for cp, gn in cmap.items()}

# 收集所有 ligature: 起始字形 -> [(后续组件字形, 输出字形)]
lig_map = {}
gsub = font["GSUB"].table
for lookup in gsub.LookupList.Lookup:
    for sub in lookup.SubTable:
        # LookupType 4 = Ligature；也可能经 Extension(7) 包一层
        st = sub
        if getattr(sub, "ExtensionLookupType", None) == 4:
            st = sub.ExtSubTable
        if getattr(st, "LookupType", None) == 4 or hasattr(st, "ligatures"):
            ligs = getattr(st, "ligatures", None)
            if not ligs:
                continue
            for first_glyph, lig_list in ligs.items():
                lig_map.setdefault(first_glyph, []).extend(lig_list)

def resolve(name):
    glyphs = []
    for ch in name:
        g = char_to_glyph.get(ch)
        if g is None:
            return None
        glyphs.append(g)
    first, rest = glyphs[0], glyphs[1:]
    for lig in lig_map.get(first, []):
        if list(lig.Component) == rest:
            return lig.LigGlyph
    return None

keep_glyphs = set()
missing = []
for name in icons:
    g = resolve(name)
    if g:
        keep_glyphs.add(g)
    else:
        missing.append(name)

print(f"resolved glyphs: {len(keep_glyphs)} / {len(icons)}")
if missing:
    print("WARN missing (not in font or wrong name):", " ".join(missing))

letters = "abcdefghijklmnopqrstuvwxyz_0123456789"
font.close()

cmd = [
    sys.executable, "-m", "fontTools.subset", SRC,
    "--glyphs=" + ",".join(sorted(keep_glyphs)),
    "--text=" + letters,
    "--no-layout-closure",
    "--layout-features=liga,calt,rlig,ccmp,dlig",
    "--flavor=woff2",
    "--output-file=" + OUT,
]
subprocess.run(cmd, check=True)
print("DONE ->", OUT)
