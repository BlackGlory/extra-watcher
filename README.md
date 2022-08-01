# extra-watcher
## Install
```sh
npm install --save extra-watcher
# or
yarn add extra-watcher
```

## API
### DirectoryWatcher
```ts
enum Target {
  File = 'file'
, Directory = 'directory'
}

interface ICreatedEvent {
  type: 'created'
  target: Target
  pathname: string
}

interface IModifiedEvent {
  type: 'modified'
  target: Target.File
  pathname: string
}

interface IDeletedEvent {
  type: 'deleted'
  target: Target
  pathname: string
}

type Event =
| ICreatedEvent
| IModifiedEvent
| IDeletedEvent

class DirectoryWatcher {
  events: readonly Event[]

  constructor(dirname: string)

  observe(): Observable<Event>
  start(): Promise<void>
  stop(): void
  reset(): void

  isChanged(): boolean
  isFileCreated(filename: string): boolean
  isDirectoryCreated(dirname: string): boolean
  isFileModified(filename: string): boolean
  isDirectoryModified(dirname: string): boolean
  isFileDeleted(filename: string): boolean
  isDirectoryDeleted(dirname: string): boolean
}
```

DirectoryWatcher based on event sourcing, `reset` can clear events.
A watcher can only be started and stopped once.

The following method checks "whether this condition is eventually true",
not "whether this event has occurred":
- `isFileCreated`
- `isDirectoryCreated`
- `isFileModified`
- `isDirectoryModified`
- `isFileDeleted`
- `isDirectoryDeleted`

### FileWatcher
```ts
type Event =
| ICreatedEvent
| IModifiedEvent
| IDeletedEvent

interface ICreatedEvent {
  type: 'created'
}

interface IModifiedEvent {
  type: 'modified'
}

interface IDeletedEvent {
  type: 'deleted'
}

class FileWatcher {
  events: readonly Event[]

  constructor(filename: string)

  observe(): Observable<Event>
  start(): Promise<void>
  stop(): void
  reset(): void

  isChanged(): boolean
  isCreated(): boolean
  isModified(): boolean
  isDeleted(): boolean
}
```

FileWatcher based on event sourcing, `reset` can clear events.
A watcher can only be started and stopped once.

The following method checks "whether this condition is eventually true",
not "whether this event has occurred":
- `isCreated`
- `isModified`
- `isDeleted`
