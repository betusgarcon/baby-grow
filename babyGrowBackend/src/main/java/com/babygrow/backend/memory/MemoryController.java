package com.babygrow.backend.memory;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.common.PageResponse;
import com.babygrow.backend.memory.MemoryDtos.MemoryCreateRequest;
import com.babygrow.backend.memory.MemoryDtos.MemoryView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/family")
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    @GetMapping("/memories")
    public ApiResponse<PageResponse<MemoryView>> list(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String range,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String media,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor) {
        return ApiResponse.ok(memoryService.list(userId, range, category, media, q, limit, cursor));
    }

    @PostMapping("/memories")
    public ApiResponse<MemoryView> create(@AuthenticationPrincipal Long userId,
                                          @RequestBody MemoryCreateRequest request) {
        return ApiResponse.ok(memoryService.create(userId, request));
    }
}
