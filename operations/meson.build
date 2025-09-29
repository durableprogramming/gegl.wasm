
gegl_operations_build_dir = meson.current_build_dir()
gegl_operations = []

gen_loader = find_program('../tools/gen-loader.py')

if config.get('GEGL_WASM_BUILD', 0) != 0
  if get_option('wasm-core')
    subdir('core')
  endif
  if get_option('wasm-filters')
    subdir('common-gpl3+')
    subdir('common-cxx')
    subdir('common')
  endif
  if get_option('wasm-compositing')
    subdir('generated')
  endif
  if get_option('wasm-transforms')
    subdir('transform')
  endif
  if get_option('wasm-io')
    subdir('external')
  endif
  if get_option('wasm-workshop')
    subdir('workshop')
  endif
  subdir('wasm')
  subdir('wasm-common')
else
  subdir('common-gpl3+')
  subdir('common-cxx')
  subdir('common')
  subdir('core')
  subdir('external')
  subdir('generated')
  subdir('json')
  subdir('seamless-clone')
  subdir('transform')
  if get_option('workshop')
    subdir('workshop')
  endif
endif
