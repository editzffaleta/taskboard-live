import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { translateHttpMessage } from '../i18n';

/**
 * Traduz a resposta padrão do `@nestjs/throttler` para o formato de erro da API, com a
 * mensagem i18n `http.too_many_requests` no lugar do texto padrão em inglês do pacote.
 */
@Catch(ThrottlerException)
export class ThrottlerI18nFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      errors: [translateHttpMessage('http.too_many_requests')],
      message: translateHttpMessage('http.too_many_requests'),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
