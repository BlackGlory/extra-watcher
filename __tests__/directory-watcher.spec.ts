import { DirectoryWatcher } from '@src/directory-watcher'
import { createTempNameSync, ensureDir, pathExists, remove } from 'extra-filesystem'
import { writeFile } from 'fs/promises'
import path from 'path'
import { delay } from 'extra-promise'

const tmpDirname = createTempNameSync()
beforeEach(() => ensureDir(tmpDirname))
afterEach(() => remove(tmpDirname))

describe('DirectoryWatcher', () => {
  describe('observe', () => {
    test('file created', async () => {
      const fn = jest.fn()
      const watcher = new DirectoryWatcher(tmpDirname)
      const filename = path.resolve(tmpDirname, 'file')
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await touch(filename)
        await delay(1000)

        expect(fn).toBeCalledWith({
          type: 'created'
        , target: 'file'
        , pathname: filename
        })
        expect(watcher.events).toStrictEqual([{
          type: 'created'
        , target: 'file'
        , pathname: filename
        }])
      } finally {
        watcher.stop()
      }
    })

    test('directory created', async () => {
      const fn = jest.fn()
      const watcher = new DirectoryWatcher(tmpDirname)
      const dirname = path.join(tmpDirname, 'directory')
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await touchDir(dirname)
        await delay(1000)

        expect(fn).toBeCalledWith({
          type: 'created'
        , target: 'directory'
        , pathname: dirname
        })
        expect(watcher.events).toStrictEqual([{
          type: 'created'
        , target: 'directory'
        , pathname: dirname
        }])
      } finally {
        watcher.stop()
      }
    })

    test('file modified', async () => {
      const fn = jest.fn()
      const watcher = new DirectoryWatcher(tmpDirname)
      const filename = path.join(tmpDirname, 'file')
      await touch(filename)
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await writeFile(filename, 'foo')
        await delay(1000)

        expect(fn).toBeCalledWith({
          type: 'modified'
        , target: 'file'
        , pathname: filename
        })
        expect(watcher.events).toStrictEqual([{
          type: 'modified'
        , target: 'file'
        , pathname: filename
        }])
      } finally {
        watcher.stop()
      }
    })

    test('file deleted', async () => {
      const fn = jest.fn()
      const watcher = new DirectoryWatcher(tmpDirname)
      const filename = path.join(tmpDirname, 'file')
      await touch(filename)
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await remove(filename)
        await delay(1000)

        expect(fn).toBeCalledWith({
          type: 'deleted'
        , target: 'file'
        , pathname: filename
        })
        expect(watcher.events).toStrictEqual([{
          type: 'deleted'
        , target: 'file'
        , pathname: filename
        }])
      } finally {
        watcher.stop()
      }
    })

    test('directory deleted', async () => {
      const fn = jest.fn()
      const watcher = new DirectoryWatcher(tmpDirname)
      const dirname = path.join(tmpDirname, 'file')
      await touchDir(dirname)
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await remove(dirname)
        await delay(1000)

        expect(fn).toBeCalledWith({
          type: 'deleted'
        , target: 'directory'
        , pathname: dirname
        })
        expect(watcher.events).toStrictEqual([{
          type: 'deleted'
        , target: 'directory'
        , pathname: dirname
        }])
      } finally {
        watcher.stop()
      }
    })
  })

  describe('isFileCreated', () => {
    describe('file created', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.resolve(tmpDirname, 'file')
        await watcher.start()

        try {
          await touch(filename)
          await delay(1000)
          const result = watcher.isFileCreated(filename)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file created, deleted', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.resolve(tmpDirname, 'file')
        await watcher.start()

        try {
          await touch(filename)
          await remove(filename)
          await delay(1000)
          const result = watcher.isFileCreated(filename)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file created, parent directory deleted', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.resolve(tmpDirname, 'directory')
        await touchDir(dirname)
        const filename = path.resolve(tmpDirname, 'directory/file')
        await watcher.start()

        try {
          await touch(filename)
          await remove(dirname)
          await delay(1000)
          const result = watcher.isFileCreated(filename)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })

  describe('isDirectoryCreated', () => {
    describe('directory created', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.resolve(tmpDirname, 'directory')
        await watcher.start()

        try {
          await touchDir(dirname)
          await delay(1000)
          const result = watcher.isDirectoryCreated(dirname)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('directory created, deleted', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.resolve(tmpDirname, 'directory')
        await watcher.start()

        try {
          await touchDir(dirname)
          await remove(dirname)
          await delay(1000)
          const result = watcher.isDirectoryCreated(dirname)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('directory created, parent directory deleted', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.resolve(tmpDirname, 'directory')
        await touchDir(dirname)
        const deepDirname = path.resolve(tmpDirname, 'directory/directory')
        await watcher.start()

        try {
          await touchDir(deepDirname)
          await remove(dirname)
          await delay(1000)
          const result = watcher.isDirectoryCreated(deepDirname)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })

  describe('isFileModified', () => {
    describe('file modified', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.join(tmpDirname, 'file')
        await touch(filename)
        await watcher.start()

        try {
          await writeFile(filename, 'foo')
          await delay(1000)
          const result = watcher.isFileModified(filename)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file modified, deleted', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.join(tmpDirname, 'file')
        await touch(filename)
        await watcher.start()

        try {
          await writeFile(filename, 'foo')
          await remove(filename)
          await delay(1000)
          const result = watcher.isFileModified(filename)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file modified, parent directory deleted', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.join(tmpDirname, 'directory')
        await touchDir(dirname)
        const filename = path.join(tmpDirname, 'directory/file')
        await touch(filename)
        await watcher.start()

        try {
          await writeFile(filename, 'foo')
          await remove(dirname)
          await delay(1000)
          const result = watcher.isFileModified(filename)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })

  describe('isDirectoryModified', () => {
    describe('child file created', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.join(tmpDirname, 'file')
        await watcher.start()

        try {
          await touch(filename)
          await delay(1000)
          const result = watcher.isDirectoryModified(tmpDirname)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('child file modified', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.join(tmpDirname, 'file')
        await touch(filename)
        await watcher.start()

        try {
          await writeFile(filename, 'foo')
          await delay(1000)
          const result = watcher.isDirectoryModified(tmpDirname)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('child file deleted', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.join(tmpDirname, 'file')
        await touch(filename)
        await watcher.start()

        try {
          await remove(filename)
          await delay(1000)
          const result = watcher.isDirectoryModified(tmpDirname)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('child directory created', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.join(tmpDirname, 'directory')
        await watcher.start()

        try {
          await touchDir(dirname)
          await delay(1000)
          const result = watcher.isDirectoryModified(tmpDirname)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('child directory deleted', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.join(tmpDirname, 'directory')
        await touchDir(dirname)
        await watcher.start()

        try {
          await remove(dirname)
          await delay(1000)
          const result = watcher.isDirectoryModified(tmpDirname)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('directory deleted', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        await watcher.start()

        try {
          await remove(tmpDirname)
          await delay(1000)
          const result = watcher.isDirectoryModified(tmpDirname)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })

  describe('isFileDeleted', () => {
    describe('file deleted', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.join(tmpDirname, 'file')
        await touch(filename)
        await watcher.start()

        try {
          await remove(filename)
          await delay(1000)
          const result = watcher.isFileDeleted(filename)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('parent directory deleted', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.join(tmpDirname, 'directory')
        await touchDir(dirname)
        const filename = path.join(tmpDirname, 'directory/file')
        await touch(filename)
        await watcher.start()

        try {
          await remove(dirname)
          await delay(1000)
          const result = watcher.isFileDeleted(filename)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file deleted, created', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const filename = path.join(tmpDirname, 'file')
        await touch(filename)
        await watcher.start()

        try {
          await remove(filename)
          await touch(filename)
          await delay(1000)
          const result = watcher.isFileDeleted(filename)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })

  describe('isDirectoryDeleted', () => {
    describe('directory deleted', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.join(tmpDirname, 'directory')
        await touch(dirname)
        await watcher.start()

        try {
          await remove(dirname)
          await delay(1000)
          const result = watcher.isDirectoryDeleted(dirname)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('parent directory deleted', () => {
      it('returns true', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.join(tmpDirname, 'directory')
        await touchDir(dirname)
        const deepDirname = path.join(tmpDirname, 'directory/directory')
        await touchDir(deepDirname)
        await watcher.start()

        try {
          await remove(dirname)
          await delay(1000)
          const result = watcher.isDirectoryDeleted(deepDirname)

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('directory deleted, created', () => {
      it('returns false', async () => {
        const watcher = new DirectoryWatcher(tmpDirname)
        const dirname = path.join(tmpDirname, 'directory')
        await touch(dirname)
        await watcher.start()

        try {
          await remove(dirname)
          await ensureDir(dirname)
          await delay(1000)
          const result = watcher.isDirectoryDeleted(dirname)

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })
})

async function touch(filename: string): Promise<void> {
  await writeFile(filename, '')
}

async function touchDir(dirname: string): Promise<void> {
  if (await pathExists(dirname)) throw new Error('Directory already exists')
  await ensureDir(dirname)
}
