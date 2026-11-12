#!/usr/bin/env node
/* ==========================================================================
   大图书馆 · 静态博客生成脚本

   用法（在仓库根目录执行）：
       node tools/build-blog.js

   它读取：
       blog/posts.json        文章清单（标题、日期、摘要、封面……）
       blog/source/<slug>.md  每篇文章的 Markdown 正文

   它生成：
       blog.html              存档列表页
       blog/<slug>.html       每篇文章页

   编辑器（editor.html）在浏览器里用同一套模板做同样的事，
   两者输出保持一致，方便用 git 看 diff。
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const Render = require('../scripts/blog-render.js');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'blog', 'posts.json');

function readManifest() {
    const raw = fs.readFileSync(MANIFEST, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.posts)) throw new Error('posts.json 缺少 posts 数组');
    return data;
}

function readSource(post) {
    const file = path.join(ROOT, post.source || `blog/source/${post.slug}.md`);
    return fs.readFileSync(file, 'utf8');
}

function writeFile(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
}

function main() {
    const manifest = readManifest();
    const posts = manifest.posts.map((post) => {
        const full = Object.assign({}, post);
        full.body = readSource(post);
        return full;
    });

    let count = 0;
    posts.forEach((post) => {
        const target = path.join(ROOT, post.file || `blog/${post.slug}.html`);
        writeFile(target, Render.renderPostPage(post));
        count += 1;
        console.log('  ✓ ' + path.relative(ROOT, target).replace(/\\/g, '/'));
    });

    const blogFile = path.join(ROOT, 'blog.html');
    writeFile(blogFile, Render.renderBlogPage(posts));
    console.log('  ✓ blog.html');
    console.log(`完成：${count} 篇文章 + 列表页`);
}

main();
