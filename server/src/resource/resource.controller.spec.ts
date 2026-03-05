import { Test, TestingModule } from '@nestjs/testing';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';

describe('ResourceController', () => {
  let controller: ResourceController;
  let service: ResourceService;

  beforeEach(async () => {
    // 创建 Mock Service 避免真实文件操作干扰集成测试
    const mockService = {
      checkFile: jest.fn().mockResolvedValue({ isExists: true, fileUrl: '/mock/path' }),
      mergeChunks: jest.fn().mockResolvedValue({ fileUrl: '/mock/path' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceController],
      providers: [{ provide: ResourceService, useValue: mockService }],
    }).compile();

    controller = module.get<ResourceController>(ResourceController);
    service = module.get<ResourceService>(ResourceService);
  });

  it('调用 check 接口时应调用 Service 的 checkFile 方法', async () => {
    const payload = { file_hash: 'abc', file_name: 'test.mp4' };
    const result = await controller.checkUploadStatus(payload);
    
    expect(service.checkFile).toHaveBeenCalledWith('abc', 'test.mp4');
    expect(result.success).toBe(true);
    expect(result.data.isExists).toBe(true);
  });

  it('调用 merge 接口时应调用 Service 的 mergeChunks 方法', async () => {
    const payload = { hash: 'abc', file_name: 'test.mp4' };
    const result = await controller.mergeUploadChunks(payload);
    
    expect(service.mergeChunks).toHaveBeenCalledWith('abc', 'test.mp4');
    expect(result.success).toBe(true);
  });
});
