import { Injectable } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { RealtimeEmitter } from './realtime-emitter.port';

@Injectable()
export class RealtimeEmitterImpl implements RealtimeEmitter {
  constructor(private readonly gateway: BoardGateway) {}

  emitToBoard(boardId: string, event: string, payload: unknown): void {
    this.gateway.server.to(`board:${boardId}`).emit(event, payload);
  }
}
