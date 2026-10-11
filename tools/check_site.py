#!/usr/bin/env python3
"""Contrôle statique des pages exportées, sans dépendance externe ni modification."""

import hashlib
from html.parser import HTMLParser
from pathlib import Path
import re
import runpy
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = {}
        self.tags = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if attrs.get("id"):
            self.ids.setdefault(attrs["id"], []).append((tag, attrs))


def check():
    config = runpy.run_path(str(ROOT / "tools" / "sync_local_project.py"))
    names = config["PUBLISHED_PAGES"]
    texts = {name: (ROOT / name).read_text(encoding="utf-8") for name in names}
    pages = {name: Page(text) for name, text in texts.items()}
    css = (ROOT / "frequences-design-system.css").read_text(encoding="utf-8")
    version = hashlib.sha256(css.strip().encode("utf-8")).hexdigest()[:12]
    canonical_urls = []
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    for name, page in pages.items():
        require(all(len(tags) == 1 for tags in page.ids.values()), f"{name} : identifiant dupliqué")
        require(not any(tag == "style" for tag, _ in page.tags), f"{name} : CSS inline réintroduit")
        require("fonts.googleapis.com" not in texts[name], f"{name} : polices distantes")
        canonical = [a.get("href") for t, a in page.tags if t == "link" and a.get("rel") == "canonical"]
        require(len(canonical) == 1, f"{name} : URL canonique")
        canonical_urls.extend(canonical)
        skip = [(t, a) for t, a in page.tags if a.get("class") == "skip-link"]
        require(len(skip) == 1, f"{name} : lien d’évitement")
        if skip:
            target = skip[0][1].get("href", "").removeprefix("#")
            destination = page.ids.get(target, [])
            require(len(destination) == 1 and destination[0][0] == "main"
                    and destination[0][1].get("tabindex") == "-1", f"{name} : destination du lien d’évitement")
        stylesheets = [a.get("href") for t, a in page.tags if t == "link" and a.get("rel") == "stylesheet"]
        require(stylesheets == [f"frequences-design-system.css?v={version}"], f"{name} : empreinte CSS")

        for tag, attrs in page.tags:
            for attr in ("href", "src"):
                url = attrs.get(attr)
                if not url:
                    continue
                parsed = urlsplit(url)
                if parsed.scheme or parsed.netloc:
                    continue
                target = unquote(parsed.path) or name
                require((ROOT / target).is_file(), f"{name} : ressource absente {target}")
                if parsed.fragment and target in pages:
                    require(unquote(parsed.fragment) in pages[target].ids,
                            f"{name} : ancre absente {target}#{parsed.fragment}")
        if "assets/vendor/d3-7.9.0.min.js" in texts[name]:
            scripts = [a for t, a in page.tags if t == "script"]
            require(len(scripts) == 3 and all("defer" in a and a.get("src") for a in scripts),
                    f"{name} : ordre des scripts différés")

    for name in (*names, *config["SHARED_OUTPUT_FILES"]):
        require((ROOT / "source" / "outputs" / name).is_file(), f"Copie source absente : {name}")
        for mirror in (ROOT / "outputs" / name, ROOT / "source" / "outputs" / name):
            if mirror.exists():
                require((ROOT / name).read_bytes() == mirror.read_bytes(), f"Copie divergente : {mirror}")
    for url in re.findall(r'url\([\"\']?([^\"\')]+)', css):
        parsed = urlsplit(url)
        if not parsed.scheme and not url.startswith("#"):
            require((ROOT / unquote(parsed.path)).is_file(), f"Ressource CSS absente : {url}")
    small = re.findall(r'(?<![-\w])font(?:-size)?\s*:\s*[^;{}]+', css)
    require(not any(re.search(r'(?<![\d.])(?:[1-9]|1[01])px\b', value) for value in small),
            "Petite taille de texte fixe dans le CSS")
    urls = [node.text for node in ET.parse(ROOT / "sitemap.xml").findall("{*}url/{*}loc")]
    require(len(urls) == len(names) and set(urls) == set(canonical_urls), "Sitemap divergent")
    require((ROOT / "robots.txt").is_file(), "robots.txt absent")
    for excluded in ("midi-automation-brutalist-concept.html", "midi-automation-brutalist-orange-concept.html",
                     "midi-automation-brutalist-titres-orange.html"):
        require(not (ROOT / excluded).exists() and not (ROOT / "source/outputs" / excluded).exists(),
                f"Une page concept est distribuée : {excluded}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"OK : {len(names)} pages, liens et ancres, ressources, copies, CSS et sitemap cohérents.")


if __name__ == "__main__":
    check()
