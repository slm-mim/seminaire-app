import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/qa' })
export class QaGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinSession')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() sessionId: string,
  ) {
    client.join(`session:${sessionId}`);
  }

  @SubscribeMessage('leaveSession')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() sessionId: string,
  ) {
    client.leave(`session:${sessionId}`);
  }

  notifyNewQuestion(sessionId: string, question: any) {
    this.server.to(`session:${sessionId}`).emit('newQuestion', question);
  }

  notifyQuestionUpdate(sessionId: string, question: any) {
    this.server.to(`session:${sessionId}`).emit('questionUpdate', question);
  }

  notifyReorder(sessionId: string, questions: any[]) {
    this.server
      .to(`session:${sessionId}`)
      .emit('questionsReordered', questions);
  }
}
