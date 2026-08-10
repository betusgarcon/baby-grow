# Prototype Demo

打开任意独立页面即可浏览生成的前端演示原型，推荐从 `journey-home.html` 开始。

建议使用本地静态服务器访问：

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://localhost:4173/prototype_demo/journey-home.html
```

说明：

- 每个演示页面都有独立的 html 文件，地址栏不再使用 `#hash` 路由
- 复用现有 Stitch 导出的 HTML 页面作为展示画布
- 通过单独的原型壳补充五大模块导航、推荐演示流程和相关页面跳转
- 不改动原始页面文件，便于后续继续迭代设计稿与演示稿
