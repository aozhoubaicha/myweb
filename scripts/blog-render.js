/* ==========================================================================
   大图书馆 · 博客渲染器
   被两个地方共用：
     1. 编辑器（本地独立程序）——预览、生成发布文件
     2. tools/build-blog.js —— 本地重新生成静态页面
   纯函数、无依赖，同时在 window.BlogRender 和 module.exports 上暴露。
   ========================================================================== */
(function (root) {
    'use strict';

    var SITE = {
        name: '澳洲白茶',
        brandEn: 'ANZHOUBAICHA',
        title: '大图书馆存档',
        subtitle: 'THE GREAT LIBRARY · ARCHIVE',
        origin: 'https://anzhoubai.vip',
        year: 2025,
        nav: [
            ['主页', 'index.html'],
            ['博客', 'blog.html'],
            ['资源', 'rsc.html'],
            ['友情链接', 'friend.html'],
            ['关于', 'about.html']
        ]
    };

    /* ---------------------------------------------------------------- 工具 */

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDisplayDate(date) {
        return String(date || '').replace(/-/g, ' / ');
    }

    function formatListDate(date) {
        return String(date || '').replace(/-/g, '.');
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function sortPosts(posts) {
        return posts.slice().sort(function (a, b) {
            if (a.date === b.date) return String(a.slug).localeCompare(String(b.slug));
            return a.date < b.date ? 1 : -1; // 新文章在前
        });
    }

    /* -------------------------------------------------------------- Markdown */
    /* 支持：# 标题、段落、> 引用、- / 1. 列表、--- 分隔线、``` 代码块、
       **粗体**、*斜体*、`行内代码`、[链接](url)、![图片](src)            */

    function isBlockStart(line) {
        return /^(#{1,6}\s|```|>\s?|(-{3,}|\*{3,}|_{3,})\s*$|\s*([-*+]|\d+\.)\s+)/.test(line);
    }

    function resolveAsset(url, opts) {
        var base = (opts && opts.base) || '';
        if (!base) return url;
        if (/^(https?:|data:|mailto:|#|\/|\.\.\/)/i.test(url)) return url;
        // 只给站点资源目录补前缀，站内链接保持原样
        if (/^(img|css|scripts|src)\//i.test(url)) return base + url;
        return url;
    }

    function inline(text, opts) {
        var s = escapeHtml(text);
        var imageResolver = opts && opts.resolveImage;

        s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (match, alt, src) {
            var url = imageResolver ? imageResolver(src) : resolveAsset(src, opts);
            if (!url) return match;
            return '<img src="' + url + '" alt="' + alt + '" loading="lazy" decoding="async">';
        });

        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
            if (/^\s*javascript:/i.test(href)) return label;
            var url = resolveAsset(href, opts);
            var external = /^https?:/i.test(url);
            return '<a href="' + url + '"' +
                (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
                '>' + label + '</a>';
        });

        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        return s;
    }

    function renderBlocks(blocks, opts) {
        return blocks.map(function (block) {
            switch (block.type) {
                case 'h':
                    var level = Math.min(4, Math.max(2, block.level)); // 正文里最高用 h2
                    return '<h' + level + '>' + inline(block.text, opts) + '</h' + level + '>';
                case 'p':
                    return '<p>' + inline(block.text, opts).replace(/\n/g, '<br>') + '</p>';
                case 'quote':
                    return '<blockquote>' + renderBlocks(block.blocks, opts) + '</blockquote>';
                case 'hr':
                    return '<hr>';
                case 'pre':
                    return '<pre><code>' + escapeHtml(block.text) + '</code></pre>';
                case 'list':
                    var tag = block.ordered ? 'ol' : 'ul';
                    var items = block.items.map(function (item) {
                        return '<li>' + inline(item, opts) + '</li>';
                    }).join('');
                    return '<' + tag + '>' + items + '</' + tag + '>';
                default:
                    return '';
            }
        }).join('\n');
    }

    function parseBlocks(source) {
        var lines = String(source == null ? '' : source).replace(/\r\n?/g, '\n').split('\n');
        var blocks = [];
        var i = 0;

        while (i < lines.length) {
            var line = lines[i];

            if (!line.trim()) { i += 1; continue; }

            if (/^```/.test(line.trim())) {
                var buffer = [];
                i += 1;
                while (i < lines.length && !/^```/.test(lines[i].trim())) {
                    buffer.push(lines[i]);
                    i += 1;
                }
                i += 1;
                blocks.push({ type: 'pre', text: buffer.join('\n') });
                continue;
            }

            var heading = /^(#{1,6})\s+(.*)$/.exec(line);
            if (heading) {
                blocks.push({ type: 'h', level: heading[1].length, text: heading[2].trim() });
                i += 1;
                continue;
            }

            if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
                blocks.push({ type: 'hr' });
                i += 1;
                continue;
            }

            if (/^>\s?/.test(line)) {
                var quoteLines = [];
                while (i < lines.length && /^>\s?/.test(lines[i])) {
                    quoteLines.push(lines[i].replace(/^>\s?/, ''));
                    i += 1;
                }
                blocks.push({ type: 'quote', blocks: parseBlocks(quoteLines.join('\n')) });
                continue;
            }

            if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
                var ordered = /^\s*\d+\./.test(line);
                var items = [];
                while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
                    var item = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(lines[i]);
                    items.push(item ? item[1] : '');
                    i += 1;
                }
                blocks.push({ type: 'list', ordered: ordered, items: items });
                continue;
            }

            var paragraph = [];
            while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
                paragraph.push(lines[i].trim());
                i += 1;
            }
            // 防止死循环：极端情况下（如以块起始行开头却没被上面捕获）
            if (!paragraph.length) {
                paragraph.push(lines[i].trim());
                i += 1;
            }
            blocks.push({ type: 'p', text: paragraph.join('\n') });
        }

        return blocks;
    }

    function mdToHtml(markdown, options) {
        var opts = options || {};
        return renderBlocks(parseBlocks(markdown), opts);
    }

    /* ---------------------------------------------------------------- 模板 */

    function sidebar(base, activeFile) {
        var links = SITE.nav.map(function (item) {
            var active = item[1] === activeFile ? ' aria-current="page"' : '';
            return '                        <li><a href="' + base + item[1] + '"' + active + '>' + item[0] + '</a></li>';
        }).join('\n');

        return [
            '<aside class="sidebar-container" aria-label="侧边栏">',
            '    <div class="sidebar glass-effect">',
            '        <div class="profile">',
            '            <img src="' + base + 'img/toux.webp" alt="澳洲白茶的头像" class="avatar"',
            '                 width="120" height="120" decoding="async">',
            '            <h3>澳洲白茶</h3>',
            '            <p class="role">SINCE 2025</p>',
            '        </div>',
            '        <nav class="sidebar-nav" aria-label="侧边导航">',
            '            <ul>',
            links,
            '            </ul>',
            '        </nav>',
            '        <div class="social-icons" aria-label="社交媒体链接">',
            '            <a href="https://github.com/aozhoubaicha" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i class="fab fa-github" aria-hidden="true"></i></a>',
            '            <a href="https://www.zhihu.com" target="_blank" rel="noopener noreferrer" aria-label="知乎"><i class="fab fa-zhihu" aria-hidden="true"></i></a>',
            '            <a href="https://space.bilibili.com" target="_blank" rel="noopener noreferrer" aria-label="哔哩哔哩"><i class="fab fa-bilibili" aria-hidden="true"></i></a>',
            '        </div>',
            '    </div>',
            '    <footer class="sidebar2">',
            '        © ' + SITE.year + ' <a href="' + base + 'about.html">澳洲白茶</a>',
            '    </footer>',
            '</aside>'
        ].join('\n');
    }

    function head(opts) {
        return [
            '<!DOCTYPE html>',
            '<html lang="zh-CN">',
            '<head>',
            '    <meta charset="UTF-8">',
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '    <meta name="theme-color" content="#d9e4f5">',
            '    <title>' + opts.title + '</title>',
            opts.description ? '    <meta name="description" content="' + opts.description + '">' : '',
            '    <link rel="canonical" href="' + opts.canonical + '">',
            opts.og ? opts.og : '',
            '    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>',
            '    <link rel="stylesheet" href="' + opts.base + 'css/global.css">',
            '    <link rel="stylesheet" href="' + opts.base + 'css/layout.css">',
            '    <link rel="stylesheet" href="' + opts.base + 'css/components.css">',
            '    <link rel="stylesheet" href="' + opts.base + 'css/blog.css">',
            '    <link rel="stylesheet" href="' + opts.base + 'css/sidebar.css">',
            '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">',
            '    <link rel="icon" type="image/png" href="' + opts.base + 'img/ico.png">',
            '</head>'
        ].filter(function (line) { return line !== ''; }).join('\n');
    }

    function kicker(post) {
        var tags = (post.tags || []).filter(Boolean);
        var tagHtml = tags.map(function (tag) {
            return '<span>' + escapeHtml(tag) + '</span>';
        }).join('<span class="sep">·</span>');
        return '<p class="kicker"><time datetime="' + escapeHtml(post.date) + '">' +
            escapeHtml(formatDisplayDate(post.date)) + '</time>' +
            (tagHtml ? '<span class="sep">·</span>' + tagHtml : '') +
            '</p>';
    }

    function renderPostPage(post) {
        var base = '../';
        var body = mdToHtml(post.body, { base: base });
        var title = escapeHtml(post.title);
        var summary = post.summary ? escapeHtml(post.summary) : '';
        var ogImage = post.cover ? SITE.origin + '/' + post.cover : '';

        var og = [
            '    <meta property="og:type" content="article">',
            '    <meta property="og:title" content="' + title + '">',
            '    <meta property="og:site_name" content="' + SITE.title + '">',
            '    <meta property="og:description" content="' + summary + '">',
            ogImage ? '    <meta property="og:image" content="' + escapeHtml(ogImage) + '">' : ''
        ].filter(Boolean).join('\n');

        return [
            head({
                base: base,
                title: title + ' · ' + SITE.title,
                description: summary,
                canonical: SITE.origin + '/' + escapeHtml(post.file),
                og: og
            }),
            '<body class="page-post">',
            '<main class="container main-content">',
            sidebar(base, 'blog.html'),
            '<section class="main-page post-page">',
            '    <div class="post-inner">',
            '        <a class="back" href="' + base + 'blog.html"><span aria-hidden="true">←</span> 返回存档</a>',
            '        ' + kicker(post),
            '        <h1 class="post-title">' + title + '</h1>',
            summary ? '        <p class="lede">' + summary + '</p>' : '',
            post.cover ? '        <figure class="hero"><img src="' + escapeHtml(base + post.cover) +
                '" alt="" loading="eager" decoding="async" fetchpriority="high"></figure>' : '',
            '        <article class="prose">',
            body,
            '        </article>',
            '        <div class="post-foot">',
            '            <a class="back" href="' + base + 'blog.html">← 返回存档</a>',
            '        </div>',
            '    </div>',
            '</section>',
            '</main>',
            '</body>',
            '</html>',
            ''
        ].filter(function (line) { return line !== ''; }).join('\n');
    }

    function renderEntries(posts) {
        var sorted = sortPosts(posts);
        if (!sorted.length) {
            return '<p class="empty">这里还没有文章。</p>';
        }
        var total = sorted.length;
        var items = sorted.map(function (post, index) {
            var file = String(post.file || '').replace(/^\.?\//, '');
            var summary = post.summary ? escapeHtml(post.summary) : '';
            var thumb = post.cover
                ? '                <img class="thumb" src="./' + escapeHtml(post.cover) +
                  '" alt="" width="112" height="112" loading="lazy" decoding="async">\n'
                : '                <span class="thumb thumb-empty" aria-hidden="true"></span>\n';
            return '        <li class="entry">\n' +
                '            <a href="./' + escapeHtml(file) + '">\n' +
                '                <span class="no">' + pad2(total - index) + '</span>\n' +
                '                <span class="body">\n' +
                '                    <span class="t">' + escapeHtml(post.title) + '</span>\n' +
                (summary ? '                    <span class="s">' + summary + '</span>\n' : '') +
                '                    <span class="meta">' + escapeHtml(formatListDate(post.date)) + '</span>\n' +
                '                </span>\n' +
                thumb +
                '            </a>\n' +
                '        </li>';
        });
        return '<ol class="entries">\n' + items.join('\n') + '\n        </ol>';
    }

    function renderBlogPage(posts) {
        var sorted = sortPosts(posts);
        var og = [
            '    <meta property="og:type" content="website">',
            '    <meta property="og:title" content="' + SITE.title + '">',
            '    <meta property="og:site_name" content="' + SITE.title + '">'
        ].join('\n');

        return [
            head({
                base: './',
                title: SITE.title + ' · ' + SITE.name,
                description: '澳洲白茶的写作存档：日记、随笔与旅行记录。',
                canonical: SITE.origin + '/blog.html',
                og: og
            }),
            '<body class="page-archive">',
            '<main class="container main-content">',
            sidebar('./', 'blog.html'),
            '<section class="main-posts">',
            '    <header class="archive-head">',
            '        <h1>' + SITE.title + '</h1>',
            '        <p class="sub">' + SITE.subtitle + '</p>',
            '    </header>',
            '    <p class="archive-note">共 ' + sorted.length + ' 篇 · 按时间倒序</p>',
            '    ' + renderEntries(sorted),
            '</section>',
            '</main>',
            '</body>',
            '</html>',
            ''
        ].filter(function (line) { return line !== ''; }).join('\n');
    }

    /* ---------------------------------------------------------------- 导出 */

    var api = {
        SITE: SITE,
        escapeHtml: escapeHtml,
        sortPosts: sortPosts,
        mdToHtml: mdToHtml,
        renderPostPage: renderPostPage,
        renderBlogPage: renderBlogPage,
        renderEntries: renderEntries
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.BlogRender = api;
    }
})(typeof window !== 'undefined' ? window : null);
