package com.babygrow.backend.media;

/**
 * 媒体存储。
 *
 * <p>抽成接口是为了将来换对象存储（MinIO/OSS）时只改实现，业务层与前端契约都不动。
 */
public interface MediaStorage {

    /**
     * 存入一份内容。
     *
     * @param content   文件字节
     * @param extension 扩展名（不含点），可为空
     * @return 对象键（不可猜测的随机串，同时充当访问凭据）
     */
    String store(byte[] content, String extension);

    byte[] read(String objectKey);

    boolean exists(String objectKey);
}
