#!/usr/bin/env python3
"""
Busca fotos em bancos de imagens gratuitos e baixa as melhores opções para um post.

Uso:
  python3 conteudo/render/banco_imagens.py "child playing with blocks" \
      --saida conteudo/psicojaquelinesauer/posts/<id>/imagens --n 4 [--orientacao retrato|paisagem|quadrada]

Bancos (usados na ordem, conforme as chaves disponíveis nas variáveis de ambiente):
  Pexels    PEXELS_API_KEY        licença Pexels: uso comercial livre, crédito opcional
  Unsplash  UNSPLASH_ACCESS_KEY   licença Unsplash: uso comercial livre, crédito opcional
  Pixabay   PIXABAY_API_KEY       licença Pixabay: uso comercial livre, crédito opcional
  Openverse (sem chave)           só CC0 e domínio público, sem exigência de crédito

Pesquise em inglês: os bancos têm muito mais resultados.
Gera, na pasta de saída, as imagens baixadas (até 2000 px) e creditos.json
com banco, autor, licença e link de cada uma. O crédito vai para a legenda
quando a licença pede ou quando for de bom tom.
"""
import argparse, json, os, re, sys, urllib.parse, urllib.request
from pathlib import Path

UA = {"User-Agent": "estudio-psicojaquelinesauer/1.0"}
ORIENT = {
    "retrato": {"pexels": "portrait", "unsplash": "portrait", "pixabay": "vertical", "openverse": "tall"},
    "paisagem": {"pexels": "landscape", "unsplash": "landscape", "pixabay": "horizontal", "openverse": "wide"},
    "quadrada": {"pexels": "square", "unsplash": "squarish", "pixabay": "all", "openverse": "square"},
}


def get_json(url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def pexels(q, n, o):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return []
    d = get_json(f"https://api.pexels.com/v1/search?{urllib.parse.urlencode({'query': q, 'per_page': n, 'orientation': ORIENT[o]['pexels']})}", {"Authorization": key})
    return [{"banco": "Pexels", "url": p["src"]["large2x"], "autor": p["photographer"], "link": p["url"],
             "licenca": "Licença Pexels (uso livre)", "credito": f"Foto: {p['photographer']} / Pexels", "exige_credito": False} for p in d.get("photos", [])]


def unsplash(q, n, o):
    key = os.environ.get("UNSPLASH_ACCESS_KEY")
    if not key:
        return []
    h = {"Authorization": f"Client-ID {key}"}
    d = get_json(f"https://api.unsplash.com/search/photos?{urllib.parse.urlencode({'query': q, 'per_page': n, 'orientation': ORIENT[o]['unsplash'], 'content_filter': 'high'})}", h)
    out = []
    for p in d.get("results", []):
        out.append({"banco": "Unsplash", "url": p["urls"]["full"] + "&w=2000&q=85", "autor": p["user"]["name"], "link": p["links"]["html"],
                    "licenca": "Licença Unsplash (uso livre)", "credito": f"Foto: {p['user']['name']} / Unsplash", "exige_credito": False,
                    "_download_location": p["links"]["download_location"], "_headers": h})
    return out


def pixabay(q, n, o):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return []
    d = get_json(f"https://pixabay.com/api/?{urllib.parse.urlencode({'key': key, 'q': q, 'per_page': max(3, n), 'image_type': 'photo', 'orientation': ORIENT[o]['pixabay'], 'safesearch': 'true'})}")
    return [{"banco": "Pixabay", "url": h["largeImageURL"], "autor": h["user"], "link": h["pageURL"],
             "licenca": "Licença Pixabay (uso livre)", "credito": f"Foto: {h['user']} / Pixabay", "exige_credito": False} for h in d.get("hits", [])[:n]]


def openverse(q, n, o):
    d = get_json(f"https://api.openverse.org/v1/images/?{urllib.parse.urlencode({'q': q, 'page_size': n, 'license': 'cc0,pdm', 'aspect_ratio': ORIENT[o]['openverse'], 'mature': 'false'})}", timeout=15)
    return [{"banco": f"Openverse ({r.get('source', '')})", "url": r["url"], "autor": r.get("creator") or "autor desconhecido", "link": r.get("foreign_landing_url"),
             "licenca": f"{r['license'].upper()} {r.get('license_version') or ''}".strip(), "credito": f"Imagem: {r.get('creator') or 'domínio público'} ({r['license'].upper()})",
             "exige_credito": False} for r in d.get("results", [])]


def baixar(item, destino):
    if item.get("_download_location"):  # exigência da API do Unsplash: registrar o download
        try:
            get_json(item["_download_location"], item["_headers"])
        except Exception:
            pass
    req = urllib.request.Request(item["url"], headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        dados, tipo = r.read(), r.headers.get("Content-Type", "")
    ext = ".png" if "png" in tipo else ".webp" if "webp" in tipo else ".jpg"
    arq = destino.with_suffix(ext)
    arq.write_bytes(dados)
    try:  # reduz para no máximo 2000 px no maior lado
        from PIL import Image
        im = Image.open(arq)
        if max(im.size) > 2000:
            im.thumbnail((2000, 2000))
            im.convert("RGB").save(arq.with_suffix(".jpg"), quality=88)
            if arq.suffix != ".jpg":
                arq.unlink()
            arq = arq.with_suffix(".jpg")
    except Exception:
        pass
    return arq


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("busca")
    ap.add_argument("--saida", required=True)
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--orientacao", choices=ORIENT, default="retrato")
    a = ap.parse_args()
    saida = Path(a.saida)
    saida.mkdir(parents=True, exist_ok=True)
    itens, usados = [], []
    for banco in (pexels, unsplash, pixabay, openverse):
        if len(itens) >= a.n:
            break
        try:
            novos = banco(a.busca, a.n, a.orientacao)
        except Exception as e:
            print(f"! {banco.__name__}: {e}", file=sys.stderr)
            continue
        if novos:
            usados.append(banco.__name__)
        itens += novos
    if not itens:
        print("Nenhuma imagem encontrada. Tente outra busca (em inglês).")
        sys.exit(1)
    cred_arq = saida / "creditos.json"
    creditos = json.loads(cred_arq.read_text()) if cred_arq.exists() else {}
    slug = re.sub(r"[^a-z0-9]+", "-", a.busca.lower()).strip("-")[:40]
    for i, it in enumerate(itens[: a.n], 1):
        try:
            arq = baixar(it, saida / f"{slug}-{i}")
        except Exception as e:
            print(f"! falha ao baixar {it['url']}: {e}", file=sys.stderr)
            continue
        creditos[arq.name] = {k: v for k, v in it.items() if not k.startswith("_")}
        print(f"{arq}  ←  {it['credito']}  ({it['licenca']})")
    cred_arq.write_text(json.dumps(creditos, ensure_ascii=False, indent=2))
    print(f"bancos usados: {', '.join(usados)}; créditos em {cred_arq}")


if __name__ == "__main__":
    main()
