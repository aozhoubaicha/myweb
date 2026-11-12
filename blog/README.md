# 博客使用说明

这个目录是「大图书馆存档」的数据与页面。编辑器已经拆成独立程序，放在
`C:\Users\anzhoubai\Desktop\blog-editor`，不在本仓库里。

## 结构

```
blog/posts.json          文章清单（标题、日期、标签、摘要、封面）
blog/source/*.md         每篇文章的 Markdown 原文
blog/*.html              生成好的文章页（不要手改，会被覆盖）
../blog.html             生成好的存档列表页（不要手改）
../scripts/blog-render.js  共用模板与 Markdown 渲染
../tools/build-blog.js   本地重新生成脚本
```

## 发新文章

### 方式一：编辑器（推荐）

双击 `C:\Users\anzhoubai\Desktop\blog-editor\启动编辑器.cmd`，
新建文章、写完点「提交并推送」即可，无需 Token，用的是本机 git 凭据。

### 方式二：命令行

```bash
# 1. 新建 blog/source/blog_6.md 写正文
# 2. 在 blog/posts.json 里加一条记录
# 3. 重新生成页面
node tools/build-blog.js
git add -A && git commit -m "blog: 新文章" && git push
```

## Markdown 语法

支持：`## 标题`、空行分段、`**加粗**`、`*斜体*`、`` `行内代码` ``、
`> 引用`（适合放日期落款）、`- 列表`、`1. 列表`、`---` 分隔线、``` 代码块、
`[链接](https://…)`、`![图片](img/…)`。

## 注意

- 日期格式必须是 `YYYY-MM-DD`，列表按日期倒序排列；
- `slug` 只用字母、数字、下划线、短横线，同时决定文件名；
- 不要直接改生成出来的 `blog/*.html` 和 `blog.html`；
- 页面样式在 `css/blog.css`（沿用站点侧边栏 + 白纸卡片）。
