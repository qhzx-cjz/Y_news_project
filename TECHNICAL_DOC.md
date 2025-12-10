# Y News 技术文档

## 项目概述

Y News 是一个轻量级的短图文社交平台，采用前后端分离架构，支持用户发布、浏览和互动短图文内容。

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.x | React 全栈框架，App Router |
| React | 19.x | UI 组件库 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 原子化 CSS 框架 |
| Tiptap | 3.x | 富文本编辑器 |
| Lucide React | 0.555.x | 图标库 |
| Radix UI | - | 无障碍 UI 组件 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | 11.x | Node.js 后端框架 |
| Prisma | 6.x | ORM 数据库访问层 |
| MySQL | 8.x | 关系型数据库 |
| JWT | - | 用户认证 |
| bcrypt | - | 密码加密 |
| Multer | - | 文件上传处理 |

### 部署

| 服务 | 用途 |
|------|------|
| Vercel | 前端托管 |
| 本地服务器 + ngrok | 后端 API 服务 |

---

## 功能实现清单

### 1. 登录注册模块

| 功能要求 | 状态 | 实现说明 |
|----------|------|----------|
| 支持登录和注册 | 已完成 | 使用 JWT Token 认证，bcrypt 密码加密存储 |
| 支持退出登录 | 已完成 | 清除本地 Token 和用户信息 |

**实现细节：**
- 注册时自动生成基于用户名的 DiceBear 头像
- Token 存储在 localStorage，页面刷新后保持登录状态
- 登录状态在客户端挂载后初始化，避免 SSR 水合错误

**相关文件：**
- 前端：`client/src/components/pages/LoginPage.tsx`
- 后端：`server/src/auth/`

---

### 2. 短图文发布模块

| 功能要求 | 状态 | 实现说明 |
|----------|------|----------|
| 短图文编辑器，支持分别插入文字和图片 | 已完成 | Tiptap 富文本编辑器，支持图片上传和插入 |
| 支持内容发布 | 已完成 | POST /articles 接口，需要登录认证 |
| 支持对已发布内容的二次编辑修改 | 已完成 | 文章详情页菜单 -> 修改文章 -> 自动填充内容 -> 更新 |
| 支持富文本编辑器 | 已完成 | Tiptap 编辑器，支持加粗、斜体、下划线、标题等格式 |
| 草稿自动云端存储 | 已完成 | 30s 自动保存，断网本地存储，联网自动同步 |
| [挑战] AI 识别内容标签 | 未完成 | 手动 # 标签识别，非 AI 自动识别 |

**实现细节：**

#### 富文本编辑器
- 基于 Tiptap 实现，集成 StarterKit、Image、Placeholder、Underline 扩展
- 工具栏支持：加粗、斜体、下划线、标题(H1/H2)、列表、图片上传
- 图片上传至服务器 `/upload/image`，返回 URL 后插入编辑器

#### 草稿系统（双重存储）
```
本地存储 (localStorage)          云端存储 (MySQL)
     |                               |
     |-- 实时保存（每次内容变化）    |-- 30s 定时同步
     |-- 断网时继续保存             |-- 需要登录
     |-- 恢复网络自动同步           |-- 跨设备同步
```
- 进入编辑器时：优先加载云端草稿，无则加载本地草稿
- 编辑过程中：实时保存本地，每 30s 同步云端
- 发布成功后：自动删除本地和云端草稿

#### 标签系统
- 发布时从内容中提取 `#标签` 格式的文本
- 自动创建或关联已有标签
- 标签在 Feed 和详情页显示为蓝色可点击链接

**相关文件：**
- 前端：`client/src/components/pages/EditorPage.tsx`
- 后端：`server/src/article/`、`server/src/draft/`、`server/src/upload/`

---

### 3. 内容详情页模块

| 功能要求 | 状态 | 实现说明 |
|----------|------|----------|
| 短图文内容查看 | 已完成 | 显示作者信息、发布时间、正文、图片、点赞数、浏览量 |
| AI 推荐相关话题 | 未完成 | 手动标签点击跳转，非 AI 推荐 |

**实现细节：**

#### 更多菜单功能
- 删除文章：确认后删除，跳转首页
- 修改文章：跳转编辑器，自动填充当前内容，发布时更新而非新建

#### 标签交互
- 点击标签跳转到编辑器页面
- 自动在内容输入框填充 `#标签名 `

**相关文件：**
- 前端：`client/src/app/article/[articleId]/page.tsx`

---

### 4. Feed 流

| 功能要求 | 状态 | 实现说明 |
|----------|------|----------|
| 所有短图文内容在信息流里展示 | 已完成 | 卡片式列表，显示标题、摘要、图片、作者、时间 |
| 支持按照发布时间排序 | 已完成 | 后端默认按 createdAt DESC 排序 |
| 支持滚动加载更多 | 已完成 | IntersectionObserver 实现无限滚动 |
| 支持下拉刷新功能 | 已完成 | 触摸手势下拉，显示刷新动画，加载最新内容 |
| 性能优化 | 待验证 | 正在尝试获取 LCP 和帧率数据 |

**实现细节：**

#### 无限滚动
- 使用 IntersectionObserver 监听底部触发元素
- 滚动到底部自动加载下一页（每页 10 条）
- 加载中显示 Loading 动画，无更多内容显示提示

#### 下拉刷新
```typescript
// 核心实现逻辑
onTouchStart -> 记录起始 Y 坐标
onTouchMove  -> 计算下拉距离，显示刷新指示器
onTouchEnd   -> 距离 > 60px 触发刷新，重置数据并请求最新内容
```
- 刷新指示器使用 RefreshCw 图标 + 旋转动画
- 防止浏览器默认下拉行为（overscroll-none）

#### Feed 卡片
- 解析富文本提取纯文本摘要（最多 200 字）
- 提取第一张图片作为预览
- 标签以蓝色显示，点击跳转编辑器

**相关文件：**
- 前端：`client/src/components/pages/FeedPage.tsx`
- 后端：`server/src/article/article.service.ts` (list 方法)

---

## API 接口文档

### 认证接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /auth/register | 用户注册 | 否 |
| POST | /auth/login | 用户登录 | 否 |
| POST | /auth/logout | 退出登录 | 是 |

### 文章接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /articles | 获取文章列表（分页） | 否 |
| GET | /articles/:id | 获取文章详情 | 否 |
| POST | /articles | 发布文章 | 是 |
| PUT | /articles/:id | 更新文章 | 是 |
| DELETE | /articles/:id | 删除文章 | 是 |
| POST | /articles/:id/like | 点赞文章 | 否 |

### 草稿接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /draft | 获取当前用户草稿 | 是 |
| POST | /draft | 保存/更新草稿 | 是 |
| DELETE | /draft | 删除草稿 | 是 |

### 上传接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /upload/image | 上传图片 | 是 |

---

## 数据库模型

### User 用户表
```prisma
model User {
  id        Int       @id @default(autoincrement())
  username  String    @unique
  password  String    // bcrypt 加密
  nickname  String?
  avatar    String?   // DiceBear 头像 URL
  articles  Article[]
  draft     Draft?
  createdAt DateTime  @default(now())
}
```

### Article 文章表
```prisma
model Article {
  id        Int       @id @default(autoincrement())
  title     String
  content   String    @db.Text  // 富文本 HTML
  authorId  Int
  author    User      @relation(...)
  tags      Tag[]     // 多对多关系
  likes     Int       @default(0)
  views     Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Tag 标签表
```prisma
model Tag {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  articles  Article[] // 多对多关系
  createdAt DateTime  @default(now())
}
```

### Draft 草稿表
```prisma
model Draft {
  id        Int       @id @default(autoincrement())
  title     String
  content   String    @db.Text
  userId    Int       @unique  // 每用户一份草稿
  user      User      @relation(...)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

---

## 项目结构

```
news_lite_project/
├── client/                      # 前端 (Next.js)
│   ├── src/
│   │   ├── app/                 # 页面路由
│   │   │   ├── page.tsx         # 主页（Feed/Editor/Profile/Login）
│   │   │   └── article/
│   │   │       └── [articleId]/ # 文章详情页
│   │   ├── components/
│   │   │   ├── pages/           # 页面组件
│   │   │   │   ├── FeedPage.tsx
│   │   │   │   ├── EditorPage.tsx
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── ui/              # UI 基础组件
│   │   │   ├── BottomNav.tsx    # 底部导航
│   │   │   ├── TopNav.tsx       # 顶部导航
│   │   │   └── RichTextEditor.tsx
│   │   └── lib/
│   │       ├── api.ts           # API 封装
│   │       └── utils.ts         # 工具函数
│   └── package.json
│
├── server/                      # 后端 (NestJS)
│   ├── src/
│   │   ├── auth/                # 认证模块
│   │   ├── article/             # 文章模块
│   │   ├── draft/               # 草稿模块
│   │   ├── upload/              # 上传模块
│   │   ├── prisma/              # Prisma 服务
│   │   └── common/              # 公共模块
│   ├── prisma/
│   │   └── schema.prisma        # 数据库模型
│   └── package.json
│
├── README.md                    # 项目说明
└── TECHNICAL_DOC.md             # 技术文档（本文件）
```

---

## 本地开发

```bash
# 启动后端
cd server
npm install
npx prisma migrate dev
npm run start:dev

# 启动前端
cd client
npm install
npm run dev
```

## 生产部署

- 前端：推送至 GitHub，Vercel 自动部署
- 后端：本地运行 + ngrok 内网穿透（或部署至云服务器）
- 环境变量：Vercel 配置 `NEXT_PUBLIC_API_URL` 为后端地址

