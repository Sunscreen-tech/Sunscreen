{
    "targets": [{
        "target_name": "<(module_name)",
        "sources": [ "lib/hashCodeNative.cpp" ],
        "conditions": [
            ['OS=="linux"', {
                "cflags": [ "-std=c++11", "-Wall" ]
            }, {
                "cflags": [ "-std=c++11", "-stdlib=libc++", "-Wall" ]
            }]
        ]
    }, {
        "target_name": "action_after_build",
        "type": "none",
        "dependencies": [ "<(module_name)" ],
        "copies": [
            {
                "files": [ "<(PRODUCT_DIR)/<(module_name).node" ],
                "destination": "<(module_path)"
            }
        ]
    }]
}