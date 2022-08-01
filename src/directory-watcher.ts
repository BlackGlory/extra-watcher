import Watcher from 'watcher'
import { waitForEventEmitter } from '@blackglory/wait-for'
import path from 'path'
import { isSubPathOf } from 'extra-filesystem'
import { Subject, Observable } from 'rxjs'
import { FiniteStateMachine } from '@blackglory/structures'

interface IEvent {
  type: string
}

export type Event =
| ICreatedEvent
| IModifiedEvent
| IDeletedEvent

export interface ICreatedEvent extends IEvent {
  type: 'created'
  target: Target
  pathname: string
}

export interface IModifiedEvent extends IEvent {
  type: 'modified'
  target: Target.File
  pathname: string
}

export interface IDeletedEvent extends IEvent {
  type: 'deleted'
  target: Target
  pathname: string
}

export enum Target {
  File = 'file'
, Directory = 'directory'
}

export class DirectoryWatcher {
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

  constructor(private dirname: string) {}

  observe(): Observable<Event> {
    return this.subject
  }

  async start(): Promise<void> {
    this.fsm.send('start')

    this._events = []
    this.watcher = new Watcher(path.resolve(this.dirname), {
      ignoreInitial: true
    , recursive: true
    })

    this.watcher.addListener('add', (filePath: string) => {
      const event: ICreatedEvent = {
        type: 'created'
      , target: Target.File
      , pathname: filePath
      }
      this._events.push(event)
      this.subject.next(event)
    })

    this.watcher.addListener('addDir', (directoryPath: string) => {
      const event: ICreatedEvent = {
        type: 'created'
      , target: Target.Directory
      , pathname: directoryPath
      }
      this._events.push(event)
      this.subject.next(event)
    })

    this.watcher.addListener('change', (filePath: string) => {
      const event: IModifiedEvent = {
        type: 'modified'
      , target: Target.File
      , pathname: filePath
      }
      this._events.push(event)
      this.subject.next(event)
    })

    this.watcher.addListener('unlink', (filePath: string) => {
      const event: IDeletedEvent = {
        type: 'deleted'
      , target: Target.File
      , pathname: filePath
      }
      this._events.push(event)
      this.subject.next(event)
    })

    this.watcher.addListener('unlinkDir', (directoryPath: string) => {
      const event: IDeletedEvent = {
        type: 'deleted'
      , target: Target.Directory
      , pathname: directoryPath
      }
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

  isChanged(): boolean {
    return this._events.length > 0
  }

  /**
   * 在以下情况返回真值:
   * - 文件被创建, 且在之后没有被删除
   * - 其他文件被重命名/移动至此文件名, 且在之后没有被删除
   */
  isFileCreated(filename: string): boolean {
    const absoluteFilename = path.resolve(filename)

    return this._events.reduce<boolean>((result, event) => {
      if (
        event.type === 'created' &&
        event.target === Target.File && 
        event.pathname === absoluteFilename
      ) {
        return true
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.File &&
        event.pathname === absoluteFilename
      ) {
        return false
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        isSubPathOf(absoluteFilename, event.pathname)
      ) {
        return false
      }

      return result
    }, false)
  }

  /**
   * 在以下情况返回真值:
   * - 目录被创建, 且在之后没有被删除
   * - 其他目录被重命名/移动至此目录名, 且在之后没有被删除
   */
  isDirectoryCreated(dirname: string): boolean {
    const absoluteDirname = path.resolve(dirname)

    return this._events.reduce<boolean>((result, event) => {
      if (
        event.type === 'created' &&
        event.target === Target.Directory &&
        event.pathname === absoluteDirname
      ) {
        return true
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        event.pathname === absoluteDirname
      ) {
        return false
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        isSubPathOf(absoluteDirname, event.pathname)
      ) {
        return false
      }

      return result
    }, false)
  }

  /**
   * 在以下情况返回真值:
   * - 文件被修改, 且在之后没有被删除
   */
  isFileModified(filename: string): boolean {
    const absoluteFilename = path.resolve(filename)

    return this._events.reduce<boolean>((result, event) => {
      if (
        event.type === 'modified' &&
        event.target === Target.File &&
        event.pathname === absoluteFilename
      ) {
        return true
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.File &&
        event.pathname === absoluteFilename
      ) {
        return false
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        isSubPathOf(absoluteFilename, event.pathname)
      ) {
        return false
      }

      return result
    }, false)
  }

  /**
   * 在以下情况返回真值:
   * - 目录下有新的文件/文件创建, 且之后目录没有被删除
   * - 目录下有文件/目录被删除, 且之后目录没有被删除
   * - 目录下有文件/目录被修改, 且之后目录没有被删除
   */
  isDirectoryModified(dirname: string): boolean {
    const absoluteDirname = path.resolve(dirname)

    return this._events.reduce<boolean>((result, event) => {
      if (
        event.type === 'created' &&
        isSubPathOf(event.pathname, absoluteDirname)
      ) {
        return true
      }

      if (
        event.type === 'modified' &&
        isSubPathOf(event.pathname, absoluteDirname)
      ) {
        return true
      }

      if (
        event.type === 'deleted' &&
        isSubPathOf(event.pathname, absoluteDirname)
      ) {
        return true
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        event.pathname === absoluteDirname
      ) {
        return false
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        isSubPathOf(absoluteDirname, event.pathname)
      ) {
        return false
      }

      return result
    }, false)
  }

  /**
   * 在以下情况返回真值:
   * - 文件被删除, 且之后没有创建同名文件
   * - 文件被重命名, 且之后没有创建同名文件
   * - 文件的祖先目录被删除, 且之后没有创建同名文件
   */
  isFileDeleted(filename: string): boolean {
    const absoluteFilename = path.resolve(filename)

    return this._events.reduce<boolean>((result, event) => {
      if (
        event.type === 'deleted' &&
        event.target === Target.File &&
        event.pathname === absoluteFilename
      ) {
        return true
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        isSubPathOf(absoluteFilename, event.pathname)
      ) {
        return true
      }

      if (
        event.type === 'created' &&
        event.target === Target.File &&
        event.pathname === absoluteFilename
      ) {
        return false
      }

      return result
    }, false)
  }

  /**
   * 在以下情况返回真值:
   * - 目录被删除, 且之后没有创建同名目录
   * - 目录的祖先目录被删除, 且之后没有创建同名目录
   */
  isDirectoryDeleted(dirname: string): boolean {
    const absoluteDirname = path.resolve(dirname)

    return this._events.reduce<boolean>((result, event) => {
      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        event.pathname === absoluteDirname
      ) {
        return true
      }

      if (
        event.type === 'deleted' &&
        event.target === Target.Directory &&
        isSubPathOf(absoluteDirname, event.pathname)
      ) {
        return true
      }

      if (
        event.type === 'created' &&
        event.target === Target.Directory &&
        event.pathname === absoluteDirname
      ) {
        return false
      }

      return result
    }, false)
  }
}
