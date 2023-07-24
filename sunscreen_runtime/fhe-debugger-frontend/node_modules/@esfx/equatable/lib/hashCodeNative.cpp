#include "hashCodeNative.h"

inline int32_t ConvertHash(size_t hash) {
    uint32_t lo = static_cast<uint32_t>(hash & 0xffffffff);
    uint32_t hi = static_cast<uint32_t>(hash >> 32);
    return ((hi << 7) | (hi >> 25)) ^ lo;
}

size_t HashBigInt(v8::Local<v8::BigInt> bigint_key) {
    int sign_bit = 0;
    int word_count = bigint_key->WordCount();
    std::vector<uint64_t> words;
    words.resize(word_count);
    bigint_key->ToWordsArray(&sign_bit, &word_count, words.data());

    size_t hash = std::hash<int>{}(sign_bit);
    for (uint64_t word : words) {
        hash = (hash << 15) | (hash >> 49);
        hash = hash ^ std::hash<uint64_t>{}(word);
    }

    return hash;
}

void HashBigInt(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    v8::HandleScope scope(isolate);

    if (args.Length() < 1 || !args[0]->IsBigInt()) {
        isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()));
    }

    v8::Local<v8::BigInt> bigint_key = args[0].As<v8::BigInt>();
    size_t hash = HashBigInt(bigint_key);
    args.GetReturnValue().Set(v8::Int32::New(isolate, ConvertHash(hash)));
}

size_t HashNumber(v8::Local<v8::Number> number_key, v8::Local<v8::Context> context) {
    if (number_key->IsInt32()) return std::hash<int32_t>{}(number_key->Int32Value(context).FromJust());
    if (number_key->IsUint32()) return std::hash<uint32_t>{}(number_key->Uint32Value(context).FromJust());
    return std::hash<double>{}(number_key->NumberValue(context).FromJust());
}

void HashNumber(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    v8::HandleScope scope(isolate);

    if (args.Length() < 1 || !args[0]->IsNumber()) {
        isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()));
    }

    v8::Local<v8::Number> number_key = args[0].As<v8::Number>();
    size_t hash = HashNumber(number_key, isolate->GetCurrentContext());
    args.GetReturnValue().Set(v8::Int32::New(isolate, ConvertHash(hash)));
}

size_t HashName(v8::Local<v8::Name> name_key) {
    return name_key->GetIdentityHash();
}

void HashName(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    v8::HandleScope scope(isolate);

    if (args.Length() < 1 || !args[0]->IsName()) {
        isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()));
    }

    v8::Local<v8::Name> string_key = args[0].As<v8::Name>();
    size_t hash = HashName(string_key);
    args.GetReturnValue().Set(v8::Int32::New(isolate, ConvertHash(hash)));
}

size_t HashObject(v8::Local<v8::Object> object_key) {
    return object_key->GetIdentityHash();
}

void HashObject(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = args.GetIsolate();
    v8::HandleScope scope(isolate);

    if (args.Length() < 1 || !args[0]->IsObject()) {
        isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()));
    }

    v8::Local<v8::Object> object_key = args[0].As<v8::Object>();
    size_t hash = HashObject(object_key);
    args.GetReturnValue().Set(v8::Int32::New(isolate, ConvertHash(hash)));
}

void Init(v8::Local<v8::Object> exports) {
    NODE_SET_METHOD(exports, "hashBigInt", HashBigInt);
    NODE_SET_METHOD(exports, "hashNumber", HashNumber);
    NODE_SET_METHOD(exports, "hashString", HashName);
    NODE_SET_METHOD(exports, "hashSymbol", HashName);
    NODE_SET_METHOD(exports, "hashObject", HashObject);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Init)