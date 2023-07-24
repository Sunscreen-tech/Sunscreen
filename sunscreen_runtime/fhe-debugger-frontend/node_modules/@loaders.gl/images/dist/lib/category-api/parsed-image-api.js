"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImageData = exports.getImageSize = exports.getImageType = exports.deleteImage = exports.isImage = void 0;
function isImage(image) {
    return Boolean(getImageTypeOrNull(image));
}
exports.isImage = isImage;
function deleteImage(image) {
    switch (getImageType(image)) {
        case 'imagebitmap':
            image.close();
            break;
        default:
        // Nothing to do for images and image data objects
    }
}
exports.deleteImage = deleteImage;
function getImageType(image) {
    const format = getImageTypeOrNull(image);
    if (!format) {
        throw new Error('Not an image');
    }
    return format;
}
exports.getImageType = getImageType;
function getImageSize(image) {
    return getImageData(image);
}
exports.getImageSize = getImageSize;
function getImageData(image) {
    switch (getImageType(image)) {
        case 'data':
            return image;
        case 'image':
        case 'imagebitmap':
            // Extract the image data from the image via a canvas
            const canvas = document.createElement('canvas');
            // TODO - reuse the canvas?
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('getImageData');
            }
            // @ts-ignore
            canvas.width = image.width;
            // @ts-ignore
            canvas.height = image.height;
            // @ts-ignore
            context.drawImage(image, 0, 0);
            // @ts-ignore
            return context.getImageData(0, 0, image.width, image.height);
        default:
            throw new Error('getImageData');
    }
}
exports.getImageData = getImageData;
// PRIVATE
// eslint-disable-next-line complexity
function getImageTypeOrNull(image) {
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
        return 'imagebitmap';
    }
    if (typeof Image !== 'undefined' && image instanceof Image) {
        return 'image';
    }
    if (image && typeof image === 'object' && image.data && image.width && image.height) {
        return 'data';
    }
    return null;
}
