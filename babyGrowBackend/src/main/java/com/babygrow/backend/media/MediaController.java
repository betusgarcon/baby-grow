package com.babygrow.backend.media;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.domain.MediaAssetEntity;
import com.babygrow.backend.media.MediaDtos.UploadResponse;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

@RestController
public class MediaController {

    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    /** 上传。需要登录，且会归到当前用户可选的家庭下。 */
    @PostMapping("/api/baby/media")
    public ApiResponse<UploadResponse> upload(@AuthenticationPrincipal Long userId,
                                              @RequestParam("file") MultipartFile file,
                                              @RequestParam(value = "babyId", required = false) Long babyId) {
        MediaAssetEntity asset = mediaService.upload(userId, babyId, file);
        return ApiResponse.ok(new UploadResponse(asset.getId(), asset.getUrl(), asset.getKind()));
    }

    /**
     * 读取媒体内容。
     *
     * <p>**本接口不鉴权**，这是有意的：小程序的 {@code <Image src>} 不会携带
     * Authorization 头，放在鉴权后面图片就渲染不出来。安全性由「对象键不可猜测」
     * 保证——32 位十六进制随机串本身就是访问凭据，与对象存储的预签名 URL 是同一思路。
     *
     * <p>若将来要求更严，应改为带过期时间的签名 URL，而不是把本接口挪到鉴权后面。
     */
    @GetMapping("/api/media/{objectKey}")
    public ResponseEntity<byte[]> read(@PathVariable String objectKey) {
        MediaAssetEntity asset = mediaService.requireByObjectKey(objectKey);
        byte[] content = mediaService.readContent(objectKey);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        asset.getMime() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : asset.getMime()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate())
                .body(content);
    }
}
