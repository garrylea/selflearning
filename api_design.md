# 前后端 API 接口设计说明书 (API Specification v2.0)

## 1. 通用约定
- **协议**: HTTP (局域网内网访问)
- **数据格式**: JSON / Multipart-form-data (仅限分片上传)
- **统一响应结构**:
  ```json
  {
    "success": true,
    "code": 200,
    "message": "success",
    "data": {}
  }
  ```

---

## 2. 知识图谱与详情接口 (Knowledge Graph)

### 2.1 获取全量图谱
- **路径**: `GET /api/v1/graph/:subject_id`
- **说明**: 返回学科图谱的节点层级、依赖边以及当前用户的掌握度概览（用于主界面渲染）。

### 2.2 获取知识点详情 (核心定义)
- **路径**: `GET /api/v1/graph/node/:node_id`
- **响应**: 
  ```json
  {
    "id": "node-001",
    "name": "勾股定理",
    "definition": "Markdown string describing the definition...",
    "significance": "Why it's important...",
    "prerequisites": [
      { "id": "node-000", "name": "平方根" }
    ],
    "mastery_status": {
      "current_level": "C",
      "is_locked": false,
      "last_test_date": "2024-03-05"
    }
  }
  ```

---

## 3. 练习、评估与报告接口 (Exercise & Report)

### 3.1 获取练习进度状态 (Init)
- **路径**: `GET /api/v1/exercise/status/:node_id`
- **说明**: 进入练习前调用。返回用户当前在该知识点的进度（例如：已对 2 题，正在进行 D 级挑战）。

### 3.2 自适应获取下一组题
- **路径**: `POST /api/v1/exercise/fetch-next`
- **请求体**: `{ "node_id": "node-001", "requested_level": "D" }`
- **响应**: 返回题目 Markdown 列表（含 LaTeX 图形描述）。

### 3.3 提交答案并触发批改
- **路径**: `POST /api/v1/exercise/submit`
- **请求体**: 
  ```json
  {
    "question_id": "q-123",
    "answer_content": "LaTeX string or file_path",
    "media_type": "text" // text / image
  }
  ```
- **响应**: 
  ```json
  {
    "is_correct": false,
    "feedback": "AI 简评",
    "attempt_id": "att-789", // 极其重要：用于后续针对此作答发起对话
    "mastery_updated": { "level": "D", "progress": "2/3" }
  }
  ```

### 3.4 生成并获取掌握度报告
- **路径**: `GET /api/v1/evaluation/report/:node_id`
- **说明**: 训练结束或用户主动查看。返回雷达图数据、错题归类及 AI 撰写的学习建议。

---

## 4. 多媒体 AI 伴学对话接口 (Tutoring & History)

### 4.1 针对特定作答发起提问
- **路径**: `POST /api/v1/chat/ask`
- **说明**: 必须关联 `attempt_id`，使 AI 具备上下文。
- **请求体**: 
  ```json
  {
    "question_id": "q-123",
    "attempt_id": "att-789", // 关联特定的作答历史
    "content": "这里为什么错了？",
    "media_type": "text" // text / audio / video
  }
  ```
- **交互**: **SSE (Server-Sent Events)** 流式推送。

### 4.2 获取对话历史记录 (带分页)
- **路径**: `GET /api/v1/chat/history/:question_id`
- **参数**: `?page=1&page_size=20`
- **响应**: 返回包含文本、图片、音视频 URL 的混合列表。

---

## 5. 资源上传接口 (断点续传与秒传)

### 5.1 上传预检 (秒传逻辑)
- **路径**: `POST /api/v1/resource/upload/check`
- **请求体**: `{ "file_hash": "sha256", "file_name": "v.mp4" }`
- **响应**: 
  ```json
  {
    "is_exists": false, // 若为 true 则实现“秒传”，直接返回 file_url
    "file_url": "/media/xxx.mp4",
    "uploaded_chunks": [1, 2, 4] // 已接收的分片序号列表
  }
  ```

### 5.2 分片上传
- **路径**: `POST /api/v1/resource/upload/chunk`
- **格式**: `multipart/form-data` (包含 `chunk`, `hash`, `index`)

### 5.3 合并请求
- **路径**: `POST /api/v1/resource/upload/merge`
- **请求体**: `{ "hash": "sha256", "file_type": "video" }`

---

## 6. 状态码与异常处理
| Code | 描述 |
| :--- | :--- |
| 200 | 成功 |
| 413 | 文件过大 (局域网限制 100MB) |
| 429 | AI 正在排队 (并发限制) |
| 500 | 局域网磁盘空间不足或服务器宕机 |
