package com.babygrow.backend.demo;

import com.babygrow.backend.auth.AuthService;
import com.babygrow.backend.config.AppProperties;
import com.babygrow.backend.family.FamilyDtos.MemberView;
import com.babygrow.backend.family.FamilyService;
import com.babygrow.backend.memory.MemoryDtos.MemoryCreateRequest;
import com.babygrow.backend.memory.MemoryService;
import com.babygrow.backend.profile.ProfileService;
import com.babygrow.backend.profile.dto.ProfileDtos.InfoItem;
import com.babygrow.backend.profile.dto.ProfileDtos.Preference;
import com.babygrow.backend.profile.dto.ProfileDtos.ProfilePatchRequest;
import com.babygrow.backend.record.RecordService;
import com.babygrow.backend.record.dto.RecordDtos.CommitRequest;
import com.babygrow.backend.record.dto.RecordDtos.FoodPayload;
import com.babygrow.backend.record.dto.RecordDtos.GrowthPayload;
import com.babygrow.backend.record.dto.RecordDtos.MilkPayload;
import com.babygrow.backend.record.dto.RecordDtos.MilestonePayload;
import com.babygrow.backend.record.dto.RecordDtos.MoodPayload;
import com.babygrow.backend.record.dto.RecordDtos.SleepPayload;
import com.babygrow.backend.repository.RecordRepository;
import com.babygrow.backend.vaccine.VaccineDtos.VaccinePatchRequest;
import com.babygrow.backend.vaccine.VaccineService;
import com.babygrow.backend.wish.WishDtos.ChecklistItemView;
import com.babygrow.backend.wish.WishDtos.CounterView;
import com.babygrow.backend.wish.WishDtos.WishRequest;
import com.babygrow.backend.wish.WishService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 演示数据。
 *
 * <p>打开开关后，服务启动时给开发账号灌一套完整数据，让前端一打开就是满的——不用手点
 * 几十次记录才能看到一个像样的界面。
 *
 * <p><b>灌的是真实数据、走的是真实服务调用</b>（{@code RecordService.commit} 等），
 * 不是让接口返回假响应。这样投影重建、时间线生成、访问控制全都被走一遍；若改成响应层
 * 造假，真实链路上的问题就会被掩盖——而排障时最怕的就是这个。
 *
 * <p>两道保险：只有 {@code auth.dev-mode} 同时开启才生效（生产必然为 false），
 * 且宝宝已有记录时直接跳过（不覆盖你自己录的数据）。
 */
@Component
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    /** 演示数据覆盖的天数 */
    private static final int DAYS = 28;

    /** 辅食轮换表：名称 + 类别。写下标处标记「首次尝试」 */
    private static final String[][] SOLID_FOODS = {
            {"南瓜泥", "蔬菜"}, {"米粉", "谷物"}, {"蛋黄泥", "蛋类"}, {"苹果泥", "水果"},
            {"红薯泥", "蔬菜"}, {"西兰花泥", "蔬菜"}, {"鸡肉泥", "肉类"}, {"小米粥", "谷物"},
    };

    private final AppProperties properties;
    private final AuthService authService;
    private final ProfileService profileService;
    private final RecordService recordService;
    private final WishService wishService;
    private final MemoryService memoryService;
    private final VaccineService vaccineService;
    private final FamilyService familyService;
    private final RecordRepository recordRepository;

    public DemoDataSeeder(AppProperties properties,
                          AuthService authService,
                          ProfileService profileService,
                          RecordService recordService,
                          WishService wishService,
                          MemoryService memoryService,
                          VaccineService vaccineService,
                          FamilyService familyService,
                          RecordRepository recordRepository) {
        this.properties = properties;
        this.authService = authService;
        this.profileService = profileService;
        this.recordService = recordService;
        this.wishService = wishService;
        this.memoryService = memoryService;
        this.vaccineService = vaccineService;
        this.familyService = familyService;
        this.recordRepository = recordRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        if (!properties.demoData().enabled()) {
            log.info("[demo] 演示数据已关闭（DEMO_DATA_ENABLED=false）");
            return;
        }
        if (!properties.auth().devMode()) {
            // 生产环境即使误开了开关也不会灌数据
            log.warn("[demo] 非 dev-mode，跳过演示数据");
            return;
        }

        Long userId = authService.ensureDevAccount();

        if (recordRepository.count() > 0) {
            log.info("[demo] 库里已有记录，跳过日常记录灌入");
            // 记录跳过，但待接受的邀请属于另一个域，可能在上一次中断的重灌里没补上。
            // 单独补一次——seedPendingInvite 是幂等的，重复调用没有副作用。
            seedPendingInvite(userId);
            return;
        }

        long started = System.currentTimeMillis();
        seedProfile(userId);
        seedDailyRecords(userId);
        seedWishes(userId);
        seedMemories(userId);
        seedVaccination(userId);
        seedPendingInvite(userId);

        log.info("[demo] 演示数据已灌入，用时 {} ms", System.currentTimeMillis() - started);
    }

    private void seedProfile(Long userId) {
        LocalDate birthday = LocalDate.now().minusMonths(6);

        List<InfoItem> info = List.of(
                new InfoItem("gender", null, null, "Boy", null, null),
                new InfoItem("constellation", null, null, "Leo", null, null));

        List<Preference> preferences = List.of(
                new Preference("toy", "profile-toy", "Favorite Toy", "Soft blocks"),
                new Preference("sleep", "profile-sleep", "Sleep Routine", "Loves white noise"),
                new Preference("feeding", "fork_knife", "Feeding", "Just started solids"));

        profileService.update(userId, new ProfilePatchRequest("Leo", birthday.toString(), info, preferences));
    }

    /**
     * 每天一条记录，一路铺到 28 天前；最近一周拆成上午 / 下午两条。
     *
     * <p>为什么不是「一类一条」：{@code commit} 的请求体本身支持多个条目，一天一条能把写入
     * 次数从上百次压到 28 次左右，而分析投影每次都会全量重算，次数越少越省。
     *
     * <p>为什么最近一周要拆开：时间线是按天分组的，一天只有一条时「同一天多条」的形态
     * 根本看不出来。拆而不加——上下午两条的奶量与睡眠之和等于原来的单条值，
     * 免得汇总口径跟别的日子对不上。更早的日子仍保持单条，兼顾写入次数。
     */
    private void seedDailyRecords(Long userId) {
        LocalDate today = LocalDate.now();
        ZoneId zone = ZoneId.systemDefault();

        for (int daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
            LocalDate date = today.minusDays(daysAgo);
            int progress = DAYS - 1 - daysAgo;
            Instant morning = date.atTime(9, 0).atZone(zone).toInstant();

            // 奶量随天数缓慢上升，让周图有可见趋势且落在建议区间内
            int milkTotal = 700 + progress * 4;
            int sleepTotal = 560 + (progress % 5) * 20;

            List<FoodPayload> food = new ArrayList<>();
            if (progress >= 8 && daysAgo % 2 == 0) {
                String[] item = SOLID_FOODS[(progress / 2) % SOLID_FOODS.length];
                boolean first = progress / 2 < SOLID_FOODS.length;
                food.add(new FoodPayload(item[0], item[1], first));
            }

            List<MoodPayload> mood = new ArrayList<>();
            if (daysAgo % 3 == 0) {
                mood.add(new MoodPayload(daysAgo % 6 == 0 ? "开心" : "烦躁", null));
            }

            List<GrowthPayload> growth = new ArrayList<>();
            if (daysAgo % 7 == 0) {
                growth.add(new GrowthPayload(
                        BigDecimal.valueOf(64.0 + progress * 0.16).setScale(1, java.math.RoundingMode.HALF_UP),
                        BigDecimal.valueOf(7.0 + progress * 0.035).setScale(2, java.math.RoundingMode.HALF_UP),
                        BigDecimal.valueOf(41.5 + progress * 0.05).setScale(1, java.math.RoundingMode.HALF_UP)));
            }

            if (daysAgo >= 7) {
                recordService.commit(userId, new CommitRequest(
                        "MANUAL", null, null, morning.toString(),
                        date + " 的日常记录",
                        "日常记录",
                        "喝了 " + milkTotal + "ml 奶，睡了 " + (sleepTotal / 60) + " 小时",
                        null, food,
                        List.of(new MilkPayload("配方奶", milkTotal, "全天")),
                        List.of(new SleepPayload(sleepTotal, progress % 4 == 0 ? "一般" : "好", null)),
                        mood, growth));
                continue;
            }

            /*
             * 最近一周拆成三条**各自纯粹**的记录（喂养 / 小睡 / 日常），
             * 而不是一天一条大杂烩。
             *
             * 时间线卡片的图标是按记录类型给的，而类型由提交内容推断
             * （见 RecordService#resolveEntryType）：内容混在一起只会被判成
             * 「记忆」，于是整屏都是同一枚图标。拆开之后奶量与睡眠的总量不变，
             * 只是各自成条，时间线上一眼能分出喂奶、小睡和随手记。
             *
             * 注意 text 必须留空——非空就会走 memory 分支，喂养和小睡就白拆了。
             */
            recordService.commit(userId, new CommitRequest(
                    "MANUAL", null, null, morning.toString(),
                    "",
                    "喂养",
                    "喝了 " + milkTotal + "ml 奶",
                    null, List.of(),
                    List.of(new MilkPayload("配方奶", milkTotal, "全天")),
                    List.of(), List.of(), List.of()));

            Instant nap = date.atTime(13, 0).atZone(zone).toInstant();
            recordService.commit(userId, new CommitRequest(
                    "MANUAL", null, null, nap.toString(),
                    "",
                    "小睡",
                    "一共睡了 " + (sleepTotal / 60) + " 小时",
                    null, List.of(), List.of(),
                    List.of(new SleepPayload(sleepTotal, progress % 4 == 0 ? "一般" : "好", null)),
                    List.of(), List.of()));

            Instant evening = date.atTime(19, 30).atZone(zone).toInstant();
            recordService.commit(userId, new CommitRequest(
                    "MANUAL", null, null, evening.toString(),
                    "今天状态不错，辅食吃得很香",
                    "日常记录",
                    "今天状态不错，辅食吃得很香",
                    null, food, List.of(), List.of(), mood, growth));
        }

        // 里程碑单独提交：它们彼此不同源，塞进日常记录里反而看不出是「首次」
        milestone(userId, today.minusDays(21), "运动", "首次翻身");
        milestone(userId, today.minusDays(12), "运动", "独立坐稳");
        milestone(userId, today.minusDays(2), "语言", "首次叫妈妈");
    }

    private void milestone(Long userId, LocalDate date, String type, String event) {
        Instant at = date.atTime(10, 0).atZone(ZoneId.systemDefault()).toInstant();

        recordService.commit(userId, new CommitRequest(
                "MANUAL", null, null, at.toString(),
                event, event, "记录到一个新的成长里程碑",
                List.of(new MilestonePayload(type, event, true)),
                null, null, null, null, null));
    }

    private void seedWishes(Long userId) {
        wishService.create(userId, new WishRequest(
                "wish-demo-swim", "wish-swim", "bg-wish-swim", "Learn to Swim",
                "Mastering the basics of water safety and movement.",
                "Developmental milestone goal", 4, "Strokes", "Swimming Checklist",
                "/pages/wishes/detail/index?wish=wish-demo-swim", "checklist", null,
                List.of(new ChecklistItemView("freestyle", "Freestyle", "Achieved 2 days ago", true),
                        new ChecklistItemView("breaststroke", "Breaststroke", "Learning coordination", false),
                        new ChecklistItemView("backstroke", "Backstroke", "Floating and gliding", false)),
                null,
                "Start with bubble blowing and facial immersion to build confidence. **Playful learning is key.**"));

        wishService.create(userId, new WishRequest(
                "wish-demo-books", "wish-book", "bg-wish-books", "100 Books Before K",
                "Building a lifelong love for reading and stories.",
                "Building a lifelong love for reading and stories.",
                100, "Books", null,
                "/pages/wishes/counter/index?wish=wish-demo-books", "counter", "Growth Wish",
                null, new CounterView(34, 100, "Book"),
                "Reading aloud with expressive voices helps develop vocabulary. **Make it a joyful bonding time.**"));
    }

    private void seedMemories(Long userId) {
        memoryService.create(userId, new MemoryCreateRequest(
                "MILESTONE", "First Crawl", LocalDate.now().minusDays(20).toString(),
                "green", List.of("Milestone"), "Media", null));
        memoryService.create(userId, new MemoryCreateRequest(
                "BIG MOMENT", "First Steps", LocalDate.now().minusDays(14).toString(),
                "blue", List.of("Milestone"), "Media", null));
        memoryService.create(userId, new MemoryCreateRequest(
                "FOODIE", "Sweet Potato Puree", LocalDate.now().minusDays(9).toString(),
                "peach", List.of("Diet"), "Media", null));
        memoryService.create(userId, new MemoryCreateRequest(
                "DAILY", "A quiet afternoon nap", LocalDate.now().minusDays(3).toString(),
                "grey", List.of("Daily"), "Text", null));
    }

    private void seedVaccination(Long userId) {
        LocalDate today = LocalDate.now();
        var formatter = java.time.format.DateTimeFormatter.ofPattern("MMMM d, yyyy • h:mm a", java.util.Locale.US);

        vaccineService.update(userId, new VaccinePatchRequest(
                "Vaccine: HepB",
                formatter.format(today.minusDays(30).atTime(10, 30)),
                "Sunshine Children's Clinic",
                "Dr. Sarah Chen",
                "2nd of 3",
                java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy", java.util.Locale.US)
                        .format(today.plusDays(20)),
                "A reminder will be sent 24h before.",
                "接种后注射处有点泛红，观察了 24 小时，夜里没有发热。",
                null));
    }

    private void seedPendingInvite(Long userId) {
        // 已存在同名成员就跳过。invite 会写一条 (family_id, display_name) 唯一约束的记录，
        // 重跑必然撞约束——上一次重灌演示数据就是栽在这里：记录都灌完了，
        // 到这一步抛异常，连整个应用启动都被带崩。
        Set<String> existing = familyService.members(userId).stream()
                .map(MemberView::name)
                .collect(Collectors.toSet());

        inviteIfAbsent(existing, userId, "外婆", "viewer");
        inviteIfAbsent(existing, userId, "爷爷", "contributor");
    }

    private void inviteIfAbsent(Set<String> existing, Long userId, String name, String role) {
        if (existing.contains(name)) {
            return;
        }
        familyService.invite(userId, name, role);
    }
}
