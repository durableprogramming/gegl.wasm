/* This file is part of GEGL.
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

#ifndef __GEGL_WASM_CONFIG_H__
#define __GEGL_WASM_CONFIG_H__

/* WebAssembly-specific preprocessor macros and feature toggles */

/* Platform identification */
#define GEGL_PLATFORM_WASM 1
#define __wasm__ 1

/* Feature toggles for WebAssembly builds */

/* Threading support - disabled for WASM */
#define GEGL_WASM_NO_THREADS 1

/* OpenCL support - disabled for WASM */
#define GEGL_WASM_NO_OPENCL 1

/* GUI components - disabled for WASM */
#define GEGL_WASM_NO_GUI 1

/* File I/O - limited in WASM environment */
#define GEGL_WASM_LIMITED_IO 1

/* Memory management - custom implementation for WASM */
#define GEGL_WASM_CUSTOM_MEMORY 1

/* Network operations - disabled for WASM */
#define GEGL_WASM_NO_NETWORK 1

/* System calls - limited in WASM */
#define GEGL_WASM_NO_SYSCALLS 1

/* External libraries disabled for WASM builds */
#define GEGL_WASM_NO_GEXIV2 1
#define GEGL_WASM_NO_LUA 1
#define GEGL_WASM_NO_MRG 1
#define GEGL_WASM_NO_GDK_PIXBUF 1
#define GEGL_WASM_NO_CAIRO 1
#define GEGL_WASM_NO_PANGO 1
#define GEGL_WASM_NO_JASPER 1
#define GEGL_WASM_NO_LCMS 1
#define GEGL_WASM_NO_LENSFUN 1
#define GEGL_WASM_NO_LIBRAW 1
#define GEGL_WASM_NO_LIBRSVG 1
#define GEGL_WASM_NO_LIBSPIRO 1
#define GEGL_WASM_NO_LIBTIFF 1
#define GEGL_WASM_NO_LIBV4L 1
#define GEGL_WASM_NO_LIBWEBP 1
#define GEGL_WASM_NO_MAXFLOW 1
#define GEGL_WASM_NO_OPENEXR 1
#define GEGL_WASM_NO_OPENMP 1
#define GEGL_WASM_NO_POPPLER 1
#define GEGL_WASM_NO_SDL 1
#define GEGL_WASM_NO_AVLIBS 1
#define GEGL_WASM_NO_UMFPACK 1

/* Introspection disabled for WASM */
#define GEGL_WASM_NO_INTROSPECTION 1
#define GEGL_WASM_NO_VAPIGEN 1

/* Documentation disabled for WASM */
#define GEGL_WASM_NO_DOCS 1

/* Tests disabled for WASM */
#define GEGL_WASM_NO_TESTS 1

/* Tools disabled for WASM */
#define GEGL_WASM_NO_TOOLS 1

/* Examples disabled for WASM */
#define GEGL_WASM_NO_EXAMPLES 1

/* Performance monitoring disabled for WASM */
#define GEGL_WASM_NO_PERF 1

/* Translation files disabled for WASM */
#define GEGL_WASM_NO_I18N 1

#endif /* __GEGL_WASM_CONFIG_H__ */