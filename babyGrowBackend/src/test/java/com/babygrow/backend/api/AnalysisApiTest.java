package com.babygrow.backend.api;

import com.babygrow.backend.demo.DevSeedService;
import org.springframework.beans.factory.annotation.Autowired;
import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 5 月龄宝宝的分析页：用 150 天数据验证曲线、奶量、辅食、睡眠与情绪都不是空壳。
 */
class AnalysisApiTest extends IntegrationTestBase {

    @Autowired
    private DevSeedService seedService;

    private String tokenWithFiveMonthsOfData() {
        String token = login();
        long familyId = createFiveMonthFamily(token);
        long id = babyId(familyId);

        // 生长参考值需要性别；不填的话百分位与参考线都是空的
        put("/api/baby/profile-detail", Map.of(
                "info", List.of(Map.of("key", "gender", "value", "Boy"))), token);

        seedService.seedAnalysis(id, 150);
        return token;
    }

    @Test
    void growthPageHasCurvesForFiveMonths() {
        String token = tokenWithFiveMonthsOfData();

        TestResponse response = get("/api/baby/growth", token);
        assertThat(response.status()).as(response.message()).isEqualTo(200);

        var data = response.data();
        assertThat(data.path("hasData").asBoolean()).isTrue();
        assertThat(data.path("timeRanges").size()).isEqualTo(3);
        assertThat(data.path("metrics").size()).isEqualTo(3);
        assertThat(data.path("metrics").get(0).path("value").asText()).isNotBlank();

        var trends = data.path("trends");
        assertThat(trends.has("birth")).isTrue();
        for (String range : List.of("last3m", "last6m", "birth")) {
            for (String metric : List.of("height", "weight", "head")) {
                var snapshot = trends.path(range).path(metric);
                assertThat(snapshot.path("points").size())
                        .as("%s/%s", range, metric).isGreaterThan(10);
                assertThat(snapshot.path("chartLabel").asText()).isNotBlank();
                assertThat(snapshot.path("comparisonLabel").asText()).contains("WHO");
                assertThat(snapshot.path("footer").path("badge").asText()).isNotBlank();
            }
        }

        assertThat(data.path("monthlyDiet").path("legends").size()).isGreaterThanOrEqualTo(4);
        assertThat(data.path("monthlyDiet").path("ingredientCount").asInt()).isGreaterThanOrEqualTo(8);
        assertThat(data.path("milestones").size()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void growthTrendEndpointReturnsPointsAndInsight() {
        String token = tokenWithFiveMonthsOfData();

        TestResponse response = get("/api/baby/growth/trend?metric=weight&range=birth", token);
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.data().path("snapshot").path("points").size()).isGreaterThan(10);
        assertThat(response.data().path("metrics").size()).isGreaterThan(10);
        assertThat(response.data().path("insight").path("title").asText()).isNotBlank();
    }

    @Test
    void sleepCircadianAndDailyLogs() {
        String token = tokenWithFiveMonthsOfData();
        String today = LocalDate.now().toString();

        TestResponse circadian = get("/api/baby/sleep/circadian?date=" + today, token);
        assertThat(circadian.status()).isEqualTo(200);
        assertThat(circadian.data().path("hasData").asBoolean()).isTrue();

        var summary = circadian.data().path("summary");
        assertThat(summary.path("totalSleepLabel").asText()).isNotBlank();
        assertThat(summary.path("goalLabel").asText()).isNotBlank();
        assertThat(summary.path("segments").size()).isEqualTo(3);

        List<String> types = List.of(
                summary.path("segments").get(0).path("type").asText(),
                summary.path("segments").get(1).path("type").asText(),
                summary.path("segments").get(2).path("type").asText());
        assertThat(types).containsExactly("night", "nap", "awake");

        TestResponse logs = get("/api/baby/sleep/logs?date=" + today, token);
        assertThat(logs.status()).isEqualTo(200);
        assertThat(logs.data().path("hasData").asBoolean()).isTrue();
        assertThat(logs.data().path("logs").size()).isGreaterThanOrEqualTo(1);
        assertThat(logs.data().path("logs").get(0).path("title").asText()).isNotBlank();
    }

    @Test
    void sleepEvolutionDefaultsCoverTheFirstFiveMonths() {
        String token = tokenWithFiveMonthsOfData();

        TestResponse response = get("/api/baby/sleep/evolution", token);
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.data().path("hasData").asBoolean()).isTrue();

        var rows = response.data().path("rows");
        assertThat(rows.size()).isEqualTo(5);
        assertThat(rows.get(0).path("label").asText()).contains("1");
        assertThat(rows.get(4).path("label").asText()).contains("5");

        long nonEmpty = 0;
        for (var row : rows) {
            if (row.path("segments").size() > 0) {
                nonEmpty++;
            }
        }
        assertThat(nonEmpty).isGreaterThanOrEqualTo(4);
    }

    @Test
    void weeklyMilkAndMonthlyDiet() {
        String token = tokenWithFiveMonthsOfData();

        TestResponse weekly = get("/api/baby/diet/weekly", token);
        assertThat(weekly.status()).isEqualTo(200);
        assertThat(weekly.data().path("hasData").asBoolean()).isTrue();
        assertThat(weekly.data().path("bars").size()).isEqualTo(7);
        assertThat(weekly.data().path("averageLabel").asText()).contains("平均");
        assertThat(weekly.data().path("narrativeNote").asText()).isNotBlank();
        assertThat(weekly.data().path("referenceRange").path("min").asInt()).isPositive();

        TestResponse monthly = get("/api/baby/diet/monthly?month=" + YearMonth.now(), token);
        assertThat(monthly.status()).isEqualTo(200);
        assertThat(monthly.data().path("hasData").asBoolean()).isTrue();
        assertThat(monthly.data().path("donut").path("legends").size()).isGreaterThanOrEqualTo(4);
        assertThat(monthly.data().path("ingredients").path("list").size()).isGreaterThanOrEqualTo(8);
    }

    @Test
    void moodCalendarHighlightsRunsAndAcceptsCheckin() {
        String token = tokenWithFiveMonthsOfData();

        TestResponse calendar = get("/api/baby/mood/calendar?year=" + LocalDate.now().getYear()
                + "&month=" + LocalDate.now().getMonthValue(), token);
        assertThat(calendar.status()).isEqualTo(200);
        assertThat(calendar.data().path("hasData").asBoolean()).isTrue();
        assertThat(calendar.data().path("legend").isMissingNode()).isTrue();
        assertThat(calendar.data().path("legends").size()).isEqualTo(3);

        boolean highlighted = false;
        for (var day : calendar.data().path("days")) {
            if (day.path("highlighted").asBoolean(false)) {
                highlighted = true;
                break;
            }
        }
        assertThat(highlighted).as("连续情绪应被高亮").isTrue();

        TestResponse checkin = post("/api/baby/mood/checkin",
                Map.of("mood", "clingy", "date", LocalDate.now().toString()), token);
        assertThat(checkin.status()).as(checkin.message()).isEqualTo(200);
        assertThat(checkin.data().path("mood").asText()).isEqualTo("clingy");

        TestResponse after = get("/api/baby/mood/calendar?year=" + LocalDate.now().getYear()
                + "&month=" + LocalDate.now().getMonthValue(), token);
        // 网格前面有上月补位，不能直接按日期当下标
        int dayOfMonth = LocalDate.now().getDayOfMonth();
        boolean found = false;
        for (var cell : after.data().path("days")) {
            if (cell.path("day").asInt() == dayOfMonth) {
                assertThat(cell.path("type").asText()).isEqualTo("clingy");
                found = true;
                break;
            }
        }
        assertThat(found).isTrue();
    }

    @Test
    void moodCheckinValidatesMoodAndLength() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse badMood = post("/api/baby/mood/checkin", Map.of("mood", "angry"), token);
        assertThat(badMood.status()).isEqualTo(400);
        assertThat(badMood.message()).contains("情绪");

        TestResponse longNote = post("/api/baby/mood/checkin",
                Map.of("mood", "happy", "note", "x".repeat(300)), token);
        assertThat(longNote.status()).isEqualTo(400);
        assertThat(longNote.message()).contains("255");
    }

    @Test
    void analysisCopyFollowsLanguage() {
        String token = tokenWithFiveMonthsOfData();

        TestResponse options = get("/api/baby/mood/checkin-options", token, "en");
        assertThat(options.status()).isEqualTo(200);
        assertThat(options.data().path("options").get(0).path("label").asText()).isEqualTo("Happy");

        TestResponse growth = get("/api/baby/growth", token, "en");
        assertThat(growth.data().path("metrics").get(0).path("label").asText()).isEqualTo("Height");
        assertThat(growth.data().path("insight").path("title").asText()).isEqualTo("Growth");

        TestResponse weekly = get("/api/baby/diet/weekly", token, "en");
        assertThat(weekly.data().path("averageLabel").asText()).startsWith("Average");

        TestResponse zh = get("/api/baby/growth", token, "zh-CN");
        assertThat(zh.data().path("metrics").get(0).path("label").asText()).isEqualTo("身高");
    }

    @Test
    void emptyBabyReturnsEmptyAnalysisWithoutBreakingShape() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse growth = get("/api/baby/growth", token);
        assertThat(growth.status()).isEqualTo(200);
        assertThat(growth.data().path("hasData").asBoolean()).isFalse();
        assertThat(growth.data().path("trends").size()).isEqualTo(3);

        TestResponse sleep = get("/api/baby/sleep/evolution", token);
        assertThat(sleep.status()).isEqualTo(200);
        assertThat(sleep.data().path("hasData").asBoolean()).isFalse();

        TestResponse diet = get("/api/baby/diet/weekly", token);
        assertThat(diet.status()).isEqualTo(200);
        assertThat(diet.data().path("hasData").asBoolean()).isFalse();
        assertThat(diet.data().path("bars").size()).isEqualTo(7);
    }
}
