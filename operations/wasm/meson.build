gegl_wasm_sources = files(
  # Basic arithmetic operations
  '../generated/add.c',
  '../generated/multiply.c',
  '../generated/subtract.c',
  '../generated/divide.c',

  # Basic buffer operations
  '../common/gegl-buffer-load-op.c',
  '../common/gegl-buffer-save-op.c',
  '../common/open-buffer.c',
  '../common/write-buffer.c',

  # Core operations
  '../core/clone.c',
  '../core/load.c',
  '../core/nop.c',
)

gegl_wasm_sources += custom_target('module_wasm.c',
  input : gegl_wasm_sources,
  output: 'module_wasm.c',
  command: [ gen_loader, '@INPUT@', ],
  capture: true
)

gegl_wasm = static_library('gegl-wasm',
  gegl_wasm_sources,
  include_directories: [ rootInclude, geglInclude, ],
  dependencies: [
    babl,
    glib,
    json_glib,
    math,
  ],
  c_args: [
    '-DGEGL_OP_BUNDLE',
  ],
  name_prefix: '',
)

gegl_operations += gegl_wasm