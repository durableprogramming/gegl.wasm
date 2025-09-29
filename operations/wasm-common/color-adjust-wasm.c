/* This file is a simplified color adjustment operation for GEGL WebAssembly
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
 * Copyright 2017 Elle Stone <ellestone@ninedegreesbelow.com>
 */

#include "config.h"
#include <glib/gi18n-lib.h>

#ifdef GEGL_PROPERTIES

property_double (hue, _("Hue"), 0.0)
   description (_("Hue adjustment in degrees"))
   value_range (-180.0, 180.0)

property_double (saturation, _("Saturation"), 1.0)
   description (_("Saturation multiplier"))
   value_range (0.0, 2.0)

property_double (lightness, _("Lightness"), 0.0)
   description (_("Lightness adjustment"))
   value_range (-1.0, 1.0)

#else

#define GEGL_OP_POINT_FILTER
#define GEGL_OP_NAME     color_adjust_wasm
#define GEGL_OP_C_FILE "color-adjust-wasm.c"

#include "gegl-op.h"

static void
prepare (GeglOperation *operation)
{
  const Babl *space = gegl_operation_get_source_space (operation, "input");
  gegl_operation_set_format (operation, "input",
                    babl_format_with_space ("RGBA float", space));
  gegl_operation_set_format (operation, "output",
                    babl_format_with_space ("RGBA float", space));
}

static gboolean
process (GeglOperation       *op,
         void                *in_buf,
         void                *out_buf,
         glong                n_pixels,
         const GeglRectangle *roi,
         gint                 level)
{
  gfloat         *GEGL_ALIGNED in_pixel;
  gfloat         *GEGL_ALIGNED out_pixel;
  gfloat          hue_shift, saturation_scale, lightness_offset;

  in_pixel   = in_buf;
  out_pixel  = out_buf;

  g_object_get (op, "hue", &hue_shift, "saturation", &saturation_scale, "lightness", &lightness_offset, NULL);
  hue_shift       *= M_PI / 180.0; /* Convert to radians */

  while (n_pixels--)
    {
      gfloat r = in_pixel[0];
      gfloat g = in_pixel[1];
      gfloat b = in_pixel[2];
      gfloat a = in_pixel[3];

      /* Convert RGB to HSL for easier manipulation */
      gfloat max = MAX(MAX(r, g), b);
      gfloat min = MIN(MIN(r, g), b);
      gfloat delta = max - min;

      gfloat lightness = (max + min) / 2.0f;
      gfloat saturation = 0.0f;
      gfloat hue = 0.0f;

      if (delta > 0.0001f)
        {
          saturation = (lightness > 0.5f) ?
                      (delta / (2.0f - max - min)) :
                      (delta / (max + min));

          if (max == r)
            hue = (g - b) / delta + (g < b ? 6.0f : 0.0f);
          else if (max == g)
            hue = (b - r) / delta + 2.0f;
          else
            hue = (r - g) / delta + 4.0f;

          hue /= 6.0f;
        }

      /* Apply adjustments */
      hue = fmodf(hue + hue_shift / (2.0f * M_PI), 1.0f);
      saturation = CLAMP(saturation * saturation_scale, 0.0f, 1.0f);
      lightness = CLAMP(lightness + lightness_offset, 0.0f, 1.0f);

      /* Convert back to RGB */
      if (saturation < 0.0001f)
        {
          /* Achromatic case */
          out_pixel[0] = out_pixel[1] = out_pixel[2] = lightness;
        }
      else
        {
          gfloat q = lightness < 0.5f ?
                    (lightness * (1.0f + saturation)) :
                    (lightness + saturation - lightness * saturation);
          gfloat p = 2.0f * lightness - q;

          gfloat t[3];
          t[0] = hue + 1.0f/3.0f; /* Red */
          t[1] = hue;             /* Green */
          t[2] = hue - 1.0f/3.0f; /* Blue */

          for (int i = 0; i < 3; i++)
            {
              if (t[i] < 0.0f) t[i] += 1.0f;
              if (t[i] > 1.0f) t[i] -= 1.0f;

              if (t[i] < 1.0f/6.0f)
                out_pixel[i] = p + (q - p) * 6.0f * t[i];
              else if (t[i] < 1.0f/2.0f)
                out_pixel[i] = q;
              else if (t[i] < 2.0f/3.0f)
                out_pixel[i] = p + (q - p) * (2.0f/3.0f - t[i]) * 6.0f;
              else
                out_pixel[i] = p;
            }
        }

      /* Clamp final RGB values */
      out_pixel[0] = CLAMP(out_pixel[0], 0.0f, 1.0f);
      out_pixel[1] = CLAMP(out_pixel[1], 0.0f, 1.0f);
      out_pixel[2] = CLAMP(out_pixel[2], 0.0f, 1.0f);
      out_pixel[3] = a; /* Preserve alpha */

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

  operation_class->prepare    = prepare;
  point_filter_class->process = process;

  gegl_operation_class_set_keys (operation_class,
      "name",           "gegl:color-adjust-wasm",
      "title",          _("Color Adjust (WebAssembly)"),
      "categories",     "color",
      "reference-hash", "ffb9e86edb25bc92e8d4e68f59bbb04w1",
      "description",    _("Simplified HSL color adjustment optimized for WebAssembly. Adjust hue, saturation, and lightness in one operation."),
      NULL);
}

#endif