/* This file is a simplified posterize operation for GEGL WebAssembly
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

property_int (levels, _("Levels"), 8)
   description (_("Number of levels per channel"))
   value_range (2, 256)

#else

#define GEGL_OP_POINT_FILTER
#define GEGL_OP_NAME     posterize
#define GEGL_OP_C_SOURCE posterize-wasm.c

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
  GeglProperties *o = GEGL_PROPERTIES (op);
  gfloat     * GEGL_ALIGNED in_pixel;
  gfloat     * GEGL_ALIGNED out_pixel;
  gfloat      levels_minus_one;
  glong       i;

  in_pixel   = in_buf;
  out_pixel  = out_buf;

  g_object_get (op, "levels", &levels_minus_one, NULL);
  levels_minus_one = (gfloat)levels_minus_one - 1.0f;

  /* Optimized loop for WebAssembly - simple posterize */
  for (i=0; i<n_pixels; i++)
    {
      /* Posterize each channel */
      out_pixel[0] = floorf(in_pixel[0] * levels_minus_one + 0.5f) / levels_minus_one;
      out_pixel[1] = floorf(in_pixel[1] * levels_minus_one + 0.5f) / levels_minus_one;
      out_pixel[2] = floorf(in_pixel[2] * levels_minus_one + 0.5f) / levels_minus_one;
      out_pixel[3] = in_pixel[3]; /* Preserve alpha */

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
      "name",       "gegl:posterize-wasm",
      "title",      _("Posterize (WebAssembly)"),
      "categories", "color",
      "reference-hash", "c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3",
      "description", _("Simplified posterization optimized for WebAssembly. Reduces the number of colors by quantizing each channel."),
      NULL);
}

#endif