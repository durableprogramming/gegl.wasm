{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/basics/
  env.GREET = "GEGL WASM Development Environment";

  # Enable languages
  languages = {
    # Node.js for JavaScript tooling and tests
    javascript = {
      enable = true;
      package = pkgs.nodejs_20;
    };

    # Python for build scripts and tools
    python.enable = true;

    # Ruby for performance scripts and tools
    ruby.enable = true;
  };

  # https://devenv.sh/packages/
  packages = [
    # Version control
    pkgs.git

    # Build system
    pkgs.meson
    pkgs.ninja
    pkgs.pkg-config

    # Compilers
    pkgs.gcc
    pkgs.clang

    # Emscripten for WebAssembly compilation
    pkgs.emscripten

    # Core GEGL dependencies
    pkgs.glib
    pkgs.babl
    pkgs.json-glib
    pkgs.libjpeg
    pkgs.libpng
    # Note: poly2tri-c and libnsgif are built from subprojects in the GEGL build

    # Optional dependencies for extended functionality
    pkgs.gobject-introspection
    pkgs.vala
    pkgs.gexiv2
    pkgs.lua5_3
    pkgs.gdk-pixbuf
    pkgs.cairo
    pkgs.pango
    # Note: pangocairo is part of pango in nixpkgs
    pkgs.jasper
    pkgs.lcms2
    pkgs.lensfun
    pkgs.libraw
    pkgs.librsvg
     pkgs.libspiro
     pkgs.libtiff
     pkgs.libwebp
     pkgs.openexr
     pkgs.poppler
     pkgs.SDL
     pkgs.SDL2
     pkgs.ffmpeg
     pkgs.libv4l  # video4linux support

    # Documentation tools
    pkgs.asciidoc
    pkgs.graphviz  # provides dot
    pkgs.gtk-doc
    pkgs.gi-docgen
    pkgs.gettext  # for internationalization
    # Note: sourceHighlight and w3m may not be available in all nixpkgs versions

    # Development tools
    pkgs.gdb
    pkgs.valgrind
    pkgs.clang-tools
    pkgs.cmake
    pkgs.autoconf
    pkgs.automake
    pkgs.libtool
    pkgs.shellcheck  # shell script linting

    # Testing and quality
    (pkgs.python3.withPackages (ps: [
      ps.pygobject3
      ps.numpy
      ps.pillow
    ]))
    (pkgs.ruby.withPackages (ps: [
      ps.cairo
    ]))

    # Utilities
    pkgs.which
    pkgs.file
    pkgs.tree
    pkgs.htop
    pkgs.tmux
    pkgs.neovim
    pkgs.jq
    pkgs.yq
    pkgs.httpie
    pkgs.ripgrep  # fast text search
    pkgs.fd        # fast file finder
    pkgs.bat       # cat with syntax highlighting
  ];

  # Environment variables
  env = {
    # Emscripten setup
    EMSDK = "${pkgs.emscripten}/share/emscripten";
    EM_CACHE = "${config.env.DEVENV_STATE}/emscripten/cache";
    EM_CONFIG = "${config.env.DEVENV_STATE}/emscripten/config";

    # Python path for pygobject
    PYTHONPATH = "${pkgs.python3Packages.pygobject3}/${pkgs.python3.sitePackages}";

    # Library paths
    PKG_CONFIG_PATH = lib.concatStringsSep ":" [
      "${pkgs.glib.dev}/lib/pkgconfig"
      "${pkgs.babl.dev}/lib/pkgconfig"
      "${pkgs.json-glib.dev}/lib/pkgconfig"
      "${pkgs.libjpeg.dev}/lib/pkgconfig"
      "${pkgs.libpng.dev}/lib/pkgconfig"
    ];

    # GEGL specific
    GEGL_PREFIX = "${config.env.DEVENV_STATE}/gegl-install";
  };

  # https://devenv.sh/scripts/
  scripts = {
    hello.exec = ''
      echo "🚀 Welcome to $GREET"
      echo "📦 Available tools:"
      echo "  - meson: $(meson --version)"
      echo "  - ninja: $(ninja --version)"
      echo "  - emcc: $(emcc --version 2>/dev/null || echo 'not found')"
      echo "  - node: $(node --version)"
      echo "  - python: $(python --version)"
      echo "  - ruby: $(ruby --version)"
    '';

    # Build scripts
    build-native.exec = ''
      echo "🏗️  Building GEGL for native platform..."
      mkdir -p build-native
      cd build-native
      meson setup .. \
        --buildtype=debugoptimized \
        --prefix=$GEGL_PREFIX \
        -Ddocs=false \
        -Dintrospection=true \
        -Dg-ir=true \
        -Dvapigen=true
      ninja
    '';

    build-wasm.exec = ''
      echo "🌐 Building GEGL for WebAssembly..."
      ./build-wasm.sh prod
    '';

    build-js.exec = ''
      echo "📦 Building JavaScript distribution..."
      npm run build
      npm run build:dist
    '';

     test.exec = ''
       echo "🧪 Running tests..."
       npm test
     '';

     perf-report.exec = ''
       echo "📊 Generating performance report..."
       cd perf
       ruby create-report.rb
     '';

    clean.exec = ''
      echo "🧹 Cleaning build artifacts..."
      rm -rf build-*
      rm -rf dist
      rm -rf cdn
      npm run clean
    '';

    setup-emscripten.exec = ''
      echo "🔧 Setting up Emscripten..."
      mkdir -p $EM_CACHE
      emcc --check
    '';
  };

  enterShell = ''
    hello

    # Create necessary directories
    mkdir -p $EM_CACHE
    mkdir -p $GEGL_PREFIX

    # Check if emscripten is properly set up
    if command -v emcc &> /dev/null; then
      echo "✅ Emscripten is available"
    else
      echo "⚠️  Emscripten not found. Run 'setup-emscripten' to configure it."
    fi

    # Check Node.js setup
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
      echo "✅ Node.js and npm are available"
    else
      echo "⚠️  Node.js/npm not found"
    fi

    # Check Ruby setup
    if command -v ruby &> /dev/null; then
      echo "✅ Ruby is available"
    else
      echo "⚠️  Ruby not found"
    fi

    echo ""
    echo "📋 Available commands:"
    echo "  build-native    - Build GEGL for native platform"
    echo "  build-wasm      - Build GEGL for WebAssembly"
    echo "  build-js        - Build JavaScript distribution"
    echo "  test           - Run tests"
    echo "  perf-report    - Generate performance report"
    echo "  clean          - Clean build artifacts"
    echo "  setup-emscripten - Configure Emscripten"
    echo ""
  '';

  # https://devenv.sh/tasks/
  tasks = {
    "setup".exec = "npm install";
    "devenv:enterShell".after = [ "setup" ];
  };

  # https://devenv.sh/tests/
  enterTest = ''
    echo "🧪 Running devenv tests..."

    # Test basic tools
    echo "Testing git..."
    git --version

    echo "Testing meson..."
    meson --version

    echo "Testing ninja..."
    ninja --version

    echo "Testing node..."
    node --version

    echo "Testing npm..."
    npm --version

     echo "Testing python..."
     python --version

     echo "Testing ruby..."
     ruby --version

     # Test emscripten (if available)
    if command -v emcc &> /dev/null; then
      echo "Testing emscripten..."
      emcc --version
    else
      echo "Emscripten not available - skipping test"
    fi

    echo "✅ All basic tools are working!"
  '';

  # https://devenv.sh/git-hooks/
  git-hooks.hooks = {
    # Code quality
    shellcheck.enable = true;
    shfmt.enable = true;

    # Pre-commit checks
    pre-commit = {
      enable = true;
      entry = "pre-commit";
      pass_filenames = false;
    };
  };

  # Pre-commit hooks are now part of git-hooks
  # Code quality hooks are configured above in git-hooks.hooks

  # See full reference at https://devenv.sh/reference/options/
}
