"""Audit server-rendered public pages, including the sitemap, without a browser.

Usage: python scripts/audit-seo.py https://haiy.space --output output/seo.json
"""
import argparse
import json
import re
import time
import urllib.request
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET
from html.parser import HTMLParser


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.h1 = 0
        self.in_title = False
        self.robots = ""
        self.canonical = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.h1 += 1
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content", "")
        if tag == "meta" and attrs.get("name") == "robots":
            self.robots = attrs.get("content", "")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8"), response.status, response.url


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("base")
    parser.add_argument("--output")
    parser.add_argument("--origin", help="Fetch a staging origin while checking production canonicals")
    args = parser.parse_args()
    base = args.base.rstrip("/")
    origin = (args.origin or base).rstrip("/")
    sitemap, _, _ = fetch(origin + "/sitemap.xml")
    urls = list(dict.fromkeys(node.text for node in ET.fromstring(sitemap).iter() if node.tag.endswith("}loc")))
    results = []
    for url in urls:
        start = time.monotonic()
        try:
            if urlsplit(url).netloc != urlsplit(base).netloc:
                raise ValueError("Sitemap URL points outside the audited site")
            requested_url = origin + url[len(base):]
            html, status, final_url = fetch(requested_url)
            page = Page()
            page.feed(html)
            errors = []
            if final_url.rstrip('/') != requested_url.rstrip('/'):
                errors.append("redirect_in_sitemap")
            if "noindex" not in page.robots:
                if len(page.title) < 15:
                    errors.append("short_title")
                if len(page.title) > 65:
                    errors.append("long_title")
                if re.search(r"\|\s*\?{3,}", page.title):
                    errors.append("garbled_title_suffix")
                if len(page.description) < 70:
                    errors.append("short_description")
                if len(page.description) > 160:
                    errors.append("long_description")
                if not page.h1:
                    errors.append("missing_h1")
                if not page.canonical:
                    errors.append("missing_canonical")
                elif page.canonical.rstrip('/') != url.rstrip('/'):
                    errors.append("canonical_mismatch")
            else:
                errors.append("noindex_in_sitemap")
            result = {"url": url, "status": status, "title": page.title, "description": page.description, "h1": page.h1, "robots": page.robots, "canonical": page.canonical, "seconds": round(time.monotonic() - start, 2), "errors": errors}
        except Exception as error:
            result = {"url": url, "errors": [str(error)]}
        results.append(result)
        print(json.dumps(result, ensure_ascii=True), flush=True)
    summary = {"pages": len(results), "failed": sum(bool(row["errors"]) for row in results)}
    print(json.dumps(summary))
    if args.output:
        with open(args.output, "w", encoding="utf-8") as output:
            json.dump({"summary": summary, "pages": results}, output, ensure_ascii=False, indent=2)
    raise SystemExit(bool(summary["failed"]))


if __name__ == "__main__":
    main()
