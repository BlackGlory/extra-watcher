import { FileWatcher } from '@src/file-watcher'
import { createTempNameSync, ensureDir, pathExists, remove } from 'extra-filesystem'
import { writeFile } from 'fs/promises'
import path from 'path'
import { delay } from 'extra-promise'

const tmpDirname = createTempNameSync()
beforeEach(() => ensureDir(tmpDirname))
afterEach(() => remove(tmpDirname))

describe('FileWatcher', () => {
  describe('observe', () => {
    test('created', async () => {
      const fn = jest.fn()
      const filename = path.resolve(tmpDirname, 'file')
      const watcher = new FileWatcher(filename)
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await touch(filename)
        await delay(1000)

        expect(fn).toBeCalledWith({ type: 'created' })
        expect(watcher.events).toStrictEqual([
          { type: 'created' }
        ])
      } finally {
        watcher.stop()
      }
    })

    test('modified', async () => {
      const fn = jest.fn()
      const filename = path.join(tmpDirname, 'file')
      const watcher = new FileWatcher(filename)
      await touch(filename)
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await writeFile(filename, 'foo')
        await delay(1000)

        expect(fn).toBeCalledWith({ type: 'modified' })
        expect(watcher.events).toStrictEqual([
          { type: 'modified' }
        ])
      } finally {
        watcher.stop()
      }
    })

    test('deleted', async () => {
      const fn = jest.fn()
      const filename = path.join(tmpDirname, 'file')
      const watcher = new FileWatcher(tmpDirname)
      await touch(filename)
      await watcher.start()

      try {
        watcher.observe().subscribe(fn)
        await remove(filename)
        await delay(1000)

        expect(fn).toBeCalledWith({ type: 'deleted' })
        expect(watcher.events).toStrictEqual([
          { type: 'deleted' }
        ])
      } finally {
        watcher.stop()
      }
    })
  })

  describe('isCreated', () => {
    describe('file created', () => {
      it('returns true', async () => {
        const filename = path.resolve(tmpDirname, 'file')
        const watcher = new FileWatcher(filename)
        await watcher.start()

        try {
          await touch(filename)
          await delay(1000)
          const result = watcher.isCreated()

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file created, deleted', () => {
      it('returns false', async () => {
        const filename = path.resolve(tmpDirname, 'file')
        const watcher = new FileWatcher(filename)
        await watcher.start()

        try {
          await touch(filename)
          await remove(filename)
          await delay(1000)
          const result = watcher.isCreated()

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file created, parent directory deleted', () => {
      it('returns false', async () => {
        const dirname = path.resolve(tmpDirname, 'directory')
        await touchDir(dirname)
        const filename = path.resolve(tmpDirname, 'directory/file')
        const watcher = new FileWatcher(filename)
        await watcher.start()

        try {
          await touch(filename)
          await remove(dirname)
          await delay(1000)
          const result = watcher.isCreated()

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })

  describe('isModified', () => {
    describe('file modified', () => {
      it('returns true', async () => {
        const filename = path.join(tmpDirname, 'file')
        const watcher = new FileWatcher(filename)
        await touch(filename)
        await watcher.start()

        try {
          await writeFile(filename, 'foo')
          await delay(1000)
          const result = watcher.isModified()

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file modified, deleted', () => {
      it('returns false', async () => {
        const filename = path.join(tmpDirname, 'file')
        const watcher = new FileWatcher(filename)
        await touch(filename)
        await watcher.start()

        try {
          await writeFile(filename, 'foo')
          await remove(filename)
          await delay(1000)
          const result = watcher.isModified()

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file modified, parent directory deleted', () => {
      it('returns false', async () => {
        const dirname = path.join(tmpDirname, 'directory')
        await touchDir(dirname)
        const filename = path.join(tmpDirname, 'directory/file')
        const watcher = new FileWatcher(filename)
        await touch(filename)
        await watcher.start()

        try {
          await writeFile(filename, 'foo')
          await remove(dirname)
          await delay(1000)
          const result = watcher.isModified()

          expect(result).toBe(false)
        } finally {
          watcher.stop()
        }
      })
    })
  })

  describe('isDeleted', () => {
    describe('file deleted', () => {
      it('returns true', async () => {
        const filename = path.join(tmpDirname, 'file')
        const watcher = new FileWatcher(filename)
        await touch(filename)
        await watcher.start()

        try {
          await remove(filename)
          await delay(1000)
          const result = watcher.isDeleted()

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('parent directory deleted', () => {
      it('returns true', async () => {
        const dirname = path.join(tmpDirname, 'directory')
        await touchDir(dirname)
        const filename = path.join(tmpDirname, 'directory/file')
        const watcher = new FileWatcher(filename)
        await touch(filename)
        await watcher.start()

        try {
          await remove(dirname)
          await delay(1000)
          const result = watcher.isDeleted()

          expect(result).toBe(true)
        } finally {
          watcher.stop()
        }
      })
    })

    describe('file deleted, created', () => {
      it('returns false', async () => {
        const filename = path.join(tmpDirname, 'file')
        const watcher = new FileWatcher(filename)
        await touch(filename)
        await watcher.start()

        try {
          await remove(filename)
          await touch(filename)
          await delay(1000)
          const result = watcher.isDeleted()

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
