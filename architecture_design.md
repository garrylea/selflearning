# 系统架构与技术选型设计说明书 (Architecture Design - Full Data Lifecycle)

## 1. 整体架构概述
本系统由 **数据生产线 (Data Ingestion Pipeline)**、**核心业务 Agent (The Brain)** 以及 **交互表现层 (The Interface)** 组成。

### 1.1 数据流向图 (Data Provenance)
1.  **源头**: `zgkao.com` (历年真题 PDF)。
2.  **采集 (Crawler)**: Python 脚本自动化下载 PDF 并建立原始档案。
3.  **转译 (VLM Parser)**: Python 调用 Gemini 多模态模型，执行 PDF -> Markdown 的高精度转化，并在 Markdown 头部注入结构化标签 (Front-matter)。
4.  **归档 (Knowledge Base)**: 将解析后的 Markdown 题目按 `科目/年级/知识点/` 目录结构存入服务器物理磁盘。
5.  **索引 (Meta Index)**: 将题目元数据（Hash, 知识点, 难度, 文件路径）同步至 PostgreSQL，供 Agent 快速检索。

---

## 2. 技术栈选型

| 维度 | 选型 | 理由 |
| :--- | :--- | :--- |
| **数据采集** | Python (Playwright / Scrapy) | 处理复杂的真题库网站爬取。 |
| **数据解析** | Python (google-genai) | 配合 Gemini 2.5/3.0 实现理科 PDF 的完美还原。 |
| **Agent 核心** | Shell-as-a-Tool (rg, grep) | 利用底层工具在本地 Markdown 库中进行毫秒级题目提取。 |
| **业务中台** | NestJS (Node.js + TS) | 驱动 Agent 逻辑，管理用户状态与数据库索引。 |
| **表现层** | Tauri + React | 桌面端交互环境。 |

---

## 3. 核心模块详细设计

### 3.1 自动化数据生产线 (Ingestion Pipeline)
这是数据的源头：
- **Module A: Scraper**: 监控 `zgkao.com`，增量下载 PDF 试卷。
- **Module B: AI-Parser**: 调用 PoC 验证过的 Gemini 脚本，将 PDF 拆解为独立的题目文件（Markdown）。
- **Module C: Indexer**: 将题目与知识图谱的关联关系写入 PostgreSQL。

### 3.2 检索 Agent 与工具化 Shell
Agent 就像一个“图书管理员”，它知道题目在哪个目录下：
- **Tool: FileSearcher**: Agent 生成 `rg` 命令，从磁盘提取特定的 Markdown 题目块。
- **Tool: MetadataQuery**: Agent 生成 SQL，从 Postgres 查找哪些知识点需要补强。

### 3.3 闭环学习流 (Adaptive Logic)
1.  **诊断**: Agent 查表确定用户等级。
2.  **搜寻**: Agent 生成指令，在本地 Markdown 库中搜索对应难度的 3 道真题。
3.  **推送**: NestJS 通过 API 发送 Markdown 内容给 Tauri 渲染。
4.  **评估**: 学生提交后，Agent 调用 `execute_command` 记录流水，并更新 Postgres 中的掌握度。

---

## 4. 数据库设计 (元数据与状态层)

### 4.1 `questions_index` (题目元数据)
数据库并不存储题目全文，仅作为检索索引：
- **`id`**: 唯一标识。
- **`paper_id`**: 对应原始试卷名称。
- **`item_number`**: 对应试卷中的原始题号（如：第 15 题）。
- **`difficulty`**: A/B/C/D 级别。
- **`knowledge_point`**: 关联知识点。
- **`file_path`**: 物理 Markdown 文件的存储路径（格式：`./repo/math/8down/geometry/PAPER_001_15.md`）。

### 4.2 `user_learning_session` (断点续学状态)
记录用户退出时的“现场”：
- **`user_id`**: 用户标识。
- **`node_id`**: 当前知识点。
- **`task_queue`**: JSON 数组，记录 3 道初始真题的 ID 及其完成状态。
- **`current_step`**: 当前执行到的队列索引（或变式题 ID）。
- **`chat_context_id`**: 关联的 AI 对话历史 ID，用于恢复讨论现场。

---

## 5. 试卷解析输出规范 (The Output Format)
解析后的 Markdown 文件遵循以下结构，以便于 Agent 使用 `sed` 或 `grep` 进行工具化提取：
```markdown
---
paper: "2023年北京市中考数学真题"
item: 15
difficulty: D
knowledge: ["平行四边形性质", "全等三角形"]
---
# 题干
如图所示，在平行四边形 ABCD 中...
# 答案
A
# 详解
1. 第一步：根据平行四边形对边平行...
2. 第二步：...
```
