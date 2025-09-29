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

#include "config.h"

#include <glib-object.h>

#include "gegl.h"
#include "gegl-types.h"
#include "gegl-buffer.h"
#include "gegl-node.h"
#include "process/gegl-processor.h"

#include "wasm-progressive.h"

#ifdef EMSCRIPTEN
#include <emscripten.h>
#endif

struct _GeglWasmProgressive
{
  GeglProcessor *processor;
  guint yield_interval;
  guint work_count;
};

GeglWasmProgressive *
gegl_wasm_progressive_new (GeglNode            *node,
                           const GeglRectangle *rectangle)
{
  GeglWasmProgressive *progressive;

  g_return_val_if_fail (GEGL_IS_NODE (node), NULL);

  progressive = g_new0 (GeglWasmProgressive, 1);
  progressive->processor = gegl_node_new_processor (node, rectangle);
  progressive->yield_interval = 1; /* Yield after every work iteration */
  progressive->work_count = 0;

  return progressive;
}

void
gegl_wasm_progressive_free (GeglWasmProgressive *progressive)
{
  g_return_if_fail (progressive != NULL);

  if (progressive->processor)
    g_object_unref (progressive->processor);

  g_free (progressive);
}

gboolean
gegl_wasm_progressive_work (GeglWasmProgressive *progressive,
                            gdouble             *progress)
{
  gboolean has_more_work;

  g_return_val_if_fail (progressive != NULL, FALSE);
  g_return_val_if_fail (progressive->processor != NULL, FALSE);

  has_more_work = gegl_processor_work (progressive->processor, progress);

  progressive->work_count++;

  /* Yield control back to the browser event loop periodically */
  if (progressive->work_count % progressive->yield_interval == 0)
    {
#ifdef EMSCRIPTEN
      emscripten_sleep (0);
#endif
    }

  return has_more_work;
}

GeglBuffer *
gegl_wasm_progressive_get_buffer (GeglWasmProgressive *progressive)
{
  g_return_val_if_fail (progressive != NULL, NULL);
  g_return_val_if_fail (progressive->processor != NULL, NULL);

  return gegl_processor_get_buffer (progressive->processor);
}

void
gegl_wasm_progressive_set_yield_interval (GeglWasmProgressive *progressive,
                                          guint                interval)
{
  g_return_if_fail (progressive != NULL);

  progressive->yield_interval = MAX (1, interval);
}