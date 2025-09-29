#include "wasm-memory.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdarg.h>

void *g_malloc(size_t n_bytes) {
    return malloc(n_bytes);
}

void *g_malloc0(size_t n_bytes) {
    return calloc(1, n_bytes);
}

void *g_realloc(void *mem, size_t n_bytes) {
    return realloc(mem, n_bytes);
}

void g_free(void *mem) {
    free(mem);
}

void g_slice_free1(size_t block_size, void *mem) {
    (void)block_size;  // Unused in this implementation
    g_free(mem);
}

void *g_memdup(const void *mem, size_t byte_size) {
    void *dup = g_malloc(byte_size);
    if (dup) {
        memcpy(dup, mem, byte_size);
    }
    return dup;
}

void *g_memdup2(const void *mem, size_t byte_size) {
    return g_memdup(mem, byte_size);
}

char *g_strdup(const char *str) {
    if (!str) return NULL;
    size_t len = strlen(str) + 1;
    char *dup = g_malloc(len);
    if (dup) {
        memcpy(dup, str, len);
    }
    return dup;
}

char *g_strndup(const char *str, size_t n) {
    if (!str) return NULL;
    size_t len = strlen(str);
    if (len > n) len = n;
    char *dup = g_malloc(len + 1);
    if (dup) {
        memcpy(dup, str, len);
        dup[len] = '\0';
    }
    return dup;
}

char *g_strdup_vprintf(const char *format, va_list args) {
    va_list args_copy;
    va_copy(args_copy, args);
    int len = vsnprintf(NULL, 0, format, args_copy);
    va_end(args_copy);
    if (len < 0) return NULL;
    char *str = g_malloc(len + 1);
    if (str) {
        vsnprintf(str, len + 1, format, args);
    }
    return str;
}

char *g_strdup_printf(const char *format, ...) {
    va_list args;
    va_start(args, format);
    char *str = g_strdup_vprintf(format, args);
    va_end(args);
    return str;
}