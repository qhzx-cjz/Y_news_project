# News Lite

一个轻量级的短图文社交平台，类似Twitter的信息流应用。

## 技术栈

### 前端

- Next.js 16 (React 19)
- TypeScript
- Tailwind CSS 4
- Tiptap 富文本编辑器
- Lucide React 图标库

### 后端

- NestJS 11
- Prisma ORM
- MySQL
- JWT 认证
- bcrypt 密码加密

## 项目结构

```
news_lite_project/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── app/           # Next.js App Router 页面
│   │   ├── components/    # React 组件
│   │   │   ├── pages/     # 页面组件
│   │   │   └── ui/        # UI 基础组件
│   │   └── lib/           # 工具函数和 API
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── article/       # 文章模块
│   │   ├── auth/          # 认证模块
│   │   ├── draft/         # 草稿模块
│   │   ├── upload/        # 文件上传模块
│   │   ├── prisma/        # Prisma 服务
│   │   └── common/        # 公共模块 (守卫、装饰器)
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── package.json
│
└── README.md
```

## 功能特性

### 用户系统

- 用户注册/登录
- JWT Token 认证
- 用户头像

### 文章功能

- 富文本编辑器 (支持图片上传)
- 文章发布/编辑/删除
- 文章列表 (Feed 流)
- 文章详情页
- 点赞和浏览量统计
- 标签系统 (自动从内容中提取 #标签)

### 草稿功能

- 本地自动保存
- 云端草稿同步
- 离线模式支持

### 其他

- 下拉刷新
- 无限滚动加载
- 响应式设计

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0
- npm 或 yarn

### 数据库配置

1. 创建 MySQL 数据库

```sql
CREATE DATABASE news_lite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 在 `server` 目录下创建 `.env` 文件

```env
DATABASE_URL="mysql://username:password@localhost:3306/news_lite"
JWT_SECRET="your-jwt-secret-key"
```

### 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 数据库迁移

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 启动开发服务器

```bash
# 启动后端 (端口 9080)
cd server
npm run start:dev

# 启动前端 (端口 3000)
cd client
npm run dev
```

访问 http://localhost:3000 查看应用。

## API 接口

### 认证

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /auth/register | 用户注册 |
| POST | /auth/login | 用户登录 |

### 文章

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /articles | 获取文章列表 | 否 |
| GET | /articles/:id | 获取文章详情 | 否 |
| POST | /articles | 发布文章 | 是 |
| PUT | /articles/:id | 更新文章 | 是 |
| DELETE | /articles/:id | 删除文章 | 是 |
| POST | /articles/:id/like | 点赞文章 | 否 |

### 草稿

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /draft | 获取草稿 | 是 |
| POST | /draft | 保存草稿 | 是 |
| DELETE | /draft | 删除草稿 | 是 |

### 文件上传

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /upload/image | 上传图片 | 是 |

## 数据库模型

### User

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键 |
| username | String | 用户名 (唯一) |
| password | String | 密码 (加密) |
| nickname | String? | 昵称 |
| avatar | String? | 头像 URL |
| createdAt | DateTime | 创建时间 |

### Article

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键 |
| title | String | 标题 |
| content | String | 内容 (富文本) |
| authorId | Int | 作者 ID |
| likes | Int | 点赞数 |
| views | Int | 浏览量 |
| tags | Tag[] | 标签 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### Tag

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键 |
| name | String | 标签名 (唯一) |
| articles | Article[] | 关联文章 |
| createdAt | DateTime | 创建时间 |

### Draft

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键 |
| title | String | 标题 |
| content | String | 内容 |
| userId | Int | 用户 ID (唯一) |
| updatedAt | DateTime | 更新时间 |
| createdAt | DateTime | 创建时间 |

## 开发说明

### 代码规范

- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- TypeScript 严格模式

### 构建部署

```bash
# 构建前端
cd client
npm run build

# 构建后端
cd server
npm run build
npm run start:prod
```

## License

MIT

