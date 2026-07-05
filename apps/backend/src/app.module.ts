import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { JwtAuthModule } from './shared/auth/jwt-auth.module';
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard';
import { ApiExceptionFilter } from './shared/errors/api-exception.filter';
import { ThrottlerI18nFilter } from './shared/http';
import { AuthModule } from './modules/auth/auth.module';
import { BoardModule } from './modules/board/board.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    DbModule,
    JwtAuthModule,
    AuthModule,
    BoardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Ordem importa: o Nest resolve o ultimo filtro registrado que casar com a excecao;
    // o filtro generico vem primeiro para que o especifico do throttler tenha precedencia.
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_FILTER, useClass: ThrottlerI18nFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
