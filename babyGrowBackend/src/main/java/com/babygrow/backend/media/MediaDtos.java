package com.babygrow.backend.media;

/** 媒体相关的请求/响应体。 */
public final class MediaDtos {

    private MediaDtos() {
    }

    /**
     * 上传结果。
     *
     * @param mediaId 后续把它填进记录里
     * @param url     可直接给小程序 {@code <Image src>} 用的绝对地址
     * @param kind    image / video / audio
     */
    public record UploadResponse(Long mediaId, String url, String kind) {
    }
}
