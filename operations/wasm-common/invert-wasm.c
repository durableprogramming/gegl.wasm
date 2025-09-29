/* This file is a simplified invert operation for GEGL WebAssembly
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
 * Copyright 2006 Øyvind Kolås <pippin@gimp.org>
 */

#include "config.h"
#include <glib/gi18n-lib.h>

#ifdef GEGL_PROPERTIES

/* No properties for simple invert */

#else

#define GEGL_OP_POINT_FILTER
#define GEGL_OP_NAME     invert_wasm
#define GEGL_OP_C_SOURCE invert-wasm.c

#include "gegl-op.h"

static void prepare (GeglOperation *operation)
{
  const Babl *space = gegl_operation_get_source_space (operation, "input");
  gegl_operation_set_format (operation, "input", babl_format_with_space ("RGBA float", space));
  gegl_operation_set_format (operation, "output", babl_format_with_space ("RGBA float", space));
}

static gboolean
process (GeglOperation       *op,
         void                *in_buf,
         void                *out_buf,
         glong                n_pixels,
         const GeglRectangle *roi,
         gint                 level)
{
  gfloat     * GEGL_ALIGNED in_pixel;
  gfloat     * GEGL_ALIGNED out_pixel;
  glong       i;

  in_pixel   = in_buf;
  out_pixel  = out_buf;

  /* Optimized loop for WebAssembly - simple invert */
  for (i=0; i<n_pixels; i++)
    {
      out_pixel[0] = 1.0f - in_pixel[0]; /* Invert red */
      out_pixel[1] = 1.0f - in_pixel[1]; /* Invert green */
      out_pixel[2] = 1.0f - in_pixel[2]; /* Invert blue */
      out_pixel[3] = in_pixel[3];        /* Preserve alpha */

      in_pixel  += 4;
      out_pixel += 4;
    }
  return TRUE;
}

static void
gegl_op_class_init (GeglOpClass *klass)
{
  GeglOperationClass            *operation_class;
  GeglOperationPointFilterClass *point_filter_class;

  operation_class    = GEGL_OPERATION_CLASS (klass);
  point_filter_class = GEGL_OPERATION_POINT_FILTER_CLASS (klass);

  operation_class->prepare = prepare;
  point_filter_class->process = process;

  gegl_operation_class_set_keys (operation_class,
      "name",       "gegl:invert-wasm",
      "title",      _("Invert (WebAssembly)"),
      "categories", "color",
      "reference-hash", "b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0",
      "description", _("Simplified color inversion optimized for WebAssembly. Inverts RGB values while preserving alpha."),
      NULL);
}

#endif