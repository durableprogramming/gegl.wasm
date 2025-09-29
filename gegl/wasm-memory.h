#ifndef GEGL_WASM_MEMORY_H
#define GEGL_WASM_MEMORY_H

#include <stddef.h>
#include <stdarg.h>

void *g_malloc(size_t n_bytes);
void *g_malloc0(size_t n_bytes);
void *g_realloc(void *mem, size_t n_bytes);
void g_free(void *mem);

#define g_slice_alloc(block_size) g_malloc(block_size)
#define g_slice_alloc0(block_size) g_malloc0(block_size)
#define g_slice_new(type) ((type *) g_slice_alloc(sizeof(type)))
#define g_slice_new0(type) ((type *) g_slice_alloc0(sizeof(type)))
#define g_slice_dup(type, mem) ((type *) memcpy(g_slice_alloc(sizeof(type)), (mem), sizeof(type)))
#define g_slice_free(type, mem) g_slice_free1(sizeof(type), mem)
void g_slice_free1(size_t block_size, void *mem);

void *g_memdup(const void *mem, size_t byte_size);
void *g_memdup2(const void *mem, size_t byte_size);
char *g_strdup(const char *str);
char *g_strndup(const char *str, size_t n);
char *g_strdup_printf(const char *format, ...);
char *g_strdup_vprintf(const char *format, va_list args);

#endif /* GEGL_WASM_MEMORY_H */