import Watcher from 'watcher'
import { waitForEventEmitter } from '@blackglory/wait-for'
import { Subject, Observable } from 'rxjs'
import { FiniteStateMachine } from '@blackglory/structures'
import path from 'path'

interface IEvent {
  type: string
}

export type Event =
| ICreatedEvent
| IModifiedEvent
| IDeletedEvent

export interface ICreatedEvent extends IEvent {
  type: 'created'
}

export interface IModifiedEvent extends IEvent {
  type: 'modified'
}

export interface IDeletedEvent extends IEvent {
  type: 'deleted'
}

export class FileWatcher {
  private fsm = new FiniteStateMachine<
    'idle' | 'watching' | 'end'
  , 'start' | 'stop'
  >({
    idle: {
      start: 'watching'
    }
  , watching: {
      stop: 'end'
    }
  , end: {}
  }, 'idle')
  private _events: Event[] = []
  private subject: Subject<Event> = new Subject()
  private watcher?: Watcher.type

  get events(): readonly Event[] {
    return this._events
  }

  constructor(private filename: string) {}

  observe(): Observable<Event> {
    return this.subject
  }

  async start(): Promise<void> {
    this.fsm.send('start')

    this._events = []
    this.watcher = new Watcher(path.resolve(this.filename), {
      ignoreInitial: true
    })

    this.watcher.addListener('add', (filePath: string) => {
      const event: ICreatedEvent = { type: 'created' }
      this._events.push(event)
      this.subject.next(event)
    })

    this.watcher.addListener('change', (filePath: string) => {
      const event: IModifiedEvent = { type: 'modified' }
      this._events.push(event)
      this.subject.next(event)
    })

    this.watcher.addListener('unlink', (filePath: string) => {
      const event: IDeletedEvent = { type: 'deleted' }
      this._events.push(event)
      this.subject.next(event)
    })

    await waitForEventEmitter(this.watcher, 'ready')
  }

  stop(): void {
    this.fsm.send('stop')

    this.subject.complete()
    this.watcher?.close()
  }

  reset(): void {
    this._events = []
  }

  /**
   * 在以下情况返回真值:
   * - 文件被创建, 且在之后没有被删除
   */
  isCreated(): boolean {
    return this._events.reduce<boolean>((result, event) => {
      if (event.type === 'created') return true
      if (event.type === 'deleted') return false

      return result
    }, false)
  }

  /**
   * 在以下情况返回真值:
   * - 文件被修改, 且在之后没有被删除
   */
  isModified(): boolean {
    return this._events.reduce<boolean>((result, event) => {
      if (event.type === 'modified') return true
      if (event.type === 'deleted') return false

      return result
    }, false)
  }

  /**
   * 在以下情况返回真值:
   * - 文件被删除, 且之后没有创建同名文件
   * - 文件被重命名, 且之后没有创建同名文件
   * - 文件的祖先目录被删除, 且之后没有创建同名文件
   */
  isDeleted(): boolean {
    return this._events.reduce<boolean>((result, event) => {
      if (event.type === 'deleted') return true
      if (event.type === 'created') return false

      return result
    }, false)
  }
}
