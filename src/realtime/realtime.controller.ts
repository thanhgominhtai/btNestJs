import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Public()
  @Sse('events')
  sendEvents(): Observable<MessageEvent> {
    return this.realtimeService.getEventStream();
  }
}
