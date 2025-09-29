/* This file is a simplified saturation operation for GEGL WebAssembly
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

property_double (scale, _("Scale"), 1.0)
   description (_("Multiplier for saturation"))
   value_range (0.0, 2.0)

#else

#define GEGL_OP_POINT_FILTER
#define GEGL_OP_NAME     saturation_wasm
#define GEGL_OP_C_SOURCE saturation-wasm.c

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
  gfloat      saturation_scale;
  glong       i;

  in_pixel   = in_buf;
  out_pixel  = out_buf;

  g_object_get (op, "scale", &saturation_scale, NULL);

  /* Optimized loop for WebAssembly - simplified saturation */
  for (i=0; i<n_pixels; i++)
    {
      gfloat r = in_pixel[0];
      gfloat g = in_pixel[1];
      gfloat b = in_pixel[2];
      gfloat a = in_pixel[3];

      /* Convert to HSL and adjust saturation */
      gfloat max = MAX(MAX(r, g), b);
      gfloat min = MIN(MIN(r, g), b);
      gfloat lightness = (max + min) / 2.0f;
      gfloat saturation = 0.0f;

      if (max > min)
        {
          gfloat delta = max - min;
          saturation = (lightness > 0.5f) ?
                      (delta / (2.0f - max - min)) :
                      (delta / (max + min));
        }

      /* Apply saturation scaling */
      saturation = CLAMP(saturation * saturation_scale, 0.0f, 1.0f);

      /* Convert back to RGB */
      if (saturation < 0.001f)
        {
          /* Grayscale */
          out_pixel[0] = out_pixel[1] = out_pixel[2] = lightness;
        }
      else
        {
          gfloat q = lightness < 0.5f ?
                    (lightness * (1.0f + saturation)) :
                    (lightness + saturation - lightness * saturation);
          gfloat p = 2.0f * lightness - q;

          /* Use original hue */
          gfloat h;
          if (max == r)
            h = (g - b) / (max - min) / 6.0f;
          else if (max == g)
            h = (2.0f + (b - r) / (max - min)) / 6.0f;
          else
            h = (4.0f + (r - g) / (max - min)) / 6.0f;

          if (h < 0.0f) h += 1.0f;

          gfloat t[3];
          t[0] = h + 1.0f/3.0f;
          t[1] = h;
          t[2] = h - 1.0f/3.0f;

          for (int j = 0; j < 3; j++)
            {
              if (t[j] < 0.0f) t[j] += 1.0f;
              if (t[j] > 1.0f) t[j] -= 1.0f;

              if (t[j] < 1.0f/6.0f)
                out_pixel[j] = p + (q - p) * 6.0f * t[j];
              else if (t[j] < 1.0f/2.0f)
                out_pixel[j] = q;
              else if (t[j] < 2.0f/3.0f)
                out_pixel[j] = p + (q - p) * (2.0f/3.0f - t[j]) * 6.0f;
              else
                out_pixel[j] = p;
            }
        }

      out_pixel[3] = a; /* copy alpha */

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
      "name",       "gegl:saturation-wasm",
      "title",      _("Saturation (WebAssembly)"),
      "categories", "color",
      "reference-hash", "a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7",
      "description", _("Simplified saturation adjustment optimized for WebAssembly. Multiplies the saturation component of HSL color space."),
      NULL);
}

#endif