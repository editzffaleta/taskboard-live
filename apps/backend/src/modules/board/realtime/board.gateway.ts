import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { verify } from 'jsonwebtoken';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { Server, Socket } from 'socket.io';
import { PrismaMembershipRepository } from '../membership.prisma';
import { PresenceTracker } from './presence.tracker';

type AuthenticatedSocketUser = {
  id: string;
  name?: string;
};

type BoardSocketData = {
  user?: AuthenticatedSocketUser;
};

type BoardSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  BoardSocketData
>;

type BoardJoinPayload = {
  boardId: string;
};

type BoardLeavePayload = {
  boardId: string;
};

type JwtSocketPayload = {
  sub: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL,
    credentials: true,
  },
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BoardGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly presenceTracker: PresenceTracker,
  ) {}

  handleConnection(socket: BoardSocket): void {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      this.logger.warn(`Conexão recusada (sem token): ${socket.id}`);
      socket.disconnect(true);
      return;
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      this.logger.error('JWT_SECRET não configurado');
      socket.disconnect(true);
      return;
    }

    try {
      const payload = verify(token, secret) as JwtSocketPayload;
      const user: AuthenticatedSocketUser = {
        id: payload.sub,
        name: typeof payload.name === 'string' ? payload.name : undefined,
      };
      socket.data.user = user;
    } catch {
      this.logger.warn(`Conexão recusada (token inválido): ${socket.id}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: BoardSocket): void {
    const affected = this.presenceTracker.removeFromAllBoards(socket.id);

    for (const { boardId, users } of affected) {
      this.server.to(this.roomName(boardId)).emit('presence.update', {
        boardId,
        users,
      });
    }
  }

  @SubscribeMessage('board:join')
  async handleJoin(
    socket: BoardSocket,
    payload: BoardJoinPayload,
  ): Promise<void> {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    const { boardId } = payload;

    const membership = await this.membershipRepository.findByBoardAndUser(
      boardId,
      user.id,
    );

    if (!membership) {
      socket.emit('board:error', {
        event: 'board:join',
        code: 'board.member.forbidden',
      });
      return;
    }

    await socket.join(this.roomName(boardId));

    const users = this.presenceTracker.add(boardId, socket.id, {
      id: user.id,
      name: user.name,
    });

    this.server.to(this.roomName(boardId)).emit('presence.update', {
      boardId,
      users,
    });
  }

  @SubscribeMessage('board:leave')
  handleLeave(socket: BoardSocket, payload: BoardLeavePayload): void {
    const { boardId } = payload;

    void socket.leave(this.roomName(boardId));

    const users = this.presenceTracker.remove(boardId, socket.id);

    this.server.to(this.roomName(boardId)).emit('presence.update', {
      boardId,
      users,
    });
  }

  private roomName(boardId: string): string {
    return `board:${boardId}`;
  }
}
