import { Test, TestingModule } from '@nestjs/testing';
import { ResourceService } from './resource.service';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('ResourceService', () => {
  let service: ResourceService;
  const MOCK_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads_test');
  const MOCK_TEMP_DIR = path.resolve(__dirname, '../../../uploads_test/temp');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResourceService],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
    
    // 强制修改目录为测试专用目录，避免污染生产环境
    (service as any).UPLOAD_DIR = MOCK_UPLOAD_DIR;
    (service as any).TEMP_DIR = MOCK_TEMP_DIR;

    await fs.ensureDir(MOCK_UPLOAD_DIR);
    await fs.ensureDir(MOCK_TEMP_DIR);
  });

  afterEach(async () => {
    await fs.remove(MOCK_UPLOAD_DIR);
  });

  it('应该能够正确检查已存在的文件 (秒传场景)', async () => {
    const hash = 'test-hash';
    const name = 'test.mp4';
    const filePath = path.join(MOCK_UPLOAD_DIR, `${hash}_${name}`);
    await fs.writeFile(filePath, 'dummy content');

    const result = await service.checkFile(hash, name);
    expect(result.isExists).toBe(true);
    expect(result.fileUrl).toContain(hash);
  });

  it('应该能够识别已上传的部分分片 (断点续传场景)', async () => {
    const hash = 'chunk-hash';
    const chunkDir = path.join(MOCK_TEMP_DIR, hash);
    await fs.ensureDir(chunkDir);
    await fs.writeFile(path.join(chunkDir, '1'), 'chunk1');
    await fs.writeFile(path.join(chunkDir, '3'), 'chunk3');

    const result = await service.checkFile(hash, 'test.mp4');
    expect(result.isExists).toBe(false);
    expect(result.uploadedChunks).toContain(1);
    expect(result.uploadedChunks).toContain(3);
    expect(result.uploadedChunks).not.toContain(2);
  });

  it('应该能够正确合并分片并清理临时目录', async () => {
    const hash = 'merge-hash';
    const name = 'final.txt';
    const chunkDir = path.join(MOCK_TEMP_DIR, hash);
    await fs.ensureDir(chunkDir);
    
    await fs.writeFile(path.join(chunkDir, '0'), 'Hello ');
    await fs.writeFile(path.join(chunkDir, '1'), 'World!');

    const result = await service.mergeChunks(hash, name);
    const finalPath = path.join(MOCK_UPLOAD_DIR, `${hash}_${name}`);
    
    const content = await fs.readFile(finalPath, 'utf-8');
    expect(content).toBe('Hello World!');
    expect(await fs.pathExists(chunkDir)).toBe(false); // 验证清理逻辑
    expect(result.fileUrl).toBe(`/media/${hash}_${name}`);
  });
});
