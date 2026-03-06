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

## 4. 自适应评估与训练逻辑 (Adaptive Logic & State Machine)

本系统的核心竞争力在于“非线性”的题目推送逻辑。

### 4.1 训练状态机 (Training State Machine)
系统不简单使用 `offset` 翻页，而是维护一个 **动态任务栈 (Task Stack)**：
1.  **初始状态**: 初始化一个包含 3 道经典真题的队列 `[Q1, Q2, Q3]`。
2.  **出栈逻辑**: 每次弹出一道题推送给用户。
3.  **失败处理 (Agent 驱动)**:
    - 若用户触发 `Incorrect` 或 `NeedHelp` 状态，系统暂停原队列。
    - **逻辑注入**: Agent 根据该题知识点生成的变式题 `V1` 插入到栈顶。
    - **锁定机制**: 只有当 `V1` 被正确解决后，系统才允许用户继续执行 `Q2`。
4.  **掌握度提升**: 只有完整执行完初始队列（及其中间产生的变式题），系统才会更新数据库中的知识点掌握级别（D->C->B->A）。

### 4.2 状态持久化与恢复 (Persistence & Recovery)
为了支持“断点续学”，后端需要实时持久化用户的 **Session Context**：
- **存储内容**: 
    - `current_knowledge_point`: 当前正在攻克的节点。
    - `task_queue`: 序列化后的题目 ID 列表及完成状态。
    - `active_discussion`: 正在进行的 AI 对话上下文。
- **恢复机制**: 在 `App::on_mount` 时调用 `GET /api/v1/exercise/restore`。如果存在活跃 Session，则由 Agent 将 UI 恢复到对应的题目界面和讨论历史。

### 4.3 高等级重学逻辑 (Mastery Protection)
- **校验**: 当 `POST /api/v1/exercise/start` 时，Agent 首先检查 `user_mastery` 表。
- **交互**: 如果 Level = A，返回特殊的 `WARNING_ALREADY_MASTERED` 状态码，前端收到后弹出确认框，允许用户重置为 B/C/D 级别重新挑战。

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
    ## 9. 客户端 Agent 核心交互逻辑 (Client Agent Interaction Logic)

本章详细描述客户端 Agent (基于 NestJS 的 Service 层) 如何作为“中枢大脑”，协调用户指令、大模型推理与本地工具执行。

### 9.1 工具注册机制 (Tool Registration & Schema)
Agent 并不直接运行代码，而是通过 **Function Calling** 机制将本地能力“外包”给大模型。

**设计抉择：专用工具 vs. 通用 Shell**
在本项目中，我们选择了**精细化专用工具 (Specialized Tools)** 而非通用的 `run_shell_command`，基于以下考量：
- **Token 与稳定性的权衡**: 虽然通用 Shell 工具能节省定义工具所需的 Token，但要求大模型具备极高的 Linux 指令精确度。为了保证在“题目检索”等核心业务上的绝对稳定性，我们选择将 `grep_search`、`read_file` 等定义为独立工具。
- **结构化约束**: 通过 JSON Schema 强制模型提供特定参数（如 `difficulty`, `topic`），模型不再需要记忆 `ripgrep` 的复杂 Flags，只需关注业务逻辑，大幅降低了推理成本和出错率。
- **安全审计**: 专用工具使得 Agent 能够对每一项原子操作进行更细粒度的权限校验，防止模型执行危险的系统指令。

- **定义**: 每个工具被定义为一个包含 `name`, `description` 和 `parameters` (JSON Schema 格式) 的结构体。

- **注册**: 在与 Gemini 交互时，Agent 会在 `tools` 字段中声明这些能力（如 `list_directory`, `read_file`, `grep_search`, `run_shell_command`）。
- **解耦**: 逻辑上，大模型只负责“决策”调用哪个工具及参数，而 Agent 负责“执行”并将结果反馈。

### 9.2 核心推理循环 (The Reasoning Loop)
当用户输入指令（如“给我找三道几何题”）时，Agent 进入以下循环：
1.  **Context 组装**: Agent 收集当前上下文（用户历史、当前掌握度、项目结构说明）并连同工具定义发送给大模型。
2.  **模型决策 (Model Turn)**: 大模型分析指令。如果它需要更多信息，会返回一个 `call` 请求（例如：调用 `grep_search` 搜索关键词）。
3.  **本地执行 (Execution Turn)**: Agent 捕获 `call` 请求，映射到本地真实的函数（如调用系统 Shell 运行 `rg`），获取执行结果（标准输出或错误信息）。
4.  **结果回传**: Agent 将执行结果作为 `tool_response` 发送回大模型。
5.  **循环终止**: 模型重复步骤 2-4，直到它认为已获得足够信息来回答用户或完成任务，最后返回最终的文本响应或 UI 驱动指令。

### 9.3 交互时序流 (Interaction Sequence)
- **Step 1: 用户发送命令** -> Tauri (Frontend) -> NestJS Controller -> Agent Service.
- **Step 2: Agent 初始化会话** -> 调用 Gemini API (带上所有可用 Tools 的声明)。
- **Step 3: 大模型请求工具** -> 返回 `tool_use: { name: "grep_search", args: { pattern: "几何" } }`。
- **Step 4: Agent 执行工具** -> 在服务器磁盘运行 `rg "几何"` -> 获取文件列表。
- **Step 5: Agent 反馈结果** -> 将文件列表发回大模型。
- **Step 6: 大模型得出结论** -> 返回最终 Markdown 内容或“已为您找到题目”的确认信息。
- **Step 7: UI 更新** -> Agent Service 将结果通过 WebSocket 或 HTTP 返回给 Tauri，驱动前端界面跃迁。

### 9.4 错误处理与安全边界
- **超时保护**: 所有的工具执行都有严格的 Timeout 限制，防止 Shell 命令挂起。
- **权限校验**: Agent 在执行 `run_shell_command` 前会校验命令的安全性，禁止执行危险的系统删除或网络穿透指令。
- **幻觉修正**: 如果大模型调用了不存在的工具或参数错误，Agent 会返回详细的错误提示，引导模型修正其推理逻辑。
