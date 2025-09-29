gegl_wasm_common_sources = files(
  'brightness-contrast-wasm.c',
  'gaussian-blur-wasm.c',
  'box-blur-wasm.c',
  'color-adjust-wasm.c',
  'saturation-wasm.c',
  'invert-wasm.c',
  'posterize-wasm.c',
  'buffer-source-wasm.c',
  'buffer-sink-wasm.c',
)

gegl_wasm_common_sources += custom_target('module_wasm_common.c',
  input : gegl_wasm_common_sources,
  output: 'module_wasm_common.c',
  command: [ gen_loader, '@INPUT@', ],
  capture: true
)

gegl_wasm_common = static_library('gegl-wasm-common',
  gegl_wasm_common_sources,
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

gegl_operations += gegl_wasm_common