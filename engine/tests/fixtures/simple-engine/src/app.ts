import { answer } from './util';

export class DemoService {
  value(): number {
    return answer();
  }
}

export function boot(): number {
  const service = new DemoService();
  return service.value();
}

