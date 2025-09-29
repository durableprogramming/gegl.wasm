/* This file is part of GEGL
 *
 * GEGL is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * GEGL is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with GEGL; if not, see <https://www.gnu.org/licenses/>.
 *
 * Copyright 2023 GEGL contributors
 */

#ifndef __GEGL_WASM_IO_H__
#define __GEGL_WASM_IO_H__

#include <stddef.h>
#include <sys/stat.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct _GeglWasmVfsFile GeglWasmVfsFile;
typedef struct _GeglWasmBuffer GeglWasmBuffer;

/**
 * gegl_wasm_vfs_open:
 * @filename: the name of the virtual file
 * @mode: the mode string (e.g., "r", "w", "rb")
 *
 * Opens a virtual file in the virtual file system.
 *
 * Returns: a new GeglWasmVfsFile handle, or NULL on error
 */
GeglWasmVfsFile *gegl_wasm_vfs_open (const char *filename, const char *mode);

/**
 * gegl_wasm_vfs_close:
 * @file: the file handle
 *
 * Closes a virtual file.
 *
 * Returns: 0 on success, -1 on error
 */
int gegl_wasm_vfs_close (GeglWasmVfsFile *file);

/**
 * gegl_wasm_vfs_read:
 * @ptr: buffer to read into
 * @size: size of each element
 * @nmemb: number of elements
 * @file: the file handle
 *
 * Reads data from a virtual file.
 *
 * Returns: number of elements read
 */
size_t gegl_wasm_vfs_read (void *ptr, size_t size, size_t nmemb, GeglWasmVfsFile *file);

/**
 * gegl_wasm_vfs_write:
 * @ptr: buffer to write from
 * @size: size of each element
 * @nmemb: number of elements
 * @file: the file handle
 *
 * Writes data to a virtual file.
 *
 * Returns: number of elements written
 */
size_t gegl_wasm_vfs_write (const void *ptr, size_t size, size_t nmemb, GeglWasmVfsFile *file);

/**
 * gegl_wasm_vfs_seek:
 * @file: the file handle
 * @offset: offset
 * @whence: whence (SEEK_SET, SEEK_CUR, SEEK_END)
 *
 * Seeks in a virtual file.
 *
 * Returns: 0 on success, -1 on error
 */
int gegl_wasm_vfs_seek (GeglWasmVfsFile *file, long offset, int whence);

/**
 * gegl_wasm_vfs_tell:
 * @file: the file handle
 *
 * Gets the current position in a virtual file.
 *
 * Returns: the position, or -1 on error
 */
long gegl_wasm_vfs_tell (GeglWasmVfsFile *file);

/**
 * gegl_wasm_vfs_stat:
 * @filename: the filename
 * @st: stat structure to fill
 *
 * Gets stat information for a virtual file.
 *
 * Returns: 0 on success, -1 on error
 */
int gegl_wasm_vfs_stat (const char *filename, struct stat *st);

/**
 * gegl_wasm_buffer_create:
 * @size: initial size of the buffer
 *
 * Creates a new buffer for I/O operations.
 *
 * Returns: a new GeglWasmBuffer
 */
GeglWasmBuffer *gegl_wasm_buffer_create (size_t size);

/**
 * gegl_wasm_buffer_destroy:
 * @buffer: the buffer
 *
 * Destroys a buffer.
 */
void gegl_wasm_buffer_destroy (GeglWasmBuffer *buffer);

/**
 * gegl_wasm_buffer_read:
 * @buffer: the buffer
 * @ptr: buffer to read into
 * @size: size to read
 * @offset: offset in the buffer
 *
 * Reads data from a buffer.
 *
 * Returns: number of bytes read
 */
size_t gegl_wasm_buffer_read (GeglWasmBuffer *buffer, void *ptr, size_t size, size_t offset);

/**
 * gegl_wasm_buffer_write:
 * @buffer: the buffer
 * @ptr: buffer to write from
 * @size: size to write
 * @offset: offset in the buffer
 *
 * Writes data to a buffer.
 *
 * Returns: number of bytes written
 */
size_t gegl_wasm_buffer_write (GeglWasmBuffer *buffer, const void *ptr, size_t size, size_t offset);

/**
 * gegl_wasm_buffer_size:
 * @buffer: the buffer
 *
 * Gets the size of the buffer.
 *
 * Returns: the size
 */
size_t gegl_wasm_buffer_size (GeglWasmBuffer *buffer);

#ifdef __cplusplus
}
#endif

#endif /* __GEGL_WASM_IO_H__ */