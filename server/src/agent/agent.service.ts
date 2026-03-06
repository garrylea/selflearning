import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class AgentService {
  /**
   * 执行 Shell 命令的底层方法
   * @param command 完整的 Shell 命令字符串
   * @returns 包含 stdout 和 stderr 的对象
   */
  async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execPromise(command);
      return { stdout, stderr };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
      };
    }
  }

  /**
   * 题目检索工具：利用 ripgrep 极速搜索文件名
   * 对应底层命令: rg -l "[query]" [path]
   * @param query 搜索关键词（如 "difficulty: A"）
   * @param path 搜索范围路径（默认为 './repo/math'）
   */
  async searchQuestions(query: string, path: string = './repo/math'): Promise<{ stdout: string; stderr: string }> {
    // 增加简单的参数转义，防止命令注入
    const safeQuery = query.replace(/"/g, '\\"');
    const command = `rg -l "${safeQuery}" ${path}`;
    return this.executeCommand(command);
  }
}
