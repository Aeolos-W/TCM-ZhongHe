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
- **字体设置**：阅读字体为微软雅黑，舒适易读

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
| 移动端 | Android WebView (minSdk 24, targetSdk 34) |
| 构建系统 | Gradle 8.4 + Android Gradle Plugin 8.1.0 |

---

## 项目结构

```
app/                          # 前端 React 项目
├── src/
│   ├── components/           # React 组件
│   │   ├── ui/              # shadcn/ui 基础组件
│   │   ├── BookReader.tsx   # 典籍阅读器
│   │   ├── BookShelf.tsx    # 书架管理
│   │   ├── BookSearch.tsx   # 书籍搜索
│   │   ├── CaseList.tsx     # 医案列表
│   │   ├── CaseCard.tsx     # 医案卡片
│   │   ├── CaseTreeView.tsx # 树状浏览
│   │   ├── Community.tsx    # 社区主组件
│   │   ├── PostList.tsx     # 帖子列表
│   │   ├── PostEditor.tsx   # 帖子编辑器
│   │   ├── PostDetail.tsx   # 帖子详情
│   │   ├── Profile.tsx      # 个人中心
│   │   ├── FolderPicker.tsx # 启动页（自动进入）
│   │   └── TopNavigation.tsx # 顶部导航
│   ├── lib/
│   │   ├── dataStore.tsx    # 数据状态管理
│   │   ├── supabase.ts      # Supabase 客户端（需自行配置）
│   │   ├── fileSystemService.ts # 文件系统抽象
│   │   ├── bookService.ts   # 典籍服务
│   │   ├── renderMarkdown.ts # Markdown 渲染
│   │   └── config.ts        # 应用配置
│   ├── types/               # TypeScript 类型定义
│   ├── pages/               # 页面组件
│   └── App.tsx              # 应用入口
├── public/                  # 静态资源
│   └── splash-assets/       # 启动页素材
└── index.html               # 入口 HTML

android-app/                  # Android 原生项目
├── app/
│   ├── src/main/
│   │   ├── java/com/zhongjing/medical/  # Java 源码
│   │   ├── res/             # 资源文件（图标、布局等）
│   │   └── assets/          # 前端构建产物
│   └── build.gradle         # 应用构建配置
├── build.gradle             # 项目构建配置
└── gradle/                  # Gradle Wrapper
```

---

## 本地开发

### 环境要求
- Node.js >= 20
- npm 或 yarn
- JDK 17
- Android SDK（platforms;android-34, build-tools;34.0.0）

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

构建产物将输出到 `app/dist/` 目录。

---

## 构建 APK

### 方式一：Gradle 命令行（推荐）

```bash
# 1. 构建前端
cd app
npm run build

# 2. 复制构建产物到 Android 项目
rm -rf ../android-app/app/src/main/assets/www
cp -r dist ../android-app/app/src/main/assets/www

# 3. 构建 APK
cd ../android-app
./gradlew assembleRelease --no-daemon
```

构建成功后，APK 位于：
`android-app/app/build/outputs/apk/release/app-release.apk`

### 方式二：Android Studio
1. 将 `app/dist/` 下的文件复制到 `android-app/app/src/main/assets/www/` 目录
2. 使用 Android Studio 打开 `android-app/` 项目
3. 配置签名密钥后构建并签名 APK

---

## 配置说明

### Supabase 配置（社区功能）

社区和用户功能依赖 Supabase。由于安全原因，`app/src/lib/supabase.ts` 已从仓库移除。

如需启用社区功能：

1. 复制模板文件：
   ```bash
   cp app/src/lib/supabase.ts.example app/src/lib/supabase.ts
   ```

2. 在 [Supabase](https://supabase.com) 创建项目

3. 创建以下数据表：
   - `community_posts`（社区帖子）
   - `community_comments`（评论）
   - `user_favorites`（收藏）
   - `user_profiles`（用户资料）
   - `app_updates`（热更新）

4. 在 `app/src/lib/supabase.ts` 中替换为您的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`

### Android 签名配置

由于安全原因，`android-app/app/build.gradle` 中的签名密码已清理。

如需构建发布版 APK：

1. 准备您的签名密钥（.keystore 或 .jks）
2. 在 `android-app/app/build.gradle` 的 `signingConfigs.release` 中配置密钥路径和密码
3. 或使用环境变量：
   ```bash
   export STORE_PASSWORD=your-store-password
   export KEY_ALIAS=your-key-alias
   export KEY_PASSWORD=your-key-password
   ```

### Android 权限

应用需要以下权限：
- `INTERNET`：社区功能与 Supabase 通信
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`：数据导入导出 (Android 9 及以下)

---

## 版本历史

| 版本 | 说明 |
|------|------|
| v2.2.4 | 阅读字体改为微软雅黑，清理仓库敏感文件 |
| v2.2.3 | 使用 SVG 矢量资源重建启动页 |
| v2.2.2 | 替换应用图标，修复启动页布局 |
| v2.2.1 | 更换启动页为中式塔楼样式 |
| v2.2.0 | 重构为 Gradle 构建，模块化组件升级 |

---

## 开源协议

MIT License

---

## 致谢

- [shadcn/ui](https://ui.shadcn.com/) - 精美的 React 组件库
- [Supabase](https://supabase.com/) - 开源 Firebase 替代方案
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
