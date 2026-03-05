import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 设置全局路由前缀，符合 API 设计说明书 v2.0
  app.setGlobalPrefix('api/v1');
  
  // 开启 CORS 以支持 Tauri 跨域请求
  app.enableCORS();

  const port = 3000;
  await app.listen(port);
  console.log(`🚀 后端服务已启动: http://localhost:${port}/api/v1`);
}
bootstrap();
