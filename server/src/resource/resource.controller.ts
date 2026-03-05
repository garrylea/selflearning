import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResourceService } from './resource.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs-extra';

@Controller('resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post('upload/check')
  async checkUploadStatus(@Body() body: { file_hash: string; file_name: string }) {
    const data = await this.resourceService.checkFile(body.file_hash, body.file_name);
    return { success: true, code: 200, message: 'success', data };
  }

  @Post('upload/chunk')
  @UseInterceptors(FileInterceptor('chunk', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const tempDir = path.resolve(__dirname, '../../../uploads/temp/multer');
        fs.ensureDirSync(tempDir);
        cb(null, tempDir);
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9));
      }
    })
  }))
  async uploadChunk(
    @UploadedFile() chunk: Express.Multer.File,
    @Body() body: { hash: string; index: string }
  ) {
    await this.resourceService.handleChunk(chunk, body.hash, body.index);
    return { success: true, code: 200, message: 'chunk uploaded' };
  }

  @Post('upload/merge')
  async mergeUploadChunks(@Body() body: { hash: string; file_name: string }) {
    const data = await this.resourceService.mergeChunks(body.hash, body.file_name);
    return { success: true, code: 200, message: 'merge success', data };
  }
}
