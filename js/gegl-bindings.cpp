#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <string>
#include <vector>
#include <memory>

// Include GEGL headers with extern "C" to handle C++ compilation
extern "C" {
#include <gegl.h>
#include <glib.h>
#include "wasm-progressive.h"
}

// C++ wrapper classes for GEGL objects to manage GObject lifecycle

class GeglRectangleWrapper {
public:
    GeglRectangle rect;

    GeglRectangleWrapper() {
        rect.x = 0;
        rect.y = 0;
        rect.width = 0;
        rect.height = 0;
    }

    GeglRectangleWrapper(int x, int y, int width, int height) {
        rect.x = x;
        rect.y = y;
        rect.width = width;
        rect.height = height;
    }

    int getX() const { return rect.x; }
    int getY() const { return rect.y; }
    int getWidth() const { return rect.width; }
    int getHeight() const { return rect.height; }

    void setX(int x) { rect.x = x; }
    void setY(int y) { rect.y = y; }
    void setWidth(int width) { rect.width = width; }
    void setHeight(int height) { rect.height = height; }

    std::string toString() const {
        char buf[128];
        sprintf(buf, "GeglRectangle(%d, %d, %d, %d)", rect.x, rect.y, rect.width, rect.height);
        return std::string(buf);
    }
};

class GeglColorWrapper {
private:
    GeglColor* color;

public:
    GeglColorWrapper() {
        color = gegl_color_new("black");
    }

    GeglColorWrapper(const std::string& color_string) {
        color = gegl_color_new(color_string.c_str());
    }

    ~GeglColorWrapper() {
        if (color) {
            g_object_unref(color);
        }
    }

    void setRgba(float r, float g, float b, float a) {
        gegl_color_set_rgba(color, r, g, b, a);
    }

    emscripten::val getRgba() {
        float r, g, b, a;
        gegl_color_get_rgba(color, &r, &g, &b, &a);
        return emscripten::val::array(std::vector<float>{r, g, b, a});
    }

    void setPixel(const std::string& format_name, const emscripten::val& pixel_data) {
        const Babl* format = babl_format(format_name.c_str());
        std::vector<uint8_t> data = emscripten::vecFromJSArray<uint8_t>(pixel_data);
        gegl_color_set_pixel(color, format, data.data());
    }

    emscripten::val getPixel(const std::string& format_name) {
        const Babl* format = babl_format(format_name.c_str());
        int bytes = babl_format_get_bytes_per_pixel(format);
        std::vector<uint8_t> pixel_data(bytes);
        gegl_color_get_pixel(color, format, pixel_data.data());
        return emscripten::val::array(pixel_data);
    }

    GeglColor* getInternal() { return color; }
};

class GeglBufferWrapper {
private:
    GeglBuffer* buffer;

public:
    GeglBufferWrapper() : buffer(nullptr) {}

    GeglBufferWrapper(const GeglRectangleWrapper& extent, const std::string& format_name) {
        const Babl* format = babl_format(format_name.c_str());
        buffer = gegl_buffer_new(&extent.rect, format);
    }

    GeglBufferWrapper(const std::string& path) {
        buffer = gegl_buffer_open(path.c_str());
    }

    ~GeglBufferWrapper() {
        if (buffer) {
            g_object_unref(buffer);
        }
    }

    void set(const GeglRectangleWrapper& rect, const std::string& format_name,
             const emscripten::val& data, int rowstride = 0) {
        const Babl* format = babl_format(format_name.c_str());
        std::vector<uint8_t> pixel_data = emscripten::vecFromJSArray<uint8_t>(data);
        gegl_buffer_set(buffer, &rect.rect, 0, format, pixel_data.data(), rowstride);
    }

    emscripten::val get(const GeglRectangleWrapper& rect, const std::string& format_name,
                        int rowstride = 0) {
        const Babl* format = babl_format(format_name.c_str());
        int bytes_per_pixel = babl_format_get_bytes_per_pixel(format);
        int width = rect.getWidth();
        int height = rect.getHeight();

        if (rowstride == 0) {
            rowstride = width * bytes_per_pixel;
        }

        std::vector<uint8_t> data(height * rowstride);
        gegl_buffer_get(buffer, &rect.rect, 1.0, format, data.data(), rowstride, GEGL_ABYSS_NONE);
        return emscripten::val::array(data);
    }

    GeglRectangleWrapper getExtent() {
        const GeglRectangle* extent = gegl_buffer_get_extent(buffer);
        return GeglRectangleWrapper(extent->x, extent->y, extent->width, extent->height);
    }

    std::string getFormat() {
        const Babl* format = gegl_buffer_get_format(buffer);
        return std::string(babl_get_name(format));
    }

    void save(const std::string& path, const GeglRectangleWrapper& roi) {
        gegl_buffer_save(buffer, path.c_str(), &roi.rect);
    }

    void flush() {
        gegl_buffer_flush(buffer);
    }

    GeglBuffer* getInternal() { return buffer; }
};

class GeglNodeWrapper {
private:
    GeglNode* node;

public:
    GeglNodeWrapper() : node(nullptr) {}

    GeglNodeWrapper(GeglNode* parent, const std::string& operation) {
        node = gegl_node_new_child(parent, "operation", operation.c_str(), NULL);
    }

    ~GeglNodeWrapper() {
        if (node) {
            g_object_unref(node);
        }
    }

    void setProperty(const std::string& name, const std::string& value) {
        gegl_node_set(node, name.c_str(), value.c_str(), NULL);
    }

    void setProperty(const std::string& name, double value) {
        gegl_node_set(node, name.c_str(), value, NULL);
    }

    void setProperty(const std::string& name, GeglColorWrapper& color) {
        gegl_node_set(node, name.c_str(), color.getInternal(), NULL);
    }

    void connectTo(GeglNodeWrapper& sink, const std::string& input_pad, const std::string& output_pad) {
        gegl_node_connect_to(node, output_pad.c_str(), sink.node, input_pad.c_str());
    }

    void link(GeglNodeWrapper& sink) {
        gegl_node_link(node, sink.node);
    }

    void process() {
        gegl_node_process(node);
    }

    GeglRectangleWrapper getBoundingBox() {
        GeglRectangle bbox = gegl_node_get_bounding_box(node);
        return GeglRectangleWrapper(bbox.x, bbox.y, bbox.width, bbox.height);
    }

    void blitBuffer(GeglBufferWrapper& dst_buffer, const GeglRectangleWrapper& roi, int level = 0) {
        gegl_node_blit_buffer(node, dst_buffer.getInternal(), &roi.rect, level, GEGL_ABYSS_NONE);
    }

    GeglNode* getInternal() { return node; }
};

class GeglProcessorWrapper {
private:
    GeglProcessor* processor;

public:
    GeglProcessorWrapper(GeglNodeWrapper& node, const GeglRectangleWrapper& rectangle) {
        processor = gegl_node_new_processor(node.getInternal(), &rectangle.rect);
    }

    ~GeglProcessorWrapper() {
        if (processor) {
            g_object_unref(processor);
        }
    }

    bool work(emscripten::val progress) {
        double prog;
        bool result = gegl_processor_work(processor, &prog);
        progress.set(0, prog);
        return result;
    }

    GeglBufferWrapper getBuffer() {
        GeglBuffer* buffer = gegl_processor_get_buffer(processor);
        GeglBufferWrapper wrapper;
        // Note: This creates a new wrapper but doesn't take ownership
        // The processor owns the buffer
        wrapper.buffer = buffer;
        g_object_ref(buffer); // Take a reference since wrapper will unref in destructor
        return wrapper;
    }
};

class GeglWasmProgressiveWrapper {
private:
    GeglWasmProgressive* progressive;

public:
    GeglWasmProgressiveWrapper(GeglNodeWrapper& node, const GeglRectangleWrapper* rectangle = nullptr) {
        progressive = gegl_wasm_progressive_new(node.getInternal(), rectangle ? &rectangle->rect : nullptr);
    }

    ~GeglWasmProgressiveWrapper() {
        if (progressive) {
            gegl_wasm_progressive_free(progressive);
        }
    }

    bool work(emscripten::val progress) {
        double prog;
        bool result = gegl_wasm_progressive_work(progressive, &prog);
        progress.set(0, prog);
        return result;
    }

    GeglBufferWrapper getBuffer() {
        GeglBuffer* buffer = gegl_wasm_progressive_get_buffer(progressive);
        GeglBufferWrapper wrapper;
        // Note: This creates a new wrapper but doesn't take ownership
        // The progressive processor owns the buffer
        wrapper.buffer = buffer;
        g_object_ref(buffer); // Take a reference since wrapper will unref in destructor
        return wrapper;
    }

    void setYieldInterval(unsigned int interval) {
        gegl_wasm_progressive_set_yield_interval(progressive, interval);
    }
};

// Global GEGL initialization
static bool gegl_initialized = false;

void initializeGegl() {
    if (!gegl_initialized) {
        gegl_init(NULL, NULL);
        gegl_initialized = true;
    }
}

void cleanupGegl() {
    if (gegl_initialized) {
        gegl_exit();
        gegl_initialized = false;
    }
}

// Utility functions
GeglNodeWrapper* gegl_node_new_graph() {
    GeglNode* node = gegl_node_new();
    return new GeglNodeWrapper(node, "");
}

// EMBIND bindings
EMSCRIPTEN_BINDINGS(gegl_bindings) {
    emscripten::function("initializeGegl", &initializeGegl);
    emscripten::function("cleanupGegl", &cleanupGegl);

    // GeglRectangle wrapper
    emscripten::class_<GeglRectangleWrapper>("GeglRectangle")
        .constructor<>()
        .constructor<int, int, int, int>()
        .property("x", &GeglRectangleWrapper::getX, &GeglRectangleWrapper::setX)
        .property("y", &GeglRectangleWrapper::getY, &GeglRectangleWrapper::setY)
        .property("width", &GeglRectangleWrapper::getWidth, &GeglRectangleWrapper::setWidth)
        .property("height", &GeglRectangleWrapper::getHeight, &GeglRectangleWrapper::setHeight)
        .function("toString", &GeglRectangleWrapper::toString);

    // GeglColor wrapper
    emscripten::class_<GeglColorWrapper>("GeglColor")
        .constructor<>()
        .constructor<std::string>()
        .function("setRgba", &GeglColorWrapper::setRgba)
        .function("getRgba", &GeglColorWrapper::getRgba)
        .function("setPixel", &GeglColorWrapper::setPixel)
        .function("getPixel", &GeglColorWrapper::getPixel);

    // GeglBuffer wrapper
    emscripten::class_<GeglBufferWrapper>("GeglBuffer")
        .constructor<const GeglRectangleWrapper&, std::string>()
        .constructor<std::string>()
        .function("set", &GeglBufferWrapper::set)
        .function("get", &GeglBufferWrapper::get)
        .function("getExtent", &GeglBufferWrapper::getExtent)
        .function("getFormat", &GeglBufferWrapper::getFormat)
        .function("save", &GeglBufferWrapper::save)
        .function("flush", &GeglBufferWrapper::flush);

    // GeglNode wrapper
    emscripten::class_<GeglNodeWrapper>("GeglNode")
        .constructor<GeglNodeWrapper*, std::string>()
        .function("setProperty", emscripten::select_overload<void(const std::string&, const std::string&)>(&GeglNodeWrapper::setProperty))
        .function("setProperty", emscripten::select_overload<void(const std::string&, double)>(&GeglNodeWrapper::setProperty))
        .function("setProperty", emscripten::select_overload<void(const std::string&, GeglColorWrapper&)>(&GeglNodeWrapper::setProperty))
        .function("connectTo", &GeglNodeWrapper::connectTo)
        .function("link", &GeglNodeWrapper::link)
        .function("process", &GeglNodeWrapper::process)
        .function("getBoundingBox", &GeglNodeWrapper::getBoundingBox)
        .function("blitBuffer", &GeglNodeWrapper::blitBuffer);

    // GeglProcessor wrapper
    emscripten::class_<GeglProcessorWrapper>("GeglProcessor")
        .constructor<GeglNodeWrapper&, const GeglRectangleWrapper&>()
        .function("work", &GeglProcessorWrapper::work)
        .function("getBuffer", &GeglProcessorWrapper::getBuffer);

    // GeglWasmProgressive wrapper
    emscripten::class_<GeglWasmProgressiveWrapper>("GeglWasmProgressive")
        .constructor<GeglNodeWrapper&, const GeglRectangleWrapper*>()
        .function("work", &GeglWasmProgressiveWrapper::work)
        .function("getBuffer", &GeglWasmProgressiveWrapper::getBuffer)
        .function("setYieldInterval", &GeglWasmProgressiveWrapper::setYieldInterval);

    // Utility functions
    emscripten::function("gegl_node_new", &gegl_node_new_graph, emscripten::allow_raw_pointers());
}