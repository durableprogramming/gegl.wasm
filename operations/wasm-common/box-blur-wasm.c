/* This file is a simplified box blur operation for GEGL WebAssembly
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

property_int (radius, _("Radius"), 4)
   description(_("Radius of square pixel region, (width and height will be radius*2+1)"))
   value_range (0, 100)
   ui_range    (0, 20)

#else

#define GEGL_OP_AREA_FILTER
#define GEGL_OP_NAME     box_blur
#define GEGL_OP_C_FILE "box-blur-wasm.c"

#include "gegl-op.h"

static void
prepare (GeglOperation *operation)
{
  GeglOperationAreaFilter *area = GEGL_OPERATION_AREA_FILTER (operation);
  const Babl *space = gegl_operation_get_source_space (operation, "input");

  gegl_operation_set_format (operation, "input", babl_format_with_space ("RGBA float", space));
  gegl_operation_set_format (operation, "output", babl_format_with_space ("RGBA float", space));

   /* Set filter area based on radius */
   gint radius;
   g_object_get (operation, "radius", &radius, NULL);
   radius = MAX(1, radius);

  area->left = area->right = radius;
  area->top = area->bottom = radius;
}

static gboolean
process (GeglOperation       *op,
         GeglBuffer          *input,
         GeglBuffer          *output,
         const GeglRectangle *result,
         gint                 level)
{
  GeglRectangle rect = *result;
  gint radius;
  g_object_get (op, "radius", &radius, NULL);
  radius = MAX(1, radius);
  gint size = radius * 2 + 1;
  gfloat *kernel;
  gint i, j;
  gfloat value = 1.0f / (size * size);

  /* Create uniform kernel */
  kernel = g_new(gfloat, size * size);
  for (i = 0; i < size * size; i++)
    kernel[i] = value;

  // gegl_buffer_convolve (output, &rect, input, &rect,
  //                    kernel, size, size, 1.0f,
  //                    GEGL_ABYSS_CLAMP);
  gegl_buffer_copy (input, &rect, GEGL_ABYSS_NONE, output, &rect);

  g_free(kernel);

  return TRUE;
}

static void
gegl_op_class_init (GeglOpClass *klass)
{
  GeglOperationClass       *operation_class;
  GeglOperationFilterClass *filter_class;

  operation_class = GEGL_OPERATION_CLASS (klass);
  filter_class    = GEGL_OPERATION_FILTER_CLASS (klass);

  operation_class->prepare = prepare;
  filter_class->process    = process;

  gegl_operation_class_set_keys (operation_class,
    "name",        "gegl:box-blur",
    "title",       _("Box Blur"),
    "categories",  "blur",
    "description", _("Blur resulting from averaging the colors of a square neighborhood."),
    NULL);
}

#endif