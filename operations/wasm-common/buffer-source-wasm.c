/* This file is a WebAssembly buffer source operation for GEGL
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

#define GEGL_OP_SOURCE
#define GEGL_OP_NAME     buffer_source
#define GEGL_OP_C_FILE "buffer-source-wasm.c"

#include "gegl-op.h"

typedef struct
{
  GeglBuffer *buffer;
} Priv;

static Priv *
get_priv (GeglProperties *o)
{
  Priv *priv = o->user_data;

  if (! priv)
    {
      priv = g_new0 (Priv, 1);
      o->user_data = priv;
    }

  return priv;
}

static void
prepare (GeglOperation *operation)
{
  const Babl *format = babl_format ("RGBA u8");
  gegl_operation_set_format (operation, "output", format);
}

static GeglRectangle
get_bounding_box (GeglOperation *operation)
{
  // Hardcode for now
  GeglRectangle result = {0, 0, 100, 100};
  return result;
}

static void
my_set_property (GObject      *object,
                 guint         property_id,
                 const GValue *value,
                 GParamSpec   *pspec)
{
  // No properties, do nothing
}

static gboolean
process (GeglOperation        *operation,
         GeglOperationContext *context,
         const gchar          *output_pad,
         const GeglRectangle  *result,
         gint                  level)
{
  GeglProperties *o = GEGL_PROPERTIES (operation);
  Priv           *p = get_priv (o);

  if (p->buffer)
    {
      gegl_operation_context_take_object (context, "output",
                                         g_object_ref (p->buffer));
      return TRUE;
    }

  return FALSE;
}

static void
dispose (GObject *object)
{
  GeglProperties *o = GEGL_PROPERTIES (object);
  Priv           *p = get_priv (o);

  if (p->buffer)
    {
      g_object_unref (p->buffer);
      p->buffer = NULL;
    }

  if (p)
    {
      g_free (p);
      o->user_data = NULL;
    }

  G_OBJECT_CLASS (gegl_op_parent_class)->dispose (object);
}

static void
gegl_op_class_init (GeglOpClass *klass)
{
  GObjectClass       *object_class    = G_OBJECT_CLASS (klass);
  GeglOperationClass *operation_class = GEGL_OPERATION_CLASS (klass);

  object_class->set_property = my_set_property;
  object_class->dispose      = dispose;

  operation_class->prepare          = prepare;
  operation_class->process          = process;
  operation_class->get_bounding_box = get_bounding_box;

  gegl_operation_class_set_keys (operation_class,
      "name",        "gegl:buffer-source-wasm",
      "title",       _("Buffer Source (WebAssembly)"),
      "categories",  "programming:input",
      "description", _("Create a GeglBuffer from JavaScript TypedArray or Canvas ImageData for WebAssembly processing."),
      NULL);

  operation_class->cache_policy = GEGL_CACHE_POLICY_NEVER;
}