package com.babygrow.backend.wish;

import com.babygrow.backend.ai.AiClient;
import com.babygrow.backend.config.AppProperties;
import com.babygrow.backend.config.AsyncConfig;
import com.babygrow.backend.domain.MediaAssetEntity;
import com.babygrow.backend.domain.WishEntity;
import com.babygrow.backend.media.MediaService;
import com.babygrow.backend.repository.WishRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Map;
import java.util.concurrent.Executor;

/**
 * 心愿头图：调用 AI 服务出图，存成媒体资源，再挂回心愿行。
 *
 * <p><b>为什么是异步。</b>出图要几秒到几十秒，放进创建请求里会让用户干等，
 * 而且一旦超时，用户刚填的内容就白填了。所以创建立即返回，头图在后台补；
 * 生成期间 {@code cover_status} 是 {@code pending}，页面显示渐变占位。
 *
 * <p><b>为什么用 AI 线程池而不是自己的。</b>出图与识别、食谱一样都是「慢且要
 * 打外部依赖」的活，共用 {@link AsyncConfig#AI_EXECUTOR} 就足够了。当前量级
 * 不值得为它单开一个池。
 */
@Service
public class WishCoverService {

    private static final Logger log = LoggerFactory.getLogger(WishCoverService.class);

    /** 出图结果的上限。超过这个大小说明上游返回了意料之外的东西，宁可不存 */
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;

    private final AiClient aiClient;
    private final MediaService mediaService;
    private final WishRepository wishRepository;
    private final AppProperties properties;
    private final Executor executor;

    public WishCoverService(AiClient aiClient,
                            MediaService mediaService,
                            WishRepository wishRepository,
                            AppProperties properties,
                            @Qualifier(AsyncConfig.AI_EXECUTOR) Executor executor) {
        this.aiClient = aiClient;
        this.mediaService = mediaService;
        this.wishRepository = wishRepository;
        this.properties = properties;
        this.executor = executor;
    }

    /** 功能开关。未开启时调用方不该把心愿标成 pending */
    public boolean enabled() {
        return properties.wish() != null
                && properties.wish().cover() != null
                && properties.wish().cover().enabled();
    }

    /**
     * 一次生成任务的全部输入。
     *
     * <p>用值对象而不是直接传 JPA 实体：任务跑在另一个线程上，不该让它去碰实体。
     */
    public record CoverJob(Long userId,
                           Long babyId,
                           Long wishId,
                           String wishKey,
                           String title,
                           String description,
                           int ageMonths) {
    }

    /**
     * 丢到 AI 线程池。
     *
     * <p>调用方此刻往往还在创建心愿的事务里。所以任务**只用入参**，直到最后才按
     * {@code wishId} 回写那一行——那时创建事务早已提交。若一上来就 findById，
     * 会读到未提交的旧状态而扑空。
     */
    public void enqueue(CoverJob job) {
        executor.execute(() -> generate(job));
    }

    /**
     * 生成并落库。
     *
     * <p>刻意不加 {@code @Transactional}：整段包着一次几十秒的出图调用，用事务兜住
     * 会长时间占着数据库连接。这里只有首尾两次仓储调用，各自成事务即可——
     * 与 {@code MenuService.regenerate} 同一做法。
     */
    public void generate(CoverJob job) {
        byte[] content;
        try {
            Map<String, Object> response = aiClient.generateWishCover(
                    job.wishKey(), job.title(), job.description(), job.ageMonths());
            content = decodeImage(response.get("image_base64"));
        } catch (Exception ex) {
            log.error("生成心愿 {} 的头图失败", job.wishKey(), ex);
            markFailed(job.wishId());
            return;
        }

        try {
            MediaAssetEntity asset = mediaService.storeGenerated(
                    content, null, job.userId(), job.babyId());
            markReady(job.wishId(), asset.getId());
            log.info("心愿 {} 的头图已生成（{} 字节）", job.wishKey(), content.length);
        } catch (Exception ex) {
            // 图片已经拿到了，只是没存住；仍按失败处理，让前端给出重试入口
            log.error("心愿 {} 的头图落库失败", job.wishKey(), ex);
            markFailed(job.wishId());
        }
    }

    /**
     * 头图失败时**保留**原有的 coverMediaId：重试失败不该把上一张能用的图抹掉，
     * 那会让本来就正常的页面突然变空。
     */
    private void markFailed(Long wishId) {
        wishRepository.findById(wishId).ifPresent(wish -> {
            wish.setCoverStatus(WishEntity.COVER_FAILED);
            wishRepository.save(wish);
        });
    }

    private void markReady(Long wishId, Long mediaId) {
        wishRepository.findById(wishId).ifPresentOrElse(wish -> {
            wish.setCoverMediaId(mediaId);
            wish.setCoverStatus(WishEntity.COVER_READY);
            wishRepository.save(wish);
        }, () -> log.warn("心愿 {} 在出图期间被删除，生成结果丢弃", wishId));
    }

    /** AI 服务回的是 base64 图片，可能带 data URL 前缀 */
    private static byte[] decodeImage(Object raw) {
        if (!(raw instanceof String encoded) || encoded.isBlank()) {
            throw new IllegalStateException("AI 服务未返回图片内容");
        }

        int comma = encoded.indexOf(',');
        String payload = encoded.startsWith("data:") && comma > 0
                ? encoded.substring(comma + 1)
                : encoded;

        byte[] content;
        try {
            content = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("AI 服务返回的图片不是合法 base64", ex);
        }

        if (content.length > MAX_IMAGE_BYTES) {
            throw new IllegalStateException(
                    "图片过大（" + content.length + " 字节，上限 " + MAX_IMAGE_BYTES + "）");
        }
        return content;
    }
}
