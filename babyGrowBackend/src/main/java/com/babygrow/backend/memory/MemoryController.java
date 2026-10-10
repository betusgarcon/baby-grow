package com.babygrow.backend.memory;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.memory.MemoryDtos.MemoryCreateRequest;
import com.babygrow.backend.memory.MemoryDtos.MemoryView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public ApiResponse<List<MemoryView>> list(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(memoryService.list(userId));
    }

    @PostMapping("/memories")
    public ApiResponse<MemoryView> create(@AuthenticationPrincipal Long userId,
                                          @RequestBody MemoryCreateRequest request) {
        return ApiResponse.ok(memoryService.create(userId, request));
    }
}
