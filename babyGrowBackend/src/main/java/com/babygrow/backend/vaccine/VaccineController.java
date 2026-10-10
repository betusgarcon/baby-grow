package com.babygrow.backend.vaccine;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.vaccine.VaccineDtos.VaccineDetailView;
import com.babygrow.backend.vaccine.VaccineDtos.VaccinePatchRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 疫苗详情。前端把它当作「当前这一针」来展示，所以接口是单数资源。 */
@RestController
@RequestMapping("/api/baby")
public class VaccineController {

    private final VaccineService vaccineService;

    public VaccineController(VaccineService vaccineService) {
        this.vaccineService = vaccineService;
    }

    @GetMapping("/vaccine")
    public ApiResponse<VaccineDetailView> detail(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(vaccineService.detail(userId));
    }

    @PutMapping("/vaccine")
    public ApiResponse<VaccineDetailView> update(@AuthenticationPrincipal Long userId,
                                                 @RequestBody VaccinePatchRequest patch) {
        return ApiResponse.ok(vaccineService.update(userId, patch));
    }

    @DeleteMapping("/vaccine")
    public ApiResponse<Map<String, Boolean>> remove(@AuthenticationPrincipal Long userId) {
        vaccineService.remove(userId);
        return ApiResponse.ok(Map.of("ok", true));
    }
}
