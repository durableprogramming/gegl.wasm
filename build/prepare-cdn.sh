#!/bin/bash

# prepare-cdn.sh - Create CDN-ready distribution with proper versioning and integrity hashes
# Usage: ./prepare-cdn.sh [version]
#   version: Optional version override (defaults to package.json version)

set -e

# Get version from package.json or argument
if [[ -n "$1" ]]; then
    VERSION="$1"
else
    VERSION=$(node -p "require('./package.json').version")
fi

echo "Preparing CDN distribution for version $VERSION"

# Check if dist directory exists and has built files
if [[ ! -d "dist" ]]; then
    echo "Error: dist directory not found. Run './build/create-distributions.sh prod' first."
    exit 1
fi

# Create CDN directory structure
CDN_DIR="cdn/v$VERSION"
echo "Creating CDN directory: $CDN_DIR"
mkdir -p "$CDN_DIR"

# Files to include in CDN distribution (minified versions for production)
CDN_FILES=(
    "dist/gegl-wasm.umd.min.js"
    "dist/gegl-wasm.iife.min.js"
)

# Optional files (only if they exist)
OPTIONAL_FILES=(
    "dist/gegl.wasm"
    "dist/gegl.worker.js"
    "dist/gegl-wasm-core.js"
)

# Copy required files
echo "Copying distribution files..."
for file in "${CDN_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        cp "$file" "$CDN_DIR/"
        echo "  Copied $(basename "$file")"
    else
        echo "Warning: Required file $file not found"
    fi
done

# Copy optional files if they exist
for file in "${OPTIONAL_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        cp "$file" "$CDN_DIR/"
        echo "  Copied $(basename "$file")"
    fi
done

# Generate integrity hashes for each file
echo "Generating integrity hashes..."
MANIFEST_FILE="$CDN_DIR/manifest.json"

# Start manifest JSON
cat > "$MANIFEST_FILE" << EOF
{
  "version": "$VERSION",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": {
EOF

# Process each file in CDN directory
FIRST=true
for file in "$CDN_DIR"/*; do
    if [[ -f "$file" && "$file" != "$MANIFEST_FILE" ]]; then
        filename=$(basename "$file")

        # Generate hashes
        sha256=$(openssl dgst -sha256 -binary "$file" | openssl base64 -A)
        sha384=$(openssl dgst -sha384 -binary "$file" | openssl base64 -A)
        sha512=$(openssl dgst -sha512 -binary "$file" | openssl base64 -A)
        size=$(stat -c%s "$file")

        # Add comma for JSON formatting (except first item)
        if [[ "$FIRST" == "true" ]]; then
            FIRST=false
        else
            echo "," >> "$MANIFEST_FILE"
        fi

        # Add file entry to manifest
        cat >> "$MANIFEST_FILE" << EOF
    "$filename": {
      "size": $size,
      "integrity": {
        "sha256": "sha256-$sha256",
        "sha384": "sha384-$sha384",
        "sha512": "sha512-$sha512"
      }
    }
EOF
    fi
done

# Close manifest JSON
cat >> "$MANIFEST_FILE" << EOF
  }
}
EOF

echo "CDN distribution prepared successfully!"
echo "Files are in: $CDN_DIR"
echo "Manifest: $MANIFEST_FILE"
echo ""
echo "CDN-ready files:"
ls -la "$CDN_DIR"