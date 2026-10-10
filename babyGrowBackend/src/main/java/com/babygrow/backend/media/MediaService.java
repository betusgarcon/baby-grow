package com.babygrow.backend.media;

import com.babygrow.backend.common.BizException;
import com.babygrow.backend.config.AppProperties;
import com.babygrow.backend.domain.MediaAssetEntity;
import com.babygrow.backend.repository.MediaAssetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@Service
public class MediaService {

    /** 允许上传的类型 → 归到哪一类 kind */
    private static final Map<String, String> KIND_BY_MIME_PREFIX = Map.of(
            "image/", MediaAssetEntity.KIND_IMAGE,
            "video/", MediaAssetEntity.KIND_VIDEO,
            "audio/", MediaAssetEntity.KIND_AUDIO);

    private final MediaStorage storage;
    private final MediaAssetRepository repository;
    private final AppProperties properties;

    public MediaService(MediaStorage storage, MediaAssetRepository repository, AppProperties properties) {
        this.storage = storage;
        this.repository = repository;
        this.properties = properties;
    }

    /** 这份媒体连同它的元信息，供转发给 AI 服务使用 */
    public record StoredMedia(byte[] content, String mime, String kind) {
    }

    @Transactional
    public MediaAssetEntity upload(Long userId, Long babyId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BizException.badRequest("文件为空");
        }

        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String kind = KIND_BY_MIME_PREFIX.entrySet().stream()
                .filter(entry -> mime.startsWith(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElseThrow(() -> BizException.badRequest("不支持的文件类型：" + mime));

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw BizException.badRequest("文件读取失败");
        }

        String objectKey = storage.store(content, extensionOf(file.getOriginalFilename(), mime));
        String url = properties.media().publicBase() + "/api/media/" + objectKey;

        return repository.save(MediaAssetEntity.of(
                userId, babyId, kind, objectKey, url, mime, content.length));
    }

    @Transactional(readOnly = true)
    public StoredMedia load(Long mediaId) {
        MediaAssetEntity asset = repository.findById(mediaId)
                .orElseThrow(() -> BizException.notFound("媒体不存在"));
        return new StoredMedia(storage.read(asset.getObjectKey()), asset.getMime(), asset.getKind());
    }

    @Transactional(readOnly = true)
    public MediaAssetEntity requireByObjectKey(String objectKey) {
        // 键本身就是访问凭据，所以这里不再校验归属，只用来取 mime
        return repository.findByObjectKey(objectKey)
                .orElseThrow(() -> BizException.notFound("媒体不存在"));
    }

    public byte[] readContent(String objectKey) {
        return storage.read(objectKey);
    }

    private static String extensionOf(String originalFilename, String mime) {
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                String ext = originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
                if (ext.matches("[a-z0-9]{1,8}")) {
                    return ext;
                }
            }
        }
        // 退而求其次：从 mime 的 subtype 推一个（image/jpeg → jpeg）
        int slash = mime.indexOf('/');
        return slash >= 0 ? mime.substring(slash + 1) : null;
    }
}
