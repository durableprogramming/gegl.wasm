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

#include "wasm-io.h"
#include "wasm-memory.h"
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

#define MAX_VFS_FILES 256
#define MAX_FILENAME_LEN 256

struct _GeglWasmVfsFile
{
  char *data;
  size_t size;
  size_t capacity;
  size_t position;
  char filename[MAX_FILENAME_LEN];
  char mode;
};

struct _GeglWasmBuffer
{
  char *data;
  size_t size;
};

static struct {
  char filename[MAX_FILENAME_LEN];
  char *data;
  size_t size;
} vfs_persistent[MAX_VFS_FILES];

static struct _GeglWasmVfsFile vfs_open_files[MAX_VFS_FILES];

static int
find_persistent_file (const char *filename)
{
  for (int i = 0; i < MAX_VFS_FILES; i++)
    {
      if (vfs_persistent[i].filename[0] && strcmp (vfs_persistent[i].filename, filename) == 0)
        return i;
    }
  return -1;
}

static int
allocate_open_file (void)
{
  for (int i = 0; i < MAX_VFS_FILES; i++)
    {
      if (vfs_open_files[i].filename[0] == '\0')
        return i;
    }
  return -1;
}

GeglWasmVfsFile *
gegl_wasm_vfs_open (const char *filename, const char *mode)
{
  int persistent_idx = -1;
  int open_idx;
  struct _GeglWasmVfsFile *file;
  size_t initial_size = 0;

  if (!filename || !mode)
    return NULL;

  open_idx = allocate_open_file ();
  if (open_idx == -1)
    return NULL;

  file = &vfs_open_files[open_idx];
  strncpy (file->filename, filename, MAX_FILENAME_LEN - 1);
  file->filename[MAX_FILENAME_LEN - 1] = '\0';
  file->position = 0;
  file->mode = mode[0];
  file->capacity = 1024;
  file->data = g_malloc (file->capacity);
  if (!file->data)
    {
      file->filename[0] = '\0';
      return NULL;
    }

  if (mode[0] == 'r' || mode[0] == '+')
    {
      persistent_idx = find_persistent_file (filename);
      if (persistent_idx != -1)
        {
          initial_size = vfs_persistent[persistent_idx].size;
          if (initial_size > file->capacity)
            {
              file->capacity = initial_size;
              file->data = g_realloc (file->data, file->capacity);
              if (!file->data)
                {
                  file->filename[0] = '\0';
                  return NULL;
                }
            }
          memcpy (file->data, vfs_persistent[persistent_idx].data, initial_size);
        }
      else if (mode[0] == 'r')
        {
          g_free (file->data);
          file->filename[0] = '\0';
          return NULL;
        }
    }

  file->size = initial_size;
  return file;
}

int
gegl_wasm_vfs_close (GeglWasmVfsFile *file)
{
  int persistent_idx;

  if (!file)
    return -1;

  /* Save back to persistent if written */
  if (file->mode == 'w' || file->mode == 'a' || file->mode == '+')
    {
      persistent_idx = find_persistent_file (file->filename);
      if (persistent_idx == -1)
        {
          for (int i = 0; i < MAX_VFS_FILES; i++)
            {
              if (vfs_persistent[i].filename[0] == '\0')
                {
                  persistent_idx = i;
                  break;
                }
            }
        }
      if (persistent_idx != -1)
        {
          g_free (vfs_persistent[persistent_idx].data);
          vfs_persistent[persistent_idx].data = g_malloc (file->size);
          if (vfs_persistent[persistent_idx].data)
            {
              memcpy (vfs_persistent[persistent_idx].data, file->data, file->size);
              vfs_persistent[persistent_idx].size = file->size;
              strncpy (vfs_persistent[persistent_idx].filename, file->filename, MAX_FILENAME_LEN - 1);
            }
        }
    }

  g_free (file->data);
  file->filename[0] = '\0';
  return 0;
}

size_t
gegl_wasm_vfs_read (void * ptr, size_t size, size_t nmemb, GeglWasmVfsFile *file)
{
  size_t bytes_to_read;
  size_t available;

  if (!file || !ptr || (file->mode != 'r' && file->mode != '+'))
    return 0;

  bytes_to_read = size * nmemb;
  available = file->size - file->position;

  if (bytes_to_read > available)
    bytes_to_read = available;

  if (bytes_to_read > 0)
    {
      memcpy (ptr, file->data + file->position, bytes_to_read);
      file->position += bytes_to_read;
    }

  return bytes_to_read / size;
}

size_t
gegl_wasm_vfs_write (const void * ptr, size_t size, size_t nmemb, GeglWasmVfsFile *file)
{
  size_t bytes_to_write;
  size_t new_size;

  if (!file || !ptr || (file->mode != 'w' && file->mode != 'a' && file->mode != '+'))
    return 0;

  bytes_to_write = size * nmemb;
  new_size = file->position + bytes_to_write;

  if (new_size > file->capacity)
    {
      size_t new_capacity = file->capacity * 2;
      while (new_capacity < new_size)
        new_capacity *= 2;
      file->data = g_realloc (file->data, new_capacity);
      if (!file->data)
        return 0;
      file->capacity = new_capacity;
    }

  memcpy (file->data + file->position, ptr, bytes_to_write);
  file->position += bytes_to_write;

  if (new_size > file->size)
    file->size = new_size;

  return bytes_to_write / size;
}

int
gegl_wasm_vfs_seek (GeglWasmVfsFile *file, long offset, int whence)
{
  long new_pos;

  if (!file)
    return -1;

  switch (whence)
    {
    case SEEK_SET:
      new_pos = offset;
      break;
    case SEEK_CUR:
      new_pos = (long) file->position + offset;
      break;
    case SEEK_END:
      new_pos = (long) file->size + offset;
      break;
    default:
      return -1;
    }

  if (new_pos < 0 || (size_t) new_pos > file->size)
    return -1;

  file->position = (size_t) new_pos;
  return 0;
}

long
gegl_wasm_vfs_tell (GeglWasmVfsFile *file)
{
  if (!file)
    return -1;

  return (long) file->position;
}

int
gegl_wasm_vfs_stat (const char *filename, struct stat *st)
{
  int idx;

  if (!filename || !st)
    return -1;

  idx = find_persistent_file (filename);
  if (idx == -1)
    return -1;

  memset (st, 0, sizeof (struct stat));
  st->st_size = vfs_persistent[idx].size;
  st->st_mode = S_IFREG | 0644;

  return 0;
}

GeglWasmBuffer *
gegl_wasm_buffer_create (size_t size)
{
  GeglWasmBuffer *buffer = g_malloc (sizeof (GeglWasmBuffer));
  if (!buffer)
    return NULL;

  buffer->data = g_malloc (size);
  if (!buffer->data)
    {
      g_free (buffer);
      return NULL;
    }
  buffer->size = size;
  return buffer;
}

void
gegl_wasm_buffer_destroy (GeglWasmBuffer *buffer)
{
  if (!buffer)
    return;

  g_free (buffer->data);
  g_free (buffer);
}

size_t
gegl_wasm_buffer_read (GeglWasmBuffer *buffer, void * ptr, size_t size, size_t offset)
{
  size_t available;

  if (!buffer || !ptr)
    return 0;

  available = buffer->size - offset;
  if (size > available)
    size = available;

  if (size > 0)
    memcpy (ptr, buffer->data + offset, size);

  return size;
}

size_t
gegl_wasm_buffer_write (GeglWasmBuffer *buffer, const void * ptr, size_t size, size_t offset)
{
  size_t new_size;

  if (!buffer || !ptr)
    return 0;

  new_size = offset + size;
  if (new_size > buffer->size)
    {
      buffer->data = g_realloc (buffer->data, new_size);
      if (!buffer->data)
        return 0;
      buffer->size = new_size;
    }

  memcpy (buffer->data + offset, ptr, size);
  return size;
}

size_t
gegl_wasm_buffer_size (GeglWasmBuffer *buffer)
{
  if (!buffer)
    return 0;

  return buffer->size;
}