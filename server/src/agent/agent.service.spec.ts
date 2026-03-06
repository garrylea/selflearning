import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentService],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute a simple shell command', async () => {
    const result = await service.executeCommand('echo "Hello World"');
    expect(result.stdout.trim()).toBe('Hello World');
    expect(result.stderr).toBe('');
  });

  describe('searchQuestions', () => {
    it('should attempt to run ripgrep with provided pattern', async () => {
      // 假设当前目录下没有匹配的内容或没有 rg 命令
      const result = await service.searchQuestions('non-existent-pattern', './');
      // 无论结果如何，返回值应符合预期结构
      expect(result).toHaveProperty('stdout');
      expect(result).toHaveProperty('stderr');
    });
  });
});
