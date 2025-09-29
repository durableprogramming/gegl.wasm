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
 * Copyright 2024 GEGL contributors
 */

#ifndef __GEGL_WASM_PROGRESSIVE_H__
#define __GEGL_WASM_PROGRESSIVE_H__

#include <glib-object.h>
#include <gegl-types.h>
#include <gegl-buffer.h>
#include <gegl-node.h>

G_BEGIN_DECLS

/***
 * GeglWasmProgressive:
 *
 * A progressive processor for WebAssembly environments that yields control
 * back to the browser event loop during processing to maintain responsiveness.
 *
 */
typedef struct _GeglWasmProgressive GeglWasmProgressive;

/**
 * gegl_wasm_progressive_new:
 * @node: a #GeglNode to process
 * @rectangle: the #GeglRectangle to work on or NULL to work on all available data
 *
 * Creates a new progressive processor for the given node and rectangle.
 *
 * Return value: (transfer full): a new #GeglWasmProgressive
 */
GeglWasmProgressive *gegl_wasm_progressive_new      (GeglNode            *node,
                                                     const GeglRectangle *rectangle);

/**
 * gegl_wasm_progressive_free:
 * @progressive: a #GeglWasmProgressive
 *
 * Frees the progressive processor and associated resources.
 */
void gegl_wasm_progressive_free (GeglWasmProgressive *progressive);

/**
 * gegl_wasm_progressive_work:
 * @progressive: a #GeglWasmProgressive
 * @progress: (out caller-allocates): a location to store the (estimated) percentage complete
 *
 * Performs one iteration of work on the progressive processor and yields control
 * back to the browser event loop.
 *
 * Returns TRUE if there is more work to be done, FALSE if processing is complete.
 */
gboolean gegl_wasm_progressive_work (GeglWasmProgressive *progressive,
                                     gdouble             *progress);

/**
 * gegl_wasm_progressive_get_buffer:
 * @progressive: a #GeglWasmProgressive
 *
 * Returns the buffer being rendered into by the progressive processor.
 *
 * Return value: (transfer full): the #GeglBuffer being rendered into
 */
GeglBuffer *gegl_wasm_progressive_get_buffer (GeglWasmProgressive *progressive);

/**
 * gegl_wasm_progressive_set_yield_interval:
 * @progressive: a #GeglWasmProgressive
 * @interval: the number of work iterations between yields (default: 1)
 *
 * Sets how often the processor yields control back to the browser.
 * A value of 1 yields after every work iteration, higher values yield less frequently.
 */
void gegl_wasm_progressive_set_yield_interval (GeglWasmProgressive *progressive,
                                               guint                interval);

G_END_DECLS

#endif /* __GEGL_WASM_PROGRESSIVE_H__ */