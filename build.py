#!/usr/bin/env python3
"""Builds the STG Soccer Skills static site into ./dist.

Each page lives in src/pages/<slug>.html and starts with two comment lines:
  <!--title: Page title-->
  <!--desc: Meta description-->
The shared header/footer come from src/header.html and src/footer.html.
index.html is the homepage; every other slug is written to dist/<slug>/index.html
so the URLs match the old WordPress site.
"""
import os, re, shutil, glob, json

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
SITE = 'https://stgsoccerskills.com'

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{site}/assets/facility.jpg">
<meta property="og:url" content="{url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
{extra_head}
</head>
<body>
"""


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def meta(body, key):
    m = re.search(r'<!--%s:\s*(.*?)-->' % key, body)
    return m.group(1).strip() if m else ''


def build():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(DIST, 'assets'))
    header = read(os.path.join(SRC, 'header.html'))
    footer = read(os.path.join(SRC, 'footer.html'))
    ld = read(os.path.join(SRC, 'localbusiness.jsonld.html'))
    urls = []
    for path in sorted(glob.glob(os.path.join(SRC, 'pages', '*.html'))):
        slug = os.path.basename(path)[:-5]
        body = read(path)
        title = meta(body, 'title') or 'STG Soccer Skills'
        desc = meta(body, 'desc')
        noindex = meta(body, 'noindex')
        body = re.sub(r'<!--(title|desc|noindex|stub):.*?-->\n?', '', body)
        if slug == 'index':
            url, out = SITE + '/', os.path.join(DIST, 'index.html')
        elif slug == '404':
            url, out = SITE + '/404', os.path.join(DIST, '404.html')
        else:
            url = '%s/%s/' % (SITE, slug.replace('__', '/'))
            out = os.path.join(DIST, slug.replace('__', '/'), 'index.html')
        extra = ld if slug == 'index' else ''
        if noindex:
            extra += '\n<meta name="robots" content="noindex">'
        elif slug != '404':
            urls.append(url)
        html = HEAD.format(title=title, desc=desc, url=url, site=SITE, extra_head=extra) \
            + header + '<main id="main">' + body + '</main>' + footer + '</body>\n</html>\n'
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, 'w', encoding='utf-8') as f:
            f.write(html)
    # Short links (replaces Pretty Links): src/links.txt, one per line: "slug  https://destination"
    nlinks = 0
    links_file = os.path.join(SRC, 'links.txt')
    if os.path.exists(links_file):
        for line in read(links_file).splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            slug, dest = line.split(None, 1)
            slug, dest = slug.strip('/'), dest.strip()
            esc = dest.replace('&', '&amp;').replace('"', '&quot;')
            page = ('<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex">'
                    '<title>Redirecting…</title><meta http-equiv="refresh" content="0; url=%s">'
                    '<link rel="canonical" href="%s"><script>location.replace(%s)</script>'
                    '</head><body><p>Redirecting to <a href="%s">%s</a>…</p></body></html>\n'
                    % (esc, esc, json.dumps(dest), esc, esc))
            for s in {slug, slug.lower()}:
                out = os.path.join(DIST, s, 'index.html')
                if os.path.exists(out):
                    print('WARNING: short link /%s/ clashes with an existing page; skipped' % s)
                    continue
                os.makedirs(os.path.dirname(out), exist_ok=True)
                with open(out, 'w', encoding='utf-8') as f:
                    f.write(page)
            nlinks += 1
    print('built %d short links' % nlinks)
    with open(os.path.join(DIST, 'sitemap.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write('  <url><loc>%s</loc></url>\n' % u)
        f.write('</urlset>\n')
    with open(os.path.join(DIST, 'robots.txt'), 'w') as f:
        f.write('User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n' % SITE)
    with open(os.path.join(DIST, 'CNAME'), 'w') as f:
        f.write('stgsoccerskills.com\n')
    open(os.path.join(DIST, '.nojekyll'), 'w').close()
    print('built %d pages' % len(glob.glob(os.path.join(SRC, 'pages', '*.html'))))


if __name__ == '__main__':
    build()
