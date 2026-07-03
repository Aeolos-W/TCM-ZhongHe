# 众合中医

> 集众腋之裘，合众家之籍

一款面向中医从业者和爱好者的移动端医案管理与学习应用。支持本地医案记录、分类整理、典籍阅读，以及基于 Supabase 的社区交流与知识分享。

---

## 功能特性

### 医案管理
- **快速录入**：支持结构化录入患者信息、主诉、辨证、处方、疗效跟踪
- **分类检索**：按科室、病症、治法等多维度分类，支持关键词搜索
- **树状浏览**：以树形结构直观展示医案层级关系
- **本地存储**：数据保存在设备本地，隐私可控，支持导入导出 JSON

### 典籍阅读
- **书架管理**：收录中医经典著作，支持本地阅读
- **阅读进度**：自动记录阅读位置
- **书籍搜索**：快速检索书库中的典籍

### 社区交流
- **帖子发布**：分享医案、答疑、体会经验
- **分类浏览**：按医案分享、帖子、答疑、体会经验筛选
- **评论互动**：对帖子进行评论交流
- **用户系统**：基于邮箱的注册登录，支持用户名设置

### 数据安全
- **自动初始化**：首次启动自动创建数据目录和默认分类
- **数据导出**：一键导出全部医案数据为 JSON 文件
- **数据导入**：支持从 JSON 文件恢复数据
- **本地优先**：所有核心数据存储在设备本地，无需网络即可使用

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite |
| 样式方案 | Tailwind CSS + shadcn/ui |
| 状态管理 | React Context + hooks |
| 后端服务 | Supabase (社区、认证) |
| 本地存储 | Android WebView Bridge + 文件系统 |
| 移动端 | Android WebView (minSdk 24) |

---

## 项目结构

```
app/
├── src/
│   ├── components/          # React 组件
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   ├── BookReader.tsx  # 典籍阅读器
│   │   ├── CaseList.tsx    # 医案列表
│   │   ├── Community.tsx   # 社区主组件
│   │   ├── PostList.tsx    # 帖子列表
│   │   ├── Profile.tsx     # 个人中心
│   │   └── SplashScreen.tsx # 启动页
│   ├── lib/
│   │   ├── dataStore.tsx   # 数据状态管理
│   │   ├── supabase.ts     # Supabase 客户端
│   │   └── fileSystemService.ts # 文件系统抽象
│   ├── types/              # TypeScript 类型定义
│   └── App.tsx             # 应用入口
├── android/                # Android 原生层 (WebView + JS Bridge)
└── dist/                   # 构建产物
```

---

## 本地开发

### 环境要求
- Node.js >= 20
- npm 或 yarn
- Android Studio (如需构建 APK)

### 安装依赖
```bash
cd app
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

构建产物将输出到 `app/dist/` 目录，随后可通过 Android 项目的构建流程打包为 APK。

---

## 构建 APK

### 方式一：使用 apktool (推荐)
```bash
# 1. 构建前端
npm run build

# 2. 替换 APK 中的 assets/www
python3 scripts/update_apk.py

# 3. 输出签名后的 APK
# /workspace/众合中医_signed.apk
```

### 方式二：Android Studio
1. 将 `app/dist/` 下的文件复制到 Android 项目的 `assets/www/` 目录
2. 使用 Android Studio 构建并签名 APK

---

## 配置说明

### Supabase 配置
社区和用户功能依赖 Supabase，如需自行部署后端：

1. 在 [Supabase](https://supabase.com) 创建项目
2. 创建 `community_posts` 和 `community_comments` 表
3. 在 `app/src/lib/supabase.ts` 中替换为你的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`

### Android 权限
应用需要以下权限：
- `INTERNET`：社区功能与 Supabase 通信
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`：数据导入导出 (Android 9 及以下)

---

## 开源协议

MIT License

---

## 致谢

- [shadcn/ui](https://ui.shadcn.com/) - 精美的 React 组件库
- [Supabase](https://supabase.com/) - 开源 Firebase 替代方案
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
