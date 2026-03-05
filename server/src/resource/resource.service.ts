import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs-extra';

@Injectable()
export class ResourceService {
  private readonly UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');
  private readonly TEMP_DIR = path.resolve(__dirname, '../../../uploads/temp');

  constructor() {
    // 确保上传和临时目录存在
    fs.ensureDirSync(this.UPLOAD_DIR);
    fs.ensureDirSync(this.TEMP_DIR);
  }

  /**
   * 检查文件状态，实现断点续传和秒传预检
   */
  async checkFile(fileHash: string, fileName: string) {
    const filePath = path.join(this.UPLOAD_DIR, `${fileHash}_${fileName}`);
    const chunkDir = path.join(this.TEMP_DIR, fileHash);

    // 1. 检查文件是否已完整存在 (秒传)
    if (await fs.pathExists(filePath)) {
      return {
        isExists: true,
        fileUrl: `/media/${fileHash}_${fileName}`,
        uploadedChunks: [],
      };
    }

    // 2. 检查已上传的分片
    let uploadedChunks = [];
    if (await fs.pathExists(chunkDir)) {
      uploadedChunks = (await fs.readdir(chunkDir)).map((name) => parseInt(name));
    }

    return {
      isExists: false,
      uploadedChunks,
    };
  }

  /**
   * 保存分片
   */
  async handleChunk(chunk: Express.Multer.File, hash: string, index: string) {
    const chunkDir = path.join(this.TEMP_DIR, hash);
    await fs.ensureDir(chunkDir);
    await fs.move(chunk.path, path.join(chunkDir, index), { overwrite: true });
    return true;
  }

  /**
   * 合并分片
   */
  async mergeChunks(hash: string, fileName: string) {
    const chunkDir = path.join(this.TEMP_DIR, hash);
    const targetPath = path.join(this.UPLOAD_DIR, `${hash}_${fileName}`);

    if (!(await fs.pathExists(chunkDir))) {
      throw new InternalServerErrorException('分片目录不存在');
    }

    const chunks = await fs.readdir(chunkDir);
    // 按索引排序
    chunks.sort((a, b) => parseInt(a) - parseInt(b));

    // 并发合并可能会导致顺序错乱，这里采用流式同步合并或顺序 Promise
    const writeStream = fs.createWriteStream(targetPath);
    
    for (const chunkName of chunks) {
      const chunkPath = path.join(chunkDir, chunkName);
      const content = await fs.readFile(chunkPath);
      writeStream.write(content);
      await fs.remove(chunkPath); // 合并后删除分片
    }
    
    writeStream.end();
    await fs.remove(chunkDir); // 删除分片目录

    return {
      fileUrl: `/media/${hash}_${fileName}`,
    };
  }
}
