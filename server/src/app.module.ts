import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { path } from 'app-root-path'; // 也可以用原生 path
import * as nativePath from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResourceModule } from './resource/resource.module';

@Module({
  imports: [
    // 配置静态资源映射：将 /media 映射到项目根目录下的 uploads 文件夹
    ServeStaticModule.forRoot({
      rootPath: nativePath.resolve(__dirname, '../../uploads'),
      serveRoot: '/media',
    }),
    ResourceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
