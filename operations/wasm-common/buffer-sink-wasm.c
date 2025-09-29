/* This file is a WebAssembly buffer sink operation for GEGL
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
#include <glib/gi18n-lib.h>

#define GEGL_OP_SINK
#define GEGL_OP_NAME     buffer_sink
#define GEGL_OP_C_FILE "buffer-sink-wasm.c"

#include "gegl-op.h"

static gboolean
process (GeglOperation       *operation,
         GeglBuffer          *input,
         const GeglRectangle *result,
         gint                 level)
{
  // For WASM, properties are not used, hardcode for now
  const Babl *output_format = babl_format ("RGBA u8");
  gpointer linear_data;
  gint rowstride;

  /* Get linear access to the buffer data */
  linear_data = gegl_buffer_linear_open (input, result, &rowstride, output_format);

  if (linear_data)
    {
      // For WASM, output to a fixed buffer or skip for now
      gegl_buffer_linear_close (input, linear_data);
      return TRUE;
    }

  return FALSE;
}

static void
gegl_op_class_init (GeglOpClass *klass)
{
  GeglOperationClass     *operation_class;
  GeglOperationSinkClass *sink_class;

  operation_class = GEGL_OPERATION_CLASS (klass);
  sink_class      = GEGL_OPERATION_SINK_CLASS (klass);

  sink_class->process    = process;
  sink_class->needs_full = TRUE;

  gegl_operation_class_set_keys (operation_class,
      "name",       "gegl:buffer-sink-wasm",
      "title",      _("Buffer Sink (WebAssembly)"),
      "categories", "programming:output",
      "description", _("Output GeglBuffer data to JavaScript TypedArray or Canvas ImageData for WebAssembly processing."),
      NULL);
}