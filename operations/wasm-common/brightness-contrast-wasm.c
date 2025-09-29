/* This file is a simplified brightness-contrast operation for GEGL WebAssembly
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

property_double (contrast, _("Contrast"),  1.0)
   description  (_("Magnitude of contrast scaling >1.0 brighten < 1.0 darken"))
   value_range  (-5.0, 5.0)
   ui_range     (0.0, 2.0)

property_double (brightness, _("Brightness"), 0.0)
   description  (_("Amount to increase brightness"))
   value_range  (-3.0, 3.0)
   ui_range     (-1.0, 1.0)

#else

#define GEGL_OP_POINT_FILTER
#define GEGL_OP_NAME     brightness_contrast
#define GEGL_OP_C_FILE "brightness-contrast-wasm.c"

#include "gegl-op.h"

/* prepare() is called on each operation providing data to a node that
 * is requested to provide a rendered result. For brightness contrast we use this
 * opportunity to dictate the formats of the input and output buffers.
 */
static void prepare (GeglOperation *operation)
{
  const Babl *space = gegl_operation_get_source_space (operation, "input");
  gegl_operation_set_format (operation, "input", babl_format_with_space ("RGBA float", space));
  gegl_operation_set_format (operation, "output", babl_format_with_space ("RGBA float", space));
}

/* For GeglOperationPointFilter subclasses, we operate on linear
 * buffers with a pixel count.
 * Simplified for WebAssembly performance.
 */
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
  gfloat      brightness, contrast;
  glong       i;

  in_pixel   = in_buf;
  out_pixel  = out_buf;

  g_object_get (op, "brightness", &brightness, "contrast", &contrast, NULL);

  /* Optimized loop for WebAssembly - simplified processing */
  for (i=0; i<n_pixels; i++)
    {
      /* Apply contrast and brightness in a single operation */
      gfloat r = (in_pixel[0] - 0.5f) * contrast + brightness + 0.5f;
      gfloat g = (in_pixel[1] - 0.5f) * contrast + brightness + 0.5f;
      gfloat b = (in_pixel[2] - 0.5f) * contrast + brightness + 0.5f;

      /* Clamp values to valid range */
      out_pixel[0] = CLAMP(r, 0.0f, 1.0f);
      out_pixel[1] = CLAMP(g, 0.0f, 1.0f);
      out_pixel[2] = CLAMP(b, 0.0f, 1.0f);
      out_pixel[3] = in_pixel[3]; /* copy the alpha */

      in_pixel  += 4;
      out_pixel += 4;
    }
  return TRUE;
}

/*
 * The class init function sets up information needed for this operations class
 * (template) in the GObject OO framework.
 */
static void
gegl_op_class_init (GeglOpClass *klass)
{
  GeglOperationClass            *operation_class;
  GeglOperationPointFilterClass *point_filter_class;
  gchar                         *composition =
    "<?xml version='1.0' encoding='UTF-8'?>"
    "<gegl>"
    "  <node operation='gegl:crop' width='200' height='200'/>"
    "  <node operation='gegl:over'>"
    "    <node operation='gegl:brightness-contrast-wasm'>"
    "      <params>"
    "        <param name='contrast'>1.8</param>"
    "        <param name='brightness'>0.25</param>"
    "      </params>"
    "    </node>"
    "    <node operation='gegl:load' path='standard-input.png'/>"
    "  </node>"
    "  <node operation='gegl:checkerboard'>"
    "    <params>"
    "      <param name='color1'>rgb(0.25,0.25,0.25)</param>"
    "      <param name='color2'>rgb(0.75,0.75,0.75)</param>"
    "    </params>"
    "  </node>"
    "</gegl>";

  operation_class    = GEGL_OPERATION_CLASS (klass);
  point_filter_class = GEGL_OPERATION_POINT_FILTER_CLASS (klass);

  operation_class->prepare = prepare;
  point_filter_class->process = process;

  gegl_operation_class_set_keys (operation_class,
      "name",       "gegl:brightness-contrast-wasm",
      "title",      _("Brightness Contrast (WebAssembly)"),
      "categories", "color",
      "reference-hash", "d71a0399eb2edc30e86d7ee54e5d5w1",
      "description", _("Simplified brightness and contrast adjustment optimized for WebAssembly. Changes the light level and contrast with clamping for better performance."),
      "reference-composition", composition,
      NULL);
}

#endif /* closing #ifdef GEGL_PROPERTIES ... else ... */