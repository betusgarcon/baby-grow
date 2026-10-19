package com.babygrow.backend.journey;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.common.PageResponse;
import com.babygrow.backend.journey.JourneyDtos.CalendarEventView;
import com.babygrow.backend.journey.JourneyDtos.MilestoneView;
import com.babygrow.backend.journey.JourneyDtos.WeeklyInsightView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/baby")
public class JourneyController {

    private final JourneyService journeyService;

    public JourneyController(JourneyService journeyService) {
        this.journeyService = journeyService;
    }

    /** 已达成的里程碑（列表页） */
    @GetMapping("/milestones-list")
    public ApiResponse<PageResponse<MilestoneView>> milestones(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        return ApiResponse.ok(journeyService.milestones(userId, year, month, q, limit, cursor));
    }

    /** 日历事件：接种计划 + 已达成的里程碑 */
    @GetMapping("/calendar-events")
    public ApiResponse<List<CalendarEventView>> calendarEvents(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(journeyService.calendarEvents(userId));
    }

    /** 每周小记：由最近七天的数据推导 */
    @GetMapping("/weekly-insight")
    public ApiResponse<WeeklyInsightView> weeklyInsight(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(journeyService.weeklyInsight(userId));
    }
}
