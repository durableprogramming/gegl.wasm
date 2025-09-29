/* This file is an image processing operation for GEGL
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

property_object (buffer, _("Buffer"), GEGL_TYPE_BUFFER)
    description (_("The buffer to load"))

#else

#define GEGL_OP_FILTER
#define GEGL_OP_NAME     load
#define GEGL_OP_C_SOURCE load.c

#include "gegl-op.h"

static void
prepare (GeglOperation *operation)
{
  GeglBuffer *buffer;
  g_object_get (operation, "buffer", &buffer, NULL);

  if (buffer)
    {
      gegl_operation_set_format (operation, "output", gegl_buffer_get_format (buffer));
      g_object_unref (buffer);
    }
  else
    gegl_operation_set_format (operation, "output", babl_format ("RGBA float"));
}

static GeglRectangle
get_bounding_box (GeglOperation *operation)
{
  GeglBuffer *buffer;
  g_object_get (operation, "buffer", &buffer, NULL);

  if (buffer)
    {
      GeglRectangle rect = *gegl_buffer_get_extent (buffer);
      g_object_unref (buffer);
      return rect;
    }

  return *GEGL_RECTANGLE (0, 0, 0, 0);
}

static gboolean
process (GeglOperation       *operation,
         GeglBuffer          *input,
         GeglBuffer          *output,
         const GeglRectangle *roi,
         gint                 level)
{
  GeglBuffer *buffer;
  g_object_get (operation, "buffer", &buffer, NULL);

  if (buffer)
    {
      gegl_buffer_copy (buffer, roi, GEGL_ABYSS_NONE, output, roi);
      g_object_unref (buffer);
    }

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
  operation_class->get_bounding_box = get_bounding_box;

  filter_class->process = process;

  gegl_operation_class_set_keys (operation_class,
    "name"       , "gegl:load",
    "title",       "Load Buffer",
    "categories" , "meta:input",
     "description",
            _("Load a buffer from memory."),
    NULL);
}

#endif
