#ifndef GEGL_WASM_THREADING_H
#define GEGL_WASM_THREADING_H

typedef struct _GThread GThread;

typedef void *gpointer;
typedef char gchar;
typedef gpointer (*GThreadFunc)(gpointer data);

typedef struct {
    GThreadFunc func;
    gpointer data;
} WasmThread;

GThread *g_thread_new(const gchar *name, GThreadFunc func, gpointer data);
gpointer g_thread_join(GThread *thread);
GThread *g_thread_self(void);

#endif /* GEGL_WASM_THREADING_H */