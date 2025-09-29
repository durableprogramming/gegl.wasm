#include "wasm-threading.h"
#include "config.h"
#include "wasm-threading.h"
#include <stdlib.h>

static GThread *main_thread = (GThread *)0x1;  // Dummy pointer for main thread

GThread *g_thread_new(const gchar *name, GThreadFunc func, gpointer data) {
    (void)name;  // Unused in this implementation
    // For WASM, we don't support threading, so store the function and data for later execution
    WasmThread *thread = malloc(sizeof(WasmThread));
    if (thread) {
        thread->func = func;
        thread->data = data;
    }
    return (GThread *)thread;
}

gpointer g_thread_join(GThread *thread) {
    if (thread) {
        WasmThread *wasm_thread = (WasmThread *)thread;
        gpointer result = wasm_thread->func(wasm_thread->data);
        free(wasm_thread);
        return result;
    }
    return NULL;
}

GThread *g_thread_self(void) {
    // Return a dummy pointer representing the "current thread"
    return main_thread;
}