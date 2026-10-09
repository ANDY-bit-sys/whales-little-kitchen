# 大肥鱼的小饭馆

二次元咖啡馆＋幻想绘本风格的餐厅经营小游戏，Godot Web 版。
玩家挑选每日菜单，拖食材让豆包做菜，大肥鱼取餐送餐，赚取 Token 雇佣伙伴和升级小店。

## 本次版本

`achievement-rules-1009`：梦想小馆需要厨房、餐厅、备餐区每项至少升级一次；圆满店长需要雇佣全部四位伙伴并将所有项目升满。删除成就面板「完成成就时的海报」标题，已有成就与已看海报记录保留。
手机点击开始时尝试横屏锁定与全屏；不支持的浏览器提供横屏及添加到主屏幕引导。手机画面按比例适应可用空间与刘海安全区，支持触摸拖食材；转回竖屏时暂停营业，恢复横屏继续。保留成就、按需海报、启动缓存、现有经营和存档。
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
在线试玩：https://andy-bit-sys.github.io/whales-little-kitchen/ 。专用发布仓库：https://github.com/ANDY-bit-sys/whales-little-kitchen 。

Godot 引擎采用 MIT 许可：https://godotengine.org/license/ 。字体许可证见 `static/FONT-LICENSE.txt`。
角色名称和原参考素材的权利属于各自权利人；本仓库不额外授予第三方素材许可。
