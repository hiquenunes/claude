#!/usr/bin/env python3
"""Gera conteudo/app/editor.html (a página publicada) a partir de editor.src.html,
embutindo as fontes (subconjunto latino, woff2 em base64) de conteudo/assets/fonts-latin-woff2.css."""
from pathlib import Path
aqui = Path(__file__).parent
src = (aqui / "editor.src.html").read_text()
fontes = (aqui.parent / "assets" / "fonts-latin-woff2.css").read_text()
assert "/*FONTES*/" in src
(aqui / "editor.html").write_text(src.replace("/*FONTES*/", fontes))
print("ok:", aqui / "editor.html", round((aqui / "editor.html").stat().st_size / 1024), "KB")
