# Change Log

## v1.3.4 (2026-05-13)

### Features

- **product:** 新增商品发货方式，支持自动发货卡密、固定内容自动发货和手动发货配置 ([28c8671](https://github.com/34892002/edgeKey/commit/28c8671))

### Improvements

- **product:** 优化商品列表、商品详情和首页商品卡片展示，按发货方式展示库存、发货说明和状态信息 ([ad4de3b](https://github.com/34892002/edgeKey/commit/ad4de3b))
- **payment:** 优化商品详情页支付方式体验，易支付优先展示并补充支付宝、微信渠道图标 ([c450cc8](https://github.com/34892002/edgeKey/commit/c450cc8))
- **order:** 优化本地订单列表状态展示和刷新状态交互体验 ([bf0bf1f](https://github.com/34892002/edgeKey/commit/bf0bf1f))

### Bug Fixes

- **order:** 修复本地缓存订单状态未同步的问题 ([d949e82](https://github.com/34892002/edgeKey/commit/d949e82))
- **order:** 修复订单边界情况处理问题 ([1db9abc](https://github.com/34892002/edgeKey/commit/1db9abc))
- **inventory:** 修复批量导入重复卡密时点击“取消”仍被去重的问题，原始输入继续进入数据库重复检测和导入流程 ([ad4de3b](https://github.com/34892002/edgeKey/commit/ad4de3b))

## v1.3.3 (2026-05-11)

### Bug Fixes

- **media:** 修复异常导致的 CDN 不缓存，命中边缘缓存后大幅降低延迟和 S3 请求开销
- **media:** S3 响应体先完整缓冲再返回，修复流中途断开时异常逃逸 try-catch 导致 `Worker threw exception` 的问题

## v1.3.0 (2026-05-10)

### Features

- **image:** 上传图片时支持浏览器端 WebP 压缩，自动检测浏览器能力，用户可自由开关，压缩失败时自动降级 ([3e2e8d5](https://github.com/34892002/edgeKey/commit/3e2e8d5))
- **file-upload:** 选择文件组件 ([74842cd](https://github.com/34892002/edgeKey/commit/74842cd))
- **s3:** 新增s3协议文件管理，提供文件上传、删除功能 ([2c3a332](https://github.com/34892002/edgeKey/commit/2c3a332))

### Bug Fixes

- **lint:** 规范项目编码，消除 18 处内联 `import()` 写法，统一改为顶部 `import type` ([370b975](https://github.com/34892002/edgeKey/commit/370b975))

### Documentation

- **docs:** 更新说明 ([5a0f09d](https://github.com/34892002/edgeKey/commit/5a0f09d))

## v1.2.2 (2026-04-30)

### Features

- 初始化项目基础架构
- 后台管理系统基础框架
- 商品管理、订单管理、卡密管理
- S3 文件存储集成
- 媒体库基础功能
