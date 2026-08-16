import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface RealtimePayload {
  type: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'RECIPE_UPDATED';
  message: string;
  orderId?: string;
  recipeId?: string;
  status?: string;
  data?: any;
  timestamp: string;
}

@Injectable()
export class RealtimeService {
  private eventSubject = new Subject<MessageEvent>();

  sendEvent(payload: Omit<RealtimePayload, 'timestamp'>) {
    const fullPayload: RealtimePayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    this.eventSubject.next({
      data: fullPayload,
    } as MessageEvent);
  }

  getEventStream(): Observable<MessageEvent> {
    return this.eventSubject.asObservable();
  }
}
