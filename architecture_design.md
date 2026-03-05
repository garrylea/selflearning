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

## 4. 数据库设计 (元数据层)
- **`questions_index`**: 记录 `question_id` -> `file_path` 的映射。
- **`knowledge_tree`**: 存储由 AI 预先生成的学科知识图谱及其前置关系。
- **`user_mastery`**: 存储用户在每个知识点上的当前 Level (A/B/C/D)。

---

## 5. 局域网部署与性能
- **存储**: 音视频与 Markdown 题目全量存储在内网服务器硬盘。
- **检索**: 哪怕有数万道题，`ripgrep` 在文件系统上的搜索速度也远超传统的数据库模糊查询。
