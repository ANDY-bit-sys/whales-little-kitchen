# 大肥鱼的小饭馆

二次元咖啡馆＋幻想绘本风格的餐厅经营小游戏，Godot Web 版。

游戏入口：https://andy-bit-sys.github.io/whales-little-kitchen/ （首次 Actions 发布成功后可玩）
玩家挑选每日菜单，拖食材让豆包做菜，大肥鱼取餐送餐，赚取 Token 雇佣伙伴和升级小店。

## 本次版本

`next-day-fix-1009`：豆包动作修正、低位收尾，以及打烊后重新选菜并开始下一天的修复。
游戏采用单线程 Web 导出，不依赖后端或跨源隔离响应头。
此仓库存放可发布成品与还原脚本；完整开发工程、原建模源和备份保留在本地。

## 本地运行

```sh
python tools/assemble_pages.py --output _site
python -m http.server 8080 --directory _site
```

打开 http://localhost:8080/，选择菜单后开门。存档保存在当前浏览器与网站地址下；
线上与 localhost 为不同来源，各自保存进度。

## 发布

启用 GitHub Pages 的 GitHub Actions 来源。推送 main 后，工作流校验并还原资源包，再部署 `_site`。
压缩分块只用于仓库存储；发布文件与已测试的 Web 导出逐个 SHA-256 核验一致，不更改模型画质。
专用仓库：https://github.com/ANDY-bit-sys/whales-little-kitchen 。站点入口来自 GitHub Pages 配置。

Godot 引擎采用 MIT 许可：https://godotengine.org/license/ 。字体许可证见 `static/FONT-LICENSE.txt`。
角色名称和原参考素材的权利属于各自权利人；本仓库不额外授予第三方素材许可。
