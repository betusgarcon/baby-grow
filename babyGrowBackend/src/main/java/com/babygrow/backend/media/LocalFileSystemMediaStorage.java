package com.babygrow.backend.media;

import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.ErrorCode;
import com.babygrow.backend.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * 本地文件系统存储，供开发环境使用。
 *
 * <p>对象键是 32 位十六进制随机串，兼具「不可猜测」与「可作访问凭据」两重作用。
 * 读取前一律用正则校验键的形状，杜绝 {@code ../} 之类的路径穿越。
 */
@Component
public class LocalFileSystemMediaStorage implements MediaStorage {

    private static final Logger log = LoggerFactory.getLogger(LocalFileSystemMediaStorage.class);

    /** 32 位十六进制，可带一个短扩展名 */
    private static final Pattern KEY_PATTERN = Pattern.compile("^[0-9a-f]{32}(\\.[a-z0-9]{1,8})?$");

    private final Path root;
    private final SecureRandom random = new SecureRandom();

    public LocalFileSystemMediaStorage(AppProperties properties) {
        this.root = Paths.get(properties.media().root()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException ex) {
            throw new IllegalStateException("无法创建媒体存储目录：" + root, ex);
        }
        log.info("媒体存储根目录 {}", root);
    }

    @Override
    public String store(byte[] content, String extension) {
        byte[] buffer = new byte[16];
        random.nextBytes(buffer);
        String key = HexFormat.of().formatHex(buffer)
                + (extension == null || extension.isBlank() ? "" : "." + extension.toLowerCase());

        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException ex) {
            throw new BizException(ErrorCode.INTERNAL_ERROR, "媒体写入失败");
        }
        return key;
    }

    @Override
    public byte[] read(String objectKey) {
        Path target = resolve(objectKey);
        if (!Files.isReadable(target)) {
            throw BizException.notFound("媒体不存在");
        }
        try {
            return Files.readAllBytes(target);
        } catch (IOException ex) {
            throw new BizException(ErrorCode.INTERNAL_ERROR, "媒体读取失败");
        }
    }

    @Override
    public boolean exists(String objectKey) {
        try {
            return Files.isReadable(resolve(objectKey));
        } catch (BizException ex) {
            return false;
        }
    }

    /** 只接受合法键；分两级目录存放，避免单目录下文件过多 */
    private Path resolve(String objectKey) {
        if (objectKey == null || !KEY_PATTERN.matcher(objectKey).matches()) {
            throw BizException.badRequest("非法的媒体标识");
        }
        Path resolved = root.resolve(objectKey.substring(0, 2)).resolve(objectKey).normalize();
        if (!resolved.startsWith(root)) {
            throw BizException.badRequest("非法的媒体标识");
        }
        return resolved;
    }
}
