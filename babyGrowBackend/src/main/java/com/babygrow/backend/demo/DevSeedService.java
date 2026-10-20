package com.babygrow.backend.demo;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.FamilyMemberEntity;
import com.babygrow.backend.family.FamilyDtos.CreateFamilyRequest;
import com.babygrow.backend.family.FamilyDtos.CreatedFamilyResponse;
import com.babygrow.backend.family.FamilyService;
import com.babygrow.backend.memory.MemoryDtos.MemoryCreateRequest;
import com.babygrow.backend.memory.MemoryService;
import com.babygrow.backend.profile.ProfileService;
import com.babygrow.backend.profile.dto.ProfileDtos.InfoItem;
import com.babygrow.backend.profile.dto.ProfileDtos.Preference;
import com.babygrow.backend.profile.dto.ProfileDtos.ProfilePatchRequest;
import com.babygrow.backend.vaccine.VaccineDtos.VaccinePatchRequest;
import com.babygrow.backend.vaccine.VaccineService;
import com.babygrow.backend.wish.WishDtos.ChecklistItemView;
import com.babygrow.backend.wish.WishDtos.CounterView;
import com.babygrow.backend.wish.WishDtos.WishRequest;
import com.babygrow.backend.wish.WishService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 测试/演示数据生成器。
 *
 * <p>和 {@link DemoDataSeeder} 的分工：那个在启动时给「空的 dev 库」铺一小套数据；
 * 这个由显式的 HTTP 入口调用，可以随时清空并灌入完整 5 月龄数据集，用于分析页、
 * 分页和分享的手动验收。
 *
 * <p>分析投影直接写表而不是逐条走 {@code RecordService.commit}：150 天 × 多条记录
 * 每次都全量重建投影，耗时是分钟级；这里写入的是同一批投影表，读接口看到的结果一致。
 */
@Service
public class DevSeedService {

    private static final ZoneId ZONE = ZoneId.systemDefault();

    private static final String[][] SOLIDS = {
            {"南瓜泥", "蔬菜"}, {"米粉", "谷物"}, {"蛋黄泥", "蛋类"}, {"苹果泥", "水果"},
            {"红薯泥", "蔬菜"}, {"西兰花泥", "蔬菜"}, {"鸡肉泥", "肉类"}, {"小米粥", "谷物"},
    };

    private static final String[][] MEMORY_SEEDS = {
            {"Milestone", "第一次去公园", "green", "Milestone"},
            {"Diet", "第一次吃香蕉", "peach", "Diet"},
            {"Smiles", "咯咯笑出声", "blue", "Smiles"},
            {"Outdoor", "周末晒太阳", "grey", "Outdoor"},
    };

    private final JdbcTemplate jdbc;
    private final FamilyAccessService accessService;
    private final FamilyService familyService;
    private final ProfileService profileService;
    private final MemoryService memoryService;
    private final WishService wishService;
    private final VaccineService vaccineService;

    public DevSeedService(JdbcTemplate jdbc,
                          FamilyAccessService accessService,
                          FamilyService familyService,
                          ProfileService profileService,
                          MemoryService memoryService,
                          WishService wishService,
                          VaccineService vaccineService) {
        this.jdbc = jdbc;
        this.accessService = accessService;
        this.familyService = familyService;
        this.profileService = profileService;
        this.memoryService = memoryService;
        this.wishService = wishService;
        this.vaccineService = vaccineService;
    }

    /** 可选参数；缺省即「5 月龄、150 天、450 条时间线、40 条记忆、先清空」 */
    public record SeedOptions(Integer days, Integer ageMonths, Integer timelineCount,
                              Integer memories, Boolean reset) {
        int daysOr() {
            return days == null ? 150 : Math.max(days, 7);
        }

        int ageMonthsOr() {
            return ageMonths == null ? 5 : Math.max(ageMonths, 1);
        }

        int timelineOr() {
            return timelineCount == null ? daysOr() * 3 : Math.max(timelineCount, 0);
        }

        int memoriesOr() {
            return memories == null ? 40 : Math.max(memories, 0);
        }

        boolean resetOr() {
            return reset == null || reset;
        }
    }

    @Transactional
    public Map<String, Object> seed(Long userId, SeedOptions options) {
        SeedOptions opts = options == null ? new SeedOptions(null, null, null, null, null) : options;
        LocalDate birthday = LocalDate.now().minusMonths(opts.ageMonthsOr());

        FamilyMemberEntity me = accessService.findActiveMembership(userId);
        long familyId;
        long babyId;

        if (me == null) {
            CreatedFamilyResponse created = familyService.create(userId,
                    new CreateFamilyRequest("小满", birthday.toString()));
            familyId = created.familyId();
            babyId = created.babyId();
        } else {
            if (!me.isAdmin()) {
                throw BizException.forbiddenKey("error.adminOnly");
            }
            familyId = me.getFamilyId();
            babyId = accessService.findBabyId(familyId)
                    .orElseThrow(() -> BizException.badRequestKey("error.noBabyProfile"));
        }

        if (opts.resetOr()) {
            reset(familyId, babyId);
        }

        profileService.update(userId, new ProfilePatchRequest(
                "小满",
                birthday.toString(),
                null,
                List.of(new InfoItem("gender", null, null, "Boy", null, null)),
                List.of()));

        seedAnalysis(babyId, opts.daysOr());
        seedTimeline(babyId, opts.timelineOr());
        seedMemories(userId, opts.memoriesOr());
        seedWishes(userId);
        seedVaccine(userId);
        seedMenu(babyId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("familyId", familyId);
        result.put("babyId", babyId);
        result.put("ageMonths", opts.ageMonthsOr());
        result.put("days", opts.daysOr());
        result.put("timelineEntries", count("timeline_entries", babyId));
        result.put("feedings", count("feedings", babyId));
        result.put("sleepSessions", count("sleep_sessions", babyId));
        result.put("growthMeasurements", count("growth_measurements", babyId));
        result.put("moodEntries", count("mood_entries", babyId));
        result.put("milestones", count("baby_milestones", babyId));
        result.put("memories", jdbc.queryForObject(
                "SELECT COUNT(*) FROM memories WHERE family_id = ?", Integer.class, familyId));
        result.put("wishes", count("wishes", babyId));
        return result;
    }

    public void reset(long familyId, long babyId) {
        jdbc.update("DELETE FROM ai_tasks WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM daily_recommendations WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM timeline_entries WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM records WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM feedings WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM sleep_sessions WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM growth_measurements WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM mood_entries WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM baby_milestones WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM wish_checklist_items WHERE wish_id IN (SELECT id FROM wishes WHERE baby_id = ?)", babyId);
        jdbc.update("DELETE FROM wishes WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM baby_vaccinations WHERE baby_id = ?", babyId);
        jdbc.update("DELETE FROM memories WHERE family_id = ?", familyId);
    }

    public void seedAnalysis(long babyId, int days) {
        LocalDate birthday = birthday(babyId);
        seedFeedings(babyId, days);
        seedSleep(babyId, days);
        seedGrowth(babyId, birthday);
        seedMood(babyId, Math.min(days, 120));
        seedMilestones(babyId);
    }

    private void seedFeedings(long babyId, int days) {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = new ArrayList<>();

        for (int ago = days - 1; ago >= 0; ago--) {
            LocalDate date = today.minusDays(ago);
            int total = 760 + (days - ago) / 3;
            int perFeed = total / 4;

            for (int hour : new int[]{8, 11, 15, 19}) {
                rows.add(new Object[]{babyId, ts(date.atTime(hour, 0)), "milk", null, null, perFeed, false});
            }

            int solidStart = Math.max(days - 30, 0);
            int solidIndex = solidStart - ago;
            if (solidIndex >= 0) {
                String[] food = SOLIDS[solidIndex % SOLIDS.length];
                boolean first = solidIndex < SOLIDS.length;
                rows.add(new Object[]{babyId, ts(date.atTime(12, 30)), "solid", food[0], food[1], null, first});
            }
        }

        jdbc.batchUpdate("""
                INSERT INTO feedings (baby_id, occurred_at, kind, food_name, food_category, amount_ml, is_first)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, rows);
    }

    private void seedSleep(long babyId, int days) {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = new ArrayList<>();

        for (int ago = days - 1; ago >= 0; ago--) {
            LocalDate date = today.minusDays(ago);
            rows.add(sleepRow(babyId, date.atTime(20, 0), 570 + (ago % 5) * 15, "night"));
            rows.add(sleepRow(babyId, date.plusDays(1).atTime(9, 30), 75, "nap"));
            rows.add(sleepRow(babyId, date.plusDays(1).atTime(14, 0), 80, "nap"));
        }

        jdbc.batchUpdate("""
                INSERT INTO sleep_sessions (baby_id, start_at, end_at, duration_min, session_type, quality)
                VALUES (?, ?, ?, ?, ?, ?)
                """, rows);
    }

    private void seedGrowth(long babyId, LocalDate birthday) {
        List<Object[]> rows = new ArrayList<>();
        int months = (int) Math.max(1, java.time.temporal.ChronoUnit.MONTHS.between(birthday, LocalDate.now()));

        for (int month = 0; month <= months; month++) {
            for (int week = 0; week < 4; week++) {
                LocalDate date = birthday.plusMonths(month).plusWeeks(week);
                if (date.isAfter(LocalDate.now())) {
                    continue;
                }
                double age = month + week / 4.0;
                rows.add(new Object[]{
                        babyId, ts(date.atTime(9, 0)),
                        BigDecimal.valueOf(50 + age * 3.2).setScale(2, java.math.RoundingMode.HALF_UP),
                        BigDecimal.valueOf(3.3 + age * 0.6).setScale(3, java.math.RoundingMode.HALF_UP),
                        BigDecimal.valueOf(35 + age * 1.1).setScale(2, java.math.RoundingMode.HALF_UP)});
            }
        }

        jdbc.batchUpdate("""
                INSERT INTO growth_measurements (baby_id, measured_at, height_cm, weight_kg, head_cm)
                VALUES (?, ?, ?, ?, ?)
                """, rows);
    }

    private void seedMood(long babyId, int days) {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = new ArrayList<>();

        for (int ago = days - 1; ago >= 0; ago--) {
            int phase = ago % 20;
            String mood = phase >= 4 && phase <= 7 ? "clingy" : "happy";
            rows.add(new Object[]{babyId, ts(today.minusDays(ago).atTime(10, 0)), mood});
        }

        jdbc.batchUpdate("""
                INSERT INTO mood_entries (baby_id, occurred_at, mood) VALUES (?, ?, ?)
                """, rows);
    }

    private void seedMilestones(long babyId) {
        List<Object[]> rows = List.of(
                milestone(babyId, "first_smile", "第一次微笑", "社交", 110, "silver"),
                milestone(babyId, "head_control", "抬头稳定", "运动", 95, "silver"),
                milestone(babyId, "roll_over", "学会翻身", "运动", 45, "gold"),
                milestone(babyId, "reach_grasp", "主动抓握", "运动", 30, "silver"),
                milestone(babyId, "sit_supported", "扶坐", "运动", 2, "silver"));

        jdbc.batchUpdate("""
                INSERT INTO baby_milestones
                    (baby_id, milestone_key, title, description, unlocked_at, tier, type, icon)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'star')
                """, rows);
    }

    public void seedTimeline(long babyId, int count) {
        List<Object[]> rows = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int index = 0; index < count; index++) {
            LocalDate date = today.minusDays(index / 3L);
            String filter = index % 3 == 0 ? "health" : index % 3 == 1 ? "photos" : "milestones";
            rows.add(new Object[]{
                    babyId, date, "memory", filter, "10:00", "记录",
                    "记录 " + index, "第 " + index + " 条演示记录",
                    date.atTime(10, 0).atZone(ZONE).toInstant().toEpochMilli()});
        }

        jdbc.batchUpdate("""
                INSERT INTO timeline_entries
                    (baby_id, date, type, filter_key, time, badge, title, description, sort_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, rows);
    }

    private void seedMemories(Long userId, int count) {
        LocalDate today = LocalDate.now();

        for (int index = 0; index < count; index++) {
            String[] seed = MEMORY_SEEDS[index % MEMORY_SEEDS.length];
            memoryService.create(userId, new MemoryCreateRequest(
                    seed[0],
                    seed[1] + " · " + (index + 1),
                    today.minusDays(index).toString(),
                    seed[2],
                    List.of(seed[3]),
                    "Text",
                    null));
        }
    }

    private void seedWishes(Long userId) {
        wishService.create(userId, new WishRequest(
                "seed-wish-swim", "swim", "bg-wish-swim", "学会游泳", "掌握基础的水性与换气",
                "每周一次亲子游泳", 3, "项", "游泳清单", "/pages/wishes/detail/index?mode=edit",
                "checklist", "成长目标",
                List.of(
                        new ChecklistItemView("seed-1", "熟悉水性", "能在水里放松", false),
                        new ChecklistItemView("seed-2", "练习换气", "连续换气 3 次", false),
                        new ChecklistItemView("seed-3", "独立漂浮", "借助浮板", false)),
                null, "先从短时间、浅水区开始。"));

        wishService.create(userId, new WishRequest(
                "seed-wish-books", "books", "bg-wish-books", "读 100 本书", "给宝宝攒一个小书架",
                "每天睡前一本", 100, "本", "阅读清单", "/pages/wishes/counter/index?mode=counter",
                "counter", "成长目标", List.of(),
                new CounterView(12, 100, "本"), "重复阅读也算数。"));
    }

    private void seedVaccine(Long userId) {
        LocalDate today = LocalDate.now();
        java.time.format.DateTimeFormatter formatter =
                java.time.format.DateTimeFormatter.ofPattern("MMMM d, yyyy • h:mm a", java.util.Locale.US);

        vaccineService.update(userId, new VaccinePatchRequest(
                "Vaccine: HepB",
                formatter.format(today.minusDays(30).atTime(10, 30)),
                "社区接种门诊",
                "李医生",
                "2nd of 3",
                java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy", java.util.Locale.US)
                        .format(today.plusDays(20)),
                "提前一天提醒",
                "接种后注射处轻微泛红，观察 24 小时无发热。",
                null));
    }

    private void seedMenu(long babyId) {
        LocalDate today = LocalDate.now();
        jdbc.update("DELETE FROM daily_recommendations WHERE baby_id = ? AND date = ?", babyId, today);

        insertMenu(babyId, today, "zh", "午餐", "鸡肉南瓜粥", "富含蛋白质与维生素 A");
        insertMenu(babyId, today, "en", "Lunch", "Chicken and pumpkin porridge", "Rich in protein and vitamin A");
    }

    private void insertMenu(long babyId, LocalDate date, String language, String mealType,
                            String title, String reason) {
        String payload = "[{\"id\":\"1\",\"mealType\":\"" + mealType + "\",\"title\":\"" + title
                + "\",\"description\":\"" + reason + " · 食材：南瓜、鸡肉、大米\","
                + "\"icon\":\"lunch\",\"bgColor\":\"bg-card\",\"sourceChunkIds\":[]}]";
        jdbc.update("""
                INSERT INTO daily_recommendations
                    (baby_id, date, language, status, payload, reason, generated_at)
                VALUES (?, ?, ?, 'ready', ?::jsonb, ?, NOW())
                """, babyId, date, language, payload, reason);
    }

    private LocalDate birthday(long babyId) {
        return jdbc.queryForObject("SELECT birthday FROM babies WHERE id = ?", LocalDate.class, babyId);
    }

    private int count(String table, long babyId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE baby_id = ?",
                Integer.class, babyId);
    }

    private static Timestamp ts(java.time.LocalDateTime time) {
        return Timestamp.from(time.atZone(ZONE).toInstant());
    }

    private static Object[] sleepRow(long babyId, java.time.LocalDateTime start, int minutes, String type) {
        Instant from = start.atZone(ZONE).toInstant();
        return new Object[]{
                babyId, Timestamp.from(from), Timestamp.from(from.plusSeconds(minutes * 60L)),
                minutes, type, "好"};
    }

    private static Object[] milestone(long babyId, String key, String title, String type,
                                      int daysAgo, String tier) {
        return new Object[]{
                babyId, key, title, title,
                ts(LocalDate.now().minusDays(daysAgo).atTime(10, 0)), tier, type};
    }
}
