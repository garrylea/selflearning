# 核心难点逻辑深度分析 (Detailed Logic Analysis)

本文档针对“初中专项自适应学习平台”中 8 个最具挑战性的工程与算法问题提供深度设计方案。

## 1. 交互界面设计 (The Intuitive Command Center)
- **视觉层 (Map View)**: 核心是一个动态的知识图谱（Canvas 渲染）。节点间的连线代表逻辑依赖。
- **任务层 (Adaptive Interface)**: 
    - 界面不提供死板的“下一题”按钮，而是由 Agent 根据当前掌握度，在侧边栏实时更新“今日攻坚建议”。
    - 当学生进入练习，界面切换为沉浸式 Markdown 渲染引擎，支持多媒体（录音、视频、公式）的无缝弹出。
- **Agent 精髓**: 前端几乎不包含业务逻辑，所有 UI 状态的跃迁（如：从展示题目到展示解析，或弹出前置知识点建议）均由后端 Agent 通过分析 Shell 工具返回的结果后，下发指令驱动。

## 2. 题目难度划分逻辑 (A/B/C/D Classification)
- **多维度评估**: 在 Python 数据加工阶段，Gemini 会从以下维度评分：
    - **Step Complexity**: 完成该题所需的逻辑推导步数。
    - **Cross-Concept Count**: 题目涉及的知识点重叠数量（如：圆 + 二次函数 = A/B 级）。
    - **Mistake Probability**: 模型预测初中生在该题上的典型错误点数量。
- **自动对齐**: 系统会定期抽检，让 3.1 Pro 重新评估 1.5 Pro 标记过的难度，若偏差超过一级，则触发 Agent 的“全库重新定级”任务。

## 3. 动态题目定位 (Intelligent Search)
- **逻辑**: Agent 并不依赖繁琐的 SQL `where` 子句。
- **精髓方法**: 当需要 C 级题目时，Agent 生成一条 `ripgrep` 命令：
  `rg -l "difficulty: C" ./repo/math/8down/geometry/ | xargs rg -l "knowledge: 平行四边形性质"`
- **动态筛选**: Agent 会分析搜索出的 Markdown 块，剔除掉学生在本月内已经见过的重复题（通过文件哈希对比）。

## 4. 用户水平评估算法 (Adaptive Assessment)
- **核心算法**: **3/3 过关 + 2/3 补偿机制**。
- **状态机存储**: PostgreSQL 仅记录原子数据（做题对错、耗时）。
- **水平定级**: Agent 在每次练习结束后，通过读取用户的“近期做题流水文件”，进行逻辑推理：“虽然学生 3 题全对，但平均耗时超过 3 分钟，说明对‘辅助线画法’仍有迟疑，建议下一轮仍维持 C 级变式训练”。

## 5. 题解与动态辅导 (Solution & Tutoring)
- **静态层**: 试卷解析时，Gemini 预生成一份“标准 Markdown 解析”。
- **动态层 (The Tutoring)**: 
    - 当学生发起多媒体追问，Agent 会执行：`read_file(question_md)` + `read_file(user_history)`。
    - Agent 将这些上下文喂给 3.1 Pro，生成一段针对该学生的、启发式的对话内容，甚至可以自主调用 Shell 工具去寻找一张相关的例图发给学生。

## 6. 真题变式题生成 (AI-Generated Variations)
- **场景**: 真题刷完或需要高度重复训练时。
- **生成策略**: Agent 提取某道真题的 Markdown 原文，作为 `Few-shot` 样本喂给模型，要求：“保持考察点和逻辑结构不变，改变数值和背景故事，生成一道难度一致的新题”。
- **质量校验**: 生成的新题必须通过 Agent 内部的“自动解答测试”，若 AI 自己算出来的结果与预设不符，该题会被丢弃重生成。

## 7. Token 极致节省策略 (Cost Optimization)
- **精准提取**: 拒绝全量读取 5MB 的 PDF。Python 管道在预处理时已将 PDF 拆分为数千个 2KB 的题目小文件。
- **Shell 定位**: Agent 通过 `grep -n` 获取关键词所在行号，随后通过 `sed` 或 `awk` 只读取该题目及其解析的特定行数，大幅降低 Context Window 消耗。
- **本地 KV 缓存**: 相同问题的多媒体对话结果在内网建立缓存，避免重复生成。

## 8. 无效题自动过滤 (Automated QA Pipeline)
- **“模拟考”机制**: 
    - 每一道新解析的题目在入库前，Agent 会伪装成一个“学生”，尝试自主解题。
    - **过滤标准**: 如果 Agent 发现图形描述部分无法支撑其画出唯一图形，或者题干中的公式存在语法错误（LaTeX 无法渲染），该文件会被自动移入 `./quarantine` 文件夹，并生成一份错误日志。
