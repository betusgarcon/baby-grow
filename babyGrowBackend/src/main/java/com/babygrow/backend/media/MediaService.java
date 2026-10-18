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
            throw BizException.badRequestKey("error.emptyFile");
        }

        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String kind = KIND_BY_MIME_PREFIX.entrySet().stream()
                .filter(entry -> mime.startsWith(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElseThrow(() -> BizException.badRequestKey("error.unsupportedFileType", mime));

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw BizException.badRequestKey("error.fileReadFailed");
        }

        String objectKey = storage.store(content, extensionOf(file.getOriginalFilename(), mime));
        String url = properties.media().publicBase() + "/api/media/" + objectKey;

        return repository.save(MediaAssetEntity.of(
                userId, babyId, kind, objectKey, url, mime, content.length));
    }

    /**
     * 存一张服务端生成的图片（AI 出图），不经过用户上传。
     *
     * <p>与 {@link #upload} 的唯一区别是入口：字节直接来自 AI 服务，没有 MultipartFile
     * 也没有原始文件名。落库与拼 URL 完全一致，所以生成图与用户上传的照片在下游是
     * 同一种东西，共用 {@code GET /api/media/{objectKey}} 那套能力 URL 读取。
     */
    @Transactional
    public MediaAssetEntity storeGenerated(byte[] content, String mime, Long ownerUserId, Long babyId) {
        if (content == null || content.length == 0) {
            throw BizException.badRequestKey("error.imageEmpty");
        }

        // AI 服务未必回 mime，缺省按 PNG 处理：这是出图接口最常见的输出格式
        String normalizedMime = mime == null || mime.isBlank() ? "image/png" : mime.toLowerCase(Locale.ROOT);
        String objectKey = storage.store(content, extensionOf(null, normalizedMime));
        String url = properties.media().publicBase() + "/api/media/" + objectKey;

        return repository.save(MediaAssetEntity.of(
                ownerUserId, babyId, MediaAssetEntity.KIND_IMAGE, objectKey, url, normalizedMime, content.length));
    }

    /**
     * 取一份媒体，并校验它属于 {@code userId}。
     *
     * <p>mediaId 是自增的、可猜的，所以「能读到自己上传的图」这件事必须由这一层保证，
     * 而不是指望每个调用方各写一遍。归属校验放在这里的原因是有过教训：
     * {@code RecordService} 的提交路径自己写了一版校验，而 {@code AiTaskService}
     * 的识别路径漏了同一件事——同一份媒体，两条路径两种待遇。
     */
    @Transactional(readOnly = true)
    public MediaAssetEntity requireOwned(Long mediaId, Long userId) {
        MediaAssetEntity asset = repository.findById(mediaId)
                .orElseThrow(() -> BizException.notFoundKey("error.mediaNotFound"));

        if (!userId.equals(asset.getOwnerUserId())) {
            throw BizException.forbiddenKey("error.mediaNotOwned");
        }
        return asset;
    }

    @Transactional(readOnly = true)
    public StoredMedia load(Long mediaId) {
        MediaAssetEntity asset = repository.findById(mediaId)
                .orElseThrow(() -> BizException.notFoundKey("error.mediaNotFound"));
        return new StoredMedia(storage.read(asset.getObjectKey()), asset.getMime(), asset.getKind());
    }

    @Transactional(readOnly = true)
    public MediaAssetEntity requireByObjectKey(String objectKey) {
        // 键本身就是访问凭据，所以这里不再校验归属，只用来取 mime
        return repository.findByObjectKey(objectKey)
                .orElseThrow(() -> BizException.notFoundKey("error.mediaNotFound"));
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
