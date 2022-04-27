#include "external/mpack.h"

typedef struct _buffer {
    char *data;
    size_t len;
} buffer;

/**
> var msgpack = await import('@msgpack/msgpack')
  var wasm = await WebAssembly.instantiate(fs.readFileSync('message.wasm'))
  var msg = msgpack.encode({msg: "Hello World"})
  new Uint8Array(wasm.instance.exports.memory.buffer, 1, msg.length).set(msg)
> wasm.instance.exports.datalen(1,msg.length)
11
**/
size_t datalen(char *input, size_t len) {
	mpack_tree_t tree;
	mpack_tree_init_data(&tree, input, len);
	mpack_tree_parse(&tree);
	mpack_node_t root = mpack_tree_root(&tree);
	return mpack_node_data_len(mpack_node_map_cstr(root, "msg"));
}

buffer *xform(char *input, size_t len)
{
	mpack_tree_t tree;
	mpack_tree_init_data(&tree, input, len);
	mpack_tree_parse(&tree);
	mpack_node_t root = mpack_tree_root(&tree);

	mpack_writer_t writer;
	buffer *result = malloc(sizeof(buffer));
	mpack_writer_init_growable(&writer, &result->data, &result->len);
	mpack_build_map(&writer);
	mpack_write_cstr(&writer, "msg");
	mpack_write_cstr(&writer, mpack_node_str(mpack_node_map_cstr(root, "message")));
	mpack_complete_map(&writer);
	mpack_writer_destroy(&writer);

	return result;
}

mpack_tree_t *create() {
	char *result;
	mpack_writer_t writer;
	size_t *size;
	mpack_writer_init_growable(&writer, &result, size);
	mpack_build_map(&writer);
	mpack_write_cstr(&writer, "msg");
	mpack_write_cstr(&writer, "hello world");
	mpack_complete_map(&writer);
	if (mpack_writer_destroy(&writer) != mpack_ok)
	{
		return NULL;
	}
	return (mpack_tree_t*) result;
}